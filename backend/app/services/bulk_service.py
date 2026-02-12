import asyncio
import logging
import uuid

from app.jobs.store import JobStore
from app.models.script import ScriptRequest
from app.services.pipeline_service import PipelineService
from app.utils.csv_parser import parse_product_csv

logger = logging.getLogger(__name__)


class BulkService:
    def __init__(self, pipeline_svc: PipelineService, job_store: JobStore):
        self.pipeline_svc = pipeline_svc
        self.job_store = job_store
        self._bulk_jobs: dict[str, list[str]] = {}  # bulk_id -> list of job_ids
        self._bulk_tasks: dict[str, asyncio.Task] = {}

    async def process_csv(self, file_content: bytes) -> tuple[str, list[str]]:
        """Parse a CSV file and create jobs for each product row.

        Returns (bulk_id, list_of_job_ids).
        """
        rows = parse_product_csv(file_content)
        bulk_id = uuid.uuid4().hex[:12]

        job_ids: list[str] = []
        for row in rows:
            request = ScriptRequest(
                product_name=row["product_name"],
                specifications=row["specifications"],
                image_url=row["image_url"],
            )
            job = self.job_store.create_job(request)
            job_ids.append(job.job_id)

        self._bulk_jobs[bulk_id] = job_ids

        logger.info(
            "Parsed CSV for bulk %s: %d products, %d jobs created",
            bulk_id,
            len(rows),
            len(job_ids),
        )
        return bulk_id, job_ids

    async def start_bulk(self, bulk_id: str, concurrency: int = 2):
        """Start processing multiple jobs with bounded concurrency."""
        job_ids = self._bulk_jobs.get(bulk_id)
        if job_ids is None:
            raise ValueError(f"Bulk {bulk_id} not found")

        task = asyncio.create_task(
            self._run_bulk(bulk_id, job_ids, concurrency),
            name=f"bulk-{bulk_id}",
        )
        self._bulk_tasks[bulk_id] = task

    async def _run_bulk(self, bulk_id: str, job_ids: list[str], concurrency: int):
        """Run multiple pipeline jobs with bounded concurrency."""
        semaphore = asyncio.Semaphore(concurrency)

        async def run_one(job_id: str):
            async with semaphore:
                job = self.job_store.get_job(job_id)
                if job is None:
                    return
                await self.pipeline_svc.run_full_pipeline(job_id, job.request)

        tasks = [run_one(jid) for jid in job_ids]
        await asyncio.gather(*tasks, return_exceptions=True)
        logger.info("Bulk %s completed: %d jobs processed", bulk_id, len(job_ids))

    def get_bulk_status(self, bulk_id: str) -> dict:
        """Get status of all jobs in a bulk batch."""
        job_ids = self._bulk_jobs.get(bulk_id)
        if job_ids is None:
            raise ValueError(f"Bulk {bulk_id} not found")

        jobs = []
        for jid in job_ids:
            job = self.job_store.get_job(jid)
            if job:
                jobs.append({
                    "job_id": job.job_id,
                    "status": job.status.value,
                    "product_name": job.request.product_name,
                })

        task = self._bulk_tasks.get(bulk_id)
        is_running = task is not None and not task.done()

        return {
            "bulk_id": bulk_id,
            "total_jobs": len(job_ids),
            "is_running": is_running,
            "jobs": jobs,
        }
