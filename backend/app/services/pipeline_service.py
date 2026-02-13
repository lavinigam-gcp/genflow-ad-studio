import asyncio
import logging

from app.jobs.events import SSEBroadcaster
from app.jobs.store import JobStore
from app.models.job import JobStatus, JobStep
from app.models.script import ScriptRequest
from app.models.sse import SSEEventType
from app.services.avatar_service import AvatarService
from app.services.review_service import ReviewService
from app.services.script_service import ScriptService
from app.services.stitch_service import StitchService
from app.services.storyboard_service import StoryboardService
from app.services.video_service import VideoService

logger = logging.getLogger(__name__)

# How long to wait between checks for avatar selection (seconds)
_AVATAR_POLL_INTERVAL = 1.0
# Maximum time to wait for avatar selection (seconds)
_AVATAR_WAIT_TIMEOUT = 600.0


class PipelineService:
    def __init__(
        self,
        script_svc: ScriptService,
        avatar_svc: AvatarService,
        storyboard_svc: StoryboardService,
        video_svc: VideoService,
        stitch_svc: StitchService,
        review_svc: ReviewService,
        job_store: JobStore,
        event_broadcaster: SSEBroadcaster,
    ):
        self.script_svc = script_svc
        self.avatar_svc = avatar_svc
        self.storyboard_svc = storyboard_svc
        self.video_svc = video_svc
        self.stitch_svc = stitch_svc
        self.review_svc = review_svc
        self.job_store = job_store
        self.broadcaster = event_broadcaster

    async def run_full_pipeline(self, job_id: str, request: ScriptRequest):
        """Run the full automated pipeline as a background task.

        Steps:
        1. Generate script
        2. Generate avatar variants
        3. Wait for avatar selection
        4. Generate storyboard with QC
        5. Generate videos with QC
        6. Stitch final commercial
        """
        try:
            # Mark job as running
            self.job_store.update_job(job_id, status=JobStatus.RUNNING)
            self.broadcaster.emit(job_id, SSEEventType.JOB_STARTED)

            # Step 1: Script generation
            self.job_store.set_progress(job_id, JobStep.SCRIPT, 1, "Generating script...")
            self.broadcaster.emit(job_id, SSEEventType.STEP_STARTED, {"step": "script"})

            script_response = await self.script_svc.generate_script(request)
            run_id = script_response.run_id

            self.job_store.update_job(job_id, script=script_response.script)
            self.broadcaster.emit(
                job_id,
                SSEEventType.STEP_COMPLETED,
                {"step": "script", "run_id": run_id},
            )

            # Step 2: Avatar generation
            self.job_store.set_progress(job_id, JobStep.AVATAR, 2, "Generating avatar variants...")
            self.broadcaster.emit(job_id, SSEEventType.STEP_STARTED, {"step": "avatar"})

            avatar_response = await self.avatar_svc.generate_avatars(
                run_id=run_id,
                avatar_profile=script_response.script.avatar_profile,
            )

            self.job_store.update_job(job_id, avatar_variants=avatar_response.variants)
            self.broadcaster.emit(
                job_id,
                SSEEventType.STEP_COMPLETED,
                {
                    "step": "avatar",
                    "num_variants": len(avatar_response.variants),
                },
            )

            # Step 3: Wait for avatar selection
            self.job_store.set_progress(
                job_id, JobStep.AVATAR_SELECTION, 3, "Waiting for avatar selection..."
            )
            self.broadcaster.emit(
                job_id,
                SSEEventType.STEP_STARTED,
                {"step": "avatar_selection"},
            )

            selected_avatar = await self._wait_for_avatar_selection(job_id)

            self.broadcaster.emit(
                job_id,
                SSEEventType.STEP_COMPLETED,
                {"step": "avatar_selection", "selected": selected_avatar},
            )

            # Step 4: Storyboard generation with QC
            self.job_store.set_progress(
                job_id, JobStep.STORYBOARD, 4, "Generating storyboard..."
            )
            self.broadcaster.emit(job_id, SSEEventType.STEP_STARTED, {"step": "storyboard"})

            def storyboard_progress(data: dict):
                self.broadcaster.emit(job_id, SSEEventType.SCENE_PROGRESS, data)

            storyboard_response = await self.storyboard_svc.generate_storyboard(
                run_id=run_id,
                scenes=script_response.script.scenes,
                on_progress=storyboard_progress,
            )

            self.job_store.update_job(
                job_id, storyboard_results=storyboard_response.results
            )
            self.broadcaster.emit(
                job_id,
                SSEEventType.STEP_COMPLETED,
                {
                    "step": "storyboard",
                    "num_scenes": len(storyboard_response.results),
                },
            )

            # Step 5: Video generation with QC
            self.job_store.set_progress(job_id, JobStep.VIDEO, 5, "Generating videos...")
            self.broadcaster.emit(job_id, SSEEventType.STEP_STARTED, {"step": "video"})

            def video_progress(data: dict):
                self.broadcaster.emit(job_id, SSEEventType.SCENE_PROGRESS, data)

            video_response = await self.video_svc.generate_videos(
                run_id=run_id,
                scenes_data=storyboard_response.results,
                script_scenes=script_response.script.scenes,
                avatar_profile=script_response.script.avatar_profile,
                on_progress=video_progress,
            )

            self.job_store.update_job(job_id, video_results=video_response.results)
            self.broadcaster.emit(
                job_id,
                SSEEventType.STEP_COMPLETED,
                {
                    "step": "video",
                    "num_scenes": len(video_response.results),
                },
            )

            # Step 6: Stitch
            self.job_store.set_progress(job_id, JobStep.STITCH, 6, "Stitching final video...")
            self.broadcaster.emit(job_id, SSEEventType.STEP_STARTED, {"step": "stitch"})

            final_path = await self.stitch_svc.stitch_videos(run_id=run_id)

            # Create pending review
            self.review_svc.create_review(job_id)

            self.job_store.update_job(job_id, final_video_path=final_path)
            self.broadcaster.emit(
                job_id,
                SSEEventType.STEP_COMPLETED,
                {"step": "stitch", "path": final_path},
            )

            # Done
            self.job_store.update_job(job_id, status=JobStatus.COMPLETED)
            self.broadcaster.emit(
                job_id,
                SSEEventType.JOB_COMPLETED,
                {"final_video_path": final_path},
            )

        except asyncio.CancelledError:
            self.job_store.update_job(
                job_id,
                status=JobStatus.CANCELLED,
                error="Pipeline was cancelled",
            )
            self.broadcaster.emit(
                job_id,
                SSEEventType.JOB_FAILED,
                {"error": "Pipeline was cancelled"},
            )
            raise

        except Exception as exc:
            logger.exception("Pipeline failed for job %s", job_id)
            self.job_store.update_job(
                job_id,
                status=JobStatus.FAILED,
                error=str(exc),
            )
            self.broadcaster.emit(
                job_id,
                SSEEventType.JOB_FAILED,
                {"error": str(exc)},
            )

    async def _wait_for_avatar_selection(self, job_id: str) -> str:
        """Poll the job store until an avatar is selected or timeout."""
        elapsed = 0.0
        while elapsed < _AVATAR_WAIT_TIMEOUT:
            job = self.job_store.get_job(job_id)
            if job and job.selected_avatar:
                return job.selected_avatar
            if job and job.status == JobStatus.CANCELLED:
                raise asyncio.CancelledError("Job cancelled while waiting for avatar selection")
            await asyncio.sleep(_AVATAR_POLL_INTERVAL)
            elapsed += _AVATAR_POLL_INTERVAL

        raise TimeoutError(
            f"Avatar selection timed out after {_AVATAR_WAIT_TIMEOUT}s for job {job_id}"
        )

    async def run_step(self, job_id: str, step: str, **kwargs):
        """Run a single pipeline step for manual/step-by-step API usage."""
        job = self.job_store.get_job(job_id)
        if job is None:
            raise ValueError(f"Job {job_id} not found")

        if step == "script":
            result = await self.script_svc.generate_script(job.request)
            self.job_store.update_job(job_id, script=result.script)
            return result

        elif step == "avatar":
            if not job.script:
                raise ValueError("Script must be generated before avatars")
            run_id = kwargs.get("run_id", job_id)
            result = await self.avatar_svc.generate_avatars(
                run_id=run_id,
                avatar_profile=job.script.avatar_profile,
            )
            self.job_store.update_job(job_id, avatar_variants=result.variants)
            return result

        elif step == "storyboard":
            if not job.script or not job.selected_avatar:
                raise ValueError("Script and avatar selection required before storyboard")
            run_id = kwargs.get("run_id", job_id)
            result = await self.storyboard_svc.generate_storyboard(
                run_id=run_id,
                scenes=job.script.scenes,
            )
            self.job_store.update_job(job_id, storyboard_results=result.results)
            return result

        elif step == "video":
            if not job.storyboard_results or not job.script:
                raise ValueError("Storyboard must be generated before videos")
            run_id = kwargs.get("run_id", job_id)
            result = await self.video_svc.generate_videos(
                run_id=run_id,
                scenes_data=job.storyboard_results,
                script_scenes=job.script.scenes,
                avatar_profile=job.script.avatar_profile,
            )
            self.job_store.update_job(job_id, video_results=result.results)
            return result

        elif step == "stitch":
            run_id = kwargs.get("run_id", job_id)
            path = await self.stitch_svc.stitch_videos(run_id=run_id)
            self.job_store.update_job(job_id, final_video_path=path)
            return {"path": path}

        else:
            raise ValueError(f"Unknown pipeline step: {step}")
