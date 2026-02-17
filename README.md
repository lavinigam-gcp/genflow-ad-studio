# Genflow Ad Studio

AI-powered video commercial generator that creates 30-second marketing videos from a single product image.

Built with **Gemini 3 Pro/Flash/Image**, **Imagen 4**, **Veo 3.1**, and **FFmpeg**.

![Pipeline Flow](/asset/bulk-marketing-workflow.png)

## What It Does

Given a product image and specifications, the pipeline generates a finished 30-second commercial through 7 automated steps:

| Step | What Happens | AI Model |
|------|-------------|----------|
| **Input** | Upload/generate product image, provide specs, select scene count (2-6) | Gemini 3 Flash (auto-analysis) |
| **Script** | AI Ad Director composes cinematic script with dialogue, camera, lighting, transitions | Gemini 3 Pro |
| **Avatar** | Generates 1-5 photorealistic presenter variants for selection | Gemini 3 Pro Image / Imagen 4 |
| **Storyboard** | Scene-by-scene frames with QC feedback loop (generate, evaluate, refine, max 3 attempts) | Gemini 3 Pro Image + Flash QC |
| **Video** | 4-8s video clips per scene with scene-to-scene continuity via last-frame chaining | Veo 3.1 + Flash QC |
| **Stitch** | Composites scenes with per-scene transitions and normalized audio | FFmpeg |
| **Review** | Human approval workflow -- approve, reject, or request revisions from any step | Human + AI |

## Architecture

![System Architecture](/asset/system-architecture.webp)

- **Frontend**: React 19 + MUI v7 -- Material Design 3 with dark/light theme, step-by-step pipeline wizard
- **Backend**: FastAPI (Python) -- async pipeline with SSE progress streaming and real-time log delivery
- **Storage**: Local filesystem (`output/`), GCS for Veo I/O, SQLite for job persistence
- **AI**: Gemini 3 Pro (script/QC), Gemini 3 Pro Image (avatars/storyboards), Imagen 4 (avatars), Veo 3.1 (video)

## Prerequisites

- Python 3.11+
- Node.js 18+
- FFmpeg (`brew install ffmpeg` on macOS)
- Google Cloud SDK with a project that has Vertex AI APIs enabled

## Quick Start

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd genmedia-bulk-marketing-workflow

# 2. Authenticate with Google Cloud
gcloud auth application-default login
gcloud auth application-default set-quota-project YOUR_PROJECT_ID

# 3. Configure environment
cp .env.example .env
# Edit .env — set PROJECT_ID and GCS_BUCKET_NAME

# 4. Install dependencies and run
make setup    # Installs backend + frontend deps, creates GCS bucket, generates sample images
make dev      # Starts backend (8000) + frontend (3000)
```

Open http://localhost:3000 in your browser.

## Commands

| Command | What it does |
|---------|--------------|
| `make setup` | Full first-time setup (install + GCS bucket + sample images) |
| `make dev` | Run backend (port 8000) + frontend (port 3000) |
| `make stop` | Kill both servers |
| `make check` | Type-check backend imports + frontend TSC + validate assets |
| `make test-api` | Smoke-test API endpoints (needs running backend) |
| `make reset-db` | Delete SQLite DB + legacy job files (fixes schema errors) |
| `make clean` | Remove venvs, node_modules, output |
| `make generate-samples` | Generate missing sample product images via AI |
| `make build` | Build frontend for production |
| `make deploy` | Build and deploy to Cloud Run |

Run `make help` for the full list.

## Troubleshooting

### Pydantic validation errors on startup

If you see errors about missing fields when loading jobs from the database:

```bash
make reset-db   # Deletes SQLite DB + legacy job files
make dev        # Restart — fresh DB is created automatically
```

This happens when Pydantic models evolve (new fields added) but old job data in SQLite was saved with the previous schema. The QC report fields are backward-compatible (optional with defaults), so this should be rare going forward.

### Port already in use

```bash
make stop       # Kills processes on ports 8000 and 3000
make dev        # Restart
```

## Project Structure

```
backend/
  main.py                     # FastAPI app + route registration + static mounts
  app/
    dependencies.py           # DI container (@lru_cache singletons)
    config.py                 # Settings via pydantic-settings + .env
    ai/                       # AI model wrappers (gemini, gemini_image, imagen, veo)
    models/                   # Pydantic models (job, script, avatar, storyboard, video, etc.)
    services/                 # Business logic (pipeline, script, avatar, storyboard, video, stitch, qc)
    api/                      # FastAPI route handlers
    jobs/                     # Job store (SQLite), runner, SSE broadcaster
    utils/                    # FFmpeg, JSON parser, SSE log handler
    storage/                  # Local + GCS storage
frontend/
  src/
    api/                      # API client + pipeline functions
    types/                    # TypeScript interfaces (mirrors backend models)
    constants/                # Shared UI constants (models, tones, defaults)
    store/                    # Zustand stores (pipeline, review, bulk)
    components/
      pipeline/               # Step-by-step pipeline UI components
      review/                 # Review workflow components
      common/                 # Shared components (ModelBadge, QCBadge, etc.)
      layout/                 # AppBar, MainLayout, InsightPanel, Footer
      pages/                  # HowItWorksPage, HistoryPage
asset/                        # Architecture diagrams (served at /asset/)
.docs/diagram-generator/      # Diagram generation CLI + JSON prompts
```

## Key Features

- **Optimistic navigation** -- Steps advance immediately, show skeleton loading, render when ready
- **SSE progressive loading** -- Storyboard and video results stream in real-time as each scene completes
- **Backend log streaming** -- All Python `logger.*()` calls auto-stream to the frontend log panel via SSE
- **QC feedback loop** -- Automatic quality control with prompt rewriting and regeneration (configurable thresholds)
- **Scene continuity** -- Last frame of each video feeds into the next scene as a reference image
- **Session persistence** -- Pipeline state saved to SQLite at each step; resume from History page
- **Dark/light theme** -- MUI v7 CSS variables with `useColorScheme()` toggle
- **Architecture diagrams** -- 9 AI-generated technical diagrams on the How It Works page + InsightPanel

## Models Used

| Model | ID | Purpose |
|-------|-----|---------|
| Gemini 3 Pro | `gemini-3-pro-preview` | Script generation, QC prompt rewriting |
| Gemini 3 Flash | `gemini-3-flash-preview` | QC evaluation, image analysis, auto-fill |
| Gemini 3 Pro Image | `gemini-3-pro-image-preview` | Avatar and storyboard image generation |
| Imagen 4 | `imagen-4.0-generate-001` | Alternative avatar generation (Standard/Fast/Ultra) |
| Veo 3.1 | `veo-3.1-generate-preview` | Video clip generation (4-8s, up to 4K, native audio) |

## API Docs

With the backend running, visit http://localhost:8000/docs for interactive Swagger UI.

## Architecture Diagrams

The project includes 9 AI-generated technical diagrams viewable on the `/how-it-works` page:

| Diagram | Shows |
|---------|-------|
| Pipeline Flow | End-to-end 7-step horizontal flow with AI model labels |
| System Architecture | 4-layer: React Frontend, FastAPI Backend, AI APIs, Storage |
| Product Input | Three input methods with Flash auto-analysis |
| Script Generation | Gemini Pro narrative arc builder with VideoScript JSON output |
| Avatar Creation | Dual-model routing (Gemini Image / Imagen 4) |
| Storyboard QC | Generate, evaluate, refine feedback loop |
| Video Continuity | Veo 3.1 sequential processing with last-frame chaining |
| FFmpeg Stitching | VFR preprocessing, transition routing, audio normalization |
| Review & Approval | Human review with pipeline feedback targets |

To regenerate diagrams:

```bash
cd .docs/diagram-generator
../../backend/.venv/bin/python generate_diagrams.py          # All 9
../../backend/.venv/bin/python generate_diagrams.py --list   # List available
../../backend/.venv/bin/python generate_diagrams.py --name pipeline-flow  # Single
```

Requires `PROJECT_ID` environment variable set to your GCP project.
