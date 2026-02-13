import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import assets, bulk, config_api, input, jobs, pipeline, review
from app.api.health import router as health_router
from app.dependencies import get_broadcaster, get_job_store, get_task_runner

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(env_path)
    output_dir = Path(__file__).resolve().parent / "output"
    output_dir.mkdir(exist_ok=True)

    # Initialize singletons on startup
    get_job_store()
    get_broadcaster()
    get_task_runner()

    yield


app = FastAPI(
    title="Genflow Ad Studio API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file mount — must match the path used by LocalStorage.
# LocalStorage resolves "output" relative to cwd (backend/), so we use that.
_backend_dir = Path(__file__).resolve().parent
output_path = _backend_dir / "output"
output_path.mkdir(exist_ok=True)
app.mount("/output", StaticFiles(directory=str(output_path)), name="output")

# Register routers
app.include_router(health_router)
app.include_router(pipeline.router)
app.include_router(jobs.router)
app.include_router(bulk.router)
app.include_router(review.router)
app.include_router(assets.router)
app.include_router(config_api.router)
app.include_router(input.router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
