import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile

from app.dependencies import get_bulk_service
from app.services.bulk_service import BulkService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/bulk", tags=["bulk"])


@router.post("/upload")
async def upload_csv(
    file: UploadFile,
    bulk_svc: BulkService = Depends(get_bulk_service),
) -> dict:
    """Upload a CSV file, parse it, and return product list with bulk_id."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    try:
        content = await file.read()
        bulk_id, job_ids = await bulk_svc.process_csv(content)
        return {
            "status": "success",
            "bulk_id": bulk_id,
            "job_ids": job_ids,
            "total_products": len(job_ids),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("CSV upload failed")
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/{bulk_id}/start")
async def start_bulk(
    bulk_id: str,
    concurrency: int = 2,
    bulk_svc: BulkService = Depends(get_bulk_service),
) -> dict:
    """Start bulk processing for all jobs in the batch."""
    try:
        await bulk_svc.start_bulk(bulk_id, concurrency=concurrency)
        return {"status": "started", "bulk_id": bulk_id}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("Bulk start failed")
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/{bulk_id}")
async def get_bulk_status(
    bulk_id: str,
    bulk_svc: BulkService = Depends(get_bulk_service),
) -> dict:
    """Get bulk job status."""
    try:
        return bulk_svc.get_bulk_status(bulk_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
