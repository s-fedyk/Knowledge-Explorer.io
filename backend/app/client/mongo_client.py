# app/db/mongo_client.py
from datetime import datetime, timedelta
from typing import Dict, Any
from app.client.db import index_infos_collection
from app.client.db.jobs_collection import JobsCollection
from app.client.db.mongo_base import MongoDBBase
from app.client.db.queries_collection import QueriesCollection
from app.client.db.documents_collection import DocumentsCollection
from app.client.db.index_infos_collection import IndexInfoCollection
import logging

logger = logging.getLogger(__name__)


class MongoDBClient(MongoDBBase):
    def __init__(self):
        super().__init__()
        self.queries = QueriesCollection()
        self.documents = DocumentsCollection()
        self.index_info = IndexInfoCollection()
        self.jobs = JobsCollection()

    async def connect(self):
        """Connect to MongoDB and initialize all collections"""
        logger.info("Attempting MongoDB connection...")
        result = await super().connect()
        if result:
            await self.queries.initialize()
            await self.documents.initialize()
            await self.index_info.initialize()
            await self.jobs.initialize()
        return result

    async def cleanup_old_data(self, hours: int = 24) -> Dict[str, int]:
        """Clean up queries older than specified hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        queries_result = await self.queries.collection.delete_many(
            {"created_at": {"$lt": cutoff_time}}
        )

        # We don't delete documents automatically
        return {
            "queries_deleted": queries_result.deleted_count
        }


# Create a singleton instance
mongo_client = MongoDBClient()


async def get_mongo_client() -> MongoDBClient:
    """Dependency to get the MongoDB client"""
    if not mongo_client.is_connected:
        await mongo_client.connect()
    return mongo_client


async def get_queries_collection() -> QueriesCollection:
    client = await get_mongo_client()
    return client.queries


async def get_documents_collection() -> DocumentsCollection:
    client = await get_mongo_client()
    return client.documents


async def get_index_info_collection() -> IndexInfoCollection:
    client = await get_mongo_client()
    return client.index_info


async def get_jobs_collection() -> JobsCollection:
    client = await get_mongo_client()
    return client.jobs
