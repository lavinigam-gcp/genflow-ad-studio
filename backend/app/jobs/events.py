import asyncio
import json
import logging
from datetime import datetime

from app.models.sse import SSEEvent, SSEEventType

logger = logging.getLogger(__name__)


class SSEBroadcaster:
    def __init__(self):
        self._subscribers: dict[str, list[asyncio.Queue]] = {}

    def subscribe(self, job_id: str) -> asyncio.Queue:
        """Create a new subscriber queue for a job."""
        queue: asyncio.Queue = asyncio.Queue()
        if job_id not in self._subscribers:
            self._subscribers[job_id] = []
        self._subscribers[job_id].append(queue)
        logger.debug("New SSE subscriber for job %s (total: %d)", job_id, len(self._subscribers[job_id]))
        return queue

    def unsubscribe(self, job_id: str, queue: asyncio.Queue):
        """Remove a subscriber queue."""
        if job_id in self._subscribers:
            try:
                self._subscribers[job_id].remove(queue)
            except ValueError:
                pass
            if not self._subscribers[job_id]:
                del self._subscribers[job_id]

    async def publish(self, event: SSEEvent):
        """Send an event to all subscribers for this job."""
        job_id = event.job_id
        subscribers = self._subscribers.get(job_id, [])
        for queue in subscribers:
            await queue.put(event)

    def emit(self, job_id: str, event_type: SSEEventType, data: dict | None = None):
        """Convenience method to create and schedule an SSEEvent for publishing.

        Creates an asyncio task to publish the event so callers don't need to await.
        """
        event = SSEEvent(
            event=event_type,
            job_id=job_id,
            data=data or {},
            timestamp=datetime.now(),
        )
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.publish(event))
        except RuntimeError:
            logger.warning("No running event loop, cannot emit SSE event for job %s", job_id)

    async def event_generator(self, job_id: str):
        """Async generator that yields SSE-formatted strings for StreamingResponse.

        Yields events in the Server-Sent Events format:
          event: <event_type>
          data: <json_data>

        Terminates when a JOB_COMPLETED or JOB_FAILED event is received.
        Sends SSE comments as keepalive every 15s to prevent proxy timeouts.
        """
        queue = self.subscribe(job_id)
        try:
            while True:
                try:
                    event: SSEEvent = await asyncio.wait_for(queue.get(), timeout=15.0)
                except asyncio.TimeoutError:
                    # Send SSE comment as keepalive
                    yield ": keepalive\n\n"
                    continue

                event_data = {
                    "job_id": event.job_id,
                    "timestamp": event.timestamp.isoformat(),
                    **event.data,
                }
                line = f"event: {event.event.value}\ndata: {json.dumps(event_data)}\n\n"
                yield line

                # Terminate stream on terminal events
                if event.event in (SSEEventType.JOB_COMPLETED, SSEEventType.JOB_FAILED):
                    break
        finally:
            self.unsubscribe(job_id, queue)
