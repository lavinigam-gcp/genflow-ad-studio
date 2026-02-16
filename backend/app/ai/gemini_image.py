import asyncio
import logging

from google import genai
from google.genai import types

from app.ai.retry import async_retry
from app.config import Settings

logger = logging.getLogger(__name__)

ALL_SAFETY_OFF = [
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold=types.HarmBlockThreshold.OFF,
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold=types.HarmBlockThreshold.OFF,
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold=types.HarmBlockThreshold.OFF,
    ),
    types.SafetySetting(
        category=types.HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold=types.HarmBlockThreshold.OFF,
    ),
]


class GeminiImageService:
    def __init__(self, client: genai.Client, settings: Settings):
        self.client = client
        self.settings = settings

    @async_retry(retries=3)
    async def _generate_single_image(
        self,
        prompt: str,
        reference_bytes: bytes | None = None,
        aspect_ratio: str = "9:16",
        image_size: str = "2K",
    ) -> bytes:
        """Generate a single image and return raw bytes.

        If reference_bytes is provided, it's passed as a reference image
        before the text prompt for style/appearance guidance.
        """
        if reference_bytes:
            ref_part = types.Part.from_bytes(
                data=reference_bytes, mime_type="image/png"
            )
            text_part = types.Part.from_text(text=prompt)
            contents = [ref_part, text_part]
        else:
            contents = prompt

        response = await self.client.aio.models.generate_content(
            model=self.settings.image_model,
            contents=contents,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                safety_settings=ALL_SAFETY_OFF,
                temperature=1.0,
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                    image_size=image_size,
                ),
            ),
        )

        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.data:
                return part.inline_data.data

        raise ValueError("No image data in response")

    async def generate_avatar(
        self,
        prompt: str,
        num_variants: int = 4,
        reference_bytes: bytes | None = None,
        aspect_ratio: str = "9:16",
        image_size: str = "2K",
    ) -> list[bytes]:
        """Generate avatar variants concurrently.

        Each call produces 1 image, so we run num_variants calls
        concurrently and return the collected image bytes.
        """
        tasks = [
            self._generate_single_image(
                prompt, reference_bytes, aspect_ratio=aspect_ratio, image_size=image_size
            )
            for _ in range(num_variants)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        images: list[bytes] = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error("Avatar variant %d failed: %s", i, result)
            else:
                images.append(result)

        if not images:
            raise ValueError("All avatar generation attempts failed")

        return images

    @async_retry(retries=3)
    async def generate_storyboard_image(
        self,
        prompt: str,
        avatar_bytes: bytes,
        product_bytes: bytes,
        image_model: str | None = None,
        aspect_ratio: str = "9:16",
        image_size: str = "2K",
    ) -> bytes:
        """Generate a storyboard image with avatar and product reference images.

        Reference images are passed as Parts before the text prompt so the
        model can use them for visual consistency.
        """
        avatar_part = types.Part.from_bytes(
            data=avatar_bytes, mime_type="image/png"
        )
        product_part = types.Part.from_bytes(
            data=product_bytes, mime_type="image/png"
        )
        text_part = types.Part.from_text(text=prompt)

        response = await self.client.aio.models.generate_content(
            model=image_model or self.settings.image_model,
            contents=[avatar_part, product_part, text_part],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                safety_settings=ALL_SAFETY_OFF,
                temperature=1.0,
                image_config=types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                    image_size=image_size,
                ),
            ),
        )

        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.data:
                return part.inline_data.data

        raise ValueError("No image data in storyboard response")
