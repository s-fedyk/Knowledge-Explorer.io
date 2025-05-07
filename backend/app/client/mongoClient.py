# mongoClient.py
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class QueryData(BaseModel):
    query_id: str
    status: str
    query: str
    created_at: datetime
    updated_at: datetime
    sources: Optional[List[str]] = None
    error: Optional[str] = None


class Document(BaseModel):
    uuid: str
    name: str
    url: str  # Points to S3 bucket
    created_at: datetime
    updated_at: datetime


class MongoDBClient:
    def __init__(self):
        self.client = None
        self.db = None
        self.queries_collection = None
        self.documents_collection = None
        self.is_connected = False

    async def connect(self):
        """Connect to MongoDB and initialize collections"""
        try:
            # Get connection details from environment variables or use defaults
            mongo_url = settings.mongo_url
            db_name = settings.mongo_db_name

            # Create async MongoDB client
            self.client = AsyncIOMotorClient(mongo_url)

            # Check connection
            await self.client.admin.command('ping')

            # Access database and collections
            self.db = self.client[db_name]
            self.queries_collection = self.db.queries
            self.documents_collection = self.db.documents    # Collection for S3 documents

            # Create indexes for queries
            await self.queries_collection.create_index("query_id", unique=True)
            # Expire after 1 hour
            await self.queries_collection.create_index("created_at", expireAfterSeconds=3600)

            # Create indexes for documents
            await self.documents_collection.create_index("uuid", unique=True)
            await self.documents_collection.create_index("name")

            self.is_connected = True
            logger.info(
                f"Connected to MongoDB at {mongo_url}, database: {db_name}")
            return True

        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            self.is_connected = False
            return False

    async def create_query(self, query_id: str, query_text: str) -> Dict[str, Any]:
        """Create a new query in MongoDB"""
        now = datetime.utcnow()
        query_data = {
            "query_id": query_id,
            "status": "processing",
            "query": query_text,
            "created_at": now,
            "updated_at": now,
            "sources": None
        }

        inserted_id = await self.queries_collection.insert_one(query_data)
        logger.info(
            "create_query query_id={%s}. inserted_id={%s}. data={%s}",
            query_id,
            inserted_id,
            query_data
        )

        return query_data

    async def update_query(self, query_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing query"""
        update_data["updated_at"] = datetime.utcnow()

        result = await self.queries_collection.update_one(
            {"query_id": query_id},
            {"$set": update_data}
        )

        logger.info(
            "update_query query_id={%s}.",
            query_id,
        )
        if result.matched_count:
            return await self.get_query(query_id)
        return None

    async def get_query(self, query_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a query by ID"""
        query = await self.queries_collection.find_one({"query_id": query_id})

        logger.info(
            "get_query query_id={%s}.",
            query_id,
        )
        return query

    async def delete_query(self, query_id: str) -> bool:
        """Delete a query by ID"""
        result = await self.queries_collection.delete_one({"query_id": query_id})
        return result.deleted_count > 0

    async def store_query_sources(self, query_id: str, sources: List[str]) -> bool:
        """Store the sources for a query in the separate sources collection"""
        logger.info(
            "store_query_sources begin, query_id= %s",
            query_id
        )

        now = datetime.utcnow()
        sources_data = {
            "query_id": query_id,
            "sources": sources,
            "status": "streaming",
            "created_at": now,
            "updated_at": now
        }

        # Use upsert to handle both insert and update cases
        result = await self.queries_collection.update_one(
            {"query_id": query_id},
            {"$set": sources_data},
            upsert=True
        )

        logger.info(
            "store_query_sources query_id={%s}.",
            query_id,
        )

        return result.modified_count > 0 or result.upserted_id is not None

    async def get_query_sources(self, query_id: str) -> Optional[List[str]]:
        """Get sources for a specific query"""
        sources_doc = await self.queries_collection.find_one({"query_id": query_id})
        return sources_doc["sources"] if sources_doc else None

    async def create_document(self, doc_uuid: str, name: str, url: str) -> Dict[str, Any]:
        """Create a new document record pointing to S3"""
        now = datetime.utcnow()
        document_data = {
            "uuid": doc_uuid,
            "name": name,
            "url": url,
            "created_at": now,
            "updated_at": now
        }

        await self.documents_collection.insert_one(document_data)
        return document_data

    async def get_document(self, doc_uuid: str) -> Optional[Dict[str, Any]]:
        """Retrieve a document by UUID"""
        document = await self.documents_collection.find_one({"uuid": doc_uuid})
        return document

    async def get_documents_by_name(self, name: str) -> List[Dict[str, Any]]:
        """Retrieve documents by name (may return multiple)"""
        cursor = self.documents_collection.find({"name": name})
        # Limit to 100 docs with same name
        documents = await cursor.to_list(length=100)
        return documents

    async def update_document(self, doc_uuid: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing document"""
        update_data["updated_at"] = datetime.utcnow()

        result = await self.documents_collection.update_one(
            {"uuid": doc_uuid},
            {"$set": update_data}
        )

        if result.matched_count:
            return await self.get_document(doc_uuid)
        return None

    async def delete_document(self, doc_uuid: str) -> bool:
        """Delete a document record (does not delete from S3)"""
        result = await self.documents_collection.delete_one({"uuid": doc_uuid})
        return result.deleted_count > 0

    async def list_documents(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """List documents with pagination"""
        cursor = self.documents_collection.find().sort(
            "created_at", -1).skip(skip).limit(limit)
        documents = await cursor.to_list(length=limit)
        return documents

    async def cleanup_old_data(self, hours: int = 24) -> Dict[str, int]:
        """Clean up queries and sources older than specified hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        queries_result = await self.queries_collection.delete_many(
            {"created_at": {"$lt": cutoff_time}}
        )

        # Note: We don't delete documents automatically

        return {
            "queries_deleted": queries_result.deleted_count,
            "sources_deleted": sources_result.deleted_count
        }

    async def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("Disconnected from MongoDB")


# Create a singleton instance
mongoClient = MongoDBClient()


async def get_mongoClient() -> MongoDBClient:
    """Dependency to get the MongoDB client"""
    if not mongoClient.is_connected:
        await mongoClient.connect()
    return mongoClient
