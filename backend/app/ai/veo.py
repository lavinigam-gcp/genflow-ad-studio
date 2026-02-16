import asyncio
import logging

from google import genai
from google.genai import types

from app.ai.prompts import VIDEO_NEGATIVE_PROMPT
from app.config import Settings

logger = logging.getLogger(__name__)


class VeoService:
    def __init__(self, client: genai.Client, settings: Settings):
        self.client = client
        self.settings = settings

    async def poll_operation(self, operation) -> object:
        """Poll an async operation until done, using asyncio.sleep between checks."""
        while not operation.done:
            await asyncio.sleep(20)
            operation = await asyncio.to_thread(
                self.client.operations.get, operation
            )
        return operation

    async def generate_videos(
        self,
        prompt: str,
        reference_image_uri: str,
        output_gcs_uri: str,
        num_variants: int = 4,
        seed: int | None = None,
        resolution: str = "720p",
        negative_prompt_extra: str = "",
    ) -> list[str]:
        """Generate video variants using Veo 3.1.

        Returns a list of GCS URIs for the generated video files.
        The reference_image_uri is a GCS URI to the storyboard frame
        used as the first-frame reference for the video.
        """
        image = types.Image(
            gcs_uri=reference_image_uri,
            mime_type="image/png",
        )

        # Combine global negative prompt with per-scene extras
        full_negative = VIDEO_NEGATIVE_PROMPT
        if negative_prompt_extra:
            full_negative = f"{VIDEO_NEGATIVE_PROMPT}, {negative_prompt_extra}"

        config_kwargs: dict = dict(
            aspect_ratio="9:16",
            number_of_videos=num_variants,
            duration_seconds=8,
            generate_audio=True,
            negative_prompt=full_negative,
            person_generation="allow_all",
            output_gcs_uri=output_gcs_uri,
        )

        if seed is not None:
            config_kwargs["seed"] = seed

        config = types.GenerateVideosConfig(**config_kwargs)

        operation = await asyncio.to_thread(
            self.client.models.generate_videos,
            model=self.settings.veo_model,
            prompt=prompt,
            image=image,
            config=config,
        )

        logger.info("Veo operation started: %s", getattr(operation, "name", ""))

        completed = await self.poll_operation(operation)

        video_uris: list[str] = []
        if completed.response and completed.response.generated_videos:
            for gen_video in completed.response.generated_videos:
                video = gen_video.video
                uri = getattr(video, "uri", None) or getattr(
                    video, "gcs_uri", None
                )
                if uri:
                    video_uris.append(uri)
                    logger.info("Generated video: %s", uri)

        if not video_uris:
            raise ValueError("Veo returned no video outputs")

        return video_uris
