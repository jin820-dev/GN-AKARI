from __future__ import annotations

import os
import json
import hashlib
import re
import secrets
import shutil
import struct
from datetime import datetime
from functools import lru_cache
from io import BytesIO
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from flask import Flask, abort, jsonify, redirect, render_template, request, send_from_directory, url_for
from werkzeug.exceptions import RequestEntityTooLarge

from bubble_assets import (
    OVERLAY_ASSETS_METADATA_PATH,
    OVERLAY_IMAGE_LIBRARY_DIR,
    build_bubble_overlay_size,
    list_registered_bubble_overlay_assets,
    load_registered_overlay_asset_records,
    rasterize_bubble_overlay_asset,
    save_registered_overlay_asset_records,
)
from compose import (
    build_metadata as build_compose_metadata,
    build_output_paths as build_compose_output_paths,
    composite_layers as composite_cached_layers,
    ensure_output_dirs as ensure_compose_output_dirs,
)


ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_PSD_DIR = ROOT_DIR / "data" / "psd"
DATA_FONT_DIR = ROOT_DIR / "data" / "font"
DATA_SRC_DIR = ROOT_DIR / "data" / "src"
CACHE_DIR = ROOT_DIR / "cache"
OUTPUTS_DIR = ROOT_DIR / "outputs"
PREVIEW_OUTPUTS_DIR = OUTPUTS_DIR / "preview"
PORTRAIT_OUTPUTS_DIR = OUTPUTS_DIR / "portrait"
SCENE_OUTPUTS_DIR = OUTPUTS_DIR / "scene"
SCENE_PREVIEW_OUTPUTS_DIR = OUTPUTS_DIR / "scene_preview"
SCENE_BASE_OUTPUTS_DIR = OUTPUTS_DIR / "scene_base"
COMPOSITE_PREVIEW_OUTPUTS_DIR = OUTPUTS_DIR / "composite_preview"
SETTINGS_DATA_DIR = ROOT_DIR / "data" / "settings"
TRASH_DIR = ROOT_DIR / "data" / "trash"
TRASH_INDEX_PATH = TRASH_DIR / "trash_index.json"
MB = 1024 * 1024
MAX_IMAGE_UPLOAD_BYTES = 20 * MB
MAX_PSD_UPLOAD_BYTES = 50 * MB
MAX_FONT_UPLOAD_BYTES = 10 * MB
MAX_REQUEST_BYTES = 80 * MB
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_PSD_EXTENSIONS = {".psd"}
ALLOWED_FONT_EXTENSIONS = {".ttf", ".otf"}
TRASH_KIND_DIRS = {
    "image": "images",
    "psd": "psd",
    "font": "fonts",
    "other": "other",
}
SCENE_CANVAS_PRESETS = {
    "16:9": (1920, 1080),
    "4:3": (1600, 1200),
    "3:2": (1800, 1200),
    "1:1": (1200, 1200),
    "9:16": (1080, 1920),
}
SCENE_PREVIEW_SCALE = 0.5
DEFAULT_SCENE_LAYER_ORDER = ["base_image", "message_band", "character1", "character2", "character3", "overlay_image", "text2", "text1"]
DEFAULT_SCENE_LAYER_ORDER_MODE = "aviutl"
SCENE_CHARACTER_LAYER_RE = re.compile(r"^character(\d+)$")
SCENE_TEXT_LAYER_RE = re.compile(r"^text(\d+)$")

app = Flask(__name__, template_folder=str(ROOT_DIR / "templates"))
app.config["MAX_CONTENT_LENGTH"] = MAX_REQUEST_BYTES


@app.errorhandler(RequestEntityTooLarge)
def request_entity_too_large(error):
    return jsonify({"ok": False, "error": "upload request is too large. Maximum request size is 80MB."}), 413


def format_bytes(size: int) -> str:
    if size % MB == 0:
        return f"{size // MB}MB"
    return f"{size} bytes"


def get_upload_size(file_storage) -> int:
    stream = getattr(file_storage, "stream", None)
    if stream is not None:
        try:
            current_position = stream.tell()
            stream.seek(0, 2)
            size = stream.tell()
            stream.seek(current_position)
            return size
        except (AttributeError, OSError):
            pass

    content_length = getattr(file_storage, "content_length", None)
    if content_length:
        return int(content_length)
    return 0


def validate_upload_extension(filename: str, allowed_extensions: set[str], label: str) -> None:
    suffix = Path(filename or "").suffix.lower()
    if suffix not in allowed_extensions:
        allowed = ", ".join(sorted(allowed_extensions))
        raise ValueError(f"{label} must use one of these extensions: {allowed}.")


def validate_upload_size(file_storage, max_bytes: int, label: str) -> None:
    size = get_upload_size(file_storage)
    if size > max_bytes:
        raise ValueError(f"{label} is too large. Maximum size is {format_bytes(max_bytes)}.")


def validate_upload_file(file_storage, allowed_extensions: set[str], max_bytes: int, label: str) -> None:
    if file_storage is None or not file_storage.filename:
        raise ValueError("file is required.")
    validate_upload_extension(file_storage.filename, allowed_extensions, label)
    validate_upload_size(file_storage, max_bytes, label)


def read_validated_upload(file_storage, allowed_extensions: set[str], max_bytes: int, label: str) -> bytes:
    validate_upload_file(file_storage, allowed_extensions, max_bytes, label)
    data = file_storage.read()
    if len(data) > max_bytes:
        raise ValueError(f"{label} is too large. Maximum size is {format_bytes(max_bytes)}.")
    return data


def read_validated_image_upload(file_storage, label: str) -> bytes:
    data = read_validated_upload(file_storage, ALLOWED_IMAGE_EXTENSIONS, MAX_IMAGE_UPLOAD_BYTES, label)
    try:
        with Image.open(BytesIO(data)) as image:
            image.verify()
    except (OSError, ValueError) as exc:
        raise ValueError(f"{label} must be a valid image file.") from exc
    return data


def load_trash_index() -> list[dict]:
    if not TRASH_INDEX_PATH.exists():
        return []
    try:
        payload = json.loads(TRASH_INDEX_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    if not isinstance(payload, list):
        return []
    return payload


def save_trash_index(records: list[dict]) -> None:
    TRASH_DIR.mkdir(parents=True, exist_ok=True)
    TRASH_INDEX_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")


def format_trash_record_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT_DIR))
    except ValueError:
        return str(path)


def move_to_trash(path: Path, kind: str) -> dict | None:
    if not path.exists():
        return None

    trash_kind = kind if kind in TRASH_KIND_DIRS else "other"
    deleted_at = datetime.now().isoformat(timespec="seconds")
    trash_id = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(4)}"
    trash_dir = TRASH_DIR / TRASH_KIND_DIRS[trash_kind]
    trash_dir.mkdir(parents=True, exist_ok=True)

    source_name = path.name
    if path.is_dir():
        trash_name = f"{path.name}_{trash_id}"
    else:
        trash_name = f"{path.stem}_{trash_id}{path.suffix}"
    trash_path = trash_dir / trash_name
    shutil.move(str(path), str(trash_path))

    record = {
        "id": trash_id,
        "kind": trash_kind,
        "original_path": format_trash_record_path(path),
        "trash_path": format_trash_record_path(trash_path),
        "original_name": source_name,
        "deleted_at": deleted_at,
    }
    records = load_trash_index()
    records.append(record)
    save_trash_index(records)
    return record


def empty_trash() -> int:
    deleted_count = len(load_trash_index())
    TRASH_DIR.mkdir(parents=True, exist_ok=True)

    for trash_path in TRASH_DIR.iterdir():
        if trash_path == TRASH_INDEX_PATH:
            continue
        if trash_path.is_dir() and not trash_path.is_symlink():
            shutil.rmtree(trash_path)
        else:
            trash_path.unlink()

    save_trash_index([])
    return deleted_count


def list_psd_files() -> list[str]:
    if not DATA_PSD_DIR.exists():
        return []
    return sorted(
        str(path.relative_to(ROOT_DIR))
        for path in DATA_PSD_DIR.rglob("*.psd")
        if path.is_file()
    )


def sanitize_psd_filename(filename: str) -> str:
    normalized = Path(filename or "").name.strip()
    if not normalized:
        raise ValueError("filename is required.")
    if Path(normalized).suffix.lower() not in ALLOWED_PSD_EXTENSIONS:
        raise ValueError("only .psd files are supported.")

    stem = re.sub(r"[\\/:*?\"<>|\x00-\x1f]+", "_", Path(normalized).stem).strip(" ._")
    if not stem:
        raise ValueError("filename is invalid.")
    return f"{stem}.psd"


def build_psd_storage_path(filename: str) -> Path:
    return DATA_PSD_DIR / sanitize_psd_filename(filename)


def sanitize_font_filename(filename: str) -> str:
    normalized = Path(filename or "").name.strip()
    if not normalized:
        raise ValueError("filename is required.")

    suffix = Path(normalized).suffix.lower()
    if suffix not in ALLOWED_FONT_EXTENSIONS:
        raise ValueError("only .ttf and .otf files are supported.")

    stem = re.sub(r"[\\/:*?\"<>|\x00-\x1f]+", "_", Path(normalized).stem).strip(" ._")
    if not stem:
        raise ValueError("filename is invalid.")
    return f"{stem}{suffix}"


def build_font_storage_path(filename: str) -> Path:
    return DATA_FONT_DIR / sanitize_font_filename(filename)


def resolve_font_file_path(filename: str) -> Path:
    raw_name = (filename or "").strip()
    if not raw_name:
        raise ValueError("filename is required.")

    safe_name = Path(raw_name).name
    if raw_name != safe_name:
        raise ValueError("filename is invalid.")
    if Path(safe_name).suffix.lower() not in ALLOWED_FONT_EXTENSIONS:
        raise ValueError("only .ttf and .otf files are supported.")

    candidate = (DATA_FONT_DIR / safe_name).resolve()
    candidate.relative_to(DATA_FONT_DIR.resolve())
    return candidate


def read_uint16(data: bytes, offset: int) -> int:
    return struct.unpack_from(">H", data, offset)[0]


def read_int16(data: bytes, offset: int) -> int:
    return struct.unpack_from(">h", data, offset)[0]


def read_uint32(data: bytes, offset: int) -> int:
    return struct.unpack_from(">I", data, offset)[0]


def get_font_table(data: bytes, tag: bytes) -> bytes | None:
    sfnt_offset = 0
    if data[:4] == b"ttcf":
        if len(data) < 16:
            return None
        sfnt_offset = read_uint32(data, 12)
    if len(data) < sfnt_offset + 12:
        return None

    table_count = read_uint16(data, sfnt_offset + 4)
    table_dir = sfnt_offset + 12
    for index in range(table_count):
        record_offset = table_dir + index * 16
        if len(data) < record_offset + 16:
            return None
        if data[record_offset:record_offset + 4] != tag:
            continue
        table_offset = read_uint32(data, record_offset + 8)
        table_length = read_uint32(data, record_offset + 12)
        if len(data) < table_offset + table_length:
            return None
        return data[table_offset:table_offset + table_length]
    return None


def cmap_format4_has_codepoint(table: bytes, offset: int, codepoint: int) -> bool:
    if codepoint > 0xFFFF or len(table) < offset + 16:
        return False
    length = read_uint16(table, offset + 2)
    if len(table) < offset + length:
        return False
    seg_count = read_uint16(table, offset + 6) // 2
    end_codes = offset + 14
    start_codes = end_codes + seg_count * 2 + 2
    id_deltas = start_codes + seg_count * 2
    id_range_offsets = id_deltas + seg_count * 2
    for index in range(seg_count):
        end_code = read_uint16(table, end_codes + index * 2)
        start_code = read_uint16(table, start_codes + index * 2)
        if not start_code <= codepoint <= end_code:
            continue
        id_delta = read_int16(table, id_deltas + index * 2)
        range_offset_pos = id_range_offsets + index * 2
        range_offset = read_uint16(table, range_offset_pos)
        if range_offset == 0:
            return ((codepoint + id_delta) % 65536) != 0
        glyph_offset = range_offset_pos + range_offset + (codepoint - start_code) * 2
        if glyph_offset + 2 > offset + length:
            return False
        glyph_id = read_uint16(table, glyph_offset)
        return glyph_id != 0 and ((glyph_id + id_delta) % 65536) != 0
    return False


def cmap_format12_has_codepoint(table: bytes, offset: int, codepoint: int) -> bool:
    if len(table) < offset + 16:
        return False
    length = read_uint32(table, offset + 4)
    if len(table) < offset + length:
        return False
    group_count = read_uint32(table, offset + 12)
    groups_offset = offset + 16
    for index in range(group_count):
        group_offset = groups_offset + index * 12
        if group_offset + 12 > offset + length:
            return False
        start_code = read_uint32(table, group_offset)
        end_code = read_uint32(table, group_offset + 4)
        start_glyph = read_uint32(table, group_offset + 8)
        if start_code <= codepoint <= end_code:
            return start_glyph + (codepoint - start_code) != 0
    return False


@lru_cache(maxsize=128)
def font_has_codepoints(font_path: str, codepoints: tuple[int, ...]) -> bool:
    try:
        data = Path(font_path).read_bytes()
        cmap = get_font_table(data, b"cmap")
        if cmap is None or len(cmap) < 4:
            return False
        subtable_count = read_uint16(cmap, 2)
        subtables = []
        for index in range(subtable_count):
            record_offset = 4 + index * 8
            if len(cmap) < record_offset + 8:
                continue
            platform_id = read_uint16(cmap, record_offset)
            encoding_id = read_uint16(cmap, record_offset + 2)
            subtable_offset = read_uint32(cmap, record_offset + 4)
            if len(cmap) < subtable_offset + 2:
                continue
            format_id = read_uint16(cmap, subtable_offset)
            priority = 0 if (platform_id, encoding_id) in {(3, 10), (0, 4)} else 1
            subtables.append((priority, format_id, subtable_offset))
        for _, format_id, subtable_offset in sorted(subtables):
            if format_id not in {4, 12}:
                continue
            if all(
                cmap_format12_has_codepoint(cmap, subtable_offset, codepoint)
                if format_id == 12
                else cmap_format4_has_codepoint(cmap, subtable_offset, codepoint)
                for codepoint in codepoints
            ):
                return True
    except (OSError, struct.error, ValueError):
        return False
    return False


def text_codepoints_requiring_font_support(text_value: str) -> tuple[int, ...]:
    return tuple(sorted({ord(ch) for ch in text_value if not ch.isspace()}))


def iter_scene_text_font_candidates(preferred_font_path: Path | None = None):
    seen = set()
    if preferred_font_path is not None:
        resolved = preferred_font_path.resolve()
        seen.add(resolved)
        yield resolved
    if DATA_FONT_DIR.exists():
        for path in sorted(DATA_FONT_DIR.iterdir()):
            if path.is_file() and path.suffix.lower() in ALLOWED_FONT_EXTENSIONS:
                resolved = path.resolve()
                if resolved not in seen:
                    seen.add(resolved)
                    yield resolved


def resolve_scene_text_font_path(text: dict) -> Path | None:
    codepoints = text_codepoints_requiring_font_support(text["value"])
    if not codepoints:
        return text["font_path"]
    for font_path in iter_scene_text_font_candidates(text["font_path"]):
        if font_has_codepoints(str(font_path), codepoints):
            return font_path
    return text["font_path"]


def load_scene_text_font(text: dict, text_size: int, font_path: Path | None = None):
    font_path = font_path if font_path is not None else resolve_scene_text_font_path(text)
    if font_path is not None:
        return ImageFont.truetype(str(font_path), text_size)
    try:
        return ImageFont.load_default(text_size)
    except TypeError:
        return ImageFont.load_default()


def list_font_file_items() -> list[dict]:
    if not DATA_FONT_DIR.exists():
        return []

    items = []
    for path in DATA_FONT_DIR.iterdir():
        if not path.is_file() or path.suffix.lower() not in ALLOWED_FONT_EXTENSIONS:
            continue
        stat = path.stat()
        items.append(
            {
                "name": path.name,
                "size": stat.st_size,
                "updated_at": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
            }
        )

    items.sort(key=lambda item: (item["updated_at"], item["name"]), reverse=True)
    return items


def delete_font_file(filename: str) -> str:
    font_path = resolve_font_file_path(filename)
    if font_path.exists() and font_path.is_file():
        move_to_trash(font_path, "font")
    return font_path.name


def list_psd_file_items() -> list[dict]:
    if not DATA_PSD_DIR.exists():
        return []

    items = []
    for path in DATA_PSD_DIR.glob("*.psd"):
        if not path.is_file():
            continue
        stat = path.stat()
        items.append(
            {
                "name": path.name,
                "size": stat.st_size,
                "updated_at": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
            }
        )

    items.sort(key=lambda item: (item["updated_at"], item["name"]), reverse=True)
    return items


def resolve_project_path(relative_path: str) -> Path:
    candidate = (ROOT_DIR / relative_path).resolve()
    candidate.relative_to(ROOT_DIR)
    return candidate


def resolve_psd_path(relative_path: str) -> Path:
    candidate = resolve_project_path(relative_path)
    candidate.relative_to(DATA_PSD_DIR.resolve())
    if not candidate.exists():
        raise FileNotFoundError(f"PSD file not found: {relative_path}")
    return candidate


def run_command(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=ROOT_DIR,
        text=True,
        capture_output=True,
        check=False,
    )


def extract_output_value(stdout: str, prefix: str) -> str:
    for line in stdout.splitlines():
        if line.startswith(prefix):
            return line[len(prefix) :].strip()
    raise ValueError(f"Could not find '{prefix}' in command output.")


def load_layers_json(layers_json_path: Path) -> dict:
    return json.loads(layers_json_path.read_text(encoding="utf-8"))


def build_psd_cache_key(psd_path: Path) -> str:
    stat = psd_path.stat()
    seed = f"{psd_path.name}:{stat.st_size}:{int(stat.st_mtime)}".encode("utf-8")
    return f"psd_{hashlib.sha1(seed).hexdigest()[:12]}"


def resolve_cached_layers_json_path(psd_path: Path) -> Path:
    cache_key = build_psd_cache_key(psd_path)
    return CACHE_DIR / cache_key / "layers.json"


def load_cached_layers_payload(psd_path: Path) -> tuple[dict, Path] | None:
    layers_json_path = resolve_cached_layers_json_path(psd_path)
    if not layers_json_path.exists():
        return None

    payload = load_layers_json(layers_json_path)
    if payload.get("psd_source", {}).get("cache_key") != layers_json_path.parent.name:
        raise ValueError(f"cache metadata is invalid: {layers_json_path}")
    return payload, layers_json_path


def load_or_build_psd_layers(psd_path: Path) -> tuple[dict, Path]:
    try:
        cached = load_cached_layers_payload(psd_path)
        if cached is not None:
            return cached
    except (OSError, ValueError, json.JSONDecodeError):
        pass

    result = run_command([sys.executable, "src/psd_check.py", "--psd", str(psd_path)])
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "psd_check.py failed.")

    layers_json_path = Path(extract_output_value(result.stdout, "layers.json: "))
    payload = load_layers_json(layers_json_path)
    return payload, layers_json_path


def build_output_history_path(output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%y%m%d_%H%M%S")
    return output_dir / f"{timestamp}.png"


def build_overwrite_output_path(output_dir: Path, stem: str) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"{stem}.png"


def list_preview_sources() -> list[dict]:
    sources = []
    if not CACHE_DIR.exists():
        return sources

    for layers_json_path in sorted(CACHE_DIR.glob("*/layers.json")):
        try:
            payload = load_layers_json(layers_json_path)
        except (json.JSONDecodeError, OSError):
            continue

        psd_source = payload.get("psd_source", {})
        cache_key = psd_source.get("cache_key")
        if not cache_key:
            continue

        preview_path = PREVIEW_OUTPUTS_DIR / f"{cache_key}.png"
        sources.append(
            {
                "cache_key": cache_key,
                "psd_filename": psd_source.get("filename", cache_key),
                "preview_available": preview_path.exists(),
                "preview_url": f"/outputs/preview/{cache_key}.png" if preview_path.exists() else None,
            }
        )

    return sources


def collect_psd_cache_keys(psd_name: str) -> list[str]:
    safe_name = sanitize_psd_filename(psd_name)
    cache_keys = set()
    psd_path = DATA_PSD_DIR / safe_name

    if psd_path.exists():
        cache_keys.add(build_psd_cache_key(psd_path))

    if CACHE_DIR.exists():
        expected_source_path = str(Path("data") / "psd" / safe_name)
        for layers_json_path in CACHE_DIR.glob("*/layers.json"):
            try:
                payload = load_layers_json(layers_json_path)
            except (OSError, json.JSONDecodeError):
                continue

            psd_source = payload.get("psd_source", {})
            if psd_source.get("filename") == safe_name or psd_source.get("path") == expected_source_path:
                cache_key = psd_source.get("cache_key") or layers_json_path.parent.name
                if isinstance(cache_key, str) and cache_key:
                    cache_keys.add(cache_key)

    return sorted(cache_keys)


def remove_cache_artifacts(cache_key: str) -> None:
    cache_dir = CACHE_DIR / cache_key
    if cache_dir.exists():
        move_to_trash(cache_dir, "other")
    for output_dir in (PREVIEW_OUTPUTS_DIR, COMPOSITE_PREVIEW_OUTPUTS_DIR, SCENE_PREVIEW_OUTPUTS_DIR):
        for suffix in (".png", ".json"):
            artifact_path = output_dir / f"{cache_key}{suffix}"
            if artifact_path.exists():
                move_to_trash(artifact_path, "other")


def delete_psd_with_cache(psd_name: str) -> dict:
    safe_name = sanitize_psd_filename(psd_name)
    psd_path = DATA_PSD_DIR / safe_name
    if not psd_path.exists() or not psd_path.is_file():
        raise FileNotFoundError(f"PSD file not found: {safe_name}")

    cache_keys = collect_psd_cache_keys(safe_name)
    move_to_trash(psd_path, "psd")
    for cache_key in cache_keys:
        remove_cache_artifacts(cache_key)

    return {
        "name": safe_name,
        "deleted_cache_keys": cache_keys,
    }


def list_gallery_items(output_dir: Path) -> list[dict]:
    if not output_dir.exists():
        return []

    items = []
    for image_path in output_dir.glob("*.png"):
        stat = image_path.stat()
        items.append(
            {
                "filename": image_path.name,
                "url": f"/outputs/{image_path.relative_to(OUTPUTS_DIR)}",
                "mtime": datetime.fromtimestamp(stat.st_mtime),
            }
        )

    items.sort(key=lambda item: item["mtime"], reverse=True)
    return items


def list_portrait_gallery_items() -> list[dict]:
    return list_gallery_items(PORTRAIT_OUTPUTS_DIR)


def list_scene_gallery_items() -> list[dict]:
    return list_gallery_items(SCENE_OUTPUTS_DIR)


def resolve_gallery_output_path(output_dir: Path, filename: str) -> Path | None:
    if not filename:
        return None

    candidate = (output_dir / filename).resolve()
    try:
        candidate.relative_to(output_dir.resolve())
    except ValueError:
        return None

    if candidate.suffix.lower() != ".png" or not candidate.exists() or not candidate.is_file():
        return None
    return candidate


def resolve_portrait_output_path(filename: str) -> Path | None:
    return resolve_gallery_output_path(PORTRAIT_OUTPUTS_DIR, filename)


def resolve_gallery_output_dir(kind: str) -> Path:
    if kind == "portrait":
        return PORTRAIT_OUTPUTS_DIR
    if kind == "scene":
        return SCENE_OUTPUTS_DIR
    raise ValueError("kind is invalid.")


def delete_gallery_output(filename: str, kind: str = "portrait") -> str:
    raw_name = (filename or "").strip()
    if not raw_name:
        raise ValueError("name is required.")
    safe_name = Path(raw_name).name
    if raw_name != safe_name:
        raise ValueError("name is invalid.")
    if Path(safe_name).suffix.lower() != ".png":
        raise ValueError("only .png files are supported.")

    output_dir = resolve_gallery_output_dir(kind)
    portrait_path = (output_dir / safe_name).resolve()
    try:
        portrait_path.relative_to(output_dir.resolve())
    except ValueError as exc:
        raise ValueError("name is invalid.") from exc

    if portrait_path.exists() and portrait_path.is_file():
        move_to_trash(portrait_path, "image")
    return safe_name


def resolve_scene_base_output_path(filename: str) -> Path | None:
    if not filename:
        return None

    candidate = (SCENE_BASE_OUTPUTS_DIR / filename).resolve()
    try:
        candidate.relative_to(SCENE_BASE_OUTPUTS_DIR.resolve())
    except ValueError:
        return None

    if candidate.suffix.lower() != ".png" or not candidate.exists() or not candidate.is_file():
        return None
    return candidate


def resolve_scene_overlay_output_path(filename: str) -> Path | None:
    if not filename:
        return None

    candidate = (DATA_SRC_DIR / filename).resolve()
    try:
        candidate.relative_to(DATA_SRC_DIR.resolve())
    except ValueError:
        return None

    if candidate.suffix.lower() not in ALLOWED_IMAGE_EXTENSIONS or not candidate.exists() or not candidate.is_file():
        return None
    return candidate


def sanitize_scene_overlay_filename(filename: str) -> str:
    normalized = Path(filename or "").name.strip()
    if not normalized:
        raise ValueError("filename is required.")

    suffix = Path(normalized).suffix.lower()
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValueError("overlay image must be png, jpg, jpeg, or webp.")

    stem = re.sub(r"[\\/:*?\"<>|\x00-\x1f]+", "_", Path(normalized).stem).strip(" ._")
    if not stem:
        stem = "overlay"
    return f"{stem}{suffix}"


def build_scene_overlay_storage_path(filename: str) -> Path:
    safe_name = sanitize_scene_overlay_filename(filename)
    candidate = DATA_SRC_DIR / safe_name
    if not candidate.exists():
        return candidate

    stem = candidate.stem
    suffix = candidate.suffix
    index = 2
    while True:
        indexed_candidate = DATA_SRC_DIR / f"{stem}_{index}{suffix}"
        if not indexed_candidate.exists():
            return indexed_candidate
        index += 1


def save_scene_base_image(file_storage) -> tuple[str, str, str]:
    data = read_validated_image_upload(file_storage, "base image")
    SCENE_BASE_OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    output_name = f"{datetime.now().strftime('%y%m%d_%H%M%S')}_{secrets.token_hex(4)}.png"
    output_path = SCENE_BASE_OUTPUTS_DIR / output_name
    display_name = Path(file_storage.filename or output_name).name

    image = Image.open(BytesIO(data)).convert("RGBA")
    image.save(output_path)
    return output_name, f"/outputs/{output_path.relative_to(OUTPUTS_DIR)}", display_name


def save_scene_overlay_image(file_storage) -> tuple[str, str, str]:
    data = read_validated_image_upload(file_storage, "overlay image")
    DATA_SRC_DIR.mkdir(parents=True, exist_ok=True)
    output_path = build_scene_overlay_storage_path(file_storage.filename or "")
    output_name = output_path.name
    suffix = output_path.suffix.lower()
    display_name = Path(file_storage.filename or output_name).name

    image = Image.open(BytesIO(data)).convert("RGBA")
    if suffix in {".jpg", ".jpeg"}:
        rgb_image = Image.new("RGB", image.size, (255, 255, 255))
        rgb_image.paste(image, mask=image.getchannel("A"))
        rgb_image.save(output_path, format="JPEG", quality=95)
    elif suffix == ".webp":
        image.save(output_path, format="WEBP")
    else:
        image.save(output_path, format="PNG")
    return output_name, f"/data/src/{output_name}", display_name


def build_unique_overlay_asset_storage_path(filename: str) -> Path:
    safe_name = sanitize_scene_overlay_filename(filename)
    candidate = OVERLAY_IMAGE_LIBRARY_DIR / safe_name
    if not candidate.exists():
        return candidate

    stem = candidate.stem
    suffix = candidate.suffix
    index = 2
    while True:
        indexed_candidate = OVERLAY_IMAGE_LIBRARY_DIR / f"{stem}_{index}{suffix}"
        if not indexed_candidate.exists():
            return indexed_candidate
        index += 1


def build_overlay_asset_id(filename: str) -> str:
    stem = Path(filename).stem
    normalized = re.sub(r"[^0-9A-Za-z_-]+", "-", stem).strip("-_").lower()
    return normalized or "overlay-image"


def build_unique_overlay_asset_id(filename: str, records: list[dict]) -> str:
    existing_ids = {str(record.get("id") or "").strip() for record in records}
    base_id = build_overlay_asset_id(filename)
    if base_id not in existing_ids:
        return base_id

    index = 2
    while True:
        candidate = f"{base_id}-{index}"
        if candidate not in existing_ids:
            return candidate
        index += 1


def list_registered_overlay_asset_items() -> list[dict]:
    return load_registered_overlay_asset_records()


def save_overlay_asset_image(file_storage) -> dict:
    if file_storage is None or not file_storage.filename:
        raise ValueError("file is required.")

    data = read_validated_image_upload(file_storage, "overlay asset image")
    OVERLAY_IMAGE_LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
    output_path = build_unique_overlay_asset_storage_path(file_storage.filename)
    suffix = output_path.suffix.lower()
    image = Image.open(BytesIO(data)).convert("RGBA")
    if suffix in {".jpg", ".jpeg"}:
        rgb_image = Image.new("RGB", image.size, (255, 255, 255))
        rgb_image.paste(image, mask=image.getchannel("A"))
        rgb_image.save(output_path, format="JPEG", quality=95)
    elif suffix == ".webp":
        image.save(output_path, format="WEBP")
    else:
        image.save(output_path, format="PNG")

    records = load_registered_overlay_asset_records()
    record = {
        "id": build_unique_overlay_asset_id(output_path.name, records),
        "label": Path(file_storage.filename).stem or output_path.stem,
        "filename": output_path.name,
        "default_width": image.width,
        "default_height": image.height,
        "kind": "image",
        "created_at": datetime.now().isoformat(timespec="seconds"),
    }
    records.append(record)
    save_registered_overlay_asset_records(records)
    return record


def delete_overlay_asset_image(asset_id: str) -> dict:
    normalized_id = (asset_id or "").strip()
    if not normalized_id:
        raise ValueError("id is required.")

    records = load_registered_overlay_asset_records()
    target_record = None
    kept_records = []
    for record in records:
        if str(record.get("id") or "").strip() == normalized_id:
            target_record = record
            continue
        kept_records.append(record)

    if target_record is None:
        raise FileNotFoundError(f"overlay asset not found: {normalized_id}")

    filename = Path(str(target_record.get("filename") or "")).name
    if filename:
        asset_path = (OVERLAY_IMAGE_LIBRARY_DIR / filename).resolve()
        asset_path.relative_to(OVERLAY_IMAGE_LIBRARY_DIR.resolve())
        if asset_path.exists() and asset_path.is_file():
            move_to_trash(asset_path, "image")

    save_registered_overlay_asset_records(kept_records)
    return target_record


def sanitize_settings_name(name: str) -> str:
    normalized = re.sub(r"[^A-Za-z0-9._-]+", "_", name.strip())
    normalized = normalized.strip("._-")
    if not normalized:
        raise ValueError("settings_name is invalid.")
    return normalized


def build_settings_file_path(settings_name: str) -> Path:
    return SETTINGS_DATA_DIR / f"{sanitize_settings_name(settings_name)}.json"


def is_valid_settings_payload(payload: object) -> bool:
    if not isinstance(payload, dict):
        return False
    required_keys = {
        "presets_by_cache",
        "portrait_states_by_cache",
        "portrait_state",
        "scene_state",
        "scene_portrait_layouts",
    }
    return required_keys.issubset(payload.keys())


def save_settings_payload(settings_name: str, payload: dict) -> dict:
    if not is_valid_settings_payload(payload):
        raise ValueError("payload is invalid.")

    settings_name = sanitize_settings_name(settings_name)
    SETTINGS_DATA_DIR.mkdir(parents=True, exist_ok=True)
    updated_at = datetime.now().isoformat(timespec="seconds")
    record = {
        "settings_name": settings_name,
        "updated_at": updated_at,
        "schema_version": 1,
        "payload": payload,
    }
    build_settings_file_path(settings_name).write_text(
        json.dumps(record, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return record


def load_settings_record(settings_name: str) -> dict:
    settings_path = build_settings_file_path(settings_name)
    if not settings_path.exists():
        raise FileNotFoundError(f"settings not found: {settings_name}")
    record = json.loads(settings_path.read_text(encoding="utf-8"))
    if not isinstance(record, dict) or not is_valid_settings_payload(record.get("payload")):
        raise ValueError(f"settings file is invalid: {settings_name}")
    return record


def rename_settings_record(settings_name: str, new_settings_name: str) -> dict:
    current_path = build_settings_file_path(settings_name)
    if not current_path.exists():
        raise FileNotFoundError(f"settings not found: {settings_name}")

    target_name = sanitize_settings_name(new_settings_name)
    current_record = load_settings_record(settings_name)
    if current_record["settings_name"] == target_name:
        return current_record

    target_path = build_settings_file_path(target_name)
    if target_path.exists():
        raise ValueError(f"settings already exists: {target_name}")

    current_record["settings_name"] = target_name
    current_path.replace(target_path)
    target_path.write_text(json.dumps(current_record, ensure_ascii=False, indent=2), encoding="utf-8")
    return current_record


def delete_settings_record(settings_name: str) -> None:
    settings_path = build_settings_file_path(settings_name)
    if not settings_path.exists():
        raise FileNotFoundError(f"settings not found: {settings_name}")
    move_to_trash(settings_path, "other")


def list_settings_records() -> list[dict]:
    if not SETTINGS_DATA_DIR.exists():
        return []

    items = []
    for settings_path in sorted(SETTINGS_DATA_DIR.glob("*.json")):
        try:
            record = json.loads(settings_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue

        settings_name = record.get("settings_name")
        updated_at = record.get("updated_at")
        if not isinstance(settings_name, str) or not isinstance(updated_at, str):
            continue

        items.append(
            {
                "settings_name": settings_name,
                "updated_at": updated_at,
            }
        )

    items.sort(key=lambda item: item["updated_at"], reverse=True)
    return items


def build_layer_tree(layers: list[dict]) -> list[dict]:
    by_id = {}
    for layer in layers:
        by_id[layer["id"]] = {
            "id": layer["id"],
            "name": layer["name"],
            "type": layer["type"],
            "visible": layer["visible"],
            "depth": layer["depth"],
            "children": [],
        }

    roots = []
    for layer in layers:
        node = by_id[layer["id"]]
        if layer["parent_id"] is None:
            roots.append(node)
        else:
            by_id[layer["parent_id"]]["children"].append(node)

    def reverse_tree(nodes: list[dict]) -> list[dict]:
        ordered = []
        for node in reversed(nodes):
            node["children"] = reverse_tree(node["children"])
            ordered.append(node)
        return ordered

    return reverse_tree(roots)


def order_layer_ids_for_compose(layers: list[dict], selected_layer_ids: list[str]) -> list[str]:
    selected_ids = {int(layer_id) for layer_id in selected_layer_ids}
    ordered_ids = []
    for layer in layers:
        if layer["type"] != "layer":
            continue
        if layer["id"] in selected_ids:
            ordered_ids.append(str(layer["id"]))
    return ordered_ids


def build_layer_preview_payload(payload: dict) -> dict:
    psd_source = payload["psd_source"]
    cache_key = psd_source["cache_key"]
    return {
        "canvas": payload["canvas"],
        "layers": [
            {
                "id": layer["id"],
                "png_url": f"/cache/{cache_key}/layers/{layer['id']}.png",
            }
            for layer in payload["layers"]
            if layer["type"] == "layer" and layer.get("cache_png")
        ],
    }


def load_preview_layer_signature(cache_key: str | None) -> str:
    if not cache_key:
        return ""

    preview_json_path = PREVIEW_OUTPUTS_DIR / f"{cache_key}.json"
    if not preview_json_path.exists():
        return ""

    try:
        preview_metadata = load_layers_json(preview_json_path)
        layer_ids = [int(layer_id) for layer_id in preview_metadata.get("layer_ids", [])]
    except (OSError, TypeError, ValueError, json.JSONDecodeError):
        return ""
    return ",".join(str(layer_id) for layer_id in sorted(layer_ids))


def sanitize_portrait_name(name: str) -> str | None:
    sanitized = re.sub(r'[\\/:*?"<>|]+', "_", name.strip())
    if sanitized.lower().endswith(".png"):
        sanitized = sanitized[:-4]
    sanitized = sanitized.strip(" ._")
    return sanitized or None


def execute_compose(
    layers_json_path: Path,
    selected_layer_ids: list[str],
    output_kind: str,
    output_name: str | None = None,
) -> str:
    payload = load_layers_json(layers_json_path)
    ordered_layer_ids = order_layer_ids_for_compose(payload["layers"], selected_layer_ids)
    ordered_layer_id_numbers = [int(layer_id) for layer_id in ordered_layer_ids]

    try:
        ensure_compose_output_dirs(OUTPUTS_DIR)
        image, payload = composite_cached_layers(layers_json_path, ordered_layer_id_numbers)
        cache_key = payload["psd_source"]["cache_key"]
        output_png_path, output_json_path, created_at = build_compose_output_paths(
            OUTPUTS_DIR,
            output_kind,
            cache_key,
            output_name,
        )
        image.save(output_png_path)
        if output_json_path is not None:
            metadata = build_compose_metadata(payload, layers_json_path, ordered_layer_id_numbers, created_at)
            output_json_path.write_text(
                json.dumps(metadata, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
    except (KeyError, OSError) as exc:
        raise RuntimeError(str(exc) or "compose.py failed.") from exc

    return str(output_png_path.relative_to(OUTPUTS_DIR))


def render_portrait_page(
    *,
    selected_psd: str | None = None,
    layers_json: str | None = None,
    cache_key: str | None = None,
    layer_tree: list[dict] | None = None,
    layer_preview: dict | None = None,
    selected_layer_ids: list[str] | None = None,
    output_image: str | None = None,
    error_message: str | None = None,
):
    return render_template(
        "index.html",
        psd_files=list_psd_files(),
        selected_psd=selected_psd,
        layers_json=layers_json,
        cache_key=cache_key,
        layer_tree=layer_tree or [],
        layer_preview=layer_preview,
        reflected_layer_signature=load_preview_layer_signature(cache_key),
        selected_layer_ids=selected_layer_ids or [],
        output_image=output_image,
        error_message=error_message,
    )


def render_scene_page(
    *,
    preview_sources: list[dict] | None = None,
    scene_image: str | None = None,
    canvas_presets: dict[str, tuple[int, int]] | None = None,
    selected_portrait_filename: str | None = None,
    selected_portrait_url: str | None = None,
    selected_portrait_slot: int = 1,
    error_message: str | None = None,
):
    return render_template(
        "scene.html",
        preview_sources=preview_sources or list_preview_sources(),
        scene_image=scene_image,
        canvas_presets=canvas_presets or SCENE_CANVAS_PRESETS,
        bubble_overlay_assets=list_registered_bubble_overlay_assets(),
        selected_portrait_filename=selected_portrait_filename,
        selected_portrait_url=selected_portrait_url,
        selected_portrait_slot=selected_portrait_slot,
        error_message=error_message,
    )


def render_gallery_page(*, gallery_items: list[dict] | None = None):
    return render_template(
        "gallery.html",
        portrait_gallery_items=gallery_items if gallery_items is not None else list_portrait_gallery_items(),
        scene_gallery_items=list_scene_gallery_items(),
    )


def render_settings_page(*, error_message: str | None = None):
    return render_template(
        "settings.html",
        error_message=error_message,
        trash_item_count=len(load_trash_index()),
    )


def load_scene_character_input(
    slot_name: str,
    *,
    default_enabled: bool = False,
    default_cache_key: str = "",
    default_portrait_filename: str = "",
    default_x: int = 0,
    default_y: int = 0,
    default_scale: int = 100,
) -> dict:
    enabled_raw = request.form.get(f"{slot_name}_enabled")
    if enabled_raw is None:
        enabled = default_enabled
    else:
        enabled = enabled_raw in {"1", "true", "on"}

    cache_key = (request.form.get(f"{slot_name}_cache_key") or default_cache_key).strip()
    portrait_filename = (request.form.get(f"{slot_name}_portrait_filename") or default_portrait_filename).strip()
    x = int(request.form.get(f"{slot_name}_x", str(default_x)))
    y = int(request.form.get(f"{slot_name}_y", str(default_y)))
    scale = int(request.form.get(f"{slot_name}_scale", str(default_scale)))

    if scale <= 0:
        raise ValueError(f"{slot_name}_scale must be greater than 0.")

    if not enabled:
        return {
            "enabled": False,
            "layer_id": slot_name,
            "cache_key": cache_key,
            "portrait_filename": portrait_filename,
            "x": x,
            "y": y,
            "scale": scale,
            "source": "",
            "portrait": None,
        }

    if not cache_key and not portrait_filename:
        return {
            "enabled": False,
            "layer_id": slot_name,
            "cache_key": cache_key,
            "portrait_filename": portrait_filename,
            "x": x,
            "y": y,
            "scale": scale,
            "source": "",
            "portrait": None,
        }

    portrait_path = resolve_portrait_output_path(portrait_filename)
    portrait_source = portrait_filename
    if portrait_path is None:
        if not cache_key:
            raise ValueError(f"{slot_name}_cache_key or {slot_name}_portrait_filename is required.")
        portrait_path = PREVIEW_OUTPUTS_DIR / f"{cache_key}.png"
        portrait_source = cache_key
        if not portrait_path.exists():
            raise FileNotFoundError(f"preview image not found for cache_key: {cache_key}")

    portrait = Image.open(portrait_path).convert("RGBA")
    return {
        "enabled": True,
        "layer_id": slot_name,
        "cache_key": cache_key,
        "portrait_filename": portrait_filename,
        "x": x,
        "y": y,
        "scale": scale,
        "source": portrait_source,
        "portrait": portrait,
    }


def load_scene_character_slot_numbers() -> list[int]:
    slots = {1, 2, 3}
    try:
        slot_count = int(request.form.get("character_slot_count") or "0")
    except ValueError:
        slot_count = 0
    if slot_count > 0:
        slots.update(range(1, slot_count + 1))

    raw_order = request.form.get("layer_order") or ""
    try:
        parsed_order = json.loads(raw_order)
    except json.JSONDecodeError:
        parsed_order = raw_order.split(",")
    if isinstance(parsed_order, list):
        for layer_id in parsed_order:
            match = SCENE_CHARACTER_LAYER_RE.match(str(layer_id))
            if match:
                slots.add(int(match.group(1)))

    for key in request.form.keys():
        match = re.match(r"^character(\d+)_", key)
        if match:
            slots.add(int(match.group(1)))

    return sorted(slot for slot in slots if slot >= 1)


def load_scene_text_input(prefix: str = "text") -> dict:
    enabled_raw = request.form.get(f"{prefix}_enabled")
    enabled = enabled_raw in {"1", "true", "on"}
    stroke_enabled_raw = request.form.get(f"{prefix}_stroke_enabled")
    stroke_enabled = stroke_enabled_raw in {"1", "true", "on"}
    value = (request.form.get(f"{prefix}_value") or "").replace("\r\n", "\n")
    x = int(request.form.get(f"{prefix}_x", "100" if prefix == "text2" else "0"))
    y = int(request.form.get(f"{prefix}_y", "100" if prefix == "text2" else "0"))
    size = int(request.form.get(f"{prefix}_size", "64" if prefix == "text2" else "32"))
    color = (request.form.get(f"{prefix}_color") or "#ffffff").strip() or "#ffffff"
    stroke_color = (request.form.get(f"{prefix}_stroke_color") or "#000000").strip() or "#000000"
    stroke_width = int(request.form.get(f"{prefix}_stroke_width", "2"))
    font_name = (request.form.get(f"{prefix}_font") or "").strip()

    if size <= 0:
        raise ValueError(f"{prefix}_size must be greater than 0.")
    if stroke_width < 0:
        raise ValueError(f"{prefix}_stroke_width must be 0 or greater.")
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", color):
        raise ValueError(f"{prefix}_color is invalid.")
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", stroke_color):
        raise ValueError(f"{prefix}_stroke_color is invalid.")

    font_path = None
    if font_name:
        font_path = resolve_font_file_path(font_name)
        if not font_path.exists() or not font_path.is_file():
            raise FileNotFoundError(f"font file not found: {font_name}")

    return {
        "enabled": enabled,
        "value": value,
        "x": x,
        "y": y,
        "size": size,
        "color": color,
        "stroke_enabled": stroke_enabled,
        "stroke_color": stroke_color,
        "stroke_width": stroke_width,
        "font": font_name,
        "font_path": font_path,
    }


def load_scene_text_slot_numbers() -> list[int]:
    slots = {1, 2}
    try:
        slot_count = int(request.form.get("text_slot_count") or "0")
    except ValueError:
        slot_count = 0
    if slot_count > 0:
        return list(range(1, slot_count + 1))

    raw_order = request.form.get("layer_order") or ""
    try:
        parsed_order = json.loads(raw_order)
    except json.JSONDecodeError:
        parsed_order = raw_order.split(",")
    if isinstance(parsed_order, list):
        for layer_id in parsed_order:
            match = SCENE_TEXT_LAYER_RE.match(str(layer_id))
            if match:
                slots.add(int(match.group(1)))

    for key in request.form.keys():
        match = re.match(r"^text(\d+)_", key)
        if match:
            slots.add(int(match.group(1)))

    return sorted(slot for slot in slots if slot >= 1)


def load_scene_text_inputs() -> list[dict]:
    texts = []
    for slot_number in load_scene_text_slot_numbers():
        prefix = "text" if slot_number == 1 else f"text{slot_number}"
        text = load_scene_text_input(prefix)
        text["slot"] = slot_number
        text["layer_id"] = f"text{slot_number}"
        text["state_key"] = prefix
        texts.append(text)
    return texts


def load_scene_bubble_overlay_input() -> dict:
    enabled_raw = request.form.get("bubble_overlay_enabled")
    enabled = enabled_raw in {"1", "true", "on"}
    source_type = (request.form.get("bubble_overlay_source_type") or "asset").strip() or "asset"
    asset_id = (request.form.get("bubble_overlay_asset") or "").strip()
    upload_file = (request.form.get("bubble_overlay_upload_file") or "").strip()
    x = int(request.form.get("bubble_overlay_x", "180"))
    y = int(request.form.get("bubble_overlay_y", "220"))
    width_raw = (request.form.get("bubble_overlay_width") or "").strip()
    height_raw = (request.form.get("bubble_overlay_height") or "").strip()
    if source_type not in {"asset", "file"}:
        raise ValueError("bubble_overlay_source_type is invalid.")

    if source_type == "asset":
        try:
            width, height = build_bubble_overlay_size(
                asset_id,
                int(width_raw) if width_raw else None,
                int(height_raw) if height_raw else None,
            )
        except ValueError:
            enabled = False
            width = int(width_raw) if width_raw else 420
            height = int(height_raw) if height_raw else 180
    else:
        width = int(width_raw) if width_raw else 420
        height = int(height_raw) if height_raw else 180

    if width <= 0:
        raise ValueError("bubble_overlay_width must be greater than 0.")
    if height <= 0:
        raise ValueError("bubble_overlay_height must be greater than 0.")

    return {
        "enabled": enabled,
        "source_type": source_type,
        "asset": asset_id,
        "upload_file": upload_file,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
    }


def measure_multiline_text_layout(
    draw: ImageDraw.ImageDraw,
    *,
    text_value: str,
    font: ImageFont.ImageFont | ImageFont.FreeTypeFont,
    stroke_width: int,
    spacing: int,
    align: str = "left",
) -> dict:
    text_bbox = draw.multiline_textbbox(
        (0, 0),
        text_value,
        font=font,
        spacing=spacing,
        stroke_width=stroke_width,
        align=align,
    )
    return {
        "bbox": text_bbox,
        "width": text_bbox[2] - text_bbox[0],
        "height": text_bbox[3] - text_bbox[1],
        "draw_offset_x": -text_bbox[0],
        "draw_offset_y": -text_bbox[1],
    }


def build_scene_bubble_overlay_layout(bubble_overlay: dict, position_scale: float) -> dict | None:
    if not bubble_overlay["enabled"]:
        return None
    if bubble_overlay["source_type"] == "file" and not bubble_overlay["upload_file"]:
        return None
    if bubble_overlay["source_type"] not in {"asset", "file"}:
        return None
    return {
        "source_type": bubble_overlay["source_type"],
        "asset": bubble_overlay["asset"],
        "upload_file": bubble_overlay["upload_file"],
        "x": round(bubble_overlay["x"] * position_scale),
        "y": round(bubble_overlay["y"] * position_scale),
        "width": max(1, round(bubble_overlay["width"] * position_scale)),
        "height": max(1, round(bubble_overlay["height"] * position_scale)),
    }


def build_scene_text_layout(
    draw: ImageDraw.ImageDraw,
    *,
    text: dict,
    position_scale: float,
) -> dict | None:
    if not text["enabled"] or not text["value"]:
        return None

    text_size = max(1, round(text["size"] * position_scale))
    stroke_width = max(0, round(text["stroke_width"] * position_scale))
    resolved_font_path = resolve_scene_text_font_path(text)
    font = load_scene_text_font(text, text_size, resolved_font_path)

    spacing = max(4, round(text_size * 0.2))
    stroke_for_text = stroke_width if text["stroke_enabled"] else 0
    draw_text_value = text["value"]
    text_layout = measure_multiline_text_layout(
        draw,
        text_value=draw_text_value,
        font=font,
        spacing=spacing,
        stroke_width=stroke_for_text,
    )
    origin_x = round(text["x"] * position_scale)
    origin_y = round(text["y"] * position_scale)

    text_origin = (
        origin_x + text_layout["draw_offset_x"],
        origin_y + text_layout["draw_offset_y"],
    )
    return {
        "text_origin": {
            "x": text_origin[0],
            "y": text_origin[1],
        },
        "text_box_rect": {
            "x": origin_x,
            "y": origin_y,
            "width": text_layout["width"],
            "height": text_layout["height"],
        },
        "wrapped_text": draw_text_value,
        "text_align": "left",
        "text_size": text_size,
        "line_spacing": spacing,
        "stroke_width": stroke_for_text,
        "resolved_font": resolved_font_path.name if resolved_font_path is not None else "",
    }


def parse_hex_color_rgba(color: str, opacity: float) -> tuple[int, int, int, int]:
    normalized = color.lstrip("#")
    return (
        int(normalized[0:2], 16),
        int(normalized[2:4], 16),
        int(normalized[4:6], 16),
        max(0, min(255, round(opacity * 255))),
    )


def load_message_band_input() -> dict:
    enabled_raw = request.form.get("message_band_enabled")
    enabled = enabled_raw in {"1", "true", "on"}
    x = int(request.form.get("message_band_x", "0"))
    y = int(request.form.get("message_band_y", "760"))
    width = int(request.form.get("message_band_width", "1920"))
    height = int(request.form.get("message_band_height", "220"))
    color = (request.form.get("message_band_color") or "#000000").strip() or "#000000"
    opacity = float(request.form.get("message_band_opacity", "0.65"))

    if width <= 0:
        raise ValueError("message_band_width must be greater than 0.")
    if height <= 0:
        raise ValueError("message_band_height must be greater than 0.")
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", color):
        raise ValueError("message_band_color is invalid.")
    if opacity < 0 or opacity > 1:
        raise ValueError("message_band_opacity must be between 0 and 1.")

    return {
        "enabled": enabled,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "color": color,
        "opacity": opacity,
    }


def build_message_band_layout(message_band: dict, position_scale: float) -> dict | None:
    if not message_band["enabled"]:
        return None
    return {
        "x": round(message_band["x"] * position_scale),
        "y": round(message_band["y"] * position_scale),
        "width": max(1, round(message_band["width"] * position_scale)),
        "height": max(1, round(message_band["height"] * position_scale)),
        "color": message_band["color"],
        "opacity": message_band["opacity"],
    }


def normalize_scene_layer_order(raw_order, extra_layer_ids: list[str] | None = None) -> list[str]:
    if isinstance(raw_order, str):
        try:
            parsed_order = json.loads(raw_order)
        except json.JSONDecodeError:
            parsed_order = raw_order.split(",")
    else:
        parsed_order = raw_order

    normalized = []
    if isinstance(parsed_order, list):
        for layer_id in parsed_order:
            layer_id = str(layer_id)
            if (
                layer_id in DEFAULT_SCENE_LAYER_ORDER
                or SCENE_CHARACTER_LAYER_RE.match(layer_id)
                or SCENE_TEXT_LAYER_RE.match(layer_id)
            ) and layer_id not in normalized:
                normalized.append(layer_id)
    for layer_id in DEFAULT_SCENE_LAYER_ORDER:
        if layer_id not in normalized:
            normalized.append(layer_id)
    for layer_id in extra_layer_ids or []:
        layer_id = str(layer_id)
        if (
            SCENE_CHARACTER_LAYER_RE.match(layer_id)
            or SCENE_TEXT_LAYER_RE.match(layer_id)
        ) and layer_id not in normalized:
            normalized.append(layer_id)
    return normalized


def normalize_scene_layer_order_mode(raw_mode) -> str:
    return raw_mode if raw_mode in {"aviutl", "after_effects"} else DEFAULT_SCENE_LAYER_ORDER_MODE


def resolve_scene_layer_draw_order(layer_order, layer_order_mode: str) -> list[str]:
    return normalize_scene_layer_order(layer_order)


def load_scene_layer_order(extra_layer_ids: list[str] | None = None) -> list[str]:
    return normalize_scene_layer_order(request.form.get("layer_order") or "", extra_layer_ids=extra_layer_ids)


def load_scene_layer_order_mode() -> str:
    return normalize_scene_layer_order_mode(request.form.get("layer_order_mode") or "")


def draw_message_band(result: Image.Image, message_band: dict, position_scale: float) -> None:
    layout = build_message_band_layout(message_band, position_scale)
    if layout is None:
        return
    band = Image.new("RGBA", result.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(band)
    draw.rectangle(
        (
            layout["x"],
            layout["y"],
            layout["x"] + layout["width"],
            layout["y"] + layout["height"],
        ),
        fill=parse_hex_color_rgba(layout["color"], layout["opacity"]),
    )
    result.alpha_composite(band)


def draw_scene_text(result: Image.Image, text: dict, position_scale: float) -> None:
    if text is None or not text["enabled"] or not text["value"]:
        return

    draw = ImageDraw.Draw(result)
    text_layout = build_scene_text_layout(draw, text=text, position_scale=position_scale)
    if text_layout is None:
        return

    resolved_font_name = text_layout.get("resolved_font") or ""
    resolved_font_path = resolve_font_file_path(resolved_font_name) if resolved_font_name else None
    font = load_scene_text_font(text, text_layout["text_size"], resolved_font_path)
    draw.multiline_text(
        (text_layout["text_origin"]["x"], text_layout["text_origin"]["y"]),
        text_layout["wrapped_text"],
        fill=text["color"],
        font=font,
        spacing=text_layout["line_spacing"],
        align=text_layout["text_align"],
        stroke_width=text_layout["stroke_width"],
        stroke_fill=text["stroke_color"] if text["stroke_enabled"] else None,
    )


def load_scene_inputs() -> tuple[Image.Image, list[dict], list[dict], dict, dict, list[str], str, str, str, str, int, int, int]:
    base_image = request.files.get("base_image")
    base_image_name = (request.form.get("base_image_name") or "").strip()
    canvas_preset = (request.form.get("canvas_preset") or "").strip()
    base_fit_mode = (request.form.get("base_fit_mode") or "contain").strip()
    base_scale = int(request.form.get("base_scale", "100"))
    base_x = int(request.form.get("base_x", "0"))
    base_y = int(request.form.get("base_y", "0"))

    if base_scale <= 0:
        raise ValueError("base_scale must be greater than 0.")
    if canvas_preset not in SCENE_CANVAS_PRESETS:
        raise ValueError("canvas_preset is invalid.")
    if base_fit_mode not in {"contain", "cover"}:
        raise ValueError("base_fit_mode is invalid.")

    if base_image is not None and base_image.filename:
        base_image_data = read_validated_image_upload(base_image, "base image")
        base = Image.open(BytesIO(base_image_data)).convert("RGBA")
    else:
        base_image_path = resolve_scene_base_output_path(base_image_name)
        if base_image_path is None:
            raise ValueError("base_image or base_image_name is required.")
        base = Image.open(base_image_path).convert("RGBA")

    characters = []
    for slot_number in load_scene_character_slot_numbers():
        if slot_number == 1:
            characters.append(
                load_scene_character_input(
                    "character1",
                    default_enabled=bool(
                        (request.form.get("cache_key") or "").strip()
                        or (request.form.get("portrait_filename") or "").strip()
                    ),
                    default_cache_key=(request.form.get("cache_key") or "").strip(),
                    default_portrait_filename=(request.form.get("portrait_filename") or "").strip(),
                    default_x=int(request.form.get("x", "0")),
                    default_y=int(request.form.get("y", "0")),
                    default_scale=int(request.form.get("scale", "100")),
                )
            )
        else:
            characters.append(load_scene_character_input(f"character{slot_number}"))
    active_characters = [character for character in characters if character["enabled"]]
    if not active_characters:
        raise ValueError("at least one character must be enabled.")

    texts = load_scene_text_inputs()
    message_band = load_message_band_input()
    bubble_overlay = load_scene_bubble_overlay_input()
    layer_order = load_scene_layer_order(extra_layer_ids=[text["layer_id"] for text in texts])
    layer_order_mode = load_scene_layer_order_mode()
    preview_stem = "scene"
    return base, active_characters, texts, message_band, bubble_overlay, layer_order, layer_order_mode, preview_stem, canvas_preset, base_fit_mode, base_scale, base_x, base_y


def fit_image_to_canvas(
    image: Image.Image,
    canvas_size: tuple[int, int],
    fit_mode: str,
    base_scale: int,
    base_x: int,
    base_y: int,
    *,
    preview: bool,
) -> tuple[Image.Image, tuple[int, int]]:
    canvas_width, canvas_height = canvas_size
    if fit_mode == "cover":
        fit_scale = max(canvas_width / image.width, canvas_height / image.height)
    else:
        fit_scale = min(canvas_width / image.width, canvas_height / image.height)

    preview_scale = SCENE_PREVIEW_SCALE if preview else 1.0
    scale = fit_scale * (base_scale / 100)
    resized_size = (
        max(1, round(image.width * scale)),
        max(1, round(image.height * scale)),
    )
    resized = image.resize(resized_size, Image.Resampling.LANCZOS)
    offset = (
        (canvas_width - resized.width) // 2,
        (canvas_height - resized.height) // 2,
    )
    offset = (
        offset[0] + round(base_x * preview_scale),
        offset[1] + round(base_y * preview_scale),
    )
    return resized, offset


def build_canvas_size(canvas_preset: str, preview: bool) -> tuple[int, int]:
    width, height = SCENE_CANVAS_PRESETS[canvas_preset]
    if not preview:
        return width, height
    return (
        max(1, round(width * SCENE_PREVIEW_SCALE)),
        max(1, round(height * SCENE_PREVIEW_SCALE)),
    )


def compose_scene(
    base: Image.Image,
    characters: list[dict],
    texts: list[dict],
    message_band: dict,
    bubble_overlay: dict,
    layer_order: list[str],
    layer_order_mode: str,
    canvas_preset: str,
    base_fit_mode: str,
    base_scale: int,
    base_x: int,
    base_y: int,
    *,
    preview: bool,
) -> Image.Image:
    canvas_size = build_canvas_size(canvas_preset, preview)
    position_scale = SCENE_PREVIEW_SCALE if preview else 1.0
    result = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    fitted_base, base_offset = fit_image_to_canvas(
        base,
        canvas_size,
        base_fit_mode,
        base_scale,
        base_x,
        base_y,
        preview=preview,
    )
    characters_by_layer = {character["layer_id"]: character for character in characters}
    texts_by_layer = {text["layer_id"]: text for text in texts}

    def draw_base_layer() -> None:
        result.alpha_composite(fitted_base, base_offset)

    def draw_character_layer(character: dict | None) -> None:
        if character is None:
            return
        portrait_image = character["portrait"]
        portrait_scale = (character["scale"] / 100) * position_scale
        if portrait_scale != 1.0:
            scaled_width = max(1, round(portrait_image.width * portrait_scale))
            scaled_height = max(1, round(portrait_image.height * portrait_scale))
            portrait_image = portrait_image.resize((scaled_width, scaled_height), Image.Resampling.LANCZOS)

        result.alpha_composite(
            portrait_image,
            (
                round(character["x"] * position_scale),
                round(character["y"] * position_scale),
            ),
        )

    def draw_overlay_layer() -> None:
        bubble_overlay_layout = build_scene_bubble_overlay_layout(bubble_overlay, position_scale)
        if bubble_overlay_layout is None:
            return
        if bubble_overlay_layout["source_type"] == "asset":
            overlay_image = rasterize_bubble_overlay_asset(
                bubble_overlay_layout["asset"],
                bubble_overlay_layout["width"],
                bubble_overlay_layout["height"],
            )
        else:
            overlay_path = resolve_scene_overlay_output_path(bubble_overlay_layout["upload_file"])
            if overlay_path is None:
                raise FileNotFoundError(f"scene overlay image not found: {bubble_overlay_layout['upload_file']}")
            overlay_image = Image.open(overlay_path).convert("RGBA").resize(
                (bubble_overlay_layout["width"], bubble_overlay_layout["height"]),
                Image.Resampling.LANCZOS,
            )
        result.alpha_composite(overlay_image, (bubble_overlay_layout["x"], bubble_overlay_layout["y"]))

    draw_actions = {
        "base_image": draw_base_layer,
        "message_band": lambda: draw_message_band(result, message_band, position_scale),
        "overlay_image": draw_overlay_layer,
    }
    # Dynamic text slots may exist even when a legacy or damaged POST omits them from layer_order.
    draw_order = normalize_scene_layer_order(layer_order, extra_layer_ids=list(texts_by_layer.keys()))
    for layer_id in resolve_scene_layer_draw_order(draw_order, layer_order_mode):
        if SCENE_CHARACTER_LAYER_RE.match(layer_id):
            draw_character_layer(characters_by_layer.get(layer_id))
            continue
        if SCENE_TEXT_LAYER_RE.match(layer_id):
            draw_scene_text(result, texts_by_layer.get(layer_id), position_scale)
            continue
        draw_action = draw_actions.get(layer_id)
        if draw_action is not None:
            draw_action()
    return result


@app.get("/")
def index():
    return render_portrait_page()


@app.get("/service-worker.js")
def service_worker():
    return send_from_directory(app.static_folder, "service-worker.js", max_age=0)


@app.get("/scene")
def scene_page():
    selected_portrait_filename = (request.args.get("portrait") or "").strip()
    selected_portrait_slot_raw = (request.args.get("slot") or "").strip()
    selected_portrait_slot = int(selected_portrait_slot_raw) if selected_portrait_slot_raw.isdigit() and int(selected_portrait_slot_raw) >= 1 else 1
    selected_portrait_path = resolve_portrait_output_path(selected_portrait_filename)
    if selected_portrait_path is None:
        return render_scene_page()

    return render_scene_page(
        selected_portrait_filename=selected_portrait_path.name,
        selected_portrait_url=f"/outputs/{selected_portrait_path.relative_to(OUTPUTS_DIR)}",
        selected_portrait_slot=selected_portrait_slot,
    )


@app.get("/gallery")
def gallery_page():
    return render_gallery_page()


@app.get("/settings")
def settings_page():
    return render_settings_page()


@app.post("/api/files/psd/upload")
def psd_upload_api():
    try:
        uploaded_file = request.files.get("file")
        if uploaded_file is None or not uploaded_file.filename:
            raise ValueError("file is required.")

        validate_upload_file(uploaded_file, ALLOWED_PSD_EXTENSIONS, MAX_PSD_UPLOAD_BYTES, "PSD")
        output_name = sanitize_psd_filename(uploaded_file.filename)
        output_path = build_psd_storage_path(output_name)
        if output_path.exists():
            raise ValueError(f"PSD already exists: {output_name}")

        DATA_PSD_DIR.mkdir(parents=True, exist_ok=True)
        uploaded_file.save(output_path)
        return jsonify({"ok": True, "name": output_name})
    except (OSError, ValueError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/files/font/upload")
def font_upload_api():
    try:
        uploaded_file = request.files.get("file")
        if uploaded_file is None or not uploaded_file.filename:
            raise ValueError("file is required.")

        validate_upload_file(uploaded_file, ALLOWED_FONT_EXTENSIONS, MAX_FONT_UPLOAD_BYTES, "font")
        output_name = sanitize_font_filename(uploaded_file.filename)
        output_path = build_font_storage_path(output_name)
        if output_path.exists():
            raise ValueError(f"font already exists: {output_name}")

        DATA_FONT_DIR.mkdir(parents=True, exist_ok=True)
        uploaded_file.save(output_path)
        return jsonify({"ok": True, "name": output_name})
    except (OSError, ValueError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.get("/api/files/font/list")
def font_list_api():
    return jsonify({"ok": True, "items": list_font_file_items()})


@app.get("/api/overlay_assets/list")
def overlay_assets_list_api():
    return jsonify(
        {
            "ok": True,
            "items": list_registered_overlay_asset_items(),
            "metadata_path": str(OVERLAY_ASSETS_METADATA_PATH.relative_to(ROOT_DIR)),
            "asset_dir": str(OVERLAY_IMAGE_LIBRARY_DIR.relative_to(ROOT_DIR)),
        }
    )


@app.post("/api/overlay_assets/upload")
def overlay_assets_upload_api():
    try:
        uploaded_file = request.files.get("file")
        record = save_overlay_asset_image(uploaded_file)
        return jsonify({"ok": True, "item": record})
    except (OSError, ValueError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/overlay_assets/delete")
def overlay_assets_delete_api():
    try:
        data = request.get_json(silent=True) or {}
        asset_id = (data.get("id") or "").strip()
        record = delete_overlay_asset_image(asset_id)
        return jsonify({"ok": True, "item": record})
    except (FileNotFoundError, OSError, ValueError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/files/font/delete")
def font_delete_api():
    try:
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        if not name:
            raise ValueError("name is required.")

        deleted_name = delete_font_file(name)
        return jsonify({"ok": True, "name": deleted_name})
    except (OSError, ValueError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.get("/fonts/<path:filename>")
def font_file(filename: str):
    try:
        font_path = resolve_font_file_path(filename)
        if not font_path.exists() or not font_path.is_file():
            raise FileNotFoundError(filename)
        return send_from_directory(DATA_FONT_DIR, font_path.name)
    except (FileNotFoundError, OSError, ValueError):
        return jsonify({"ok": False, "error": "font file not found."}), 404


@app.get("/api/files/psd/list")
def psd_list_api():
    return jsonify({"ok": True, "items": list_psd_file_items()})


@app.post("/api/files/psd/delete")
def psd_delete_api():
    try:
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        if not name:
            raise ValueError("name is required.")

        result = delete_psd_with_cache(name)
        return jsonify({"ok": True, **result})
    except (FileNotFoundError, OSError, ValueError, json.JSONDecodeError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/gallery/delete")
def gallery_delete_api():
    try:
        data = request.get_json(silent=True) or {}
        name = (data.get("name") or "").strip()
        kind = (data.get("kind") or "portrait").strip()
        deleted_name = delete_gallery_output(name, kind)
        return jsonify({"ok": True, "name": deleted_name, "kind": kind})
    except (OSError, ValueError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.get("/api/settings/list")
def settings_list_api():
    return jsonify({"ok": True, "items": list_settings_records()})


@app.get("/api/settings")
def settings_get_api():
    try:
        settings_name = request.args.get("settings_name", "").strip()
        if not settings_name:
            raise ValueError("settings_name is required.")

        record = load_settings_record(settings_name)
        return jsonify(
            {
                "ok": True,
                "settings_name": record["settings_name"],
                "updated_at": record["updated_at"],
                "payload": record["payload"],
            }
        )
    except (FileNotFoundError, OSError, ValueError, json.JSONDecodeError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/settings")
def settings_save_api():
    try:
        data = request.get_json(silent=True) or {}
        settings_name = (data.get("settings_name") or "").strip()
        payload = data.get("payload")
        if not settings_name:
            raise ValueError("settings_name is required.")
        if not isinstance(payload, dict):
            raise ValueError("payload must be an object.")

        record = save_settings_payload(settings_name, payload)
        return jsonify(
            {
                "ok": True,
                "settings_name": record["settings_name"],
                "updated_at": record["updated_at"],
            }
        )
    except (OSError, ValueError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/settings/rename")
def settings_rename_api():
    try:
        data = request.get_json(silent=True) or {}
        settings_name = (data.get("settings_name") or "").strip()
        new_settings_name = (data.get("new_settings_name") or "").strip()
        if not settings_name:
            raise ValueError("settings_name is required.")
        if not new_settings_name:
            raise ValueError("new_settings_name is required.")

        record = rename_settings_record(settings_name, new_settings_name)
        return jsonify(
            {
                "ok": True,
                "settings_name": record["settings_name"],
                "updated_at": record["updated_at"],
            }
        )
    except (FileNotFoundError, OSError, ValueError, json.JSONDecodeError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/settings/delete")
def settings_delete_api():
    try:
        data = request.get_json(silent=True) or {}
        settings_name = (data.get("settings_name") or "").strip()
        if not settings_name:
            raise ValueError("settings_name is required.")

        delete_settings_record(settings_name)
        return jsonify({"ok": True, "settings_name": sanitize_settings_name(settings_name)})
    except (FileNotFoundError, OSError, ValueError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/trash/empty")
def trash_empty_api():
    try:
        deleted_count = empty_trash()
        return jsonify({"ok": True, "deleted_count": deleted_count, "trash_item_count": 0})
    except OSError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.get("/composite")
def legacy_scene_page_redirect():
    return redirect(url_for("scene_page"), code=302)


@app.post("/load_psd")
def load_psd():
    selected_psd = request.form.get("psd_path", "").strip()
    if not selected_psd:
        return render_portrait_page(error_message="PSD を選択してください。")

    try:
        psd_path = resolve_psd_path(selected_psd)
        payload, layers_json_path = load_or_build_psd_layers(psd_path)
        return render_portrait_page(
            selected_psd=selected_psd,
            layers_json=str(layers_json_path.relative_to(ROOT_DIR)),
            cache_key=payload["psd_source"]["cache_key"],
            layer_tree=build_layer_tree(payload["layers"]),
            layer_preview=build_layer_preview_payload(payload),
        )
    except (FileNotFoundError, RuntimeError, ValueError) as exc:
        return render_portrait_page(selected_psd=selected_psd, error_message=str(exc))


@app.post("/compose")
def compose():
    selected_psd = request.form.get("psd_path", "").strip()
    layers_json = request.form.get("layers_json", "").strip()
    selected_layer_ids = request.form.getlist("layer_ids")

    if not selected_psd or not layers_json:
        return render_portrait_page(error_message="PSD を読み込んでから合成してください。")
    if not selected_layer_ids:
        try:
            payload = load_layers_json(resolve_project_path(layers_json))
            return render_portrait_page(
                selected_psd=selected_psd,
                layers_json=layers_json,
                cache_key=payload["psd_source"]["cache_key"],
                layer_tree=build_layer_tree(payload["layers"]),
                layer_preview=build_layer_preview_payload(payload),
                error_message="合成するレイヤーを1つ以上選択してください。",
            )
        except (FileNotFoundError, ValueError, json.JSONDecodeError) as exc:
            return render_portrait_page(
                selected_psd=selected_psd,
                layers_json=layers_json,
                error_message=str(exc),
            )

    try:
        layers_json_path = resolve_project_path(layers_json)
        payload = load_layers_json(layers_json_path)
        output_image = execute_compose(layers_json_path, selected_layer_ids, "preview")
        return render_portrait_page(
            selected_psd=selected_psd,
            layers_json=layers_json,
            cache_key=payload["psd_source"]["cache_key"],
            layer_tree=build_layer_tree(payload["layers"]),
            layer_preview=build_layer_preview_payload(payload),
            selected_layer_ids=selected_layer_ids,
            output_image=output_image,
        )
    except (FileNotFoundError, RuntimeError, ValueError, json.JSONDecodeError) as exc:
        return render_portrait_page(
            selected_psd=selected_psd,
            layers_json=layers_json,
            selected_layer_ids=selected_layer_ids,
            error_message=str(exc),
        )


@app.post("/api/compose")
def compose_api():
    try:
        data = request.get_json(silent=True) or {}
        cache_key = (data.get("cache_key") or "").strip()
        checked_ids = data.get("checked_ids") or []

        if not cache_key:
            raise ValueError("cache_key is required.")
        if not isinstance(checked_ids, list):
            raise ValueError("checked_ids must be a list.")

        selected_layer_ids = [str(int(layer_id)) for layer_id in checked_ids]
        if not selected_layer_ids:
            raise ValueError("checked_ids must contain at least one layer id.")

        layers_json_path = ROOT_DIR / "cache" / cache_key / "layers.json"
        payload = load_layers_json(layers_json_path)
        ordered_layer_ids = order_layer_ids_for_compose(payload["layers"], selected_layer_ids)
        preview_png_path = PREVIEW_OUTPUTS_DIR / f"{cache_key}.png"
        preview_json_path = PREVIEW_OUTPUTS_DIR / f"{cache_key}.json"
        if preview_png_path.exists() and preview_json_path.exists():
            try:
                preview_metadata = load_layers_json(preview_json_path)
                previous_layer_ids = [str(int(layer_id)) for layer_id in preview_metadata.get("layer_ids", [])]
                if previous_layer_ids == ordered_layer_ids:
                    return jsonify(
                        {
                            "ok": True,
                            "image_url": f"/outputs/{preview_png_path.relative_to(OUTPUTS_DIR)}",
                        }
                    )
            except (OSError, ValueError, TypeError, json.JSONDecodeError):
                pass

        output_image = execute_compose(layers_json_path, selected_layer_ids, "preview")
        return jsonify({"ok": True, "image_url": f"/outputs/{output_image}"})
    except (FileNotFoundError, RuntimeError, ValueError, json.JSONDecodeError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.get("/api/compose_status")
def compose_status_api():
    try:
        cache_key = (request.args.get("cache_key") or "").strip()
        if not re.fullmatch(r"psd_[0-9a-f]{12}", cache_key):
            raise ValueError("cache_key is invalid.")

        preview_png_path = PREVIEW_OUTPUTS_DIR / f"{cache_key}.png"
        signature = load_preview_layer_signature(cache_key)
        return jsonify(
            {
                "ok": True,
                "cache_key": cache_key,
                "signature": signature,
                "preview_available": preview_png_path.exists(),
                "image_url": f"/outputs/{preview_png_path.relative_to(OUTPUTS_DIR)}" if preview_png_path.exists() else "",
            }
        )
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/save_portrait")
def save_portrait_api():
    try:
        data = request.get_json(silent=True) or {}
        cache_key = (data.get("cache_key") or "").strip()
        checked_ids = data.get("checked_ids") or []
        portrait_name = data.get("name")

        if not cache_key:
            raise ValueError("cache_key is required.")
        if not isinstance(checked_ids, list):
            raise ValueError("checked_ids must be a list.")
        if portrait_name is not None and not isinstance(portrait_name, str):
            raise ValueError("name must be a string.")

        selected_layer_ids = [str(int(layer_id)) for layer_id in checked_ids]
        if not selected_layer_ids:
            raise ValueError("checked_ids must contain at least one layer id.")

        layers_json_path = ROOT_DIR / "cache" / cache_key / "layers.json"
        output_image = execute_compose(
            layers_json_path,
            selected_layer_ids,
            "portrait",
            sanitize_portrait_name(portrait_name or ""),
        )
        return jsonify({"ok": True, "image_url": f"/outputs/{output_image}"})
    except (FileNotFoundError, RuntimeError, ValueError, json.JSONDecodeError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/scene")
def scene_api():
    try:
        (
            base,
            characters,
            texts,
            message_band,
            bubble_overlay,
            layer_order,
            layer_order_mode,
            _,
            canvas_preset,
            base_fit_mode,
            base_scale,
            base_x,
            base_y,
        ) = load_scene_inputs()
        result = compose_scene(
            base,
            characters,
            texts,
            message_band,
            bubble_overlay,
            layer_order,
            layer_order_mode,
            canvas_preset,
            base_fit_mode,
            base_scale,
            base_x,
            base_y,
            preview=False,
        )
        output_path = build_output_history_path(SCENE_OUTPUTS_DIR)
        result.save(output_path)

        return jsonify({"ok": True, "image_url": f"/outputs/{output_path.relative_to(OUTPUTS_DIR)}"})
    except (FileNotFoundError, OSError, ValueError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/scene_base_image")
def scene_base_image_api():
    try:
        base_image = request.files.get("base_image")
        if base_image is None or not base_image.filename:
            raise ValueError("base_image is required.")

        base_image_name, base_image_url, base_image_display_name = save_scene_base_image(base_image)
        return jsonify(
            {
                "ok": True,
                "base_image_name": base_image_name,
                "base_image_url": base_image_url,
                "base_image_display_name": base_image_display_name,
            }
        )
    except (OSError, ValueError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/scene_overlay_image")
def scene_overlay_image_api():
    try:
        overlay_image = request.files.get("overlay_image")
        if overlay_image is None or not overlay_image.filename:
            raise ValueError("overlay_image is required.")

        overlay_name, overlay_url, overlay_display_name = save_scene_overlay_image(overlay_image)
        return jsonify(
            {
                "ok": True,
                "overlay_name": overlay_name,
                "overlay_url": overlay_url,
                "overlay_display_name": overlay_display_name,
            }
        )
    except (OSError, ValueError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/composite")
def legacy_scene_api():
    return scene_api()


@app.post("/api/scene_preview")
def scene_preview_api():
    try:
        (
            base,
            characters,
            texts,
            message_band,
            bubble_overlay,
            layer_order,
            layer_order_mode,
            cache_key,
            canvas_preset,
            base_fit_mode,
            base_scale,
            base_x,
            base_y,
        ) = load_scene_inputs()
        result = compose_scene(
            base,
            characters,
            texts,
            message_band,
            bubble_overlay,
            layer_order,
            layer_order_mode,
            canvas_preset,
            base_fit_mode,
            base_scale,
            base_x,
            base_y,
            preview=True,
        )
        output_path = build_overwrite_output_path(SCENE_PREVIEW_OUTPUTS_DIR, cache_key)
        result.save(output_path)
        layout_canvas = Image.new("RGBA", build_canvas_size(canvas_preset, True), (0, 0, 0, 0))
        layout_draw = ImageDraw.Draw(layout_canvas)
        preview_message_band_layout = build_message_band_layout(message_band, SCENE_PREVIEW_SCALE)
        preview_bubble_overlay_layout = build_scene_bubble_overlay_layout(bubble_overlay, SCENE_PREVIEW_SCALE)
        if preview_bubble_overlay_layout is not None:
            overlay_output_path = build_overwrite_output_path(SCENE_PREVIEW_OUTPUTS_DIR, f"{cache_key}_overlay")
            rasterize_bubble_overlay_asset(
                preview_bubble_overlay_layout["asset"],
                preview_bubble_overlay_layout["width"],
                preview_bubble_overlay_layout["height"],
            ).save(overlay_output_path)
            preview_bubble_overlay_layout["image_url"] = f"/outputs/{overlay_output_path.relative_to(OUTPUTS_DIR)}"
        preview_text_layouts = {
            text["state_key"]: build_scene_text_layout(layout_draw, text=text, position_scale=SCENE_PREVIEW_SCALE)
            for text in texts
        }
        return jsonify(
            {
                "ok": True,
                "image_url": f"/outputs/{output_path.relative_to(OUTPUTS_DIR)}",
                "layout": {
                    "bubble_overlay": preview_bubble_overlay_layout,
                    "message_band": preview_message_band_layout,
                    "layer_order": normalize_scene_layer_order(layer_order),
                    "layer_order_mode": normalize_scene_layer_order_mode(layer_order_mode),
                    **preview_text_layouts,
                },
            }
        )
    except (FileNotFoundError, OSError, ValueError) as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400


@app.post("/api/composite_preview")
def legacy_scene_preview_api():
    return scene_preview_api()


@app.get("/outputs/<path:filename>")
def output_file(filename: str):
    return send_from_directory(OUTPUTS_DIR, filename)


@app.get("/cache/<cache_key>/layers/<path:filename>")
def cached_layer_file(cache_key: str, filename: str):
    if not re.fullmatch(r"psd_[0-9a-f]{12}", cache_key):
        abort(404)

    safe_filename = Path(filename).name
    if filename != safe_filename or Path(safe_filename).suffix.lower() != ".png":
        abort(404)

    return send_from_directory(CACHE_DIR / cache_key / "layers", safe_filename)


@app.get("/data/src/<path:filename>")
def data_src_file(filename: str):
    try:
        overlay_path = resolve_scene_overlay_output_path(filename)
        if overlay_path is None:
            raise FileNotFoundError(filename)
        return send_from_directory(DATA_SRC_DIR, overlay_path.name)
    except (FileNotFoundError, OSError, ValueError):
        return jsonify({"ok": False, "error": "source file not found."}), 404


@app.get("/assets/overlay_images/<path:filename>")
def overlay_asset_image_file(filename: str):
    try:
        safe_name = Path(filename or "").name
        if safe_name != filename or Path(safe_name).suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
            raise ValueError("asset file is invalid.")
        asset_path = (OVERLAY_IMAGE_LIBRARY_DIR / safe_name).resolve()
        asset_path.relative_to(OVERLAY_IMAGE_LIBRARY_DIR.resolve())
        if not asset_path.exists() or not asset_path.is_file():
            raise FileNotFoundError(filename)
        return send_from_directory(OVERLAY_IMAGE_LIBRARY_DIR, asset_path.name)
    except (FileNotFoundError, OSError, ValueError):
        return jsonify({"ok": False, "error": "overlay asset file not found."}), 404


if __name__ == "__main__":
    host = os.getenv("AKARI_HOST", "0.0.0.0")
    debug = os.getenv("AKARI_DEBUG", "0") == "1"

    app.run(host=host, port=5014, debug=debug)
