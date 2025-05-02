import os
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from pydantic import BaseModel

from llama_index.core import Document
from llama_index.core import VectorStoreIndex
from llama_index.readers.file import PyPDFReader
from app.dependencies import get_rag_engine, get_service_context, get_vector_store
from app.config import settings

router = APIRouter(tags=["rag"])


class QueryRequest(BaseModel):
    query: str
    similarity_top_k: int = 3


class QueryResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]


class UploadResponse(BaseModel):
    filename: str
    status: str


@router.post("/query", response_model=QueryResponse)
async def query_documents(
    request: QueryRequest,
    index: VectorStoreIndex = Depends(get_rag_engine)
):
    """
    Query the RAG system with a natural language question
    """
    try:
        # Create a query engine
        query_engine = index.as_query_engine(
            similarity_top_k=request.similarity_top_k,
            response_mode="compact"
        )

        # Execute the query
        response = query_engine.query(request.query)

        # Extract source nodes
        source_nodes = response.source_nodes
        sources = []

        for node in source_nodes:
            sources.append({
                "text": node.node.text,
                "score": node.score if hasattr(node, "score") else None,
                "document": node.node.metadata.get("filename", "Unknown")
            })

        return {
            "answer": str(response),
            "sources": sources
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")


def process_document(file_path: str, filename: str):
    """Background task to process uploaded documents"""
    try:
        # Load documents
        loader = PyPDFReader()
        documents = loader.load(file_path=file_path)

        # Add metadata
        for doc in documents:
            doc.metadata["filename"] = filename

        # Get vector store and service context
        vector_store = get_vector_store()
        service_context = get_service_context()

        # Create index and insert documents
        index = VectorStoreIndex.from_documents(
            documents,
            service_context=service_context,
            vector_store=vector_store
        )

        # Clean up temporary file
        os.remove(file_path)

    except Exception as e:
        print(f"Error processing document: {e}")
        # Clean up on error
        if os.path.exists(file_path):
            os.remove(file_path)


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Upload a document to be indexed by the RAG system
    """
    try:
        # Create data directory if it doesn't exist
        os.makedirs(settings.data_path, exist_ok=True)

        # Save the file temporarily
        file_path = os.path.join(settings.data_path, file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Process the document in the background
        background_tasks.add_task(process_document, file_path, file.filename)

        return {
            "filename": file.filename,
            "status": "Document uploaded and being processed"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")


@router.get("/documents", response_model=List[str])
async def list_documents():
    """
    List all documents that have been uploaded and processed
    """
    try:
        documents = []
        for filename in os.listdir(settings.data_path):
            if filename != ".gitkeep" and os.path.isfile(os.path.join(settings.data_path, filename)):
                documents.append(filename)
        return documents
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error listing documents: {str(e)}")
