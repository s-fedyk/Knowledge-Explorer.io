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

# Configure logging for this module
router = APIRouter(tags=["query"]) # FastAPI router for query-related endpoints

# Pydantic model for the request body when creating a new query.
class QueryRequest(BaseModel):
    query: str  # The user's query string.
    top_k: int = 3 # The number of top results to retrieve, defaults to 3.
    mode: str = "local" # The query mode (e.g., "local", "global"), defaults to "local".

# Pydantic model for the response when a query is successfully created.
class QueryResponse(BaseModel):
    query_id: str # A unique identifier for the created query.
    stages: int   # The number of processing stages for this query based on its mode.

# Endpoint to retrieve the source documents/nodes that contributed to a given query's answer.
@router.get("/sources/{query_id}")
async def get_query_sources(query_id: str):
    """
    Retrieves the source nodes (documents or chunks) that were used to generate
    the answer for a specific query_id. This is useful for providing traceability
    and allowing users to see the origin of the information.
    """
    logger.info(f"Retrieving sources for query: {query_id}")

    queries_collection = await get_queries_collection() # Get a MongoDB collection for queries.
    query_data = await queries_collection.get_query(query_id) # Fetch query data from MongoDB.

    # If query_data is not found, it means the query_id is invalid or has expired.
    if not query_data:
        raise HTTPException(
            status_code=404, detail="Query not found or expired"
        )

    logger.info(
        "get_query_sources(), query_id=%s, query_data=%s",
        query_id,
        query_data
    )

    # Check if 'sources' field exists and is populated.
    # Sources might not be available if the query processing hasn't reached that stage.
    if "sources" not in query_data or query_data["sources"] == None:
        raise HTTPException(
            status_code=400, # Bad Request, as sources are expected but not ready.
            detail="Sources not available for this query yet"
        )

    # Return the query_id and the list of sources.
    return {
        "query_id": query_id,
        "sources": query_data["sources"]
    }

# Asynchronous generator function to stream data in Server-Sent Events (SSE) format.
async def data_streamer(response_gen: AsyncGenerator) -> AsyncGenerator[str, None]:
    """
    Wraps an asynchronous generator (typically from an LLM's streaming response)
    and formats each yielded item as a Server-Sent Event (SSE).
    This allows for streaming responses to the client over HTTP.
    """
    logger.info(f"Data streamer initiated for response_gen: {response_gen}")
    try:
        async for response_item in response_gen:
            # Assuming response_item has a 'delta' attribute with the token.
            token = str(response_item.delta)
            json_token = json.dumps(token) # JSON encode the token.
            logger.info(f"Streaming token: {json_token}")

            # Format as SSE: "data: <json_token>\n\n"
            yield f"data: {json_token}\n\n"
            await asyncio.sleep(0.01) # Small delay, can be adjusted.

        # After the generator is exhausted, send a [DONE] message as per SSE convention.
        yield "data: [DONE]\n\n"
    except Exception as e:
        logger.error(f"Error during data streaming: {e}")
        # If an error occurs, send an error message and then the [DONE] signal.
        yield f"data: Error: {str(e)}\n\n"
        yield "data: [DONE]\n\n"

# Endpoint to create a new query.
# This initiates the RAG pipeline for the given query string.
@router.post("/query", response_model=QueryResponse)
async def create_query(request: QueryRequest):
    """
    Accepts a user's query, stores it, and initiates the query processing pipeline.
    Returns a unique query_id and the number of stages involved in processing this query type.
    The query_id is then used by the client to connect to streaming endpoints for results.
    """
    try:
        query_id = str(uuid.uuid4()) # Generate a unique ID for this query.
        logger.info(
            f"Creating query: {query_id} for input: {request.query} with mode: {request.mode}, top_k: {request.top_k}"
        )

        queries_collection = await get_queries_collection()
        # Store initial query details in MongoDB.
        await queries_collection.create_query(
            query_id,
            request.top_k,
            request.mode,
            request.query
        )

        # Determine the number of processing stages based on the query mode.
        number_of_stages = len(get_stages(request.mode))
        return {
            "query_id": query_id,
            "stages": number_of_stages
        }
    except Exception as e:
        logger.exception("Error creating query")
        raise HTTPException(
            status_code=500, # Internal Server Error
            detail=f"Query creation error: {str(e)}"
        )

# Pydantic model for the request body for advancing a query step (not currently used in the `step` endpoint path).
class StepRequest(BaseModel):
    query_id: str # The ID of the query to process.

# Pydantic model for the response of the `step` endpoint.
class StepResponse(BaseModel):
    jobs: list[tuple[str, list[str]]] # List of jobs created or processed in this step.
    sources: Optional[list[int]]      # Optional list of source identifiers if available at this stage.

# Endpoint to execute a specific step/stage in the query processing DAG.
@router.post("/step/{query_id}/{step}", response_model=StepResponse)
async def step(query_id: str, step: int):
    """
    Executes a specific stage of the Directed Acyclic Graph (DAG) for a given query.
    This allows for a step-by-step execution of the RAG pipeline, often involving
    job creation and processing.
    """
    logger.info(f"Step request for query_id: {query_id}, step: {step}")
    try:
        queries_collection = await get_queries_collection()
        query_data = await queries_collection.get_query(query_id)

        if not query_data:
            raise HTTPException(
                status_code=404,
                detail="Query not found."
            )

        mode: str = query_data["mode"]
        # Retrieve the specific stage logic based on the query mode and step number.
        stage = get_stage(
            mode,
            step,
        )

        # Get the necessary context for the stage, using current query data.
        context = await get_context(mode, query_data)
        # Execute the stage, which might involve creating and dispatching jobs.
        jobs = await stage.execute(context)

        logger.info(
            "Resulting jobs for query_id=%s, step=%s: %s",
            query_id, step, jobs
        )
        logger.info("Step sources for query_id=%s: %s", query_id, context.sources)

        # Mark this stage as completed for the query.
        await queries_collection.increment_stage(query_id)

        return {
            "jobs": jobs,
            "sources": context.sources
        }

    except UncompletedJobsException as e:
        logger.warn(f"Uncompleted jobs for query_id={query_id}, step={step}: {e}")
        # If dependent jobs are not yet completed, instruct client to retry.
        raise HTTPException(
            status_code=202, # Accepted, but not yet completed.
            detail="Jobs are still in progress. Please poll again later.",
            headers={"Retry-After": "0.1"} # Suggest retry after 0.1 seconds.
        )
    except Exception as e:
        logger.exception(f"Error during step processing for query_id={query_id}, step={step}")
        raise HTTPException(
            status_code=500,
            detail=f"Step Error: {str(e)}"
        )

# Pydantic model for query status (not directly used as a response model in current endpoints).
class QueryStatus(BaseModel):
    status: str
    query_id: str

# Endpoint to stream the final response of a query.
@router.get("/stream/{query_id}")
async def stream_query_response(query_id: str):
    """
    Streams the final answer for a given query_id.
    This endpoint is typically called after all processing stages for the query are complete
    or when a direct, full RAG pipeline execution is triggered.
    The response is streamed token by token using Server-Sent Events (SSE).
    """
    logger.info(f"Request to connect to stream for query: {query_id}")
    queries_collection = await get_queries_collection()
    query_data = await queries_collection.get_query(query_id)

    if not query_data:
        raise HTTPException(
            status_code=404,
            detail="Query not found or expired"
        )

    query_text: str = query_data["query"]

    try:
        logger.info(f"Executing RAG pipeline for query {query_id}: {query_text}")
        # Get the appropriate RAG query engine based on mode and top_k settings.
        query_engine = get_engine(query_data["mode"], query_data["top_k"])
        # Asynchronously execute the custom RAG query.
        streaming_response = await query_engine.acustom_query(query_text)

        # Store the source nodes identified by the RAG pipeline.
        await queries_collection.store_query_sources(
            query_id,
            streaming_response.source_nodes,
        )

        # Return a StreamingResponse that uses the data_streamer to format SSE events.
        return StreamingResponse(
            content=data_streamer(streaming_response.response_gen),
            media_type='text/event-stream', # Standard MIME type for SSE.
            headers={
                "Cache-Control": "no-cache", # Ensure no caching of the stream.
                "Connection": "keep-alive",  # Keep the connection open for streaming.
            }
        )
    except Exception as e:
        logger.exception(f"Error streaming response for query {query_id}")
        # Update query status to 'failed' in the database.
        # (Note: query_data here is a local copy, actual update would need another DB call)
        # query_data["status"] = "failed"
        # query_data["error"] = str(e)
        await queries_collection.mark_query_failed(query_id, str(e)) # Assuming such a method exists
        raise HTTPException(
            status_code=500, detail=f"Streaming error: {str(e)}")

# Asynchronous generator to stream results of a specific job (e.g., summarization).
async def event_stream(
        response_gen: Generator, # Can be sync or async generator from job logic
        job_id: str,
        data: Optional[str] # Optional pre-computed data if the job doesn't stream
) -> AsyncGenerator[str, None]:
    """
    Streams the output of a specific job (like summarization) in SSE format.
    If `data` is provided, it means the job result is already computed and available.
    Otherwise, it iterates through `response_gen` (which can be a sync or async generator)
    to stream tokens. The final result is stored in the jobs collection.
    """
    logger.info(f"Initiating event stream for job_id: {job_id}")
    jobs_collection = await get_jobs_collection()
    final_result: str = ""
    try:
        if data: # If data is already available (job doesn't stream tokens)
            final_result = data
            json_token = json.dumps(data)
            yield f"data: {json_token}\n\n" # Send the whole data as one event
        else: # If response_gen is a generator (job streams tokens)
            # Check if it's an async generator
            if hasattr(response_gen, "__aiter__"):
                async for item in response_gen:
                    token = str(item.delta) if hasattr(item, 'delta') else str(item)
                    final_result += token
                    json_token = json.dumps(token)
                    yield f"data: {json_token}\n\n"
                    await asyncio.sleep(0.01)
            # Check if it's a sync generator
            elif hasattr(response_gen, "__iter__"):
                for item in response_gen:
                    token = str(item.delta) if hasattr(item, 'delta') else str(item)
                    final_result += token
                    json_token = json.dumps(token)
                    yield f"data: {json_token}\n\n"
                    await asyncio.sleep(0.01) # Still use async sleep for non-blocking behavior
            else:
                logger.error(f"response_gen for job {job_id} is not iterable.")
                raise TypeError("response_gen must be an iterator or async iterator")


        yield "data: [DONE]\n\n" # Signal completion of the stream.
        logger.info(
            "Storing result for job_id=%s: %s",
            job_id, final_result
        )
        # Store the complete result in the jobs collection.
        await jobs_collection.store_job_result(
            job_id,
            final_result
        )
    except Exception as e:
        logger.exception(f"Error during event stream for job_id={job_id}")
        yield f"data: Error: {str(e)}\n\n" # Send error message via SSE.
        yield "data: [DONE]\n\n"
        # Mark the job as failed in the database.
        await jobs_collection.mark_job_failed(
            job_id,
            str(e)
        )

# Endpoint to stream the result of a specific background job.
@router.get("/stream_job/{job_id}")
async def stream_job(
        job_id: str
):
    """
    Retrieves a specific job by its job_id and streams its result.
    The job might involve tasks like summarization or other processing steps
    defined in the RAG DAG. The result is streamed via SSE.
    """
    logger.info(f"Request to execute/stream job: {job_id}")
    jobs_collection = await get_jobs_collection()
    job = await jobs_collection.get_job(job_id) # Fetch job details from MongoDB.

    if not job:
        raise HTTPException(
            status_code=404,
            detail="Job not found or expired"
        )

    logger.info(
        "Retrieved job for streaming job_id=%s: %s",
        job_id, job
    )
    job_type: str = job["job_type"]
    job_params_values = job["params"].values() # Parameters for the job function.
    query_params = job["query_params"] # Query-level parameters for context.

    logger.info(
        "Job type for job_id=%s: %s", job_id, job_type
    )
    logger.info(
        "Query params for job_id=%s: %s", job_id, query_params
    )
    logger.info(
        "Job params for job_id=%s: %s", job_id, job_params_values
    )

    # Get the appropriate generator or data for the job.
    # `get_job_generator` might return a generator or pre-computed data.
    response_data = get_job_generator(
        job_type,
        query_params,
        *job_params_values # Unpack job parameters.
    )

    response_gen = None # The generator for streaming tokens.
    additional_data = None # Pre-computed data if the job doesn't stream.

    if isinstance(response_data, tuple) and len(response_data) == 2:
        response_gen, additional_data = response_data
    elif hasattr(response_data, "__iter__") or hasattr(response_data, "__aiter__"):
        response_gen = response_data
    else: # Assuming response_data is pre-computed if not a generator/tuple
        additional_data = response_data


    try:
        logger.info(f"Executing job {job_id} of type: {job_type}")
        # Return a StreamingResponse using the event_stream helper.
        return StreamingResponse(
            content=event_stream(
                response_gen,
                job_id,
                additional_data # Pass additional data if it exists
            ),
            media_type='text/event-stream',
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        logger.exception(f"Error streaming response for job {job_id}")
        await jobs_collection.mark_job_failed(job_id, str(e)) # Ensure job is marked as failed
        raise HTTPException(
            status_code=500,
            detail=f"Streaming error for job {job_id}: {str(e)}"
        )
