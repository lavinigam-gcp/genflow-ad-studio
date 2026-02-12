import asyncio
import logging
from typing import Callable

from app.ai.prompts import VIDEO_PROMPT_TEMPLATE
from app.ai.veo import VeoService
from app.config import Settings
from app.models.script import AvatarProfile, Scene
from app.models.storyboard import StoryboardResult
from app.models.video import VideoResponse, VideoResult, VideoVariant
from app.services.qc_service import QCService
from app.storage.gcs import GCSStorage
from app.storage.local import LocalStorage

logger = logging.getLogger(__name__)


class VideoService:
    def __init__(
        self,
        veo: VeoService,
        gcs: GCSStorage,
        qc: QCService,
        storage: LocalStorage,
        settings: Settings,
    ):
        self.veo = veo
        self.gcs = gcs
        self.qc = qc
        self.storage = storage
        self.settings = settings

    async def generate_videos(
        self,
        run_id: str,
        scenes_data: list[StoryboardResult],
        script_scenes: list[Scene],
        avatar_profile: AvatarProfile,
        on_progress: Callable | None = None,
        num_variants: int | None = None,
    ) -> VideoResponse:
        """Generate video variants for all scenes with QC and auto-selection.

        Uses bounded concurrency via asyncio.Semaphore.
        """
        effective_variants = num_variants or self.settings.max_video_variants
        semaphore = asyncio.Semaphore(self.settings.max_concurrent_scenes)

        # Build a lookup from scene_number -> Scene
        scene_lookup = {s.scene_number: s for s in script_scenes}

        async def process_scene(sb_result: StoryboardResult) -> VideoResult:
            async with semaphore:
                scene = scene_lookup[sb_result.scene_number]
                return await self._process_single_scene(
                    run_id, sb_result, scene, avatar_profile, on_progress,
                    num_variants=effective_variants,
                )

        tasks = [process_scene(sb) for sb in scenes_data]
        results = await asyncio.gather(*tasks)

        sorted_results = sorted(results, key=lambda r: r.scene_number)
        return VideoResponse(results=sorted_results)

    async def _process_single_scene(
        self,
        run_id: str,
        sb_result: StoryboardResult,
        scene: Scene,
        avatar_profile: AvatarProfile,
        on_progress: Callable | None,
        num_variants: int | None = None,
    ) -> VideoResult:
        """Process a single scene: upload to GCS, generate videos, QC, select best."""
        effective_variants = num_variants or self.settings.max_video_variants
        scene_num = sb_result.scene_number

        # 1. Upload storyboard image to GCS as Veo reference
        storyboard_local = str(self.storage.get_path(
            run_id, "storyboard.png", subdir=f"scenes/scene_{scene_num}",
        ))
        gcs_storyboard_path = f"pipeline/{run_id}/scenes/scene_{scene_num}/storyboard.png"
        storyboard_gcs_uri = await asyncio.to_thread(
            self.gcs.upload_file, storyboard_local, gcs_storyboard_path,
        )

        # Also upload product image for video QC reference
        product_filename = self._find_product_image(run_id)
        product_local = str(self.storage.get_path(run_id, product_filename))
        gcs_product_path = f"pipeline/{run_id}/product_image.png"
        product_gcs_uri = await asyncio.to_thread(
            self.gcs.upload_file, product_local, gcs_product_path,
        )

        # 2. Build video prompt (motion-only for Veo 3.1 image-to-video)
        prompt = VIDEO_PROMPT_TEMPLATE.format(
            avatar_action=scene.avatar_action,
            avatar_emotion=scene.avatar_emotion,
            camera_movement=scene.camera_movement,
            product_visual_integration=scene.product_visual_integration,
            tone_of_voice=avatar_profile.tone_of_voice,
            script_dialogue=scene.script_dialogue,
            sound_design=scene.sound_design,
        )

        # 3. Generate video variants via Veo
        output_gcs_uri = self.gcs.get_veo_output_uri(run_id) + f"scene_{scene_num}/"
        video_gcs_uris = await self.veo.generate_videos(
            prompt=prompt,
            reference_image_uri=storyboard_gcs_uri,
            output_gcs_uri=output_gcs_uri,
            num_variants=effective_variants,
        )

        # 4. Download all variants from GCS to local
        variants: list[VideoVariant] = []
        for i, gcs_uri in enumerate(video_gcs_uris):
            local_path = self.storage.get_path(
                run_id,
                f"variant_{i}.mp4",
                subdir=f"scenes/scene_{scene_num}/video_variants",
            )
            local_path.parent.mkdir(parents=True, exist_ok=True)
            await asyncio.to_thread(self.gcs.download_to_local, gcs_uri, str(local_path))
            url_path = self.storage.to_url_path(str(local_path))
            variants.append(VideoVariant(index=i, video_path=url_path))

        # 5. Run QC on all variants
        for i, variant in enumerate(variants):
            try:
                qc_report = await self.qc.qc_video(
                    video_uri=video_gcs_uris[i],
                    reference_uri=product_gcs_uri,
                )
                variant.qc_report = qc_report
            except Exception as exc:
                logger.warning(
                    "Video QC failed for scene %d variant %d: %s",
                    scene_num, i, exc,
                )

        # 6. Auto-select best variant
        selected_idx = self.qc.select_best_video_variant(variants)

        # 7. Copy best to selected_video.mp4
        selected_variant = next((v for v in variants if v.index == selected_idx), variants[0])
        source_local = str(self.storage.get_path(
            run_id, f"variant_{selected_idx}.mp4",
            subdir=f"scenes/scene_{scene_num}/video_variants",
        ))
        selected_path = self.storage.save_file(
            run_id=run_id,
            filename="selected_video.mp4",
            source_path=source_local,
            subdir=f"scenes/scene_{scene_num}",
        )

        if on_progress:
            on_progress({
                "scene_number": scene_num,
                "event": "video_completed",
                "selected_variant": selected_idx,
                "num_variants": len(variants),
            })

        logger.info(
            "Scene %d: selected video variant %d of %d",
            scene_num, selected_idx, len(variants),
        )

        return VideoResult(
            scene_number=scene_num,
            variants=variants,
            selected_index=selected_idx,
            selected_video_path=self.storage.to_url_path(selected_path),
        )

    async def select_variant(
        self, run_id: str, scene_number: int, variant_index: int
    ) -> str:
        """Select a different video variant for a scene.

        Copies the chosen variant to selected_video.mp4 and returns its URL path.
        """
        source_local = str(self.storage.get_path(
            run_id,
            f"variant_{variant_index}.mp4",
            subdir=f"scenes/scene_{scene_number}/video_variants",
        ))
        if not self.storage.get_path(
            run_id, f"variant_{variant_index}.mp4",
            subdir=f"scenes/scene_{scene_number}/video_variants",
        ).exists():
            raise FileNotFoundError(
                f"Variant {variant_index} not found for scene {scene_number}"
            )

        selected_path = self.storage.save_file(
            run_id=run_id,
            filename="selected_video.mp4",
            source_path=source_local,
            subdir=f"scenes/scene_{scene_number}",
        )
        logger.info(
            "Scene %d: user selected variant %d", scene_number, variant_index
        )
        return self.storage.to_url_path(selected_path)

    def _find_product_image(self, run_id: str) -> str:
        """Find the product image file in the run directory."""
        for ext in ("png", "jpg", "webp"):
            path = self.storage.get_path(run_id, f"product_image.{ext}")
            if path.exists():
                return f"product_image.{ext}"
        raise FileNotFoundError(f"No product image found for run {run_id}")
