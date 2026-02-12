import logging
import shutil

from app.ai.gemini_image import GeminiImageService
from app.ai.prompts import AVATAR_PROMPT_TEMPLATE
from app.config import Settings
from app.models.avatar import AvatarResponse, AvatarVariant
from app.models.script import AvatarProfile
from app.storage.local import LocalStorage

logger = logging.getLogger(__name__)


class AvatarService:
    def __init__(
        self,
        gemini_image: GeminiImageService,
        storage: LocalStorage,
        settings: Settings,
    ):
        self.gemini_image = gemini_image
        self.storage = storage
        self.settings = settings

    async def generate_avatars(
        self, run_id: str, avatar_profile: AvatarProfile
    ) -> AvatarResponse:
        """Generate avatar variants from a profile description.

        1. Build prompt from avatar profile using AVATAR_PROMPT_TEMPLATE
        2. Generate max_avatar_variants images concurrently
        3. Save each variant to output/{run_id}/avatar_variants/variant_{n}.png
        4. Return AvatarResponse with list of AvatarVariant
        """
        prompt = AVATAR_PROMPT_TEMPLATE.format(
            gender=avatar_profile.gender,
            age_range=avatar_profile.age_range,
            visual_description=avatar_profile.visual_description,
            attire=avatar_profile.attire,
        )

        num_variants = self.settings.max_avatar_variants

        # generate_avatar returns list[bytes] with concurrent generation
        image_bytes_list = await self.gemini_image.generate_avatar(
            prompt=prompt,
            num_variants=num_variants,
        )

        variants: list[AvatarVariant] = []
        for i, img_bytes in enumerate(image_bytes_list):
            path = self.storage.save_bytes(
                run_id=run_id,
                filename=f"variant_{i}.png",
                data=img_bytes,
                subdir="avatar_variants",
            )
            variants.append(AvatarVariant(index=i, image_path=self.storage.to_url_path(path)))

        logger.info(
            "Generated %d avatar variants for run_id=%s",
            len(variants),
            run_id,
        )

        return AvatarResponse(run_id=run_id, variants=variants)

    async def select_avatar(self, run_id: str, variant_index: int) -> str:
        """Select an avatar variant by copying it to avatar_selected.png.

        Returns the path to the selected avatar.
        """
        source_path = self.storage.get_path(
            run_id=run_id,
            filename=f"variant_{variant_index}.png",
            subdir="avatar_variants",
        )
        if not source_path.exists():
            raise FileNotFoundError(
                f"Avatar variant {variant_index} not found for run {run_id}"
            )

        dest_path = self.storage.get_path(run_id=run_id, filename="avatar_selected.png")
        shutil.copy2(str(source_path), str(dest_path))

        logger.info(
            "Selected avatar variant %d for run_id=%s",
            variant_index,
            run_id,
        )
        return self.storage.to_url_path(str(dest_path))
