import logging
import re
from pathlib import Path

from app.storage.local import LocalStorage
from app.utils.ffmpeg import check_ffmpeg, concat_videos, normalize_audio

logger = logging.getLogger(__name__)


class StitchService:
    def __init__(self, storage: LocalStorage):
        self.storage = storage

    async def stitch_videos(self, run_id: str) -> str:
        """Stitch all selected scene videos into a final commercial.

        1. Check ffmpeg availability
        2. Collect selected_video.mp4 files sorted by scene number
        3. Concatenate with crossfade transitions
        4. Normalize audio
        5. Save to output/{run_id}/final/commercial.mp4
        """
        if not check_ffmpeg():
            raise RuntimeError("ffmpeg is not installed or not found on PATH")

        # Collect all selected videos, sorted by scene number
        run_dir = self.storage.ensure_run_dir(run_id)
        scenes_dir = run_dir / "scenes"

        if not scenes_dir.exists():
            raise FileNotFoundError(f"No scenes directory found for run {run_id}")

        scene_dirs = sorted(
            [d for d in scenes_dir.iterdir() if d.is_dir() and d.name.startswith("scene_")],
            key=lambda d: int(re.search(r"scene_(\d+)", d.name).group(1)),
        )

        video_paths: list[str] = []
        for scene_dir in scene_dirs:
            video_file = scene_dir / "selected_video.mp4"
            if video_file.exists():
                video_paths.append(str(video_file))
            else:
                logger.warning("Missing selected_video.mp4 in %s", scene_dir)

        if not video_paths:
            raise FileNotFoundError(f"No selected videos found for run {run_id}")

        # Create final output directory
        final_dir = run_dir / "final"
        final_dir.mkdir(parents=True, exist_ok=True)

        raw_output = str(final_dir / "commercial_raw.mp4")
        final_output = str(final_dir / "commercial.mp4")

        # Concatenate videos
        await concat_videos(video_paths, raw_output)

        # Normalize audio
        await normalize_audio(raw_output, final_output)

        # Clean up raw file
        raw_path = Path(raw_output)
        if raw_path.exists():
            raw_path.unlink()

        logger.info("Stitched %d scenes into %s", len(video_paths), final_output)
        return self.storage.to_url_path(final_output)
