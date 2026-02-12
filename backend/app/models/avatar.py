from pydantic import BaseModel

from app.models.script import AvatarProfile


class AvatarRequest(BaseModel):
    run_id: str
    avatar_profile: AvatarProfile


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
