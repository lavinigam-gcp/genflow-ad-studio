from functools import lru_cache

from google import genai
from google.cloud import storage

from app.ai.gemini import GeminiService
from app.ai.gemini_image import GeminiImageService
from app.ai.veo import VeoService
from app.config import Settings
from app.config import get_settings as _get_settings
from app.jobs.events import SSEBroadcaster
from app.jobs.runner import TaskRunner
from app.jobs.store import JobStore
from app.services.avatar_service import AvatarService
from app.services.bulk_service import BulkService
from app.services.pipeline_service import PipelineService
from app.services.qc_service import QCService
from app.services.review_service import ReviewService
from app.services.script_service import ScriptService
from app.services.stitch_service import StitchService
from app.services.storyboard_service import StoryboardService
from app.services.video_service import VideoService
from app.storage.gcs import GCSStorage
from app.storage.local import LocalStorage


def get_settings() -> Settings:
    return _get_settings()


@lru_cache
def get_genai_client() -> genai.Client:
    settings = get_settings()
    return genai.Client(
        vertexai=True,
        project=settings.project_id,
        location=settings.region,
    )


@lru_cache
def get_storage_client() -> storage.Client:
    settings = get_settings()
    return storage.Client(project=settings.project_id)


# ---------------------------------------------------------------------------
# Singletons for job infrastructure
# ---------------------------------------------------------------------------

_job_store: JobStore | None = None
_broadcaster: SSEBroadcaster | None = None
_task_runner: TaskRunner | None = None
_review_service: ReviewService | None = None


def get_job_store() -> JobStore:
    global _job_store
    if _job_store is None:
        _job_store = JobStore()
    return _job_store


def get_broadcaster() -> SSEBroadcaster:
    global _broadcaster
    if _broadcaster is None:
        _broadcaster = SSEBroadcaster()
    return _broadcaster


def get_task_runner() -> TaskRunner:
    global _task_runner
    if _task_runner is None:
        _task_runner = TaskRunner()
    return _task_runner


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------

@lru_cache
def get_local_storage() -> LocalStorage:
    settings = get_settings()
    return LocalStorage(base_dir=settings.output_dir)


@lru_cache
def get_gcs_storage() -> GCSStorage:
    settings = get_settings()
    return GCSStorage(
        bucket_name=settings.gcs_bucket_name,
        project_id=settings.project_id,
    )


# ---------------------------------------------------------------------------
# AI services
# ---------------------------------------------------------------------------

@lru_cache
def get_gemini_service() -> GeminiService:
    return GeminiService(client=get_genai_client(), settings=get_settings())


@lru_cache
def get_gemini_image_service() -> GeminiImageService:
    return GeminiImageService(client=get_genai_client(), settings=get_settings())


@lru_cache
def get_veo_service() -> VeoService:
    return VeoService(client=get_genai_client(), settings=get_settings())


# ---------------------------------------------------------------------------
# Application services
# ---------------------------------------------------------------------------

@lru_cache
def get_qc_service() -> QCService:
    return QCService(gemini=get_gemini_service(), settings=get_settings())


@lru_cache
def get_script_service() -> ScriptService:
    return ScriptService(
        gemini=get_gemini_service(),
        storage=get_local_storage(),
        settings=get_settings(),
    )


@lru_cache
def get_avatar_service() -> AvatarService:
    return AvatarService(
        gemini_image=get_gemini_image_service(),
        storage=get_local_storage(),
        settings=get_settings(),
    )


@lru_cache
def get_storyboard_service() -> StoryboardService:
    return StoryboardService(
        gemini_image=get_gemini_image_service(),
        qc=get_qc_service(),
        storage=get_local_storage(),
        settings=get_settings(),
    )


@lru_cache
def get_video_service() -> VideoService:
    return VideoService(
        veo=get_veo_service(),
        gcs=get_gcs_storage(),
        qc=get_qc_service(),
        storage=get_local_storage(),
        settings=get_settings(),
    )


@lru_cache
def get_stitch_service() -> StitchService:
    return StitchService(storage=get_local_storage())


def get_review_service() -> ReviewService:
    global _review_service
    if _review_service is None:
        _review_service = ReviewService()
    return _review_service


def get_pipeline_service() -> PipelineService:
    return PipelineService(
        script_svc=get_script_service(),
        avatar_svc=get_avatar_service(),
        storyboard_svc=get_storyboard_service(),
        video_svc=get_video_service(),
        stitch_svc=get_stitch_service(),
        job_store=get_job_store(),
        event_broadcaster=get_broadcaster(),
    )


def get_bulk_service() -> BulkService:
    return BulkService(
        pipeline_svc=get_pipeline_service(),
        job_store=get_job_store(),
    )
