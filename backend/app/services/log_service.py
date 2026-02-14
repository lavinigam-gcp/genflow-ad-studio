import json
import logging
from datetime import datetime

from app.db import Database

logger = logging.getLogger(__name__)


class LogService:
    def __init__(self, db: Database):
        self.db = db

    def add_log(self, job_id: str, message: str, level: str = "info", metadata: dict | None = None):
        with self.db.connect() as conn:
            conn.execute(
                "INSERT INTO pipeline_logs (job_id, timestamp, level, message, metadata_json) VALUES (?, ?, ?, ?, ?)",
                (job_id, datetime.now().isoformat(), level, message,
                 json.dumps(metadata) if metadata else None),
            )

    def get_logs(self, job_id: str) -> list[dict]:
        with self.db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM pipeline_logs WHERE job_id = ? ORDER BY id",
                (job_id,),
            ).fetchall()
        return [
            {
                "id": r["id"],
                "job_id": r["job_id"],
                "timestamp": r["timestamp"],
                "level": r["level"],
                "message": r["message"],
                "metadata": json.loads(r["metadata_json"]) if r["metadata_json"] else None,
            }
            for r in rows
        ]
