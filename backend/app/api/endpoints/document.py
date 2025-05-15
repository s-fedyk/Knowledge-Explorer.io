import mimetypes
import os
import re
import uuid
import json
import shutil
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel
from pathlib import Path
from fastapi.concurrency import run_in_threadpool
from llama_index.core import StorageContext
from llama_index.core import Settings
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.indices.property_graph import PropertyGraphIndex
from llama_index.core import StorageContext
from llama_index.readers.file import PDFReader
from starlette.responses import StreamingResponse
from app.client.s3_client import get_s3_client
from app.dependencies import get_vector_store, get_neo4j_driver, get_graph_store
from app.logger import logger
from app.config import settings
from app.rag.GraphRagExtractor import GraphRAGExtractor
from app.utils.page_splitter import split_pdf_into_pages
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

        mimetype, _ = mimetypes.guess_type(file_path)
        if not mimetype:
            raise Exception("Unknown file type")

        logger.debug("Saving uploaded file to %s", file_path)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        logger.info("File saved: %s", file_path)

        background_tasks.add_task(
            process_document,
            Path(file_path),
            file.filename
        )

        logger.info(
            "Background task added for processing %s",
            storage_filename
        )

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


async def process_document(file_path: Path, filename: str):
    """Background task to process uploaded documents"""
    logger.info("Starting document processing: %s", filename)
    temp_dir = None
    try:
        # we use a uuid to identify the file, so there
        # are no collisions in storage.
        pages, temp_dir = await split_pdf_into_pages(file_path)
        logger.info(f"Split into pages: {pages}")

        doc_uuid = file_path.stem
        extension = os.path.splitext(filename)[1][1:]

        loader = PDFReader()
        documents = loader.load_data(file=file_path)

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

        logger.info("nodes we are builidng an index on=%s", nodes)
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

        # index is built by this point, we can upload the document
        # to retrieve
        s3_client = get_s3_client()
        s3_client.upload_files_to_directory(pages, doc_uuid)

        mimetype, _ = mimetypes.guess_type(file_path)
        if not mimetype:
            raise Exception("Unknown file type")

        documents_collection = await get_documents_collection()

        await documents_collection.create_document(
            doc_uuid=doc_uuid,
            name=filename,
            extension=extension,
            mimetype=mimetype,
            pages=len(pages)
        )

        index_info_collection = await get_index_info_collection()
        await index_info_collection.update_index_info(
            "documentrag",
            entity_info,
            community_summary
        )

        logger.info("Property Graph Index created for %s", filename)
    except Exception as e:
        logger.exception("Error processing document: %s", filename)
    finally:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            logger.info("Temporary directory removed: %s", temp_dir)
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info("Temporary file removed: %s", file_path)


class Document(BaseModel):
    name: str
    uuid: str  # the uuid is used to index S3
    mimetype: str
    pages: list[str]
    extension: str


class DocumentList(BaseModel):
    documents: list[Document]


@router.get("/documents", response_model=DocumentList)
async def list_documents(driver=Depends(get_neo4j_driver)):
    """
    List all documents that have been uploaded and processed
    Returns all documents.
    """

    # TODO: This should list the available files for a particular user.
    logger.info("List documents request")
    try:
        documents_collection = await get_documents_collection()
        documents = await documents_collection.list_documents()
        logger.info(
            "Documents=%s",
            documents
        )

        s3_client = get_s3_client()

        document_list: List[Document] = []
        for document in documents:

            # Presign uris, client requests pages directly from zon.
            pages: List[str] = []
            for i in range(1, document["pages"]+1):
                presigned_uri = s3_client.get_presigned_url(
                    f"{document['uuid']}/page_{i}.{document['extension']}"
                )

                logger.info("Got URI=%s", presigned_uri)
                if presigned_uri:
                    pages.append(presigned_uri)

            logger.info("pages=%s", pages)
            document_list.append(
                Document(
                    name=document["name"],
                    uuid=document["uuid"],
                    mimetype=document["mimetype"],
                    extension=document["extension"],
                    pages=pages
                )
            )

        return {
            "documents": document_list
        }
    except Exception as e:
        logger.exception("Error listing documents")
        raise HTTPException(
            status_code=500, detail=f"Error listing documents: {str(e)}"
        )


@router.get("/document/{uuid}")
async def download_document(uuid: str):
    """
    Download a specific document by UUID
    """
    logger.info(f"Download document request for UUID: {uuid}")
    try:
        # Verify the document exists in the database
        documents_collection = await get_documents_collection()
        document = await documents_collection.get_document(uuid)

        logger.info("Document metadata = {$s}", document)

        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found"
            )

        # Get the file from S3
        s3_client = get_s3_client()

        extension: str = document["extension"]
        object_name: str = f"{uuid}.{extension}"

        file_content = s3_client.download(object_name)

        if not file_content:
            raise HTTPException(
                status_code=404,
                detail="File not found in storage"
            )

        # Create a streaming response with the correct content type
        return StreamingResponse(
            file_content,
            media_type=document[
                "mimetype"
            ],
            headers={
                "Content-Disposition": f"attachment; filename=\"{document['name']}\""
            }
        )
    except Exception as e:
        logger.exception(f"Error downloading document: {uuid}")
        raise HTTPException(
            status_code=500, detail=f"Error downloading document: {str(e)}"
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
