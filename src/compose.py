from __future__ import annotations

import argparse
from datetime import datetime
import json
import logging
from pathlib import Path

from PIL import Image, ImageChops


ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUTS_DIR = ROOT_DIR / "outputs"
OUTPUT_KINDS = ("preview", "portrait", "composite")
LOGGER = logging.getLogger(__name__)
COMPOSE_METADATA_VERSION = "blend-mode-v1"


def relative_to_root(path: Path) -> str:
    absolute_path = path if path.is_absolute() else ROOT_DIR / path
    return str(absolute_path.resolve().relative_to(ROOT_DIR))


def load_layers_json(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"layers.json not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def build_layer_index(layers: list[dict]) -> dict[int, dict]:
    return {layer["id"]: layer for layer in layers}


def resolve_cache_png(cache_png: str | None) -> Path | None:
    if cache_png is None:
        return None
    return ROOT_DIR / cache_png


def validate_layer(layer_id: int, layer: dict) -> Path:
    if layer["type"] != "layer":
        raise ValueError(f"layer id {layer_id} is a group and cannot be composited.")

    cache_png = resolve_cache_png(layer["cache_png"])
    if cache_png is None:
        raise ValueError(f"layer id {layer_id} has no cache_png and cannot be composited.")
    if not cache_png.exists():
        raise FileNotFoundError(f"cache_png not found for layer id {layer_id}: {cache_png}")
    return cache_png


def normalize_blend_mode(blend_mode: object) -> str:
    value = str(blend_mode or "normal").strip().lower()
    if "." in value:
        value = value.rsplit(".", 1)[-1]
    return value or "normal"


def apply_layer_opacity(image: Image.Image, opacity: object) -> Image.Image:
    try:
        opacity_value = int(opacity)
    except (TypeError, ValueError):
        return image

    opacity_value = max(0, min(255, opacity_value))
    if opacity_value == 255:
        return image

    adjusted = image.copy()
    alpha = adjusted.getchannel("A").point(lambda value: round(value * opacity_value / 255))
    adjusted.putalpha(alpha)
    return adjusted


def alpha_composite_multiply(canvas: Image.Image, source: Image.Image) -> Image.Image:
    backdrop = canvas.convert("RGBA")
    source = source.convert("RGBA")

    backdrop_rgb = backdrop.convert("RGB")
    source_rgb = source.convert("RGB")
    source_alpha = source.getchannel("A")

    multiplied_rgb = ImageChops.multiply(backdrop_rgb, source_rgb)
    blended_source_rgb = Image.composite(multiplied_rgb, source_rgb, backdrop.getchannel("A"))
    blended_source = blended_source_rgb.convert("RGBA")
    blended_source.putalpha(source_alpha)

    result = backdrop.copy()
    result.alpha_composite(blended_source)
    return result


def composite_layer(canvas: Image.Image, image: Image.Image, layer: dict) -> Image.Image:
    image = apply_layer_opacity(image, layer.get("opacity"))
    blend_mode = normalize_blend_mode(layer.get("blend_mode"))

    if blend_mode in {"normal", "pass_through"}:
        canvas.alpha_composite(image)
        return canvas
    if blend_mode == "multiply":
        return alpha_composite_multiply(canvas, image)

    LOGGER.warning("unsupported PSD blend_mode '%s'; using normal alpha composite", blend_mode)
    canvas.alpha_composite(image)
    return canvas


def ensure_output_dirs(outputs_root: Path) -> None:
    outputs_root.mkdir(parents=True, exist_ok=True)
    for output_kind in OUTPUT_KINDS:
        (outputs_root / output_kind).mkdir(parents=True, exist_ok=True)


def build_unique_named_png_path(target_dir: Path, output_name: str) -> Path:
    candidate = target_dir / f"{output_name}.png"
    if not candidate.exists():
        return candidate

    suffix = 1
    while True:
        candidate = target_dir / f"{output_name}_{suffix}.png"
        if not candidate.exists():
            return candidate
        suffix += 1


def build_output_paths(
    outputs_root: Path,
    output_kind: str,
    cache_key: str,
    output_name: str | None = None,
) -> tuple[Path, Path | None, str]:
    now = datetime.now()
    target_dir = outputs_root / output_kind
    if output_kind == "preview":
        return (
            target_dir / f"{cache_key}.png",
            target_dir / f"{cache_key}.json",
            now.isoformat(timespec="seconds"),
        )

    if output_kind == "portrait" and output_name:
        return (
            build_unique_named_png_path(target_dir, output_name),
            None,
            now.isoformat(timespec="seconds"),
        )

    timestamp = now.strftime("%y%m%d_%H%M%S")
    return (
        target_dir / f"{timestamp}.png",
        None if output_kind == "portrait" else target_dir / f"{timestamp}.json",
        now.isoformat(timespec="seconds"),
    )


def composite_layers(layers_json_path: Path, layer_ids: list[int]) -> tuple[Image.Image, dict]:
    payload = load_layers_json(layers_json_path)
    canvas_width = payload["canvas"]["width"]
    canvas_height = payload["canvas"]["height"]
    layer_index = build_layer_index(payload["layers"])
    canvas = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))

    for layer_id in layer_ids:
        layer = layer_index.get(layer_id)
        if layer is None:
            raise ValueError(f"layer id {layer_id} was not found in {layers_json_path}.")

        cache_png = validate_layer(layer_id, layer)
        image = Image.open(cache_png).convert("RGBA")

        if image.size != canvas.size:
            raise ValueError(
                f"layer id {layer_id} cache size {image.size} does not match canvas size {canvas.size}. "
                "Current cache data does not include layer position metadata, so cropped layer caches "
                "cannot be composited correctly."
            )

        canvas = composite_layer(canvas, image, layer)

    return canvas, payload


def build_metadata(payload: dict, layers_json_path: Path, layer_ids: list[int], created_at: str) -> dict:
    psd_source = payload["psd_source"]
    return {
        "psd_path": psd_source["path"],
        "psd_filename": psd_source["filename"],
        "cache_key": psd_source["cache_key"],
        "layers_json": relative_to_root(layers_json_path),
        "layer_ids": layer_ids,
        "compose_version": COMPOSE_METADATA_VERSION,
        "created_at": created_at,
    }


def parse_args():
    parser = argparse.ArgumentParser(
        description="Composite cached layer PNG files listed in layers.json and save output history in outputs/."
    )
    parser.add_argument("--layers-json", type=Path, required=True)
    parser.add_argument("--layer-ids", type=int, nargs="+", required=True)
    parser.add_argument("--outputs-dir", type=Path, default=DEFAULT_OUTPUTS_DIR)
    parser.add_argument("--output-kind", choices=OUTPUT_KINDS, default="portrait")
    parser.add_argument("--output-name")
    return parser.parse_args()


def main():
    args = parse_args()
    try:
        ensure_output_dirs(args.outputs_dir)
        image, payload = composite_layers(args.layers_json, args.layer_ids)
        cache_key = payload["psd_source"]["cache_key"]
        output_png_path, output_json_path, created_at = build_output_paths(
            args.outputs_dir,
            args.output_kind,
            cache_key,
            args.output_name,
        )
        image.save(output_png_path)
        if output_json_path is not None:
            metadata = build_metadata(payload, args.layers_json, args.layer_ids, created_at)
            output_json_path.write_text(
                json.dumps(metadata, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
    except (FileNotFoundError, ValueError, KeyError, json.JSONDecodeError) as exc:
        raise SystemExit(f"error: {exc}") from exc

    print(f"layers.json: {args.layers_json}")
    print(f"output kind: {args.output_kind}")
    print(f"output png: {output_png_path}")
    if output_json_path is not None:
        print(f"output json: {output_json_path}")
    print(f"layer ids: {' '.join(str(layer_id) for layer_id in args.layer_ids)}")


if __name__ == "__main__":
    main()
