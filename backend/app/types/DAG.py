from typing import Optional, Callable, Coroutine, Any
import uuid
from llama_index.core.schema import NodeWithScore
from app.client.mongo_client import get_jobs_collection
from app.dependencies import get_global_engine, get_local_engine
from app.rag.GraphRAGLocalQueryEngine import GraphRAGLocalQueryEngine
from app.rag.GraphRAGQueryEngine import GraphRAGQueryEngine
from app.client.db.jobs_collection import JobsCollection, Status
from pydantic import BaseModel, ConfigDict
from app.logger import logger


class StepContext(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    context_type: str
    jobs_collection: JobsCollection
    query_data: dict[str, Any]
    sources: Optional[list[int]]


class GlobalQueryContext(StepContext):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    engine: GraphRAGQueryEngine


class LocalQueryContext(StepContext):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    engine: GraphRAGLocalQueryEngine


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

    async def execute(self, context: StepContext) -> list[tuple[str, list[str]]]:
        return await self.first_step.take_step(context=context)


def to_text(node: NodeWithScore):
    return node.text


async def store_summaries(
    summaries: list[str],
    context: GlobalQueryContext,
) -> list[tuple[str, list[str]]]:

    jobs_collection: JobsCollection = context.jobs_collection

    query_id: str = context.query_data["query_id"]
    query: str = context.query_data["query"]
    stage = context.query_data["stage"]

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
            stage=stage,
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
        context: GlobalQueryContext
):
    engine: GraphRAGQueryEngine = context.engine
    query: str = context.query_data["query"]

    summaries, sources = await engine.aget_summaries(
        query
    )
    context.sources = sources

    return summaries


class UncompletedJobsException(Exception):
    """Raised when there are still pending jobs that haven’t completed."""
    pass


async def gather_entities(
    context: LocalQueryContext
):
    jobs_collection: JobsCollection = context.jobs_collection

    query_id = context.query_data["query_id"]
    query = context.query_data["query"]
    stage = context.query_data["stage"]

    logger.info("gathering entities...")
    completed_jobs = await jobs_collection.get_jobs_by_stage(
        query_id,
        stage - 1
    )

    reports = ""
    for job in completed_jobs:
        if job["status"] != Status.COMPLETED:
            raise UncompletedJobsException(
                "Tried to step when uncompleted jobs exist."
            )
        reports += job["result"]

    logger.info("Entity context is %s", reports)
    job_id = str(uuid.uuid4())
    await jobs_collection.create_job(
        job_id=job_id,
        query_id=query_id,
        stage=stage,
        job_type="entity-aggregation",
        params={
            "query": query,
            "entities": reports
        }
    )

    jobs = [job_id]
    return [
        ("entity-aggregation", jobs)
    ]


async def gather_reports(
    context: GlobalQueryContext
):
    jobs_collection: JobsCollection = context.jobs_collection
    completed_jobs = await jobs_collection.get_jobs_by_stage(
        context.query_data["query_id"],
        context.query_data["stage"] - 1
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
    query_id = context.query_data["query_id"]
    stage = context.query_data["stage"]

    jobs_collection: JobsCollection = context.jobs_collection
    job_id = str(uuid.uuid4())

    await jobs_collection.create_job(
        job_id=job_id,
        query_id=query_id,
        stage=stage,
        job_type="report-aggregation",
        params={
            "reports": reports
        }
    )

    jobs = [job_id]
    return [
        ("final", jobs)
    ]


async def extract_entities(context: LocalQueryContext):
    jobs_collection: JobsCollection = context.jobs_collection
    job_id = str(uuid.uuid4())

    await jobs_collection.create_job(
        query_id=context.query_data["query_id"],
        job_id=job_id,
        stage=context.query_data["stage"],
        job_type="entity-extraction",
        params={
            "query": context.query_data["query"]
        }
    )

    logger.info("Extracting entities for query =[%s]", context.query_data)

    jobs = [job_id]
    return [
        ("entity-extraction", jobs)
    ]


async def local_query(context: LocalQueryContext):
    engine: GraphRAGLocalQueryEngine = context.engine
    jobs_collection: JobsCollection = context.jobs_collection

    # Previous stage produced entities
    entity_extraction_job = await jobs_collection.get_jobs_by_stage(
        context.query_data["query_id"],
        context.query_data["stage"] - 1
    )

    logger.info(
        "Local query previous job results = [%s]",
        entity_extraction_job
    )

    entities = ""
    for job in entity_extraction_job:
        if job["status"] != Status.COMPLETED:
            raise UncompletedJobsException(
                "Tried to step when uncompleted jobs exist."
            )
        entities += job["result"]

    logger.info("Entities are : %s", entities)
    logger.info("Query is %s", context.query_data["query"])

    context_nodes, sources = await engine.aretrieve_context(entities)

    logger.info("Source nodes are")
    context.sources = sources

    jobs = []
    for serialized_nodes in context_nodes:
        job_id = str(uuid.uuid4())
        job_params = {
            "query": context.query_data["stage"],
            "nodes_str": serialized_nodes,
        }
        await jobs_collection.create_job(
            job_id=job_id,
            query_id=context.query_data["query_id"],
            stage=context.query_data["stage"],
            job_type="rerank",
            params=job_params,
        )
        jobs.append(job_id)

    return [
        ("rerank", jobs)
    ]


async def get_global_search_context(
        query_data: dict[str, Any],
        top_k: int = 3
):
    context = GlobalQueryContext(
        context_type="Global",
        engine=get_global_engine(top_k),
        jobs_collection=await get_jobs_collection(),
        query_data=query_data,
        sources=None
    )

    return context


async def get_local_search_context(
    query_data: dict[str, Any],
    top_k: int = 3
):
    context = LocalQueryContext(
        context_type="local",
        engine=get_local_engine(top_k),
        jobs_collection=await get_jobs_collection(),
        query_data=query_data,
        sources=None
    )

    return context


def get_local_search_stages():
    stage_1_extract_entities = Step(
        step_function=extract_entities
    )
    stage_1 = Stage(
        first_step=stage_1_extract_entities,
        name="Gather context"
    )

    stage_2_query = Step(
        step_function=local_query
    )
    stage_2 = Stage(
        first_step=stage_2_query,
        name="Gathering entities"
    )

    stage_3_gather = Step(
        step_function=gather_entities
    )

    stage_3 = Stage(
        first_step=stage_3_gather,
        name="Aggregating reports"
    )

    return [
        stage_1,
        stage_2,
        stage_3
    ]


def get_global_search_stages():
    stage_1_distribute_jobs = Step(
        step_function=store_summaries
    )
    stage_1_gather_summaries = Step(
        step_function=gather_summaries,
        next_step=stage_1_distribute_jobs,
    )
    stage_1 = Stage(
        first_step=stage_1_gather_summaries,
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
        "local": get_local_search_stages()
    }

    return mode_to_stage[mode][stage-1]


def get_stages(mode: str) -> list[Stage]:
    mode_to_stage = {
        "global": get_global_search_stages(),
        "local": get_local_search_stages()
    }
    return mode_to_stage[mode]


async def get_context(
    mode: str,
    query_data: dict[str, Any]
) -> StepContext:
    mode_to_context = {
        "global": get_global_search_context(query_data),
        "local": get_local_search_context(query_data)
    }
    return await mode_to_context[mode]
