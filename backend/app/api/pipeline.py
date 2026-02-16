import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import (
    get_avatar_service,
    get_job_store,
    get_pipeline_service,
    get_script_service,
    get_stitch_service,
    get_storyboard_service,
    get_task_runner,
    get_video_service,
)
from app.jobs.runner import TaskRunner
from app.jobs.store import JobStore
from app.models.job import JobStatus
from app.models.avatar import (
    AvatarRequest,
    AvatarResponse,
    AvatarSelectRequest,
    AvatarSelectResponse,
)
from app.models.script import ScriptRequest, ScriptResponse, ScriptUpdateRequest
from app.models.storyboard import StoryboardRequest, StoryboardResponse
from app.models.video import VideoRequest, VideoResponse, VideoSelectRequest
from app.services.avatar_service import AvatarService
from app.services.pipeline_service import PipelineService
from app.services.script_service import ScriptService
from app.services.stitch_service import StitchService
from app.services.storyboard_service import StoryboardService
from app.services.video_service import VideoService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/pipeline", tags=["pipeline"])


@router.post("/start")
async def start_pipeline(
    request: ScriptRequest,
    job_store: JobStore = Depends(get_job_store),
    pipeline_svc: PipelineService = Depends(get_pipeline_service),
    task_runner: TaskRunner = Depends(get_task_runner),
) -> dict:
    """Start the full automated pipeline. Returns job_id immediately."""
    job = job_store.create_job(request)
    task_runner.start_pipeline(job.job_id, pipeline_svc, request)
    return {"status": "started", "job_id": job.job_id}


@router.post("/script")
async def generate_script(
    request: ScriptRequest,
    script_svc: ScriptService = Depends(get_script_service),
    job_store: JobStore = Depends(get_job_store),
) -> ScriptResponse:
    """Generate script only (synchronous). Creates a job for persistence."""
    try:
        response = await script_svc.generate_script(request)
        # Create job using run_id so file paths and job_id match
        job_store.create_job(request, job_id=response.run_id)
        job_store.update_job(response.run_id, script=response.script, status=JobStatus.RUNNING)
        return response
    except Exception as exc:
        logger.exception("Script generation failed")
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/script/update")
async def update_script(
    request: ScriptUpdateRequest,
    script_svc: ScriptService = Depends(get_script_service),
) -> ScriptResponse:
    """Update an edited script (persist changes)."""
    try:
        return await script_svc.update_script(
            run_id=request.run_id,
            script=request.script,
        )
    except Exception as exc:
        logger.exception("Script update failed")
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/avatar")
async def generate_avatars(
    request: AvatarRequest,
    avatar_svc: AvatarService = Depends(get_avatar_service),
    job_store: JobStore = Depends(get_job_store),
) -> AvatarResponse:
    """Generate avatar variants."""
    try:
        response = await avatar_svc.generate_avatars(
            run_id=request.run_id,
            avatar_profile=request.avatar_profile,
            num_variants=request.num_variants,
            image_model=request.image_model,
            custom_prompt=request.custom_prompt,
            reference_image_url=request.reference_image_url,
        )
        if job_store.get_job(request.run_id):
            job_store.update_job(request.run_id, avatar_variants=response.variants)
        return response
    except Exception as exc:
        logger.exception("Avatar generation failed")
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/avatar/select")
async def select_avatar(
    request: AvatarSelectRequest,
    avatar_svc: AvatarService = Depends(get_avatar_service),
    job_store: JobStore = Depends(get_job_store),
) -> AvatarSelectResponse:
    """User selects an avatar variant.

    Also updates any job that references this run_id with the selected avatar.
    """
    try:
        selected_path = await avatar_svc.select_avatar(
            run_id=request.run_id,
            variant_index=request.variant_index,
        )

        # Update any matching job with the selected avatar
        for job in job_store.list_jobs():
            if job.avatar_variants:
                for variant in job.avatar_variants:
                    if request.run_id in variant.image_path:
                        job_store.update_job(job.job_id, selected_avatar=selected_path)
                        break

        return AvatarSelectResponse(selected_path=selected_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("Avatar selection failed")
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/storyboard")
async def generate_storyboard(
    request: StoryboardRequest,
    storyboard_svc: StoryboardService = Depends(get_storyboard_service),
    job_store: JobStore = Depends(get_job_store),
) -> StoryboardResponse:
    """Generate storyboard with QC feedback loop."""
    try:
        response = await storyboard_svc.generate_storyboard(
            run_id=request.run_id,
            scenes=request.scenes,
        )
        if job_store.get_job(request.run_id):
            job_store.update_job(request.run_id, storyboard_results=response.results)
        return response
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("Storyboard generation failed")
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/video")
async def generate_video(
    request: VideoRequest,
    video_svc: VideoService = Depends(get_video_service),
    job_store: JobStore = Depends(get_job_store),
) -> VideoResponse:
    """Generate video variants with QC and auto-selection."""
    try:
        response = await video_svc.generate_videos(
            run_id=request.run_id,
            scenes_data=request.scenes_data,
            script_scenes=request.script_scenes,
            avatar_profile=request.avatar_profile,
            seed=request.seed,
            resolution=request.resolution,
        )
        if job_store.get_job(request.run_id):
            job_store.update_job(request.run_id, video_results=response.results)
        return response
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("Video generation failed")
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/video/select")
async def select_video_variant(
    request: VideoSelectRequest,
    video_svc: VideoService = Depends(get_video_service),
) -> dict:
    """User selects a specific video variant for a scene."""
    try:
        selected_path = await video_svc.select_variant(
            run_id=request.run_id,
            scene_number=request.scene_number,
            variant_index=request.variant_index,
        )
        return {"status": "success", "selected_video_path": selected_path}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("Video variant selection failed")
        raise HTTPException(status_code=500, detail=str(exc))


class StitchRequest(BaseModel):
    run_id: str
    transitions: list[dict] | None = None


@router.post("/stitch")
async def stitch_video(
    request: StitchRequest,
    stitch_svc: StitchService = Depends(get_stitch_service),
    job_store: JobStore = Depends(get_job_store),
) -> dict:
    """Stitch scene videos into final commercial."""
    run_id = request.run_id
    try:
        path = await stitch_svc.stitch_videos(
            run_id=run_id,
            transitions=request.transitions,
        )
        if job_store.get_job(run_id):
            job_store.update_job(run_id, final_video_path=path, status=JobStatus.COMPLETED)
        return {"status": "success", "path": path}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.exception("Video stitching failed")
        raise HTTPException(status_code=500, detail=str(exc))
