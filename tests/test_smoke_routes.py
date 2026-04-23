from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
import unittest
from io import BytesIO
from pathlib import Path

from PIL import Image


ROOT_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

import app as appmod  # noqa: E402
import bubble_assets as bubblemod  # noqa: E402
import compose as composemod  # noqa: E402


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
            "COMPOSITE_PREVIEW_OUTPUTS_DIR": appmod.COMPOSITE_PREVIEW_OUTPUTS_DIR,
            "DATA_PSD_DIR": appmod.DATA_PSD_DIR,
            "DATA_FONT_DIR": appmod.DATA_FONT_DIR,
            "DATA_SRC_DIR": appmod.DATA_SRC_DIR,
            "BACKGROUND_IMAGE_LIBRARY_DIR": appmod.BACKGROUND_IMAGE_LIBRARY_DIR,
            "BACKGROUND_THUMBNAIL_DIR": appmod.BACKGROUND_THUMBNAIL_DIR,
            "SCENE_BACKGROUND_UPLOAD_DIR": appmod.SCENE_BACKGROUND_UPLOAD_DIR,
            "OVERLAY_IMAGE_LIBRARY_DIR": appmod.OVERLAY_IMAGE_LIBRARY_DIR,
            "OVERLAY_ASSETS_METADATA_PATH": appmod.OVERLAY_ASSETS_METADATA_PATH,
            "SETTINGS_DATA_DIR": appmod.SETTINGS_DATA_DIR,
            "TRASH_DIR": appmod.TRASH_DIR,
            "TRASH_INDEX_PATH": appmod.TRASH_INDEX_PATH,
        }
        self.original_bubble_paths = {
            "OVERLAY_IMAGE_LIBRARY_DIR": bubblemod.OVERLAY_IMAGE_LIBRARY_DIR,
            "OVERLAY_ASSETS_METADATA_PATH": bubblemod.OVERLAY_ASSETS_METADATA_PATH,
        }
        self.original_compose_root_dir = composemod.ROOT_DIR

        appmod.CACHE_DIR = root / "cache"
        appmod.OUTPUTS_DIR = root / "outputs"
        appmod.PREVIEW_OUTPUTS_DIR = appmod.OUTPUTS_DIR / "preview"
        appmod.PORTRAIT_OUTPUTS_DIR = appmod.OUTPUTS_DIR / "portrait"
        appmod.SCENE_OUTPUTS_DIR = appmod.OUTPUTS_DIR / "scene"
        appmod.SCENE_PREVIEW_OUTPUTS_DIR = appmod.OUTPUTS_DIR / "scene_preview"
        appmod.COMPOSITE_PREVIEW_OUTPUTS_DIR = appmod.OUTPUTS_DIR / "composite_preview"
        appmod.DATA_PSD_DIR = root / "data" / "psd"
        appmod.DATA_FONT_DIR = root / "data" / "font"
        appmod.DATA_SRC_DIR = root / "data" / "src"
        appmod.BACKGROUND_IMAGE_LIBRARY_DIR = root / "data" / "assets" / "background_images"
        appmod.BACKGROUND_THUMBNAIL_DIR = root / "data" / "assets" / "background_thumbnails"
        appmod.SCENE_BACKGROUND_UPLOAD_DIR = root / "data" / "assets" / "scene_background_uploads"
        appmod.OVERLAY_IMAGE_LIBRARY_DIR = root / "data" / "assets" / "overlay_images"
        appmod.OVERLAY_ASSETS_METADATA_PATH = root / "data" / "assets" / "overlay_assets.json"
        bubblemod.OVERLAY_IMAGE_LIBRARY_DIR = appmod.OVERLAY_IMAGE_LIBRARY_DIR
        bubblemod.OVERLAY_ASSETS_METADATA_PATH = appmod.OVERLAY_ASSETS_METADATA_PATH
        appmod.SETTINGS_DATA_DIR = root / "data" / "settings"
        appmod.TRASH_DIR = root / "data" / "trash"
        appmod.TRASH_INDEX_PATH = appmod.TRASH_DIR / "trash_index.json"
        composemod.ROOT_DIR = root

        for path in (
            appmod.CACHE_DIR,
            appmod.PREVIEW_OUTPUTS_DIR,
            appmod.PORTRAIT_OUTPUTS_DIR,
            appmod.SCENE_OUTPUTS_DIR,
            appmod.SCENE_PREVIEW_OUTPUTS_DIR,
            appmod.COMPOSITE_PREVIEW_OUTPUTS_DIR,
            appmod.DATA_PSD_DIR,
            appmod.DATA_FONT_DIR,
            appmod.DATA_SRC_DIR,
            appmod.BACKGROUND_IMAGE_LIBRARY_DIR,
            appmod.BACKGROUND_THUMBNAIL_DIR,
            appmod.SCENE_BACKGROUND_UPLOAD_DIR,
            appmod.OVERLAY_IMAGE_LIBRARY_DIR,
            appmod.SETTINGS_DATA_DIR,
            appmod.TRASH_DIR,
        ):
            path.mkdir(parents=True, exist_ok=True)

        self.client = appmod.app.test_client()

    def tearDown(self) -> None:
        for name, value in self.original_paths.items():
            setattr(appmod, name, value)
        for name, value in self.original_bubble_paths.items():
            setattr(bubblemod, name, value)
        composemod.ROOT_DIR = self.original_compose_root_dir
        self.temp_dir.cleanup()

    def test_main_pages_render(self) -> None:
        for path in ("/", "/gallery", "/scene", "/settings"):
            with self.subTest(path=path):
                response = self.client.get(path)
                try:
                    self.assertEqual(response.status_code, 200)
                finally:
                    response.close()

    def test_settings_page_omits_image_asset_management(self) -> None:
        response = self.client.get("/settings")

        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertNotIn("画像素材管理", body)
            self.assertNotIn("overlay-asset-upload-input", body)
            self.assertNotIn("overlay-asset-list", body)
        finally:
            response.close()

    def test_gallery_renders_category_tabs(self) -> None:
        response = self.client.get("/gallery")

        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertIn('data-gallery-category-tab="works"', body)
            self.assertIn('data-gallery-category-tab="background"', body)
            self.assertIn('data-gallery-category-tab="overlay"', body)
            self.assertIn('data-gallery-category="works"', body)
            self.assertIn('data-gallery-category="background"', body)
            self.assertIn('data-gallery-category="overlay"', body)
            self.assertIn('id="gallery-preview-modal"', body)
            self.assertIn('id="gallery-preview-image"', body)
            self.assertIn('id="gallery-preview-close"', body)
        finally:
            response.close()

    def test_gallery_renders_empty_states_for_empty_categories(self) -> None:
        response = self.client.get("/gallery")

        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertIn('id="portrait-gallery-grid"', body)
            self.assertIn('id="scene-gallery-grid"', body)
            self.assertIn('id="background-gallery-grid"', body)
            self.assertIn('id="overlay-gallery-grid"', body)
            self.assertIn("まだ作品がありません。立ち絵合成または写真合成で作成してください。", body)
            self.assertIn("まだ背景がありません。背景画像を追加して登録できます。", body)
            self.assertIn("まだオーバーレイがありません。右上の追加ボタンから登録できます。", body)
        finally:
            response.close()

    def test_gallery_hides_empty_state_when_category_has_items(self) -> None:
        portrait_path = appmod.PORTRAIT_OUTPUTS_DIR / "portrait.png"
        background_path = appmod.BACKGROUND_IMAGE_LIBRARY_DIR / "base.png"
        overlay_path = appmod.OVERLAY_IMAGE_LIBRARY_DIR / "bubble.png"
        Image.new("RGBA", (4, 4), (255, 0, 0, 255)).save(portrait_path)
        Image.new("RGBA", (4, 4), (0, 0, 255, 255)).save(background_path)
        Image.new("RGBA", (12, 8), (255, 255, 255, 128)).save(overlay_path)
        appmod.OVERLAY_ASSETS_METADATA_PATH.write_text(
            json.dumps(
                [
                    {
                        "id": "bubble",
                        "label": "Test Bubble",
                        "filename": "bubble.png",
                        "default_width": 120,
                        "default_height": 80,
                        "kind": "image",
                        "created_at": "2026-04-22T12:00:00",
                    }
                ],
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        response = self.client.get("/gallery")

        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertIn('id="works-gallery-empty" class="empty gallery-category-empty" data-gallery-category="works" style="display:none"', body)
            self.assertIn('id="background-gallery-empty" class="empty" style="display:none"', body)
            self.assertIn('id="overlay-gallery-empty" class="empty" style="display:none"', body)
        finally:
            response.close()

    def test_gallery_lists_background_images(self) -> None:
        background_path = appmod.BACKGROUND_IMAGE_LIBRARY_DIR / "base.png"
        jpeg_background_path = appmod.BACKGROUND_IMAGE_LIBRARY_DIR / "photo.jpg"
        Image.new("RGBA", (4, 4), (0, 0, 255, 255)).save(background_path)
        Image.new("RGB", (4, 4), (0, 255, 0)).save(jpeg_background_path, format="JPEG")
        thumbnail_path = appmod.BACKGROUND_THUMBNAIL_DIR / "base.png"
        Image.new("RGBA", (2, 2), (0, 0, 255, 255)).save(thumbnail_path)

        response = self.client.get("/gallery")

        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertIn("Background Gallery", body)
            self.assertIn("/assets/background_images/base.png", body)
            self.assertIn("/assets/background_images/photo.jpg", body)
            self.assertIn("/assets/background_thumbnails/base.png", body)
            self.assertNotIn("/assets/background_thumbnails/photo.jpg", body)
            self.assertIn('class="gallery-link" href="/assets/background_images/base.png"', body)
            self.assertIn('loading="lazy"', body)
            self.assertIn('data-gallery-item="background:base.png"', body)
            self.assertIn('data-gallery-item="background:photo.jpg"', body)
            self.assertIn('data-gallery-select-toggle="background"', body)
            self.assertIn('data-gallery-bulk-delete="background"', body)
            self.assertIn('data-gallery-select="background"', body)
            self.assertIn('id="background-upload-input" class="gallery-upload-input" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden', body)
            self.assertIn('onclick="useBackground(this.dataset.filename)"', body)
            self.assertIn("写真合成で使う", body)
            self.assertIn('onclick="deleteGalleryImage(\'background\', this.dataset.filename)"', body)
        finally:
            response.close()

        response = self.client.get("/assets/background_images/base.png")
        try:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.mimetype, "image/png")
        finally:
            response.close()

        response = self.client.get("/assets/background_thumbnails/base.png")
        try:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.mimetype, "image/png")
        finally:
            response.close()

        response = self.client.get("/assets/background_images/photo.jpg")
        try:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.mimetype, "image/jpeg")
        finally:
            response.close()

    def test_gallery_deletes_background_image(self) -> None:
        background_path = appmod.BACKGROUND_IMAGE_LIBRARY_DIR / "delete-me.jpg"
        thumbnail_path = appmod.BACKGROUND_THUMBNAIL_DIR / "delete-me.jpg"
        Image.new("RGB", (4, 4), (0, 255, 0)).save(background_path, format="JPEG")
        Image.new("RGB", (2, 2), (0, 255, 0)).save(thumbnail_path, format="JPEG")

        response = self.client.post(
            "/api/gallery/delete",
            json={"kind": "background", "name": "delete-me.jpg"},
        )

        try:
            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertTrue(payload["ok"])
            self.assertEqual(payload["kind"], "background")
            self.assertEqual(payload["name"], "delete-me.jpg")
            self.assertFalse(background_path.exists())
            self.assertFalse(thumbnail_path.exists())
        finally:
            response.close()

        response = self.client.get("/gallery")
        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertNotIn('data-gallery-item="background:delete-me.jpg"', body)
        finally:
            response.close()

    def test_gallery_can_delete_multiple_background_images_with_existing_api(self) -> None:
        first_path = appmod.BACKGROUND_IMAGE_LIBRARY_DIR / "first.jpg"
        second_path = appmod.BACKGROUND_IMAGE_LIBRARY_DIR / "second.jpg"
        first_thumbnail_path = appmod.BACKGROUND_THUMBNAIL_DIR / "first.jpg"
        second_thumbnail_path = appmod.BACKGROUND_THUMBNAIL_DIR / "second.jpg"
        for path in (first_path, second_path, first_thumbnail_path, second_thumbnail_path):
            Image.new("RGB", (4, 4), (0, 255, 0)).save(path, format="JPEG")

        for name in ("first.jpg", "second.jpg"):
            response = self.client.post(
                "/api/gallery/delete",
                json={"kind": "background", "name": name},
            )
            try:
                self.assertEqual(response.status_code, 200)
                self.assertTrue(response.get_json()["ok"])
            finally:
                response.close()

        self.assertFalse(first_path.exists())
        self.assertFalse(second_path.exists())
        self.assertFalse(first_thumbnail_path.exists())
        self.assertFalse(second_thumbnail_path.exists())

    def test_gallery_lists_overlay_assets(self) -> None:
        overlay_path = appmod.OVERLAY_IMAGE_LIBRARY_DIR / "bubble.png"
        Image.new("RGBA", (12, 8), (255, 255, 255, 128)).save(overlay_path)
        appmod.OVERLAY_ASSETS_METADATA_PATH.write_text(
            json.dumps(
                [
                    {
                        "id": "bubble",
                        "label": "Test Bubble",
                        "filename": "bubble.png",
                        "default_width": 120,
                        "default_height": 80,
                        "kind": "image",
                        "created_at": "2026-04-22T12:00:00",
                    }
                ],
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        response = self.client.get("/gallery")

        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertIn("Overlay Gallery", body)
            self.assertIn("/assets/overlay_images/bubble.png", body)
            self.assertIn('data-gallery-item="overlay:bubble.png"', body)
            self.assertIn("Test Bubble", body)
            self.assertIn("120 x 80 / image", body)
            self.assertIn("オーバーレイを追加", body)
            self.assertIn('id="overlay-upload-input"', body)
            self.assertIn('id="overlay-upload-input" class="gallery-upload-input" type="file" accept="image/png,image/jpeg,image/webp" multiple hidden', body)
            self.assertIn('data-gallery-select-toggle="overlay"', body)
            self.assertIn('data-gallery-bulk-delete="overlay"', body)
            self.assertIn('data-gallery-select="overlay"', body)
            self.assertIn('data-overlay-asset="bubble"', body)
            self.assertIn("data-overlay-slot-menu", body)
            self.assertIn("toggleOverlaySlotMenu(this)", body)
            self.assertIn('onclick="deleteGalleryImage(\'overlay\', this.dataset.filename)"', body)
        finally:
            response.close()

        response = self.client.get("/assets/overlay_images/bubble.png")
        try:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.mimetype, "image/png")
        finally:
            response.close()

    def test_gallery_deletes_overlay_asset(self) -> None:
        overlay_path = appmod.OVERLAY_IMAGE_LIBRARY_DIR / "delete-overlay.png"
        Image.new("RGBA", (12, 8), (255, 255, 255, 128)).save(overlay_path)
        appmod.OVERLAY_ASSETS_METADATA_PATH.write_text(
            json.dumps(
                [
                    {
                        "id": "delete-overlay",
                        "label": "Delete Overlay",
                        "filename": "delete-overlay.png",
                        "default_width": 120,
                        "default_height": 80,
                        "kind": "image",
                        "created_at": "2026-04-22T12:00:00",
                    }
                ],
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        response = self.client.post(
            "/api/gallery/delete",
            json={"kind": "overlay", "name": "delete-overlay.png"},
        )

        try:
            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertTrue(payload["ok"])
            self.assertEqual(payload["kind"], "overlay")
            self.assertEqual(payload["name"], "delete-overlay.png")
            self.assertFalse(overlay_path.exists())
            self.assertEqual(
                json.loads(appmod.OVERLAY_ASSETS_METADATA_PATH.read_text(encoding="utf-8")),
                [],
            )
        finally:
            response.close()

        response = self.client.get("/gallery")
        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertNotIn('data-gallery-item="overlay:delete-overlay.png"', body)
        finally:
            response.close()

    def test_gallery_can_delete_multiple_overlay_assets_with_existing_api(self) -> None:
        records = []
        for name in ("first-overlay.png", "second-overlay.png"):
            Image.new("RGBA", (12, 8), (255, 255, 255, 128)).save(appmod.OVERLAY_IMAGE_LIBRARY_DIR / name)
            records.append(
                {
                    "id": Path(name).stem,
                    "label": Path(name).stem,
                    "filename": name,
                    "default_width": 120,
                    "default_height": 80,
                    "kind": "image",
                    "created_at": "2026-04-22T12:00:00",
                }
            )
        appmod.OVERLAY_ASSETS_METADATA_PATH.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")

        for name in ("first-overlay.png", "second-overlay.png"):
            response = self.client.post(
                "/api/gallery/delete",
                json={"kind": "overlay", "name": name},
            )
            try:
                self.assertEqual(response.status_code, 200)
                self.assertTrue(response.get_json()["ok"])
            finally:
                response.close()

        self.assertFalse((appmod.OVERLAY_IMAGE_LIBRARY_DIR / "first-overlay.png").exists())
        self.assertFalse((appmod.OVERLAY_IMAGE_LIBRARY_DIR / "second-overlay.png").exists())
        self.assertEqual(json.loads(appmod.OVERLAY_ASSETS_METADATA_PATH.read_text(encoding="utf-8")), [])

    def test_overlay_asset_upload_registers_gallery_item(self) -> None:
        buffer = BytesIO()
        Image.new("RGBA", (16, 12), (255, 255, 255, 128)).save(buffer, format="PNG")
        buffer.seek(0)

        response = self.client.post(
            "/api/overlay_assets/upload",
            data={"file": (buffer, "caption.png")},
            content_type="multipart/form-data",
        )

        try:
            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertTrue(payload["ok"])
            self.assertEqual(payload["item"]["filename"], "caption.png")
            self.assertEqual(payload["item"]["label"], "caption")
            self.assertEqual(payload["item"]["default_width"], 16)
            self.assertEqual(payload["item"]["default_height"], 12)
            self.assertTrue((appmod.OVERLAY_IMAGE_LIBRARY_DIR / "caption.png").exists())
            records = json.loads(appmod.OVERLAY_ASSETS_METADATA_PATH.read_text(encoding="utf-8"))
            self.assertEqual(records[0]["filename"], "caption.png")
        finally:
            response.close()

        response = self.client.get("/gallery")
        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertIn('data-gallery-item="overlay:caption.png"', body)
            self.assertIn("/assets/overlay_images/caption.png", body)
            self.assertIn("caption", body)
        finally:
            response.close()

    def test_scene_base_image_upload_saves_temporary_background(self) -> None:
        old_upload_path = appmod.SCENE_BACKGROUND_UPLOAD_DIR / "old.png"
        fresh_upload_path = appmod.SCENE_BACKGROUND_UPLOAD_DIR / "fresh.png"
        library_path = appmod.BACKGROUND_IMAGE_LIBRARY_DIR / "library.png"
        Image.new("RGBA", (4, 4), (255, 0, 0, 255)).save(old_upload_path)
        Image.new("RGBA", (4, 4), (0, 255, 0, 255)).save(fresh_upload_path)
        Image.new("RGBA", (4, 4), (0, 0, 255, 255)).save(library_path)
        old_mtime = (
            appmod.time.time()
            - (appmod.SCENE_BACKGROUND_UPLOAD_TTL_DAYS + 1) * 24 * 60 * 60
        )
        os.utime(old_upload_path, (old_mtime, old_mtime))

        buffer = BytesIO()
        Image.new("RGBA", (4, 4), (0, 0, 255, 255)).save(buffer, format="PNG")
        buffer.seek(0)

        response = self.client.post(
            "/api/scene_base_image",
            data={"base_image": (buffer, "base.png")},
            content_type="multipart/form-data",
        )

        try:
            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertTrue(payload["ok"])
            self.assertTrue((appmod.SCENE_BACKGROUND_UPLOAD_DIR / payload["base_image_name"]).exists())
            self.assertFalse((appmod.BACKGROUND_IMAGE_LIBRARY_DIR / payload["base_image_name"]).exists())
            self.assertTrue(payload["base_image_url"].startswith("/assets/scene_background_uploads/"))
            self.assertFalse(old_upload_path.exists())
            self.assertTrue(fresh_upload_path.exists())
            self.assertTrue(library_path.exists())
        finally:
            response.close()

        buffer = BytesIO()
        Image.new("RGB", (4, 4), (0, 255, 0)).save(buffer, format="JPEG")
        jpeg_bytes = buffer.getvalue()
        buffer.seek(0)

        response = self.client.post(
            "/api/scene_base_image",
            data={"base_image": (buffer, "photo.jpg")},
            content_type="multipart/form-data",
        )

        try:
            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertTrue(payload["ok"])
            self.assertEqual(payload["base_image_name"], "photo.jpg")
            self.assertEqual(payload["base_image_url"], "/assets/scene_background_uploads/photo.jpg")
            self.assertEqual((appmod.SCENE_BACKGROUND_UPLOAD_DIR / "photo.jpg").read_bytes(), jpeg_bytes)
        finally:
            response.close()

        response = self.client.get("/assets/scene_background_uploads/photo.jpg")
        try:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.mimetype, "image/jpeg")
        finally:
            response.close()

    def test_gallery_background_upload_registers_library_image(self) -> None:
        buffer = BytesIO()
        Image.new("RGB", (4, 4), (0, 255, 0)).save(buffer, format="JPEG")
        jpeg_bytes = buffer.getvalue()
        buffer.seek(0)

        response = self.client.post(
            "/api/gallery/background/upload",
            data={"background_image": (buffer, "library.jpg")},
            content_type="multipart/form-data",
        )

        try:
            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertTrue(payload["ok"])
            self.assertEqual(payload["item"]["filename"], "library.jpg")
            self.assertEqual(payload["item"]["url"], "/assets/background_images/library.jpg")
            self.assertEqual(payload["item"]["thumbnail_url"], "/assets/background_thumbnails/library.jpg")
            self.assertEqual((appmod.BACKGROUND_IMAGE_LIBRARY_DIR / "library.jpg").read_bytes(), jpeg_bytes)
            self.assertTrue((appmod.BACKGROUND_THUMBNAIL_DIR / "library.jpg").exists())
            self.assertFalse((appmod.SCENE_BACKGROUND_UPLOAD_DIR / "library.jpg").exists())
        finally:
            response.close()

        with Image.open(appmod.BACKGROUND_THUMBNAIL_DIR / "library.jpg") as thumbnail:
            self.assertLessEqual(max(thumbnail.size), appmod.BACKGROUND_THUMBNAIL_MAX_EDGE)

        response = self.client.get("/scene")
        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertIn('data-background-filename="library.jpg"', body)
            self.assertIn('/assets/background_images/library.jpg', body)
        finally:
            response.close()

        response = self.client.get("/gallery")
        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertIn('/assets/background_thumbnails/library.jpg', body)
        finally:
            response.close()

    def test_scene_page_lists_background_picker_items(self) -> None:
        background_path = appmod.BACKGROUND_IMAGE_LIBRARY_DIR / "base.jpg"
        temporary_background_path = appmod.SCENE_BACKGROUND_UPLOAD_DIR / "temporary.jpg"
        Image.new("RGB", (4, 4), (0, 255, 0)).save(background_path, format="JPEG")
        Image.new("RGB", (4, 4), (255, 0, 0)).save(temporary_background_path, format="JPEG")

        response = self.client.get("/scene")

        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertIn('id="background-picker-toggle"', body)
            self.assertIn('data-background-filename="base.jpg"', body)
            self.assertIn('/assets/background_images/base.jpg', body)
            self.assertNotIn('data-background-filename="temporary.jpg"', body)
            self.assertIn('backgroundGalleryItems', body)
        finally:
            response.close()

    def test_scene_background_picker_limits_recent_items(self) -> None:
        for index in range(13):
            background_path = appmod.BACKGROUND_IMAGE_LIBRARY_DIR / f"base-{index:02d}.jpg"
            Image.new("RGB", (4, 4), (index, 255, 0)).save(background_path, format="JPEG")
            mtime = appmod.time.time() + index
            os.utime(background_path, (mtime, mtime))

        response = self.client.get("/scene")

        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertNotIn('data-background-filename="base-00.jpg"', body)
            for index in range(1, 13):
                self.assertIn(f'data-background-filename="base-{index:02d}.jpg"', body)
            self.assertLess(body.index("base-12.jpg"), body.index("base-11.jpg"))
        finally:
            response.close()

        response = self.client.get("/gallery")
        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertIn('data-gallery-item="background:base-00.jpg"', body)
            self.assertIn('data-gallery-item="background:base-12.jpg"', body)
        finally:
            response.close()

    def test_scene_accepts_background_gallery_query(self) -> None:
        background_path = appmod.BACKGROUND_IMAGE_LIBRARY_DIR / "base.jpg"
        temporary_background_path = appmod.SCENE_BACKGROUND_UPLOAD_DIR / "temporary.jpg"
        Image.new("RGB", (4, 4), (0, 255, 0)).save(background_path, format="JPEG")
        Image.new("RGB", (4, 4), (255, 0, 0)).save(temporary_background_path, format="JPEG")

        response = self.client.get("/scene?base_image_name=base.jpg")
        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertIn('initialBaseImageName: "base.jpg"', body)
            self.assertIn('initialBaseImageUrl: "/assets/background_images/base.jpg"', body)
        finally:
            response.close()

        response = self.client.get("/scene?base_image_name=temporary.jpg")
        try:
            self.assertEqual(response.status_code, 200)
            body = response.get_data(as_text=True)
            self.assertIn('initialBaseImageName: ""', body)
            self.assertIn('initialBaseImageUrl: ""', body)
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

    def test_execute_compose_writes_preview_without_subprocess(self) -> None:
        cache_key = "psd_bbbbbbbbbbbb"
        cache_dir = appmod.CACHE_DIR / cache_key
        layer_dir = cache_dir / "layers"
        layer_dir.mkdir(parents=True, exist_ok=True)
        layers_json_path = cache_dir / "layers.json"
        layer_path = layer_dir / "1.png"
        Image.new("RGBA", (4, 4), (255, 0, 0, 255)).save(layer_path)
        layers_json_path.write_text(
            json.dumps(
                {
                    "psd_source": {
                        "path": "data/psd/test.psd",
                        "filename": "test.psd",
                        "cache_key": cache_key,
                    },
                    "canvas": {"width": 4, "height": 4},
                    "layers": [
                        {
                            "id": 1,
                            "name": "layer",
                            "type": "layer",
                            "visible": True,
                            "depth": 0,
                            "parent_id": None,
                            "cache_png": str(layer_path),
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )

        output_image = appmod.execute_compose(layers_json_path, ["1"], "preview")

        self.assertEqual(output_image, f"preview/{cache_key}.png")
        self.assertTrue((appmod.PREVIEW_OUTPUTS_DIR / f"{cache_key}.png").exists())
        metadata = json.loads((appmod.PREVIEW_OUTPUTS_DIR / f"{cache_key}.json").read_text(encoding="utf-8"))
        self.assertEqual(metadata["layer_ids"], [1])
        self.assertEqual(metadata["compose_version"], composemod.COMPOSE_METADATA_VERSION)

        response = self.client.get(f"/api/compose_status?cache_key={cache_key}")
        try:
            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertTrue(payload["ok"])
            self.assertEqual(payload["signature"], "1")
            self.assertTrue(payload["preview_available"])
            self.assertEqual(payload["image_url"], f"/outputs/preview/{cache_key}.png")
        finally:
            response.close()

    def test_compose_api_rebuilds_stale_preview_metadata(self) -> None:
        cache_key = "psd_cccccccccccc"
        cache_dir = appmod.CACHE_DIR / cache_key
        layer_dir = cache_dir / "layers"
        layer_dir.mkdir(parents=True, exist_ok=True)
        layers_json_path = cache_dir / "layers.json"
        layer_path = layer_dir / "1.png"
        Image.new("RGBA", (1, 1), (10, 20, 30, 255)).save(layer_path)
        layers_json_path.write_text(
            json.dumps(
                {
                    "psd_source": {
                        "path": "data/psd/test.psd",
                        "filename": "test.psd",
                        "cache_key": cache_key,
                    },
                    "canvas": {"width": 1, "height": 1},
                    "layers": [
                        {
                            "id": 1,
                            "name": "layer",
                            "type": "layer",
                            "visible": True,
                            "blend_mode": "normal",
                            "opacity": 255,
                            "depth": 0,
                            "parent_id": None,
                            "cache_png": str(layer_path),
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        appmod.PREVIEW_OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
        Image.new("RGBA", (1, 1), (255, 0, 0, 255)).save(appmod.PREVIEW_OUTPUTS_DIR / f"{cache_key}.png")
        (appmod.PREVIEW_OUTPUTS_DIR / f"{cache_key}.json").write_text(
            json.dumps({"layer_ids": [1], "compose_version": "old"}),
            encoding="utf-8",
        )

        response = self.client.post(
            "/api/compose",
            json={"cache_key": cache_key, "checked_ids": [1]},
        )

        try:
            payload = response.get_json()
            self.assertEqual(response.status_code, 200, payload)
            self.assertTrue(payload["ok"])
            metadata = json.loads((appmod.PREVIEW_OUTPUTS_DIR / f"{cache_key}.json").read_text(encoding="utf-8"))
            self.assertEqual(metadata["compose_version"], composemod.COMPOSE_METADATA_VERSION)
            with Image.open(appmod.PREVIEW_OUTPUTS_DIR / f"{cache_key}.png") as image:
                self.assertEqual(image.convert("RGBA").getpixel((0, 0)), (10, 20, 30, 255))
        finally:
            response.close()

    def test_composite_layers_supports_multiply_blend_mode(self) -> None:
        cache_key = "psd_multiply"
        cache_dir = appmod.CACHE_DIR / cache_key
        layer_dir = cache_dir / "layers"
        layer_dir.mkdir(parents=True, exist_ok=True)
        base_path = layer_dir / "1.png"
        shadow_path = layer_dir / "2.png"
        second_shadow_path = layer_dir / "3.png"
        layers_json_path = cache_dir / "layers.json"
        Image.new("RGBA", (1, 1), (200, 100, 50, 255)).save(base_path)
        Image.new("RGBA", (1, 1), (128, 128, 128, 255)).save(shadow_path)
        Image.new("RGBA", (1, 1), (128, 128, 128, 255)).save(second_shadow_path)
        layers_json_path.write_text(
            json.dumps(
                {
                    "psd_source": {
                        "path": "data/psd/test.psd",
                        "filename": "test.psd",
                        "cache_key": cache_key,
                    },
                    "canvas": {"width": 1, "height": 1},
                    "layers": [
                        {
                            "id": 1,
                            "name": "base",
                            "type": "layer",
                            "visible": True,
                            "blend_mode": "normal",
                            "opacity": 255,
                            "depth": 0,
                            "parent_id": None,
                            "cache_png": str(base_path),
                        },
                        {
                            "id": 2,
                            "name": "shadow",
                            "type": "layer",
                            "visible": True,
                            "blend_mode": "multiply",
                            "opacity": 255,
                            "depth": 0,
                            "parent_id": None,
                            "cache_png": str(shadow_path),
                        },
                        {
                            "id": 3,
                            "name": "second-shadow",
                            "type": "layer",
                            "visible": True,
                            "blend_mode": "multiply",
                            "opacity": 255,
                            "depth": 0,
                            "parent_id": None,
                            "cache_png": str(second_shadow_path),
                        },
                    ],
                }
            ),
            encoding="utf-8",
        )

        image, _ = composemod.composite_layers(layers_json_path, [1, 2])

        self.assertEqual(image.getpixel((0, 0)), (100, 50, 25, 255))

        image, _ = composemod.composite_layers(layers_json_path, [1, 2, 3])

        self.assertEqual(image.getpixel((0, 0)), (50, 25, 12, 255))

    def test_composite_layers_applies_layer_opacity(self) -> None:
        cache_key = "psd_opacity"
        cache_dir = appmod.CACHE_DIR / cache_key
        layer_dir = cache_dir / "layers"
        layer_dir.mkdir(parents=True, exist_ok=True)
        layer_path = layer_dir / "1.png"
        layers_json_path = cache_dir / "layers.json"
        Image.new("RGBA", (1, 1), (255, 0, 0, 255)).save(layer_path)
        layers_json_path.write_text(
            json.dumps(
                {
                    "psd_source": {
                        "path": "data/psd/test.psd",
                        "filename": "test.psd",
                        "cache_key": cache_key,
                    },
                    "canvas": {"width": 1, "height": 1},
                    "layers": [
                        {
                            "id": 1,
                            "name": "half",
                            "type": "layer",
                            "visible": True,
                            "blend_mode": "normal",
                            "opacity": 128,
                            "depth": 0,
                            "parent_id": None,
                            "cache_png": str(layer_path),
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )

        image, _ = composemod.composite_layers(layers_json_path, [1])

        self.assertEqual(image.getpixel((0, 0)), (255, 0, 0, 128))

    def test_cached_layer_route_serves_only_layer_png(self) -> None:
        cache_key = "psd_aaaaaaaaaaaa"
        layer_dir = appmod.CACHE_DIR / cache_key / "layers"
        layer_dir.mkdir(parents=True, exist_ok=True)
        Image.new("RGBA", (4, 4), (255, 0, 0, 255)).save(layer_dir / "1.png")

        response = self.client.get(f"/cache/{cache_key}/layers/1.png")
        try:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.mimetype, "image/png")
        finally:
            response.close()

        response = self.client.get(f"/cache/{cache_key}/layers/../layers/1.png")
        try:
            self.assertEqual(response.status_code, 404)
        finally:
            response.close()

    def test_scene_preview_accepts_dynamic_text_slots(self) -> None:
        base_path = appmod.BACKGROUND_IMAGE_LIBRARY_DIR / "base.png"
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

    def test_scene_preview_completes_missing_dynamic_text_layer_order(self) -> None:
        base_path = appmod.BACKGROUND_IMAGE_LIBRARY_DIR / "base.jpg"
        portrait_path = appmod.PORTRAIT_OUTPUTS_DIR / "A.png"
        Image.new("RGB", (64, 64), (255, 255, 255)).save(base_path, format="JPEG")
        Image.new("RGBA", (16, 16), (255, 0, 0, 255)).save(portrait_path)

        response = self.client.post(
            "/api/scene_preview",
            data={
                "base_image_name": "base.jpg",
                "canvas_preset": "16:9",
                "base_fit_mode": "contain",
                "character_slot_count": "1",
                "character1_enabled": "1",
                "portrait_filename": "A.png",
                "text_slot_count": "3",
                "text3_enabled": "1",
                "text3_value": "third",
                "text3_x": "10",
                "text3_y": "20",
                "text3_size": "32",
                "text3_color": "#000000",
                "text3_stroke_color": "#000000",
                "text3_stroke_width": "0",
                "layer_order": json.dumps(["base_image", "character1"]),
            },
        )

        try:
            self.assertEqual(response.status_code, 200)
            payload = response.get_json()
            self.assertTrue(payload["ok"])
            self.assertIn("text3", payload["layout"]["layer_order"])
        finally:
            response.close()

    def test_normalizes_overlay_layers_as_primary_scene_state(self) -> None:
        Image.new("RGBA", (20, 20), (255, 0, 0, 255)).save(appmod.OVERLAY_IMAGE_LIBRARY_DIR / "red.png")
        appmod.OVERLAY_ASSETS_METADATA_PATH.write_text(
            json.dumps(
                [
                    {
                        "id": "red",
                        "label": "Red",
                        "filename": "red.png",
                        "default_width": 20,
                        "default_height": 20,
                        "kind": "image",
                        "created_at": "2026-04-22T12:00:00",
                    }
                ],
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        layers = appmod.normalize_scene_overlay_layers_state(
            {
                "overlay_layers": [
                    {"id": "top", "name": "Top", "asset_id": "missing", "visible": True, "x": 1, "y": 2, "width": 30, "height": 40, "order": 1},
                    {"id": "bottom", "name": "Bottom", "asset_id": "red", "visible": True, "x": 3, "y": 4, "width": 50, "height": 60, "order": 0},
                ],
                "overlay_slots": [
                    {"slot_id": "slot_1", "asset_id": "red", "visible": True, "order": 0},
                ],
            }
        )

        self.assertEqual([layer["id"] for layer in layers], ["bottom", "top"])
        self.assertEqual([layer["order"] for layer in layers], [0, 1])
        self.assertEqual(layers[0]["asset_id"], "red")
        self.assertIsNone(layers[1]["asset_id"])
        self.assertFalse(layers[1]["visible"])

        empty_layers = appmod.normalize_scene_overlay_layers_state({"overlay_layers": []})
        self.assertEqual(empty_layers, [])

        layer_order = appmod.normalize_scene_layer_order(
            ["base_image", "overlay_image", "text1"],
            extra_layer_ids=["overlay:bottom", "overlay:top"],
        )
        self.assertNotIn("overlay_image", layer_order)
        self.assertEqual(layer_order[1:3], ["overlay:bottom", "overlay:top"])

    def test_compose_scene_draws_overlay_layers_from_layer_order(self) -> None:
        Image.new("RGBA", (20, 20), (255, 0, 0, 255)).save(appmod.OVERLAY_IMAGE_LIBRARY_DIR / "red.png")
        Image.new("RGBA", (20, 20), (0, 0, 255, 255)).save(appmod.OVERLAY_IMAGE_LIBRARY_DIR / "blue.png")
        appmod.OVERLAY_ASSETS_METADATA_PATH.write_text(
            json.dumps(
                [
                    {
                        "id": "red",
                        "label": "Red",
                        "filename": "red.png",
                        "default_width": 20,
                        "default_height": 20,
                        "kind": "image",
                        "created_at": "2026-04-22T12:00:00",
                    },
                    {
                        "id": "blue",
                        "label": "Blue",
                        "filename": "blue.png",
                        "default_width": 20,
                        "default_height": 20,
                        "kind": "image",
                        "created_at": "2026-04-22T12:01:00",
                    },
                ],
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        result = appmod.compose_scene(
            Image.new("RGBA", (1280, 720), (255, 255, 255, 255)),
            [],
            [],
            {"enabled": True, "x": 0, "y": 0, "width": 40, "height": 40, "color": "#00ff00", "opacity": 1.0},
            [
                {
                    "id": "blue_layer",
                    "name": "Blue Layer",
                    "asset_id": "blue",
                    "visible": True,
                    "x": 0,
                    "y": 0,
                    "width": 20,
                    "height": 20,
                    "order": 0,
                },
                {
                    "id": "red_layer",
                    "name": "Red Layer",
                    "asset_id": "red",
                    "visible": True,
                    "x": 0,
                    "y": 0,
                    "width": 20,
                    "height": 20,
                    "order": 1,
                },
            ],
            ["base_image", "overlay:blue_layer", "message_band", "overlay:red_layer"],
            "aviutl",
            "16:9",
            "contain",
            100,
            0,
            0,
            preview=False,
        )

        self.assertEqual(result.getpixel((5, 5)), (255, 0, 0, 255))


if __name__ == "__main__":
    unittest.main()
