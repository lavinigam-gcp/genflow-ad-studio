from pydantic import BaseModel

from app.models.common import QCScore
from app.models.script import Scene


class StoryboardRequest(BaseModel):
    run_id: str
    scenes: list[Scene]


class StoryboardQCReport(BaseModel):
    avatar_validation: QCScore
    product_validation: QCScore
    composition_quality: QCScore | None = None


class StoryboardResult(BaseModel):
    scene_number: int
    image_path: str
    qc_report: StoryboardQCReport
    regen_attempts: int = 0


class StoryboardResponse(BaseModel):
    status: str = "success"
    results: list[StoryboardResult]
