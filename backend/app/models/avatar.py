from pydantic import BaseModel, Field

from app.models.script import AvatarProfile


class AvatarRequest(BaseModel):
    run_id: str
    avatar_profile: AvatarProfile
    num_variants: int = Field(default=4, ge=1, le=8)
    image_model: str | None = None
    custom_prompt: str = ""
    reference_image_url: str = ""


class AvatarVariant(BaseModel):
    index: int
    image_path: str


class AvatarResponse(BaseModel):
    status: str = "success"
    run_id: str
    variants: list[AvatarVariant]


class AvatarSelectRequest(BaseModel):
    run_id: str
    variant_index: int


class AvatarSelectResponse(BaseModel):
    status: str = "success"
    selected_path: str
