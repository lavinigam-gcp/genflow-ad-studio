import logging

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_local_storage
from app.storage.local import LocalStorage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/assets", tags=["assets"])


@router.get("/{run_id}")
async def list_assets(
    run_id: str,
    subdir: str = "",
    storage: LocalStorage = Depends(get_local_storage),
) -> dict:
    """List all files for a given run_id (optionally within a subdirectory)."""
    files = storage.list_files(run_id, subdir=subdir)
    if not files:
        raise HTTPException(
            status_code=404,
            detail=f"No files found for run {run_id}" + (f" in {subdir}" if subdir else ""),
        )
    url_paths = [
        storage.get_url_path(run_id, f, subdir=subdir) for f in files
    ]
    return {
        "run_id": run_id,
        "subdir": subdir or None,
        "files": url_paths,
    }
