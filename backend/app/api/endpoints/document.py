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
from app.client.mongo_client import get_documents_collection
# Import necessary LlamaIndex components for document processing and extraction
from llama_index.core.extractors import QuestionsAnsweredExtractor

# FastAPI router for document-related endpoints
router = APIRouter(tags=["document"])

# Template for generating questions from document context.
# This is used by the QuestionsAnsweredExtractor.
QUESTION_GEN_TEMPLATE = """
Here is the context:
{context_str}

Given the contextual information, \
generate {num_questions} questions this context can provide \
specific answers to which are unlikely to be found elsewhere.

Your answers should be formatted such as:
1. <question 1 content>
2. <question 2 content>
...
<num_questions>. <question num_questions content>
"""

# Pydantic model for the response after a successful document upload.
class UploadResponse(BaseModel):
    filename: str # The filename assigned to the uploaded document in storage (usually a UUID).
    status: str   # A status message indicating the upload result.

# Endpoint for uploading documents.
# Accepts a file, saves it, and schedules a background task for processing.
@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks, # FastAPI dependency for running tasks in the background.
    file: UploadFile = File(...)       # The uploaded file.
):
    """
    Handles document uploads.
    The uploaded file is saved locally first, then a background task is initiated
    to process the document (split into pages, extract text, generate graph, store in S3 and DB).
    A unique UUID is generated for the stored filename to avoid collisions.
    """
    try:
        logger.info("Uploading document: %s", file.filename)
        assert file.filename is not None, "Filename cannot be None"

        # Ensure the data directory for storing uploads exists.
        os.makedirs(settings.data_path, exist_ok=True)

        # Generate a unique filename using UUID to prevent overwrites and ensure uniqueness.
        original_extension = os.path.splitext(file.filename)[1]
        storage_filename = f"{str(uuid.uuid4())}{original_extension}"
        file_path = os.path.join(settings.data_path, storage_filename)

        # Guess the MIME type of the file.
        mimetype, _ = mimetypes.guess_type(file_path)
        if not mimetype:
            # If MIME type cannot be guessed, it might be an unsupported or unknown file type.
            # Consider how to handle this - reject, or try to process anyway.
            logger.warn(f"Could not determine mimetype for {file.filename}, using default application/octet-stream")
            mimetype = "application/octet-stream" # Or raise HTTPException

        logger.debug("Saving uploaded file to %s", file_path)
        # Save the uploaded file to the local filesystem.
        with open(file_path, "wb") as f:
            content = await file.read() # Read file content.
            f.write(content) # Write content to the local file.
        logger.info("File saved: %s", file_path)

        # Add a background task to process the document.
        # This allows the API to respond quickly to the upload request.
        background_tasks.add_task(
            process_document,  # The function to run in the background.
            Path(file_path),   # Path to the saved file.
            file.filename      # Original filename for metadata.
        )

        logger.info(
            "Background task added for processing %s (original: %s)",
            storage_filename, file.filename
        )

        return {
            "filename": storage_filename, # Return the unique storage filename.
            "status": "Document uploaded and scheduled for processing."
        }
    except Exception as e:
        logger.exception("Error during file upload for %s", file.filename)
        # Provide a more generic error message to the client for security.
        raise HTTPException(status_code=500, detail=f"An error occurred during file upload.")

# Function to parse JSON-like string responses, typically from an LLM,
# to extract entities and relationships for graph construction.
def parse_fn(response_str: str) -> Any:
    """
    Parses a string (expected to contain a JSON block) to extract structured
    entity and relationship data. This is used by the GraphRAGExtractor.
    """
    # Regex to find a JSON block within the response string.
    json_pattern = r"\{.*\}"
    match = re.search(json_pattern, response_str, re.DOTALL)
    entities = [] # List to store extracted entities.
    relationships = [] # List to store extracted relationships.
    if not match:
        # If no JSON block is found, return empty lists.
        logger.warn("No JSON block found in response string for entity/relationship parsing.")
        return entities, relationships

    json_str = match.group(0) # The matched JSON string.
    try:
        data = json.loads(json_str) # Parse the JSON string.
        # Extract entities, expecting a list of dictionaries.
        entities = [
            (
                entity.get("entity_name"), # Name of the entity.
                entity.get("entity_type"),  # Type of the entity.
                entity.get("entity_description"), # Description of the entity.
            )
            for entity in data.get("entities", []) if entity.get("entity_name") # Ensure name exists
        ]
        # Extract relationships, expecting a list of dictionaries.
        relationships = [
            (
                relation.get("source_entity"), # Source entity of the relationship.
                relation.get("target_entity"), # Target entity of the relationship.
                relation.get("relation"),       # Type of the relation.
                relation.get("relationship_description"), # Description of the relationship.
            )
            for relation in data.get("relationships", [])
            if relation.get("source_entity") and relation.get("target_entity") and relation.get("relation") # Ensure core fields exist
        ]

        logger.info(f"Extracted {len(entities)} entities and {len(relationships)} relationships.")
        return entities, relationships

    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON for entity/relationship extraction: {e}. JSON string was: {json_str}")
        # Return empty lists in case of a JSON parsing error.
        return entities, relationships

# Background task function to process an uploaded document.
# This involves splitting PDF into pages, extracting nodes, building a property graph,
# and storing metadata and page images.
async def process_document(file_path: Path, original_filename: str):
    """
    Background task that handles the core processing of an uploaded document.
    Steps:
    1. Splits PDF into individual page images (if it's a PDF).
    2. Loads document content using LlamaIndex's PDFReader.
    3. Splits document content into text nodes (chunks).
    4. Extracts entities and relationships using GraphRAGExtractor and QuestionsAnsweredExtractor.
    5. Builds a PropertyGraphIndex and stores it in Neo4j and a vector store.
    6. Uploads page images to S3.
    7. Stores document metadata in MongoDB.
    8. Cleans up temporary local files.
    """
    logger.info("Starting document processing for: %s (local path: %s)", original_filename, file_path)
    temp_page_image_dir = None # Directory to store temporary page images.
    try:
        # The UUID of the document is derived from the stem of its unique storage filename.
        doc_uuid = file_path.stem
        file_extension = os.path.splitext(original_filename)[1].lower().lstrip('.') # e.g., "pdf"

        # --- PDF Page Splitting (if applicable) ---
        page_image_paths: List[Path] = []
        if file_extension == "pdf": # Assuming only PDFs are split this way for now
            # Split the PDF into individual page images (e.g., PNGs).
            # `split_pdf_into_pages` returns a list of paths to these images and a temp directory.
            page_image_paths, temp_page_image_dir = await split_pdf_into_pages(file_path)
            logger.info(f"Split {original_filename} into {len(page_image_paths)} page images.")
        else:
            logger.info(f"Skipping page image splitting for non-PDF file: {original_filename}")


        # --- Document Loading and Node Parsing ---
        # Currently uses PDFReader; might need to be more generic for other file types.
        # TODO: Select reader based on file type.
        if file_extension == "pdf":
            loader = PDFReader()
        else:
            # For non-PDFs, a generic UnstructuredReader or similar could be used.
            # This part would need expansion for broader file type support.
            logger.warn(f"No specific loader for file type '{file_extension}'. Attempting generic load or skipping node extraction.")
            # Fallback or raise error if not handling other types for node extraction
            # For now, let's assume if not PDF, node extraction might not be meaningful in current setup
            documents = [] # Or handle differently

        if file_extension == "pdf": # Only process if loader is appropriate
            documents = await run_in_threadpool(loader.load_data, file=file_path)

            # Initialize a sentence splitter to break down document text into manageable nodes.
            splitter = SentenceSplitter(
                chunk_size=1024, # Size of each text chunk.
                chunk_overlap=20, # Overlap between chunks to maintain context.
            )
            for doc in documents:
                doc.metadata["filename"] = original_filename # Add original filename to metadata.

            # Get text nodes from the loaded documents.
            nodes = await run_in_threadpool(splitter.get_nodes_from_documents, documents)
            logger.info(
                "Loaded and split %d documents into %d nodes from %s",
                len(documents), len(nodes), original_filename
            )

            # --- Knowledge Graph Extraction and Indexing ---
            # KG extractor for custom entities/relationships and QA extractor for question entities.
            kg_extractor = GraphRAGExtractor(parse_fn=parse_fn)
            qa_extractor = QuestionsAnsweredExtractor(
                questions=3, # Number of questions to generate per node.
                prompt_template=QUESTION_GEN_TEMPLATE,
                embedding_only=False # Indicates that answers are also expected, not just embeddings.
            )

            batch_size: int = settings.batch_size
            logger.info(f"Processing {len(nodes)} nodes in batches of {batch_size} for graph indexing.")
            for i in range(0, len(nodes), batch_size):
                storage_context = StorageContext.from_defaults(
                    property_graph_store=get_graph_store(), # Neo4j graph store.
                    vector_store=get_vector_store()        # Vector store for embeddings.
                )
                node_batch = nodes[i:i + batch_size]
                logger.info(f"Processing batch {i//batch_size + 1}/{(len(nodes) + batch_size -1)//batch_size} with {len(node_batch)} nodes.")

                # Build the PropertyGraphIndex. This performs extraction and indexing.
                # Running in threadpool as some underlying LlamaIndex operations might be blocking.
                graph_index = await run_in_threadpool(
                    PropertyGraphIndex, # The index class.
                    nodes=node_batch,   # Current batch of nodes.
                    kg_extractors=[qa_extractor, kg_extractor], # Extractors to use.
                    storage_context=storage_context,
                    property_graph_store=get_graph_store(), # Explicitly pass graph store.
                    show_progress=True, # Log progress from LlamaIndex.
                    use_async=False,    # LlamaIndex async support can be complex; using sync in thread.
                )
                logger.info(f"Batch {i//batch_size + 1} processed and indexed.")

                # After the last batch, build communities in the graph store (Neo4j).
                if (i + batch_size >= len(nodes)):
                    logger.info("Last batch processed. Building communities in graph store.")
                    graph_index.property_graph_store.build_communities()
            logger.info("All nodes processed and graph index built for %s.", original_filename)
        else: # If not PDF, or no appropriate loader
            logger.info(f"Skipping node extraction and graph indexing for {original_filename} due to file type.")


        # --- S3 Upload for Page Images ---
        if page_image_paths: # If page images were generated
            s3_client = get_s3_client()
            # Uploads the directory of page images to S3 under a path named with doc_uuid.
            s3_client.upload_files_to_directory(page_image_paths, doc_uuid)
            logger.info(f"Uploaded {len(page_image_paths)} page images to S3 for document {doc_uuid}.")

        # --- Metadata Storage in MongoDB ---
        mimetype, _ = mimetypes.guess_type(file_path)
        if not mimetype:
            # Fallback mimetype if detection fails.
            mimetype = "application/octet-stream"
            logger.warn(f"Could not determine mimetype for {original_filename} during final metadata storage. Defaulting to {mimetype}.")


        documents_collection = await get_documents_collection()
        # Create a document record in MongoDB.
        await documents_collection.create_document(
            doc_uuid=doc_uuid,
            name=original_filename,
            extension=file_extension,
            mimetype=mimetype,
            pages=len(page_image_paths) # Number of pages (image-based for now).
        )
        logger.info("Document metadata stored in MongoDB for %s (UUID: %s)", original_filename, doc_uuid)

    except Exception as e:
        logger.exception("Error processing document %s (path: %s)", original_filename, file_path)
        # TODO: Add error status handling for the document in MongoDB if processing fails.
    finally:
        # --- Cleanup ---
        # Remove the temporary directory containing page images.
        if temp_page_image_dir and os.path.exists(temp_page_image_dir):
            try:
                shutil.rmtree(temp_page_image_dir)
                logger.info("Temporary page image directory removed: %s", temp_page_image_dir)
            except Exception as e:
                logger.error(f"Error removing temporary page image directory {temp_page_image_dir}: {e}")

        # Remove the initially uploaded local file.
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                logger.info("Temporary uploaded file removed: %s", file_path)
            except Exception as e:
                logger.error(f"Error removing temporary uploaded file {file_path}: {e}")

# Pydantic model representing a document for API responses.
class Document(BaseModel):
    name: str      # Original filename of the document.
    uuid: str      # Unique ID used for S3 storage and database referencing.
    mimetype: str  # MIME type of the document.
    pages: list[str] # List of pre-signed URLs for accessing document pages (images from S3).
    extension: str # File extension of the original document.

# Pydantic model for a list of documents.
class DocumentList(BaseModel):
    documents: list[Document] # A list of Document objects.

# Endpoint to list all processed documents.
@router.get("/documents", response_model=DocumentList)
async def list_documents():
    """
    Retrieves a list of all documents that have been uploaded and processed.
    For each document, it provides metadata and pre-signed URLs to access its pages (images from S3).
    """
    # TODO: Implement user-specific document listing if multi-tenancy is required.
    logger.info("List documents request received.")
    try:
        documents_collection = await get_documents_collection() # MongoDB collection.
        # Fetch all document records from MongoDB.
        # TODO: Add pagination for large numbers of documents.
        db_documents = await documents_collection.list_documents()
        logger.info(f"Retrieved {len(db_documents)} documents from database.")

        s3_client = get_s3_client() # S3 client for generating pre-signed URLs.
        document_api_list: List[Document] = [] # List to hold API-formatted document data.

        for doc_data in db_documents:
            page_urls: List[str] = []
            # Generate pre-signed URLs for each page of the document.
            # These URLs allow temporary, secure access to the page images in S3.
            if doc_data.get("pages", 0) > 0 and doc_data.get("uuid") and doc_data.get("extension"):
                for i in range(1, doc_data["pages"] + 1):
                    # Construct the S3 object key for each page.
                    s3_object_key = f"{doc_data['uuid']}/page_{i}.{doc_data['extension']}" # Assuming page images have same ext as original for now
                    # TODO: Page image extension might differ from original PDF (e.g., always PNG). Adjust if needed.
                    presigned_url = s3_client.get_presigned_url(s3_object_key)
                    if presigned_url:
                        page_urls.append(presigned_url)
                    else:
                        logger.warn(f"Failed to get presigned URL for {s3_object_key}")
            else:
                logger.warn(f"Document {doc_data.get('name')} (UUID: {doc_data.get('uuid')}) has no pages or missing info for URL generation.")


            document_api_list.append(
                Document(
                    name=doc_data["name"],
                    uuid=doc_data["uuid"],
                    mimetype=doc_data["mimetype"],
                    extension=doc_data["extension"],
                    pages=page_urls
                )
            )
        logger.info(f"Prepared API list with {len(document_api_list)} documents with pre-signed URLs.")
        return {"documents": document_api_list}
    except Exception as e:
        logger.exception("Error listing documents.")
        raise HTTPException(
            status_code=500, detail="An error occurred while listing documents."
        )

# Development/Debug endpoint to clear all data from Neo4j and MongoDB documents collection.
# USE WITH CAUTION - this will delete all processed document data.
@router.get("/drop")
async def drop_all_data():
    """
    Development endpoint to clear all data from Neo4j graph and MongoDB documents collection.
    This is destructive and should not be exposed in a production environment without protection.
    """
    logger.warn("Received request to drop all data. This is a destructive operation.")
    from app.client.mongo_client import get_documents_collection # Local import for safety
    from app.dependencies import drop_all_neo4j_data # Local import

    try:
        await drop_all_neo4j_data() # Clear Neo4j.
        logger.info("Successfully dropped all Neo4j data.")

        docs_collection = await get_documents_collection()
        await docs_collection.drop_database() # Clear MongoDB documents collection.
        logger.info("Successfully dropped MongoDB documents database.")

        return {"status": "success", "message": "All Neo4j and MongoDB document data dropped."}
    except Exception as e:
        logger.exception("Error during data drop operation.")
        raise HTTPException(status_code=500, detail=f"Error dropping data: {str(e)}")


@router.get("/document/{uuid}")
async def download_document(doc_uuid: str): # Renamed parameter to avoid conflict with uuid module
    """
    Downloads the original document file specified by its UUID.
    It retrieves the file from S3 and streams it back to the client.
    """
    logger.info(f"Download document request for UUID: {doc_uuid}")
    try:
        documents_collection = await get_documents_collection()
        # Retrieve document metadata from MongoDB to get original filename, mimetype, and S3 key.
        document_metadata = await documents_collection.get_document(doc_uuid)

        if not document_metadata:
            logger.warn(f"Document with UUID {doc_uuid} not found in database.")
            raise HTTPException(
                status_code=404,
                detail="Document not found."
            )

        logger.info(f"Document metadata for {doc_uuid}: {document_metadata}")

        s3_client = get_s3_client()
        # Construct the S3 object key for the original file.
        # This assumes the original file is stored with its UUID as name and original extension.
        file_extension: str = document_metadata["extension"]
        s3_object_name: str = f"{doc_uuid}.{file_extension}"

        # Download the file content from S3. This returns a StreamingBody.
        file_content_stream = s3_client.download(s3_object_name)

        if not file_content_stream:
            logger.error(f"File {s3_object_name} not found in S3 for document UUID {doc_uuid}.")
            raise HTTPException(
                status_code=404,
                detail="File not found in storage."
            )

        # Stream the file content back to the client.
        return StreamingResponse(
            file_content_stream,
            media_type=document_metadata.get("mimetype", "application/octet-stream"), # Use stored mimetype.
            headers={
                # Advise browser to download the file with its original name.
                "Content-Disposition": f"attachment; filename=\"{document_metadata['name']}\""
            }
        )
    except Exception as e:
        logger.exception(f"Error downloading document with UUID: {doc_uuid}")
        raise HTTPException(
            status_code=500, detail=f"Error downloading document: {str(e)}"
        )

# Pydantic model for graph data (nodes and relationships).
class GraphData(BaseModel):
    nodes: List[Dict[str, Any]]       # List of nodes, each a dictionary.
    relationships: List[Dict[str, Any]] # List of relationships, each a dictionary.

# Endpoint to retrieve graph data (nodes and relationships) from Neo4j for visualization.
@router.get("/graph", response_model=GraphData)
async def get_graph_data(driver=Depends(get_neo4j_driver)): # Depends on Neo4j driver.
    """
    Fetches nodes and relationships from the Neo4j database to be used for graph visualization.
    Currently retrieves 'Document' nodes and their relationships.
    Limits the number of nodes and relationships returned (e.g., 100 of each).
    """
    logger.info("Retrieving graph data from Neo4j database: %s", settings.neo4j_database)
    try:
        # Using a synchronous session here, which is fine for read-only,
        # but consider `await run_in_threadpool` for very complex or long queries.
        with driver.session(database=settings.neo4j_database) as session:
            # Cypher query to get nodes (limiting to 100).
            # Fetches node ID, text content, and metadata.
            node_result = session.run(
                """
                MATCH (d:Document)
                RETURN id(d) AS id, d.text AS text, d.metadata AS metadata
                LIMIT 100
                """
                # Consider adding WHERE clauses or more specific matching for larger graphs.
            )
            nodes = [
                {"id": record["id"], "text": record["text"], "metadata": record.get("metadata", {})}
                for record in node_result
            ]
            logger.debug(f"Retrieved {len(nodes)} nodes from Neo4j.")

            # Cypher query to get relationships (limiting to 100).
            # Fetches source node ID, target node ID, and relationship type.
            rel_result = session.run(
                """
                MATCH (d1:Document)-[r]->(d2:Document)
                RETURN id(d1) AS source, id(d2) AS target, type(r) AS type
                LIMIT 100
                """
                # This query assumes relationships are between 'Document' nodes.
                # Adjust if your graph model has other node labels or relationship patterns.
            )
            relationships = [
                {"source": record["source"], "target": record["target"], "type": record["type"]}
                for record in rel_result
            ]
            logger.info(f"Retrieved {len(relationships)} relationships from Neo4j.")

            return {"nodes": nodes, "relationships": relationships}
    except Exception as e:
        logger.exception("Error retrieving graph data from Neo4j.")
        raise HTTPException(
            status_code=500, detail=f"An error occurred while getting graph data."
        )
