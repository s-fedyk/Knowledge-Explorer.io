from typing import AsyncGenerator
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import uuid
import json
import asyncio

from pydantic import BaseModel
from app.dependencies import get_engine
from app.logger import logger
from app.client.mongo_client import get_queries_collection

# Configure logging
router = APIRouter(tags=["query"])


# Keep your existing models
class QueryRequest(BaseModel):
    query: str
    top_k: int = 3
    mode: str = "local"


class QueryResponse(BaseModel):
    query_id: str


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
            status_code=400, detail="Sources not available for this query yet"
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
            f"Creating query: {query_id} for input: {request.query}")

        # throws mongo server error on failure. Force client to retry?
        queries_collection = await get_queries_collection()
        await queries_collection.create_query(
            query_id,
            request.top_k,
            request.mode,
            request.query
        )

        return {"query_id": query_id}
    except Exception as e:
        logger.exception("Error creating query")
        raise HTTPException(
            status_code=500, detail=f"Query creation error: {str(e)}")


class QueryStatus(BaseModel):
    status: str
    query_id: str


@router.get("/stream/{query_id}")
async def stream_query_response(
        query_id: str
):
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


@router.get("/query/{query_id}", response_model=QueryStatus)
async def get_query_status(query_id: str):
    """
    Get the status of a query
    """
    if query_id not in active_queries:
        raise HTTPException(
            status_code=404, detail="Query not found or expired")

    query_data = active_queries[query_id]
    return {
        "status": query_data["status"],
        "query_id": query_id
    }


@router.delete("/query/{query_id}")
async def delete_query(query_id: str):
    """
    Manually delete a query when client is done
    """
    if query_id not in active_queries:
        raise HTTPException(
            status_code=404, detail="Query not found or expired")

    del active_queries[query_id]
    return {"status": "deleted", "query_id": query_id}
