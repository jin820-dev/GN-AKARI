const cacheKey = document.body.dataset.cacheKey;
const selectedPsd = document.body.dataset.selectedPsd;
const storageKey = cacheKey ? `gn_akari_state_${cacheKey}` : null;
const presetsKey = cacheKey ? `gn_akari_presets_${cacheKey}` : null;
const portraitStateKey = 'gn_akari_portrait_state';
const portraitRestorePendingKey = 'gn_akari_portrait_restore_pending';
const pendingComposeReflectKey = 'gn_akari_pending_compose_reflect';
const presetStatus = document.getElementById('preset-status');
const presetSelect = document.getElementById('preset-select');
const applyPresetButton = document.getElementById('apply-preset-button');
const renamePresetButton = document.getElementById('rename-preset-button');
const deletePresetButton = document.getElementById('delete-preset-button');
const savePresetButton = document.getElementById('save-preset-button');
const psdLoadForm = document.getElementById('psd-load-form');
const psdDisplayPathSelect = document.getElementById('psd-display-path');
const psdPathInput = document.getElementById('psd-path');
const previewLayerStack = document.getElementById('preview-layer-stack');
const previewDataElement = document.getElementById('preview-data');
const reflectedLayerSignatureElement = document.getElementById('reflected-layer-signature');
const previewLinkRow = document.getElementById('preview-link-row');
const previewNote = document.getElementById('preview-note');
const previewStage = document.getElementById('preview-stage');
const previewEmpty = document.getElementById('preview-empty');
const previewPanel = document.getElementById('workbench-preview');
const previewToggleButton = document.getElementById('preview-toggle-button');
const savePortraitButton = document.getElementById('save-portrait-button');
const portraitLink = document.getElementById('portrait-link');
const portraitLinkRow = document.getElementById('portrait-link-row');
const portraitSaveNote = document.getElementById('portrait-save-note');
const previewCollapsedStorageKey = 'gn_akari_preview_collapsed';
let autoComposeTimer = null;
let latestComposeRequestId = 0;
let lastSubmittedComposeSignature = null;
let lastReflectedComposeSignature = parseReflectedLayerSignature();
let composeReflectLeaveHandled = false;
let composeReflectPendingSaved = false;
let isRestoringPortraitState = false;
let editingPresetIndex = null;
let editingPresetName = '';
let selectedPresetIndex = 0;
const previewData = parsePreviewData();

function showStatus(message, isError = false) {
  if (!presetStatus) return;
  presetStatus.textContent = message;
  presetStatus.style.color = isError ? '#b00020' : '#0a5';
}

function showPreviewNote(message, state = '') {
  if (!previewNote) return;
  previewNote.textContent = message;
  previewNote.classList.toggle('is-loading', state === 'loading');
  previewNote.classList.toggle('is-error', state === 'error');
}

function setPreviewCollapsed(collapsed) {
  if (!previewPanel || !previewToggleButton) return;
  previewPanel.classList.toggle('is-preview-collapsed', collapsed);
  previewToggleButton.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  try {
    sessionStorage.setItem(previewCollapsedStorageKey, collapsed ? '1' : '0');
  } catch {
    // Preview collapse state is optional.
  }
}

function initializePreviewCollapse() {
  if (!previewPanel || !previewToggleButton) return;
  setPreviewCollapsed(false);
  previewToggleButton.addEventListener('click', () => {
    setPreviewCollapsed(!previewPanel.classList.contains('is-preview-collapsed'));
  });
}

function showPortraitSaveNote(message, state = '') {
  if (!portraitSaveNote) return;
  portraitSaveNote.textContent = message;
  portraitSaveNote.classList.toggle('is-success', state === 'success');
  portraitSaveNote.classList.toggle('is-error', state === 'error');
}

function loadState() {
  if (!storageKey) return null;
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadPortraitPageState() {
  try {
    const raw = localStorage.getItem(portraitStateKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function clearPortraitPageState() {
  localStorage.removeItem(portraitStateKey);
  sessionStorage.removeItem(portraitRestorePendingKey);
}

function parsePreviewData() {
  if (!previewDataElement?.textContent) return null;
  try {
    return JSON.parse(previewDataElement.textContent);
  } catch {
    return null;
  }
}

function parseReflectedLayerSignature() {
  if (!reflectedLayerSignatureElement?.textContent) return '';
  try {
    const signature = JSON.parse(reflectedLayerSignatureElement.textContent);
    return typeof signature === 'string' ? signature : '';
  } catch {
    return '';
  }
}

function loadPresets() {
  if (!presetsKey) return { presets: [] };
  const raw = localStorage.getItem(presetsKey);
  if (!raw) return { presets: [] };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.presets)) return { presets: [] };
    return parsed;
  } catch {
    return { presets: [] };
  }
}

function savePresets(data) {
  if (!presetsKey) return;
  localStorage.setItem(presetsKey, JSON.stringify(data));
}

function syncSelectedPsdPath() {
  if (!psdPathInput || !psdDisplayPathSelect) return;
  const selectedOption = psdDisplayPathSelect.selectedOptions?.[0];
  psdPathInput.value = selectedOption?.dataset.psdPath || '';
}

function collectCheckedIds() {
  return Array.from(document.querySelectorAll('[data-node-checkbox]:checked')).map((checkbox) =>
    Number(checkbox.dataset.nodeId)
  );
}

function collectCheckedLayerIds() {
  return collectCheckedIds().filter((id) => {
    const node = document.querySelector(`[data-node-id="${id}"]`);
    return node?.dataset.nodeType === 'layer';
  });
}

function buildLayerIdsSignature(layerIds) {
  return [...layerIds].sort((a, b) => a - b).join(',');
}

function collectExpandedGroups() {
  return Array.from(document.querySelectorAll('.tree-node[data-node-type="group"]'))
    .filter((node) => {
      const children = node.querySelector(':scope > [data-children]');
      return children && !children.classList.contains('is-collapsed');
    })
    .map((node) => Number(node.dataset.nodeId));
}

function collectCollapsedGroupIds() {
  return Array.from(document.querySelectorAll('.tree-node[data-node-type="group"]'))
    .filter((node) => {
      const children = node.querySelector(':scope > [data-children]');
      return children?.classList.contains('is-collapsed');
    })
    .map((node) => Number(node.dataset.nodeId));
}

function currentState() {
  return {
    checked_ids: collectCheckedIds(),
    expanded_groups: collectExpandedGroups(),
  };
}

function saveState() {
  if (!storageKey) return;
  localStorage.setItem(storageKey, JSON.stringify(currentState()));
  savePortraitPageState();
}

function setExpanded(node, expanded) {
  const children = node.querySelector(':scope > [data-children]');
  const button = node.querySelector(':scope .node-line [data-toggle]');
  if (!children || !button) return;
  children.classList.toggle('is-collapsed', !expanded);
  button.textContent = expanded ? '▼' : '▶';
  button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

function applyState(state) {
  const checkedIds = new Set((state.checked_ids || []).map(Number));
  document.querySelectorAll('[data-node-checkbox]').forEach((checkbox) => {
    checkbox.checked = checkedIds.has(Number(checkbox.dataset.nodeId));
  });

  const expandedGroups = new Set((state.expanded_groups || []).map(Number));
  document.querySelectorAll('.tree-node[data-node-type="group"]').forEach((node) => {
    const children = node.querySelector(':scope > [data-children]');
    if (!children) return;
    setExpanded(node, expandedGroups.has(Number(node.dataset.nodeId)));
  });
}

function applySavedState() {
  const state = loadState();
  if (!state) return;
  applyState(state);
}

function buildPortraitPageState() {
  if (!selectedPsd || !cacheKey) return null;
  return {
    psd_path: selectedPsd,
    cache_key: cacheKey,
    checked_layer_ids: collectCheckedLayerIds(),
    collapsed_group_ids: collectCollapsedGroupIds(),
  };
}

function savePortraitPageState() {
  const state = buildPortraitPageState();
  if (!state) return;
  localStorage.setItem(portraitStateKey, JSON.stringify(state));
}

function applyPortraitPageState(state) {
  if (!state || state.psd_path !== selectedPsd || state.cache_key !== cacheKey) {
    return false;
  }

  const checkedIds = new Set((state.checked_layer_ids || []).map(String));
  document.querySelectorAll('input[name="layer_ids"]').forEach((checkbox) => {
    checkbox.checked = checkedIds.has(String(checkbox.value));
  });
  document.querySelectorAll('[data-group-checkbox]').forEach((checkbox) => {
    const node = checkbox.closest('.tree-node');
    const childLayerCheckboxes = node?.querySelectorAll('input[name="layer_ids"]') || [];
    checkbox.checked = Array.from(childLayerCheckboxes).some((childCheckbox) => childCheckbox.checked);
  });

  const collapsedIds = new Set((state.collapsed_group_ids || []).map(Number));
  document.querySelectorAll('.tree-node[data-node-type="group"]').forEach((node) => {
    const children = node.querySelector(':scope > [data-children]');
    if (!children) return;
    setExpanded(node, !collapsedIds.has(Number(node.dataset.nodeId)));
  });
  return true;
}

function submitPortraitRestore(psdPath) {
  const form = document.createElement('form');
  form.method = 'post';
  form.action = '/load_psd';

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'psd_path';
  input.value = psdPath;
  form.appendChild(input);

  document.body.appendChild(form);
  form.submit();
}

function restorePortraitPageOnLoad() {
  const savedPortraitState = loadPortraitPageState();
  if (!savedPortraitState?.psd_path) {
    sessionStorage.removeItem(portraitRestorePendingKey);
    return false;
  }

  if (!cacheKey) {
    if (sessionStorage.getItem(portraitRestorePendingKey) === savedPortraitState.psd_path) {
      clearPortraitPageState();
      return false;
    }
    sessionStorage.setItem(portraitRestorePendingKey, savedPortraitState.psd_path);
    submitPortraitRestore(savedPortraitState.psd_path);
    return true;
  }

  sessionStorage.removeItem(portraitRestorePendingKey);
  isRestoringPortraitState = true;
  const applied = applyPortraitPageState(savedPortraitState);
  if (applied) {
    saveState();
    scheduleAutoCompose();
  }
  isRestoringPortraitState = false;
  return applied;
}

function renderPresetList() {
  if (!presetSelect) return;
  const presets = loadPresets().presets;
  presetSelect.innerHTML = '';

  if (presets.length === 0) {
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '保存済みプリセットはありません';
    presetSelect.appendChild(emptyOption);
    presetSelect.disabled = true;
    applyPresetButton?.setAttribute('disabled', 'disabled');
    renamePresetButton?.setAttribute('disabled', 'disabled');
    deletePresetButton?.setAttribute('disabled', 'disabled');
    return;
  }

  presets.forEach((preset, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = preset.name;
    presetSelect.appendChild(option);
  });

  const fallbackIndex = Math.min(selectedPresetIndex, presets.length - 1);
  presetSelect.value = String(fallbackIndex);
  selectedPresetIndex = Number(presetSelect.value) || 0;
  presetSelect.disabled = false;
  applyPresetButton?.removeAttribute('disabled');
  renamePresetButton?.removeAttribute('disabled');
  deletePresetButton?.removeAttribute('disabled');
}

function getSelectedPresetIndex() {
  if (!presetSelect || presetSelect.disabled) return -1;
  const index = Number(presetSelect.value);
  return Number.isInteger(index) ? index : -1;
}

function getSelectedPreset() {
  const index = getSelectedPresetIndex();
  if (index < 0) return { index: -1, preset: null };
  return { index, preset: loadPresets().presets[index] || null };
}

function applySelectedPreset() {
  const { preset } = getSelectedPreset();
  if (!preset) {
    showStatus('対象のプリセットが見つかりません。', true);
    return;
  }
  applyState(preset);
  saveState();
  showStatus(`プリセット「${preset.name}」を適用しました。`);
  scheduleAutoCompose();
}

function deleteSelectedPreset() {
  const { index, preset } = getSelectedPreset();
  if (!preset) {
    showStatus('対象のプリセットが見つかりません。', true);
    return;
  }
  const data = loadPresets();
  data.presets.splice(index, 1);
  selectedPresetIndex = Math.max(0, Math.min(index, data.presets.length - 1));
  savePresets(data);
  renderPresetList();
  showStatus(`プリセット「${preset.name}」を削除しました。`);
}

function startRenamePreset(index) {
  const data = loadPresets();
  const target = data.presets[index];
  if (!target) {
    showStatus('対象のプリセットが見つかりません。', true);
    return;
  }
  const nextName = window.prompt('新しいプリセット名を入力してください。', target.name);
  if (nextName === null) return;
  editingPresetIndex = index;
  editingPresetName = nextName;
  commitRenamePreset(index);
}

function commitRenamePreset(index) {
  const data = loadPresets();
  const target = data.presets[index];
  if (!target) {
    showStatus('対象のプリセットが見つかりません。', true);
    cancelRenamePreset();
    return;
  }

  const trimmedName = editingPresetName.trim();
  if (!trimmedName) {
    showStatus('プリセット名を入力してください。', true);
    return;
  }
  if (trimmedName === target.name) {
    cancelRenamePreset();
    return;
  }
  if (data.presets.some((preset, presetIndex) => presetIndex !== index && preset.name === trimmedName)) {
    showStatus(`プリセット「${trimmedName}」は既に存在します。`, true);
    return;
  }

  target.name = trimmedName;
  selectedPresetIndex = index;
  editingPresetIndex = null;
  editingPresetName = '';
  savePresets(data);
  renderPresetList();
  showStatus(`プリセット名を「${trimmedName}」に変更しました。`);
}

function cancelRenamePreset() {
  editingPresetIndex = null;
  editingPresetName = '';
  renderPresetList();
}

function savePreset() {
  const name = (window.prompt('新規に登録するプリセット名を入力してください。') || '').trim();
  if (!name) {
    showStatus('プリセット名を入力してください。', true);
    return;
  }

  const data = loadPresets();
  const existing = data.presets.find((preset) => preset.name === name);
  if (existing && !window.confirm(`同名のプリセット「${name}」があります。上書きしますか？`)) {
    return;
  }

  const preset = {
    name,
    checked_ids: currentState().checked_ids,
    expanded_groups: currentState().expanded_groups,
  };

  if (existing) {
    Object.assign(existing, preset);
  } else {
    data.presets.push(preset);
  }

  selectedPresetIndex = data.presets.findIndex((storedPreset) => storedPreset.name === name);
  savePresets(data);
  renderPresetList();
  showStatus(`プリセット「${name}」を保存しました。`);
}

function runAutoCompose(requestId, checkedLayerIds) {
  if (requestId !== latestComposeRequestId) return;
  if (!cacheKey || !previewLayerStack || !previewData?.layers) return;

  const selectedLayerIds = new Set(checkedLayerIds.map(Number));
  const selectedLayers = previewData.layers.filter((layer) => selectedLayerIds.has(Number(layer.id)));
  previewLayerStack.replaceChildren();

  if (selectedLayers.length === 0) {
    previewStage?.classList.add('is-hidden');
    previewEmpty?.classList.remove('is-hidden');
    previewLinkRow?.classList.add('is-hidden');
    showPreviewNote('');
    return;
  }

  selectedLayers.forEach((layer) => {
    const image = document.createElement('img');
    image.src = layer.png_url;
    image.alt = '';
    image.draggable = false;
    previewLayerStack.appendChild(image);
  });

  previewEmpty?.classList.add('is-hidden');
  previewStage?.classList.remove('is-hidden');
  previewLinkRow?.classList.add('is-hidden');
  showPreviewNote('');
}

function logPendingComposeRemove(reason) {
  console.log('[compose-pending] remove', {
    reason,
    rawBeforeRemove: sessionStorage.getItem(pendingComposeReflectKey),
  });
}

function isComposeReflectLeaveReason(reason) {
  return reason === 'pagehide' || reason === 'beforeunload';
}

function reflectComposeBeforeLeaving(reason = 'unknown') {
  const isLeaveReason = isComposeReflectLeaveReason(reason);
  if (isLeaveReason && composeReflectLeaveHandled) {
    console.log('[compose-pending] skip', {
      reason,
      skipReason: composeReflectPendingSaved ? 'leave already saved pending' : 'leave already handled',
      currentSignature: '',
      lastReflectedSignature: lastReflectedComposeSignature,
      checkedLayerIds: [],
    });
    return;
  }
  if (isLeaveReason) {
    composeReflectLeaveHandled = true;
  }

  if (!cacheKey) {
    console.log('[compose-pending] skip', {
      reason,
      skipReason: 'missing cacheKey',
      currentSignature: '',
      lastReflectedSignature: lastReflectedComposeSignature,
      checkedLayerIds: [],
    });
    return;
  }
  const checkedLayerIds = collectCheckedLayerIds();
  if (checkedLayerIds.length === 0) {
    console.log('[compose-pending] skip', {
      reason,
      skipReason: 'no checked layer ids',
      currentSignature: '',
      lastReflectedSignature: lastReflectedComposeSignature,
      checkedLayerIds,
    });
    return;
  }

  const composeSignature = buildLayerIdsSignature(checkedLayerIds);
  if (lastReflectedComposeSignature === composeSignature) {
    console.log('[compose-pending] skip', {
      reason,
      skipReason: 'signature matched',
      currentSignature: composeSignature,
      lastReflectedSignature: lastReflectedComposeSignature,
      checkedLayerIds,
    });
    if (composeReflectPendingSaved) return;
    logPendingComposeRemove(`${reason}: signature matched`);
    sessionStorage.removeItem(pendingComposeReflectKey);
    return;
  }

  const pendingPayload = {
    cache_key: cacheKey,
    signature: composeSignature,
  };
  console.log('[compose-pending] save', {
    reason,
    currentSignature: composeSignature,
    lastReflectedSignature: lastReflectedComposeSignature,
    checkedLayerIds,
    pendingPayload,
  });
  sessionStorage.setItem(pendingComposeReflectKey, JSON.stringify(pendingPayload));
  console.log('[compose-pending] saved raw', sessionStorage.getItem(pendingComposeReflectKey));
  composeReflectLeaveHandled = true;
  composeReflectPendingSaved = true;
  lastReflectedComposeSignature = composeSignature;
  const payload = JSON.stringify({
    cache_key: cacheKey,
    checked_ids: checkedLayerIds,
  });

  try {
    fetch('/api/compose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Navigation should not be blocked by best-effort preview persistence.
  }
}

async function savePortrait() {
  if (!cacheKey) return;

  try {
    const checkedIds = collectCheckedLayerIds();
    if (checkedIds.length === 0) {
      showPortraitSaveNote('保存するレイヤーを1つ以上選択してください。', 'error');
      return;
    }
    const portraitName = (window.prompt('名前を入力してください。') || '').trim();
    if (!portraitName) return;

    showPortraitSaveNote('立ち絵を保存中...');
    const response = await fetch('/api/save_portrait', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cache_key: cacheKey,
        checked_ids: checkedIds,
        name: portraitName,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '立ち絵の保存に失敗しました。');
    }

    portraitLink.href = data.image_url;
    portraitLink.textContent = data.image_url.replace('/outputs/', '');
    portraitLinkRow.classList.remove('is-hidden');
    showPortraitSaveNote('立ち絵を保存しました。', 'success');
  } catch (error) {
    showPortraitSaveNote(error.message || '立ち絵の保存に失敗しました。', 'error');
  }
}

function scheduleAutoCompose() {
  if (!previewLayerStack) return;
  const checkedLayerIds = collectCheckedLayerIds();
  const composeSignature = buildLayerIdsSignature(checkedLayerIds);
  if (lastSubmittedComposeSignature === composeSignature) {
    if (autoComposeTimer) {
      clearTimeout(autoComposeTimer);
      autoComposeTimer = null;
    }
    return;
  }

  if (autoComposeTimer) {
    clearTimeout(autoComposeTimer);
  }
  const requestId = ++latestComposeRequestId;
  autoComposeTimer = null;
  lastSubmittedComposeSignature = composeSignature;
  runAutoCompose(requestId, checkedLayerIds);
}

document.querySelectorAll('[data-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    const node = button.closest('.tree-node');
    const children = node.querySelector(':scope > [data-children]');
    if (!children) return;
    const expanded = children.classList.contains('is-collapsed');
    setExpanded(node, expanded);
    saveState();
  });
});

document.querySelectorAll('[data-group-checkbox]').forEach((checkbox) => {
  checkbox.addEventListener('change', () => {
    if (isRestoringPortraitState) return;
    const node = checkbox.closest('.tree-node');
    node.querySelectorAll('[data-group-checkbox], input[name="layer_ids"]').forEach((childCheckbox) => {
      childCheckbox.checked = checkbox.checked;
    });
    saveState();
    scheduleAutoCompose();
  });
});

document.querySelectorAll('input[name="layer_ids"]').forEach((checkbox) => {
  checkbox.addEventListener('change', () => {
    if (isRestoringPortraitState) return;
    saveState();
    scheduleAutoCompose();
  });
});

initializePreviewCollapse();
psdDisplayPathSelect?.addEventListener('change', syncSelectedPsdPath);
psdLoadForm?.addEventListener('submit', () => {
  console.log('[compose-pending] enter psd load submit');
  reflectComposeBeforeLeaving('psd load submit');
  syncSelectedPsdPath();
});
savePresetButton?.addEventListener('click', savePreset);
applyPresetButton?.addEventListener('click', applySelectedPreset);
renamePresetButton?.addEventListener('click', () => startRenamePreset(getSelectedPresetIndex()));
deletePresetButton?.addEventListener('click', deleteSelectedPreset);
presetSelect?.addEventListener('change', () => {
  selectedPresetIndex = getSelectedPresetIndex();
});
savePortraitButton?.addEventListener('click', savePortrait);
document.querySelector('form[action="/compose"]')?.addEventListener('submit', () => {
  console.log('[compose-pending] enter manual compose submit');
  lastReflectedComposeSignature = buildLayerIdsSignature(collectCheckedLayerIds());
  logPendingComposeRemove('manual compose submit');
  sessionStorage.removeItem(pendingComposeReflectKey);
});
window.addEventListener('pagehide', () => {
  console.log('[compose-pending] enter pagehide');
  reflectComposeBeforeLeaving('pagehide');
});
window.addEventListener('beforeunload', () => {
  console.log('[compose-pending] enter beforeunload');
  reflectComposeBeforeLeaving('beforeunload');
});

const restoredPortraitState = restorePortraitPageOnLoad();
if (!restoredPortraitState) {
  applySavedState();
  if (cacheKey) {
    saveState();
    scheduleAutoCompose();
  }
}
syncSelectedPsdPath();
savePortraitPageState();
renderPresetList();
