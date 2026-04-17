from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path


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


if __name__ == "__main__":
    unittest.main()
