import logging
import sqlite3
from pathlib import Path

logger = logging.getLogger(__name__)

DB_PATH = Path("output/genflow.db")


class Database:
    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with self.connect() as conn:
            conn.executescript("""
                PRAGMA journal_mode=WAL;
                PRAGMA foreign_keys=ON;

                CREATE TABLE IF NOT EXISTS jobs (
                    job_id TEXT PRIMARY KEY,
                    status TEXT NOT NULL DEFAULT 'pending',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    request_json TEXT NOT NULL,
                    progress_json TEXT,
                    script_json TEXT,
                    avatar_variants_json TEXT,
                    selected_avatar TEXT,
                    storyboard_results_json TEXT,
                    video_results_json TEXT,
                    final_video_path TEXT,
                    error TEXT
                );

                CREATE TABLE IF NOT EXISTS reviews (
                    job_id TEXT PRIMARY KEY,
                    review_status TEXT NOT NULL DEFAULT 'pending',
                    reviewed_at TEXT,
                    notes TEXT,
                    FOREIGN KEY (job_id) REFERENCES jobs(job_id)
                );

                CREATE TABLE IF NOT EXISTS pipeline_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    level TEXT NOT NULL DEFAULT 'info',
                    message TEXT NOT NULL,
                    metadata_json TEXT,
                    FOREIGN KEY (job_id) REFERENCES jobs(job_id)
                );
            """)
        logger.info("Database initialized at %s", self.db_path)

    def connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys=ON")
        return conn
