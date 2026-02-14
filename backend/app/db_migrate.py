import json
import logging
from pathlib import Path

from app.db import Database

logger = logging.getLogger(__name__)

JOBS_FILE = Path("output/jobs.json")


def migrate_from_json(db: Database):
    """Migrate jobs from JSON file to SQLite if needed."""
    if not JOBS_FILE.exists():
        return

    with db.connect() as conn:
        count = conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
        if count > 0:
            logger.info("SQLite already has %d jobs, skipping migration", count)
            return

    logger.info("Migrating jobs from %s to SQLite...", JOBS_FILE)
    try:
        with open(JOBS_FILE) as f:
            data = json.load(f)

        with db.connect() as conn:
            for job_id, job_data in data.items():
                conn.execute(
                    """INSERT INTO jobs (job_id, status, created_at, updated_at, request_json,
                       progress_json, script_json, avatar_variants_json, selected_avatar,
                       storyboard_results_json, video_results_json, final_video_path, error)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        job_data.get("job_id", job_id),
                        job_data.get("status", "pending"),
                        job_data.get("created_at", ""),
                        job_data.get("updated_at", ""),
                        json.dumps(job_data.get("request")) if job_data.get("request") else None,
                        json.dumps(job_data.get("progress")) if job_data.get("progress") else None,
                        json.dumps(job_data.get("script")) if job_data.get("script") else None,
                        json.dumps(job_data.get("avatar_variants")) if job_data.get("avatar_variants") else None,
                        job_data.get("selected_avatar"),
                        json.dumps(job_data.get("storyboard_results")) if job_data.get("storyboard_results") else None,
                        json.dumps(job_data.get("video_results")) if job_data.get("video_results") else None,
                        job_data.get("final_video_path"),
                        job_data.get("error"),
                    ),
                )

        migrated_path = JOBS_FILE.with_suffix(".json.migrated")
        JOBS_FILE.rename(migrated_path)
        logger.info("Migrated %d jobs, renamed source to %s", len(data), migrated_path)
    except Exception:
        logger.exception("Failed to migrate jobs from JSON")
