---
globs: backend/**
---

# Backend Rules

## Service Pattern

Constructor injection, async methods, semaphore for concurrency, `to_url_path()` on all returned paths. See any existing service for reference.

## Adding a New Service

1. Create Pydantic model in `app/models/` (snake_case fields, string enums)
2. Create service class in `app/services/`
3. Register in `app/dependencies.py` — add `get_foo_service()` with `@lru_cache`
4. Create route in `app/api/` — POST endpoint, request body, no path params
5. Register router in `main.py` with `/api/v1/` prefix

## AI Module Pattern

```python
from app.ai.retry import async_retry

@async_retry(retries=3, initial_delay=2.0, backoff_factor=2.0)
async def generate_foo(self, prompt: str, image_bytes: bytes) -> Result:
    response = await self.client.aio.models.generate_content(
        model=self.model_id,
        contents=[Part.from_bytes(image_bytes, "image/png"), prompt],
        config=GenerateContentConfig(
            response_mime_type="application/json",
            safety_settings=ALL_SAFETY_OFF,
        ),
    )
    return parse_json_response(response.text)
```

- Use `client.aio.models` (async) — never `client.models` for Gemini calls
- Use `Part.from_bytes()` for local images, `Part.from_uri()` for GCS URIs
- Pro model for generation, Flash model for QC evaluation
- Always parse with `parse_json_response()` from `app/utils/json_parser.py`

## QC Feedback Loop

```python
best_result, best_score = None, -1
for attempt in range(max_attempts):
    result = await generate(prompt)
    qc_report = await qc.evaluate(result)
    if qc.passes(qc_report):
        return result  # Good enough
    if qc_report.score > best_score:
        best_result, best_score = result, qc_report.score
    prompt = await qc.rewrite_prompt(prompt, qc_report)
return best_result  # Return best attempt even if none passed
```

## FFmpeg

- `_preprocess_video()` converts VFR → 24fps CFR (`-vf fps=24,format=yuv420p`)
- `concat_videos()`: xfade for 1-3 clips, concat demuxer for 4+
- `normalize_audio()`: loudnorm filter (`I=-14:TP=-1:LRA=11`)
- Always use `asyncio.create_subprocess_exec` — never blocking subprocess

## Storage

- `LocalStorage.save_bytes(data, run_id, filename)` → absolute path
- Convert to URL: `storage.to_url_path(abs_path)` → `/output/{run_id}/...`
- GCS only for Veo (it requires `gs://` URIs for input/output)
- `GCSStorage.upload_bytes()` → `gs://bucket/pipeline/{run_id}/...`
- Pseudo run_ids `"uploads"` and `"generated"` store non-pipeline files (e.g. user uploads, AI-generated product images)
- Sample product images + metadata live in `output/samples/` — managed by `scripts/generate_samples.py`
