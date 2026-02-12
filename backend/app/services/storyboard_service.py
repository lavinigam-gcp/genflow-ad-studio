import asyncio
import logging
from typing import Callable

from app.ai.gemini_image import GeminiImageService
from app.ai.prompts import STORYBOARD_PROMPT_TEMPLATE
from app.config import Settings
from app.models.script import Scene
from app.models.storyboard import StoryboardResponse, StoryboardResult
from app.services.qc_service import QCService
from app.storage.local import LocalStorage

logger = logging.getLogger(__name__)


class StoryboardService:
    def __init__(
        self,
        gemini_image: GeminiImageService,
        qc: QCService,
        storage: LocalStorage,
        settings: Settings,
    ):
        self.gemini_image = gemini_image
        self.qc = qc
        self.storage = storage
        self.settings = settings

    async def generate_storyboard(
        self,
        run_id: str,
        scenes: list[Scene],
        on_progress: Callable | None = None,
    ) -> StoryboardResponse:
        """Generate storyboard images for all scenes with QC feedback loop.

        Uses bounded concurrency via asyncio.Semaphore.
        For each scene:
        1. Load avatar and product images
        2. Build prompt from STORYBOARD_PROMPT_TEMPLATE
        3. Generate image, run QC
        4. If QC fails, rewrite prompt and regenerate (up to max_regen_attempts)
        5. Return best result
        """
        semaphore = asyncio.Semaphore(self.settings.max_concurrent_scenes)

        async def process_scene(scene: Scene) -> StoryboardResult:
            async with semaphore:
                return await self._process_single_scene(run_id, scene, len(scenes), on_progress)

        tasks = [process_scene(scene) for scene in scenes]
        results = await asyncio.gather(*tasks)

        # Sort by scene_number
        sorted_results = sorted(results, key=lambda r: r.scene_number)

        return StoryboardResponse(results=sorted_results)

    async def _process_single_scene(
        self,
        run_id: str,
        scene: Scene,
        total_scenes: int,
        on_progress: Callable | None,
    ) -> StoryboardResult:
        """Process a single scene with QC and regeneration loop."""
        # Load reference images
        avatar_bytes = self.storage.load_bytes(run_id, "avatar_selected.png")
        product_path = self._find_product_image(run_id)
        product_bytes = self.storage.load_bytes(run_id, product_path)

        # Build initial prompt
        prompt = STORYBOARD_PROMPT_TEMPLATE.format(
            scene_number=scene.scene_number,
            total_scenes=total_scenes,
            shot_type=scene.shot_type,
            camera_movement=scene.camera_movement,
            visual_background=scene.visual_background,
            lighting=scene.lighting,
            avatar_action=scene.avatar_action,
            avatar_emotion=scene.avatar_emotion,
            product_visual_integration=scene.product_visual_integration,
        )

        best_image_bytes: bytes | None = None
        best_qc_report = None
        regen_attempts = 0

        for attempt in range(self.settings.max_regen_attempts + 1):
            # Generate storyboard image
            image_bytes = await self.gemini_image.generate_storyboard_image(
                prompt=prompt,
                avatar_bytes=avatar_bytes,
                product_bytes=product_bytes,
            )

            # Run QC
            qc_report = await self.qc.qc_storyboard(
                avatar_bytes=avatar_bytes,
                product_bytes=product_bytes,
                storyboard_bytes=image_bytes,
            )

            # Keep track of best result
            if best_qc_report is None or (
                qc_report.avatar_validation.score + qc_report.product_validation.score
                > best_qc_report.avatar_validation.score + best_qc_report.product_validation.score
            ):
                best_image_bytes = image_bytes
                best_qc_report = qc_report

            if self.qc.storyboard_passes_qc(qc_report):
                logger.info(
                    "Scene %d passed QC on attempt %d",
                    scene.scene_number,
                    attempt + 1,
                )
                break

            if attempt < self.settings.max_regen_attempts:
                regen_attempts += 1
                logger.info(
                    "Scene %d failed QC (avatar=%d, product=%d), regenerating (attempt %d/%d)",
                    scene.scene_number,
                    qc_report.avatar_validation.score,
                    qc_report.product_validation.score,
                    regen_attempts,
                    self.settings.max_regen_attempts,
                )
                # Rewrite prompt with QC feedback
                prompt = await self.qc.rewrite_prompt(prompt, qc_report)

                if on_progress:
                    on_progress({
                        "scene_number": scene.scene_number,
                        "event": "regen_attempt",
                        "attempt": regen_attempts,
                    })

        # Save the best image
        image_path = self.storage.save_bytes(
            run_id=run_id,
            filename="storyboard.png",
            data=best_image_bytes,
            subdir=f"scenes/scene_{scene.scene_number}",
        )

        if on_progress:
            on_progress({
                "scene_number": scene.scene_number,
                "event": "scene_completed",
                "qc_avatar": best_qc_report.avatar_validation.score,
                "qc_product": best_qc_report.product_validation.score,
            })

        return StoryboardResult(
            scene_number=scene.scene_number,
            image_path=self.storage.to_url_path(image_path),
            qc_report=best_qc_report,
            regen_attempts=regen_attempts,
        )

    def _find_product_image(self, run_id: str) -> str:
        """Find the product image file in the run directory."""
        for ext in ("png", "jpg", "webp"):
            path = self.storage.get_path(run_id, f"product_image.{ext}")
            if path.exists():
                return f"product_image.{ext}"
        raise FileNotFoundError(f"No product image found for run {run_id}")
