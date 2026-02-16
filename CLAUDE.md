# Genflow Ad Studio

AI-powered 30-second video commercial generator. Product image in, finished ad out.
Stack: FastAPI + React 19 + MUI v7 | Gemini 3 Pro/Flash/Image + Imagen 4 + Veo 3.1 | FFmpeg

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
- SSE progressive loading: interactive mode uses SSE side-channel (`openSceneProgressSSE` in `usePipeline.ts`) alongside POST for incremental scene rendering
- SSE named events require `addEventListener('scene_progress', handler)` — `onmessage` only fires for unnamed events
- `image_url` accepts local `/output/...` paths — services detect prefix and read from disk
- Video duration = user-selectable 4/6/8s (8s auto-enforced when reference images or resolution ≥ 1080p)
- `generate_audio` toggle: configurable via VideoPlayer Switch (default True), flows through entire backend chain
- File uploads: use `api.upload()` with FormData — `api.post()` is for JSON only
- `detailed_avatar_description` must be identical across all scenes for Veo consistency
- Same Veo `seed` across all scenes for character/voice consistency
- Veo API: `image` (first-frame) and `reference_images` (asset refs) are **mutually exclusive** — `use_reference_images` flag controls which mode
- Scene-to-scene continuity: last frame extracted from each scene's selected video and passed as asset reference to the next scene
- Veo `reference_images` only supported on Preview models — GA models fall back to `image` (storyboard first-frame)
- Imagen 4 does NOT support `negative_prompt` — use positive prompting only
- Dialogue: colon notation without quotes (prevents Veo text rendering)
- Transition types in script map to FFmpeg xfade effects via `TRANSITION_MAP` in `ffmpeg.py`
- Every prompt template field must be wired end-to-end: model field → service → template `.format()` — no phantom fields
- Avatar demographic overrides (`override_gender`, `override_ethnicity`, `override_age_range`) replace `visual_description` with generic text to avoid conflicting prompt instructions
- Append `?t={timestamp}` cache-buster to image paths on regeneration so browsers show fresh images
- `ModelBadge` component (`components/common/ModelBadge.tsx`): "Nano Banana Pro" shimmer badge shown on Avatar + Storyboard screens

## Navigation Pattern (Optimistic)

- **Input → Script**: `startPipeline` sets `activeStep=1` immediately, then calls API. ScriptEditor handles `script: null` with skeleton loading. On error, navigates back to step 0.
- **Script → Avatar**: `navigateToAvatarStep` sets `activeStep=2` without generating. AvatarGallery shows controls first (model, variants, prompt), user clicks "Generate Avatars" explicitly.
- **Avatar → Storyboard**: `confirmAvatarSelection` selects avatar, navigates to step 3. User clicks Generate.
- **Progressive loading**: Storyboard + Video steps stream results via SSE side-channel; components show completed scenes + skeleton placeholders (`totalScenes` prop).
- Never pass `onClick={asyncFn}` directly — wrap as `onClick={() => asyncFn()}` to prevent MouseEvent leaking as function arguments.
- All hooks must be declared before any early return in a component (React hooks ordering rule).
- Stepper spinner shows on `activeStep` (not `maxStep`) — see `MainLayout.tsx`.

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

- **AppBar**: Centered logo + `ThemeToggle` (light/dark) top-right (`AppBar.tsx`)
- **Floating nav sidebar**: Fixed vertical icon buttons on the left edge with tooltips (`MainLayout.tsx`)
- **Stepper**: Horizontal pipeline progress below the header (`MainLayout.tsx`)
- **InsightPanel**: Slide-out panel on right edge showing pipeline step progress (`InsightPanel.tsx`)
- **Main content**: Centered max-width 1400px area
- Nav items defined in `MainLayout.tsx` `NAV_ITEMS` array — add icons from `@mui/icons-material`
- Dark/light theme: MUI v7 `colorSchemes` + `cssVariables` in `theme.ts` — see frontend rules for details

## Structure

```
backend/
  main.py                     # FastAPI app + route registration
  app/
    dependencies.py           # DI container (@lru_cache singletons)
    ai/    {gemini, gemini_image, imagen, veo, retry, prompts}.py
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
