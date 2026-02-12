from datetime import datetime
from enum import Enum

from pydantic import BaseModel

from app.models.avatar import AvatarVariant
from app.models.script import ScriptRequest, VideoScript
from app.models.storyboard import StoryboardResult
from app.models.video import VideoResult


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class JobStep(str, Enum):
    SCRIPT = "script"
    AVATAR = "avatar"
    AVATAR_SELECTION = "avatar_selection"
    STORYBOARD = "storyboard"
    VIDEO = "video"
    STITCH = "stitch"
    REVIEW = "review"


class JobProgress(BaseModel):
    current_step: JobStep
    step_index: int
    total_steps: int = 7
    detail: str = ""


class Job(BaseModel):
    job_id: str
    status: JobStatus = JobStatus.PENDING
    created_at: datetime
    updated_at: datetime
    request: ScriptRequest
    progress: JobProgress | None = None
    script: VideoScript | None = None
    avatar_variants: list[AvatarVariant] | None = None
    selected_avatar: str | None = None
    storyboard_results: list[StoryboardResult] | None = None
    video_results: list[VideoResult] | None = None
    final_video_path: str | None = None
    error: str | None = None
