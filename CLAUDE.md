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

## Structure

```
backend/
  main.py                     # FastAPI app + route registration
  app/
    dependencies.py           # DI container (@lru_cache singletons)
    ai/    {gemini, gemini_image, veo, retry, prompts}.py
    models/ {job, script, avatar, storyboard, video, review, sse, common}.py
    services/ {pipeline, script, avatar, storyboard, video, stitch, qc, review, bulk}_service.py
    api/    {pipeline, jobs, bulk, review, assets, health}.py
    jobs/   {store, runner, events}.py
    utils/  {ffmpeg, csv_parser, json_parser}.py
frontend/src/
  api/     {client, pipeline}.ts
  types/   index.ts            # Must mirror backend models
  stores/  {pipeline, review}Store.ts
  components/ {pipeline/, review/, common/, layout/}
```

## Don'ts

- Don't use `requirements.txt` — project uses `pyproject.toml` with `pip install -e .`
- Don't use raw `fetch()` — use `api/client.ts` (configured base URL + error handling)
- Don't call `useStore()` in async callbacks — use `useStore.getState()` instead
- Don't skip `to_url_path()` when returning file paths from backend services
