"""Generate per-scene file manifests for MuJoCo demo assets."""

from pathlib import Path
from typing import List
import json


_HERE = Path(__file__).parent

_ALLOWED_EXTENSIONS = {".xml", ".png", ".stl", ".obj", ".mjb"}


def iter_scene_directories(root: Path):
    for path in sorted(root.iterdir()):
        if path.is_dir():
            yield path


def build_manifest(scene_dir: Path):
    files = []
    for path in scene_dir.rglob("*"):
        if path.is_file() and path.suffix in _ALLOWED_EXTENSIONS:
            files.append(str(path.relative_to(scene_dir)))
    files.sort()
    return files


def write_manifest(scene_dir: Path, files: List[str]):
    manifest_path = scene_dir / "files.json"
    with manifest_path.open("w", encoding="utf-8") as fp:
        json.dump(files, fp, indent=2)


if __name__ == "__main__":
    for scene_dir in iter_scene_directories(_HERE):
        manifest = build_manifest(scene_dir)
        write_manifest(scene_dir, manifest)

    root_manifest = _HERE / "files.json"
    if root_manifest.exists():
        root_manifest.unlink()
