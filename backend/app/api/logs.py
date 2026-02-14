from fastapi import APIRouter
from pydantic import BaseModel

from app.dependencies import get_log_service

router = APIRouter(prefix="/api/v1/logs", tags=["logs"])


class LogListRequest(BaseModel):
    job_id: str


@router.post("/list")
async def list_logs(request: LogListRequest):
    svc = get_log_service()
    logs = svc.get_logs(request.job_id)
    return {"logs": logs}
