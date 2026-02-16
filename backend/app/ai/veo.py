import asyncio
import logging

from google import genai
from google.genai import types

from app.ai.prompts import VIDEO_NEGATIVE_PROMPT
from app.ai.retry import async_retry
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

    # GA models that silently ignore reference_images
    GA_MODELS = {"veo-3.1-generate-001", "veo-3.1-fast-generate-001"}

    @async_retry(retries=2, initial_delay=5.0, backoff_factor=2.0)
    async def generate_videos(
        self,
        prompt: str,
        reference_image_uri: str,
        output_gcs_uri: str,
        num_variants: int = 4,
        seed: int | None = None,
        resolution: str = "720p",
        negative_prompt_extra: str = "",
        asset_image_uris: list[str] | None = None,
        aspect_ratio: str = "9:16",
        duration_seconds: int = 8,
        compression_quality: str = "optimized",
        veo_model: str | None = None,
        generate_audio: bool = True,
    ) -> list[str]:
        """Generate video variants using Veo 3.1.

        Returns a list of GCS URIs for the generated video files.

        Veo API constraint: ``image`` (first-frame) and ``reference_images``
        (asset refs) are **mutually exclusive**.  When asset reference URIs are
        provided we use ``reference_images`` for character/product consistency
        and let the prompt describe the scene composition.  Otherwise we pass
        the storyboard frame as ``image`` for first-frame guidance.

        Args:
            reference_image_uri: GCS URI to the storyboard frame (first-frame
                reference, used only when asset_image_uris is empty).
            asset_image_uris: Up to 3 GCS URIs for asset reference images
                (avatar, product, prev-scene last frame).
            aspect_ratio: "9:16" or "16:9".
            duration_seconds: 4, 6, or 8. Must be 8 when using reference images
                or high resolution.
            compression_quality: "optimized" or "lossless".
            veo_model: Override the default Veo model ID.
        """
        # Combine global negative prompt with per-scene extras
        full_negative = VIDEO_NEGATIVE_PROMPT
        if negative_prompt_extra:
            full_negative = f"{VIDEO_NEGATIVE_PROMPT}, {negative_prompt_extra}"

        # Enforce constraints: referenceImages or high resolution require 8s
        effective_duration = duration_seconds
        if asset_image_uris and effective_duration != 8:
            logger.warning(
                "referenceImages requires duration_seconds=8, overriding %d→8",
                effective_duration,
            )
            effective_duration = 8
        if resolution in ("1080p", "4k") and effective_duration != 8:
            logger.warning(
                "High resolution (%s) requires duration_seconds=8, overriding %d→8",
                resolution,
                effective_duration,
            )
            effective_duration = 8

        # When referenceImages used, person_generation must be "allow_adult"
        person_gen = "allow_adult" if asset_image_uris else "allow_all"

        config_kwargs: dict = dict(
            aspect_ratio=aspect_ratio,
            number_of_videos=num_variants,
            duration_seconds=effective_duration,
            generate_audio=generate_audio,
            negative_prompt=full_negative,
            person_generation=person_gen,
            output_gcs_uri=output_gcs_uri,
            resolution=resolution,
        )

        if seed is not None:
            config_kwargs["seed"] = seed

        model_id = veo_model or self.settings.veo_model

        # Veo API: `image` and `reference_images` are mutually exclusive.
        # When asset references are provided, use reference_images for
        # character/product consistency.  Otherwise fall back to `image`
        # for first-frame guidance from the storyboard.
        #
        # GA models silently ignore reference_images — fall back to
        # storyboard first-frame mode to avoid silent quality degradation.
        use_asset_refs = bool(asset_image_uris)
        if use_asset_refs and model_id in self.GA_MODELS:
            logger.warning(
                "GA model %s ignores reference_images — falling back to image mode",
                model_id,
            )
            use_asset_refs = False

        if use_asset_refs:
            config_kwargs["reference_images"] = [
                types.VideoGenerationReferenceImage(
                    image=types.Image(gcs_uri=uri, mime_type="image/png"),
                    reference_type="asset",
                )
                for uri in asset_image_uris[:3]  # Max 3 reference images
            ]

        config = types.GenerateVideosConfig(**config_kwargs)

        generate_kwargs: dict = dict(
            model=model_id,
            prompt=prompt,
            config=config,
        )

        # Only pass `image` when NOT using reference_images (mutually exclusive)
        if not use_asset_refs:
            generate_kwargs["image"] = types.Image(
                gcs_uri=reference_image_uri,
                mime_type="image/png",
            )

        operation = await asyncio.to_thread(
            self.client.models.generate_videos,
            **generate_kwargs,
        )

        logger.info("Veo operation started: %s (model=%s)", getattr(operation, "name", ""), model_id)

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
        else:
            # Log detailed info about the failed operation
            logger.error(
                "Veo operation returned no videos. response=%s, error=%s, metadata=%s",
                getattr(completed, "response", None),
                getattr(completed, "error", None),
                getattr(completed, "metadata", None),
            )

        if not video_uris:
            error_detail = getattr(completed, "error", None)
            raise ValueError(
                f"Veo returned no video outputs. error={error_detail}"
            )

        return video_uris
