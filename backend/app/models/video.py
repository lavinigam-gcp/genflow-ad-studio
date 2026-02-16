from pydantic import BaseModel, Field

from app.models.script import AvatarProfile, Scene
from app.models.storyboard import StoryboardResult


class VideoRequest(BaseModel):
    run_id: str
    scenes_data: list[StoryboardResult]
    script_scenes: list[Scene]
    avatar_profile: AvatarProfile
    seed: int | None = None
    resolution: str = "720p"
    veo_model: str | None = None
    aspect_ratio: str = "9:16"
    duration_seconds: int = Field(default=8, ge=4, le=8)
    num_variants: int = Field(default=4, ge=1, le=4)
    compression_quality: str = "optimized"
    qc_threshold: int = Field(default=6, ge=0, le=10)
    max_qc_regen_attempts: int = Field(default=2, ge=0, le=3)
    use_reference_images: bool = True
    negative_prompt_extra: str = ""
    generate_audio: bool = True


class VideoQCDimension(BaseModel):
    score: int = Field(ge=0, le=10)
    reasoning: str


class VideoQCReport(BaseModel):
    technical_distortion: VideoQCDimension
    cinematic_imperfections: VideoQCDimension
    avatar_consistency: VideoQCDimension
    product_consistency: VideoQCDimension
    temporal_coherence: VideoQCDimension
    hand_body_integrity: VideoQCDimension
    brand_text_accuracy: VideoQCDimension
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
    regen_attempts: int = 0
    prompt_used: str = ""


class VideoRegenRequest(BaseModel):
    run_id: str
    scene_number: int
    scene: Scene
    storyboard_result: StoryboardResult
    avatar_profile: AvatarProfile
    seed: int | None = None
    resolution: str = "720p"
    veo_model: str | None = None
    aspect_ratio: str = "9:16"
    duration_seconds: int = Field(default=8, ge=4, le=8)
    num_variants: int = Field(default=4, ge=1, le=4)
    compression_quality: str = "optimized"
    qc_threshold: int = Field(default=6, ge=0, le=10)
    max_qc_regen_attempts: int = Field(default=2, ge=0, le=3)
    use_reference_images: bool = True
    negative_prompt_extra: str = ""
    generate_audio: bool = True


class VideoSelectRequest(BaseModel):
    run_id: str
    scene_number: int
    variant_index: int


class VideoResponse(BaseModel):
    status: str = "success"
    results: list[VideoResult]
