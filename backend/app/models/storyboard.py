from pydantic import BaseModel, Field

from app.models.common import QCScore
from app.models.script import Scene


class StoryboardRequest(BaseModel):
    run_id: str
    scenes: list[Scene]
    image_model: str | None = None
    aspect_ratio: str = "9:16"
    image_size: str = "2K"
    qc_threshold: int = Field(default=60, ge=0, le=100)
    max_regen_attempts: int = Field(default=3, ge=0, le=10)
    include_composition_qc: bool = True
    custom_prompts: dict[int, str] | None = None


class StoryboardQCReport(BaseModel):
    avatar_validation: QCScore
    product_validation: QCScore
    composition_quality: QCScore | None = None


class StoryboardResult(BaseModel):
    scene_number: int
    image_path: str
    qc_report: StoryboardQCReport
    regen_attempts: int = 0
    prompt_used: str = ""


class StoryboardRegenRequest(BaseModel):
    run_id: str
    scene_number: int
    scene: Scene
    image_model: str | None = None
    aspect_ratio: str = "9:16"
    image_size: str = "2K"
    qc_threshold: int = Field(default=60, ge=0, le=100)
    max_regen_attempts: int = Field(default=3, ge=0, le=10)
    include_composition_qc: bool = True
    custom_prompt: str = ""


class StoryboardResponse(BaseModel):
    status: str = "success"
    results: list[StoryboardResult]
