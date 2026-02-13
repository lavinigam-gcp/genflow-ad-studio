---
globs: frontend/**
---

# Frontend Rules

## Components

- MUI v7 with Material Design 3 light theme
- Functional components only — no class components
- Use `sx` prop for styling, not `styled()` or CSS modules
- Always include loading + error states (isLoading, error, isSubmitting)
- Color refs: primary `#1A73E8`, surface `#F8F9FA`, border `#DADCE0`

## Zustand Stores

```typescript
// In async callbacks, use getState():
const handleClick = async () => {
  const { jobId } = usePipelineStore.getState();
  await startPipeline(jobId);
};

// In render, use selector hooks:
const jobId = usePipelineStore((s) => s.jobId);

// Reset pattern:
resetPipeline: () => set({ step: 0, jobId: null, script: null, ... })
```

## API Calls

- Always use `api/client.ts` — configured with base URL `/api/v1`
- Request bodies use `snake_case` to match Python models
- Never use raw `fetch()` — the client handles errors and base URL
- API functions live in `api/pipeline.ts`, not in components
- For file uploads use `api.upload<T>(path, formData)` — never set Content-Type manually on FormData

## Types (types/index.ts)

- Must mirror backend Pydantic models field-for-field
- Use `snake_case` property names (matching Python)
- Use string enums: `enum JobStatus { PENDING = 'pending', ... }`
- When backend models change, update TS types immediately

## SSE (Server-Sent Events)

```typescript
// useSSE hook pattern:
const { isConnected, lastEvent } = useSSE(jobId);

// Adding a new event type:
// 1. Add to SSEEventType enum in types/index.ts
// 2. Add case in useSSE handler switch
// 3. Update store with the event data
```

## Layout

- `AppBar.tsx` renders only the centered logo — no navigation
- `MainLayout.tsx` owns the floating left sidebar nav (fixed position, icon buttons + tooltips)
- Nav items: add to `NAV_ITEMS` array in `MainLayout.tsx` with a label, path, and `@mui/icons-material` icon
- MUI v7: use `Grid` (not `Grid2` — it was promoted in v7)

## Assets

- Output files served at `/output/{run_id}/...` paths
- Vite proxy forwards `/api` and `/output` to backend (port 8000)
- Images/videos use the URL paths returned by the API (to_url_path output)
- Static assets (logo, favicons) live in `frontend/public/`
- Favicons: 16x16, 32x32, apple-touch-icon 180x180, android-chrome 192x192 + 512x512
- Web manifest: `frontend/public/site.webmanifest` — update when adding new icon sizes
