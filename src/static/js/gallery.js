const galleryStatus = document.getElementById('gallery-status');
const portraitGalleryGrid = document.getElementById('portrait-gallery-grid');
const sceneGalleryGrid = document.getElementById('scene-gallery-grid');
const portraitGalleryEmpty = document.getElementById('portrait-gallery-empty');
const sceneGalleryEmpty = document.getElementById('scene-gallery-empty');

function showStatus(message, isError = false) {
  if (!galleryStatus) return;
  galleryStatus.textContent = message;
  galleryStatus.style.color = isError ? '#b00020' : '#0a5';
}

function updateEmptyState(kind) {
  const galleryGrid = kind === 'scene' ? sceneGalleryGrid : portraitGalleryGrid;
  const galleryEmpty = kind === 'scene' ? sceneGalleryEmpty : portraitGalleryEmpty;
  if (!galleryEmpty) return;
  const hasItems = galleryGrid && galleryGrid.querySelector('[data-gallery-item]');
  galleryEmpty.style.display = hasItems ? 'none' : 'block';
}

function usePortrait(filename, slot = 1) {
  if (!filename) return;
  const slotParam = slot === 2 ? '&slot=2' : '';
  window.location.href = "/scene?portrait=" + encodeURIComponent(filename) + slotParam;
}

async function deleteGalleryImage(kind, filename) {
  if (!filename) return;
  if (!window.confirm(`画像「${filename}」を削除します。ファイルはゴミ箱に移動されます。よろしいですか？`)) {
    return;
  }

  try {
    const response = await fetch('/api/gallery/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: filename, kind }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '画像の削除に失敗しました。');
    }

    const item = document.querySelector(`[data-gallery-item="${CSS.escape(kind + ':' + filename)}"]`);
    item?.remove();
    updateEmptyState(kind);
    showStatus(`画像「${data.name}」を削除しました（ゴミ箱に移動されました）。`);
  } catch (error) {
    showStatus(error.message || '画像の削除に失敗しました。', true);
  }
}
