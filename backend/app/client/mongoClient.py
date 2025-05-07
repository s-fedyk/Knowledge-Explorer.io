# mongodb_client.py
import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SessionData(BaseModel):
    session_id: str
    status: str
    query: str
    created_at: datetime
    updated_at: datetime
    sources: Optional[List[str]] = None
    error: Optional[str] = None


class MongoDBClient:
    def __init__(self):
        self.client = None
        self.db = None
        self.sessions_collection = None
        self.is_connected = False

    async def connect(self):
        """Connect to MongoDB and initialize collections"""
        try:
            # Get connection details from environment variables or use defaults
            mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
            db_name = os.getenv("MONGODB_DB_NAME", "rag_app")

            # Create async MongoDB client
            self.client = AsyncIOMotorClient(mongo_url)

            # Check connection
            await self.client.admin.command('ping')

            # Access database and collections
            self.db = self.client[db_name]
            self.sessions_collection = self.db.sessions

            # Create indexes
            await self.sessions_collection.create_index("session_id", unique=True)
            # Expire after 1 hour
            await self.sessions_collection.create_index("created_at", expireAfterSeconds=3600)

            self.is_connected = True
            logger.info(
                f"Connected to MongoDB at {mongo_url}, database: {db_name}")
            return True

        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            self.is_connected = False
            return False

    async def create_session(self, session_id: str, query: str) -> Dict[str, Any]:
        """Create a new session in MongoDB"""
        now = datetime.utcnow()
        session_data = {
            "session_id": session_id,
            "status": "processing",
            "query": query,
            "created_at": now,
            "updated_at": now
        }

        await self.sessions_collection.insert_one(session_data)
        return session_data

    async def update_session(self, session_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing session"""
        update_data["updated_at"] = datetime.utcnow()

        result = await self.sessions_collection.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )

        if result.matched_count:
            return await self.get_session(session_id)
        return None

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a session by ID"""
        session = await self.sessions_collection.find_one({"session_id": session_id})
        return session

    async def delete_session(self, session_id: str) -> bool:
        """Delete a session by ID"""
        result = await self.sessions_collection.delete_one({"session_id": session_id})
        return result.deleted_count > 0

    async def update_session_sources(self, session_id: str, sources: List[str]) -> bool:
        """Update the sources for a session"""
        return await self.update_session(session_id, {"sources": sources, "status": "streaming"})

    async def cleanup_old_sessions(self, hours: int = 24) -> int:
        """Clean up sessions older than specified hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        result = await self.sessions_collection.delete_many({"created_at": {"$lt": cutoff_time}})
        return result.deleted_count

    async def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("Disconnected from MongoDB")


# Create a singleton instance
mongodb_client = MongoDBClient()


async def get_mongodb_client() -> MongoDBClient:
    """Dependency to get the MongoDB client"""
    if not mongodb_client.is_connected:
        await mongodb_client.connect()
    return mongodb_client
