import logging
import uuid
from datetime import datetime

from app.models.job import Job, JobProgress, JobStatus, JobStep
from app.models.script import ScriptRequest
import json
from pathlib import Path

logger = logging.getLogger(__name__)

JOBS_FILE = Path("output/jobs.json")


class JobStore:
    def __init__(self):
        self._jobs: dict[str, Job] = {}
        self._load()

    def _load(self):
        """Load jobs from disk."""
        if not JOBS_FILE.exists():
            return
        try:
            with open(JOBS_FILE, "r") as f:
                data = json.load(f)
                for job_data in data.values():
                    # Handle datetime strings
                    if "created_at" in job_data:
                        job_data["created_at"] = datetime.fromisoformat(job_data["created_at"])
                    if "updated_at" in job_data:
                        job_data["updated_at"] = datetime.fromisoformat(job_data["updated_at"])
                    self._jobs[job_data["job_id"]] = Job(**job_data)
            logger.info("Loaded %d jobs from disk", len(self._jobs))
        except Exception:
            logger.exception("Failed to load jobs from disk")

    def _save(self):
        """Save jobs to disk."""
        try:
            JOBS_FILE.parent.mkdir(parents=True, exist_ok=True)
            data = {
                jid: job.model_dump(mode="json")
                for jid, job in self._jobs.items()
            }
            with open(JOBS_FILE, "w") as f:
                json.dump(data, f, indent=2)
        except Exception:
            logger.exception("Failed to save jobs to disk")

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
        self._save()
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
        self._save()
        return job

    def cancel_job(self, job_id: str) -> Job:
        """Mark a job as cancelled."""
        job = self._jobs.get(job_id)
        if job is None:
            raise ValueError(f"Job {job_id} not found")

        job.status = JobStatus.CANCELLED
        job.updated_at = datetime.now()
        self._jobs[job_id] = job
        self._save()
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
