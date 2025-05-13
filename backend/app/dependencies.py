from functools import lru_cache
from neo4j import GraphDatabase
from app.rag.GraphRagStore import GraphRAGStore
from llama_index.vector_stores.neo4jvector import Neo4jVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core import Settings
from app.config import settings

RETRIEVAL_QUERY = """
match (node: `__Entity__`)
WITH collect(node) as nodes
WITH nodes,
collect {
    UNWIND nodes as n
    MATCH (c:Chunk)-[:MENTIONS]->(n)
    WITH c, count(distinct n) as freq
    RETURN c.text AS chunkText
    ORDER BY freq DESC
} AS text_mapping,
collect {
    UNWIND nodes as n
    MATCH (n)-[:IN_COMMUNITY]->(c:__Community__)
    WITH c, c.rank as rank, c.weight AS weight
    RETURN c.summary 
    ORDER BY rank, weight DESC
} AS report_mapping,
collect {
    UNWIND nodes as n
    MATCH (n)-[r]-(m) 
    WHERE NOT m IN nodes
    RETURN r.relationship_description AS descriptionText
} as outsideRels,
collect {
    UNWIND nodes as n
    MATCH (n)-[r]-(m) 
    WHERE m IN nodes
    RETURN r.relationship_description AS descriptionText
} as insideRels,
collect {
    UNWIND nodes as n
    RETURN n.entity_description AS descriptionText
} as entities
// We don't have covariates or claims here
RETURN "Chunks:" + apoc.text.join(text_mapping, '|') + "\nReports: " + apoc.text.join(report_mapping,'|') +  
       "\nRelationships: " + apoc.text.join(outsideRels + insideRels, '|') + 
       "\nEntities: " + apoc.text.join(entities, "|") AS text, 1.0 AS score, nodes[0].id AS id, {_node_type:nodes[0]._node_type, _node_content:nodes[0]._node_content} AS metadata
"""


@lru_cache
def get_neo4j_driver():
    """Get or create a Neo4j driver."""
    try:
        driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_username, settings.neo4j_password)
        )

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
        index_name="community",
        node_label="Document",
        text_node_property="text",
        embedding_node_property="embedding",
        metadata_node_property="metadata",
        embedding_dimension=1536
    )

    return vector_store


def init_settings():
    """Create a service context for the RAG pipeline."""
    llm = OpenAI(
        streaming=True,
        api_key=settings.openai_api_key,
        model=settings.llm_model,
        temperature=0.1
    )

    embed_model = OpenAIEmbedding(
        api_key=settings.openai_api_key,
        model="text-embedding-ada-002"
    )

    node_parser = SentenceSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap
    )

    Settings.llm = llm
    Settings.embed_model = embed_model
    Settings.node_parser = node_parser

    return Settings
