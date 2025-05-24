from typing import Optional, Callable, Coroutine
import uuid
from fastapi import HTTPException
from app.client.mongo_client import get_jobs_collection, get_queries_collection
from app.dependencies import get_global_engine
from app.rag.GraphRAGQueryEngine import GraphRAGQueryEngine
from app.client.db.jobs_collection import JobsCollection, Status
from app.client.db.queries_collection import QueriesCollection
from pydantic import BaseModel, ConfigDict
from app.logger import logger


class StepContext(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    context_type: str


class GlobalQueryContext(StepContext):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    engine: GraphRAGQueryEngine
    jobs_collection: JobsCollection
    queries_collection: QueriesCollection
    query_id: Optional[str]
    query: Optional[str]


class Step(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    step_function: Optional[Callable[..., Coroutine]]
    next_step: Optional['Step'] = None
    end: Optional[bool] = False

    @classmethod
    def create(
        cls,
        job: Callable[..., Coroutine],
        end: bool = False,
        next_step: Optional['Step'] = None
    ) -> 'Step':
        """Factory method to create a Step with cleaner interface"""
        return cls(step_function=job, end=end, next_step=next_step)

    async def take_step(self, *args, context: StepContext) -> list[str]:
        logger.info("taking step, context=%s", context)
        result = []

        if self.step_function:
            result = await self.step_function(*args, context)
        if self.next_step:
            result = await self.next_step.take_step(result, context=context)

        return result


class Stage(BaseModel):
    first_step: Step
    name: str
    last: Optional[bool] = False

    @classmethod
    def create(
        cls,
        first_step: Step,
        stage_name: str,
        last: bool = False
    ) -> 'Stage':
        """Factory method to create a Stage with cleaner interface"""
        return cls(first_step=first_step, name=stage_name, last=last)

    async def execute(self, queryID: str, context: StepContext) -> list[tuple[str, list[str]]]:
        return await self.first_step.take_step(queryID, context=context)


async def store_summaries(
    summaries: list[str],
    context: GlobalQueryContext,
) -> list[tuple[str, list[str]]]:

    jobs_collection: JobsCollection = context.jobs_collection
    assert (context.query_id is not None)
    assert (context.query is not None)

    query_id: str = context.query_id
    query: str = context.query

    logger.info("Storing summaries=%s", summaries)

    jobs = []
    for summary in summaries:
        job_id = str(uuid.uuid4())
        job_params = {
            "summary": summary,
            "query": query
        }
        await jobs_collection.create_job(
            job_id=job_id,
            query_id=query_id,
            stage=1,
            job_type="community_summary",
            params=job_params,
        )
        jobs.append(job_id)

    logger.info("jobs are %s", jobs)
    return [
        ("summary", jobs)
    ]


# TODO: fix sources.
async def gather_summaries(
        query: str,
        context: GlobalQueryContext
):
    engine: GraphRAGQueryEngine = context.engine
    summaries, sources = await engine.aget_summaries(query)
    return summaries


class UncompletedJobsException(Exception):
    """Raised when there are still pending jobs that haven’t completed."""
    pass


async def gather_reports(
    query_id: str,
    context: GlobalQueryContext
):
    context.query_id = query_id
    jobs_collection: JobsCollection = context.jobs_collection
    completed_jobs = await jobs_collection.get_jobs_by_stage(
        query_id,
        1
    )

    results = []
    for job in completed_jobs:
        logger.info(
            "Job is %s",
            job
        )
        if job["status"] != Status.COMPLETED:
            raise UncompletedJobsException(
                "Tried to step when uncompleted jobs exist."
            )

        report = job["result"]
        results.append(report)

    return results


async def aggregate_reports(
    reports: list[str],
    context: GlobalQueryContext
):
    assert (context.query_id is not None)

    jobs_collection: JobsCollection = context.jobs_collection
    job_id = str(uuid.uuid4())

    await jobs_collection.create_job(
        job_id=job_id,
        query_id=context.query_id,
        stage=2,
        job_type="report_aggregation",
        params={
            "reports": reports
        }
    )

    return [
        ("final", [job_id])
    ]


async def get_query(
    query_id: str,
    context: GlobalQueryContext,
) -> str:

    queries_collection: QueriesCollection = context.queries_collection
    query_data = await queries_collection.get_query(query_id)

    context.query_id = query_id
    if not query_data:
        raise HTTPException(
            status_code=404,
            detail="Query not found or expired"
        )

    query: str = query_data["query"]
    context.query = query

    return query


async def get_global_search_context(top_k: int = 3):
    context = GlobalQueryContext(
        context_type="Global",
        engine=get_global_engine(top_k),
        jobs_collection=await get_jobs_collection(),
        queries_collection=await get_queries_collection(),
        query_id=None,
        query=None
    )

    return context


def get_global_search_stages():
    stage_1_distribute_jobs = Step(
        step_function=store_summaries
    )
    stage_1_gather_summaries = Step(
        step_function=gather_summaries,
        next_step=stage_1_distribute_jobs,
    )
    stage_1_get_query = Step(
        step_function=get_query,
        next_step=stage_1_gather_summaries,
    )
    stage_1 = Stage(
        first_step=stage_1_get_query,
        name="Gather summaries",
    )

    stage_2_aggregate_reports = Step(
        step_function=aggregate_reports
    )
    stage_2_gather_reports = Step(
        step_function=gather_reports,
        next_step=stage_2_aggregate_reports
    )

    stage_2 = Stage(
        first_step=stage_2_gather_reports,
        name="Aggregate reports"
    )

    return [
        stage_1,
        stage_2
    ]


def get_stage(mode: str, stage: int) -> Stage:
    mode_to_stage = {
        "global": get_global_search_stages(),
    }

    return mode_to_stage[mode][stage-1]


def get_stages(mode: str) -> list[Stage]:
    mode_to_stage = {
        "global": get_global_search_stages(),
    }
    return mode_to_stage[mode]


async def get_context(mode) -> StepContext:
    mode_to_context = {
        "global": get_global_search_context()
    }
    return await mode_to_context[mode]
