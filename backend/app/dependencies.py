import os
from functools import lru_cache
from typing import Dict, Any, Optional
from neo4j import GraphDatabase

from llama_index.core import ServiceContext, VectorStoreIndex, StorageContext
from llama_index.vector_stores.neo4jvector import Neo4jVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.openai import OpenAIEmbedding

from app.config import settings


@lru_cache
def get_neo4j_driver():
    """Get or create a Neo4j driver."""
    try:
        driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_username, settings.neo4j_password)
        )
        # Test the connection
        with driver.session(database=settings.neo4j_database) as session:
            result = session.run("RETURN 1")
            result.single()
        return driver
    except Exception as e:
        raise ConnectionError(f"Failed to connect to Neo4j: {e}")


@lru_cache
def get_vector_store():
    """Get or create a Neo4j vector store."""
    driver = get_neo4j_driver()

    # Create Neo4j vector store
    vector_store = Neo4jVectorStore(
        driver=driver,
        database=settings.neo4j_database,
        index_name="ragdocuments",
        node_label="Document",
        text_node_property="text",
        embedding_node_property="embedding",
        metadata_node_property="metadata",
        embedding_dimension=1536  # Default for OpenAI ada-002
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

        # Check if the index exists and has documents
        try:
            # Create the index from existing vector store
            index = VectorStoreIndex.from_vector_store(
                vector_store,
                service_context=service_context,
                storage_context=storage_context
            )
        except Exception as e:
            # If no documents exist yet, create an empty index
            print(f"No existing documents found: {e}")
            index = VectorStoreIndex(
                [], service_context=service_context, storage_context=storage_context)

        return index
    except Exception as e:
        print(f"Error creating RAG engine: {e}")
        raise
