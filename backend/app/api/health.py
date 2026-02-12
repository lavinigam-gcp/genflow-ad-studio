from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}
