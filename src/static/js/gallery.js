const galleryStatus = document.getElementById('gallery-status');
const portraitGalleryGrid = document.getElementById('portrait-gallery-grid');
const sceneGalleryGrid = document.getElementById('scene-gallery-grid');
const portraitGalleryEmpty = document.getElementById('portrait-gallery-empty');
const sceneGalleryEmpty = document.getElementById('scene-gallery-empty');
const sceneStorageKey = 'gn_akari_scene_state';
const minimumCharacterSlotCount = 3;

function getSceneCharacterSlotCount() {
  const counts = [minimumCharacterSlotCount];
  try {
    const raw = localStorage.getItem(sceneStorageKey);
    const state = raw ? JSON.parse(raw) : null;
    const storedCount = Number(state?.character_slot_count || 0);
    if (storedCount > 0) {
      counts.push(storedCount);
    }
    if (Array.isArray(state?.layer_order)) {
      state.layer_order.forEach((layerId) => {
        const match = String(layerId).match(/^character(\d+)$/);
        if (match) {
          counts.push(Number(match[1]) || 0);
        }
      });
    }
  } catch {
    // Keep the fixed initial slots when scene state is unavailable.
  }
  return Math.max(...counts);
}

function initializePortraitSlotMenus() {
  const slotCount = getSceneCharacterSlotCount();
  document.querySelectorAll('[data-portrait-slot-menu]').forEach((menu) => {
    const filename = menu.closest('.gallery-use-menu')?.querySelector('.gallery-action-button--use')?.dataset.filename || '';
    menu.replaceChildren();
    for (let slot = 1; slot <= slotCount; slot += 1) {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'portrait-slot-option';
      option.dataset.filename = filename;
      option.dataset.slot = String(slot);
      option.textContent = `キャラ${slot}`;
      option.addEventListener('click', () => usePortrait(filename, slot));
      menu.appendChild(option);
    }
  });
}

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
  const slotNumber = Number(slot) || 1;
  const slotParam = slotNumber > 1 ? `&slot=${encodeURIComponent(slotNumber)}` : '';
  window.location.href = "/scene?portrait=" + encodeURIComponent(filename) + slotParam;
}

function closePortraitSlotMenus(exceptMenu = null) {
  document.querySelectorAll('[data-portrait-slot-menu]').forEach((menu) => {
    if (menu === exceptMenu) return;
    menu.hidden = true;
    menu.closest('.gallery-item')?.classList.remove('is-menu-open');
    const button = menu.closest('.gallery-use-menu')?.querySelector('.gallery-action-button--use');
    button?.setAttribute('aria-expanded', 'false');
  });
}

function togglePortraitSlotMenu(button) {
  const menu = button?.closest('.gallery-use-menu')?.querySelector('[data-portrait-slot-menu]');
  if (!menu) return;
  const willOpen = menu.hidden;
  closePortraitSlotMenus(menu);
  menu.hidden = !willOpen;
  menu.closest('.gallery-item')?.classList.toggle('is-menu-open', willOpen);
  button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
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

document.addEventListener('click', (event) => {
  if (event.target.closest('.gallery-use-menu')) return;
  closePortraitSlotMenus();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closePortraitSlotMenus();
  }
});

initializePortraitSlotMenus();
