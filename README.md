# Genflow Ad Studio

AI-powered video commercial generator that creates 30-second marketing videos from a single product image. Built with Gemini 3 Pro, Gemini 3 Pro Image, and Veo 3.1.

## What It Does

Given a product name, description, and image, the pipeline:

1. **Script** -- Generates a structured scene-by-scene script with dialogue, shot types, and camera directions (Gemini 3 Pro)
2. **Avatar** -- Creates photorealistic spokesperson variants for selection (Gemini 3 Pro Image)
3. **Storyboard** -- Produces scene-by-scene storyboard images with QC scoring and automatic regeneration (Gemini 3 Pro Image)
4. **Video** -- Generates multiple video variants per scene, auto-selects best via QC (Veo 3.1, 8s clips with audio)
5. **Stitch** -- Concatenates scene videos into a final commercial (FFmpeg)
6. **Review** -- Human approval workflow (approve / reject / request changes)

## Architecture

- **Backend**: FastAPI (Python) -- async pipeline with SSE progress streaming
- **Frontend**: React 19 + MUI v7 -- Material Design 3 light theme, step-by-step UI
- **Storage**: Local filesystem (`output/`), GCS only for Veo output bucket

## Prerequisites

- Python 3.11+
- Node.js 18+
- FFmpeg (`brew install ffmpeg` on macOS)
- Google Cloud SDK with a project that has Vertex AI APIs enabled

## Quick Start

```bash
# 1. Authenticate with Google Cloud
gcloud auth application-default login
gcloud auth application-default set-quota-project YOUR_PROJECT_ID

# 2. Configure environment
cp .env.example .env
# Edit .env with your GCP project ID and bucket name

# 3. Install and run
make setup    # Installs deps, creates GCS bucket, generates sample images
make dev      # Starts backend (8000) + frontend (3000)
```

Open http://localhost:3000 in your browser.

Run `make help` for all available commands.

## Models Used

| Model | ID | Purpose |
|-------|-----|---------|
| Gemini 3 Pro | `gemini-3-pro-preview` | Script generation, complex QC |
| Gemini 3 Flash | `gemini-3-flash-preview` | QC evaluation, prompt rewriting |
| Gemini 3 Pro Image | `gemini-3-pro-image-preview` | Avatar and storyboard images |
| Veo 3.1 | `veo-3.1-generate-preview` | Video generation (8s, 1080p, with audio) |

## API Docs

With the backend running, visit http://localhost:8000/docs for interactive Swagger UI.
