# app/db/index_info_collection.py
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from app.client.db.mongo_base import MongoDBBase
from app.utils.logging_decorator import log_db_operation

logger = logging.getLogger(__name__)


class IndexInfoCollection(MongoDBBase):
    async def initialize(self):
        """Initialize collection and indexes"""
        if not self.is_connected:
            await self.connect()

        self.collection = self.db.index_info_collection

        # Create indexes
        await self.collection.create_index("uuid", unique=True)

    @log_db_operation
    async def get_index_info(self, index_name: str) -> Optional[Dict[str, Any]]:
        """Retrieve index info by name"""
        index_info = await self.collection.find_one({"index_name": index_name})
        logger.info(
            "Retrieved index_info with name=%s, contents=%s",
            index_name,
            index_info
        )
        return index_info

    @log_db_operation
    async def update_index_info(self, index_name: str, entity_info: Dict[str, list[int]],
                                community_info: Dict[int, str]) -> Optional[Dict[str, Any]]:
        """Create or update index info with the given entity and community information"""
        now = datetime.utcnow()

        community_info_stringified = {
            str(k): v for k, v in community_info.items()
        }

        # Build the update data
        update_data = {
            "uuid": index_name,
            "entity_info": entity_info,
            "community_info": community_info_stringified,
            "updated_at": now
        }

        # Use upsert to handle both creation and updates
        result = await self.collection.update_one(
            {"index_name": index_name},
            {
                "$set": update_data,
                # Only set created_at if document is being inserted
                "$setOnInsert": {"created_at": now}
            },
            upsert=True
        )

        logger.info(
            "Upserted index_info with name=%s, was_inserted=%s",
            index_name,
            result.upserted_id is not None
        )

        return await self.get_index_info(index_name)

    @log_db_operation
    async def delete_index_info(self, index_name: str) -> bool:
        """Delete an index info by name"""
        result = await self.collection.delete_one({"index_name": index_name})
        logger.info(
            "Deleted index_info with name=%s, deleted_count=%s",
            index_name, result.deleted_count
        )
        return result.deleted_count > 0

    @log_db_operation
    async def list_index_infos(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """List index infos with pagination"""
        cursor = self.collection.find().sort(
            "created_at", -1).skip(skip).limit(limit)
        index_infos = await cursor.to_list(length=limit)
        return index_infos
