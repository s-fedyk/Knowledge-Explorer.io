# app/db/queries_collection.py
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from app.client.db.mongo_base import MongoDBBase
from app.utils.logging_decorator import log_db_operation


logger = logging.getLogger(__name__)


class QueriesCollection(MongoDBBase):
    async def initialize(self):
        """Initialize collection and indexes"""
        if not self.is_connected:
            await self.connect()

        self.collection = self.db.queries

        await self.collection.create_index("query_id", unique=True)
        await self.collection.create_index("created_at", expireAfterSeconds=3600)

    @log_db_operation
    async def create_query(self,
                           query_id: str,
                           top_k: int,
                           mode: str,
                           query_text: str) -> Dict[str, Any]:
        now = datetime.utcnow()
        query_data = {
            "query_id": query_id,
            "top_k": top_k,
            "status": "processing",
            "mode": mode,
            "stage": 1,
            "query": query_text,
            "created_at": now,
            "updated_at": now,
            "sources": None
        }

        await self.collection.insert_one(query_data)
        return query_data

    @log_db_operation
    async def update_query(self, query_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        update_data["updated_at"] = datetime.utcnow()

        result = await self.collection.update_one(
            {"query_id": query_id},
            {"$set": update_data}
        )
        if result.matched_count:
            return await self.get_query(query_id)
        return None

    @log_db_operation
    async def get_query(self, query_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a query by ID"""
        query = await self.collection.find_one({"query_id": query_id})

        return query

    @log_db_operation
    async def delete_query(self, query_id: str) -> bool:
        """Delete a query by ID"""
        result = await self.collection.delete_one({"query_id": query_id})
        return result.deleted_count > 0

    @log_db_operation
    async def increment_stage(self, query_id: str) -> Optional[Dict[str, Any]]:
        """Increment the stage for a query by 1"""
        now = datetime.utcnow()
        result = await self.collection.update_one(
            {"query_id": query_id},
            {
                "$inc": {"stage": 1},
                "$set": {"updated_at": now}
            }
        )
        if result.matched_count:
            return await self.get_query(query_id)
        return None

    @log_db_operation
    async def store_query_sources(self, query_id: str, sources: List[str]) -> bool:
        """Store the sources for a query"""
        now = datetime.utcnow()
        sources_data = {
            "query_id": query_id,
            "sources": sources,
            "status": "streaming",
            "created_at": now,
            "updated_at": now
        }

        # Use upsert to handle both insert and update cases
        result = await self.collection.update_one(
            {"query_id": query_id},
            {"$set": sources_data},
            upsert=True
        )

        return result.modified_count > 0 or result.upserted_id is not None

    @log_db_operation
    async def get_query_sources(self, query_id: str) -> Optional[List[str]]:
        """Get sources for a specific query"""
        sources_doc = await self.collection.find_one({"query_id": query_id})
        return sources_doc["sources"] if sources_doc else None
