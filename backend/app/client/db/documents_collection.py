# app/db/documents_collection.py
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from app.client.db.mongo_base import MongoDBBase
from app.utils.logging_decorator import log_db_operation

logger = logging.getLogger(__name__)


class DocumentsCollection(MongoDBBase):
    async def initialize(self):
        """Initialize collection and indexes"""
        if not self.is_connected:
            await self.connect()

        self.collection = self.db.documents

        # This table's purpose is to store metadata about files
        # We have chunks that reference uuids in the graph db.
        await self.collection.create_index("uuid", unique=True)
        await self.collection.create_index("name")

    @log_db_operation
    async def create_document(self, doc_uuid: str, name: str) -> Dict[str, Any]:
        """Create a new document record pointing to S3"""
        now = datetime.utcnow()
        document_data = {
            "uuid": doc_uuid,
            "name": name,
            "created_at": now,
            "updated_at": now
        }

        await self.collection.insert_one(document_data)
        return document_data

    @log_db_operation
    async def get_document(self, doc_uuid: str) -> Optional[Dict[str, Any]]:
        """Retrieve a document by UUID"""
        document = await self.collection.find_one({"uuid": doc_uuid})
        return document

    @log_db_operation
    async def get_documents_by_name(self, name: str) -> List[Dict[str, Any]]:
        """Retrieve documents by name (may return multiple)"""
        cursor = self.collection.find({"name": name})
        documents = await cursor.to_list(length=100)
        return documents

    @log_db_operation
    async def update_document(self, doc_uuid: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update an existing document"""
        update_data["updated_at"] = datetime.utcnow()

        result = await self.collection.update_one(
            {"uuid": doc_uuid},
            {"$set": update_data}
        )

        if result.matched_count:
            return await self.get_document(doc_uuid)
        return None

    @log_db_operation
    async def delete_document(self, doc_uuid: str) -> bool:
        """Delete a document record (does not delete from S3)"""
        result = await self.collection.delete_one({"uuid": doc_uuid})
        return result.deleted_count > 0

    @log_db_operation
    async def list_documents(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """List documents with pagination"""
        cursor = self.collection.find().sort(
            "created_at", -1).skip(skip).limit(limit)
        documents = await cursor.to_list(length=limit)
        return documents
