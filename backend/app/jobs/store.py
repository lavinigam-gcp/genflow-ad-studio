import json
import logging
import uuid
from datetime import datetime

from app.db import Database
from app.models.job import Job, JobProgress, JobStatus, JobStep
from app.models.script import ScriptRequest

logger = logging.getLogger(__name__)


class JobStore:
    def __init__(self, db: Database):
        self.db = db

    def create_job(self, request: ScriptRequest, job_id: str | None = None) -> Job:
        job_id = job_id or uuid.uuid4().hex[:12]
        now = datetime.now()
        job = Job(
            job_id=job_id,
            status=JobStatus.PENDING,
            created_at=now,
            updated_at=now,
            request=request,
        )
        with self.db.connect() as conn:
            conn.execute(
                """INSERT INTO jobs (job_id, status, created_at, updated_at, request_json)
                   VALUES (?, ?, ?, ?, ?)""",
                (job_id, job.status.value, now.isoformat(), now.isoformat(),
                 json.dumps(request.model_dump())),
            )
        logger.info("Created job %s for product '%s'", job_id, request.product_name)
        return job

    def get_job(self, job_id: str) -> Job | None:
        with self.db.connect() as conn:
            row = conn.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,)).fetchone()
        if row is None:
            return None
        return self._row_to_job(row)

    def list_jobs(self) -> list[Job]:
        with self.db.connect() as conn:
            rows = conn.execute("SELECT * FROM jobs ORDER BY created_at DESC").fetchall()
        return [self._row_to_job(r) for r in rows]

    def update_job(self, job_id: str, **kwargs) -> Job:
        job = self.get_job(job_id)
        if job is None:
            raise ValueError(f"Job {job_id} not found")

        for key, value in kwargs.items():
            if hasattr(job, key):
                setattr(job, key, value)
            else:
                logger.warning("Ignoring unknown job field: %s", key)

        job.updated_at = datetime.now()
        self._save_job(job)
        return job

    def cancel_job(self, job_id: str) -> Job:
        job = self.get_job(job_id)
        if job is None:
            raise ValueError(f"Job {job_id} not found")
        job.status = JobStatus.CANCELLED
        job.updated_at = datetime.now()
        self._save_job(job)
        logger.info("Cancelled job %s", job_id)
        return job

    def set_progress(self, job_id: str, step: JobStep, step_index: int, detail: str = "") -> Job:
        return self.update_job(
            job_id,
            progress=JobProgress(current_step=step, step_index=step_index, detail=detail),
        )

    def _save_job(self, job: Job):
        with self.db.connect() as conn:
            conn.execute(
                """UPDATE jobs SET status=?, updated_at=?, request_json=?,
                   progress_json=?, script_json=?, avatar_variants_json=?,
                   selected_avatar=?, storyboard_results_json=?,
                   video_results_json=?, final_video_path=?, error=?
                   WHERE job_id=?""",
                (
                    job.status.value if isinstance(job.status, JobStatus) else job.status,
                    job.updated_at.isoformat() if isinstance(job.updated_at, datetime) else job.updated_at,
                    json.dumps(job.request.model_dump()) if job.request else None,
                    json.dumps(job.progress.model_dump()) if job.progress else None,
                    json.dumps(job.script.model_dump()) if job.script else None,
                    json.dumps([v.model_dump() for v in job.avatar_variants]) if job.avatar_variants else None,
                    job.selected_avatar,
                    json.dumps([r.model_dump() for r in job.storyboard_results]) if job.storyboard_results else None,
                    json.dumps([r.model_dump() for r in job.video_results]) if job.video_results else None,
                    job.final_video_path,
                    job.error,
                    job.job_id,
                ),
            )

    def _row_to_job(self, row) -> Job:
        data = dict(row)
        # Parse datetime strings
        data["created_at"] = datetime.fromisoformat(data["created_at"])
        data["updated_at"] = datetime.fromisoformat(data["updated_at"])
        # Parse JSON fields
        data["request"] = json.loads(data.pop("request_json")) if data.get("request_json") else None
        data["progress"] = json.loads(data.pop("progress_json")) if data.get("progress_json") else None
        data["script"] = json.loads(data.pop("script_json")) if data.get("script_json") else None
        data["avatar_variants"] = json.loads(data.pop("avatar_variants_json")) if data.get("avatar_variants_json") else None
        data["storyboard_results"] = json.loads(data.pop("storyboard_results_json")) if data.get("storyboard_results_json") else None
        data["video_results"] = json.loads(data.pop("video_results_json")) if data.get("video_results_json") else None
        # Remove None fields to let Pydantic handle defaults
        data = {k: v for k, v in data.items() if v is not None}
        return Job(**data)
