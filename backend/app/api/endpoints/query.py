import uuid
import json
import asyncio
from typing import AsyncGenerator, Generator, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.dependencies import get_engine
from app.logger import logger
from app.client.mongo_client import get_jobs_collection, get_queries_collection
from app.types.DAG import UncompletedJobsException, get_context, get_stage, get_stages
from app.types.stream import get_job_generator

# Configure logging
router = APIRouter(tags=["query"])


class QueryRequest(BaseModel):
    query: str
    top_k: int = 3
    mode: str = "local"


class QueryResponse(BaseModel):
    query_id: str
    stages: int


@router.get("/sources/{query_id}")
async def get_query_sources(query_id: str):
    """
    Get the source nodes for a query
    """
    logger.info(f"Retrieving sources for query: {query_id}")

    queries_collection = await get_queries_collection()
    query_data = await queries_collection.get_query(query_id)

    if not query_data:
        raise HTTPException(
            status_code=404, detail="Query not found or expired"
        )

    logger.info(
        "get_query_sources(), query_id=%s, query_data=%s",
        query_id,
        query_data
    )

    # Check if sources are available for this query
    if "sources" not in query_data or query_data["sources"] == None:
        raise HTTPException(
            status_code=400,
            detail="Sources not available for this query yet"
        )

    # Extract source information in a more consumable format
    return {
        "query_id": query_id,
        "sources": query_data["sources"]
    }


async def data_streamer(response_gen) -> AsyncGenerator[str, None]:
    """
    Convert the LLM streaming generator to a proper FastAPI StreamingResponse format.
    """
    logger.info(response_gen)
    try:
        async for response in response_gen:
            token = str(response.delta)

            json_token = json.dumps(token)
            logger.info(f"Token is {json_token}")

            yield f"data: {json_token}\n\n"
            await asyncio.sleep(0.01)

        # Signal completion
        yield "data: [DONE]\n\n"
    except Exception as e:
        yield f"data: Error: {str(e)}\n\n"
        yield "data: [DONE]\n\n"


@router.post("/query", response_model=QueryResponse)
async def create_query(request: QueryRequest):
    """
    Create a query and return a query ID to connect to the streaming endpoint
    """
    try:
        query_id = str(uuid.uuid4())
        logger.info(
            f"Creating query: {query_id} for input: {request.query}"
        )

        queries_collection = await get_queries_collection()
        await queries_collection.create_query(
            query_id,
            request.top_k,
            request.mode,
            request.query
        )

        number_of_stages = len(get_stages(request.mode))
        return {
            "query_id": query_id,
            "stages": number_of_stages
        }
    except Exception as e:
        logger.exception("Error creating query")
        raise HTTPException(
            status_code=500,
            detail=f"Query creation error: {str(e)}"
        )


class StepRequest(BaseModel):
    query_id: str


class StepResponse(BaseModel):
    jobs: list[tuple[str, list[str]]]
    sources: Optional[list[int]]


@router.post("/step/{query_id}/{step}", response_model=StepResponse)
async def step(query_id: str, step: int):
    """
    Do everything in the stage.
    """
    logger.info(f"Step request for {query_id}")
    try:

        queries_collection = await get_queries_collection()
        query_data = await queries_collection.get_query(
            query_id
        )

        if (not query_data):
            raise HTTPException(
                status_code=404,
                detail="Query not found."
            )

        mode: str = query_data["mode"]
        stage = get_stage(
            mode,
            step,
        )

        context = await get_context(mode, query_data)
        jobs = await stage.execute(context)

        logger.info(
            "Resulting jobs=[%s]",
            jobs
        )

        logger.info("Step sources=[%s]", context.sources)
        await queries_collection.increment_stage(query_id)

        return {
            "jobs": jobs,
            "sources": context.sources
        }

    except UncompletedJobsException as e:
        logger.exception("Uncompleted jobs exist")
        raise HTTPException(
            status_code=202,
            detail="Jobs are still in progress. Please poll again later.",
            headers={"Retry-After": "0.1"}
        )
    except Exception as e:
        logger.exception("Step error=%s", e)
        raise HTTPException(
            status_code=500,
            detail=f"Step Error: {str(e)}"
        )


class QueryStatus(BaseModel):
    status: str
    query_id: str


@router.get("/stream/{query_id}")
async def stream_query_response(query_id: str):
    """
    Connect to a streaming endpoint using the query ID
    """
    logger.info(f"Request to connect to stream for query: {query_id}")
    queries_collection = await get_queries_collection()

    query_data = await queries_collection.get_query(query_id)

    if not query_data:
        raise HTTPException(
            status_code=404,
            detail="Query not found or expired"
        )

    query = query_data["query"]

    try:
        logger.info(f"Executing query {query_id}: {query}")
        query_engine = get_engine(query_data["mode"], query_data["top_k"])
        streaming_response = await query_engine.acustom_query(query)

        await queries_collection.store_query_sources(
            query_id,
            streaming_response.source_nodes,
        )

        return StreamingResponse(
            content=data_streamer(streaming_response.response_gen),
            media_type='text/event-stream',
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        logger.exception(f"Error streaming response for query {query_id}")
        # Mark query as failed
        query_data["status"] = "failed"
        query_data["error"] = str(e)
        raise HTTPException(
            status_code=500, detail=f"Streaming error: {str(e)}")


async def event_stream(
        response_gen: Generator,
        job_id: str,
        data: str) -> AsyncGenerator:
    """
    Convert the LLM streaming generator to a proper FastAPI StreamingResponse format.
    """
    logger.info("Streaming job...")
    jobs_collection = await get_jobs_collection()
    try:
        result: str = ""
        for response in response_gen:
            json_token = json.dumps(response.delta)
            result += response.delta
            yield f"data: {json_token}\n\n"
            await asyncio.sleep(0.01)
        # Signal completion
        yield "data: [DONE]\n\n"

        if data:
            result = data
        logger.info(
            "Storing result=%s",
            result
        )

        await jobs_collection.store_job_result(
            job_id,
            result
        )
    except Exception as e:
        yield f"Error: {str(e)}\n\n"
        yield "data: [DONE]\n\n"
        await jobs_collection.mark_job_failed(
            job_id,
            str(e)
        )


@router.get("/stream_job/{job_id}")
async def stream_job(
        job_id: str
):
    """
    Connect to a streaming endpoint using the query ID
    """
    logger.info(f"Request to execute job: {job_id}")
    jobs_collection = await get_jobs_collection()
    job = await jobs_collection.get_job(job_id)

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found or expired"
        )

    logger.info(
        "Retrieved for streaming=[%s]",
        job
    )
    job_type: str = job["job_type"]
    job_params = job["params"].values()
    query_params = job["query_params"]

    logger.info(
        "query params=[%s]",
        query_params
    )
    logger.info(
        "job params=[%s]",
        job_params
    )

    response_data = get_job_generator(
        job_type,
        query_params,
        *job_params
    )

    response_gen = None
    additional_data = None
    if isinstance(response_data, tuple):
        response_gen, additional_data = response_data
    else:
        response_gen = response_data
        additional_data = None

    try:
        logger.info(f"Executing job {job_id}: {job_type}")
        return StreamingResponse(
            content=event_stream(
                response_gen,
                job_id,
                additional_data  # Pass additional data if it exists
            ),
            media_type='text/event-stream',
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        logger.exception(f"Error streaming response for query {job_id}")
        # Mark query as failed
        raise HTTPException(
            status_code=500,
            detail=f"Streaming error: {str(e)}"
        )
