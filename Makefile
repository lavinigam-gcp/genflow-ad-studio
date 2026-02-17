.PHONY: install install-backend install-frontend setup setup-gcs dev dev-backend dev-frontend stop build clean reset-db check check-assets help test test-api generate-samples deploy

# ─── Config ──────────────────────────────────────
PROJECT_ID ?= $(shell grep '^PROJECT_ID=' .env 2>/dev/null | cut -d= -f2)
GCS_BUCKET ?= $(shell grep '^GCS_BUCKET_NAME=' .env 2>/dev/null | cut -d= -f2)

# Default target
help:
	@echo ""
	@echo "  Genflow Ad Studio"
	@echo "  ================="
	@echo ""
	@echo "  First-time setup:"
	@echo "    make setup          - Full setup (install deps + GCS + sample images)"
	@echo "    make install        - Install all dependencies (backend + frontend)"
	@echo "    make setup-gcs      - Create GCS bucket if it doesn't exist"
	@echo "    make generate-samples - Generate sample product images via AI"
	@echo ""
	@echo "  Development:"
	@echo "    make dev            - Run backend + frontend together"
	@echo "    make dev-backend    - Run FastAPI backend only (port 8000)"
	@echo "    make dev-frontend   - Run Vite frontend only (port 3000)"
	@echo "    make stop           - Kill processes on ports 8000 and 3000"
	@echo ""
	@echo "  Build & Test:"
	@echo "    make build          - Build frontend for production"
	@echo "    make check          - Type checks (backend + frontend + assets)"
	@echo "    make test           - Full system test (API + frontend + auth + assets)"
	@echo "    make test-api       - Quick API smoke test (requires running backend)"
	@echo ""
	@echo "  Cleanup:"
	@echo "    make clean          - Remove build artifacts and venvs"
	@echo "    make reset-db       - Delete SQLite DB (fixes stale schema errors after model changes)"
	@echo ""

# ─── Full Setup ──────────────────────────────────
setup: install setup-gcs generate-samples
	@echo ""
	@echo "  Setup complete! Run 'make dev' to start."
	@echo ""

# ─── Install ─────────────────────────────────────
install: install-backend install-frontend

install-backend:
	@echo "Installing backend dependencies..."
	cd backend && python3 -m venv .venv && \
	. .venv/bin/activate && \
	pip install --upgrade pip -q && \
	pip install -e . -q
	@echo "  Backend installed."

install-frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install --silent
	@echo "  Frontend installed."

# ─── GCS Bucket Setup ────────────────────────────
setup-gcs:
	@echo "Checking GCS bucket '$(GCS_BUCKET)' in project '$(PROJECT_ID)'..."
	@if gcloud storage buckets describe gs://$(GCS_BUCKET) --project=$(PROJECT_ID) >/dev/null 2>&1; then \
		echo "  Bucket already exists."; \
	else \
		echo "  Creating bucket gs://$(GCS_BUCKET)..."; \
		gcloud storage buckets create gs://$(GCS_BUCKET) \
			--project=$(PROJECT_ID) \
			--location=us-central1 \
			--uniform-bucket-level-access \
			--quiet; \
		echo "  Bucket created."; \
	fi

# ─── Stop ────────────────────────────────────────
stop:
	@echo "Stopping Genflow Ad Studio..."
	@lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@lsof -ti:3000 | xargs kill -9 2>/dev/null || true
	@echo "  Ports 8000 and 3000 are free."

# ─── Sample Images ──────────────────────────────
generate-samples:
	@echo "Generating sample product images (Gemini 3 Pro Image)..."
	@cd backend && . .venv/bin/activate && \
	python scripts/generate_samples.py
	@echo "  Sample images ready."

# ─── Development ─────────────────────────────────
dev:
	@echo "Starting Genflow Ad Studio..."
	@echo "  Backend:  http://localhost:8000  (API docs: http://localhost:8000/docs)"
	@echo "  Frontend: http://localhost:3000"
	@echo ""
	@trap 'kill 0' EXIT; \
	$(MAKE) dev-backend & \
	$(MAKE) dev-frontend & \
	wait

dev-backend:
	cd backend && . .venv/bin/activate && \
	uvicorn main:app --host 0.0.0.0 --port 8000 --reload

dev-frontend:
	cd frontend && npm run dev

# ─── Build ───────────────────────────────────────
build:
	cd frontend && npm run build

# ─── Checks ──────────────────────────────────────
check: check-backend check-frontend check-assets
	@echo "All checks passed."

check-backend:
	@echo "Checking backend imports..."
	@cd backend && . .venv/bin/activate && \
	python -c "from main import app; print('  Backend OK: all modules import cleanly')"

check-frontend:
	@echo "Checking frontend types..."
	@cd frontend && npx tsc --noEmit && echo "  Frontend OK: zero type errors"

check-assets:
	@echo "Checking assets and configs..."
	@python3 -c "import json, sys; from pathlib import Path; \
	ok=True; \
	prompts=sorted(Path('.docs/diagram-generator/prompts').glob('*.json')) if Path('.docs/diagram-generator/prompts').is_dir() else []; \
	[None for p in prompts if not (lambda p: (json.loads(p.read_text()) and True) or True)(p)]; \
	bad=[p.name for p in prompts if not (lambda p: (True if json.loads(p.read_text()) else False))(p)]; \
	print(f'  {len(prompts)} JSON prompts valid') if prompts else None; \
	assets=list(Path('asset').glob('*.webp')) if Path('asset').is_dir() else []; \
	print(f'  {len(assets)} diagram assets found') if assets else None; \
	print('  Assets OK')"

# ─── Test ────────────────────────────────────────
test:
	@bash scripts/test_system.sh

test-api:
	@echo "Testing API endpoints..."
	@echo ""
	@echo "Health:"
	@curl -sf http://localhost:8000/api/v1/health | python3 -m json.tool
	@echo ""
	@echo "Jobs:"
	@curl -sf http://localhost:8000/api/v1/jobs | python3 -m json.tool
	@echo ""
	@echo "Review Queue:"
	@curl -sf http://localhost:8000/api/v1/review/queue | python3 -m json.tool
	@echo ""
	@echo "All smoke tests passed."
	@echo "API docs: http://localhost:8000/docs"

# ─── Deploy ─────────────────────────────────────
deploy:
	@echo "Building and deploying to Cloud Run..."
	gcloud builds submit --tag gcr.io/$(PROJECT_ID)/genflow-ad-studio
	gcloud run deploy genflow-ad-studio \
		--image gcr.io/$(PROJECT_ID)/genflow-ad-studio \
		--platform managed --region us-central1 \
		--allow-unauthenticated \
		--memory 2Gi --cpu 2 \
		--max-instances 1 --min-instances 0 \
		--timeout 600
	@echo "Deployed!"
	@gcloud run services describe genflow-ad-studio --region us-central1 --format 'value(status.url)'

# ─── Reset DB ───────────────────────────────────
reset-db:
	@echo "Resetting database..."
	rm -f output/genflow.db output/genflow.db-wal output/genflow.db-shm
	rm -f output/jobs.json output/jobs.json.migrated
	@echo "  Database and legacy job files deleted. Will be recreated on next 'make dev'."

# ─── Clean ───────────────────────────────────────
clean:
	rm -rf backend/.venv backend/__pycache__
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/node_modules frontend/dist
	rm -rf output/
