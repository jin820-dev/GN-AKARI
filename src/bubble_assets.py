from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT_DIR = Path(__file__).resolve().parent.parent
OVERLAY_IMAGE_LIBRARY_DIR = ROOT_DIR / "data" / "assets" / "overlay_images"
OVERLAY_ASSETS_METADATA_PATH = ROOT_DIR / "data" / "assets" / "overlay_assets.json"


def load_registered_overlay_asset_records() -> list[dict]:
    if not OVERLAY_ASSETS_METADATA_PATH.exists():
        return []
    try:
        data = json.loads(OVERLAY_ASSETS_METADATA_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    if not isinstance(data, list):
        return []
    return [item for item in data if isinstance(item, dict)]


def save_registered_overlay_asset_records(records: list[dict]) -> None:
    OVERLAY_ASSETS_METADATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    OVERLAY_ASSETS_METADATA_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


def build_registered_overlay_assets() -> dict[str, dict]:
    assets = {}
    for record in load_registered_overlay_asset_records():
        asset_id = str(record.get("id") or "").strip()
        filename = Path(str(record.get("filename") or "")).name
        if not asset_id or not filename:
            continue
        file_path = OVERLAY_IMAGE_LIBRARY_DIR / filename
        if not file_path.exists() or not file_path.is_file():
            continue
        try:
            default_width = int(record.get("default_width") or 420)
            default_height = int(record.get("default_height") or 180)
        except (TypeError, ValueError):
            default_width = 420
            default_height = 180
        assets[asset_id] = {
            "id": asset_id,
            "label": str(record.get("label") or asset_id),
            "file_path": file_path,
            "file_url": f"/assets/overlay_images/{filename}",
            "filename": filename,
            "default_width": default_width,
            "default_height": default_height,
            "kind": record.get("kind") or "image",
            "created_at": record.get("created_at") or "",
        }
    return assets


def serialize_bubble_overlay_asset(asset: dict) -> dict:
    return {
        "id": asset["id"],
        "label": asset["label"],
        "file": asset["file_url"],
        "default_width": asset["default_width"],
        "default_height": asset["default_height"],
        "filename": asset.get("filename", ""),
        "kind": asset.get("kind", "image"),
    }


def list_registered_bubble_overlay_assets() -> dict[str, dict]:
    return {
        asset_id: serialize_bubble_overlay_asset(asset)
        for asset_id, asset in build_registered_overlay_assets().items()
    }


def get_bubble_overlay_asset(asset_id: str) -> dict:
    normalized = (asset_id or "").strip()
    assets = build_registered_overlay_assets()
    if normalized not in assets:
        raise ValueError("bubble overlay asset is invalid.")
    return assets[normalized]


def build_bubble_overlay_size(asset_id: str, width: int | None, height: int | None) -> tuple[int, int]:
    asset = get_bubble_overlay_asset(asset_id)
    resolved_width = int(width) if width and int(width) > 0 else asset["default_width"]
    resolved_height = int(height) if height and int(height) > 0 else asset["default_height"]
    return resolved_width, resolved_height


def rasterize_bubble_overlay_asset(asset_id: str, width: int, height: int) -> Image.Image:
    asset = get_bubble_overlay_asset(asset_id)
    return Image.open(asset["file_path"]).convert("RGBA").resize((width, height), Image.Resampling.LANCZOS)
