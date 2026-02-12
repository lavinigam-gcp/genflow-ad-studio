from pydantic import BaseModel, Field

from app.models.script import AvatarProfile, Scene
from app.models.storyboard import StoryboardResult


class VideoRequest(BaseModel):
    run_id: str
    scenes_data: list[StoryboardResult]
    script_scenes: list[Scene]
    avatar_profile: AvatarProfile


class VideoQCDimension(BaseModel):
    score: int = Field(ge=0, le=10)
    reasoning: str


class VideoQCReport(BaseModel):
    technical_distortion: VideoQCDimension
    cinematic_imperfections: VideoQCDimension
    avatar_consistency: VideoQCDimension
    product_consistency: VideoQCDimension
    temporal_coherence: VideoQCDimension
    overall_verdict: str


class VideoVariant(BaseModel):
    index: int
    video_path: str
    qc_report: VideoQCReport | None = None


class VideoResult(BaseModel):
    scene_number: int
    variants: list[VideoVariant]
    selected_index: int
    selected_video_path: str


class VideoSelectRequest(BaseModel):
    run_id: str
    scene_number: int
    variant_index: int


class VideoResponse(BaseModel):
    status: str = "success"
    results: list[VideoResult]
