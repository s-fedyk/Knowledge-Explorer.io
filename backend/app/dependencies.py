import os
from functools import lru_cache
from typing import Dict, Any, Optional
from neo4j import GraphDatabase

from app.api.endpoints.GraphRagStore import GraphRAGStore

from llama_index.core import VectorStoreIndex, StorageContext

from llama_index.graph_stores.neo4j import Neo4jPropertyGraphStore
from llama_index.vector_stores.neo4jvector import Neo4jVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.openai import OpenAIEmbedding

from llama_index.core import Settings
from typing import Literal
from llama_index.core.indices.property_graph import SchemaLLMPathExtractor

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
def get_graph_store() -> GraphRAGStore:
    store = GraphRAGStore(
        username=settings.neo4j_username,
        password=settings.neo4j_password,
        url=settings.neo4j_uri,
    )
    return store


@lru_cache
def get_kg_extractor():
    entities = Literal["PERSON", "PLACE", "THING"]
    relations = Literal["PART_OF", "HAS", "IS_A"]
    schema = {
        "PERSON": ["PART_OF", "HAS", "IS_A"],
        "PLACE": ["PART_OF", "HAS"],
        "THING": ["IS_A"],
    }

    kg_extractor = SchemaLLMPathExtractor(
        llm=Settings.llm,
        possible_entities=entities,
        possible_relations=relations,
        kg_validation_schema=schema,
        strict=True,  # if false, will allow triplets outside of the schema
        num_workers=4,
        max_triplets_per_chunk=10,
    )

    return kg_extractor


@lru_cache
def get_vector_store():
    """Get or create a Neo4j vector store."""
    driver = get_neo4j_driver()

    # Create Neo4j vector store
    vector_store = Neo4jVectorStore(
        username=settings.neo4j_username,
        password=settings.neo4j_password,
        url=settings.neo4j_uri,
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


def init_settings():
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

    Settings.llm = llm
    Settings.embed_model = embed_model
    Settings.node_parser = node_parser

    return Settings


@lru_cache
def get_rag_engine():
    """Get or create the RAG engine."""
    try:
        # Get vector store and service context
        vector_store = get_vector_store()

        # Create storage context
        storage_context = StorageContext.from_defaults(
            vector_store=vector_store)

        # Check if the index exists and has documents
        try:
            # Create the index from existing vector store
            index = VectorStoreIndex.from_vector_store(
                vector_store,
                storage_context=storage_context
            )
        except Exception as e:
            # If no documents exist yet, create an empty index
            print(f"No existing documents found: {e}")
            index = VectorStoreIndex(
                [],
                storage_context=storage_context
            )

        return index
    except Exception as e:
        print(f"Error creating RAG engine: {e}")
        raise
