import os
from typing import Optional
from pydantic import BaseSettings
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
    llm_model: str = os.getenv("LLM_MODEL", "gpt-3.5-turbo")

    # Weaviate configuration
    weaviate_url: str = os.getenv("WEAVIATE_URL", "http://weaviate:8080")

    # Base paths
    data_path: str = os.getenv("DATA_PATH", "./data/documents")
    vectorstore_path: str = os.getenv("VECTORSTORE_PATH", "./vectorstore")

    # Index settings
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "1024"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "20"))

    # Environment
    env: str = os.getenv("ENV", "development")

    class Config:
        env_file = ".env"


settings = Settings()
