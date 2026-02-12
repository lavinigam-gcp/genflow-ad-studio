import asyncio
import logging

logger = logging.getLogger(__name__)


class TaskRunner:
    def __init__(self):
        self._tasks: dict[str, asyncio.Task] = {}

    def start_pipeline(self, job_id: str, pipeline_svc, request) -> asyncio.Task:
        """Create an asyncio task for pipeline execution.

        The pipeline_svc.run_full_pipeline coroutine runs in the background.
        """
        task = asyncio.create_task(
            pipeline_svc.run_full_pipeline(job_id, request),
            name=f"pipeline-{job_id}",
        )
        self._tasks[job_id] = task

        def _on_done(t: asyncio.Task):
            if t.exception():
                logger.error("Pipeline task %s failed: %s", job_id, t.exception())
            self._tasks.pop(job_id, None)

        task.add_done_callback(_on_done)
        logger.info("Started pipeline task for job %s", job_id)
        return task

    def cancel(self, job_id: str) -> bool:
        """Cancel a running pipeline task. Returns True if cancelled."""
        task = self._tasks.get(job_id)
        if task is None:
            return False
        task.cancel()
        logger.info("Cancelled pipeline task for job %s", job_id)
        return True

    def is_running(self, job_id: str) -> bool:
        """Check if a pipeline task is currently running."""
        task = self._tasks.get(job_id)
        return task is not None and not task.done()
