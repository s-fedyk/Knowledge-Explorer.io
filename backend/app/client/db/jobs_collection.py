# app/db/jobs_collection.py
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from enum import Enum
from app.client.db.mongo_base import MongoDBBase
from app.utils.logging_decorator import log_db_operation

logger = logging.getLogger(__name__)


class Status(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobsCollection(MongoDBBase):
    async def initialize(self):
        """Initialize collection and indexes"""
        if not self.is_connected:
            await self.connect()

        self.collection = self.db.jobs

        # Create indexes for efficient queries
        await self.collection.create_index("job_id", unique=True)
        await self.collection.create_index("query_id")
        await self.collection.create_index("stage")
        await self.collection.create_index("status")
        await self.collection.create_index("created_at")

        # Compound index for finding jobs by query and stage
        await self.collection.create_index([("query_id", 1), ("stage", 1)])

        # TTL index to auto-delete old completed jobs after 7 days
        await self.collection.create_index(
            "completed_at",
            expireAfterSeconds=7 * 24 * 60 * 60
        )

    @log_db_operation
    async def create_job(self,
                         job_id: str,
                         query_id: str,
                         stage: str,
                         params: Dict[str, Any],
                         job_type: str,
                         ) -> Dict[str, Any]:
        """Create a new job record"""
        now = datetime.utcnow()

        job_data = {
            "job_id": job_id,
            "query_id": query_id,
            "stage": stage,
            "job_type": job_type,
            "params": params,
            "status": Status.PENDING,
            "created_at": now,
            "updated_at": now,
            "result": None,
            "started_at": None,
            "completed_at": None
        }

        await self.collection.insert_one(job_data)
        logger.info(
            f"Created job {job_id} for query {query_id} at stage {stage}")
        return job_data

    @log_db_operation
    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a job by ID"""
        job = await self.collection.find_one({"job_id": job_id})
        return job

    @log_db_operation
    async def get_jobs_by_query(self, query_id: str) -> List[Dict[str, Any]]:
        """Retrieve all jobs for a specific query"""
        cursor = self.collection.find(
            {"query_id": query_id}).sort("created_at", 1)
        jobs = await cursor.to_list(length=100)
        return jobs

    @log_db_operation
    async def get_jobs_by_stage(self, query_id: str, stage: str) -> List[Dict[str, Any]]:
        """Retrieve jobs for a specific query and stage"""
        cursor = self.collection.find({
            "query_id": query_id,
            "stage": stage
        }).sort("created_at", -1)
        jobs = await cursor.to_list(length=10)
        return jobs

    @log_db_operation
    async def get_pending_jobs(self, stage: Optional[str] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Get pending jobs, optionally filtered by stage"""
        query = {"status": Status.PENDING}
        if stage:
            query["stage"] = stage

        cursor = self.collection.find(query).sort("created_at", 1).limit(limit)
        jobs = await cursor.to_list(length=limit)
        return jobs

    @log_db_operation
    async def update_job_status(self,
                                job_id: str,
                                status: str,
                                error: Optional[str] = None,
                                result: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Update job status and related fields"""
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow()
        }

        if status == Status.RUNNING:
            update_data["started_at"] = datetime.utcnow()
        elif status in [Status.COMPLETED, Status.FAILED]:
            update_data["completed_at"] = datetime.utcnow()

        if error is not None:
            update_data["error"] = error

        if result is not None:
            update_data["result"] = result

        result_doc = await self.collection.update_one(
            {"job_id": job_id},
            {"$set": update_data}
        )

        if result_doc.matched_count:
            logger.info(f"Updated job {job_id} status to {status}")
            return await self.get_job(job_id)

        logger.warning(f"Job {job_id} not found for status update")
        return None

    @log_db_operation
    async def update_job_dag(self, job_id: str, dag_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update the DAG data for a job"""
        update_data = {
            "dag": dag_data,
            "updated_at": datetime.utcnow()
        }

        result = await self.collection.update_one(
            {"job_id": job_id},
            {"$set": update_data}
        )

        if result.matched_count:
            return await self.get_job(job_id)
        return None

    @log_db_operation
    async def store_job_result(self, job_id: str, result: Any) -> Optional[Dict[str, Any]]:
        """Store the result of a completed job"""
        return await self.update_job_status(job_id, Status.COMPLETED, result=result)

    @log_db_operation
    async def mark_job_failed(self, job_id: str, error: str) -> Optional[Dict[str, Any]]:
        """Mark a job as failed with error message"""
        return await self.update_job_status(job_id, Status.FAILED, error=error)

    @log_db_operation
    async def delete_job(self, job_id: str) -> bool:
        """Delete a job record"""
        result = await self.collection.delete_one({"job_id": job_id})
        return result.deleted_count > 0

    @log_db_operation
    async def delete_jobs_by_query(self, query_id: str) -> int:
        """Delete all jobs for a specific query"""
        result = await self.collection.delete_many({"query_id": query_id})
        logger.info(
            f"Deleted {result.deleted_count} jobs for query {query_id}")
        return result.deleted_count

    @log_db_operation
    async def get_job_statistics(self, query_id: Optional[str] = None) -> Dict[str, Any]:
        """Get statistics about jobs"""
        match_stage = {"$match": {"query_id": query_id}
                       } if query_id else {"$match": {}}

        pipeline = [
            match_stage,
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }
            }
        ]

        cursor = self.collection.aggregate(pipeline)
        results = await cursor.to_list(length=10)

        stats = {
            "total": 0,
            "pending": 0,
            "running": 0,
            "completed": 0,
            "failed": 0
        }

        for result in results:
            status = result["_id"]
            count = result["count"]
            if status in stats:
                stats[status] = count
            stats["total"] += count

        return stats

    @log_db_operation
    async def list_active_jobs(self, skip: int = 0, limit: int = 50) -> List[Dict[str, Any]]:
        """List active (non-completed) jobs with pagination"""
        cursor = self.collection.find({
            "status": {"$in": [Status.PENDING, Status.RUNNING]}
        }).sort("created_at", -1).skip(skip).limit(limit)

        jobs = await cursor.to_list(length=limit)
        return jobs

    @log_db_operation
    async def cleanup_old_jobs(self, days: int = 30) -> int:
        """Manually cleanup jobs older than specified days"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        result = await self.collection.delete_many({
            "completed_at": {"$lt": cutoff_date},
            "status": {"$in": [Status.COMPLETED, Status.FAILED]}
        })

        logger.info(f"Cleaned up {result.deleted_count} old jobs")
        return result.deleted_count
