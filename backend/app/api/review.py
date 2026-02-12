import logging

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_job_store, get_review_service
from app.jobs.store import JobStore
from app.models.review import ReviewDecision, ReviewResponse
from app.services.review_service import ReviewService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/review", tags=["review"])


@router.get("/queue")
async def get_review_queue(
    review_svc: ReviewService = Depends(get_review_service),
) -> list[ReviewResponse]:
    """List all pending reviews."""
    return review_svc.get_pending_reviews()


@router.get("/{job_id}")
async def get_review(
    job_id: str,
    review_svc: ReviewService = Depends(get_review_service),
    job_store: JobStore = Depends(get_job_store),
) -> dict:
    """Get review details and associated assets for a job."""
    review = review_svc.get_review(job_id)
    if review is None:
        raise HTTPException(status_code=404, detail=f"No review found for job {job_id}")

    job = job_store.get_job(job_id)
    assets = {}
    if job:
        assets["final_video_path"] = job.final_video_path
        if job.video_results:
            assets["video_results"] = [r.model_dump() for r in job.video_results]
        if job.storyboard_results:
            assets["storyboard_results"] = [r.model_dump() for r in job.storyboard_results]

    return {
        "review": review.model_dump(),
        "assets": assets,
    }


@router.post("/{job_id}/decision")
async def submit_decision(
    job_id: str,
    decision: ReviewDecision,
    review_svc: ReviewService = Depends(get_review_service),
) -> dict:
    """Submit a review decision for a job."""
    try:
        review = review_svc.submit_decision(job_id, decision)
        return {
            "status": "success",
            "review": review.model_dump(),
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
