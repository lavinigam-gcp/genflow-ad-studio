import logging

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/config", tags=["config"])

TRANSITION_TYPES = ["cut", "dissolve", "fade", "wipe", "zoom", "match_cut", "whip_pan"]
AD_TONES = ["energetic", "sophisticated", "playful", "authoritative", "warm"]


@router.post("/script")
async def get_script_config() -> dict:
    """Return script generation configuration defaults and ranges."""
    return {
        "scene_count": {
            "default": 3,
            "min": 2,
            "max": 6,
        },
        "target_duration": {
            "default": 30,
            "min": 15,
            "max": 60,
        },
        "ad_tones": AD_TONES,
        "transition_types": TRANSITION_TYPES,
    }
