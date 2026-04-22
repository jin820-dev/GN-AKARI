const portraitStateKey = 'gn_akari_portrait_state';
const sceneStateKey = 'gn_akari_scene_state';
const scenePortraitLayoutsKey = 'gn_akari_scene_portrait_layouts';
const layerOrderModeKey = 'gn_akari_layer_order_mode';
const settingsStatus = document.getElementById('settings-status');
const settingsNameInput = document.getElementById('settings-name');
const exportSettingsButton = document.getElementById('export-settings-button');
const importSettingsInput = document.getElementById('import-settings-input');
const saveServerSettingsButton = document.getElementById('save-server-settings-button');
const loadServerSettingsButton = document.getElementById('load-server-settings-button');
const settingsList = document.getElementById('settings-list');
const settingsListEmpty = document.getElementById('settings-list-empty');
const layerOrderModeSelect = document.getElementById('layer-order-mode');
const psdUploadInput = document.getElementById('psd-upload-input');
const psdUploadButton = document.getElementById('psd-upload-button');
const psdList = document.getElementById('psd-list');
const psdListEmpty = document.getElementById('psd-list-empty');
const fontUploadInput = document.getElementById('font-upload-input');
const fontUploadButton = document.getElementById('font-upload-button');
const fontList = document.getElementById('font-list');
const fontListEmpty = document.getElementById('font-list-empty');
const emptyTrashButton = document.getElementById('empty-trash-button');
const trashItemCount = document.getElementById('trash-item-count');
let editingSettingsIndex = null;
let editingSettingsName = '';

function showStatus(message, isError = false) {
  if (!settingsStatus) return;
  settingsStatus.textContent = message;
  settingsStatus.style.color = isError ? '#b00020' : '#0a5';
}

function loadJsonStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJsonStorage(key, value) {
  if (value === null || value === undefined) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeLayerOrderMode(mode) {
  return ['aviutl', 'after_effects'].includes(mode) ? mode : 'aviutl';
}

function loadLayerOrderMode() {
  try {
    return normalizeLayerOrderMode(localStorage.getItem(layerOrderModeKey));
  } catch {
    return 'aviutl';
  }
}

function saveLayerOrderMode(mode) {
  const normalized = normalizeLayerOrderMode(mode);
  localStorage.setItem(layerOrderModeKey, normalized);
  const sceneState = loadJsonStorage(sceneStateKey);
  if (sceneState && typeof sceneState === 'object' && !Array.isArray(sceneState)) {
    sceneState.layer_order_mode = normalized;
    writeJsonStorage(sceneStateKey, sceneState);
  }
  return normalized;
}

function initializeLayerOrderModeSetting() {
  if (!layerOrderModeSelect) return;
  layerOrderModeSelect.value = loadLayerOrderMode();
  layerOrderModeSelect.addEventListener('change', () => {
    const mode = saveLayerOrderMode(layerOrderModeSelect.value);
    showStatus(`レイヤ順表示モードを保存しました: ${layerOrderModeSelect.options[layerOrderModeSelect.selectedIndex]?.text || mode}`);
  });
}

function collectStorageEntries(prefix) {
  const entries = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith(prefix)) {
      continue;
    }
    const parsed = loadJsonStorage(key);
    if (parsed !== null) {
      entries[key] = parsed;
    }
  }
  return entries;
}

function isObjectOrNull(value) {
  return value === null || (value && typeof value === 'object' && !Array.isArray(value));
}

function isValidPresetEntry(preset) {
  return Boolean(
    preset &&
    typeof preset === 'object' &&
    typeof preset.name === 'string' &&
    Array.isArray(preset.checked_ids)
  );
}

function isValidSettingsPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false;
  }

  if (data.presets_by_cache !== undefined) {
    if (!isObjectOrNull(data.presets_by_cache)) {
      return false;
    }
    for (const value of Object.values(data.presets_by_cache || {})) {
      if (!value || !Array.isArray(value.presets) || !value.presets.every(isValidPresetEntry)) {
        return false;
      }
    }
  }

  if (data.portrait_states_by_cache !== undefined && !isObjectOrNull(data.portrait_states_by_cache)) {
    return false;
  }
  if (!isObjectOrNull(data.portrait_state)) {
    return false;
  }
  if (!isObjectOrNull(data.scene_state)) {
    return false;
  }
  if (!isObjectOrNull(data.scene_portrait_layouts)) {
    return false;
  }
  if (data.layer_order_mode !== undefined && !['aviutl', 'after_effects'].includes(data.layer_order_mode)) {
    return false;
  }

  if (data.presets !== undefined) {
    if (!Array.isArray(data.presets) || !data.presets.every(isValidPresetEntry)) {
      return false;
    }
  }

  return true;
}

function buildSettingsPayload() {
  return {
    version: 2,
    exported_at: new Date().toISOString(),
    presets_by_cache: collectStorageEntries('gn_akari_presets_'),
    portrait_states_by_cache: collectStorageEntries('gn_akari_state_'),
    portrait_state: loadJsonStorage(portraitStateKey),
    scene_state: loadJsonStorage(sceneStateKey),
    scene_portrait_layouts: loadJsonStorage(scenePortraitLayoutsKey),
    layer_order_mode: loadLayerOrderMode(),
  };
}

function exportSettings() {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const payload = buildSettingsPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `gn-akari-settings-${timestamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showStatus('設定を書き出しました。');
}

function getSettingsName() {
  return (settingsNameInput?.value || '').trim();
}

function formatDateTime(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('ja-JP');
}

function applyLegacySettingsPayload(data) {
  if (!data.cache_key || !Array.isArray(data.presets) || !data.presets.every(isValidPresetEntry)) {
    throw new Error('旧形式の設定 JSON が不正です。');
  }
  localStorage.setItem(`gn_akari_presets_${data.cache_key}`, JSON.stringify({ presets: data.presets }));
  writeJsonStorage(portraitStateKey, data.portrait_state);
  writeJsonStorage(sceneStateKey, data.scene_state);
  writeJsonStorage(scenePortraitLayoutsKey, data.scene_portrait_layouts);
  if (data.layer_order_mode) {
    saveLayerOrderMode(data.layer_order_mode);
  }
}

function applySettingsPayload(data) {
  if (data.presets_by_cache) {
    Object.entries(data.presets_by_cache).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  }
  if (data.portrait_states_by_cache) {
    Object.entries(data.portrait_states_by_cache).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  }
  writeJsonStorage(portraitStateKey, data.portrait_state);
  writeJsonStorage(sceneStateKey, data.scene_state);
  writeJsonStorage(scenePortraitLayoutsKey, data.scene_portrait_layouts);
  if (data.layer_order_mode) {
    saveLayerOrderMode(data.layer_order_mode);
  }
  if (layerOrderModeSelect) {
    layerOrderModeSelect.value = loadLayerOrderMode();
  }
}

async function loadServerSettingsList() {
  try {
    const response = await fetch('/api/settings/list');
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '設定一覧の取得に失敗しました。');
    }
    renderServerSettingsList(data.items || []);
  } catch (error) {
    showStatus(error.message || '設定一覧の取得に失敗しました。', true);
  }
}

function renderPsdList(items) {
  if (!psdList || !psdListEmpty) return;
  psdList.innerHTML = '';
  psdListEmpty.classList.toggle('is-hidden', items.length > 0);
  if (!items.length) {
    return;
  }

  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'psd-item';

    const meta = document.createElement('div');
    meta.className = 'psd-item-meta';

    const name = document.createElement('div');
    name.className = 'psd-item-name';
    name.textContent = item.name;
    meta.appendChild(name);

    if (item.updated_at) {
      const date = document.createElement('div');
      date.className = 'psd-item-date';
      date.textContent = formatDateTime(item.updated_at);
      meta.appendChild(date);
    }

    const actions = document.createElement('div');
    actions.className = 'settings-item-actions';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = '削除';
    deleteButton.addEventListener('click', () => {
      void deletePsdFile(item.name);
    });
    actions.appendChild(deleteButton);

    row.appendChild(meta);
    row.appendChild(actions);
    psdList.appendChild(row);
  });
}

async function loadPsdList() {
  try {
    const response = await fetch('/api/files/psd/list');
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'PSD一覧の取得に失敗しました。');
    }
    renderPsdList(data.items || []);
  } catch (error) {
    showStatus(error.message || 'PSD一覧の取得に失敗しました。', true);
  }
}

async function uploadPsdFile() {
  const file = psdUploadInput?.files?.[0];
  if (!file) {
    showStatus('アップロードする PSD を選択してください。', true);
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/files/psd/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'PSDのアップロードに失敗しました。');
    }
    if (psdUploadInput) {
      psdUploadInput.value = '';
    }
    showStatus(`PSD「${data.name}」をアップロードしました。`);
    await loadPsdList();
  } catch (error) {
    showStatus(error.message || 'PSDのアップロードに失敗しました。', true);
  }
}

async function deletePsdFile(name) {
  if (!window.confirm(`PSD「${name}」を削除します。関連キャッシュもゴミ箱に移動されます。よろしいですか？`)) {
    return;
  }

  try {
    const response = await fetch('/api/files/psd/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'PSDの削除に失敗しました。');
    }
    showStatus(`PSD「${data.name}」と関連キャッシュを削除しました（ゴミ箱に移動されました）。`);
    await loadPsdList();
  } catch (error) {
    showStatus(error.message || 'PSDの削除に失敗しました。', true);
  }
}

async function uploadFontFile() {
  const file = fontUploadInput?.files?.[0];
  if (!file) {
    showStatus('アップロードするフォントを選択してください。', true);
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/files/font/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'フォントのアップロードに失敗しました。');
    }
    if (fontUploadInput) {
      fontUploadInput.value = '';
    }
    showStatus(`フォント「${data.name}」をアップロードしました。`);
    await loadFontList();
  } catch (error) {
    showStatus(error.message || 'フォントのアップロードに失敗しました。', true);
  }
}

function renderFontList(items) {
  if (!fontList || !fontListEmpty) return;
  fontList.innerHTML = '';
  fontListEmpty.classList.toggle('is-hidden', items.length > 0);
  if (!items.length) {
    return;
  }

  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'psd-item';

    const meta = document.createElement('div');
    meta.className = 'psd-item-meta';

    const name = document.createElement('div');
    name.className = 'psd-item-name';
    name.textContent = item.name;
    meta.appendChild(name);

    if (item.updated_at) {
      const date = document.createElement('div');
      date.className = 'psd-item-date';
      date.textContent = formatDateTime(item.updated_at);
      meta.appendChild(date);
    }

    const actions = document.createElement('div');
    actions.className = 'settings-item-actions';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = '削除';
    deleteButton.addEventListener('click', () => {
      void deleteFontFile(item.name);
    });
    actions.appendChild(deleteButton);

    row.appendChild(meta);
    row.appendChild(actions);
    fontList.appendChild(row);
  });
}

async function loadFontList() {
  try {
    const response = await fetch('/api/files/font/list');
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'フォント一覧の取得に失敗しました。');
    }
    renderFontList(data.items || []);
  } catch (error) {
    showStatus(error.message || 'フォント一覧の取得に失敗しました。', true);
  }
}

async function deleteFontFile(name) {
  if (!window.confirm(`フォント「${name}」を削除します。ファイルはゴミ箱に移動されます。よろしいですか？`)) {
    return;
  }

  try {
    const response = await fetch('/api/files/font/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'フォントの削除に失敗しました。');
    }
    showStatus(`フォント「${data.name}」を削除しました（ゴミ箱に移動されました）。`);
    await loadFontList();
  } catch (error) {
    showStatus(error.message || 'フォントの削除に失敗しました。', true);
  }
}

function renderServerSettingsList(items) {
  if (!settingsList || !settingsListEmpty) return;
  settingsList.innerHTML = '';
  settingsListEmpty.classList.toggle('is-hidden', items.length > 0);
  if (!items.length) {
    return;
  }

  items.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'settings-item';

    const meta = document.createElement('div');
    meta.className = 'settings-item-meta';

    if (editingSettingsIndex === index) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'settings-name-input';
      input.value = editingSettingsName;
      input.dataset.renameInput = 'true';
      input.addEventListener('input', (event) => {
        editingSettingsName = event.target.value;
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          void commitRenameServerSettings(item.settings_name);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          cancelRenameServerSettings();
        }
      });
      meta.appendChild(input);
    } else {
      const name = document.createElement('div');
      name.className = 'settings-item-name';
      name.textContent = item.settings_name;
      meta.appendChild(name);
    }

    const date = document.createElement('div');
    date.className = 'settings-item-date';
    date.textContent = item.updated_at;
    meta.appendChild(date);

    const actions = document.createElement('div');
    actions.className = 'settings-item-actions';

    if (editingSettingsIndex === index) {
      const saveButton = document.createElement('button');
      saveButton.type = 'button';
      saveButton.textContent = '保存';
      saveButton.addEventListener('click', () => {
        void commitRenameServerSettings(item.settings_name);
      });
      actions.appendChild(saveButton);

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.textContent = 'キャンセル';
      cancelButton.addEventListener('click', () => {
        cancelRenameServerSettings();
      });
      actions.appendChild(cancelButton);
    } else {
      const loadButton = document.createElement('button');
      loadButton.type = 'button';
      loadButton.textContent = '読込';
      loadButton.addEventListener('click', () => {
        if (settingsNameInput) {
          settingsNameInput.value = item.settings_name;
        }
        void loadServerSettings();
      });
      actions.appendChild(loadButton);

      const renameButton = document.createElement('button');
      renameButton.type = 'button';
      renameButton.textContent = '名前変更';
      renameButton.addEventListener('click', () => {
        startRenameServerSettings(index, item.settings_name);
      });
      actions.appendChild(renameButton);
    }

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = '削除';
    deleteButton.addEventListener('click', () => {
      void deleteServerSettings(item.settings_name);
    });
    actions.appendChild(deleteButton);

    row.appendChild(meta);
    row.appendChild(actions);
    settingsList.appendChild(row);
  });

  if (editingSettingsIndex !== null) {
    const activeInput = settingsList.querySelector('[data-rename-input="true"]');
    activeInput?.focus();
    activeInput?.select();
  }
}

function startRenameServerSettings(index, settingsName) {
  editingSettingsIndex = index;
  editingSettingsName = settingsName;
  void loadServerSettingsList();
}

function cancelRenameServerSettings() {
  editingSettingsIndex = null;
  editingSettingsName = '';
  void loadServerSettingsList();
}

async function commitRenameServerSettings(currentName) {
  const nextName = editingSettingsName.trim();
  if (!nextName) {
    showStatus('設定名を入力してください。', true);
    return;
  }
  if (nextName === currentName) {
    cancelRenameServerSettings();
    return;
  }

  try {
    const response = await fetch('/api/settings/rename', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        settings_name: currentName,
        new_settings_name: nextName,
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '設定名の変更に失敗しました。');
    }
    if (settingsNameInput?.value === currentName) {
      settingsNameInput.value = data.settings_name;
    }
    editingSettingsIndex = null;
    editingSettingsName = '';
    showStatus(`設定名を「${data.settings_name}」に変更しました。`);
    await loadServerSettingsList();
  } catch (error) {
    showStatus(error.message || '設定名の変更に失敗しました。', true);
  }
}

async function deleteServerSettings(settingsName) {
  if (!window.confirm(`設定「${settingsName}」を削除します。ファイルはゴミ箱に移動されます。よろしいですか？`)) {
    return;
  }

  try {
    const response = await fetch('/api/settings/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ settings_name: settingsName }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '設定の削除に失敗しました。');
    }
    if (settingsNameInput?.value === data.settings_name) {
      settingsNameInput.value = '';
    }
    if (editingSettingsName === settingsName) {
      editingSettingsIndex = null;
      editingSettingsName = '';
    }
    showStatus(`設定「${data.settings_name}」を削除しました（ゴミ箱に移動されました）。`);
    await loadServerSettingsList();
  } catch (error) {
    showStatus(error.message || '設定の削除に失敗しました。', true);
  }
}

async function emptyTrash() {
  if (!window.confirm('ゴミ箱内のファイルをすべて削除します。元に戻せません。続けますか？')) {
    return;
  }

  try {
    const response = await fetch('/api/trash/empty', {
      method: 'POST',
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'ゴミ箱を空にできませんでした。');
    }
    if (trashItemCount) {
      trashItemCount.textContent = '現在のゴミ箱記録数: 0件';
    }
    showStatus(`ゴミ箱を空にしました（${data.deleted_count || 0}件）。`);
  } catch (error) {
    showStatus(error.message || 'ゴミ箱を空にできませんでした。', true);
  }
}

async function saveServerSettings() {
  const settingsName = getSettingsName();
  if (!settingsName) {
    showStatus('設定名を入力してください。', true);
    return;
  }
  if (!window.confirm(`設定「${settingsName}」をサーバへ保存します。既存があれば上書きします。よろしいですか？`)) {
    return;
  }

  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        settings_name: settingsName,
        payload: buildSettingsPayload(),
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '設定の保存に失敗しました。');
    }
    showStatus(`設定「${data.settings_name}」を保存しました。`);
    await loadServerSettingsList();
  } catch (error) {
    showStatus(error.message || '設定の保存に失敗しました。', true);
  }
}

async function loadServerSettings() {
  const settingsName = getSettingsName();
  if (!settingsName) {
    showStatus('設定名を入力してください。', true);
    return;
  }
  if (!window.confirm(`設定「${settingsName}」を読み込みます。現在のローカル設定は上書きされます。よろしいですか？`)) {
    return;
  }

  try {
    const response = await fetch(`/api/settings?settings_name=${encodeURIComponent(settingsName)}`);
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(data.error || '設定の読込に失敗しました。');
    }
    applySettingsPayload(data.payload);
    showStatus(`設定「${data.settings_name}」を読み込みました。必要なら各ページを再読み込みしてください。`);
  } catch (error) {
    showStatus(error.message || '設定の読込に失敗しました。', true);
  }
}

function importSettings(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!isValidSettingsPayload(data)) {
        showStatus('不正な設定 JSON です。', true);
        return;
      }

      if (data.cache_key && Array.isArray(data.presets) && !data.presets_by_cache) {
        applyLegacySettingsPayload(data);
      } else {
        applySettingsPayload(data);
      }
      showStatus('設定を読み込みました。必要なら各ページを再読み込みしてください。');
    } catch {
      showStatus('JSON の読み込みに失敗しました。', true);
    }
  };
  reader.readAsText(file);
}

exportSettingsButton?.addEventListener('click', exportSettings);
saveServerSettingsButton?.addEventListener('click', () => {
  void saveServerSettings();
});
loadServerSettingsButton?.addEventListener('click', () => {
  void loadServerSettings();
});
importSettingsInput?.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  importSettings(file);
  event.target.value = '';
});
psdUploadButton?.addEventListener('click', () => {
  void uploadPsdFile();
});
fontUploadButton?.addEventListener('click', () => {
  void uploadFontFile();
});
emptyTrashButton?.addEventListener('click', () => {
  void emptyTrash();
});

initializeLayerOrderModeSetting();
void loadServerSettingsList();
void loadPsdList();
void loadFontList();
