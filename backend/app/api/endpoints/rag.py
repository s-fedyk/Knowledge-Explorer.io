import os
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel
from neo4j import GraphDatabase
from pathlib import Path
from fastapi.concurrency import run_in_threadpool
from llama_index.core import Document
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.core import Settings

from llama_index.core.indices.property_graph import PropertyGraphIndex
from llama_index.core import StorageContext
from llama_index.core.indices.property_graph import (
    PropertyGraphIndex,
    TextToCypherRetriever,
)
from llama_index.readers.file import PDFReader
from app.dependencies import get_rag_engine, get_vector_store, get_neo4j_driver, get_kg_extractor, get_graph_store
from app.config import settings


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

router = APIRouter(tags=["rag"])


class QueryRequest(BaseModel):
    query: str
    similarity_top_k: int = 3


class SourceItem(BaseModel):
    text: str
    score: Optional[float]
    document: str


class GraphItem(BaseModel):
    text: str


class QueryResponse(BaseModel):
    answer: List[str]
    sources: List[SourceItem]


class UploadResponse(BaseModel):
    filename: str
    status: str


@router.post("/query", response_model=QueryResponse)
async def query_documents(
    request: QueryRequest,
    index: VectorStoreIndex = Depends(get_rag_engine),
    graph_store=Depends(get_graph_store),
):
    """
    Query the RAG system with a natural language question
    """
    logger.info("Received query: '%s' with top_k=%d",
                request.query, request.similarity_top_k)
    try:
        query_engine = index.as_query_engine(
            similarity_top_k=request.similarity_top_k,
            response_mode="compact"
        )
        response = query_engine.query(request.query)

        source_nodes = response.source_nodes
        sources = [
            {
                "text": node.node.text,
                "score": getattr(node, "score", None),
                "document": node.node.metadata.get("filename", "Unknown")
            }
            for node in source_nodes
        ]

        storage_ctx = StorageContext.from_defaults(
            property_graph_store=graph_store
        )
        pg_index = PropertyGraphIndex.from_existing(
            property_graph_store=graph_store,
            storage_context=storage_ctx,
        )

        cypher_ret = TextToCypherRetriever(
            graph_store,
            llm=Settings.llm,
        )
        pg_engine = pg_index.as_query_engine(
            sub_retrievers=[cypher_ret],
            include_text=True
        )

        pg_resp = await run_in_threadpool(
            pg_engine.query,
            request.query
        )

        return {
            "answer": [str(response), str(pg_resp)],
            "sources": sources,
        }
    except Exception as e:
        logger.exception("Error during query execution")
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")


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

        for doc in documents:
            doc.metadata["filename"] = filename
        logger.info("Loaded %d documents from %s", len(documents), filename)

        vector_store = get_vector_store()
        graph_store = get_graph_store()

        storage_context = StorageContext.from_defaults(
            vector_store=vector_store,
            property_graph_store=graph_store,
        )

        VectorStoreIndex.from_documents(
            documents,
            show_progress=True,
            storage_context=storage_context
        )

        logger.info("Vector Index created for %s", filename)

        index = await run_in_threadpool(
            PropertyGraphIndex.from_documents,
            documents,
            kg_extractors=[get_kg_extractor()],
            storage_context=storage_context,
            show_progress=True,
            use_async=False,
        )
        index.storage_context.persist(persist_dir="./storage")

        logger.info("Property Graph Index created for %s", filename)

    except Exception as e:
        logger.exception("Error processing document: %s", filename)
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info("Temporary file removed: %s", file_path)


@router.get("/documents", response_model=List[str])
async def list_documents():
    """
    List all documents that have been uploaded and processed
    """
    logger.info("Listing documents in %s", settings.data_path)
    try:
        files = [
            f for f in os.listdir(settings.data_path)
            if f != ".gitkeep" and os.path.isfile(os.path.join(settings.data_path, f))
        ]
        logger.info("Found %d documents", len(files))
        return files
    except Exception as e:
        logger.exception("Error listing documents")
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
