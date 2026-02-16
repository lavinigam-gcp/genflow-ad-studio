import asyncio
import json
import logging
import shutil
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)


def check_ffmpeg() -> bool:
    """Check if ffmpeg is available on the system PATH."""
    return shutil.which("ffmpeg") is not None


def _get_duration(video_path: str) -> float:
    """Get video duration in seconds using ffprobe synchronously."""
    result = subprocess.run(
        [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            video_path,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        return 8.0
    try:
        info = json.loads(result.stdout)
        return float(info["format"]["duration"])
    except (json.JSONDecodeError, KeyError, ValueError):
        return 8.0


async def extract_last_frame(video_path: str, output_path: str) -> str:
    """Extract the last frame from a video as a PNG image.

    Uses ffmpeg to seek near the end, then grab the final frame.
    Returns the output path on success.
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    # sseof seeks relative to end — grab last 0.1s then take 1 frame
    cmd = [
        "ffmpeg", "-y",
        "-sseof", "-0.1",
        "-i", video_path,
        "-frames:v", "1",
        "-update", "1",
        output_path,
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg extract_last_frame failed: {stderr.decode()[-500:]}")
    logger.info("Extracted last frame from %s → %s", video_path, output_path)
    return output_path


async def _preprocess_video(input_path: str, output_path: str) -> str:
    """Re-encode a single video to ensure CFR and consistent format.

    Veo 3.1 outputs can have VFR timestamps that break xfade.
    This normalizes each clip to 24fps CFR with consistent codec settings.
    """
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", "fps=24,format=yuv420p",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart",
        output_path,
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg preprocess failed: {stderr.decode()[-500:]}")
    return output_path


async def concat_videos(
    video_paths: list[str], output_path: str, crossfade_duration: float = 0.5
) -> str:
    """Concatenate multiple videos with crossfade transitions.

    Strategy:
    1. Pre-process each video to CFR 24fps (Veo outputs can be VFR)
    2. If 6+ videos, use simple concat demuxer (xfade gets unstable with many inputs)
    3. Otherwise use xfade filter for smooth transitions
    """
    if not video_paths:
        raise ValueError("No video paths provided")

    if len(video_paths) == 1:
        shutil.copy2(video_paths[0], output_path)
        return output_path

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Pre-process all videos to CFR
    with tempfile.TemporaryDirectory() as tmpdir:
        cfr_paths: list[str] = []
        preprocess_tasks = []
        for i, path in enumerate(video_paths):
            cfr_path = str(Path(tmpdir) / f"cfr_{i}.mp4")
            cfr_paths.append(cfr_path)
            preprocess_tasks.append(_preprocess_video(path, cfr_path))

        await asyncio.gather(*preprocess_tasks)
        logger.info("Pre-processed %d videos to CFR", len(cfr_paths))

        if len(video_paths) <= 3:
            # Use xfade for small number of videos
            await _concat_with_xfade(cfr_paths, output_path, crossfade_duration)
        else:
            # Use concat demuxer for 4+ videos (more stable)
            await _concat_with_demuxer(cfr_paths, output_path, tmpdir)

    return output_path


async def _concat_with_xfade(
    video_paths: list[str], output_path: str, crossfade_duration: float
) -> None:
    """Concatenate videos using xfade filter (best for 2-3 videos)."""
    n = len(video_paths)
    filter_parts: list[str] = []
    inputs: list[str] = []

    for i, path in enumerate(video_paths):
        inputs.extend(["-i", path])
        filter_parts.append(f"[{i}:v]setpts=PTS-STARTPTS[v{i}];")
        filter_parts.append(f"[{i}:a]aresample=async=1[a{i}];")

    current_v = "v0"
    current_a = "a0"
    for i in range(1, n):
        out_v = f"outv{i}"
        out_a = f"outa{i}"
        offset = sum(
            _get_duration(video_paths[j]) - crossfade_duration for j in range(i)
        )
        filter_parts.append(
            f"[{current_v}][v{i}]xfade=transition=fade:"
            f"duration={crossfade_duration}:offset={offset:.2f}[{out_v}];"
        )
        filter_parts.append(
            f"[{current_a}][a{i}]acrossfade=d={crossfade_duration}[{out_a}];"
        )
        current_v = out_v
        current_a = out_a

    filter_complex = "".join(filter_parts).rstrip(";")

    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", f"[{current_v}]",
        "-map", f"[{current_a}]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        output_path,
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg xfade concat failed: {stderr.decode()[-500:]}")


async def _concat_with_demuxer(
    video_paths: list[str], output_path: str, tmpdir: str
) -> None:
    """Concatenate videos using the concat demuxer (robust for many videos)."""
    # Write concat file
    concat_file = str(Path(tmpdir) / "concat.txt")
    with open(concat_file, "w") as f:
        for path in video_paths:
            f.write(f"file '{path}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_file,
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        output_path,
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg concat demuxer failed: {stderr.decode()[-500:]}")


# Mapping from script transition types to FFmpeg xfade transition names
TRANSITION_MAP: dict[str, str] = {
    "cut": "",           # No xfade — hard splice
    "dissolve": "fade",
    "fade": "fade",
    "wipe": "wipeleft",
    "zoom": "zoomin",
    "match_cut": "fade",
    "whip_pan": "slideleft",
}


async def concat_videos_with_transitions(
    video_paths: list[str],
    output_path: str,
    transitions: list[dict],
) -> str:
    """Concatenate videos using per-scene transition types and durations.

    Each entry in *transitions* has:
      - transition_type: str (mapped via TRANSITION_MAP)
      - transition_duration: float (seconds)

    transitions[i] is the transition BETWEEN video_paths[i] and video_paths[i+1],
    so len(transitions) should be len(video_paths) - 1.

    Falls back to concat_videos() if anything goes wrong with xfade.
    """
    if not video_paths:
        raise ValueError("No video paths provided")

    if len(video_paths) == 1:
        shutil.copy2(video_paths[0], output_path)
        return output_path

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    # Ensure we have the right number of transitions
    expected = len(video_paths) - 1
    if len(transitions) < expected:
        # Pad with default fade transitions
        for _ in range(expected - len(transitions)):
            transitions.append({"transition_type": "fade", "transition_duration": 0.5})

    # Pre-process all videos to CFR
    with tempfile.TemporaryDirectory() as tmpdir:
        cfr_paths: list[str] = []
        preprocess_tasks = []
        for i, path in enumerate(video_paths):
            cfr_path = str(Path(tmpdir) / f"cfr_{i}.mp4")
            cfr_paths.append(cfr_path)
            preprocess_tasks.append(_preprocess_video(path, cfr_path))
        await asyncio.gather(*preprocess_tasks)

        # Check if any transitions are "cut" (no effect) — those get 0 duration
        # If all are cuts, use simple demuxer
        all_cuts = all(
            TRANSITION_MAP.get(t.get("transition_type", "cut"), "") == ""
            for t in transitions[:expected]
        )

        if all_cuts or len(video_paths) > 5:
            # Use concat demuxer — simpler and more stable
            await _concat_with_demuxer(cfr_paths, output_path, tmpdir)
        else:
            try:
                await _concat_with_per_scene_xfade(
                    cfr_paths, output_path, transitions[:expected]
                )
            except RuntimeError:
                logger.warning("Per-scene xfade failed, falling back to demuxer")
                await _concat_with_demuxer(cfr_paths, output_path, tmpdir)

    return output_path


async def _concat_with_per_scene_xfade(
    video_paths: list[str],
    output_path: str,
    transitions: list[dict],
) -> None:
    """Concatenate videos using xfade with per-boundary transition config."""
    n = len(video_paths)
    filter_parts: list[str] = []
    inputs: list[str] = []

    for i, path in enumerate(video_paths):
        inputs.extend(["-i", path])
        filter_parts.append(f"[{i}:v]setpts=PTS-STARTPTS[v{i}];")
        filter_parts.append(f"[{i}:a]aresample=async=1[a{i}];")

    current_v = "v0"
    current_a = "a0"
    for i in range(1, n):
        out_v = f"outv{i}"
        out_a = f"outa{i}"
        trans = transitions[i - 1]
        trans_type = trans.get("transition_type", "fade")
        trans_duration = float(trans.get("transition_duration", 0.5))
        xfade_name = TRANSITION_MAP.get(trans_type, "fade") or "fade"

        # For "cut" transitions, use minimal duration
        if trans_type == "cut":
            trans_duration = 0.01

        offset = sum(
            _get_duration(video_paths[j]) - float(transitions[j].get("transition_duration", 0.5))
            if j < len(transitions) and transitions[j].get("transition_type") != "cut"
            else _get_duration(video_paths[j])
            for j in range(i)
        )

        filter_parts.append(
            f"[{current_v}][v{i}]xfade=transition={xfade_name}:"
            f"duration={trans_duration}:offset={offset:.2f}[{out_v}];"
        )
        filter_parts.append(
            f"[{current_a}][a{i}]acrossfade=d={trans_duration}[{out_a}];"
        )
        current_v = out_v
        current_a = out_a

    filter_complex = "".join(filter_parts).rstrip(";")

    cmd = [
        "ffmpeg", "-y",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", f"[{current_v}]",
        "-map", f"[{current_a}]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        output_path,
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg per-scene xfade failed: {stderr.decode()[-500:]}")


async def normalize_audio(input_path: str, output_path: str) -> str:
    """Normalize audio levels using ffmpeg loudnorm filter."""
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-af", "loudnorm=I=-14:TP=-1:LRA=11",
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        output_path,
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg normalize failed: {stderr.decode()[-500:]}")

    return output_path
