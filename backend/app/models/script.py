from pydantic import BaseModel, HttpUrl


class ScriptRequest(BaseModel):
    product_name: str
    specifications: str
    image_url: HttpUrl


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


class VideoScript(BaseModel):
    video_title: str
    total_duration: int = 30
    avatar_profile: AvatarProfile
    scenes: list[Scene]


class ScriptResponse(BaseModel):
    status: str = "success"
    run_id: str
    product_image_path: str
    script: VideoScript
