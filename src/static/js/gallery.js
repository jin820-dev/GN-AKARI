const portraitGalleryGrid = document.getElementById('portrait-gallery-grid');
const sceneGalleryGrid = document.getElementById('scene-gallery-grid');
const backgroundGalleryGrid = document.getElementById('background-gallery-grid');
const overlayGalleryGrid = document.getElementById('overlay-gallery-grid');
const portraitGalleryEmpty = document.getElementById('portrait-gallery-empty');
const sceneGalleryEmpty = document.getElementById('scene-gallery-empty');
const worksGalleryEmpty = document.getElementById('works-gallery-empty');
const backgroundGalleryEmpty = document.getElementById('background-gallery-empty');
const overlayGalleryEmpty = document.getElementById('overlay-gallery-empty');
const portraitGallerySection = portraitGalleryGrid?.closest('.gallery-category-section');
const sceneGallerySection = sceneGalleryGrid?.closest('.gallery-category-section');
const backgroundUploadInput = document.getElementById('background-upload-input');
const backgroundUploadTrigger = document.querySelector('[data-background-upload-trigger]');
const overlayUploadInput = document.getElementById('overlay-upload-input');
const overlayUploadTrigger = document.querySelector('[data-overlay-upload-trigger]');
const galleryCategoryTabs = document.querySelectorAll('[data-gallery-category-tab]');
const galleryCategorySections = document.querySelectorAll('[data-gallery-category]');
const galleryPreviewModal = document.getElementById('gallery-preview-modal');
const galleryPreviewImage = document.getElementById('gallery-preview-image');
const galleryPreviewClose = document.getElementById('gallery-preview-close');
const selectableGalleryKinds = new Set(['background', 'overlay']);
const sceneStorageKey = 'gn_akari_scene_state';
const galleryCategoryStorageKey = 'gn_akari_gallery_category';
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

function setGalleryCategory(category) {
  const selectedCategory = category || 'works';
  galleryCategoryTabs.forEach((tab) => {
    const isActive = tab.dataset.galleryCategoryTab === selectedCategory;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  galleryCategorySections.forEach((section) => {
    section.classList.toggle('is-hidden', section.dataset.galleryCategory !== selectedCategory);
  });
}

function getStoredGalleryCategory() {
  try {
    const storedCategory = localStorage.getItem(galleryCategoryStorageKey) || '';
    return Array.from(galleryCategoryTabs).some((tab) => tab.dataset.galleryCategoryTab === storedCategory)
      ? storedCategory
      : 'works';
  } catch {
    return 'works';
  }
}

function saveGalleryCategory(category) {
  try {
    localStorage.setItem(galleryCategoryStorageKey, category);
  } catch {
    // Category persistence is optional.
  }
}

function updateEmptyState(kind) {
  if (kind === 'portrait' || kind === 'scene' || kind === 'works') {
    const hasPortraitItems = Boolean(portraitGalleryGrid?.querySelector('[data-gallery-item]'));
    const hasSceneItems = Boolean(sceneGalleryGrid?.querySelector('[data-gallery-item]'));
    const hasWorks = hasPortraitItems || hasSceneItems;
    portraitGallerySection?.classList.toggle('is-list-empty', !hasPortraitItems);
    sceneGallerySection?.classList.toggle('is-list-empty', !hasSceneItems);
    if (worksGalleryEmpty) {
      worksGalleryEmpty.style.display = hasWorks ? 'none' : 'block';
    }
    if (kind === 'works') return;
  }

  const galleryGrid = kind === 'overlay'
    ? overlayGalleryGrid
    : kind === 'background'
      ? backgroundGalleryGrid
      : kind === 'scene'
        ? sceneGalleryGrid
        : portraitGalleryGrid;
  const galleryEmpty = kind === 'overlay'
    ? overlayGalleryEmpty
    : kind === 'background'
      ? backgroundGalleryEmpty
      : kind === 'scene'
        ? sceneGalleryEmpty
        : portraitGalleryEmpty;
  if (!galleryEmpty) return;
  const hasItems = galleryGrid && galleryGrid.querySelector('[data-gallery-item]');
  galleryEmpty.style.display = hasItems ? 'none' : 'block';
}

function getGalleryGrid(kind) {
  if (kind === 'background') return backgroundGalleryGrid;
  if (kind === 'overlay') return overlayGalleryGrid;
  if (kind === 'scene') return sceneGalleryGrid;
  return portraitGalleryGrid;
}

function getGallerySection(kind) {
  return getGalleryGrid(kind)?.closest('.gallery-category-section') || null;
}

function getSelectedGalleryItems(kind) {
  if (!selectableGalleryKinds.has(kind)) return [];
  return Array.from(document.querySelectorAll(`[data-gallery-select="${kind}"]:checked`))
    .map((input) => input.dataset.filename || '')
    .filter(Boolean);
}

function updateSelectionControls(kind) {
  if (!selectableGalleryKinds.has(kind)) return;
  const section = getGallerySection(kind);
  const selectedCount = getSelectedGalleryItems(kind).length;
  const bulkDeleteButton = document.querySelector(`[data-gallery-bulk-delete="${kind}"]`);
  const clearButton = document.querySelector(`[data-gallery-selection-clear="${kind}"]`);
  const toggleButton = document.querySelector(`[data-gallery-select-toggle="${kind}"]`);
  const isSelectionMode = section?.classList.contains('is-selection-mode') || false;

  if (bulkDeleteButton) {
    bulkDeleteButton.hidden = !isSelectionMode;
    bulkDeleteButton.disabled = selectedCount === 0;
    bulkDeleteButton.textContent = selectedCount > 0 ? `選択中を削除 (${selectedCount})` : '選択中を削除';
  }
  if (clearButton) {
    clearButton.hidden = !isSelectionMode;
    clearButton.disabled = selectedCount === 0;
  }
  if (toggleButton) {
    toggleButton.textContent = isSelectionMode ? '選択終了' : '選択モード';
    toggleButton.setAttribute('aria-pressed', isSelectionMode ? 'true' : 'false');
  }
}

function setSelectionMode(kind, enabled) {
  if (!selectableGalleryKinds.has(kind)) return;
  const section = getGallerySection(kind);
  if (!section) return;
  section.classList.toggle('is-selection-mode', enabled);
  if (!enabled) {
    section.querySelectorAll(`[data-gallery-select="${kind}"]`).forEach((input) => {
      input.checked = false;
    });
  }
  updateSelectionControls(kind);
}

function clearGallerySelection(kind) {
  if (!selectableGalleryKinds.has(kind)) return;
  getGallerySection(kind)?.querySelectorAll(`[data-gallery-select="${kind}"]`).forEach((input) => {
    input.checked = false;
  });
  updateSelectionControls(kind);
}

function openGalleryPreview(url, altText = '') {
  if (!galleryPreviewModal || !galleryPreviewImage || !url) return;
  galleryPreviewImage.src = url;
  galleryPreviewImage.alt = altText;
  galleryPreviewModal.classList.remove('is-hidden');
  document.body.classList.add('is-preview-open');
  galleryPreviewClose?.focus();
}

function closeGalleryPreview() {
  if (!galleryPreviewModal || !galleryPreviewImage) return;
  galleryPreviewModal.classList.add('is-hidden');
  galleryPreviewImage.removeAttribute('src');
  galleryPreviewImage.alt = '';
  document.body.classList.remove('is-preview-open');
}

function usePortrait(filename, slot = 1) {
  if (!filename) return;
  const slotNumber = Number(slot) || 1;
  const slotParam = slotNumber > 1 ? `&slot=${encodeURIComponent(slotNumber)}` : '';
  window.location.href = "/scene?portrait=" + encodeURIComponent(filename) + slotParam;
}

function useBackground(filename) {
  if (!filename) return;
  window.location.href = "/scene?base_image_name=" + encodeURIComponent(filename);
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
    updateSelectionControls(kind);
  } catch {
  }
}

async function deleteGalleryImageRequest(kind, filename) {
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
  updateSelectionControls(kind);
  return data;
}

async function deleteSelectedGalleryImages(kind) {
  const filenames = getSelectedGalleryItems(kind);
  if (filenames.length === 0) return;
  if (!window.confirm(`選択中の${filenames.length}件を削除します。ファイルはゴミ箱に移動されます。よろしいですか？`)) {
    return;
  }

  let failedCount = 0;
  for (const filename of filenames) {
    try {
      await deleteGalleryImageRequest(kind, filename);
    } catch {
      failedCount += 1;
    }
  }
  updateSelectionControls(kind);
  if (failedCount > 0) {
    window.alert(`${failedCount}件の削除に失敗しました。`);
  }
}

function formatGalleryTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function appendBackgroundGalleryItem(item) {
  if (!backgroundGalleryGrid || !item?.filename || !item?.url) return;

  const card = document.createElement('div');
  card.className = 'gallery-item';
  card.dataset.galleryItem = `background:${item.filename}`;

  card.appendChild(createGallerySelectControl('background', item.filename));

  const link = document.createElement('a');
  link.className = 'gallery-link';
  link.href = item.url;
  link.target = '_blank';

  const image = document.createElement('img');
  image.className = 'gallery-image';
  image.src = item.thumbnail_url || item.url;
  image.alt = item.filename;
  image.loading = 'lazy';
  link.appendChild(image);

  const meta = document.createElement('div');
  meta.className = 'gallery-meta';
  const filename = document.createElement('div');
  filename.className = 'filename';
  filename.textContent = item.filename;
  const mtime = document.createElement('div');
  mtime.className = 'mtime';
  mtime.textContent = formatGalleryTimestamp(item.mtime);
  meta.appendChild(filename);
  meta.appendChild(mtime);

  const actions = document.createElement('div');
  actions.className = 'gallery-actions';
  const useButton = document.createElement('button');
  useButton.type = 'button';
  useButton.className = 'gallery-action-button gallery-action-button--use gallery-action-button--background-use';
  useButton.dataset.filename = item.filename;
  useButton.title = '写真合成で使う';
  useButton.setAttribute('aria-label', '写真合成で使う');
  useButton.textContent = '→';
  useButton.addEventListener('click', () => useBackground(item.filename));
  actions.appendChild(useButton);
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'gallery-action-button gallery-action-button--delete';
  deleteButton.dataset.filename = item.filename;
  deleteButton.title = '削除';
  deleteButton.setAttribute('aria-label', '削除');
  deleteButton.innerHTML = `
    <svg class="gallery-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16"></path>
      <path d="M10 11v6"></path>
      <path d="M14 11v6"></path>
      <path d="M6 7l1 14h10l1-14"></path>
      <path d="M9 7V4h6v3"></path>
    </svg>
  `;
  deleteButton.addEventListener('click', () => deleteGalleryImage('background', item.filename));
  actions.appendChild(deleteButton);

  card.appendChild(link);
  card.appendChild(meta);
  card.appendChild(actions);
  backgroundGalleryGrid.prepend(card);
  updateEmptyState('background');
}

function appendOverlayGalleryItem(item) {
  if (!overlayGalleryGrid || !item?.filename) return;

  const url = `/assets/overlay_images/${encodeURIComponent(item.filename)}`;
  const card = document.createElement('div');
  card.className = 'gallery-item';
  card.dataset.galleryItem = `overlay:${item.filename}`;

  card.appendChild(createGallerySelectControl('overlay', item.filename));

  const link = document.createElement('a');
  link.className = 'gallery-link';
  link.href = url;
  link.target = '_blank';

  const image = document.createElement('img');
  image.className = 'gallery-image';
  image.src = url;
  image.alt = item.filename;
  image.loading = 'lazy';
  link.appendChild(image);

  const meta = document.createElement('div');
  meta.className = 'gallery-meta';
  const label = document.createElement('div');
  label.className = 'gallery-label';
  label.textContent = item.label || item.id || item.filename;
  const filename = document.createElement('div');
  filename.className = 'filename';
  filename.textContent = item.filename;
  const summary = document.createElement('div');
  summary.className = 'gallery-summary';
  summary.textContent = `${item.default_width || 0} x ${item.default_height || 0} / ${item.kind || 'image'}`;
  const mtime = document.createElement('div');
  mtime.className = 'mtime';
  mtime.textContent = formatGalleryTimestamp(item.created_at);
  meta.appendChild(label);
  meta.appendChild(filename);
  meta.appendChild(summary);
  meta.appendChild(mtime);

  const actions = document.createElement('div');
  actions.className = 'gallery-actions';
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'gallery-action-button gallery-action-button--delete';
  deleteButton.dataset.filename = item.filename;
  deleteButton.title = '削除';
  deleteButton.setAttribute('aria-label', '削除');
  deleteButton.innerHTML = `
    <svg class="gallery-action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16"></path>
      <path d="M10 11v6"></path>
      <path d="M14 11v6"></path>
      <path d="M6 7l1 14h10l1-14"></path>
      <path d="M9 7V4h6v3"></path>
    </svg>
  `;
  deleteButton.addEventListener('click', () => deleteGalleryImage('overlay', item.filename));
  actions.appendChild(deleteButton);

  card.appendChild(link);
  card.appendChild(meta);
  card.appendChild(actions);
  overlayGalleryGrid.prepend(card);
  updateEmptyState('overlay');
}

function createGallerySelectControl(kind, filename) {
  const label = document.createElement('label');
  label.className = 'gallery-select-control';
  label.setAttribute('aria-label', `${filename} を選択`);
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.gallerySelect = kind;
  input.dataset.filename = filename;
  const marker = document.createElement('span');
  label.appendChild(input);
  label.appendChild(marker);
  return label;
}

async function uploadBackgroundLibraryImage(file) {
  if (!file) return false;
  const formData = new FormData();
  formData.append('background_image', file);

  try {
    const response = await fetch('/api/gallery/background/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '背景画像の追加に失敗しました。');
    }

    appendBackgroundGalleryItem(data.item);
    return true;
  } catch {
    return false;
  } finally {
    if (backgroundUploadInput) {
      backgroundUploadInput.value = '';
    }
  }
}

async function uploadOverlayAssetImage(file) {
  if (!file) return false;
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/overlay_assets/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'オーバーレイ画像の追加に失敗しました。');
    }

    appendOverlayGalleryItem(data.item);
    return true;
  } catch {
    return false;
  } finally {
    if (overlayUploadInput) {
      overlayUploadInput.value = '';
    }
  }
}

async function uploadGalleryFiles(files, uploadFile) {
  const selectedFiles = Array.from(files || []);
  if (selectedFiles.length === 0) return;
  let failedCount = 0;
  for (const file of selectedFiles) {
    const ok = await uploadFile(file);
    if (!ok) {
      failedCount += 1;
    }
  }
  if (failedCount > 0) {
    window.alert(`${failedCount}件の追加に失敗しました。`);
  }
}

document.addEventListener('click', (event) => {
  if (event.target.closest('.gallery-use-menu')) return;
  closePortraitSlotMenus();
});

document.addEventListener('click', (event) => {
  const link = event.target.closest('.gallery-link');
  if (!link) return;
  event.preventDefault();
  const image = link.querySelector('.gallery-image');
  openGalleryPreview(link.href, image?.alt || '');
});

galleryPreviewClose?.addEventListener('click', () => {
  closeGalleryPreview();
});

galleryPreviewModal?.addEventListener('click', (event) => {
  if (event.target === galleryPreviewModal) {
    closeGalleryPreview();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closePortraitSlotMenus();
    closeGalleryPreview();
  }
});

backgroundUploadInput?.addEventListener('change', () => {
  uploadGalleryFiles(backgroundUploadInput.files, uploadBackgroundLibraryImage);
});

backgroundUploadTrigger?.addEventListener('click', () => {
  backgroundUploadInput?.click();
});

overlayUploadInput?.addEventListener('change', () => {
  uploadGalleryFiles(overlayUploadInput.files, uploadOverlayAssetImage);
});

overlayUploadTrigger?.addEventListener('click', () => {
  overlayUploadInput?.click();
});

galleryCategoryTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const category = tab.dataset.galleryCategoryTab || 'works';
    setGalleryCategory(category);
    saveGalleryCategory(category);
  });
});

document.querySelectorAll('[data-gallery-select-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    const kind = button.dataset.gallerySelectToggle || '';
    const section = getGallerySection(kind);
    setSelectionMode(kind, !section?.classList.contains('is-selection-mode'));
  });
});

document.querySelectorAll('[data-gallery-selection-clear]').forEach((button) => {
  button.addEventListener('click', () => {
    clearGallerySelection(button.dataset.gallerySelectionClear || '');
  });
});

document.querySelectorAll('[data-gallery-bulk-delete]').forEach((button) => {
  button.addEventListener('click', () => {
    deleteSelectedGalleryImages(button.dataset.galleryBulkDelete || '');
  });
});

document.addEventListener('change', (event) => {
  const input = event.target.closest('[data-gallery-select]');
  if (!input) return;
  updateSelectionControls(input.dataset.gallerySelect || '');
});

setGalleryCategory(getStoredGalleryCategory());
updateSelectionControls('background');
updateSelectionControls('overlay');

initializePortraitSlotMenus();
