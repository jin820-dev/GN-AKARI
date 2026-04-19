from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image


ROOT_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

import app as appmod  # noqa: E402


class SmokeRouteTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        root = Path(self.temp_dir.name)

        self.original_paths = {
            "CACHE_DIR": appmod.CACHE_DIR,
            "OUTPUTS_DIR": appmod.OUTPUTS_DIR,
            "PREVIEW_OUTPUTS_DIR": appmod.PREVIEW_OUTPUTS_DIR,
            "PORTRAIT_OUTPUTS_DIR": appmod.PORTRAIT_OUTPUTS_DIR,
            "SCENE_OUTPUTS_DIR": appmod.SCENE_OUTPUTS_DIR,
            "SCENE_PREVIEW_OUTPUTS_DIR": appmod.SCENE_PREVIEW_OUTPUTS_DIR,
            "SCENE_BASE_OUTPUTS_DIR": appmod.SCENE_BASE_OUTPUTS_DIR,
            "COMPOSITE_PREVIEW_OUTPUTS_DIR": appmod.COMPOSITE_PREVIEW_OUTPUTS_DIR,
            "DATA_PSD_DIR": appmod.DATA_PSD_DIR,
            "DATA_FONT_DIR": appmod.DATA_FONT_DIR,
            "DATA_SRC_DIR": appmod.DATA_SRC_DIR,
            "SETTINGS_DATA_DIR": appmod.SETTINGS_DATA_DIR,
            "TRASH_DIR": appmod.TRASH_DIR,
            "TRASH_INDEX_PATH": appmod.TRASH_INDEX_PATH,
        }

        appmod.CACHE_DIR = root / "cache"
        appmod.OUTPUTS_DIR = root / "outputs"
        appmod.PREVIEW_OUTPUTS_DIR = appmod.OUTPUTS_DIR / "preview"
        appmod.PORTRAIT_OUTPUTS_DIR = appmod.OUTPUTS_DIR / "portrait"
        appmod.SCENE_OUTPUTS_DIR = appmod.OUTPUTS_DIR / "scene"
        appmod.SCENE_PREVIEW_OUTPUTS_DIR = appmod.OUTPUTS_DIR / "scene_preview"
        appmod.SCENE_BASE_OUTPUTS_DIR = appmod.OUTPUTS_DIR / "scene_base"
        appmod.COMPOSITE_PREVIEW_OUTPUTS_DIR = appmod.OUTPUTS_DIR / "composite_preview"
        appmod.DATA_PSD_DIR = root / "data" / "psd"
        appmod.DATA_FONT_DIR = root / "data" / "font"
        appmod.DATA_SRC_DIR = root / "data" / "src"
        appmod.SETTINGS_DATA_DIR = root / "data" / "settings"
        appmod.TRASH_DIR = root / "data" / "trash"
        appmod.TRASH_INDEX_PATH = appmod.TRASH_DIR / "trash_index.json"

        for path in (
            appmod.CACHE_DIR,
            appmod.PREVIEW_OUTPUTS_DIR,
            appmod.PORTRAIT_OUTPUTS_DIR,
            appmod.SCENE_OUTPUTS_DIR,
            appmod.SCENE_PREVIEW_OUTPUTS_DIR,
            appmod.SCENE_BASE_OUTPUTS_DIR,
            appmod.COMPOSITE_PREVIEW_OUTPUTS_DIR,
            appmod.DATA_PSD_DIR,
            appmod.DATA_FONT_DIR,
            appmod.DATA_SRC_DIR,
            appmod.SETTINGS_DATA_DIR,
            appmod.TRASH_DIR,
        ):
            path.mkdir(parents=True, exist_ok=True)

        self.client = appmod.app.test_client()

    def tearDown(self) -> None:
        for name, value in self.original_paths.items():
            setattr(appmod, name, value)
        self.temp_dir.cleanup()

    def test_main_pages_render(self) -> None:
        for path in ("/", "/gallery", "/scene"):
            with self.subTest(path=path):
                response = self.client.get(path)
                try:
                    self.assertEqual(response.status_code, 200)
                finally:
                    response.close()

    def test_scene_with_portrait_query_renders(self) -> None:
        portrait_path = appmod.PORTRAIT_OUTPUTS_DIR / "A.png"
        portrait_path.write_bytes(b"smoke")

        response = self.client.get("/scene?portrait=A.png")

        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertIn('initialPortraitFilename: "A.png"', body)
            self.assertIn('value="A.png"', body)
        finally:
            response.close()

    def test_static_scene_js_is_served(self) -> None:
        response = self.client.get("/static/js/scene.js")

        try:
            self.assertEqual(response.status_code, 200)
            self.assertIn("function initializeScenePage", response.get_data(as_text=True))
        finally:
            response.close()

    def test_scene_preview_accepts_dynamic_text_slots(self) -> None:
        base_path = appmod.SCENE_BASE_OUTPUTS_DIR / "base.png"
        portrait_path = appmod.PORTRAIT_OUTPUTS_DIR / "A.png"
        font_source = ROOT_DIR / "data" / "font" / "AkazukiPOP.otf"
        shutil.copy(font_source, appmod.DATA_FONT_DIR / font_source.name)
        Image.new("RGBA", (64, 64), (255, 255, 255, 255)).save(base_path)
        Image.new("RGBA", (16, 16), (255, 0, 0, 255)).save(portrait_path)
        self.assertEqual(
            appmod.resolve_scene_text_font_path({"value": "自宅", "font_path": None}).name,
            font_source.name,
        )

        response = self.client.post(
            "/api/scene_preview",
            data={
                "base_image_name": "base.png",
                "canvas_preset": "16:9",
                "base_fit_mode": "contain",
                "character_slot_count": "1",
                "character1_enabled": "1",
                "portrait_filename": "A.png",
                "text_slot_count": "3",
                "text3_enabled": "1",
                "text3_value": "自宅",
                "text3_x": "10",
                "text3_y": "20",
                "text3_size": "32",
                "text3_color": "#ffffff",
                "text3_stroke_color": "#000000",
                "text3_stroke_width": "2",
                "layer_order": json.dumps(["base_image", "character1", "text3"]),
            },
        )

        try:
            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertTrue(payload["ok"])
            self.assertIn("text3", payload["layout"])
            self.assertIsNotNone(payload["layout"]["text3"])
            self.assertEqual(payload["layout"]["text3"]["resolved_font"], font_source.name)
        finally:
            response.close()


if __name__ == "__main__":
    unittest.main()
