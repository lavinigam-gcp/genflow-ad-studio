# Genflow Ad Studio -- Development Guide

AI-powered 30-second video commercial generator. Product image in, finished ad out.
Stack: FastAPI + React 19 + MUI v7 | Gemini 3 Pro/Flash/Image + Imagen 4 + Veo 3.1 | FFmpeg

## Commands

```bash
make setup           # Full first-time setup (install + GCS + sample images)
make dev             # Run backend (8000) + frontend (3000)
make check           # Type-check backend imports + frontend TSC + validate assets
make test            # Full system test (starts servers, tests API + frontend + auth + assets)
make reset-db        # Delete SQLite DB + legacy job files (fixes schema errors)
make generate-samples # Generate missing sample product images via AI
make help            # Show all available commands
```

**Always run `make check` before finishing any task.**

## Codebase Structure

```
backend/
  main.py                     # FastAPI app + route registration + /asset static mount
  scripts/                    # Utility scripts (generate_samples.py)
  app/
    dependencies.py           # DI container (@lru_cache singletons)
    config.py                 # Settings via pydantic-settings + .env
    ai/    {gemini, gemini_image, imagen, veo, retry, prompts}.py
    models/ {job, script, avatar, storyboard, video, review, sse, common}.py
    services/ {pipeline, script, avatar, storyboard, video, stitch, qc, review, bulk, input}_service.py
    api/    {pipeline, jobs, bulk, review, assets, health, config_api, input}.py
    jobs/   {store, runner, events}.py
    utils/  {ffmpeg, csv_parser, json_parser, sse_log_handler}.py
    storage/ {local, gcs}.py
  output/
    samples/                  # 9 AI-generated product images (checked into git)
frontend/
  public/                     # Static assets (logo, favicons, web manifest)
  src/
    api/     {client, pipeline}.ts
    types/   index.ts            # Must mirror backend Pydantic models exactly
    constants/ controls.ts       # Shared UI constants (models, tones, defaults)
    store/   {pipeline, review, bulk}Store.ts
    components/ {pipeline/, review/, common/, layout/, pages/}
asset/                          # Generated architecture diagrams (served at /asset/)
.docs/diagram-generator/        # Diagram generation CLI + JSON prompts
```

## Architecture Rules

- URL paths via `storage.to_url_path()` -- never return filesystem paths to the frontend
- RPC-style POST routes with request body -- not RESTful resource URLs
- New services must register in `backend/app/dependencies.py` (`@lru_cache` singleton)
- `@async_retry` on all AI SDK calls (Gemini + Veo)
- Frontend types (`types/index.ts`) must mirror backend Pydantic models field-for-field
- Veo outputs VFR video -- always preprocess to 24fps CFR before stitching
- QC feedback loop: generate, QC score, rewrite prompt, regenerate (max 3 attempts)
- Manual regen auto-carries `previous_qc_report` for QC-informed prompt rewriting
- `image_url` accepts local `/output/...` paths -- services detect prefix and read from disk
- Video duration = user-selectable 4/6/8s (8s auto-enforced with reference images or resolution >= 1080p)
- `generate_audio` toggle: configurable via VideoPlayer Switch (default True)
- File uploads: use `api.upload()` with FormData -- `api.post()` is for JSON only
- `detailed_avatar_description` must be identical across all scenes for Veo consistency
- Same Veo `seed` across all scenes for character/voice consistency
- Veo API: `image` (first-frame) and `reference_images` (asset refs) are mutually exclusive
- Scene-to-scene continuity: last frame extracted and passed as asset reference to next scene
- Imagen 4 does NOT support `negative_prompt` -- use positive prompting only
- Transition types in script map to FFmpeg xfade effects via `TRANSITION_MAP` in `ffmpeg.py`
- Every prompt template field must be wired end-to-end: model field, service, template `.format()`
- Persisted Pydantic models must use optional fields with defaults for backward compatibility
- `JobStore.list_jobs()` catches and skips corrupted rows -- one bad job must not crash the app
- `HowItWorksPage.tsx` step data uses `subtitle` + `bullets[]` (demo talking points) -- not paragraph prose
- Architecture diagrams must be demo-friendly: no code references, no jargon -- plain language only
- All diagrams match the visual style of `pipeline-flow.webp`: warm gray background, white cards, Google colors

## Adding a Feature

1. Define Pydantic model in `backend/app/models/` (snake_case fields, string enums)
2. Create service in `backend/app/services/` (constructor injection, async methods)
3. Register in `backend/app/dependencies.py` -- add `get_foo_service()` with `@lru_cache`
4. Add POST route in `backend/app/api/` -- request body, no path params
5. Register router in `backend/main.py` with `/api/v1/` prefix
6. Add matching TypeScript interface in `frontend/src/types/index.ts`
7. Add API function in `frontend/src/api/pipeline.ts`
8. Update Zustand store with new state fields
9. Add shared constants to `frontend/src/constants/controls.ts`
10. Create/update component in `frontend/src/components/pipeline/`
11. Add SSE event type if step emits progress

## Code Style

### Python (Backend)

- Async-first with FastAPI
- Pydantic models with snake_case fields
- Constructor injection for services, `@lru_cache` singletons
- `client.aio.models` (async) -- never `client.models` for Gemini calls
- `Part.from_bytes()` for local images, `Part.from_uri()` for GCS URIs
- Pro model for generation, Flash model for QC evaluation
- Always parse AI responses with `parse_json_response()` from `app/utils/json_parser.py`
- `asyncio.create_subprocess_exec` for FFmpeg -- never blocking subprocess
- SSE log streaming: `SSELogHandler` bridges `logger.*()` calls to frontend log panel via `pipeline_run_id` context var

### TypeScript (Frontend)

- MUI v7 with Material Design 3 -- light + dark theme via `colorSchemes` in `theme.ts`
- Functional components only -- no class components
- Use `sx` prop for styling, not `styled()` or CSS modules
- Never hardcode hex colors -- use semantic tokens (`'primary.main'`, `'background.default'`, etc.)
- Always include loading + error states
- Use `useStore.getState()` in async callbacks, selector hooks in render
- Request bodies use `snake_case` to match Python models
- Shared UI constants in `constants/controls.ts` -- never inline model lists or defaults

## Layout

- **AppBar**: Centered logo + ThemeToggle (light/dark) top-right
- **Floating nav sidebar**: Fixed vertical icon buttons on left edge with tooltips
- **Stepper**: Horizontal pipeline progress below header, clickable up to max reached step
- **InsightPanel**: Slide-out panel on right edge -- expandable (360px / 600px), per-step architecture diagrams, click diagram for full-size overlay
- **Pipeline Logs**: Floating resizable overlay (bottom-right), drag top-left corner to resize, close button, auto-scrolls to latest
- **Main content**: Centered max-width 1400px area

## SSE (Server-Sent Events)

Two patterns coexist:

1. **`useSSE` hook** -- long-lived connection for background job monitoring
2. **`openSceneProgressSSE` side-channel** -- short-lived connection during interactive POST calls, streams both scene progress and backend logs

Named events: `addEventListener('scene_progress', handler)` and `addEventListener('log', handler)` -- NOT `onmessage`.

## Storage

- `LocalStorage.save_bytes(data, run_id, filename)` -> absolute path
- Convert to URL: `storage.to_url_path(abs_path)` -> `/output/{run_id}/...`
- Pseudo run_ids `"uploads"` and `"generated"` for non-pipeline files
- GCS only for Veo (it requires `gs://` URIs for input/output)
- Architecture diagrams: `asset/` at project root, served via `/asset` static mount -- 9 demo-friendly diagrams generated via Gemini 3 Pro Image
- Sample images + metadata in `output/samples/` -- managed by `scripts/generate_samples.py`

## Don'ts

- Don't use `requirements.txt` -- project uses `pyproject.toml` with `pip install -e .`
- Don't use raw `fetch()` -- use `api/client.ts` (configured base URL + error handling)
- Don't call `useStore()` in async callbacks -- use `useStore.getState()` instead
- Don't skip `to_url_path()` when returning file paths from backend services
- Don't set Content-Type manually on FormData requests -- the browser sets the boundary
- Don't commit files in dot-folders (`.claude/`, `.gemini/`, `.playwright-mcp/`, etc.)
- Don't add required fields to persisted Pydantic models -- use `Optional` with defaults

## Models Used

| Model | ID | Purpose |
|-------|-----|---------|
| Gemini 3 Pro | `gemini-3-pro-preview` | Script generation, QC prompt rewriting |
| Gemini 3 Flash | `gemini-3-flash-preview` | QC evaluation, prompt rewriting, image analysis |
| Gemini 3 Pro Image | `gemini-3-pro-image-preview` | Avatar, storyboard, product images, architecture diagrams |
| Imagen 4 | `imagen-4.0-generate-001` | Alternative avatar generation (Standard/Fast/Ultra) |
| Veo 3.1 | `veo-3.1-generate-preview` | Video generation (4-8s, up to 4K, native audio) |
