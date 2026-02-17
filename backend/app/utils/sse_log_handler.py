"""Custom logging handler that streams Python log records to the frontend via SSE.

Uses a ContextVar to track the current pipeline run_id.  When a run_id is set
(by a pipeline API route), every log record from any ``app.*`` logger is
forwarded as an ``SSEEventType.LOG`` event to the broadcaster.  The frontend
already handles the ``'log'`` event type in its SSE listener.

Usage in pipeline routes::

    from app.utils.sse_log_handler import pipeline_run_id

    @router.post("/script")
    async def generate_script(request: ScriptRequest, ...):
        token = pipeline_run_id.set(request.run_id)
        try:
            ...
        finally:
            pipeline_run_id.reset(token)
"""

import logging
from contextvars import ContextVar
from datetime import datetime

from app.models.sse import SSEEventType

# Holds the run_id of the currently executing pipeline request.
# Each asyncio task (= each HTTP request) gets its own value.
pipeline_run_id: ContextVar[str | None] = ContextVar("pipeline_run_id", default=None)


class SSELogHandler(logging.Handler):
    """Forwards log records to SSE subscribers for the active pipeline run."""

    def __init__(self, broadcaster):
        super().__init__(level=logging.DEBUG)
        self.broadcaster = broadcaster

    def emit(self, record: logging.LogRecord) -> None:
        run_id = pipeline_run_id.get()
        if not run_id:
            return  # Not inside a pipeline request — skip

        level_map = {
            "DEBUG": "dim",
            "INFO": "info",
            "WARNING": "warn",
            "ERROR": "error",
            "CRITICAL": "error",
        }

        self.broadcaster.emit(
            run_id,
            SSEEventType.LOG,
            {
                "message": self.format(record),
                "level": level_map.get(record.levelname, "info"),
                "logger_name": record.name,
                "timestamp": datetime.now().isoformat(),
            },
        )
