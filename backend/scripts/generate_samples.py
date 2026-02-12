"""Generate sample product images using Gemini 3 Pro Image (Nano Banana Pro).

Usage:
    cd backend
    source .venv/bin/activate
    python scripts/generate_samples.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Ensure backend/ is on sys.path so `app.*` imports work
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv

# Load .env from project root
env_path = backend_dir.parent / ".env"
load_dotenv(env_path)

from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# Sample product definitions
# ---------------------------------------------------------------------------
SAMPLES = [
    {
        "id": "running_shoes",
        "product_name": "AeroGlide Pro Running Shoes",
        "specifications": (
            "Weight: 215g (men's size 10)\n"
            "Drop: 8mm (heel-to-toe)\n"
            "Midsole: ZoomX foam with carbon fiber plate\n"
            "Upper: Engineered mesh with Flyknit collar\n"
            "Outsole: Rubber waffle pattern for road + light trail\n"
            "Colors: Volt/Black, Arctic Blue/White, Sunset Orange\n"
            "Key Features: Energy return, responsive cushioning, breathable fit\n"
            "Price: $179.99"
        ),
        "prompt": (
            "Professional product photography of a pair of high-performance running shoes. "
            "Neon volt green and black colorway with a sleek, modern silhouette. "
            "Carbon fiber plate visible through translucent midsole. "
            "Engineered mesh upper with subtle texture. "
            "Shot on clean white seamless background, studio lighting with soft shadows. "
            "45-degree angle showing both shoes, one slightly in front. "
            "8K, ultra-detailed product photo, commercial advertising quality."
        ),
    },
    {
        "id": "espresso_machine",
        "product_name": "BrewMaster S1 Espresso Machine",
        "specifications": (
            "Pressure: 15-bar Italian pump\n"
            "Boiler: Thermoblock heating, ready in 25 seconds\n"
            "Water Tank: 1.5L removable\n"
            "Grinder: Built-in conical burr, 15 settings\n"
            "Milk System: Automatic steam wand with latte art capability\n"
            "Display: 2.8\" color touchscreen\n"
            "Dimensions: 11\" x 14\" x 15\"\n"
            "Finish: Brushed stainless steel with matte black accents\n"
            "Key Features: PID temperature control, pre-infusion, auto-clean\n"
            "Price: $549.99"
        ),
        "prompt": (
            "Professional product photography of a compact home espresso machine. "
            "Brushed stainless steel body with matte black accents. "
            "Modern minimalist design with a small color touchscreen. "
            "Chrome portafilter attached, steam wand on the right side. "
            "Shot on dark slate countertop with soft moody lighting. "
            "A perfect espresso with golden crema in a clear glass cup beside it. "
            "8K, ultra-detailed product photo, commercial advertising quality."
        ),
    },
    {
        "id": "headphones",
        "product_name": "SoundWave ANC Pro Headphones",
        "specifications": (
            "Driver: 40mm custom dynamic drivers\n"
            "Frequency Response: 4Hz - 40kHz\n"
            "ANC: Adaptive hybrid active noise cancellation\n"
            "Battery: 60 hours (ANC on), 80 hours (ANC off)\n"
            "Charging: USB-C, 5-min charge = 4 hours playback\n"
            "Connectivity: Bluetooth 5.4, multipoint (3 devices)\n"
            "Codec Support: LDAC, aptX Adaptive, AAC\n"
            "Weight: 254g\n"
            "Key Features: Spatial audio, transparency mode, AI call noise reduction\n"
            "Price: $349.99"
        ),
        "prompt": (
            "Professional product photography of premium over-ear wireless headphones. "
            "Matte midnight blue with brushed aluminum accents on the hinges and headband slider. "
            "Plush memory foam ear cushions with protein leather covering. "
            "Sleek, modern design with subtle LED indicator on the ear cup. "
            "Shot floating at a dynamic angle on a clean gradient background (light grey to white). "
            "Dramatic studio lighting with rim light highlighting the curves. "
            "8K, ultra-detailed product photo, commercial advertising quality."
        ),
    },
]

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


async def generate_image(client: genai.Client, prompt: str) -> bytes:
    """Generate a single product image."""
    response = await client.aio.models.generate_content(
        model=os.getenv("IMAGE_MODEL", "gemini-3-pro-image-preview"),
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            safety_settings=ALL_SAFETY_OFF,
            temperature=1.0,
        ),
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            return part.inline_data.data
    raise ValueError("No image data in response")


async def main():
    output_dir = backend_dir / "output" / "samples"
    output_dir.mkdir(parents=True, exist_ok=True)

    client = genai.Client(
        vertexai=True,
        project=os.getenv("PROJECT_ID", ""),
        location=os.getenv("REGION", "global"),
    )

    for sample in SAMPLES:
        out_path = output_dir / f"{sample['id']}.png"
        if out_path.exists():
            print(f"  Skipping {sample['id']} (already exists)")
            continue

        print(f"  Generating {sample['id']}...")
        try:
            image_data = await generate_image(client, sample["prompt"])
            out_path.write_bytes(image_data)
            print(f"  Saved {out_path} ({len(image_data)} bytes)")
        except Exception as e:
            print(f"  FAILED {sample['id']}: {e}")

    # Write sample metadata JSON for the frontend to consume
    import json

    meta = []
    for sample in SAMPLES:
        meta.append(
            {
                "id": sample["id"],
                "product_name": sample["product_name"],
                "specifications": sample["specifications"],
                "image_url": f"http://localhost:8000/output/samples/{sample['id']}.png",
                "thumbnail": f"/output/samples/{sample['id']}.png",
            }
        )

    meta_path = output_dir / "samples.json"
    meta_path.write_text(json.dumps(meta, indent=2))
    print(f"\n  Metadata written to {meta_path}")
    print("  Done!")


if __name__ == "__main__":
    asyncio.run(main())
