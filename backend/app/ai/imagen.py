"""Imagen 4 image generation service.

Supports imagen-4.0-generate-001 (Standard), imagen-4.0-fast-generate-001 (Fast),
and imagen-4.0-ultra-generate-001 (Ultra).

Note: Imagen 4 does NOT support negative_prompt. Use positive prompting only.
"""

import asyncio
import logging

from google import genai
from google.genai import types

from app.ai.retry import async_retry
from app.config import Settings

logger = logging.getLogger(__name__)


class ImagenService:
    def __init__(self, client: genai.Client, settings: Settings):
        self.client = client
        self.settings = settings

    @async_retry(retries=3)
    async def generate_images(
        self,
        prompt: str,
        model: str | None = None,
        num_images: int = 4,
    ) -> list[bytes]:
        """Generate images using Imagen 4.

        Returns a list of raw image bytes. Imagen 4's generate_images
        can produce up to 4 images per call, so for >4 we batch.
        """
        effective_model = model or self.settings.imagen_model

        config = types.GenerateImagesConfig(
            number_of_images=min(num_images, 4),
            person_generation="allow_all",
            aspect_ratio="9:16",
        )

        response = await asyncio.to_thread(
            self.client.models.generate_images,
            model=effective_model,
            prompt=prompt,
            config=config,
        )

        images: list[bytes] = []
        if response.generated_images:
            for gen_image in response.generated_images:
                if gen_image.image and gen_image.image.image_bytes:
                    images.append(gen_image.image.image_bytes)

        if not images:
            raise ValueError("Imagen returned no image outputs")

        logger.info(
            "Generated %d images with %s", len(images), effective_model
        )
        return images

    async def generate_avatar(
        self, prompt: str, num_variants: int = 4
    ) -> list[bytes]:
        """Generate avatar variants using Imagen 4.

        For >4 variants, runs multiple batches concurrently.
        """
        if num_variants <= 4:
            return await self.generate_images(prompt, num_images=num_variants)

        # Batch into groups of 4
        batches: list[int] = []
        remaining = num_variants
        while remaining > 0:
            batch_size = min(remaining, 4)
            batches.append(batch_size)
            remaining -= batch_size

        tasks = [self.generate_images(prompt, num_images=n) for n in batches]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        images: list[bytes] = []
        for result in results:
            if isinstance(result, Exception):
                logger.error("Imagen batch failed: %s", result)
            else:
                images.extend(result)

        if not images:
            raise ValueError("All Imagen generation batches failed")

        return images[:num_variants]
