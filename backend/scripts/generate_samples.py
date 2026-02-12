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
    {
        "id": "smartwatch",
        "product_name": "PulseTrack Ultra Smartwatch",
        "specifications": (
            "Display: 1.45\" AMOLED, 466x466, 2000 nits peak brightness\n"
            "Case: Grade 5 titanium, 46mm diameter\n"
            "Sensors: Optical heart rate, SpO2, skin temperature, ECG\n"
            "Navigation: Dual-band GPS + GLONASS + Galileo\n"
            "Battery: 7-day typical use, 48hr GPS continuous\n"
            "Water Resistance: 10ATM (100m)\n"
            "Connectivity: Bluetooth 5.3, Wi-Fi, NFC payments\n"
            "OS: Wear OS 5 with custom fitness suite\n"
            "Key Features: Sleep coaching, body composition, offline maps\n"
            "Price: $399.99"
        ),
        "prompt": (
            "Professional product photography of a premium titanium smartwatch. "
            "Brushed titanium case with a vibrant AMOLED display showing a fitness dashboard. "
            "Black fluoroelastomer sport band with titanium buckle. "
            "Slim profile, sapphire crystal glass, subtle crown button on the side. "
            "Shot on a clean dark gradient background with dramatic studio lighting. "
            "Watch face angled slightly toward camera, showing the display clearly. "
            "8K, ultra-detailed product photo, commercial advertising quality."
        ),
    },
    {
        "id": "skincare_serum",
        "product_name": "GlowLab Vitamin C Serum",
        "specifications": (
            "Active Ingredients: 20% L-Ascorbic Acid, 1% Hyaluronic Acid, 0.5% Vitamin E\n"
            "Volume: 30ml / 1.0 fl oz\n"
            "Packaging: Amber glass dropper bottle with matte gold cap\n"
            "pH: 3.2 (optimal for L-AA absorption)\n"
            "Texture: Lightweight, fast-absorbing water-based serum\n"
            "Skin Types: All skin types, dermatologist tested\n"
            "Key Features: Brightening, anti-aging, antioxidant protection, dark spot correction\n"
            "Certifications: Cruelty-free, vegan, fragrance-free\n"
            "Price: $68.00"
        ),
        "prompt": (
            "Professional product photography of a luxury vitamin C skincare serum. "
            "Amber glass dropper bottle with matte gold cap and minimalist white label. "
            "Golden-yellow serum visible through the glass. "
            "Dropper held above the bottle with a drop of serum catching the light. "
            "Shot on clean white marble surface with soft natural lighting. "
            "Fresh citrus slices and botanical elements subtly in the background. "
            "8K, ultra-detailed product photo, commercial advertising quality."
        ),
    },
    {
        "id": "electric_scooter",
        "product_name": "UrbanGlide X1 Electric Scooter",
        "specifications": (
            "Motor: 350W brushless hub motor (700W peak)\n"
            "Top Speed: 25 mph (40 km/h)\n"
            "Range: 30 miles (48 km) per charge\n"
            "Battery: 48V 15Ah lithium-ion, 4hr full charge\n"
            "Tires: 10\" pneumatic, puncture-resistant\n"
            "Brakes: Dual disc brakes + regenerative braking\n"
            "Weight: 36 lbs (16.3 kg), foldable design\n"
            "Max Load: 265 lbs (120 kg)\n"
            "Key Features: LED headlight/taillight, app connectivity, cruise control\n"
            "Price: $799.99"
        ),
        "prompt": (
            "Professional product photography of a sleek electric scooter. "
            "Matte black frame with teal accent lighting along the deck edges. "
            "Modern minimalist design with large 10-inch pneumatic tires. "
            "LED headlight integrated into the stem, digital display visible on handlebars. "
            "Shot on clean light grey studio background with soft directional lighting. "
            "Scooter standing upright at a three-quarter angle showing full profile. "
            "8K, ultra-detailed product photo, commercial advertising quality."
        ),
    },
    {
        "id": "wireless_earbuds",
        "product_name": "BassCore Elite Earbuds",
        "specifications": (
            "Drivers: 10mm custom dynamic drivers with titanium diaphragm\n"
            "ANC: Hybrid active noise cancellation, -35dB reduction\n"
            "Battery: 8hr earbuds + 32hr charging case (40hr total)\n"
            "Charging: USB-C, Qi wireless charging\n"
            "Water Resistance: IPX5 (sweat and rain proof)\n"
            "Connectivity: Bluetooth 5.4, multipoint (2 devices)\n"
            "Codec Support: LDAC, AAC, SBC\n"
            "Weight: 5.2g per earbud, 48g case\n"
            "Key Features: Spatial audio, transparency mode, in-ear detection\n"
            "Price: $129.99"
        ),
        "prompt": (
            "Professional product photography of premium true wireless earbuds. "
            "Matte white earbuds with rose gold metallic accents on the stems. "
            "Compact rounded charging case open, showing earbuds nestled inside. "
            "LED indicator light glowing softly on the case front. "
            "Shot on clean soft pink-to-white gradient background. "
            "Dramatic studio lighting with reflections on the metallic accents. "
            "8K, ultra-detailed product photo, commercial advertising quality."
        ),
    },
    {
        "id": "yoga_mat",
        "product_name": "ZenGrip Pro Yoga Mat",
        "specifications": (
            "Thickness: 6mm (1/4 inch)\n"
            "Material: Natural tree rubber base, polyurethane top layer\n"
            "Dimensions: 72\" x 26\" (183 x 66 cm)\n"
            "Weight: 5.5 lbs (2.5 kg)\n"
            "Surface: Non-slip wet and dry grip, moisture-absorbing\n"
            "Alignment: Laser-etched alignment markers\n"
            "Certifications: OEKO-TEX Standard 100, biodegradable\n"
            "Includes: Cotton carry strap\n"
            "Key Features: Eco-friendly, antimicrobial, superior cushioning\n"
            "Price: $89.99"
        ),
        "prompt": (
            "Professional product photography of a premium yoga mat. "
            "Deep ocean blue color with subtle laser-etched alignment guide lines. "
            "Mat partially rolled showing the textured non-slip surface. "
            "Natural rubber base visible in cross-section of the roll. "
            "Cotton carry strap draped beside the mat. "
            "Shot on clean light wood floor with soft natural window lighting. "
            "Minimal zen-inspired composition with a small plant in the background. "
            "8K, ultra-detailed product photo, commercial advertising quality."
        ),
    },
    {
        "id": "portable_blender",
        "product_name": "BlendJet PowerFresh Blender",
        "specifications": (
            "Motor: 300W high-torque motor\n"
            "Capacity: 20oz (590ml) BPA-free Tritan jar\n"
            "Blades: 6-point stainless steel, ice-crushing capable\n"
            "Battery: 4000mAh USB-C rechargeable, 15+ blends per charge\n"
            "Speed: One-touch operation, 30-second blend cycle\n"
            "Dimensions: 3.5\" x 10.5\" (9 x 27 cm)\n"
            "Weight: 1.3 lbs (590g)\n"
            "Safety: Auto-lock when open, magnetic charging base\n"
            "Key Features: Self-cleaning mode, leak-proof lid, dishwasher-safe jar\n"
            "Price: $49.99"
        ),
        "prompt": (
            "Professional product photography of a portable personal blender. "
            "Sleek cylindrical design in arctic white with mint green accents. "
            "Clear Tritan jar showing a vibrant green smoothie inside. "
            "USB-C charging port visible on the base. "
            "One-touch power button with LED ring indicator on the front. "
            "Shot on clean white background with fresh fruits scattered artfully nearby. "
            "Bright, fresh, energetic studio lighting. "
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
