import shutil
from pathlib import Path


class LocalStorage:
    def __init__(self, base_dir: str = "output"):
        self.base_dir = Path(base_dir).resolve()

    def ensure_run_dir(self, run_id: str) -> Path:
        run_dir = self.base_dir / run_id
        run_dir.mkdir(parents=True, exist_ok=True)
        return run_dir

    def save_bytes(
        self, run_id: str, filename: str, data: bytes, subdir: str = ""
    ) -> str:
        run_dir = self.ensure_run_dir(run_id)
        if subdir:
            target_dir = run_dir / subdir
            target_dir.mkdir(parents=True, exist_ok=True)
        else:
            target_dir = run_dir
        file_path = target_dir / filename
        file_path.write_bytes(data)
        return str(file_path)

    def save_file(
        self, run_id: str, filename: str, source_path: str, subdir: str = ""
    ) -> str:
        run_dir = self.ensure_run_dir(run_id)
        if subdir:
            target_dir = run_dir / subdir
            target_dir.mkdir(parents=True, exist_ok=True)
        else:
            target_dir = run_dir
        dest_path = target_dir / filename
        shutil.copy2(source_path, dest_path)
        return str(dest_path)

    def load_bytes(self, run_id: str, filename: str, subdir: str = "") -> bytes:
        file_path = self.get_path(run_id, filename, subdir)
        return file_path.read_bytes()

    def get_path(self, run_id: str, filename: str, subdir: str = "") -> Path:
        run_dir = self.base_dir / run_id
        if subdir:
            return run_dir / subdir / filename
        return run_dir / filename

    def get_url_path(self, run_id: str, filename: str, subdir: str = "") -> str:
        if subdir:
            return f"/output/{run_id}/{subdir}/{filename}"
        return f"/output/{run_id}/{filename}"

    def to_url_path(self, abs_path: str) -> str:
        """Convert an absolute file path to a URL-relative path for the frontend."""
        try:
            rel = Path(abs_path).relative_to(self.base_dir)
            return f"/output/{rel}"
        except ValueError:
            return abs_path

    def list_files(self, run_id: str, subdir: str = "") -> list[str]:
        run_dir = self.base_dir / run_id
        if subdir:
            target_dir = run_dir / subdir
        else:
            target_dir = run_dir
        if not target_dir.exists():
            return []
        return [f.name for f in target_dir.iterdir() if f.is_file()]
