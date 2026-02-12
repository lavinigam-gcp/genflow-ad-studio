from pydantic import BaseModel, Field


class QCScore(BaseModel):
    score: int = Field(ge=0, le=100)
    reason: str


class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
    detail: str | None = None
