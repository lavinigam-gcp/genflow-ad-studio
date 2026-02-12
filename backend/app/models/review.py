from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class ReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"


class ReviewDecision(BaseModel):
    status: ReviewStatus
    notes: str | None = None
    scenes_to_regenerate: list[int] | None = None


class ReviewResponse(BaseModel):
    job_id: str
    review_status: ReviewStatus
    reviewed_at: datetime | None = None
