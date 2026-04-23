from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image
from psd_tools import PSDImage


ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_PSD_PATH = ROOT_DIR / "data" / "psd" / "sample.psd"
DEFAULT_CACHE_ROOT = ROOT_DIR / "cache"


def relative_to_root(path: Path) -> str:
    absolute_path = path if path.is_absolute() else ROOT_DIR / path
    return str(absolute_path.relative_to(ROOT_DIR))


def build_cache_key(filename: str, size: int, mtime: int) -> str:
    seed = f"{filename}:{size}:{mtime}".encode("utf-8")
    return f"psd_{hashlib.sha1(seed).hexdigest()[:12]}"


def build_source_path(psd_path: Path, actual_path: Path) -> str:
    absolute_path = psd_path if psd_path.is_absolute() else ROOT_DIR / psd_path
    relative_path = absolute_path.relative_to(ROOT_DIR)
    return str(relative_path.parent / actual_path.name)


def normalize_blend_mode(blend_mode: object) -> str:
    value = str(blend_mode or "normal").strip().lower()
    if "." in value:
        value = value.rsplit(".", 1)[-1]
    return value or "normal"


def save_layer_cache(layer, canvas_size: tuple[int, int], output_path: Path) -> None:
    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    image = layer.topil()
    if image is not None:
        image = image.convert("RGBA")
        left, top, _, _ = layer.bbox
        canvas.alpha_composite(image, dest=(left, top))
    canvas.save(output_path)


def build_layers(items, parent_id, parent_path, depth, nodes, layers_dir, cache_key, canvas_size, next_id):
    children_ids = []

    for layer in items:
        layer_id = next_id[0]
        next_id[0] += 1

        path = [*parent_path, layer.name]
        is_group = layer.is_group()
        cache_png = None
        if not is_group:
            output_path = layers_dir / f"{layer_id}.png"
            save_layer_cache(layer, canvas_size, output_path)
            cache_png = str(Path("cache") / cache_key / "layers" / f"{layer_id}.png")

        node = {
            "id": layer_id,
            "name": layer.name,
            "type": "group" if is_group else "layer",
            "visible": layer.is_visible(),
            "blend_mode": normalize_blend_mode(getattr(layer, "blend_mode", None)),
            "opacity": getattr(layer, "opacity", 255),
            "depth": depth,
            "parent_id": parent_id,
            "children": [],
            "path": path,
            "cache_png": cache_png,
        }
        nodes.append(node)
        children_ids.append(layer_id)

        if is_group:
            node["children"] = build_layers(
                layer,
                parent_id=layer_id,
                parent_path=path,
                depth=depth + 1,
                nodes=nodes,
                layers_dir=layers_dir,
                cache_key=cache_key,
                canvas_size=canvas_size,
                next_id=next_id,
            )

    return children_ids


def build_payload(psd_path: Path, cache_root: Path) -> tuple[dict, Path]:
    source_path = psd_path if psd_path.is_absolute() else ROOT_DIR / psd_path
    actual_path = source_path.resolve()
    stat = actual_path.stat()
    cache_key = build_cache_key(actual_path.name, stat.st_size, int(stat.st_mtime))
    cache_dir = cache_root / cache_key
    layers_dir = cache_dir / "layers"
    layers_dir.mkdir(parents=True, exist_ok=True)
    psd = PSDImage.open(actual_path)

    nodes = []
    build_layers(
        psd,
        parent_id=None,
        parent_path=[],
        depth=0,
        nodes=nodes,
        layers_dir=layers_dir,
        cache_key=cache_key,
        canvas_size=(psd.width, psd.height),
        next_id=[1],
    )

    payload = {
        "psd_source": {
            "path": build_source_path(psd_path, actual_path),
            "filename": actual_path.name,
            "mtime": int(stat.st_mtime),
            "size": stat.st_size,
            "cache_key": cache_key,
        },
        "canvas": {
            "width": psd.width,
            "height": psd.height,
        },
        "layers": nodes,
    }
    return payload, cache_dir


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate layers.json and PNG cache for leaf PSD layers from data/psd by default."
    )
    parser.add_argument("--psd", type=Path, default=DEFAULT_PSD_PATH)
    parser.add_argument("--cache-root", type=Path, default=DEFAULT_CACHE_ROOT)
    return parser.parse_args()


def main():
    args = parse_args()
    if not args.psd.exists():
        raise FileNotFoundError(f"PSD file not found: {args.psd}")

    args.cache_root.mkdir(parents=True, exist_ok=True)
    payload, cache_dir = build_payload(args.psd, args.cache_root.resolve())

    json_path = cache_dir / "layers.json"
    json_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    layer_count = sum(1 for layer in payload["layers"] if layer["type"] == "layer")
    group_count = sum(1 for layer in payload["layers"] if layer["type"] == "group")

    print(f"PSD: {args.psd}")
    print(f"layers.json: {json_path}")
    print(f"cache key: {payload['psd_source']['cache_key']}")
    print(f"layer cache dir: {cache_dir / 'layers'}")
    print("default PSD location: data/psd/")
    print(f"groups: {group_count}")
    print(f"layers: {layer_count}")


if __name__ == "__main__":
    main()
