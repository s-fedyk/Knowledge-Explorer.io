import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv


# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    """
    # OpenAI API key for LLM
    openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")

    # LLM model to use
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4.1-nano")

    # Neo4j configuration
    neo4j_uri: str = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
    neo4j_username: str = os.getenv("NEO4J_USERNAME", "neo4j")
    neo4j_password: str = os.getenv("NEO4J_PASSWORD", "password")
    neo4j_database: str = os.getenv("NEO4J_DATABASE", "neo4j")

    mongo_url: str = os.getenv(
        "MONGODB_URI",
        "mongodb://admin:password@mongodb:27017/"
    )
    mongo_db_name: str = os.getenv("MONGODB_DB_NAME", "rag_app")

    # Base paths
    data_path: str = os.getenv("DATA_PATH", "./data/documents")
    vectorstore_path: str = os.getenv("VECTORSTORE_PATH", "./vectorstore")

    # Index settings
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "1024"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "20"))

    doc_bucket: str = os.getenv("S3_DOC_BUCKET", "")
    aws_access_key_id: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    aws_secret_access_key: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    aws_region: str = os.getenv("AWS_REGION", "us-east-2")


settings = Settings()
