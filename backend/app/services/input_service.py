import json
import logging
import uuid
from pathlib import Path

from app.ai.gemini import GeminiService
from app.ai.gemini_image import GeminiImageService
from app.config import Settings
from app.storage.local import LocalStorage

logger = logging.getLogger(__name__)


class InputService:
    def __init__(
        self,
        gemini: GeminiService,
        gemini_image: GeminiImageService,
        storage: LocalStorage,
        settings: Settings,
    ):
        self.gemini = gemini
        self.gemini_image = gemini_image
        self.storage = storage
        self.settings = settings

    async def upload_image(self, image_bytes: bytes, filename: str) -> str:
        """Save an uploaded image and return its URL path."""
        # Generate unique filename to avoid collisions
        ext = Path(filename).suffix or ".png"
        unique_name = f"{uuid.uuid4().hex[:8]}{ext}"

        abs_path = self.storage.save_bytes(
            run_id="uploads",
            filename=unique_name,
            data=image_bytes,
        )
        url_path = self.storage.to_url_path(abs_path)
        logger.info("Image uploaded: %s", url_path)
        return url_path

    async def generate_product_image(self, description: str) -> str:
        """Generate a product image from a text description and return its URL path."""
        prompt = (
            f"A high-quality professional product photograph of {description}. "
            "Clean white background, studio lighting, e-commerce style product photo. "
            "Sharp focus, high resolution, no text or watermarks."
        )
        image_bytes = await self.gemini_image._generate_single_image(prompt)

        unique_name = f"{uuid.uuid4().hex[:8]}.png"
        abs_path = self.storage.save_bytes(
            run_id="generated",
            filename=unique_name,
            data=image_bytes,
        )
        url_path = self.storage.to_url_path(abs_path)
        logger.info("Product image generated: %s", url_path)
        return url_path

    async def analyze_image(self, image_url: str) -> dict:
        """Read an image and extract product name + specifications via AI."""
        # Load image bytes from local path or HTTP
        if image_url.startswith("/output/"):
            local_path = Path(self.settings.output_dir).resolve() / image_url.removeprefix("/output/")
            image_bytes = local_path.read_bytes()
        else:
            import httpx

            async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
                resp = await client.get(image_url)
                resp.raise_for_status()
                image_bytes = resp.content

        result = await self.gemini.analyze_product_image(image_bytes)
        logger.info("Image analyzed: product_name=%s", result.get("product_name"))
        return result

    def list_samples(self) -> list[dict]:
        """Read sample products from samples.json."""
        samples_path = Path(self.settings.output_dir).resolve() / "samples" / "samples.json"
        if not samples_path.exists():
            logger.warning("samples.json not found at %s", samples_path)
            return []
        return json.loads(samples_path.read_text())
