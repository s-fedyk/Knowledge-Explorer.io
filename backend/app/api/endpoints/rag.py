import os
from typing import List, Dict, Any, AsyncGenerator
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
import re
import uuid
import asyncio
from pydantic import BaseModel
from pathlib import Path
import json
from fastapi.concurrency import run_in_threadpool
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.core import Settings

from llama_index.core.node_parser import SentenceSplitter

from app.api.endpoints.GraphRAGQueryEngine import GraphRAGQueryEngine
from .GraphRagExtractor import GraphRAGExtractor

from llama_index.core.indices.property_graph import PropertyGraphIndex
from llama_index.core import StorageContext


from llama_index.readers.file import PDFReader
from app.dependencies import get_rag_engine, get_vector_store, get_neo4j_driver, get_graph_store
from app.logger import logger
from app.config import settings


active_sessions = {}
session_sources = {}

KG_TRIPLET_EXTRACT_TMPL = """
-Goal-
Given a text document, identify all entities and their entity types from the text and all relationships among the identified entities.
Given the text, extract up to {max_knowledge_triplets} entity-relation triplets.

-Steps-
1. Identify all entities. For each identified entity, extract the following information:
- entity_name: Name of the entity, capitalized
- entity_type: Type of the entity
- entity_description: Comprehensive description of the entity's attributes and activities

2. From the entities identified in step 1, identify all pairs of (source_entity, target_entity) that are *clearly related* to each other.
For each pair of related entities, extract the following information:
- source_entity: name of the source entity, as identified in step 1
- target_entity: name of the target entity, as identified in step 1
- relation: relationship between source_entity and target_entity
- relationship_description: explanation as to why you think the source entity and the target entity are related to each other

3. Output Formatting:
- Return the result in valid JSON format with two keys: 'entities' (list of entity objects) and 'relationships' (list of relationship objects).
- Exclude any text outside the JSON structure (e.g., no explanations or comments).
- If no entities or relationships are identified, return empty lists: { "entities": [], "relationships": [] }.

-An Output Example-
{
  "entities": [
    {
      "entity_name": "Albert Einstein",
      "entity_type": "Person",
      "entity_description": "Albert Einstein was a theoretical physicist who developed the theory of relativity and made significant contributions to physics."
    },
    {
      "entity_name": "Theory of Relativity",
      "entity_type": "Scientific Theory",
      "entity_description": "A scientific theory developed by Albert Einstein, describing the laws of physics in relation to observers in different frames of reference."
    },
    {
      "entity_name": "Nobel Prize in Physics",
      "entity_type": "Award",
      "entity_description": "A prestigious international award in the field of physics, awarded annually by the Royal Swedish Academy of Sciences."
    }
  ],
  "relationships": [
    {
      "source_entity": "Albert Einstein",
      "target_entity": "Theory of Relativity",
      "relation": "developed",
      "relationship_description": "Albert Einstein is the developer of the theory of relativity."
    },
    {
      "source_entity": "Albert Einstein",
      "target_entity": "Nobel Prize in Physics",
      "relation": "won",
      "relationship_description": "Albert Einstein won the Nobel Prize in Physics in 1921."
    }
  ]
}

-Real Data-
######################
text: {text}
######################
output:"""


# Configure logging


router = APIRouter(tags=["rag"])


def parse_fn(response_str: str) -> Any:
    json_pattern = r"\{.*\}"
    match = re.search(json_pattern, response_str, re.DOTALL)
    entities = []
    relationships = []
    if not match:
        return entities, relationships
    json_str = match.group(0)
    try:
        data = json.loads(json_str)
        entities = [
            (
                entity["entity_name"],
                entity["entity_type"],
                entity["entity_description"],
            )
            for entity in data.get("entities", [])
        ]
        relationships = [
            (
                relation["source_entity"],
                relation["target_entity"],
                relation["relation"],
                relation["relationship_description"],
            )
            for relation in data.get("relationships", [])
        ]

        logger.info(entities)
        logger.info(relationships)

        return entities, relationships
    except json.JSONDecodeError as e:
        print("Error parsing JSON:", e)
        return entities, relationships


# Keep your existing models
class QueryRequest(BaseModel):
    query: str
    similarity_top_k: int = 3


class QueryResponse(BaseModel):
    session_id: str


@router.get("/sources/{session_id}")
async def get_session_sources(session_id: str):
    """
    Get the source nodes for a query session
    """
    logger.info(f"Retrieving sources for session: {session_id}")

    if session_id not in active_sessions:
        raise HTTPException(
            status_code=404, detail="Session not found or expired"
        )

    session = active_sessions[session_id]

    # Check if sources are available for this session
    if "sources" not in session:
        raise HTTPException(
            status_code=400, detail="Sources not available for this session yet"
        )

    # Extract source information in a more consumable format
    formatted_sources = []
    for source in session["sources"]:
        formatted_sources.append(source.node_id)

    return {
        "session_id": session_id,
        "sources": formatted_sources
    }


async def data_streamer(response_gen) -> AsyncGenerator[str, None]:
    """
    Convert the LLM streaming generator to a proper FastAPI StreamingResponse format.
    """
    logger.info(response_gen)
    try:
        async for response in response_gen:
            token = str(response.delta)
            logger.info(token)

            yield f"data: {token}\n\n"
            await asyncio.sleep(0.01)

        # Signal completion
        yield "data: [DONE]\n\n"
    except Exception as e:
        # Handle errors
        yield f"data: Error: {str(e)}\n\n"
        yield "data: [DONE]\n\n"


@router.post("/query", response_model=QueryResponse)
async def create_query_session(
    request: QueryRequest,
    index: VectorStoreIndex = Depends(get_rag_engine),
    graph_store=Depends(get_graph_store),
):
    """
    Create a query session and return a session ID to connect to the streaming endpoint
    """
    try:
        session_id = str(uuid.uuid4())
        logger.info(
            f"Creating query session: {session_id} for query: {request.query}")

        storage_ctx = StorageContext.from_defaults(
            property_graph_store=graph_store,
            vector_store=get_vector_store()
        )
        pg_index = PropertyGraphIndex.from_existing(
            property_graph_store=graph_store, storage_context=storage_ctx,
        )
        query_engine = GraphRAGQueryEngine(
            graph_store=graph_store,
            index=pg_index,
        )

        active_sessions[session_id] = {
            "status": "processing",
            "query": request.query,
            "query_engine": query_engine,
        }

        return {"session_id": session_id}
    except Exception as e:
        logger.exception("Error creating query session")
        raise HTTPException(
            status_code=500, detail=f"Query session creation error: {str(e)}")


class SessionStatus(BaseModel):
    status: str
    session_id: str


@router.get("/stream/{session_id}")
async def stream_query_response(session_id: str):
    """
    Connect to a streaming endpoint using the session ID
    """
    logger.info(f"Request to connect to stream for session: {session_id}")

    if session_id not in active_sessions:
        raise HTTPException(
            status_code=404, detail="Session not found or expired")

    session = active_sessions[session_id]
    query_engine = session["query_engine"]
    query = session["query"]

    try:
        logger.info(f"Executing query for session {session_id}: {query}")
        streaming_response = await query_engine.acustom_query(query)

        # Store the sources in the session data
        session["sources"] = streaming_response.source_nodes
        session["status"] = "streaming"

        def cleanup_session():
            try:
                session["status"] = "completed"
            except Exception as e:
                logger.exception(f"Error cleaning up session {session_id}")

        return StreamingResponse(
            content=data_streamer(streaming_response.response_gen),
            media_type='text/event-stream',
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        )
    except Exception as e:
        logger.exception(f"Error streaming response for session {session_id}")
        # Mark session as failed
        session["status"] = "failed"
        session["error"] = str(e)
        raise HTTPException(
            status_code=500, detail=f"Streaming error: {str(e)}")


@router.get("/session/{session_id}", response_model=SessionStatus)
async def get_session_status(session_id: str):
    """
    Get the status of a query session
    """
    if session_id not in active_sessions:
        raise HTTPException(
            status_code=404, detail="Session not found or expired")

    session = active_sessions[session_id]
    return {
        "status": session["status"],
        "session_id": session_id
    }


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """
    Manually delete a session when client is done
    """
    if session_id not in active_sessions:
        raise HTTPException(
            status_code=404, detail="Session not found or expired")

    del active_sessions[session_id]
    return {"status": "deleted", "session_id": session_id}

# Implement a background task to clean up old sessions
# This could be done with a scheduled task using something like APScheduler


def cleanup_old_sessions():
    """
    Remove completed or stale sessions
    """
    # This could be implemented as a background task that runs periodically
    # For now, we'll just have the manual endpoint above
    pass


class UploadResponse(BaseModel):
    filename: str
    status: str


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Upload a document to be indexed by the RAG system
    """
    try:
        logger.info("Uploading document: %s", file.filename)
        os.makedirs(settings.data_path, exist_ok=True)

        file_path = os.path.join(settings.data_path, file.filename)
        logger.debug("Saving uploaded file to %s", file_path)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        logger.info("File saved: %s", file_path)

        background_tasks.add_task(process_document, file_path, file.filename)
        logger.info("Background task added for processing %s", file.filename)

        return {
            "filename": file.filename,
            "status": "Document uploaded and being processed"
        }
    except Exception as e:
        logger.exception("Error during file upload")
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")


async def process_document(file_path: str, filename: str):
    """Background task to process uploaded documents"""
    logger.info("Starting document processing: %s", filename)
    try:
        loader = PDFReader()
        documents = loader.load_data(file=Path(file_path))

        splitter = SentenceSplitter(
            chunk_size=1024,
            chunk_overlap=20,
        )
        nodes = splitter.get_nodes_from_documents(documents)

        for doc in documents:
            doc.metadata["filename"] = filename
        logger.info("Loaded %d documents from %s", len(documents), filename)

        storage_context = StorageContext.from_defaults(
            property_graph_store=get_graph_store(),
            vector_store=get_vector_store()
        )

        kg_extractor = GraphRAGExtractor(
            llm=Settings.llm,
            extract_prompt=KG_TRIPLET_EXTRACT_TMPL,
            max_paths_per_chunk=2,
            parse_fn=parse_fn,
        )

        index = await run_in_threadpool(
            PropertyGraphIndex,
            nodes=nodes,
            kg_extractors=[kg_extractor],
            storage_context=storage_context,
            property_graph_store=get_graph_store(),
            show_progress=True,
            use_async=False,
        )

        logger.info(index.property_graph_store.get_triplets())

        index.property_graph_store.build_communities()

        index.storage_context.persist(persist_dir="./storage")

        logger.info("Property Graph Index created for %s", filename)

    except Exception as e:
        logger.exception("Error processing document: %s", filename)
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info("Temporary file removed: %s", file_path)


@router.get("/documents", response_model=List[Dict[str, Any]])
async def list_documents(driver=Depends(get_neo4j_driver)):
    """
    List all documents that have been uploaded and processed in Neo4j
    Returns document information including filename and available pages
    """
    logger.info("Listing documents from Neo4j database")
    try:
        with driver.session(database=settings.neo4j_database) as session:
            # Query to get unique files and their pages from the TextNode nodes
            result = session.run(
                """
                MATCH (chunk:Chunk)
                RETURN distinct chunk.file_name as file_name
                """
            )

            documents = []
            for record in result:
                documents.append({
                    "file_name": record["file_name"],
                })

            logger.info(
                f"Found {len(documents)} documents with page information")
            return documents
    except Exception as e:
        logger.exception("Error listing documents from Neo4j")
        raise HTTPException(
            status_code=500, detail=f"Error listing documents: {str(e)}"
        )


class GraphData(BaseModel):
    nodes: List[Dict[str, Any]]
    relationships: List[Dict[str, Any]]


@router.get("/graph", response_model=GraphData)
async def get_graph_data(driver=Depends(get_neo4j_driver)):
    """
    Get the graph data for visualization
    """
    logger.info("Retrieving graph data from Neo4j database: %s",
                settings.neo4j_database)
    try:
        with driver.session(database=settings.neo4j_database) as session:
            node_result = session.run(
                """
                MATCH (d:Document)
                RETURN id(d) AS id, d.text AS text, d.metadata AS metadata
                LIMIT 100
                """
            )
            nodes = [
                {"id": rec["id"], "text": rec["text"],
                    "metadata": rec["metadata"]}
                for rec in node_result
            ]
            logger.debug("Retrieved %d nodes", len(nodes))

            rel_result = session.run(
                """
                MATCH (d1:Document)-[r]->(d2:Document)
                RETURN id(d1) AS source, id(d2) AS target, type(r) AS type
                LIMIT 100
                """
            )
            relationships = [
                {"source": rec["source"],
                    "target": rec["target"], "type": rec["type"]}
                for rec in rel_result
            ]
            logger.info("Retrieved %d relationships", len(relationships))

            return {"nodes": nodes, "relationships": relationships}
    except Exception as e:
        logger.exception("Error retrieving graph data")
        raise HTTPException(
            status_code=500, detail=f"Error getting graph data: {str(e)}"
        )
