import asyncio
import logging
import random
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
from app.utils.ffmpeg import extract_last_frame

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
        seed: int | None = None,
        resolution: str = "720p",
        veo_model: str | None = None,
        aspect_ratio: str = "9:16",
        duration_seconds: int = 8,
        compression_quality: str = "optimized",
        qc_threshold: int | None = None,
        max_qc_regen_attempts: int = 0,
        use_reference_images: bool = True,
        negative_prompt_extra: str = "",
    ) -> VideoResponse:
        """Generate video variants for all scenes with QC and auto-selection.

        Uses bounded concurrency via asyncio.Semaphore.
        """
        # Auto-generate seed for cross-scene consistency if none provided
        if seed is None:
            seed = random.randint(0, 2**31)
            logger.info("Auto-generated Veo seed: %d", seed)

        effective_variants = num_variants or self.settings.max_video_variants
        semaphore = asyncio.Semaphore(self.settings.max_concurrent_scenes)

        # Build a lookup from scene_number -> Scene
        scene_lookup = {s.scene_number: s for s in script_scenes}

        # Process scenes sequentially so we can extract the last frame of
        # each scene and pass it as an asset reference to the next scene,
        # maintaining visual continuity across the ad.
        sorted_scenes = sorted(scenes_data, key=lambda s: s.scene_number)
        results: list[VideoResult] = []
        prev_last_frame_gcs: str | None = None

        for sb_result in sorted_scenes:
            scene = scene_lookup[sb_result.scene_number]
            result = await self._process_single_scene(
                run_id=run_id,
                sb_result=sb_result,
                scene=scene,
                avatar_profile=avatar_profile,
                on_progress=on_progress,
                num_variants=effective_variants,
                seed=seed,
                resolution=resolution,
                veo_model=veo_model,
                aspect_ratio=aspect_ratio,
                duration_seconds=duration_seconds,
                compression_quality=compression_quality,
                qc_threshold=qc_threshold,
                max_qc_regen_attempts=max_qc_regen_attempts,
                use_reference_images=use_reference_images,
                negative_prompt_extra=negative_prompt_extra,
                prev_scene_last_frame_gcs=prev_last_frame_gcs,
            )
            results.append(result)

            # Extract last frame from the selected video for next scene
            try:
                selected_video_local = str(self.storage.get_path(
                    run_id,
                    f"variant_{result.selected_index}.mp4",
                    subdir=f"scenes/scene_{sb_result.scene_number}/video_variants",
                ))
                last_frame_local = str(self.storage.get_path(
                    run_id,
                    "last_frame.png",
                    subdir=f"scenes/scene_{sb_result.scene_number}",
                ))
                await extract_last_frame(selected_video_local, last_frame_local)
                gcs_path = f"pipeline/{run_id}/scenes/scene_{sb_result.scene_number}/last_frame.png"
                prev_last_frame_gcs = await asyncio.to_thread(
                    self.gcs.upload_file, last_frame_local, gcs_path,
                )
                logger.info(
                    "Scene %d: extracted last frame → %s",
                    sb_result.scene_number, prev_last_frame_gcs,
                )
            except Exception as exc:
                logger.warning(
                    "Scene %d: failed to extract last frame: %s",
                    sb_result.scene_number, exc,
                )
                prev_last_frame_gcs = None

        return VideoResponse(results=results)

    async def _process_single_scene(
        self,
        run_id: str,
        sb_result: StoryboardResult,
        scene: Scene,
        avatar_profile: AvatarProfile,
        on_progress: Callable | None,
        num_variants: int | None = None,
        seed: int | None = None,
        resolution: str = "720p",
        veo_model: str | None = None,
        aspect_ratio: str = "9:16",
        duration_seconds: int = 8,
        compression_quality: str = "optimized",
        qc_threshold: int | None = None,
        max_qc_regen_attempts: int = 0,
        use_reference_images: bool = True,
        negative_prompt_extra: str = "",
        prev_scene_last_frame_gcs: str | None = None,
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

        # Upload avatar image to GCS as reference for Veo character consistency
        avatar_local = str(self.storage.get_path(run_id, "avatar_selected.png"))
        gcs_avatar_path = f"pipeline/{run_id}/avatar_selected.png"
        avatar_gcs_uri = await asyncio.to_thread(
            self.gcs.upload_file, avatar_local, gcs_avatar_path,
        )

        # Build asset reference image list for Veo character/product consistency
        # Max 3 asset references: avatar + product + previous scene last frame
        asset_image_uris = None
        if use_reference_images:
            asset_image_uris = [avatar_gcs_uri, product_gcs_uri]
            if prev_scene_last_frame_gcs:
                asset_image_uris.append(prev_scene_last_frame_gcs)
                logger.info(
                    "Scene %d: using previous scene last frame for continuity",
                    scene_num,
                )

        # 2. Build video prompt with full character description for consistency
        voice_style = (
            scene.voice_style
            or avatar_profile.voice_style
            or avatar_profile.tone_of_voice
        )
        detailed_desc = (
            scene.detailed_avatar_description
            or avatar_profile.visual_description
        )
        prompt = VIDEO_PROMPT_TEMPLATE.format(
            detailed_avatar_description=detailed_desc,
            visual_background=scene.visual_background,
            lighting=scene.lighting,
            shot_type=scene.shot_type,
            avatar_action=scene.avatar_action,
            avatar_emotion=scene.avatar_emotion,
            camera_movement=scene.camera_movement,
            product_visual_integration=scene.product_visual_integration,
            voice_style=voice_style,
            script_dialogue=scene.script_dialogue,
            sound_design=scene.sound_design,
            audio_continuity=scene.audio_continuity or "",
        )

        # Build per-scene negative prompt from scene + request level
        scene_negative = scene.negative_elements or ""
        if negative_prompt_extra:
            scene_negative = f"{scene_negative}, {negative_prompt_extra}" if scene_negative else negative_prompt_extra

        # 3. Generate video variants via Veo
        output_gcs_uri = self.gcs.get_veo_output_uri(run_id) + f"scene_{scene_num}/"
        video_gcs_uris = await self.veo.generate_videos(
            prompt=prompt,
            reference_image_uri=storyboard_gcs_uri,
            output_gcs_uri=output_gcs_uri,
            num_variants=effective_variants,
            seed=seed,
            resolution=resolution,
            negative_prompt_extra=scene_negative,
            asset_image_uris=asset_image_uris,
            aspect_ratio=aspect_ratio,
            duration_seconds=duration_seconds,
            compression_quality=compression_quality,
            veo_model=veo_model,
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

        # 7. QC feedback loop: if best variant fails QC, rewrite prompt and regenerate
        regen_attempts = 0
        if max_qc_regen_attempts > 0:
            selected_variant = next((v for v in variants if v.index == selected_idx), variants[0])
            for regen_round in range(max_qc_regen_attempts):
                if selected_variant.qc_report and self.qc.video_passes_qc(
                    selected_variant.qc_report, threshold=qc_threshold
                ):
                    break
                regen_attempts += 1
                logger.info(
                    "Scene %d: video QC regen attempt %d/%d",
                    scene_num, regen_attempts, max_qc_regen_attempts,
                )
                # Rewrite prompt based on QC feedback
                if selected_variant.qc_report:
                    prompt = await self.qc.rewrite_video_prompt(prompt, selected_variant.qc_report)

                # Regenerate all variants with improved prompt
                regen_output_uri = self.gcs.get_veo_output_uri(run_id) + f"scene_{scene_num}_regen{regen_round + 1}/"
                video_gcs_uris = await self.veo.generate_videos(
                    prompt=prompt,
                    reference_image_uri=storyboard_gcs_uri,
                    output_gcs_uri=regen_output_uri,
                    num_variants=effective_variants,
                    seed=seed,
                    resolution=resolution,
                    negative_prompt_extra=scene_negative,
                    asset_image_uris=asset_image_uris,
                    aspect_ratio=aspect_ratio,
                    duration_seconds=duration_seconds,
                    compression_quality=compression_quality,
                    veo_model=veo_model,
                )

                # Download and replace variants
                variants = []
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

                # Re-run QC
                for i, variant in enumerate(variants):
                    try:
                        qc_report = await self.qc.qc_video(
                            video_uri=video_gcs_uris[i],
                            reference_uri=product_gcs_uri,
                        )
                        variant.qc_report = qc_report
                    except Exception as exc:
                        logger.warning(
                            "Video QC failed for scene %d variant %d (regen %d): %s",
                            scene_num, i, regen_round + 1, exc,
                        )

                # Re-select best
                selected_idx = self.qc.select_best_video_variant(variants)
                selected_variant = next((v for v in variants if v.index == selected_idx), variants[0])

        # 8. Copy best to selected_video.mp4
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
            regen_attempts=regen_attempts,
            prompt_used=prompt,
        )

    async def regenerate_single_scene(
        self,
        run_id: str,
        sb_result: StoryboardResult,
        scene: Scene,
        avatar_profile: AvatarProfile,
        on_progress: Callable | None = None,
        num_variants: int | None = None,
        seed: int | None = None,
        resolution: str = "720p",
        veo_model: str | None = None,
        aspect_ratio: str = "9:16",
        duration_seconds: int = 8,
        compression_quality: str = "optimized",
        qc_threshold: int | None = None,
        max_qc_regen_attempts: int = 0,
        use_reference_images: bool = True,
        negative_prompt_extra: str = "",
    ) -> VideoResult:
        """Regenerate video for a single scene."""
        return await self._process_single_scene(
            run_id=run_id,
            sb_result=sb_result,
            scene=scene,
            avatar_profile=avatar_profile,
            on_progress=on_progress,
            num_variants=num_variants,
            seed=seed,
            resolution=resolution,
            veo_model=veo_model,
            aspect_ratio=aspect_ratio,
            duration_seconds=duration_seconds,
            compression_quality=compression_quality,
            qc_threshold=qc_threshold,
            max_qc_regen_attempts=max_qc_regen_attempts,
            use_reference_images=use_reference_images,
            negative_prompt_extra=negative_prompt_extra,
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
