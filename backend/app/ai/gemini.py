import logging

from google import genai
from google.genai import types

from app.ai.prompts import (
    PROMPT_REWRITE_TEMPLATE,
    SCRIPT_SYSTEM_INSTRUCTION,
    SCRIPT_USER_PROMPT_TEMPLATE,
    STORYBOARD_QC_SYSTEM_INSTRUCTION,
    STORYBOARD_QC_USER_PROMPT,
    VIDEO_QC_SYSTEM_INSTRUCTION,
    VIDEO_QC_USER_PROMPT,
)
from app.ai.retry import async_retry
from app.config import Settings
from app.utils.json_parser import parse_json_response

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


class GeminiService:
    def __init__(self, client: genai.Client, settings: Settings):
        self.client = client
        self.settings = settings

    @async_retry(retries=3)
    async def generate_script(
        self, product_name: str, specs: str, image_bytes: bytes
    ) -> dict:
        """Generate video script using Gemini 3 Pro with structured JSON output."""
        user_prompt = SCRIPT_USER_PROMPT_TEMPLATE.format(
            product_name=product_name, specs=specs
        )

        image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/png")
        text_part = types.Part.from_text(text=user_prompt)

        response = await self.client.aio.models.generate_content(
            model=self.settings.gemini_model,
            contents=[image_part, text_part],
            config=types.GenerateContentConfig(
                system_instruction=SCRIPT_SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                safety_settings=ALL_SAFETY_OFF,
                temperature=1.0,
            ),
        )

        return parse_json_response(response.text)

    @async_retry(retries=3)
    async def qc_storyboard(
        self,
        avatar_bytes: bytes,
        product_bytes: bytes,
        storyboard_bytes: bytes,
    ) -> dict:
        """QC storyboard using Gemini 3 Flash for faster evaluation."""
        avatar_part = types.Part.from_bytes(data=avatar_bytes, mime_type="image/png")
        product_part = types.Part.from_bytes(
            data=product_bytes, mime_type="image/png"
        )
        storyboard_part = types.Part.from_bytes(
            data=storyboard_bytes, mime_type="image/png"
        )
        text_part = types.Part.from_text(text=STORYBOARD_QC_USER_PROMPT)

        response = await self.client.aio.models.generate_content(
            model=self.settings.gemini_flash_model,
            contents=[avatar_part, product_part, storyboard_part, text_part],
            config=types.GenerateContentConfig(
                system_instruction=STORYBOARD_QC_SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                safety_settings=ALL_SAFETY_OFF,
                temperature=1.0,
            ),
        )

        return parse_json_response(response.text)

    @async_retry(retries=3)
    async def qc_video(
        self, video_uri: str, reference_image_uri: str
    ) -> dict:
        """QC video using Gemini 3 Flash.

        Accepts GCS URIs for the video and reference product image.
        """
        image_part = types.Part.from_uri(
            file_uri=reference_image_uri, mime_type="image/png"
        )
        video_part = types.Part.from_uri(
            file_uri=video_uri, mime_type="video/mp4"
        )
        text_part = types.Part.from_text(text=VIDEO_QC_USER_PROMPT)

        response = await self.client.aio.models.generate_content(
            model=self.settings.gemini_flash_model,
            contents=[image_part, video_part, text_part],
            config=types.GenerateContentConfig(
                system_instruction=VIDEO_QC_SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                safety_settings=ALL_SAFETY_OFF,
                temperature=1.0,
            ),
        )

        return parse_json_response(response.text)

    @async_retry(retries=3)
    async def rewrite_prompt(
        self, original_prompt: str, qc_feedback: str
    ) -> str:
        """Rewrite a generation prompt based on QC feedback using Gemini 3 Flash."""
        prompt_text = PROMPT_REWRITE_TEMPLATE.format(
            original_prompt=original_prompt,
            qc_feedback=qc_feedback,
        )

        response = await self.client.aio.models.generate_content(
            model=self.settings.gemini_flash_model,
            contents=prompt_text,
            config=types.GenerateContentConfig(
                safety_settings=ALL_SAFETY_OFF,
                temperature=1.0,
            ),
        )

        return response.text.strip()
