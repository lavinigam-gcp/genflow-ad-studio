import logging

from fastapi import APIRouter, HTTPException, UploadFile

from app.dependencies import get_input_service
from app.models.script import (
    AnalyzeImageRequest,
    AnalyzeImageResponse,
    GenerateImageRequest,
    GenerateImageResponse,
    ImageUploadResponse,
    SampleProduct,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/input", tags=["input"])

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload-image", response_model=ImageUploadResponse)
async def upload_image(file: UploadFile):
    """Upload a product image (max 10MB). Returns the image URL path."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    data = await file.read()
    if len(data) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 10MB limit")

    svc = get_input_service()
    image_url = await svc.upload_image(data, file.filename or "upload.png")
    return ImageUploadResponse(image_url=image_url)


@router.post("/generate-image", response_model=GenerateImageResponse)
async def generate_image(request: GenerateImageRequest):
    """Generate a product image from a text description using AI."""
    svc = get_input_service()
    try:
        image_url = await svc.generate_product_image(request.description)
    except Exception as e:
        logger.error("Image generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    return GenerateImageResponse(image_url=image_url)


@router.post("/analyze-image", response_model=AnalyzeImageResponse)
async def analyze_image(request: AnalyzeImageRequest):
    """Analyze a product image and extract name + specifications."""
    svc = get_input_service()
    try:
        result = await svc.analyze_image(request.image_url)
    except Exception as e:
        logger.error("Image analysis failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
    return AnalyzeImageResponse(
        product_name=result.get("product_name", ""),
        specifications=result.get("specifications", ""),
    )


@router.post("/samples")
async def list_samples() -> dict:
    """Return the list of sample products."""
    svc = get_input_service()
    samples = svc.list_samples()
    return {"samples": [SampleProduct(**s) for s in samples]}
