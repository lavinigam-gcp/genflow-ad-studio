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
        2. Download product image from request.image_url
        3. Save product image locally
        4. Call Gemini to generate script
        5. Parse into VideoScript model
        6. Save script.json
        7. Return ScriptResponse
        """
        run_id = uuid.uuid4().hex[:12]

        # Download the product image
        headers = {"User-Agent": "GenflowAdStudio/2.0"}
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0, headers=headers) as client:
            resp = await client.get(str(request.image_url))
            resp.raise_for_status()
            image_bytes = resp.content

        # Determine file extension from content type
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

        # Generate script via Gemini
        raw_script = await self.gemini.generate_script(
            product_name=request.product_name,
            specs=request.specifications,
            image_bytes=image_bytes,
            scene_count=request.scene_count,
            target_duration=request.target_duration,
            ad_tone=request.ad_tone,
        )

        # Parse into VideoScript model
        avatar_profile = AvatarProfile(**raw_script["avatar_profile"])
        scenes = [Scene(**s) for s in raw_script["scenes"]]
        script = VideoScript(
            video_title=raw_script["video_title"],
            total_duration=raw_script.get("total_duration", 30),
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
