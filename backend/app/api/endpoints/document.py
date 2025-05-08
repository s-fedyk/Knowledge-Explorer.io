import os
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
import re
import uuid
from pydantic import BaseModel
from pathlib import Path
import json
from fastapi.concurrency import run_in_threadpool
from llama_index.core import StorageContext
from llama_index.core import Settings
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.indices.property_graph import PropertyGraphIndex
from llama_index.core import StorageContext
from llama_index.readers.file import PDFReader
from app.dependencies import get_vector_store, get_neo4j_driver, get_graph_store
from app.logger import logger
from app.config import settings
from app.rag.GraphRagExtractor import GraphRAGExtractor
from app.client.mongo_client import get_documents_collection, get_index_info_collection


router = APIRouter(tags=["document"])


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
        assert (file.filename)

        os.makedirs(settings.data_path, exist_ok=True)

        # Generate a UUID for the file
        original_extension = os.path.splitext(file.filename)[1]
        storage_filename = f"{str(uuid.uuid4())}{original_extension}"

        file_path = os.path.join(settings.data_path, storage_filename)

        logger.debug("Saving uploaded file to %s", file_path)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        logger.info("File saved: %s", file_path)

        background_tasks.add_task(
            process_document, file_path, storage_filename)

        logger.info("Background task added for processing %s",
                    storage_filename)

        return {
            "filename": storage_filename,
            "status": "Document uploaded and being processed"
        }
    except Exception as e:
        logger.exception("Error during file upload")
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")


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

        # Rebuild communities and update the shared db store.
        index.property_graph_store.build_communities()

        community_summary = index.property_graph_store.community_summary
        entity_info = index.property_graph_store.entity_info

        index_info_collection = await get_index_info_collection()

        await index_info_collection.update_index_info(
            "index",
            entity_info,
            community_summary
        )

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
