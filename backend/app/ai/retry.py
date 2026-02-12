import asyncio
import logging
import random
from functools import wraps

from google.genai import errors as genai_errors

logger = logging.getLogger(__name__)


def async_retry(
    retries: int = 3,
    initial_delay: float = 2.0,
    backoff_factor: float = 2.0,
    retryable_codes: tuple[int, ...] = (429, 500, 503),
):
    """Async retry decorator with exponential backoff and jitter.

    Specifically handles google.genai.errors.APIError by checking
    the HTTP status code against the retryable_codes tuple.
    All other exceptions are re-raised immediately.
    """

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(retries + 1):
                try:
                    return await func(*args, **kwargs)
                except genai_errors.APIError as exc:
                    last_exception = exc
                    code = getattr(exc, "code", None) or getattr(
                        exc, "status_code", None
                    )
                    if code not in retryable_codes or attempt == retries:
                        raise
                    delay = initial_delay * (backoff_factor**attempt)
                    jitter = random.uniform(0, delay * 0.5)
                    wait = delay + jitter
                    logger.warning(
                        "Retry %d/%d for %s after API error %s "
                        "(waiting %.1fs): %s",
                        attempt + 1,
                        retries,
                        func.__name__,
                        code,
                        wait,
                        str(exc),
                    )
                    await asyncio.sleep(wait)
            raise last_exception  # type: ignore[misc]

        return wrapper

    return decorator
