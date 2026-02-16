from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings


def _find_env_file() -> str | None:
    """Locate the .env file relative to the backend directory."""
    for candidate in [
        Path(__file__).resolve().parent.parent.parent / ".env",  # backend/app -> root
        Path.cwd().parent / ".env",
        Path.cwd() / ".env",
    ]:
        if candidate.is_file():
            return str(candidate)
    return None


class Settings(BaseSettings):
    project_id: str = ""
    region: str = "global"
    gcs_bucket_name: str = ""

    gemini_model: str = Field(
        default="gemini-3-flash-preview",
        validation_alias=AliasChoices("gemini_model", "GEMINI_MODEL"),
    )
    gemini_flash_model: str = "gemini-3-flash-preview"
    image_model: str = Field(
        default="gemini-3-pro-image-preview",
        validation_alias=AliasChoices("image_model", "IMAGE_MODEL"),
    )
    veo_model: str = Field(
        default="veo-3.1-fast-generate-preview",
        validation_alias=AliasChoices("veo_model", "VEO_MODEL", "VEO_MODEL_ID"),
    )
    veo_fast_model: str = "veo-3.1-fast-generate-preview"
    imagen_model: str = "imagen-4.0-generate-001"

    output_dir: str = "output"
    storyboard_qc_threshold: int = 60
    video_qc_threshold: int = 6
    max_regen_attempts: int = 3
    max_video_variants: int = 4
    max_avatar_variants: int = 4
    max_concurrent_scenes: int = 5

    # Script generation settings
    script_default_scene_count: int = 3
    script_max_scene_count: int = 6
    script_min_scene_count: int = 2
    script_default_total_duration: int = 30
    script_max_dialogue_words_per_scene: int = 25

    model_config = {
        "env_file": _find_env_file(),
        "env_file_encoding": "utf-8",
        "populate_by_name": True,
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
