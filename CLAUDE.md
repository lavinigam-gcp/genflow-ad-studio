# Genflow Ad Studio

AI-powered 30-second video commercial generator. Product image in, finished ad out.
Stack: FastAPI + React 19 + MUI v7 | Gemini 3 Pro/Flash/Image + Veo 3.1 | FFmpeg

## Commands

| Command | What it does |
|---------|--------------|
| `make dev` | Run backend (8000) + frontend (3000) |
| `make stop` | Kill both servers |
| `make check` | Type-check backend imports + frontend TSC |
| `make test-api` | Smoke-test API (needs running backend) |
| `make setup` | Full first-time setup |
| `make clean` | Remove venvs, node_modules, output |
| `make generate-samples` | Generate missing sample product images via AI |

**Always run `make check` before finishing any task.**

## Critical Rules

- URL paths via `storage.to_url_path()` — never return filesystem paths to the frontend
- RPC-style POST routes with request body — not RESTful resource URLs
- New services must register in `backend/app/dependencies.py` (lru_cache singleton)
- `@async_retry` on all AI SDK calls (Gemini + Veo)
- Frontend types (`types/index.ts`) must mirror backend Pydantic models exactly
- Veo outputs VFR video — always preprocess to 24fps CFR before stitching
- QC feedback loop: generate → QC score → rewrite prompt → regenerate (max 3 attempts)
- SSE events: add to `SSEEventType` enum + backend `broadcaster.emit()` + frontend `useSSE` handler
- `image_url` accepts local `/output/...` paths — services detect prefix and read from disk
- Video duration = `scene_count × 8` (Veo 8s clips) — not user-configurable
- File uploads: use `api.upload()` with FormData — `api.post()` is for JSON only

## Session Continuity

- Interactive pipeline creates a job in SQLite at each step (`pipeline.py` endpoints persist via `job_store`)
- `JobStore.create_job(request, job_id=run_id)` — use the run_id as job_id so file paths match
- Guard pattern: `if job_store.get_job(run_id):` before updating — legacy runs may lack a DB record
- Frontend `pipelineStore.loadJob(job)` hydrates all state from a Job object (script, avatars, storyboard, videos, final)
- `activeStep` is computed from the furthest step with data (final_video > videos > storyboard > avatars > script)
- History page Resume: calls `getJob(jobId)` → `store.loadJob(job)` → `navigate('/')`
- Run ID banner + "New Generation" button shown in `PipelineView.tsx` when `runId` is set
- `custom_instructions` field on `ScriptRequest` — appended to Gemini prompt as "ADDITIONAL CREATIVE DIRECTION"

## Layout

- **AppBar**: Centered logo only (`frontend/src/components/layout/AppBar.tsx`)
- **Floating nav sidebar**: Fixed vertical icon buttons on the left edge with tooltips (`MainLayout.tsx`)
- **Stepper**: Horizontal pipeline progress below the header (`MainLayout.tsx`)
- **Main content**: Centered max-width 1400px area
- Nav items defined in `MainLayout.tsx` `NAV_ITEMS` array — add icons from `@mui/icons-material`

## Structure

```
backend/
  main.py                     # FastAPI app + route registration
  app/
    dependencies.py           # DI container (@lru_cache singletons)
    ai/    {gemini, gemini_image, veo, retry, prompts}.py
    models/ {job, script, avatar, storyboard, video, review, sse, common}.py
    services/ {pipeline, script, avatar, storyboard, video, stitch, qc, review, bulk, input}_service.py
    api/    {pipeline, jobs, bulk, review, assets, health, config_api, input}.py
    jobs/   {store, runner, events}.py
    utils/  {ffmpeg, csv_parser, json_parser}.py
frontend/
  public/                     # Static assets (logo, favicons, web manifest)
  src/
    api/     {client, pipeline}.ts
    types/   index.ts            # Must mirror backend models
    store/   {pipeline, review, bulk}Store.ts
    components/ {pipeline/, review/, common/, layout/}
```

## Don'ts

- Don't use `requirements.txt` — project uses `pyproject.toml` with `pip install -e .`
- Don't use raw `fetch()` — use `api/client.ts` (configured base URL + error handling)
- Don't call `useStore()` in async callbacks — use `useStore.getState()` instead
- Don't skip `to_url_path()` when returning file paths from backend services
- Don't add `Co-Authored-By` tags to commit messages
- Don't stage or commit dot-folders (`.claude/`, `.gemini/`, `.playwright-mcp/`, etc.) — they are local agent state
