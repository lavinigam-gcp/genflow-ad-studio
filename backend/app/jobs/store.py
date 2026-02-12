import logging
import uuid
from datetime import datetime

from app.models.job import Job, JobProgress, JobStatus, JobStep
from app.models.script import ScriptRequest

logger = logging.getLogger(__name__)


class JobStore:
    def __init__(self):
        self._jobs: dict[str, Job] = {}

    def create_job(self, request: ScriptRequest) -> Job:
        """Create a new job with a unique ID and PENDING status."""
        job_id = uuid.uuid4().hex[:12]
        now = datetime.now()
        job = Job(
            job_id=job_id,
            status=JobStatus.PENDING,
            created_at=now,
            updated_at=now,
            request=request,
        )
        self._jobs[job_id] = job
        logger.info("Created job %s for product '%s'", job_id, request.product_name)
        return job

    def get_job(self, job_id: str) -> Job | None:
        """Get a job by ID."""
        return self._jobs.get(job_id)

    def list_jobs(self) -> list[Job]:
        """List all jobs, ordered by creation time descending."""
        return sorted(
            self._jobs.values(),
            key=lambda j: j.created_at,
            reverse=True,
        )

    def update_job(self, job_id: str, **kwargs) -> Job:
        """Update job fields and set updated_at timestamp.

        Accepts any field name matching Job model attributes.
        """
        job = self._jobs.get(job_id)
        if job is None:
            raise ValueError(f"Job {job_id} not found")

        for key, value in kwargs.items():
            if hasattr(job, key):
                setattr(job, key, value)
            else:
                logger.warning("Ignoring unknown job field: %s", key)

        job.updated_at = datetime.now()
        self._jobs[job_id] = job
        return job

    def cancel_job(self, job_id: str) -> Job:
        """Mark a job as cancelled."""
        job = self._jobs.get(job_id)
        if job is None:
            raise ValueError(f"Job {job_id} not found")

        job.status = JobStatus.CANCELLED
        job.updated_at = datetime.now()
        self._jobs[job_id] = job
        logger.info("Cancelled job %s", job_id)
        return job

    def set_progress(
        self,
        job_id: str,
        step: JobStep,
        step_index: int,
        detail: str = "",
    ) -> Job:
        """Update job progress information."""
        return self.update_job(
            job_id,
            progress=JobProgress(
                current_step=step,
                step_index=step_index,
                detail=detail,
            ),
        )
