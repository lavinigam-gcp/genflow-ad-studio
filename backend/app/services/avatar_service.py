import logging
import shutil
from pathlib import Path

from app.ai.gemini_image import GeminiImageService
from app.ai.imagen import ImagenService
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
        imagen: ImagenService,
        storage: LocalStorage,
        settings: Settings,
    ):
        self.gemini_image = gemini_image
        self.imagen = imagen
        self.storage = storage
        self.settings = settings

    async def generate_avatars(
        self,
        run_id: str,
        avatar_profile: AvatarProfile,
        num_variants: int | None = None,
        image_model: str | None = None,
        custom_prompt: str = "",
        reference_image_url: str = "",
    ) -> AvatarResponse:
        """Generate avatar variants from a profile description.

        1. Build prompt from avatar profile using AVATAR_PROMPT_TEMPLATE
           (or use custom_prompt if provided)
        2. Route to Gemini Image or Imagen based on image_model prefix
        3. Save each variant to output/{run_id}/avatar_variants/variant_{n}.png
        4. Return AvatarResponse with list of AvatarVariant
        """
        effective_variants = num_variants or self.settings.max_avatar_variants

        if custom_prompt:
            prompt = custom_prompt
        else:
            # Build ethnicity prefix: "South Asian " or "" (empty)
            ethnicity_prefix = (
                f"{avatar_profile.ethnicity} "
                if avatar_profile.ethnicity
                else ""
            )
            prompt = AVATAR_PROMPT_TEMPLATE.format(
                gender=avatar_profile.gender,
                age_range=avatar_profile.age_range,
                visual_description=avatar_profile.visual_description,
                attire=avatar_profile.attire,
                ethnicity=ethnicity_prefix,
                tone_of_voice=avatar_profile.tone_of_voice or "confident and approachable",
            )

        # If a reference image was uploaded, load its bytes for Gemini
        reference_bytes: bytes | None = None
        if reference_image_url:
            # Convert URL path (/output/...) to absolute filesystem path
            if reference_image_url.startswith("/output/"):
                ref_path = self.storage.base_dir / reference_image_url[len("/output/"):]
            else:
                ref_path = Path(reference_image_url)
            if ref_path.exists():
                reference_bytes = ref_path.read_bytes()

        # Route to the appropriate image generation service
        use_imagen = image_model and image_model.startswith("imagen-")

        if use_imagen:
            # Imagen doesn't support reference images, so we only pass prompt
            image_bytes_list = await self.imagen.generate_avatar(
                prompt=prompt,
                num_variants=effective_variants,
            )
        else:
            image_bytes_list = await self.gemini_image.generate_avatar(
                prompt=prompt,
                num_variants=effective_variants,
                reference_bytes=reference_bytes,
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
            "Generated %d avatar variants for run_id=%s (model=%s)",
            len(variants),
            run_id,
            image_model or "gemini-image",
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
