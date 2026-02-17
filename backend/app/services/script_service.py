import json
import logging
import uuid
from pathlib import Path

import httpx

from app.ai.gemini import GeminiService
from app.config import Settings
from app.models.script import (
    AvatarProfile,
    Scene,
    ScriptRequest,
    ScriptResponse,
    ScriptUpdateRequest,
    VideoScript,
)
from app.storage.local import LocalStorage

logger = logging.getLogger(__name__)


class ScriptService:
    def __init__(self, gemini: GeminiService, storage: LocalStorage, settings: Settings):
        self.gemini = gemini
        self.storage = storage
        self.settings = settings

    async def generate_script(self, request: ScriptRequest) -> ScriptResponse:
        """Generate a video script from product details and image.

        1. Generate unique run_id
        2. Load product image (local path or HTTP download)
        3. Save product image locally
        4. Call Gemini to generate script
        5. Parse into VideoScript model
        6. Save script.json
        7. Return ScriptResponse
        """
        run_id = request.run_id or uuid.uuid4().hex[:12]

        image_url = str(request.image_url)

        # Load image bytes — local /output/ path or HTTP download
        if image_url.startswith("/output/"):
            local_path = Path(self.settings.output_dir).resolve() / image_url.removeprefix("/output/")
            image_bytes = local_path.read_bytes()
            ext = local_path.suffix.lstrip(".")
            if ext not in ("png", "jpg", "jpeg", "webp"):
                ext = "png"
        else:
            headers = {"User-Agent": "GenflowAdStudio/2.0"}
            async with httpx.AsyncClient(follow_redirects=True, timeout=30.0, headers=headers) as client:
                resp = await client.get(image_url)
                resp.raise_for_status()
                image_bytes = resp.content

            content_type = resp.headers.get("content-type", "image/png")
            ext = "png"
            if "jpeg" in content_type or "jpg" in content_type:
                ext = "jpg"
            elif "webp" in content_type:
                ext = "webp"

        # Save product image
        product_image_path = self.storage.save_bytes(
            run_id=run_id,
            filename=f"product_image.{ext}",
            data=image_bytes,
        )

        # Compute target duration from scene count (Veo generates 8s clips)
        target_duration = request.scene_count * 8

        # Generate script via Gemini
        raw_script = await self.gemini.generate_script(
            product_name=request.product_name,
            specs=request.specifications,
            image_bytes=image_bytes,
            scene_count=request.scene_count,
            target_duration=target_duration,
            ad_tone=request.ad_tone,
            model_id=request.gemini_model,
            max_words=request.max_dialogue_words_per_scene,
            custom_instructions=request.custom_instructions,
        )

        # Parse into VideoScript model
        avatar_profile = AvatarProfile(**raw_script["avatar_profile"])
        scenes = [Scene(**s) for s in raw_script["scenes"]]
        script = VideoScript(
            video_title=raw_script["video_title"],
            total_duration=raw_script.get("total_duration", target_duration),
            avatar_profile=avatar_profile,
            scenes=scenes,
        )

        # Save script.json
        script_json = script.model_dump()
        self.storage.save_bytes(
            run_id=run_id,
            filename="script.json",
            data=json.dumps(script_json, indent=2).encode("utf-8"),
        )

        logger.info("Script generated for run_id=%s, title=%s", run_id, script.video_title)

        return ScriptResponse(
            run_id=run_id,
            product_image_path=self.storage.to_url_path(product_image_path),
            script=script,
        )

    async def update_script(self, run_id: str, script: VideoScript) -> ScriptResponse:
        """Persist an edited script back to disk."""
        script_json = script.model_dump()
        self.storage.save_bytes(
            run_id=run_id,
            filename="script.json",
            data=json.dumps(script_json, indent=2).encode("utf-8"),
        )
        logger.info("Script updated for run_id=%s", run_id)

        # Build path to product image — it was saved during generate_script
        run_dir = Path(self.settings.output_dir) / run_id
        product_image_path = ""
        for ext in ("png", "jpg", "webp"):
            candidate = run_dir / f"product_image.{ext}"
            if candidate.exists():
                product_image_path = self.storage.to_url_path(str(candidate))
                break

        return ScriptResponse(
            run_id=run_id,
            product_image_path=product_image_path,
            script=script,
        )
