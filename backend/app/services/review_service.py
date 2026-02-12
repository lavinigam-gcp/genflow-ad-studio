import logging
from datetime import datetime

from app.models.review import ReviewDecision, ReviewResponse, ReviewStatus

logger = logging.getLogger(__name__)


class ReviewService:
    def __init__(self):
        self._reviews: dict[str, ReviewResponse] = {}

    def create_review(self, job_id: str) -> ReviewResponse:
        """Create a new pending review for a job."""
        review = ReviewResponse(
            job_id=job_id,
            review_status=ReviewStatus.PENDING,
        )
        self._reviews[job_id] = review
        return review

    def get_review(self, job_id: str) -> ReviewResponse | None:
        """Get review status for a job."""
        return self._reviews.get(job_id)

    def get_pending_reviews(self) -> list[ReviewResponse]:
        """Get all reviews with PENDING status."""
        return [
            r for r in self._reviews.values()
            if r.review_status == ReviewStatus.PENDING
        ]

    def submit_decision(self, job_id: str, decision: ReviewDecision) -> ReviewResponse:
        """Submit a review decision for a job."""
        review = self._reviews.get(job_id)
        if review is None:
            raise ValueError(f"No review found for job {job_id}")

        review.review_status = decision.status
        review.reviewed_at = datetime.now()
        self._reviews[job_id] = review

        logger.info(
            "Review decision for job %s: %s",
            job_id,
            decision.status.value,
        )
        return review
