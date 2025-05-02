import os
import weaviate
from functools import lru_cache
from typing import Dict, Any, Optional

from llama_index.core import ServiceContext, VectorStoreIndex, StorageContext
from llama_index.vector_stores.weaviate import WeaviateVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.embeddings import OpenAIEmbedding

from app.config import settings


@lru_cache
def get_weaviate_client():
    """Get or create a Weaviate client."""
    try:
        client = weaviate.Client(url=settings.weaviate_url)
        return client
    except Exception as e:
        raise ConnectionError(f"Failed to connect to Weaviate: {e}")


@lru_cache
def get_vector_store():
    """Get or create a vector store."""
    client = get_weaviate_client()
    vector_store = WeaviateVectorStore(
        weaviate_client=client,
        index_name="RAGDocuments",
        text_key="content"
    )
    return vector_store


@lru_cache
def get_service_context():
    """Create a service context for the RAG pipeline."""
    # Set up the LLM
    llm = OpenAI(
        api_key=settings.openai_api_key,
        model=settings.llm_model,
        temperature=0.1
    )

    # Set up the embedding model
    embed_model = OpenAIEmbedding(
        api_key=settings.openai_api_key,
        model="text-embedding-ada-002"
    )

    # Set up the node parser for chunking
    node_parser = SentenceSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap
    )

    # Create and return the service context
    service_context = ServiceContext.from_defaults(
        llm=llm,
        embed_model=embed_model,
        node_parser=node_parser
    )

    return service_context


@lru_cache
def get_rag_engine():
    """Get or create the RAG engine."""
    try:
        # Get vector store and service context
        vector_store = get_vector_store()
        service_context = get_service_context()

        # Create storage context
        storage_context = StorageContext.from_defaults(
            vector_store=vector_store)

        # Create the index
        index = VectorStoreIndex.from_vector_store(
            vector_store,
            service_context=service_context,
            storage_context=storage_context
        )

        return index
    except Exception as e:
        print(f"Error creating RAG engine: {e}")
        raise
