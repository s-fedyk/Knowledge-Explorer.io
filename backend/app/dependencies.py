from functools import lru_cache
from llama_index.core import VectorStoreIndex
from neo4j import GraphDatabase
from app.rag.GraphRagStore import GraphRAGStore
from app.rag.GraphRAGLocalQueryEngine import GraphRAGLocalQueryEngine
from app.rag.GraphRAGQueryEngine import GraphRAGQueryEngine
from llama_index.vector_stores.neo4jvector import Neo4jVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.llms.openai import OpenAIResponses
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core import Settings
from app.config import settings


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


def get_graph_store() -> GraphRAGStore:
    store = GraphRAGStore(
        username=settings.neo4j_username,
        password=settings.neo4j_password,
        url=settings.neo4j_uri,
    )
    return store


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
        text_node_property="text",
        embedding_node_property="embedding",
        metadata_node_property="metadata",
        embedding_dimension=3072
    )

    return vector_store


RET_QUERY = """
WITH collect(node) as nodes
WITH nodes,
collect {
    UNWIND nodes as n
    MATCH (c:Chunk)-[:MENTIONS]->(n)
    WITH c, count(distinct n) as freq
    RETURN "{("+c.id+")} " + c.text AS chunkText
    ORDER BY freq DESC
    LIMIT 10
} AS text_mapping,
collect {
    UNWIND nodes as n
    // Outgoing relationships from nodes to external nodes
    OPTIONAL MATCH (n)-[r]->(m) 
    WHERE NOT m IN nodes
    WITH n, r, m WHERE r IS NOT NULL
    RETURN "{(" + n.name + ")[" + type(r) + "]->(" + m.name + ")} " + r.relationship_description AS descriptionText
    UNION
    // Incoming relationships from external nodes to nodes
    UNWIND nodes as n
    OPTIONAL MATCH (m)-[r]->(n) 
    WHERE NOT m IN nodes
    WITH n, r, m WHERE r IS NOT NULL
    RETURN "{(" + m.name + ")[" + type(r) + "]->(" + n.name + ")} " + r.relationship_description AS descriptionText
    LIMIT 30
} as outsideRels,
collect {
    UNWIND nodes as n
    // Outgoing relationships between nodes in the collection
    OPTIONAL MATCH (n)-[r]->(m) 
    WHERE m IN nodes
    WITH n, r, m WHERE r IS NOT NULL
    RETURN "{(" + n.name + ")[" + type(r) + "]->(" + m.name + ")} " + r.relationship_description AS descriptionText
    UNION
    // Incoming relationships between nodes in the collection
    UNWIND nodes as n
    OPTIONAL MATCH (m)-[r]->(n) 
    WHERE m IN nodes AND m <> n
    WITH n, r, m WHERE r IS NOT NULL
    RETURN "{(" + m.name + ")[" + type(r) + "]->(" + n.name + ")} " + r.relationship_description AS descriptionText
    LIMIT 30
} as insideRels,
collect {
    UNWIND nodes as n
    MATCH (n)
    WHERE NOT n:__Question__
    RETURN "{(" + n.name + ")} " + n.entity_description AS descriptionText
    LIMIT 30
} as entities,
collect {
    UNWIND nodes as n
    MATCH (n)-[r]-(m:__Entity__) 
    WHERE NOT m IN nodes AND NOT m:__Question__
    RETURN DISTINCT "{(" + m.name + ")} " + m.entity_description AS descriptionText
    LIMIT 30
} as relatedEntities
RETURN apoc.text.join([n IN nodes | toString(id(n))], '|') + "[SPLIT]"+ apoc.text.join(text_mapping, '|') +
       "<>" + apoc.text.join(outsideRels + insideRels, '|') + 
       "<>" + apoc.text.join(entities, "|") +"|"+ apoc.text.join(relatedEntities, "|") AS text, 
       1.0 as score,
       nodes[0].id as id,
       {_node_type:nodes[0]._node_type, _node_content:nodes[0]._node_content} AS metadata
"""


def get_local_engine(top_k: int):
    driver = get_neo4j_driver()

    # Create Neo4j vector store
    vector_store = Neo4jVectorStore(
        username=settings.neo4j_username,
        password=settings.neo4j_password,
        url=settings.neo4j_uri,
        driver=driver,
        database=settings.neo4j_database,
        index_name="entity",
        node_label="__Entity__",
        text_node_property="text",
        embedding_node_property="embedding",
        metadata_node_property="metadata",
        retrieval_query=RET_QUERY,
        embedding_dimension=3072,
    )

    local_index = VectorStoreIndex.from_vector_store(
        vector_store,
        embed_model=Settings.embed_model
    )

    local_query_engine = GraphRAGLocalQueryEngine(
        index=local_index,
        similarity_top_k=top_k
    )

    return local_query_engine


RET_QUERY_COMMUNITY = """
RETURN  id(node) + "[SPLIT]{" + id(node) +"} "+ node.text AS text, score, id(node) as id,
node {.*, text: Null, 
embedding: Null, id: node.id } AS metadata
"""


def get_global_engine(top_k: int):
    driver = get_neo4j_driver()
    vector_store = Neo4jVectorStore(
        username=settings.neo4j_username,
        password=settings.neo4j_password,
        url=settings.neo4j_uri,
        driver=driver,
        database=settings.neo4j_database,
        node_label="__Community__",
        text_node_property="text",
        embedding_node_property="embedding",
        metadata_node_property="metadata",
        retrieval_query=RET_QUERY_COMMUNITY,
        embedding_dimension=3072
    )
    graph_store = get_graph_store()

    index = VectorStoreIndex.from_vector_store(
        vector_store=vector_store,
        embed_model=Settings.embed_model
    )

    query_engine = GraphRAGQueryEngine(
        graph_store=graph_store,
        index=index,
        similarity_top_k=top_k
    )

    return query_engine


def get_engine(mode: str, top_k: int):

    mode_to_engine = {
        "local": get_local_engine(top_k),
        "global": get_global_engine(top_k)
    }

    return mode_to_engine[mode]


def init_settings():
    """Create a service context for the RAG pipeline."""
    llm = OpenAIResponses(
        streaming=True,
        api_key=settings.openai_api_key,
        model=settings.llm_model,
        temperature=0.1,
        reasoning="high"
    )

    embed_model = OpenAIEmbedding(
        api_key=settings.openai_api_key,
        model="text-embedding-3-large",
        dimensions=3072
    )

    node_parser = SentenceSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap
    )

    Settings.llm = llm
    Settings.embed_model = embed_model
    Settings.node_parser = node_parser

    return Settings


async def drop_all_neo4j_data():
    """
    Drop all data from Neo4j database (deletes all indexes, constraints, nodes and relationships)
    This is a destructive operation and will remove ALL data from the database.
    Use with extreme caution as this operation is irreversible.
    """
    import logging
    logger = logging.getLogger(__name__)
    try:
        # Get the Neo4j driver using your existing function
        driver = get_neo4j_driver()
        logger.warning("Preparing to delete ALL data from Neo4j database")

        # Execute Cypher to drop all indexes and constraints first
        with driver.session(database=settings.neo4j_database) as session:
            # First drop all constraints
            constraints = session.run("SHOW CONSTRAINTS").data()
            for constraint in constraints:
                constraint_name = constraint['name']
                session.run(f"DROP CONSTRAINT {constraint_name} IF EXISTS")
                logger.warning(f"Dropped constraint: {constraint_name}")

            # Then drop all indexes
            indexes = session.run("SHOW INDEXES").data()
            for index in indexes:
                index_name = index['name']
                session.run(f"DROP INDEX {index_name} IF EXISTS")
                logger.warning(f"Dropped index: {index_name}")

            # Finally delete all nodes and relationships
            result_nodes = session.run("MATCH (n) DETACH DELETE n")
            node_count = result_nodes.consume().counters.nodes_deleted
            relationship_count = result_nodes.consume().counters.relationships_deleted

            logger.warning(
                f"Deleted {node_count} nodes and {relationship_count} relationships from Neo4j database"
            )

        return {
            "success": True,
            "constraints_dropped": len(constraints),
            "indexes_dropped": len(indexes),
            "nodes_deleted": node_count,
            "relationships_deleted": relationship_count
        }
    except Exception as e:
        logger.error(f"Error dropping Neo4j database: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
