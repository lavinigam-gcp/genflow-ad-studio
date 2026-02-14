import logging
from datetime import datetime

from app.db import Database
from app.models.review import ReviewDecision, ReviewResponse, ReviewStatus

logger = logging.getLogger(__name__)


class ReviewService:
    def __init__(self, db: Database):
        self.db = db

    def create_review(self, job_id: str) -> ReviewResponse:
        review = ReviewResponse(job_id=job_id, review_status=ReviewStatus.PENDING)
        with self.db.connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO reviews (job_id, review_status) VALUES (?, ?)",
                (job_id, ReviewStatus.PENDING.value),
            )
        return review

    def get_review(self, job_id: str) -> ReviewResponse | None:
        with self.db.connect() as conn:
            row = conn.execute("SELECT * FROM reviews WHERE job_id = ?", (job_id,)).fetchone()
        if row is None:
            return None
        return ReviewResponse(
            job_id=row["job_id"],
            review_status=ReviewStatus(row["review_status"]),
            reviewed_at=datetime.fromisoformat(row["reviewed_at"]) if row["reviewed_at"] else None,
        )

    def get_pending_reviews(self) -> list[ReviewResponse]:
        with self.db.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM reviews WHERE review_status = ?",
                (ReviewStatus.PENDING.value,),
            ).fetchall()
        return [
            ReviewResponse(
                job_id=r["job_id"],
                review_status=ReviewStatus(r["review_status"]),
                reviewed_at=datetime.fromisoformat(r["reviewed_at"]) if r["reviewed_at"] else None,
            )
            for r in rows
        ]

    def get_or_create_review(self, job_id: str) -> ReviewResponse:
        review = self.get_review(job_id)
        if review is None:
            review = self.create_review(job_id)
        return review

    def submit_decision(self, job_id: str, decision: ReviewDecision) -> ReviewResponse:
        self.get_or_create_review(job_id)
        now = datetime.now()
        with self.db.connect() as conn:
            conn.execute(
                "UPDATE reviews SET review_status = ?, reviewed_at = ? WHERE job_id = ?",
                (decision.status.value, now.isoformat(), job_id),
            )
        logger.info("Review decision for job %s: %s", job_id, decision.status.value)
        return ReviewResponse(
            job_id=job_id,
            review_status=decision.status,
            reviewed_at=now,
        )
