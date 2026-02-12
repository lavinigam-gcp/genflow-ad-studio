from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class SSEEventType(str, Enum):
    JOB_STARTED = "job_started"
    STEP_STARTED = "step_started"
    STEP_PROGRESS = "step_progress"
    STEP_COMPLETED = "step_completed"
    SCENE_PROGRESS = "scene_progress"
    QC_RESULT = "qc_result"
    REGEN_ATTEMPT = "regen_attempt"
    JOB_COMPLETED = "job_completed"
    JOB_FAILED = "job_failed"
    LOG = "log"


class SSEEvent(BaseModel):
    event: SSEEventType
    job_id: str
    data: dict = {}
    timestamp: datetime = Field(default_factory=datetime.now)
