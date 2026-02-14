from pydantic import BaseModel, Field


class ScriptRequest(BaseModel):
    product_name: str
    specifications: str
    image_url: str
    scene_count: int = Field(default=3, ge=2, le=6)
    ad_tone: str = Field(default="energetic")
    gemini_model: str | None = None
    max_dialogue_words_per_scene: int = Field(default=25, ge=10, le=50)
    custom_instructions: str = Field(default="")


class AvatarProfile(BaseModel):
    gender: str
    age_range: str
    attire: str
    tone_of_voice: str
    visual_description: str


class Scene(BaseModel):
    scene_number: int
    duration_seconds: int
    scene_type: str
    shot_type: str
    camera_movement: str
    lighting: str
    visual_background: str
    avatar_action: str
    avatar_emotion: str
    product_visual_integration: str
    script_dialogue: str
    transition_to_next: str
    sound_design: str
    transition_type: str = Field(default="cut")
    transition_duration: float = Field(default=0.5, ge=0.0, le=2.0)
    audio_continuity: str = Field(default="")


class VideoScript(BaseModel):
    video_title: str
    total_duration: int = 30
    avatar_profile: AvatarProfile
    scenes: list[Scene]


class ScriptUpdateRequest(BaseModel):
    run_id: str
    script: VideoScript


class ScriptResponse(BaseModel):
    status: str = "success"
    run_id: str
    product_image_path: str
    script: VideoScript


# ---------------------------------------------------------------------------
# Input step models
# ---------------------------------------------------------------------------


class SampleProduct(BaseModel):
    id: str
    product_name: str
    specifications: str
    image_url: str
    thumbnail: str


class ImageUploadResponse(BaseModel):
    status: str = "success"
    image_url: str


class GenerateImageRequest(BaseModel):
    description: str


class GenerateImageResponse(BaseModel):
    status: str = "success"
    image_url: str


class AnalyzeImageRequest(BaseModel):
    image_url: str


class AnalyzeImageResponse(BaseModel):
    status: str = "success"
    product_name: str
    specifications: str
