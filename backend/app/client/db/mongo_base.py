# app/db/mongo_base.py
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MongoDBBase:
    def __init__(self):
        self.client = None
        self.db = None
        self.is_connected = False

    async def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("Disconnected from MongoDB")

    async def connect(self):
        """Connect to MongoDB"""
        try:
            # Get connection details from environment variables or use defaults
            mongo_url = settings.mongo_url
            db_name = settings.mongo_db_name

            logger.info("values = %s, %s", mongo_url, db_name)

            # Create async MongoDB client
            self.client = AsyncIOMotorClient(mongo_url)

            # Check connection
            await self.client.admin.command('ping')

            # Access database
            self.db = self.client[db_name]

            self.is_connected = True
            logger.info(
                f"Connected to MongoDB at {mongo_url}, database: {db_name}")
            return True

        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            self.is_connected = False
            return False
