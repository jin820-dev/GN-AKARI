    const sceneBootstrap = window.sceneBootstrap || {};
    const canvasPresets = sceneBootstrap.canvasPresets || {};
    const bubbleOverlayAssets = sceneBootstrap.bubbleOverlayAssets || {};
    const backgroundGalleryItems = sceneBootstrap.backgroundGalleryItems || [];
    const previewSources = sceneBootstrap.previewSources || [];
    const previewScaleFactor = 0.5;

    // Scene state: initialPortraitFilename is a one-time URL seed; lastSelectedPortraitFilename is kept separately from the active source.
    let initialPortraitFilename = sceneBootstrap.initialPortraitFilename || '';
    let initialPortraitSlot = Number(sceneBootstrap.initialPortraitSlot) >= 1
      ? Number(sceneBootstrap.initialPortraitSlot)
      : 1;
    const initialBaseImageName = sceneBootstrap.initialBaseImageName || '';
    const initialBaseImageUrl = sceneBootstrap.initialBaseImageUrl || '';
    const sceneStorageKey = 'gn_akari_scene_state';
    const portraitLayoutStorageKey = 'gn_akari_scene_portrait_layouts';
    const sceneUiStateStorageKey = 'gn_akari_scene_ui_state';
    const layerOrderModeStorageKey = 'gn_akari_layer_order_mode';
    const pendingComposeReflectKey = 'gn_akari_pending_compose_reflect';
    const sceneBaseImageDbName = 'gn_akari_scene_state_db';
    const sceneBaseImageStoreName = 'scene_base_image_store';
    const sceneBaseImageRecordKey = 'latest';
    const sceneForm = document.getElementById('scene-form');
    const sceneStatus = document.getElementById('scene-status');
    const sceneStage = document.getElementById('scene-stage');
    const previewStageViewport = document.getElementById('preview-stage-viewport');
    const previewStageScale = document.getElementById('preview-stage-scale');
    const currentSource = document.getElementById('current-source');
    const previewCanvas = document.getElementById('preview-canvas');
    const layerOrderInput = document.getElementById('layer-order');
    const layerOrderModeInput = document.getElementById('layer-order-mode');
    const sceneLayerListEnd = document.getElementById('scene-layer-list-end');
    const addCharacterSlotButton = document.getElementById('add-character-slot');
    const removeCharacterSlotButton = document.getElementById('remove-character-slot');
    const addTextSlotButton = document.getElementById('add-text-slot');
    const removeTextSlotButton = document.getElementById('remove-text-slot');
    const textSlotCountInput = document.getElementById('text-slot-count');
    const baseLayer = document.getElementById('base-layer');
    const messageBandLayer = document.getElementById('message-band-layer');
    const portraitLayer = document.getElementById('portrait-layer');
    const portraitLayer2 = document.getElementById('portrait-layer-2');
    const portraitLayer3 = document.getElementById('portrait-layer-3');
    const bubbleOverlayLayer = document.getElementById('bubble-overlay-layer');
    const bubbleOverlayResizeHandleRight = document.getElementById('bubble-overlay-resize-handle-right');
    const bubbleOverlayResizeHandleBottom = document.getElementById('bubble-overlay-resize-handle-bottom');
    const bubbleDebugRect = document.getElementById('bubble-debug-rect');
    const sceneEmpty = document.getElementById('scene-empty');
    const sceneLink = document.getElementById('scene-link');
    const sceneLinkRow = document.getElementById('scene-link-row');
    const baseImageInput = document.getElementById('base-image');
    const backgroundPickerToggle = document.getElementById('background-picker-toggle');
    const backgroundPicker = document.getElementById('background-picker');
    const baseImageSource = document.getElementById('base-image-source');
    const baseImageNameInput = document.getElementById('base-image-name');
    const baseImageDisplayNameInput = document.getElementById('base-image-display-name');
    const baseFitModeSelect = document.getElementById('base-fit-mode');
    const baseScaleInput = document.getElementById('base-scale');
    const baseXInput = document.getElementById('base-x');
    const baseYInput = document.getElementById('base-y');
    const canvasPresetSelect = document.getElementById('canvas-preset');

    function appendText(parent, text) {
      parent.appendChild(document.createTextNode(text));
    }

    function createCharacterSlotBlock(slotDef) {
      const block = document.createElement('div');
      block.className = 'settings-block';
      block.dataset.sectionKey = slotDef.layerId;
      block.dataset.layerId = slotDef.layerId;

      if (!document.getElementById(slotDef.domIds.portraitFilename)) {
        const portraitFilenameInput = document.createElement('input');
        portraitFilenameInput.type = 'hidden';
        portraitFilenameInput.id = slotDef.domIds.portraitFilename;
        portraitFilenameInput.name = getCharacterStateKey(slotDef, 'portraitFilename');
        portraitFilenameInput.value = '';
        block.appendChild(portraitFilenameInput);
      }

      const header = document.createElement('button');
      header.type = 'button';
      header.className = 'settings-block-header';
      header.dataset.settingsToggle = slotDef.layerId;
      header.setAttribute('aria-expanded', 'true');

      const headerMain = document.createElement('span');
      headerMain.className = 'settings-block-header-main';
      const title = document.createElement('h3');
      title.className = 'settings-block-title';
      title.textContent = `キャラ${slotDef.slot}`;
      headerMain.appendChild(title);

      const actions = document.createElement('span');
      actions.className = 'settings-block-header-actions';
      const visibleLabel = document.createElement('label');
      visibleLabel.className = 'section-visible-toggle';
      visibleLabel.htmlFor = slotDef.domIds.enabled;
      const enabledInput = document.createElement('input');
      enabledInput.id = slotDef.domIds.enabled;
      enabledInput.name = getCharacterStateKey(slotDef, 'enabled');
      enabledInput.type = 'checkbox';
      enabledInput.value = '1';
      enabledInput.checked = slotDef.enabledDefault === true;
      enabledInput.addEventListener('click', (event) => {
        event.stopPropagation();
      });
      const visibilityIcon = document.createElement('span');
      visibilityIcon.className = 'visibility-icon';
      visibilityIcon.setAttribute('aria-hidden', 'true');
      visibleLabel.appendChild(enabledInput);
      visibleLabel.appendChild(visibilityIcon);
      visibleLabel.addEventListener('click', (event) => {
        event.stopPropagation();
      });
      const collapseToggle = document.createElement('span');
      collapseToggle.className = 'settings-block-toggle';
      collapseToggle.setAttribute('aria-hidden', 'true');
      actions.appendChild(visibleLabel);
      actions.appendChild(collapseToggle);

      header.appendChild(headerMain);
      header.appendChild(actions);

      const body = document.createElement('div');
      body.className = 'settings-block-body';

      const previewField = document.createElement('div');
      previewField.className = 'field';
      const previewLabel = document.createElement('label');
      previewLabel.htmlFor = slotDef.domIds.cacheKey;
      previewLabel.textContent = 'Preview';
      const cacheSelect = document.createElement('select');
      cacheSelect.id = slotDef.domIds.cacheKey;
      cacheSelect.name = getCharacterStateKey(slotDef, 'cacheKey');
      const placeholderOption = document.createElement('option');
      placeholderOption.value = '';
      placeholderOption.textContent = 'preview を選択してください';
      cacheSelect.appendChild(placeholderOption);
      previewSources.forEach((source) => {
        const option = document.createElement('option');
        option.value = source.cache_key;
        option.disabled = !source.preview_available;
        appendText(option, `${source.psd_filename} (${source.cache_key})`);
        if (!source.preview_available) {
          appendText(option, ' - preview未生成');
        }
        cacheSelect.appendChild(option);
      });
      previewField.appendChild(previewLabel);
      previewField.appendChild(cacheSelect);

      const row = document.createElement('div');
      row.className = 'row';
      [
        { label: 'X', id: slotDef.domIds.x, name: getCharacterStateKey(slotDef, 'x'), value: '0' },
        { label: 'Y', id: slotDef.domIds.y, name: getCharacterStateKey(slotDef, 'y'), value: '0' },
        { label: 'Scale', id: slotDef.domIds.scale, name: getCharacterStateKey(slotDef, 'scale'), value: '100', min: '1' },
      ].forEach((fieldDef) => {
        const field = document.createElement('div');
        field.className = 'field';
        const label = document.createElement('label');
        label.htmlFor = fieldDef.id;
        label.textContent = fieldDef.label;
        const input = document.createElement('input');
        input.id = fieldDef.id;
        input.name = fieldDef.name;
        input.type = 'number';
        input.value = fieldDef.value;
        if (fieldDef.min) {
          input.min = fieldDef.min;
        }
        field.appendChild(label);
        field.appendChild(input);
        row.appendChild(field);
      });

      body.appendChild(previewField);
      body.appendChild(row);
      block.appendChild(header);
      block.appendChild(body);
      return block;
    }

    function renderCharacterSlotBlocks() {
      const container = document.getElementById('character-slots-container');
      if (!container) return;
      container.replaceChildren(...characterSlotDefs.map(createCharacterSlotBlock));
    }

    function bindCharacterSlotDomRefs(slotDef) {
      slotDef.enabledInput = document.getElementById(slotDef.domIds.enabled);
      slotDef.cacheKeyInput = document.getElementById(slotDef.domIds.cacheKey);
      slotDef.portraitFilenameInput = document.getElementById(slotDef.domIds.portraitFilename);
      slotDef.xInput = document.getElementById(slotDef.domIds.x);
      slotDef.yInput = document.getElementById(slotDef.domIds.y);
      slotDef.scaleInput = document.getElementById(slotDef.domIds.scale);
    }

    function buildCharacterSlotDef(slotNumber) {
      const prefix = slotNumber === 1 ? '' : `character${slotNumber}_`;
      return {
        slot: slotNumber,
        layerId: `character${slotNumber}`,
        stateKeys: {
          enabled: `character${slotNumber}_enabled`,
          cacheKey: `${prefix}cache_key`,
          portraitFilename: `${prefix}portrait_filename`,
          lastSelectedPortraitFilename: `${prefix}last_selected_portrait_filename`,
          x: slotNumber === 1 ? 'x' : `character${slotNumber}_x`,
          y: slotNumber === 1 ? 'y' : `character${slotNumber}_y`,
          scale: slotNumber === 1 ? 'scale' : `character${slotNumber}_scale`,
        },
        layoutKeyPrefix: slotNumber === 1 ? '' : `character${slotNumber}:`,
        enabledDefault: slotNumber === 1,
        lastSelectedPortraitFilename: '',
        activeLayoutKey: '',
        domIds: {
          enabled: slotNumber === 1 ? 'character1-enabled' : `character${slotNumber}-enabled`,
          cacheKey: slotNumber === 1 ? 'cache-key' : `character${slotNumber}-cache-key`,
          portraitFilename: slotNumber === 1 ? 'portrait-filename' : `character${slotNumber}-portrait-filename`,
          x: slotNumber === 1 ? 'position-x' : `character${slotNumber}-x`,
          y: slotNumber === 1 ? 'position-y' : `character${slotNumber}-y`,
          scale: slotNumber === 1 ? 'scale' : `character${slotNumber}-scale`,
        },
        layer: null,
      };
    }

    function createCharacterPreviewLayer(slotDef) {
      const layer = document.createElement('img');
      layer.id = `portrait-layer-${slotDef.slot}`;
      layer.className = 'preview-layer preview-layer--portrait is-hidden';
      layer.alt = `portrait preview ${slotDef.slot}`;
      previewCanvas?.appendChild(layer);
      return layer;
    }

    function ensureCharacterPreviewLayer(slotDef) {
      if (slotDef.layer) {
        slotDef.layer.id = `portrait-layer-${slotDef.slot}`;
        return;
      }
      slotDef.layer = document.getElementById(`portrait-layer-${slotDef.slot}`)
        || createCharacterPreviewLayer(slotDef);
    }

    const characterSlotDefs = [
      {
        slot: 1,
        layerId: 'character1',
        stateKeys: {
          enabled: 'character1_enabled',
          cacheKey: 'cache_key',
          portraitFilename: 'portrait_filename',
          lastSelectedPortraitFilename: 'last_selected_portrait_filename',
          x: 'x',
          y: 'y',
          scale: 'scale',
        },
        layoutKeyPrefix: '',
        enabledDefault: true,
        lastSelectedPortraitFilename: '',
        activeLayoutKey: '',
        domIds: {
          enabled: 'character1-enabled',
          cacheKey: 'cache-key',
          portraitFilename: 'portrait-filename',
          x: 'position-x',
          y: 'position-y',
          scale: 'scale',
        },
        layer: portraitLayer,
      },
      {
        slot: 2,
        layerId: 'character2',
        stateKeys: {
          enabled: 'character2_enabled',
          cacheKey: 'character2_cache_key',
          portraitFilename: 'character2_portrait_filename',
          lastSelectedPortraitFilename: 'character2_last_selected_portrait_filename',
          x: 'character2_x',
          y: 'character2_y',
          scale: 'character2_scale',
        },
        layoutKeyPrefix: 'character2:',
        enabledDefault: false,
        lastSelectedPortraitFilename: '',
        activeLayoutKey: '',
        domIds: {
          enabled: 'character2-enabled',
          cacheKey: 'character2-cache-key',
          portraitFilename: 'character2-portrait-filename',
          x: 'character2-x',
          y: 'character2-y',
          scale: 'character2-scale',
        },
        layer: portraitLayer2,
      },
      {
        slot: 3,
        layerId: 'character3',
        stateKeys: {
          enabled: 'character3_enabled',
          cacheKey: 'character3_cache_key',
          portraitFilename: 'character3_portrait_filename',
          lastSelectedPortraitFilename: 'character3_last_selected_portrait_filename',
          x: 'character3_x',
          y: 'character3_y',
          scale: 'character3_scale',
        },
        layoutKeyPrefix: 'character3:',
        enabledDefault: false,
        lastSelectedPortraitFilename: '',
        activeLayoutKey: '',
        domIds: {
          enabled: 'character3-enabled',
          cacheKey: 'character3-cache-key',
          portraitFilename: 'character3-portrait-filename',
          x: 'character3-x',
          y: 'character3-y',
          scale: 'character3-scale',
        },
        layer: portraitLayer3,
      },
    ];
    characterSlotDefs.forEach(ensureCharacterPreviewLayer);
    renderCharacterSlotBlocks();
    characterSlotDefs.forEach(bindCharacterSlotDomRefs);
    const character1SlotDef = characterSlotDefs[0];
    const messageBandEnabledInput = document.getElementById('message-band-enabled');
    const messageBandXInput = document.getElementById('message-band-x');
    const messageBandYInput = document.getElementById('message-band-y');
    const messageBandWidthInput = document.getElementById('message-band-width');
    const messageBandHeightInput = document.getElementById('message-band-height');
    const messageBandColorInput = document.getElementById('message-band-color');
    const messageBandOpacityInput = document.getElementById('message-band-opacity');
    const bubbleOverlayEnabledInput = document.getElementById('bubble-overlay-enabled');
    const bubbleOverlaySourceTypeInput = document.getElementById('bubble-overlay-source-type');
    const bubbleOverlayAssetInput = document.getElementById('bubble-overlay-asset');
    const bubbleOverlayXInput = document.getElementById('bubble-overlay-x');
    const bubbleOverlayYInput = document.getElementById('bubble-overlay-y');
    const bubbleOverlayWidthInput = document.getElementById('bubble-overlay-width');
    const bubbleOverlayHeightInput = document.getElementById('bubble-overlay-height');
    const overlayAssetPanel = document.getElementById('overlay-asset-panel');
    let previewTimer = null;
    let latestPreviewRequestId = 0;
    let previewInputRevision = 0;
    let latestPreviewLayoutRevision = -1;
    let baseDragState = null;
    let previewObjectDragState = null;
    let overlayResizeState = null;
    let layerOrderDraggingBlock = null;
    let activeLayerId = '';
    let previewHitCycleState = null;
    let baseObjectUrl = null;
    let baseObjectUrlFile = null;
    let currentBasePreviewSourceKey = '';
    let currentBubbleOverlayPreviewSourceKey = '';
    let restoredBaseImageUrl = '';
    let indexedDbBaseImageBlob = null;
    let sceneBaseImageDbPromise = null;
    let latestPreviewLayout = null;
    let lastBubbleOverlayAssetValue = bubbleOverlayAssetInput?.value || '';
    const defaultLayerOrder = ['base_image', 'message_band', 'character1', 'character2', 'character3', 'overlay_image', 'text2', 'text1'];
    let currentLayerOrder = [...defaultLayerOrder];
    let currentLayerOrderMode = 'aviutl';
    let currentLayerLocks = {};
    const loadedPreviewFonts = new Set();
    let loadedTextFontItems = [];
    const minimumCharacterSlotCount = 1;
    const minimumTextSlotCount = 1;
    const defaultSectionOpenState = {
      base: true,
      canvas: false,
      character1: true,
      character2: false,
      character3: false,
      text: true,
      text2: true,
      'message-band': true,
      overlay: true,
    };
    const characterSlots = characterSlotDefs;

    function getLastSelectedPortrait(slot) {
      return slot?.lastSelectedPortraitFilename || '';
    }

    function setLastSelectedPortrait(slot, filename) {
      if (slot) {
        slot.lastSelectedPortraitFilename = filename || '';
      }
    }

    function getCharacterEnabledStateKey(slot) {
      return getCharacterStateKey(slot, 'enabled');
    }

    function getCharacterStateKey(slot, field) {
      return slot.stateKeys[field];
    }

    function getActivePortraitLayoutKey(slot) {
      return slot?.activeLayoutKey || '';
    }

    function setActivePortraitLayoutKey(slot, layoutKey) {
      if (slot) {
        slot.activeLayoutKey = layoutKey || '';
      }
    }

    function getCharacterLayoutKeyPrefix(slot) {
      return slot.layoutKeyPrefix || '';
    }

    function buildCharacterLayoutKey(slot, assetKey) {
      if (!assetKey) return '';
      return `${getCharacterLayoutKeyPrefix(slot)}${assetKey}`;
    }

    function getCharacterSlotByNumber(slotNumber) {
      return characterSlots.find((slot) => slot.slot === slotNumber) || character1SlotDef;
    }

    function getCharacterSlotCountFromState(stored) {
      const explicitCount = Number(stored?.character_slot_count || 0);
      const counts = [minimumCharacterSlotCount, explicitCount];
      const layerOrder = Array.isArray(stored?.layer_order) ? stored.layer_order : [];
      layerOrder.forEach((layerId) => {
        const match = String(layerId).match(/^character(\d+)$/);
        if (match) {
          counts.push(Number(match[1]) || 0);
        }
      });
      Object.keys(stored || {}).forEach((key) => {
        const match = key.match(/^character(\d+)_/);
        if (match) {
          counts.push(Number(match[1]) || 0);
        }
      });
      return Math.max(...counts);
    }

    function ensureCharacterSlotCount(slotCount) {
      while (characterSlots.length < slotCount) {
        addCharacterSlot({ save: false });
      }
    }

    function syncCharacterSlotCount(slotCount) {
      const targetCount = Math.max(minimumCharacterSlotCount, Number(slotCount) || minimumCharacterSlotCount);
      ensureCharacterSlotCount(targetCount);
      while (characterSlots.length > targetCount) {
        removeLastCharacterSlot({ save: false });
      }
    }

    function getTextSlotCountFromState(stored) {
      const explicitCount = Number(stored?.text_slot_count || 0);
      if (explicitCount > 0) {
        return Math.max(minimumTextSlotCount, explicitCount);
      }
      const counts = [minimumTextSlotCount];
      if (stored?.text2) {
        counts.push(2);
      }
      const layerOrder = Array.isArray(stored?.layer_order) ? stored.layer_order : [];
      layerOrder.forEach((layerId) => {
        const match = String(layerId).match(/^text(\d+)$/);
        if (match) {
          counts.push(Number(match[1]) || 0);
        }
      });
      Object.keys(stored || {}).forEach((key) => {
        const match = key.match(/^text(\d+)$/);
        if (match) {
          counts.push(Number(match[1]) || 0);
        }
      });
      return Math.max(...counts);
    }

    function updateTextSlotCountInput() {
      if (textSlotCountInput) {
        textSlotCountInput.value = String(textSettingSlots.length);
      }
    }

    function updateTextSlotControls() {
      if (removeTextSlotButton) {
        removeTextSlotButton.disabled = textSettingSlots.length <= minimumTextSlotCount;
      }
      updateTextSlotCountInput();
    }

    function ensureTextSlotCount(slotCount) {
      while (textSettingSlots.length < slotCount) {
        addTextSlot({ save: false });
      }
    }

    function syncTextSlotCount(slotCount) {
      const targetCount = Math.max(minimumTextSlotCount, Number(slotCount) || minimumTextSlotCount);
      ensureTextSlotCount(targetCount);
      while (textSettingSlots.length > targetCount) {
        removeLastTextSlot({ save: false });
      }
      updateTextSlotControls();
    }

    function updateCharacterSlotControls() {
      if (removeCharacterSlotButton) {
        removeCharacterSlotButton.disabled = characterSlots.length <= minimumCharacterSlotCount;
      }
    }

    function getPortraitFilenameBeforePreviewSelection(slot) {
      return slot.portraitFilenameInput?.value
        || getLastSelectedPortrait(slot)
        || (slot.slot !== 1 ? slot.cacheKeyInput?.dataset.portraitFilename || '' : '');
    }

    function getPortraitFilenameAfterPreviewClear(slot) {
      return slot.slot === 1
        ? getLastSelectedPortrait(slot)
        : (slot.cacheKeyInput?.dataset.portraitFilename || '');
    }

    function getTextSlotKey(slotNumber) {
      return slotNumber === 1 ? 'text' : `text${slotNumber}`;
    }

    function getTextLayerId(slotNumber) {
      return `text${slotNumber}`;
    }

    function getTextDomId(slotNumber, field) {
      const prefix = slotNumber === 1 ? 'text' : `text${slotNumber}`;
      return `${prefix}-${field}`;
    }

    function buildTextSlot(slotNumber, refs = {}) {
      const key = getTextSlotKey(slotNumber);
      return {
        slot: slotNumber,
        key,
        layerId: getTextLayerId(slotNumber),
        enabledInput: refs.enabledInput || document.getElementById(getTextDomId(slotNumber, 'enabled')),
        valueInput: refs.valueInput || document.getElementById(getTextDomId(slotNumber, 'value')),
        fontInput: refs.fontInput || document.getElementById(getTextDomId(slotNumber, 'font')),
        sizeInput: refs.sizeInput || document.getElementById(getTextDomId(slotNumber, 'size')),
        colorInput: refs.colorInput || document.getElementById(getTextDomId(slotNumber, 'color')),
        strokeEnabledInput: refs.strokeEnabledInput || document.getElementById(getTextDomId(slotNumber, 'stroke-enabled')),
        strokeColorInput: refs.strokeColorInput || document.getElementById(getTextDomId(slotNumber, 'stroke-color')),
        strokeWidthInput: refs.strokeWidthInput || document.getElementById(getTextDomId(slotNumber, 'stroke-width')),
        debugInput: refs.debugInput || document.getElementById(getTextDomId(slotNumber, 'debug-layout')),
        xInput: refs.xInput || document.getElementById(getTextDomId(slotNumber, 'x')),
        yInput: refs.yInput || document.getElementById(getTextDomId(slotNumber, 'y')),
        layer: refs.layer || document.getElementById(slotNumber === 1 ? 'text-layer' : `text-layer-${slotNumber}`),
        content: refs.content || document.getElementById(slotNumber === 1 ? 'text-content' : `text-content-${slotNumber}`),
        contentBox: refs.contentBox || document.getElementById(slotNumber === 1 ? 'text-content-box' : `text-content-box-${slotNumber}`),
        debugRect: refs.debugRect || document.getElementById(slotNumber === 1 ? 'text-box-debug-rect' : `text-box-debug-rect-${slotNumber}`),
        defaultX: slotNumber === 1 ? '0' : '100',
        defaultY: slotNumber === 1 ? '0' : '100',
        defaultSize: slotNumber === 1 ? '32' : '64',
      };
    }

    const textSettingSlots = [buildTextSlot(1), buildTextSlot(2)];

    function createTextPreviewLayer(slot) {
      const layer = document.createElement('div');
      layer.id = `text-layer-${slot.slot}`;
      layer.className = 'preview-text-layer is-hidden';
      const debugRect = document.createElement('div');
      debugRect.id = `text-box-debug-rect-${slot.slot}`;
      debugRect.className = 'preview-debug-rect preview-debug-rect--text';
      const contentBox = document.createElement('div');
      contentBox.id = `text-content-box-${slot.slot}`;
      contentBox.className = 'preview-text-content-box';
      const content = document.createElement('div');
      content.id = `text-content-${slot.slot}`;
      content.className = 'preview-text-content';
      contentBox.appendChild(content);
      layer.appendChild(debugRect);
      layer.appendChild(contentBox);
      previewCanvas?.appendChild(layer);
      slot.layer = layer;
      slot.debugRect = debugRect;
      slot.contentBox = contentBox;
      slot.content = content;
    }

    function populateTextFontOptions(select, selectedValue = '') {
      if (!select) return;
      select.innerHTML = '';
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = '既定フォント';
      select.appendChild(defaultOption);
      loadedTextFontItems.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = item.name;
        select.appendChild(option);
      });
      if (selectedValue && !loadedTextFontItems.some((item) => item.name === selectedValue)) {
        const preservedOption = document.createElement('option');
        preservedOption.value = selectedValue;
        preservedOption.textContent = selectedValue;
        select.appendChild(preservedOption);
      }
      select.value = selectedValue;
    }

    function createTextSlotBlock(slot) {
      const block = document.createElement('div');
      block.className = 'settings-block';
      block.dataset.sectionKey = slot.key;
      block.dataset.layerId = slot.layerId;

      const header = document.createElement('button');
      header.type = 'button';
      header.className = 'settings-block-header';
      header.dataset.settingsToggle = slot.key;
      header.setAttribute('aria-expanded', 'true');

      const headerMain = document.createElement('span');
      headerMain.className = 'settings-block-header-main';
      const title = document.createElement('h3');
      title.className = 'settings-block-title';
      title.textContent = `テキスト${slot.slot}`;
      headerMain.appendChild(title);

      const actions = document.createElement('span');
      actions.className = 'settings-block-header-actions';
      const visibleLabel = document.createElement('label');
      visibleLabel.className = 'section-visible-toggle';
      visibleLabel.htmlFor = getTextDomId(slot.slot, 'enabled');
      const enabledInput = document.createElement('input');
      enabledInput.id = getTextDomId(slot.slot, 'enabled');
      enabledInput.name = `${slot.key}_enabled`;
      enabledInput.type = 'checkbox';
      enabledInput.value = '1';
      const visibilityIcon = document.createElement('span');
      visibilityIcon.className = 'visibility-icon';
      visibilityIcon.setAttribute('aria-hidden', 'true');
      visibleLabel.appendChild(enabledInput);
      visibleLabel.appendChild(visibilityIcon);
      visibleLabel.addEventListener('click', (event) => {
        event.stopPropagation();
      });
      const collapseToggle = document.createElement('span');
      collapseToggle.className = 'settings-block-toggle';
      collapseToggle.setAttribute('aria-hidden', 'true');
      actions.appendChild(visibleLabel);
      actions.appendChild(collapseToggle);
      header.appendChild(headerMain);
      header.appendChild(actions);

      const body = document.createElement('div');
      body.className = 'settings-block-body settings-block-body--compact';
      const textField = document.createElement('div');
      textField.className = 'field';
      const textLabel = document.createElement('label');
      textLabel.htmlFor = getTextDomId(slot.slot, 'value');
      textLabel.textContent = 'テキスト';
      const textarea = document.createElement('textarea');
      textarea.id = getTextDomId(slot.slot, 'value');
      textarea.name = `${slot.key}_value`;
      textarea.rows = 3;
      textarea.placeholder = `${slot.slot}つ目のテキストを入力`;
      textField.appendChild(textLabel);
      textField.appendChild(textarea);

      const fontField = document.createElement('div');
      fontField.className = 'field';
      const fontLabel = document.createElement('label');
      fontLabel.htmlFor = getTextDomId(slot.slot, 'font');
      fontLabel.textContent = 'フォント';
      const fontSelect = document.createElement('select');
      fontSelect.id = getTextDomId(slot.slot, 'font');
      fontSelect.name = `${slot.key}_font`;
      populateTextFontOptions(fontSelect);
      fontField.appendChild(fontLabel);
      fontField.appendChild(fontSelect);

      const sizeColorRow = document.createElement('div');
      sizeColorRow.className = 'row row--2';
      [
        { label: 'サイズ', field: 'size', name: `${slot.key}_size`, type: 'number', value: slot.defaultSize, min: '1' },
        { label: '色', field: 'color', name: `${slot.key}_color`, type: 'color', value: '#ffffff' },
      ].forEach((fieldDef) => {
        const field = document.createElement('div');
        field.className = 'field';
        const label = document.createElement('label');
        label.htmlFor = getTextDomId(slot.slot, fieldDef.field);
        label.textContent = fieldDef.label;
        const input = document.createElement('input');
        input.id = getTextDomId(slot.slot, fieldDef.field);
        input.name = fieldDef.name;
        input.type = fieldDef.type;
        input.value = fieldDef.value;
        if (fieldDef.min) input.min = fieldDef.min;
        field.appendChild(label);
        field.appendChild(input);
        sizeColorRow.appendChild(field);
      });

      const positionRow = document.createElement('div');
      positionRow.className = 'row row--2';
      [
        { label: 'X', field: 'x', name: `${slot.key}_x`, value: slot.defaultX },
        { label: 'Y', field: 'y', name: `${slot.key}_y`, value: slot.defaultY },
      ].forEach((fieldDef) => {
        const field = document.createElement('div');
        field.className = 'field';
        const label = document.createElement('label');
        label.htmlFor = getTextDomId(slot.slot, fieldDef.field);
        label.textContent = fieldDef.label;
        const input = document.createElement('input');
        input.id = getTextDomId(slot.slot, fieldDef.field);
        input.name = fieldDef.name;
        input.type = 'number';
        input.value = fieldDef.value;
        field.appendChild(label);
        field.appendChild(input);
        positionRow.appendChild(field);
      });

      const toggleRow = document.createElement('div');
      toggleRow.className = 'toggle-row';
      const strokeField = document.createElement('div');
      strokeField.className = 'field';
      const strokeLabel = document.createElement('label');
      strokeLabel.className = 'inline-toggle';
      strokeLabel.htmlFor = getTextDomId(slot.slot, 'stroke-enabled');
      const strokeInput = document.createElement('input');
      strokeInput.id = getTextDomId(slot.slot, 'stroke-enabled');
      strokeInput.name = `${slot.key}_stroke_enabled`;
      strokeInput.type = 'checkbox';
      strokeInput.value = '1';
      const strokeText = document.createElement('span');
      strokeText.textContent = '縁取り';
      strokeLabel.appendChild(strokeInput);
      strokeLabel.appendChild(strokeText);
      strokeField.appendChild(strokeLabel);
      toggleRow.appendChild(strokeField);
      const debugField = document.createElement('div');
      debugField.className = 'field';
      const debugLabel = document.createElement('label');
      debugLabel.className = 'inline-toggle';
      debugLabel.htmlFor = getTextDomId(slot.slot, 'debug-layout');
      const debugInput = document.createElement('input');
      debugInput.id = getTextDomId(slot.slot, 'debug-layout');
      debugInput.name = `${slot.key}_debug_enabled`;
      debugInput.type = 'checkbox';
      debugInput.value = '1';
      const debugText = document.createElement('span');
      debugText.textContent = 'Debug枠';
      debugLabel.appendChild(debugInput);
      debugLabel.appendChild(debugText);
      debugField.appendChild(debugLabel);
      toggleRow.appendChild(debugField);

      const strokeRow = document.createElement('div');
      strokeRow.className = 'row row--2';
      [
        { label: '縁取り色', field: 'stroke-color', name: `${slot.key}_stroke_color`, type: 'color', value: '#000000' },
        { label: '縁取り幅', field: 'stroke-width', name: `${slot.key}_stroke_width`, type: 'number', value: '2', min: '0' },
      ].forEach((fieldDef) => {
        const field = document.createElement('div');
        field.className = 'field';
        const label = document.createElement('label');
        label.htmlFor = getTextDomId(slot.slot, fieldDef.field);
        label.textContent = fieldDef.label;
        const input = document.createElement('input');
        input.id = getTextDomId(slot.slot, fieldDef.field);
        input.name = fieldDef.name;
        input.type = fieldDef.type;
        input.value = fieldDef.value;
        if (fieldDef.min) input.min = fieldDef.min;
        field.appendChild(label);
        field.appendChild(input);
        strokeRow.appendChild(field);
      });

      body.appendChild(textField);
      body.appendChild(fontField);
      body.appendChild(sizeColorRow);
      body.appendChild(positionRow);
      body.appendChild(toggleRow);
      body.appendChild(strokeRow);
      block.appendChild(header);
      block.appendChild(body);
      return block;
    }

    function bindTextSlotDomRefs(slot) {
      slot.enabledInput = document.getElementById(getTextDomId(slot.slot, 'enabled'));
      slot.valueInput = document.getElementById(getTextDomId(slot.slot, 'value'));
      slot.fontInput = document.getElementById(getTextDomId(slot.slot, 'font'));
      slot.sizeInput = document.getElementById(getTextDomId(slot.slot, 'size'));
      slot.colorInput = document.getElementById(getTextDomId(slot.slot, 'color'));
      slot.strokeEnabledInput = document.getElementById(getTextDomId(slot.slot, 'stroke-enabled'));
      slot.strokeColorInput = document.getElementById(getTextDomId(slot.slot, 'stroke-color'));
      slot.strokeWidthInput = document.getElementById(getTextDomId(slot.slot, 'stroke-width'));
      slot.debugInput = document.getElementById(getTextDomId(slot.slot, 'debug-layout'));
      slot.xInput = document.getElementById(getTextDomId(slot.slot, 'x'));
      slot.yInput = document.getElementById(getTextDomId(slot.slot, 'y'));
    }

    function getBubbleOverlayAsset(assetId) {
      if (!assetId) return null;
      return bubbleOverlayAssets[assetId] || null;
    }

    function getDefaultBubbleOverlayAssetId() {
      return Object.keys(bubbleOverlayAssets)[0] || '';
    }

    function currentOverlaySizeUsesAssetDefault(assetId) {
      const asset = getBubbleOverlayAsset(assetId);
      if (!asset || !bubbleOverlayWidthInput || !bubbleOverlayHeightInput) return false;
      return Number(bubbleOverlayWidthInput.value) === Number(asset.default_width)
        && Number(bubbleOverlayHeightInput.value) === Number(asset.default_height);
    }

    function applySelectedOverlayAssetDefaults(previousAssetId) {
      const selectedAsset = getBubbleOverlayAsset(bubbleOverlayAssetInput?.value);
      if (!selectedAsset || !bubbleOverlayWidthInput || !bubbleOverlayHeightInput) return;

      const widthIsUnset = !bubbleOverlayWidthInput.value || Number(bubbleOverlayWidthInput.value) <= 0;
      const heightIsUnset = !bubbleOverlayHeightInput.value || Number(bubbleOverlayHeightInput.value) <= 0;
      const sizeWasInitial = Number(bubbleOverlayWidthInput.value) === 420
        && Number(bubbleOverlayHeightInput.value) === 180;
      const sizeWasPreviousDefault = currentOverlaySizeUsesAssetDefault(previousAssetId);
      if (!widthIsUnset && !heightIsUnset && !sizeWasInitial && !sizeWasPreviousDefault) return;

      bubbleOverlayWidthInput.value = String(selectedAsset.default_width);
      bubbleOverlayHeightInput.value = String(selectedAsset.default_height);
    }

    function updateOverlaySourcePanels() {
      overlayAssetPanel?.classList.remove('is-hidden');
    }

    function normalizeLayerOrder(order) {
      const rawOrder = Array.isArray(order) ? order : [];
      const known = new Set(defaultLayerOrder);
      const normalized = rawOrder.filter((layerId, index) =>
        known.has(layerId) && rawOrder.indexOf(layerId) === index,
      );
      defaultLayerOrder.forEach((layerId) => {
        if (!normalized.includes(layerId)) {
          normalized.push(layerId);
        }
      });
      return normalized;
    }

    function normalizeLayerLocks(locks) {
      const normalized = {};
      const source = locks && typeof locks === 'object' && !Array.isArray(locks) ? locks : {};
      defaultLayerOrder.forEach((layerId) => {
        normalized[layerId] = source[layerId] === true;
      });
      return normalized;
    }

    function isLayerLocked(layerId) {
      return normalizeLayerLocks(currentLayerLocks)[layerId] === true;
    }

    function blockLockedPointer(layerId, event) {
      if (!isLayerLocked(layerId)) return false;
      event.stopPropagation();
      event.preventDefault();
      return true;
    }

    function normalizeLayerOrderMode(mode) {
      return ['aviutl', 'after_effects'].includes(mode) ? mode : 'aviutl';
    }

    function loadLayerOrderMode(fallbackMode = 'aviutl') {
      try {
        return normalizeLayerOrderMode(localStorage.getItem(layerOrderModeStorageKey) || fallbackMode);
      } catch {
        return normalizeLayerOrderMode(fallbackMode);
      }
    }

    function updateLayerOrderModeInput() {
      currentLayerOrderMode = normalizeLayerOrderMode(currentLayerOrderMode);
      if (layerOrderModeInput) {
        layerOrderModeInput.value = currentLayerOrderMode;
      }
    }

    function resolveLayerDrawOrder() {
      return normalizeLayerOrder(currentLayerOrder);
    }

    function resolveLayerDisplayOrder() {
      const normalizedOrder = normalizeLayerOrder(currentLayerOrder);
      return currentLayerOrderMode === 'after_effects' ? [...normalizedOrder].reverse() : normalizedOrder;
    }

    function updateLayerOrderInput() {
      currentLayerOrder = normalizeLayerOrder(currentLayerOrder);
      if (layerOrderInput) {
        layerOrderInput.value = JSON.stringify(currentLayerOrder);
      }
      updateLayerOrderModeInput();
    }

    function getLayerBlock(layerId) {
      return sceneForm?.querySelector(`.settings-block[data-layer-id="${layerId}"]`) || null;
    }

    function getPreviewDragTarget(layerId) {
      if (!layerId) return null;
      const characterSlot = characterSlots.find((slot) => slot.layerId === layerId);
      if (characterSlot) return characterSlot;
      const textSlot = textSettingSlots.find((slot) => slot.layerId === layerId);
      if (textSlot) return textSlot.dragTarget || null;
      if (layerId === 'overlay_image') return overlayDragTarget;
      return null;
    }

    function getPreviewHitCandidates(event) {
      return [...resolveLayerDrawOrder()]
        .reverse()
        .map((layerId) => getPreviewDragTarget(layerId))
        .filter((target, index, targets) => (
          target
          && targets.findIndex((candidate) => candidate?.layerId === target.layerId) === index
          && isPointerInsideLayer(target.layer, event)
          && !isLayerLocked(target.layerId)
        ));
    }

    function choosePreviewHitCandidate(candidates, event) {
      if (candidates.length === 0) return null;
      const signature = candidates.map((target) => target.layerId).join('|');
      const activeIndex = candidates.findIndex((target) => target.layerId === activeLayerId);
      const sameCycle = previewHitCycleState
        && previewHitCycleState.signature === signature
        && Math.abs(previewHitCycleState.x - event.clientX) <= 8
        && Math.abs(previewHitCycleState.y - event.clientY) <= 8;
      const nextIndex = sameCycle
        ? (previewHitCycleState.index + 1) % candidates.length
        : Math.max(0, activeIndex);
      previewHitCycleState = {
        x: event.clientX,
        y: event.clientY,
        signature,
        index: nextIndex,
      };
      return candidates[nextIndex];
    }

    function isPointerInsideLayer(layer, event) {
      if (!layer || layer.classList.contains('is-hidden')) return false;
      const rect = layer.getBoundingClientRect();
      return rect.width > 0
        && rect.height > 0
        && event.clientX >= rect.left
        && event.clientX <= rect.right
        && event.clientY >= rect.top
        && event.clientY <= rect.bottom;
    }

    function updateActiveLayerDisplay() {
      sceneForm?.querySelectorAll('.settings-block[data-layer-id]').forEach((block) => {
        block.classList.toggle('is-selected-layer', block.dataset.layerId === activeLayerId);
      });
      defaultLayerOrder.forEach((layerId) => {
        getPreviewLayerNodes(layerId).forEach((node) => {
          node.classList.toggle('is-selected-layer', layerId === activeLayerId);
        });
      });
    }

    function setActiveLayer(layerId) {
      if (!layerId || activeLayerId === layerId) {
        if (layerId) updateActiveLayerDisplay();
        return;
      }
      activeLayerId = layerId;
      updateActiveLayerDisplay();
    }

    function applyLayerOrderToSettingsBlocks() {
      if (!sceneForm) return;
      const listEnd = sceneLayerListEnd || sceneForm.querySelector('button[type="submit"]');
      resolveLayerDisplayOrder().forEach((layerId) => {
        const block = getLayerBlock(layerId);
        if (block && listEnd) {
          sceneForm.insertBefore(block, listEnd);
        }
      });
      updateActiveLayerDisplay();
    }

    function updateLayerOrderFromSettingsBlocks() {
      const displayOrder = Array.from(sceneForm?.querySelectorAll('.settings-block[data-layer-id]') || [])
        .map((block) => block.dataset.layerId);
      currentLayerOrder = normalizeLayerOrder(
        currentLayerOrderMode === 'after_effects' ? [...displayOrder].reverse() : displayOrder,
      );
      updateLayerOrderInput();
    }

    function moveLayerOrder(layerId, direction) {
      currentLayerOrder = normalizeLayerOrder(currentLayerOrder);
      const currentIndex = currentLayerOrder.indexOf(layerId);
      if (currentIndex < 0) return;
      const offset = direction === 'front' ? 1 : -1;
      const nextIndex = currentIndex + offset;
      if (nextIndex < 0 || nextIndex >= currentLayerOrder.length) return;

      [currentLayerOrder[currentIndex], currentLayerOrder[nextIndex]] =
        [currentLayerOrder[nextIndex], currentLayerOrder[currentIndex]];
      updateLayerOrderInput();
      applyLayerOrderToSettingsBlocks();
      applyLayerOrderToPreviewDom();
      saveSceneState();
    }

    function getPreviewLayerNodes(layerId) {
      const layerMap = {
        base_image: [baseLayer],
        message_band: [messageBandLayer],
        overlay_image: [bubbleOverlayLayer, bubbleOverlayResizeHandleRight, bubbleOverlayResizeHandleBottom, bubbleDebugRect],
      };
      characterSlots.forEach((slot) => {
        layerMap[slot.layerId] = [slot.layer];
      });
      textSettingSlots.forEach((slot) => {
        layerMap[slot.layerId] = [slot.layer];
      });
      return (layerMap[layerId] || []).filter(Boolean);
    }

    function updateLayerLockControls() {
      currentLayerLocks = normalizeLayerLocks(currentLayerLocks);
      defaultLayerOrder.forEach((layerId) => {
        const locked = currentLayerLocks[layerId] === true;
        const input = document.getElementById(`layer-lock-${layerId}`);
        const toggle = input?.closest('.layer-lock-toggle');
        const icon = toggle?.querySelector('.layer-lock-icon');
        if (input) {
          input.checked = locked;
        }
        toggle?.classList.toggle('is-locked', locked);
        if (icon) {
          icon.textContent = locked ? '🔒' : '🔓';
        }
        getPreviewLayerNodes(layerId).forEach((node) => {
          node.classList.toggle('is-position-locked', locked);
        });
      });
      updateActiveLayerDisplay();
    }

    function updateVisibilityIcon(input) {
      const toggle = input?.closest('.section-visible-toggle');
      const icon = toggle?.querySelector('.visibility-icon');
      if (!toggle || !icon) return;
      const visible = input.checked;
      toggle.classList.toggle('is-visible', visible);
      toggle.title = visible ? '表示中' : '非表示';
      icon.textContent = visible ? '👁' : '◌';
    }

    function updateVisibilityIcons() {
      document.querySelectorAll('.section-visible-toggle input[type="checkbox"]').forEach(updateVisibilityIcon);
    }

    function applyLayerOrderToPreviewDom() {
      if (!previewCanvas) return;
      resolveLayerDrawOrder().forEach((layerId, index) => {
        getPreviewLayerNodes(layerId).forEach((node) => {
          previewCanvas.appendChild(node);
          node.style.order = String(index + 1);
          node.style.zIndex = String((index + 1) * 10);
        });
      });
      updateLayerLockControls();
      updateActiveLayerDisplay();
    }

    function buildTextState(slot) {
      return {
        enabled: Boolean(slot.enabledInput?.checked),
        value: slot.valueInput?.value || '',
        x: slot.xInput?.value || slot.defaultX,
        y: slot.yInput?.value || slot.defaultY,
        size: slot.sizeInput?.value || slot.defaultSize,
        color: slot.colorInput?.value || '#ffffff',
        stroke_enabled: Boolean(slot.strokeEnabledInput?.checked),
        stroke_color: slot.strokeColorInput?.value || '#000000',
        stroke_width: slot.strokeWidthInput?.value || '2',
        debug_enabled: Boolean(slot.debugInput?.checked),
        font: slot.fontInput?.value || '',
      };
    }

    function buildMessageBandState() {
      return {
        enabled: Boolean(messageBandEnabledInput?.checked),
        x: messageBandXInput?.value || '0',
        y: messageBandYInput?.value || '760',
        width: messageBandWidthInput?.value || '1920',
        height: messageBandHeightInput?.value || '220',
        color: messageBandColorInput?.value || '#000000',
        opacity: messageBandOpacityInput?.value || '0.65',
      };
    }

    function applyStoredTextState(slot, state, { enabledDefault = false } = {}) {
      const textState = state || {};
      if (slot.enabledInput) {
        slot.enabledInput.checked = textState.enabled !== undefined ? textState.enabled === true : enabledDefault;
        updateVisibilityIcon(slot.enabledInput);
      }
      if (slot.valueInput && typeof textState.value === 'string') {
        slot.valueInput.value = textState.value;
      }
      if (slot.fontInput && typeof textState.font === 'string') {
        populateTextFontOptions(slot.fontInput, textState.font);
      }
      if (slot.sizeInput && textState.size) {
        slot.sizeInput.value = String(textState.size);
      }
      if (slot.colorInput && typeof textState.color === 'string') {
        slot.colorInput.value = textState.color;
      }
      if (slot.strokeEnabledInput) {
        slot.strokeEnabledInput.checked = textState.stroke_enabled === true;
      }
      if (slot.strokeColorInput && typeof textState.stroke_color === 'string') {
        slot.strokeColorInput.value = textState.stroke_color;
      }
      if (slot.strokeWidthInput && textState.stroke_width !== undefined) {
        slot.strokeWidthInput.value = String(textState.stroke_width);
      }
      if (slot.debugInput) {
        slot.debugInput.checked = textState.debug_enabled === true;
      }
      if (slot.xInput && textState.x !== undefined) {
        slot.xInput.value = String(textState.x);
      }
      if (slot.yInput && textState.y !== undefined) {
        slot.yInput.value = String(textState.y);
      }
    }

    // Scene state helpers: normalize, serialize, restore, and consume the one-time portrait seed.
    function normalizeCharacterSourceState(slot, preferredSource = '') {
      const portraitFilename = slot.portraitFilenameInput?.value || '';
      const cacheKey = slot.cacheKeyInput?.value || '';
      const storedPortraitFilename = slot.slot !== 1
        ? (slot.cacheKeyInput?.dataset.portraitFilename || getLastSelectedPortrait(slot) || '')
        : '';

      if (preferredSource === 'preview' && cacheKey) {
        if (slot.portraitFilenameInput) {
          slot.portraitFilenameInput.value = '';
        }
        return 'preview';
      }

      if (portraitFilename) {
        setLastSelectedPortrait(slot, portraitFilename);
        if (slot.cacheKeyInput) {
          slot.cacheKeyInput.value = '';
          slot.cacheKeyInput.dataset.portraitFilename = getLastSelectedPortrait(slot);
        }
        return 'portrait';
      }

      if (cacheKey) {
        if (slot.portraitFilenameInput) {
          slot.portraitFilenameInput.value = '';
        }
        return 'preview';
      }

      if (storedPortraitFilename) {
        setLastSelectedPortrait(slot, storedPortraitFilename);
        if (slot.cacheKeyInput) {
          slot.cacheKeyInput.dataset.portraitFilename = getLastSelectedPortrait(slot);
        }
        if (slot.portraitFilenameInput) {
          slot.portraitFilenameInput.value = getLastSelectedPortrait(slot);
        }
        return 'portrait';
      }

      return '';
    }

    function buildCharacterState(slot) {
      return {
        [getCharacterStateKey(slot, 'enabled')]: slot.enabledInput?.checked ? '1' : '0',
        [getCharacterStateKey(slot, 'cacheKey')]: slot.cacheKeyInput?.value || '',
        [getCharacterStateKey(slot, 'portraitFilename')]: slot.portraitFilenameInput?.value || '',
        [getCharacterStateKey(slot, 'lastSelectedPortraitFilename')]: getLastSelectedPortrait(slot) || '',
        [getCharacterStateKey(slot, 'x')]: slot.xInput?.value || '0',
        [getCharacterStateKey(slot, 'y')]: slot.yInput?.value || '0',
        [getCharacterStateKey(slot, 'scale')]: slot.scaleInput?.value || '100',
      };
    }

    function applyCharacterState(slot, stored) {
      const storedPortraitFilename = stored[getCharacterStateKey(slot, 'portraitFilename')] || '';
      const storedLastPortraitFilename = stored[getCharacterStateKey(slot, 'lastSelectedPortraitFilename')]
        || storedPortraitFilename
        || '';
      const storedCacheKey = stored[getCharacterStateKey(slot, 'cacheKey')] || '';
      setLastSelectedPortrait(slot, storedLastPortraitFilename);
      if (slot.enabledInput) {
        const storedEnabled = stored[getCharacterStateKey(slot, 'enabled')];
        slot.enabledInput.checked = slot.enabledDefault
          ? storedEnabled !== '0'
          : storedEnabled === '1';
        updateVisibilityIcon(slot.enabledInput);
      }
      if (slot.cacheKeyInput) {
        slot.cacheKeyInput.value = storedPortraitFilename ? '' : storedCacheKey;
        if (slot.slot !== 1 && storedLastPortraitFilename) {
          slot.cacheKeyInput.dataset.portraitFilename = storedLastPortraitFilename;
        }
      }
      if (slot.portraitFilenameInput && storedPortraitFilename) {
        slot.portraitFilenameInput.value = storedPortraitFilename;
      }
      normalizeCharacterSourceState(slot, storedPortraitFilename ? 'portrait' : 'preview');
      if (slot.xInput && stored[getCharacterStateKey(slot, 'x')]) {
        slot.xInput.value = stored[getCharacterStateKey(slot, 'x')];
      }
      if (slot.yInput && stored[getCharacterStateKey(slot, 'y')]) {
        slot.yInput.value = stored[getCharacterStateKey(slot, 'y')];
      }
      if (slot.scaleInput && stored[getCharacterStateKey(slot, 'scale')]) {
        slot.scaleInput.value = stored[getCharacterStateKey(slot, 'scale')];
      }
    }

    function buildSceneStatePayload() {
      characterSlots.forEach(normalizeCharacterSourceState);
      return {
        character_slot_count: characterSlots.length,
        ...characterSlots.reduce((payload, slot) => ({
          ...payload,
          ...buildCharacterState(slot),
        }), {}),
        text_slot_count: textSettingSlots.length,
        canvas_size: canvasPresetSelect?.value || '',
        canvas_preset: canvasPresetSelect?.value || '',
        base_image_name: baseImageNameInput?.value || '',
        base_image_display_name: baseImageDisplayNameInput?.value || '',
        base_image_url: restoredBaseImageUrl || '',
        base_x: baseXInput?.value || '0',
        base_y: baseYInput?.value || '0',
        base_scale: baseScaleInput?.value || '100',
        base_fit_mode: baseFitModeSelect?.value || 'contain',
        layer_order: normalizeLayerOrder(currentLayerOrder),
        layer_order_mode: normalizeLayerOrderMode(currentLayerOrderMode),
        layer_locks: normalizeLayerLocks(currentLayerLocks),
        ...textSettingSlots.reduce((payload, slot) => ({
          ...payload,
          [slot.key]: buildTextState(slot),
        }), {}),
        message_band: buildMessageBandState(),
        bubble_overlay: {
          enabled: Boolean(bubbleOverlayEnabledInput?.checked),
          source_type: 'asset',
          asset: bubbleOverlayAssetInput?.value || '',
          upload_file: '',
          x: bubbleOverlayXInput?.value || '180',
          y: bubbleOverlayYInput?.value || '220',
          width: bubbleOverlayWidthInput?.value || '420',
          height: bubbleOverlayHeightInput?.value || '180',
        },
      };
    }

    function saveSceneState() {
      try {
        const payload = buildSceneStatePayload();
        localStorage.setItem(sceneStorageKey, JSON.stringify(payload));
      } catch {
        // Ignore localStorage errors and keep current behavior.
      }
    }

    function loadSceneState() {
      try {
        const raw = localStorage.getItem(sceneStorageKey);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }

    function clearInitialPortraitSeed() {
      const sceneUrl = new URL(window.location.href);
      if (sceneUrl.searchParams.has('portrait')) {
        sceneUrl.searchParams.delete('portrait');
        sceneUrl.searchParams.delete('slot');
        window.history.replaceState({}, '', `${sceneUrl.pathname}${sceneUrl.search}${sceneUrl.hash}`);
      }
      initialPortraitFilename = '';
      initialPortraitSlot = 1;
    }

    function applyInitialPortraitToSlot(slot, filename) {
      setLastSelectedPortrait(slot, filename);
      if (slot.portraitFilenameInput) {
        slot.portraitFilenameInput.value = filename;
      }
      if (slot.cacheKeyInput) {
        slot.cacheKeyInput.value = '';
      }
      if (slot.enabledInput) {
        slot.enabledInput.checked = true;
        updateVisibilityIcon(slot.enabledInput);
      }
      normalizeCharacterSourceState(slot, 'portrait');
    }

    function commitInitialPortraitSelection() {
      if (!initialPortraitFilename) return;
      ensureCharacterSlotCount(initialPortraitSlot);
      applyInitialPortraitToSlot(getCharacterSlotByNumber(initialPortraitSlot), initialPortraitFilename);
      updateCharacterPreviewSelectLabels();
      saveSceneState();
      clearInitialPortraitSeed();
    }

    function commitInitialBaseImageSelection() {
      if (!initialBaseImageName) return;
      if (baseImageInput) {
        baseImageInput.value = '';
      }
      if (baseImageNameInput) {
        baseImageNameInput.value = initialBaseImageName;
      }
      if (baseImageDisplayNameInput) {
        baseImageDisplayNameInput.value = initialBaseImageName;
      }
      restoredBaseImageUrl = initialBaseImageUrl || getBackgroundItemUrl(initialBaseImageName);
      updateBaseImageSourceLabel();
      saveSceneState();
    }

    function applyStoredSceneState() {
      const stored = loadSceneState();
      if (!stored) {
        commitInitialBaseImageSelection();
        commitInitialPortraitSelection();
        return;
      }

      syncCharacterSlotCount(getCharacterSlotCountFromState(stored));
      syncTextSlotCount(getTextSlotCountFromState(stored));
      characterSlots.forEach((slot) => applyCharacterState(slot, stored));
      const storedCanvasPreset = stored.canvas_preset || stored.canvas_size || '';
      if (canvasPresetSelect && storedCanvasPreset && canvasPresets[storedCanvasPreset]) {
        canvasPresetSelect.value = storedCanvasPreset;
      }
      if (baseImageNameInput && stored.base_image_name) {
        baseImageNameInput.value = stored.base_image_name;
      }
      if (
        baseImageDisplayNameInput &&
        stored.base_image_display_name &&
        stored.base_image_display_name !== stored.portrait_filename
      ) {
        baseImageDisplayNameInput.value = stored.base_image_display_name;
      } else if (baseImageDisplayNameInput) {
        baseImageDisplayNameInput.value = '';
      }
      if (stored.base_image_url) {
        restoredBaseImageUrl = stored.base_image_url;
      }
      commitInitialBaseImageSelection();
      if (baseXInput && stored.base_x) {
        baseXInput.value = stored.base_x;
      }
      if (baseYInput && stored.base_y) {
        baseYInput.value = stored.base_y;
      }
      if (baseScaleInput && stored.base_scale) {
        baseScaleInput.value = stored.base_scale;
      }
      if (baseFitModeSelect && stored.base_fit_mode && ['contain', 'cover'].includes(stored.base_fit_mode)) {
        baseFitModeSelect.value = stored.base_fit_mode;
      }
      currentLayerOrderMode = loadLayerOrderMode(stored.layer_order_mode);
      currentLayerOrder = normalizeLayerOrder(stored.layer_order);
      currentLayerLocks = normalizeLayerLocks(stored.layer_locks);
      updateLayerOrderInput();
      updateLayerLockControls();
      applyLayerOrderToSettingsBlocks();
      applyLayerOrderToPreviewDom();
      textSettingSlots.forEach((slot) => {
        applyStoredTextState(slot, stored[slot.key] || {}, { enabledDefault: slot.slot === 1 });
      });
      const messageBand = stored.message_band || {};
      if (messageBandEnabledInput) {
        messageBandEnabledInput.checked = messageBand.enabled === true;
        updateVisibilityIcon(messageBandEnabledInput);
      }
      if (messageBandXInput && messageBand.x !== undefined) {
        messageBandXInput.value = String(messageBand.x);
      }
      if (messageBandYInput && messageBand.y !== undefined) {
        messageBandYInput.value = String(messageBand.y);
      }
      if (messageBandWidthInput && messageBand.width !== undefined) {
        messageBandWidthInput.value = String(messageBand.width);
      }
      if (messageBandHeightInput && messageBand.height !== undefined) {
        messageBandHeightInput.value = String(messageBand.height);
      }
      if (messageBandColorInput && typeof messageBand.color === 'string') {
        messageBandColorInput.value = messageBand.color;
      }
      if (messageBandOpacityInput && messageBand.opacity !== undefined) {
        messageBandOpacityInput.value = String(messageBand.opacity);
      }
      const storedBubbleOverlay = stored.bubble_overlay || {};
      const resolvedBubbleOverlaySourceType = 'asset';
      const resolvedBubbleOverlayAsset = storedBubbleOverlay.asset && bubbleOverlayAssets[storedBubbleOverlay.asset]
        ? storedBubbleOverlay.asset
        : getDefaultBubbleOverlayAssetId();
      const bubbleOverlayAsset = getBubbleOverlayAsset(resolvedBubbleOverlayAsset);
      if (bubbleOverlayEnabledInput) {
        bubbleOverlayEnabledInput.checked = storedBubbleOverlay.enabled === true;
        updateVisibilityIcon(bubbleOverlayEnabledInput);
      }
      if (bubbleOverlaySourceTypeInput) {
        bubbleOverlaySourceTypeInput.value = resolvedBubbleOverlaySourceType;
      }
      if (bubbleOverlayAssetInput && resolvedBubbleOverlayAsset) {
        bubbleOverlayAssetInput.value = resolvedBubbleOverlayAsset;
      }
      if (bubbleOverlayXInput) {
        bubbleOverlayXInput.value = String(storedBubbleOverlay.x ?? 180);
      }
      if (bubbleOverlayYInput) {
        bubbleOverlayYInput.value = String(storedBubbleOverlay.y ?? 220);
      }
      if (bubbleOverlayWidthInput) {
        bubbleOverlayWidthInput.value = String(storedBubbleOverlay.width ?? bubbleOverlayAsset?.default_width ?? 420);
      }
      if (bubbleOverlayHeightInput) {
        bubbleOverlayHeightInput.value = String(storedBubbleOverlay.height ?? bubbleOverlayAsset?.default_height ?? 180);
      }
      lastBubbleOverlayAssetValue = bubbleOverlayAssetInput?.value || '';
      updateOverlaySourcePanels();
      if (initialPortraitFilename) {
        commitInitialPortraitSelection();
      }
    }

    function loadPortraitLayoutState() {
      try {
        const raw = localStorage.getItem(portraitLayoutStorageKey);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }

    function getCharacterPortraitLayoutKey(slot) {
      const cacheKey = slot.cacheKeyInput?.value || '';
      if (cacheKey) {
        const cacheLayoutKey = `cache:${cacheKey}`;
        return buildCharacterLayoutKey(slot, cacheLayoutKey);
      }
      const portraitFilename = slot.portraitFilenameInput?.value
        || (slot.slot === 1 ? getLastSelectedPortrait(slot) : slot.cacheKeyInput?.dataset.portraitFilename)
        || '';
      if (portraitFilename) {
        return buildCharacterLayoutKey(slot, portraitFilename);
      }
      return '';
    }

    function getCharacter1PortraitLayoutKey() {
      return getCharacterPortraitLayoutKey(character1SlotDef);
    }

    function loadSceneUiState() {
      try {
        const raw = localStorage.getItem(sceneUiStateStorageKey);
        if (!raw) return { ...defaultSectionOpenState };
        const parsed = JSON.parse(raw);
        return {
          ...defaultSectionOpenState,
          ...(parsed && typeof parsed === 'object' ? parsed : {}),
        };
      } catch {
        return { ...defaultSectionOpenState };
      }
    }

    function saveSceneUiState(nextState) {
      try {
        localStorage.setItem(sceneUiStateStorageKey, JSON.stringify(nextState));
      } catch {
        // Ignore localStorage errors and keep current behavior.
      }
    }

    function applySectionOpenState(sectionKey, isOpen) {
      const block = document.querySelector(`.settings-block[data-section-key="${sectionKey}"]`);
      const toggle = document.querySelector(`[data-settings-toggle="${sectionKey}"]`);
      if (!block || !toggle) return;
      block.classList.toggle('is-collapsed', !isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    function applyStoredSectionOpenState(sectionKey) {
      const uiState = loadSceneUiState();
      const isOpen = uiState[sectionKey] ?? defaultSectionOpenState[sectionKey] ?? true;
      applySectionOpenState(sectionKey, isOpen);
    }

    function registerSectionToggle(toggle) {
      if (!toggle || toggle.dataset.sectionToggleBound === '1') return;
      toggle.dataset.sectionToggleBound = '1';
        toggle.addEventListener('click', () => {
          const sectionKey = toggle.dataset.settingsToggle;
          if (!sectionKey) return;
          const nextState = loadSceneUiState();
          const currentOpen = nextState[sectionKey] ?? defaultSectionOpenState[sectionKey] ?? true;
          nextState[sectionKey] = !currentOpen;
          saveSceneUiState(nextState);
          applySectionOpenState(sectionKey, !currentOpen);
        });
    }

    function initializeSectionToggles() {
      Object.keys(defaultSectionOpenState).forEach(applyStoredSectionOpenState);

      document.querySelectorAll('[data-settings-toggle]').forEach(registerSectionToggle);
    }

    function savePortraitLayoutState(layoutKey = getCharacter1PortraitLayoutKey(), slot = character1SlotDef) {
      if (!layoutKey) return;

      const layouts = loadPortraitLayoutState();
      layouts[layoutKey] = {
        x: slot.xInput?.value || '0',
        y: slot.yInput?.value || '0',
        scale: slot.scaleInput?.value || '100',
      };
      try {
        localStorage.setItem(portraitLayoutStorageKey, JSON.stringify(layouts));
      } catch {
        // Ignore localStorage errors and keep current behavior.
      }
    }

    function applyPortraitLayoutStateForSlot(slot) {
      const portraitFilename = getCharacterPortraitLayoutKey(slot);
      const activeKey = getActivePortraitLayoutKey(slot);
      if (!portraitFilename) {
        setActivePortraitLayoutKey(slot, '');
        return;
      }
      if (activeKey === portraitFilename) {
        return;
      }

      const layouts = loadPortraitLayoutState();
      const layout = layouts[portraitFilename];
      if (slot.xInput) {
        slot.xInput.value = layout?.x || '0';
      }
      if (slot.yInput) {
        slot.yInput.value = layout?.y || '0';
      }
      if (slot.scaleInput) {
        slot.scaleInput.value = layout?.scale || '100';
      }
      setActivePortraitLayoutKey(slot, portraitFilename);
    }

    function applyPortraitLayoutState() {
      characterSlots.forEach(applyPortraitLayoutStateForSlot);
    }

    function getServerBaseImageUrl() {
      if (restoredBaseImageUrl) {
        return restoredBaseImageUrl;
      }
      if (baseImageNameInput?.value) {
        return `/assets/background_images/${encodeURIComponent(baseImageNameInput.value)}`;
      }
      return '';
    }

    function isCharacterEnabled(slot) {
      return Boolean(slot.enabledInput?.checked);
    }

    function getCharacterActiveUrl(slot) {
      if (!isCharacterEnabled(slot)) {
        return '';
      }
      if (slot.portraitFilenameInput?.value) {
        return `/outputs/portrait/${encodeURIComponent(slot.portraitFilenameInput.value)}`;
      }
      if (slot.cacheKeyInput?.value) {
        return `/outputs/preview/${slot.cacheKeyInput.value}.png`;
      }
      return '';
    }

    function loadPendingComposeReflect() {
      try {
        const raw = sessionStorage.getItem(pendingComposeReflectKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.cache_key !== 'string' || typeof parsed.signature !== 'string') {
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    }

    function buildComposeFollowSlotDebugState(slot) {
      return {
        slot: slot.slot,
        enabled: slot.enabledInput?.checked,
        cacheKey: slot.cacheKeyInput?.value,
        portrait: slot.portraitFilenameInput?.value,
        layerSrc: slot.layer?.src,
      };
    }

    function refreshPreviewPortraitForCache(cacheKey) {
      const matchedSlots = characterSlots
        .filter((slot) => slot.cacheKeyInput?.value === cacheKey)
        .map((slot) => ({
          slot: slot.slot,
          cacheKey: slot.cacheKeyInput?.value,
          portrait: slot.portraitFilenameInput?.value,
          beforeSrc: slot.layer?.src,
        }));
      console.debug('[compose-follow] refresh target', {
        cacheKey,
        matchedSlots,
      });

      let didRefresh = false;
      characterSlots.forEach((slot) => {
        if (slot.cacheKeyInput?.value !== cacheKey) return;
        console.debug('[compose-follow] refresh before normalize', buildComposeFollowSlotDebugState(slot));
        slot.cacheKeyInput.value = cacheKey;
        normalizeCharacterSourceState(slot, 'preview');
        console.debug('[compose-follow] refresh after normalize', buildComposeFollowSlotDebugState(slot));
        didRefresh = true;
      });
      if (!didRefresh) {
        console.debug('[compose-follow] refresh skipped: no matched slot', { cacheKey });
        return;
      }
      console.debug('[compose-follow] before updatePreviewSources', {
        cacheKey,
        slots: characterSlots.map(buildComposeFollowSlotDebugState),
      });
      updatePreviewSources();
      console.debug('[compose-follow] after updatePreviewSources', {
        cacheKey,
        slots: characterSlots.map(buildComposeFollowSlotDebugState),
      });
      renderScenePreviewLayers();
      console.debug('[compose-follow] after renderScenePreviewLayers', {
        cacheKey,
        slots: characterSlots.map(buildComposeFollowSlotDebugState),
      });
    }

    async function followPendingComposeReflect() {
      const pending = loadPendingComposeReflect();
      if (!pending) return;
      console.debug('[compose-follow] pending', pending);
      if (!characterSlots.some((slot) => slot.cacheKeyInput?.value === pending.cache_key)) {
        console.debug('[compose-follow] no matching slot for pending cache_key', {
          pending,
          slots: characterSlots.map(buildComposeFollowSlotDebugState),
        });
        sessionStorage.removeItem(pendingComposeReflectKey);
        return;
      }

      const maxAttempts = 8;
      const intervalMs = 350;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
          const response = await fetch(`/api/compose_status?cache_key=${encodeURIComponent(pending.cache_key)}`, {
            cache: 'no-store',
          });
          const data = await response.json();
          console.debug('[compose-follow] poll', {
            pending,
            serverSignature: data.signature,
            matched: data.signature === pending.signature,
            imageUrl: data.image_url,
            previewAvailable: data.preview_available,
            ok: data.ok,
            responseOk: response.ok,
          });
          if (response.ok && data.ok && data.preview_available && data.signature === pending.signature) {
            console.debug('[compose-follow] slots', characterSlots.map(buildComposeFollowSlotDebugState));
            refreshPreviewPortraitForCache(pending.cache_key);
            sessionStorage.removeItem(pendingComposeReflectKey);
            return;
          }
        } catch (error) {
          console.debug('[compose-follow] poll error', {
            pending,
            message: error instanceof Error ? error.message : String(error),
          });
          // Best-effort follow-up; scene preview remains usable if polling fails.
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      sessionStorage.removeItem(pendingComposeReflectKey);
    }

    function showSceneStatus(message, state = '') {
      if (!sceneStatus) return;
      sceneStatus.textContent = message;
      sceneStatus.classList.toggle('is-error', state === 'error');
      sceneStatus.classList.toggle('is-loading', state === 'loading');
    }

    function updateCharacterPreviewSelectLabels() {
      characterSlots.forEach((slot) => {
        const placeholderOption = slot.cacheKeyInput?.querySelector('option[value=""]');
        if (!placeholderOption) return;
        if (!placeholderOption.dataset.defaultLabel) {
          placeholderOption.dataset.defaultLabel = placeholderOption.textContent || '';
        }

        const currentPortraitFilename = slot.portraitFilenameInput?.value || '';
        if (slot.slot === 1 && getLastSelectedPortrait(slot)) {
          slot.cacheKeyInput.dataset.portraitFilename = getLastSelectedPortrait(slot);
        }
        if (currentPortraitFilename) {
          slot.cacheKeyInput.dataset.portraitFilename = currentPortraitFilename;
        }
        const portraitFilename = slot.slot === 1
          ? (getLastSelectedPortrait(slot) || currentPortraitFilename)
          : (currentPortraitFilename || slot.cacheKeyInput.dataset.portraitFilename || '');
        placeholderOption.textContent = portraitFilename
          ? portraitFilename
          : placeholderOption.dataset.defaultLabel;
      });
    }

    function getCharacterSourceLabel(slot) {
      const portraitFilename = slot.portraitFilenameInput?.value || '';
      const cacheKey = slot.cacheKeyInput?.value || '';

      if (portraitFilename) {
        return `キャラ${slot.slot}: ${portraitFilename}`;
      }
      if (cacheKey) {
        return `キャラ${slot.slot}: preview (${cacheKey})`;
      }
      return '';
    }

    function updateCurrentSourceLabel() {
      if (!currentSource) return;
      updateCharacterPreviewSelectLabels();
      const labels = [];
      characterSlots.forEach((slot) => {
        if (!isCharacterEnabled(slot)) return;
        const label = getCharacterSourceLabel(slot);
        if (label) {
          labels.push(label);
        }
      });
      if (labels.length > 0) {
        currentSource.textContent = `使用中: ${labels.join(' / ')}`;
        return;
      }
      currentSource.textContent = '';
    }

    function updateBaseImageSourceLabel() {
      if (!baseImageSource) return;

      const baseFile = baseImageInput?.files?.[0];
      if (baseFile?.name) {
        baseImageSource.textContent = `使用中: ${baseFile.name}`;
        return;
      }
      if (baseImageDisplayNameInput?.value) {
        baseImageSource.textContent = `復元済み: ${baseImageDisplayNameInput.value}`;
        return;
      }
      baseImageSource.textContent = 'ベース画像が選択されていません';
    }

    function getBackgroundItemUrl(filename) {
      const item = backgroundGalleryItems.find((background) => background.filename === filename);
      return item?.url || `/assets/background_images/${encodeURIComponent(filename)}`;
    }

    function selectBackgroundImage(filename, url) {
      if (!filename) return;
      if (baseImageInput) {
        baseImageInput.value = '';
      }
      if (baseImageNameInput) {
        baseImageNameInput.value = filename;
      }
      if (baseImageDisplayNameInput) {
        baseImageDisplayNameInput.value = filename;
      }
      restoredBaseImageUrl = url || getBackgroundItemUrl(filename);
      updateBaseImageSourceLabel();
      updatePreviewSources();
      renderScenePreviewLayers();
      saveSceneState();
      scheduleScenePreview();
    }

    function getCurrentCanvasSize() {
      const preset = canvasPresets[canvasPresetSelect?.value] || canvasPresets['16:9'];
      return {
        fullWidth: preset[0],
        fullHeight: preset[1],
        previewWidth: Math.max(1, Math.round(preset[0] * previewScaleFactor)),
        previewHeight: Math.max(1, Math.round(preset[1] * previewScaleFactor)),
      };
    }

    function buildPreviewTextShadow(strokeWidth, strokeColor) {
      if (strokeWidth <= 0) {
        return 'none';
      }
      const shadows = [];
      for (let dx = -strokeWidth; dx <= strokeWidth; dx += 1) {
        for (let dy = -strokeWidth; dy <= strokeWidth; dy += 1) {
          if (dx === 0 && dy === 0) continue;
          shadows.push(`${dx}px ${dy}px 0 ${strokeColor}`);
        }
      }
      return shadows.join(', ');
    }

    function buildPreviewFontFamily(fontName) {
      const safeName = (fontName || '').replace(/[^A-Za-z0-9_-]+/g, '_');
      return `gn_akari_scene_font_${safeName || 'default'}`;
    }

    function setDebugRect(element, rect, visible, offsetX = 0, offsetY = 0) {
      if (!element) return;
      if (!visible || !rect) {
        element.classList.remove('is-visible');
        return;
      }
      element.style.left = `${rect.x - offsetX}px`;
      element.style.top = `${rect.y - offsetY}px`;
      element.style.width = `${rect.width}px`;
      element.style.height = `${rect.height}px`;
      element.classList.add('is-visible');
    }

    async function ensurePreviewFont(fontName) {
      if (!fontName || loadedPreviewFonts.has(fontName) || typeof FontFace === 'undefined') {
        return;
      }
      const fontFace = new FontFace(
        buildPreviewFontFamily(fontName),
        `url(/fonts/${encodeURIComponent(fontName)})`,
      );
      await fontFace.load();
      document.fonts.add(fontFace);
      loadedPreviewFonts.add(fontName);
    }

    async function loadFontOptions() {
      try {
        const response = await fetch('/api/files/font/list');
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || 'フォント一覧の取得に失敗しました。');
        }
        loadedTextFontItems = data.items || [];
        textSettingSlots.forEach((slot) => {
          const fontSelect = slot.fontInput;
          const currentValue = fontSelect?.value || '';
          if (!fontSelect) return;
          populateTextFontOptions(fontSelect, currentValue);
        });
      } catch (error) {
        showSceneStatus(error.message || 'フォント一覧の取得に失敗しました。', 'error');
      }
    }

    function updatePreviewViewportScale() {
      if (!previewStageViewport || !previewStageScale || !previewCanvas) return;

      const { previewWidth, previewHeight } = getCurrentCanvasSize();
      previewStageScale.style.width = `${previewWidth}px`;
      previewStageScale.style.height = `${previewHeight}px`;

      const availableWidth = previewStageViewport.clientWidth;
      if (availableWidth <= 0) {
        previewStageScale.style.transform = 'scale(1)';
        previewStageViewport.style.height = `${previewHeight}px`;
        return;
      }

      const scale = Math.min(1, availableWidth / previewWidth);
      previewStageScale.style.transform = `scale(${scale})`;
      previewStageViewport.style.height = `${Math.ceil(previewHeight * scale)}px`;
    }

    function getPreviewScale() {
      if (!previewCanvas) return { x: 1, y: 1 };
      const rect = previewCanvas.getBoundingClientRect();
      const { fullWidth, fullHeight } = getCurrentCanvasSize();
      if (rect.width === 0 || rect.height === 0) {
        return { x: 1, y: 1 };
      }
      return {
        x: fullWidth / rect.width,
        y: fullHeight / rect.height,
      };
    }

    function getFitScale(imageWidth, imageHeight, canvasWidth, canvasHeight, fitMode) {
      if (fitMode === 'cover') {
        return Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight);
      }
      return Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight);
    }

    function setLayerRect(layer, left, top, width, height) {
      layer.style.left = `${left}px`;
      layer.style.top = `${top}px`;
      layer.style.width = `${width}px`;
      layer.style.height = `${height}px`;
    }

    function setLayerPosition(layer, left, top) {
      if (!layer) return;
      layer.style.left = `${left}px`;
      layer.style.top = `${top}px`;
    }

    function setOverlayResizeHandlePosition(left, top, width, height) {
      if (bubbleOverlayResizeHandleRight) {
        const handleWidth = bubbleOverlayResizeHandleRight.offsetWidth || 10;
        const handleHeight = bubbleOverlayResizeHandleRight.offsetHeight || 32;
        bubbleOverlayResizeHandleRight.style.left = `${left + width - Math.round(handleWidth / 2)}px`;
        bubbleOverlayResizeHandleRight.style.top = `${top + Math.round((height - handleHeight) / 2)}px`;
      }
      if (bubbleOverlayResizeHandleBottom) {
        const handleWidth = bubbleOverlayResizeHandleBottom.offsetWidth || 32;
        const handleHeight = bubbleOverlayResizeHandleBottom.offsetHeight || 10;
        bubbleOverlayResizeHandleBottom.style.left = `${left + Math.round((width - handleWidth) / 2)}px`;
        bubbleOverlayResizeHandleBottom.style.top = `${top + height - Math.round(handleHeight / 2)}px`;
      }
    }

    function openSceneBaseImageDb() {
      if (sceneBaseImageDbPromise) {
        return sceneBaseImageDbPromise;
      }
      sceneBaseImageDbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
          reject(new Error('IndexedDB が利用できません。'));
          return;
        }
        const request = indexedDB.open(sceneBaseImageDbName, 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(sceneBaseImageStoreName)) {
            db.createObjectStore(sceneBaseImageStoreName, { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('IndexedDB を開けません。'));
      });
      return sceneBaseImageDbPromise;
    }

    async function saveLatestSceneBaseImageBlob(file) {
      const db = await openSceneBaseImageDb();
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(sceneBaseImageStoreName, 'readwrite');
        const store = transaction.objectStore(sceneBaseImageStoreName);
        store.put({
          id: sceneBaseImageRecordKey,
          blob: file,
          displayName: file.name || '',
          updatedAt: Date.now(),
        });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error('ベース画像の一時保存に失敗しました。'));
        transaction.onabort = () => reject(transaction.error || new Error('ベース画像の一時保存に失敗しました。'));
      });
      indexedDbBaseImageBlob = file;
    }

    async function loadLatestSceneBaseImageBlob() {
      const db = await openSceneBaseImageDb();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(sceneBaseImageStoreName, 'readonly');
        const store = transaction.objectStore(sceneBaseImageStoreName);
        const request = store.get(sceneBaseImageRecordKey);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error('ベース画像の読込に失敗しました。'));
      });
    }

    async function restoreIndexedDbBaseImage() {
      try {
        const record = await loadLatestSceneBaseImageBlob();
        indexedDbBaseImageBlob = record?.blob || null;
      } catch {
        indexedDbBaseImageBlob = null;
      }
    }

    async function appendSceneBaseImage(formData) {
      const baseFile = baseImageInput?.files?.[0];
      if (baseFile) {
        formData.set('base_image', baseFile, baseFile.name);
        return;
      }
      if (baseImageNameInput?.value) {
        formData.set('base_image_name', baseImageNameInput.value);
        return;
      }
      if (indexedDbBaseImageBlob) {
        const displayName = baseImageDisplayNameInput?.value || 'scene_base.png';
        formData.set('base_image', indexedDbBaseImageBlob, displayName);
      }
    }

    function appendCharacterState(formData) {
      characterSlots.forEach((slot) => {
        formData.set(getCharacterEnabledStateKey(slot), slot.enabledInput?.checked ? '1' : '0');
      });
    }

    async function uploadSceneBaseImage(file) {
      const formData = new FormData();
      formData.append('base_image', file);
      const response = await fetch('/api/scene_base_image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'ベース画像の保存に失敗しました。');
      }
      if (baseImageNameInput) {
        baseImageNameInput.value = data.base_image_name || '';
      }
      if (baseImageDisplayNameInput) {
        baseImageDisplayNameInput.value = data.base_image_display_name || file.name || '';
      }
      restoredBaseImageUrl = data.base_image_url || '';
      saveSceneState();
      updateBaseImageSourceLabel();
      return data;
    }

    function updatePreviewSources() {
      const baseFile = baseImageInput?.files?.[0];
      const serverBaseImageUrl = getServerBaseImageUrl();
      const nextBaseSourceKey = baseFile
        ? `file:${baseFile.name}:${baseFile.size}:${baseFile.lastModified}`
        : serverBaseImageUrl
          ? `server:${serverBaseImageUrl}`
          : indexedDbBaseImageBlob
            ? `indexeddb:${indexedDbBaseImageBlob.size}:${indexedDbBaseImageBlob.lastModified || 0}`
            : '';

      if (nextBaseSourceKey !== currentBasePreviewSourceKey && baseObjectUrl) {
        URL.revokeObjectURL(baseObjectUrl);
        baseObjectUrl = null;
        baseObjectUrlFile = null;
      }

      if (baseFile && baseLayer) {
        if (!baseObjectUrl || baseObjectUrlFile !== baseFile) {
          baseObjectUrl = URL.createObjectURL(baseFile);
          baseObjectUrlFile = baseFile;
        }
        if (baseLayer.src !== baseObjectUrl) {
          baseLayer.src = baseObjectUrl;
        }
        baseLayer.classList.remove('is-hidden');
      } else if (baseLayer && serverBaseImageUrl) {
        if (baseLayer.src !== new URL(serverBaseImageUrl, window.location.href).href) {
          baseLayer.src = serverBaseImageUrl;
        }
        baseLayer.classList.remove('is-hidden');
      } else if (baseLayer && indexedDbBaseImageBlob) {
        if (!baseObjectUrl || baseObjectUrlFile !== indexedDbBaseImageBlob) {
          baseObjectUrl = URL.createObjectURL(indexedDbBaseImageBlob);
          baseObjectUrlFile = indexedDbBaseImageBlob;
        }
        if (baseLayer.src !== baseObjectUrl) {
          baseLayer.src = baseObjectUrl;
        }
        baseLayer.classList.remove('is-hidden');
      } else if (baseLayer) {
        if (baseLayer.hasAttribute('src')) {
          baseLayer.removeAttribute('src');
        }
        baseLayer.classList.add('is-hidden');
      }
      currentBasePreviewSourceKey = nextBaseSourceKey;

      characterSlots.forEach((slot) => {
        const activePortraitUrl = getCharacterActiveUrl(slot);
        if (loadPendingComposeReflect()) {
          console.debug('[preview-source]', {
            slot: slot.slot,
            cacheKey: slot.cacheKeyInput?.value,
            portrait: slot.portraitFilenameInput?.value,
            activePortraitUrl,
          });
        }
        if (slot.layer && activePortraitUrl) {
          slot.layer.src = `${activePortraitUrl}?t=${Date.now()}`;
          slot.layer.classList.remove('is-hidden');
        } else if (slot.layer) {
          slot.layer.removeAttribute('src');
          slot.layer.classList.add('is-hidden');
        }
      });
      applyPortraitLayoutState();
      updateCurrentSourceLabel();
      updateBaseImageSourceLabel();
      saveSceneState();
    }

    function buildPreviewRgba(hexColor, opacity) {
      const normalized = (hexColor || '#000000').replace('#', '');
      const red = parseInt(normalized.slice(0, 2), 16) || 0;
      const green = parseInt(normalized.slice(2, 4), 16) || 0;
      const blue = parseInt(normalized.slice(4, 6), 16) || 0;
      const alpha = Math.max(0, Math.min(1, Number(opacity || 0)));
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }

    function clearTextPreviewLayer({ layer, content, contentBox, debugRect }) {
      if (content) {
        content.textContent = '';
        content.style.textShadow = 'none';
        content.style.removeProperty('font-family');
        content.style.removeProperty('font-size');
        content.style.removeProperty('line-height');
        content.style.removeProperty('color');
        content.style.removeProperty('text-align');
      }
      if (layer) {
        layer.style.removeProperty('left');
        layer.style.removeProperty('top');
        layer.style.removeProperty('width');
        layer.style.removeProperty('height');
      }
      if (contentBox) {
        contentBox.style.removeProperty('left');
        contentBox.style.removeProperty('top');
        contentBox.style.removeProperty('width');
        contentBox.style.removeProperty('height');
      }
      setDebugRect(debugRect, null, false);
      layer?.classList.add('is-hidden');
    }

    function getPreviewTextSize(slot) {
      return Math.max(1, Math.round(Number(slot.sizeInput?.value || slot.defaultSize) * previewScaleFactor));
    }

    function getPreviewTextLineHeight(textSize) {
      return textSize + Math.max(4, Math.round(textSize * 0.2));
    }

    function getPreviewTextStrokeWidth(slot) {
      return Math.max(0, Math.round(Number(slot.strokeWidthInput?.value || 0) * previewScaleFactor));
    }

    function getFreshTextLayout(slot) {
      if (latestPreviewLayoutRevision !== previewInputRevision) {
        return null;
      }
      return latestPreviewLayout?.[slot.key] || null;
    }

    function markPreviewInputsChanged() {
      previewInputRevision += 1;
    }

    function isTextLayerId(layerId) {
      return /^text\d+$/.test(layerId || '');
    }

    function applyLocalTextPreview(slot) {
      const { layer, content, contentBox, debugRect } = slot;
      if (!slot.enabledInput?.checked || !slot.valueInput?.value || !layer || !content || !contentBox) {
        clearTextPreviewLayer({ layer, content, contentBox, debugRect });
        return;
      }

      const textSize = getPreviewTextSize(slot);
      const strokeWidth = getPreviewTextStrokeWidth(slot);
      const fontName = slot.fontInput?.value || '';
      layer.style.left = `${Math.round(Number(slot.xInput?.value || 0) * previewScaleFactor)}px`;
      layer.style.top = `${Math.round(Number(slot.yInput?.value || 0) * previewScaleFactor)}px`;
      content.textContent = slot.valueInput.value || '';
      content.style.fontSize = `${textSize}px`;
      content.style.lineHeight = `${getPreviewTextLineHeight(textSize)}px`;
      content.style.color = slot.colorInput?.value || '#ffffff';
      content.style.textShadow = slot.strokeEnabledInput?.checked
        ? buildPreviewTextShadow(strokeWidth, slot.strokeColorInput?.value || '#000000')
        : 'none';
      content.style.fontFamily = fontName ? `"${buildPreviewFontFamily(fontName)}", sans-serif` : '';
      content.style.textAlign = 'left';
      contentBox.style.position = 'absolute';
      contentBox.style.left = '0px';
      contentBox.style.top = '0px';
      layer.classList.remove('is-hidden');
      updateImmediateTextLayerRect(slot);
    }

    function applySettledTextPreviewLayout(slot, layout) {
      const { layer, content, contentBox, debugRect } = slot;
      if (!layout || !layer || !contentBox) {
        setDebugRect(debugRect, null, false);
        return;
      }
      const textBoxRect = layout.text_box_rect || null;
      if (!textBoxRect) {
        setDebugRect(debugRect, null, false);
        return;
      }
      const layerLeft = textBoxRect.x || 0;
      const layerTop = textBoxRect.y || 0;
      setLayerRect(layer, layerLeft, layerTop, textBoxRect.width || 1, textBoxRect.height || 1);
      contentBox.style.width = `${textBoxRect.width || 1}px`;
      contentBox.style.height = `${textBoxRect.height || 1}px`;
      if (content && layout.resolved_font) {
        content.style.fontFamily = `"${buildPreviewFontFamily(layout.resolved_font)}", sans-serif`;
      }
      setDebugRect(debugRect, textBoxRect, Boolean(slot.debugInput?.checked), layerLeft, layerTop);
    }

    function renderTextPreviewLayer(slot) {
      applyLocalTextPreview(slot);
      if (slot.layer?.classList.contains('is-hidden')) {
        return;
      }
      applySettledTextPreviewLayout(slot, getFreshTextLayout(slot));
    }

    function renderMessageBandPreviewLayer() {
      if (!messageBandLayer || !messageBandEnabledInput?.checked) {
        messageBandLayer?.classList.add('is-hidden');
        return;
      }
      const x = Math.round(Number(messageBandXInput?.value || 0) * previewScaleFactor);
      const y = Math.round(Number(messageBandYInput?.value || 0) * previewScaleFactor);
      const width = Math.max(1, Math.round(Number(messageBandWidthInput?.value || 1) * previewScaleFactor));
      const height = Math.max(1, Math.round(Number(messageBandHeightInput?.value || 1) * previewScaleFactor));
      setLayerRect(messageBandLayer, x, y, width, height);
      messageBandLayer.style.background = buildPreviewRgba(messageBandColorInput?.value || '#000000', messageBandOpacityInput?.value || 0);
      messageBandLayer.classList.remove('is-hidden');
    }

    function getLocalBubbleOverlayLayout() {
      if (!bubbleOverlayEnabledInput?.checked) return null;
      const sourceType = bubbleOverlaySourceTypeInput?.value || 'asset';
      const serverLayout = latestPreviewLayout?.bubble_overlay || null;
      const assetId = bubbleOverlayAssetInput?.value || serverLayout?.asset || '';
      const bubbleAsset = sourceType === 'asset' ? getBubbleOverlayAsset(assetId) : null;
      if (!bubbleAsset && sourceType !== 'file') return null;
      return {
        source_type: sourceType,
        asset: assetId,
        upload_file: serverLayout?.upload_file || '',
        image_url: serverLayout?.image_url || '',
        x: Math.round(Number(bubbleOverlayXInput?.value || 0) * previewScaleFactor),
        y: Math.round(Number(bubbleOverlayYInput?.value || 0) * previewScaleFactor),
        width: Math.max(1, Math.round(Number(bubbleOverlayWidthInput?.value || 1) * previewScaleFactor)),
        height: Math.max(1, Math.round(Number(bubbleOverlayHeightInput?.value || 1) * previewScaleFactor)),
      };
    }

    function resolveBubbleOverlayPreviewSource(layout, asset) {
      if (!layout) return { key: '', url: '' };
      if (layout.source_type === 'file') {
        const uploadFile = layout.upload_file || '';
        return uploadFile
          ? { key: `file:${uploadFile}`, url: `/data/src/${encodeURIComponent(uploadFile)}` }
          : { key: '', url: '' };
      }
      const assetKey = layout.asset || asset?.id || '';
      const url = layout.image_url || asset?.file || '';
      return url
        ? { key: `asset:${assetKey}:${url}`, url }
        : { key: '', url: '' };
    }

    function renderBasePreviewLayerPosition() {
      if (!baseLayer || baseLayer.naturalWidth <= 0 || baseLayer.naturalHeight <= 0) return;
      const { previewWidth, previewHeight } = getCurrentCanvasSize();
      const baseFitMode = baseFitModeSelect?.value || 'contain';
      const baseScale = Number(baseScaleInput?.value || 100);
      const baseX = Number(baseXInput?.value || 0);
      const baseY = Number(baseYInput?.value || 0);
      const baseFitScale = getFitScale(
        baseLayer.naturalWidth,
        baseLayer.naturalHeight,
        previewWidth,
        previewHeight,
        baseFitMode,
      );
      const baseFinalScale = baseFitScale * (baseScale / 100);
      const baseWidth = Math.max(1, Math.round(baseLayer.naturalWidth * baseFinalScale));
      const baseHeight = Math.max(1, Math.round(baseLayer.naturalHeight * baseFinalScale));
      const baseLeft = Math.round((previewWidth - baseWidth) / 2 + baseX * previewScaleFactor);
      const baseTop = Math.round((previewHeight - baseHeight) / 2 + baseY * previewScaleFactor);
      setLayerRect(baseLayer, baseLeft, baseTop, baseWidth, baseHeight);
    }

    function renderScenePreviewLayers() {
      if (!previewCanvas || !sceneStage || !sceneEmpty || !baseLayer) return;
      applyLayerOrderToPreviewDom();

      const { previewWidth, previewHeight } = getCurrentCanvasSize();
      previewCanvas.style.width = `${previewWidth}px`;
      previewCanvas.style.height = `${previewHeight}px`;
      updatePreviewViewportScale();

      const hasBase = Boolean(baseLayer.src) && baseLayer.naturalWidth > 0 && baseLayer.naturalHeight > 0;
      const activeCharacterLayers = characterSlots.filter((slot) =>
        Boolean(slot.layer?.src) && slot.layer.naturalWidth > 0 && slot.layer.naturalHeight > 0,
      );
      const hasPreview = hasBase && activeCharacterLayers.length > 0;
      sceneStage.classList.toggle('is-hidden', !hasPreview);
      sceneEmpty.classList.toggle('is-hidden', hasPreview);
      if (!hasPreview) return;

      renderBasePreviewLayerPosition();
      renderMessageBandPreviewLayer();

      characterSlots.forEach((slot) => {
        if (!slot.layer || slot.layer.classList.contains('is-hidden') || slot.layer.naturalWidth <= 0 || slot.layer.naturalHeight <= 0) {
          return;
        }
        const characterX = Number(slot.xInput?.value || 0);
        const characterY = Number(slot.yInput?.value || 0);
        const characterScale = Number(slot.scaleInput?.value || 100);
        const finalScale = (characterScale / 100) * previewScaleFactor;
        const width = Math.max(1, Math.round(slot.layer.naturalWidth * finalScale));
        const height = Math.max(1, Math.round(slot.layer.naturalHeight * finalScale));
        const left = Math.round(characterX * previewScaleFactor);
        const top = Math.round(characterY * previewScaleFactor);
        setLayerRect(slot.layer, left, top, width, height);
      });

      const bubbleDebugVisible = textSettingSlots.some((slot) => Boolean(slot.debugInput?.checked));
      const bubbleOverlayLayout = getLocalBubbleOverlayLayout();
      if (bubbleOverlayLayout && bubbleOverlayLayer) {
        const bubbleAsset = bubbleOverlayLayout.source_type === 'asset'
          ? getBubbleOverlayAsset(bubbleOverlayLayout.asset)
          : null;
        if (bubbleAsset || bubbleOverlayLayout.source_type === 'file') {
          const overlayLeft = bubbleOverlayLayout.x;
          const overlayTop = bubbleOverlayLayout.y;
          const overlayWidth = bubbleOverlayLayout.width;
          const overlayHeight = bubbleOverlayLayout.height;
          setLayerRect(
            bubbleOverlayLayer,
            overlayLeft,
            overlayTop,
            overlayWidth,
            overlayHeight,
          );
          const overlaySource = resolveBubbleOverlayPreviewSource(bubbleOverlayLayout, bubbleAsset);
          if (overlaySource.url && overlaySource.key !== currentBubbleOverlayPreviewSourceKey) {
            bubbleOverlayLayer.src = overlaySource.url;
            currentBubbleOverlayPreviewSourceKey = overlaySource.key;
          }
          bubbleOverlayLayer.classList.remove('is-hidden');
          bubbleOverlayLayer.classList.add('preview-overlay-layer--interactive');
          bubbleOverlayResizeHandleRight?.classList.add('is-visible');
          bubbleOverlayResizeHandleBottom?.classList.add('is-visible');
          setOverlayResizeHandlePosition(overlayLeft, overlayTop, overlayWidth, overlayHeight);
          setDebugRect(bubbleDebugRect, bubbleOverlayLayout, bubbleDebugVisible);
        } else {
          bubbleOverlayLayer.removeAttribute('src');
          currentBubbleOverlayPreviewSourceKey = '';
          bubbleOverlayLayer.classList.add('is-hidden');
          bubbleOverlayLayer.classList.remove('preview-overlay-layer--interactive');
          bubbleOverlayResizeHandleRight?.classList.remove('is-visible');
          bubbleOverlayResizeHandleBottom?.classList.remove('is-visible');
          setDebugRect(bubbleDebugRect, null, false);
        }
      } else {
        if (bubbleOverlayLayer) {
          bubbleOverlayLayer.removeAttribute('src');
          currentBubbleOverlayPreviewSourceKey = '';
          bubbleOverlayLayer.classList.add('is-hidden');
          bubbleOverlayLayer.classList.remove('preview-overlay-layer--interactive');
        }
        bubbleOverlayResizeHandleRight?.classList.remove('is-visible');
        bubbleOverlayResizeHandleBottom?.classList.remove('is-visible');
        setDebugRect(bubbleDebugRect, null, false);
      }

      textSettingSlots.forEach((slot) => {
        renderTextPreviewLayer(slot);
      });
      updatePreviewViewportScale();
    }

    function beginBaseDrag(event) {
      if (!sceneStage || !baseXInput || !baseYInput) return;
      if (event.button !== undefined && event.button !== 0) return;
      if (blockLockedPointer('base_image', event)) return;
      if (sceneStage.classList.contains('is-hidden')) return;

      const scale = getPreviewScale();
      baseDragState = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startBaseX: Number(baseXInput.value || 0),
        startBaseY: Number(baseYInput.value || 0),
        scaleX: scale.x,
        scaleY: scale.y,
      };
      sceneStage.classList.add('is-dragging');
      sceneStage.setPointerCapture(event.pointerId);
      event.preventDefault();
    }

    function updateBaseDrag(event) {
      if (!baseDragState || !baseXInput || !baseYInput) return;
      if (event.pointerId !== baseDragState.pointerId) return;

      const dx = (event.clientX - baseDragState.startClientX) * baseDragState.scaleX;
      const dy = (event.clientY - baseDragState.startClientY) * baseDragState.scaleY;
      baseXInput.value = String(Math.round(baseDragState.startBaseX + dx));
      baseYInput.value = String(Math.round(baseDragState.startBaseY + dy));
      renderBasePreviewLayerPosition();
      event.preventDefault();
    }

    function endBaseDrag(event) {
      if (!baseDragState || !sceneStage) return;
      if (event.pointerId !== baseDragState.pointerId) return;

      if (sceneStage.hasPointerCapture(event.pointerId)) {
        sceneStage.releasePointerCapture(event.pointerId);
      }
      sceneStage.classList.remove('is-dragging');
      baseDragState = null;
      saveSceneState();
      renderScenePreviewLayers();
      event.preventDefault();
    }

    function applyDraggedPreviewObjectPosition(target, x, y) {
      if (!target.layer || !target.xInput || !target.yInput) return;
      target.xInput.value = String(x);
      target.yInput.value = String(y);
      target.syncPreviewLayoutPosition?.(x, y);
      setLayerPosition(
        target.layer,
        Math.round(x * previewScaleFactor),
        Math.round(y * previewScaleFactor),
      );
    }

    function beginPreviewObjectDrag(target, event) {
      if (!target.layer || !target.xInput || !target.yInput) return;
      if (event.button !== undefined && event.button !== 0) return;
      if (blockLockedPointer(target.layerId, event)) return;
      if (target.layer.classList.contains('is-hidden')) return;
      setActiveLayer(target.layerId);

      const scale = getPreviewScale();
      previewObjectDragState = {
        target,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startX: Number(target.xInput.value || 0),
        startY: Number(target.yInput.value || 0),
        scaleX: scale.x,
        scaleY: scale.y,
      };
      if (isTextLayerId(target.layerId)) {
        markPreviewInputsChanged();
      }
      target.layer.classList.add('is-dragging');
      target.layer.setPointerCapture(event.pointerId);
      event.stopPropagation();
      event.preventDefault();
    }

    function beginSelectedPreviewObjectDrag(event) {
      if (event.target.closest('.preview-overlay-resize-handle')) return;
      const target = choosePreviewHitCandidate(getPreviewHitCandidates(event), event);
      if (!target?.layer) return;
      beginPreviewObjectDrag(target, event);
      event.stopImmediatePropagation();
    }

    function updatePreviewObjectDrag(event) {
      if (!previewObjectDragState) return;
      if (event.pointerId !== previewObjectDragState.pointerId) return;

      const { target } = previewObjectDragState;
      const nextX = Math.round(previewObjectDragState.startX + (event.clientX - previewObjectDragState.startClientX) * previewObjectDragState.scaleX);
      const nextY = Math.round(previewObjectDragState.startY + (event.clientY - previewObjectDragState.startClientY) * previewObjectDragState.scaleY);
      applyDraggedPreviewObjectPosition(target, nextX, nextY);
      event.preventDefault();
    }

    function endPreviewObjectDrag(event) {
      if (!previewObjectDragState) return;
      if (event.pointerId !== previewObjectDragState.pointerId) return;

      const { target } = previewObjectDragState;
      if (target.layer.hasPointerCapture(event.pointerId)) {
        target.layer.releasePointerCapture(event.pointerId);
      }
      target.layer.classList.remove('is-dragging');
      previewObjectDragState = null;
      target.onCommit?.();
      saveSceneState();
      renderScenePreviewLayers();
      if (isTextLayerId(target.layerId)) {
        scheduleScenePreview();
      }
      event.stopPropagation();
      event.preventDefault();
    }

    function applyOverlayResize(width, height) {
      const nextWidth = Math.max(40, width);
      const nextHeight = Math.max(40, height);
      bubbleOverlayWidthInput.value = String(nextWidth);
      bubbleOverlayHeightInput.value = String(nextHeight);
      overlayDragTarget.syncPreviewLayoutSize?.(nextWidth, nextHeight);
      const previewLeft = Math.round(Number(bubbleOverlayXInput.value || 0) * previewScaleFactor);
      const previewTop = Math.round(Number(bubbleOverlayYInput.value || 0) * previewScaleFactor);
      const previewWidth = Math.round(nextWidth * previewScaleFactor);
      const previewHeight = Math.round(nextHeight * previewScaleFactor);
      setLayerRect(bubbleOverlayLayer, previewLeft, previewTop, previewWidth, previewHeight);
      setOverlayResizeHandlePosition(previewLeft, previewTop, previewWidth, previewHeight);
    }

    function beginOverlayResize(axis, event) {
      if (!bubbleOverlayLayer || !bubbleOverlayWidthInput || !bubbleOverlayHeightInput) return;
      if (event.button !== undefined && event.button !== 0) return;
      if (blockLockedPointer('overlay_image', event)) return;
      if (bubbleOverlayLayer.classList.contains('is-hidden')) return;

      const scale = getPreviewScale();
      overlayResizeState = {
        axis,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startWidth: Number(bubbleOverlayWidthInput.value || 0),
        startHeight: Number(bubbleOverlayHeightInput.value || 0),
        scaleX: scale.x,
        scaleY: scale.y,
      };
      const handle = axis === 'x' ? bubbleOverlayResizeHandleRight : bubbleOverlayResizeHandleBottom;
      handle?.classList.add('is-dragging');
      handle?.setPointerCapture(event.pointerId);
      event.stopPropagation();
      event.preventDefault();
    }

    function updateOverlayResize(event) {
      if (!overlayResizeState) return;
      if (event.pointerId !== overlayResizeState.pointerId) return;

      const nextWidth = overlayResizeState.axis === 'x'
        ? Math.round(overlayResizeState.startWidth + (event.clientX - overlayResizeState.startClientX) * overlayResizeState.scaleX)
        : overlayResizeState.startWidth;
      const nextHeight = overlayResizeState.axis === 'y'
        ? Math.round(overlayResizeState.startHeight + (event.clientY - overlayResizeState.startClientY) * overlayResizeState.scaleY)
        : overlayResizeState.startHeight;
      applyOverlayResize(nextWidth, nextHeight);
      event.stopPropagation();
      event.preventDefault();
    }

    function endOverlayResize(event) {
      if (!overlayResizeState) return;
      if (event.pointerId !== overlayResizeState.pointerId) return;

      const handle = overlayResizeState.axis === 'x' ? bubbleOverlayResizeHandleRight : bubbleOverlayResizeHandleBottom;
      if (handle?.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId);
      }
      handle?.classList.remove('is-dragging');
      overlayResizeState = null;
      overlayDragTarget.onCommit?.();
      saveSceneState();
      renderScenePreviewLayers();
      event.stopPropagation();
      event.preventDefault();
    }

    function initializeLayerOrderDrag() {
      if (!sceneForm) return;
      sceneForm.querySelectorAll('.settings-block[data-layer-id]').forEach((block) => {
        const headerMain = block.querySelector('.settings-block-header-main');
        if (!headerMain || headerMain.querySelector('.layer-drag-handle')) return;
        const handle = document.createElement('span');
        handle.className = 'layer-drag-handle';
        handle.draggable = true;
        handle.title = 'レイヤ順を並び替え';
        handle.innerHTML = '<svg viewBox="0 0 12 16" aria-hidden="true"><circle cx="4" cy="3" r="1.3"/><circle cx="8" cy="3" r="1.3"/><circle cx="4" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="4" cy="13" r="1.3"/><circle cx="8" cy="13" r="1.3"/></svg>';
        handle.addEventListener('pointerdown', (event) => {
          event.stopPropagation();
        });
        handle.addEventListener('click', (event) => {
          event.stopPropagation();
        });
        handle.addEventListener('dragstart', (event) => {
          layerOrderDraggingBlock = block;
          block.classList.add('is-layer-dragging');
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', block.dataset.layerId || '');
        });
        handle.addEventListener('dragend', () => {
          layerOrderDraggingBlock?.classList.remove('is-layer-dragging');
          layerOrderDraggingBlock = null;
          updateLayerOrderFromSettingsBlocks();
          applyLayerOrderToPreviewDom();
          saveSceneState();
        });
        block.addEventListener('dragover', (event) => {
          if (!layerOrderDraggingBlock || layerOrderDraggingBlock === block) return;
          event.preventDefault();
          const rect = block.getBoundingClientRect();
          const isAfter = event.clientY > rect.top + rect.height / 2;
          sceneForm.insertBefore(layerOrderDraggingBlock, isAfter ? block.nextSibling : block);
        });
        headerMain.insertBefore(handle, headerMain.firstChild);
      });
    }

    function initializeLayerMoveControls() {
      if (!sceneForm) return;
      sceneForm.querySelectorAll('.settings-block[data-layer-id]').forEach((block) => {
        const actions = block.querySelector('.settings-block-header-actions');
        if (!actions || actions.querySelector('[data-layer-move]')) return;

        const backButton = document.createElement('span');
        backButton.className = 'layer-drag-handle layer-move-control';
        backButton.setAttribute('role', 'button');
        backButton.tabIndex = 0;
        backButton.title = '背面へ';
        backButton.dataset.layerMove = 'back';
        backButton.textContent = '↓';

        const frontButton = document.createElement('span');
        frontButton.className = 'layer-drag-handle layer-move-control';
        frontButton.setAttribute('role', 'button');
        frontButton.tabIndex = 0;
        frontButton.title = '前面へ';
        frontButton.dataset.layerMove = 'front';
        frontButton.textContent = '↑';

        const collapseToggle = actions.querySelector('.settings-block-toggle');
        actions.insertBefore(backButton, collapseToggle || actions.firstChild);
        actions.insertBefore(frontButton, collapseToggle || actions.firstChild);
      });

      if (sceneForm.dataset.layerMoveEventsBound === '1') return;
      sceneForm.dataset.layerMoveEventsBound = '1';
      sceneForm.addEventListener('click', (event) => {
        const control = event.target.closest('[data-layer-move]');
        if (!control || !sceneForm.contains(control)) return;
        const block = control.closest('.settings-block[data-layer-id]');
        const direction = control.dataset.layerMove;
        if (!block?.dataset.layerId || !direction) return;

        event.preventDefault();
        event.stopPropagation();
        moveLayerOrder(block.dataset.layerId, direction);
      }, true);

      sceneForm.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const control = event.target.closest('[data-layer-move]');
        if (!control || !sceneForm.contains(control)) return;
        const block = control.closest('.settings-block[data-layer-id]');
        const direction = control.dataset.layerMove;
        if (!block?.dataset.layerId || !direction) return;

        event.preventDefault();
        event.stopPropagation();
        moveLayerOrder(block.dataset.layerId, direction);
      }, true);
    }

    function initializeLayerHeaderLabels() {
      const labels = {
        base_image: 'ベース画像',
        character1: 'キャラ1',
        character2: 'キャラ2',
        character3: 'キャラ3',
        message_band: 'メッセージ帯',
        overlay_image: '画像オーバーレイ',
      };
      sceneForm?.querySelectorAll('.settings-block[data-layer-id]').forEach((block) => {
        const textMatch = String(block.dataset.layerId || '').match(/^text(\d+)$/);
        const label = textMatch ? `テキスト${textMatch[1]}` : labels[block.dataset.layerId];
        const title = block.querySelector('.settings-block-title');
        if (label && title) {
          title.textContent = label;
        }
      });
    }

    function initializeLayerLockControls() {
      if (!sceneForm) return;
      sceneForm.querySelectorAll('.settings-block[data-layer-id]').forEach((block) => {
        const layerId = block.dataset.layerId;
        const actions = block.querySelector('.settings-block-header-actions');
        if (!layerId || !actions || actions.querySelector('.layer-lock-toggle')) return;

        const label = document.createElement('label');
        label.className = 'layer-lock-toggle';
        label.title = 'preview上の位置操作をロック';
        label.htmlFor = `layer-lock-${layerId}`;

        const input = document.createElement('input');
        input.id = `layer-lock-${layerId}`;
        input.type = 'checkbox';
        input.value = '1';
        input.addEventListener('change', () => {
          currentLayerLocks = normalizeLayerLocks(currentLayerLocks);
          currentLayerLocks[layerId] = input.checked;
          updateLayerLockControls();
          saveSceneState();
        });

        const icon = document.createElement('span');
        icon.className = 'layer-lock-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '🔓';

        label.appendChild(input);
        label.appendChild(icon);
        label.addEventListener('click', (event) => {
          event.stopPropagation();
        });

        const collapseToggle = actions.querySelector('.settings-block-toggle');
        actions.insertBefore(label, collapseToggle || actions.firstChild);
      });
      updateLayerLockControls();
    }

    async function runScenePreview(requestId, inputRevision) {
      if (!sceneForm) return;
      const hasBaseImage =
        Boolean(baseImageInput?.files?.[0]) ||
        Boolean(baseImageNameInput?.value) ||
        Boolean(indexedDbBaseImageBlob);
      if (!hasBaseImage) return;
      const hasCharacter = characterSlots.some((slot) =>
        isCharacterEnabled(slot) && (Boolean(slot.cacheKeyInput?.value) || Boolean(slot.portraitFilenameInput?.value)),
      );
      if (!hasCharacter) return;

      try {
        showSceneStatus('プレビュー更新中...', 'loading');
        updateLayerOrderInput();
        const formData = new FormData(sceneForm);
        appendCharacterState(formData);
        await appendSceneBaseImage(formData);
        const response = await fetch('/api/scene_preview', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (requestId !== latestPreviewRequestId || inputRevision !== previewInputRevision) return;
        if (!response.ok || !data.ok) {
          throw new Error(data.error || 'プレビュー更新に失敗しました。');
        }
        latestPreviewLayout = data.layout || null;
        latestPreviewLayoutRevision = inputRevision;
        await Promise.all(textSettingSlots.map((slot) => {
          const resolvedFont = latestPreviewLayout?.[slot.key]?.resolved_font || '';
          return resolvedFont ? ensurePreviewFont(resolvedFont) : Promise.resolve();
        }));
        if (requestId !== latestPreviewRequestId || inputRevision !== previewInputRevision) return;
        renderScenePreviewLayers();
        showSceneStatus('');
        saveSceneState();
      } catch (error) {
        if (requestId !== latestPreviewRequestId || inputRevision !== previewInputRevision) return;
        showSceneStatus(error.message || 'プレビュー更新に失敗しました。', 'error');
      }
    }

    function scheduleScenePreview() {
      if (previewTimer) {
        clearTimeout(previewTimer);
      }
      const requestId = ++latestPreviewRequestId;
      const inputRevision = previewInputRevision;
      previewTimer = setTimeout(() => {
        runScenePreview(requestId, inputRevision);
      }, 400);
    }

    async function runInitialScenePreview() {
      if (previewTimer) {
        clearTimeout(previewTimer);
        previewTimer = null;
      }
      const requestId = ++latestPreviewRequestId;
      await runScenePreview(requestId, previewInputRevision);
    }

    function getCharacterSlotForLayoutInput(element) {
      return characterSlots.find((slot) => (
        element === slot.xInput || element === slot.yInput || element === slot.scaleInput
      )) || null;
    }

    function applyImmediatePreviewUpdate({ savePortrait = true, portraitSlot = character1SlotDef } = {}) {
      syncImmediatePreviewLayoutFromInputs();
      renderScenePreviewLayers();
      if (savePortrait) {
        savePortraitLayoutState(getCharacterPortraitLayoutKey(portraitSlot), portraitSlot);
      }
      saveSceneState();
    }

    function syncTextPreviewLayoutPosition(slotName, xInput, yInput) {
      const textLayout = latestPreviewLayout?.[slotName];
      const textBoxRect = textLayout?.text_box_rect;
      const textOrigin = textLayout?.text_origin;
      if (!textBoxRect || !textOrigin) return;
      const offsetX = textOrigin.x - textBoxRect.x;
      const offsetY = textOrigin.y - textBoxRect.y;
      textBoxRect.x = Math.round(Number(xInput?.value || 0) * previewScaleFactor);
      textBoxRect.y = Math.round(Number(yInput?.value || 0) * previewScaleFactor);
      textOrigin.x = textBoxRect.x + offsetX;
      textOrigin.y = textBoxRect.y + offsetY;
    }

    function syncImmediatePreviewLayoutFromInputs() {
      if (latestPreviewLayout?.message_band) {
        latestPreviewLayout.message_band.x = Math.round(Number(messageBandXInput?.value || 0) * previewScaleFactor);
        latestPreviewLayout.message_band.y = Math.round(Number(messageBandYInput?.value || 0) * previewScaleFactor);
        latestPreviewLayout.message_band.width = Math.max(1, Math.round(Number(messageBandWidthInput?.value || 1) * previewScaleFactor));
        latestPreviewLayout.message_band.height = Math.max(1, Math.round(Number(messageBandHeightInput?.value || 1) * previewScaleFactor));
        latestPreviewLayout.message_band.color = messageBandColorInput?.value || '#000000';
        latestPreviewLayout.message_band.opacity = Number(messageBandOpacityInput?.value || 0);
      }
      if (latestPreviewLayout?.bubble_overlay) {
        latestPreviewLayout.bubble_overlay.x = Math.round(Number(bubbleOverlayXInput?.value || 0) * previewScaleFactor);
        latestPreviewLayout.bubble_overlay.y = Math.round(Number(bubbleOverlayYInput?.value || 0) * previewScaleFactor);
        latestPreviewLayout.bubble_overlay.width = Math.max(1, Math.round(Number(bubbleOverlayWidthInput?.value || 1) * previewScaleFactor));
        latestPreviewLayout.bubble_overlay.height = Math.max(1, Math.round(Number(bubbleOverlayHeightInput?.value || 1) * previewScaleFactor));
      }
      textSettingSlots.forEach((slot) => {
        syncTextPreviewLayoutPosition(slot.key, slot.xInput, slot.yInput);
      });
    }

    function applyImmediateTextInputUpdate(element) {
      const slot = getTextSlotForInput(element);
      if (!slot) return;
      applyLocalTextPreview(slot);
    }

    function updateImmediateTextLayerRect(slot) {
      if (!slot.layer || !slot.contentBox) return;
      const contentRect = slot.content?.getBoundingClientRect();
      const width = Math.max(1, Math.ceil(contentRect?.width || Number(slot.layer.style.width.replace('px', '')) || 1));
      const height = Math.max(1, Math.ceil(contentRect?.height || Number(slot.layer.style.height.replace('px', '')) || 1));
      slot.layer.style.width = `${width}px`;
      slot.layer.style.height = `${height}px`;
      slot.contentBox.style.width = `${width}px`;
      slot.contentBox.style.height = `${height}px`;
      if (slot.debugRect && slot.debugInput?.checked) {
        slot.debugRect.style.left = '0px';
        slot.debugRect.style.top = '0px';
        slot.debugRect.style.width = `${width}px`;
        slot.debugRect.style.height = `${height}px`;
        slot.debugRect.classList.add('is-visible');
      } else {
        slot.debugRect?.classList.remove('is-visible');
      }
    }

    function requestCommittedPreviewUpdate({ savePortrait = true, server = true } = {}) {
      applyImmediatePreviewUpdate({ savePortrait });
      if (server) {
        scheduleScenePreview();
      }
    }

    sceneForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      updateLayerOrderInput();
      const formData = new FormData(sceneForm);
      appendCharacterState(formData);
      await appendSceneBaseImage(formData);
      showSceneStatus('合成中...', 'loading');

      try {
        const response = await fetch('/api/scene', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.error || '合成に失敗しました。');
        }

        sceneLinkRow?.classList.remove('is-hidden');
        sceneLink.href = data.image_url;
        sceneLink.textContent = data.image_url.replace('/outputs/', '');
        renderScenePreviewLayers();
        showSceneStatus('scene を保存しました。');
      } catch (error) {
        showSceneStatus(error.message || '合成に失敗しました。', 'error');
      }
    });

    const immediatePreviewInputs = [
      baseFitModeSelect,
      baseScaleInput,
      baseXInput,
      baseYInput,
      canvasPresetSelect,
      bubbleOverlayXInput,
      bubbleOverlayYInput,
      bubbleOverlayWidthInput,
      bubbleOverlayHeightInput,
      messageBandXInput,
      messageBandYInput,
      messageBandWidthInput,
      messageBandHeightInput,
      messageBandColorInput,
      messageBandOpacityInput,
    ];
    immediatePreviewInputs.forEach((element) => {
      element?.addEventListener('change', () => {
        const portraitSlot = getCharacterSlotForLayoutInput(element);
        if (portraitSlot) {
          savePortraitLayoutState(getCharacterPortraitLayoutKey(portraitSlot), portraitSlot);
        }
        requestCommittedPreviewUpdate({ server: false });
      });
      element?.addEventListener('input', () => {
        applyImmediatePreviewUpdate({ portraitSlot: getCharacterSlotForLayoutInput(element) || character1SlotDef });
      });
    });

    characterSlots.forEach(registerCharacterSlotEvents);
    textSettingSlots.forEach(registerTextSlotEvents);
    bubbleOverlayEnabledInput?.addEventListener('change', () => {
      updateVisibilityIcon(bubbleOverlayEnabledInput);
      renderScenePreviewLayers();
      saveSceneState();
      if (bubbleOverlayEnabledInput.checked && !latestPreviewLayout?.bubble_overlay) {
        scheduleScenePreview();
      }
    });
    bubbleOverlayAssetInput?.addEventListener('change', () => {
      applySelectedOverlayAssetDefaults(lastBubbleOverlayAssetValue);
      lastBubbleOverlayAssetValue = bubbleOverlayAssetInput.value;
      renderScenePreviewLayers();
      saveSceneState();
      scheduleScenePreview();
    });
    [messageBandEnabledInput].forEach((element) => {
      element?.addEventListener('change', () => {
        if (element === messageBandEnabledInput) {
          updateVisibilityIcon(element);
        }
        renderScenePreviewLayers();
        saveSceneState();
        if (element === messageBandEnabledInput && element.checked && !latestPreviewLayout?.message_band) {
          scheduleScenePreview();
        }
      });
    });

    function handleCharacterSourceChange(slot) {
      normalizeCharacterSourceState(slot, slot.cacheKeyInput?.value ? 'preview' : 'portrait');
      updatePreviewSources();
      renderScenePreviewLayers();
      scheduleScenePreview();
    }

    function handleCharacterPreviewSelectChange(slot) {
      savePortraitLayoutState(getActivePortraitLayoutKey(slot), slot);
      const selectedCacheKey = slot.cacheKeyInput?.value || '';
      if (selectedCacheKey) {
        const portraitFilename = getPortraitFilenameBeforePreviewSelection(slot);
        if (portraitFilename) {
          setLastSelectedPortrait(slot, portraitFilename);
        }
        if (portraitFilename && slot.cacheKeyInput) {
          slot.cacheKeyInput.dataset.portraitFilename = portraitFilename;
        }
        if (slot.portraitFilenameInput) {
          slot.portraitFilenameInput.value = '';
        }
      } else if (slot.portraitFilenameInput && !slot.portraitFilenameInput.value) {
        slot.portraitFilenameInput.value = getPortraitFilenameAfterPreviewClear(slot);
      }
      updateCharacterPreviewSelectLabels();
      handleCharacterSourceChange(slot);
    }

    function registerCharacterSlotEvents(slot) {
      if (!slot || slot.eventsRegistered) return;
      slot.eventsRegistered = true;
      [slot.xInput, slot.yInput, slot.scaleInput].forEach((element) => {
        element?.addEventListener('change', () => {
          savePortraitLayoutState(getCharacterPortraitLayoutKey(slot), slot);
          requestCommittedPreviewUpdate({ server: false });
        });
        element?.addEventListener('input', () => {
          applyImmediatePreviewUpdate({ portraitSlot: slot });
        });
      });
      slot.enabledInput?.addEventListener('change', () => {
        updateVisibilityIcon(slot.enabledInput);
        updatePreviewSources();
        renderScenePreviewLayers();
        saveSceneState();
      });
      slot.cacheKeyInput?.addEventListener('change', () => {
        handleCharacterPreviewSelectChange(slot);
      });
      slot.layer?.addEventListener('load', renderScenePreviewLayers);
      slot.onCommit = () => savePortraitLayoutState(getCharacterPortraitLayoutKey(slot), slot);
      slot.syncPreviewLayoutPosition = () => {};
      slot.layer?.addEventListener('pointerdown', (event) => beginPreviewObjectDrag(slot, event));
      slot.layer?.addEventListener('pointermove', updatePreviewObjectDrag);
      slot.layer?.addEventListener('pointerup', endPreviewObjectDrag);
      slot.layer?.addEventListener('pointercancel', endPreviewObjectDrag);
    }

    function getTextSlotForInput(element) {
      return textSettingSlots.find((slot) => (
        element === slot.valueInput ||
        element === slot.enabledInput ||
        element === slot.fontInput ||
        element === slot.sizeInput ||
        element === slot.strokeEnabledInput ||
        element === slot.strokeWidthInput ||
        element === slot.colorInput ||
        element === slot.strokeColorInput ||
        element === slot.debugInput ||
        element === slot.xInput ||
        element === slot.yInput
      )) || null;
    }

    function registerTextSlotEvents(slot) {
      if (!slot || slot.eventsRegistered) return;
      slot.eventsRegistered = true;
      [slot.colorInput, slot.strokeColorInput, slot.xInput, slot.yInput].forEach((element) => {
        element?.addEventListener('change', () => {
          markPreviewInputsChanged();
          requestCommittedPreviewUpdate();
        });
        element?.addEventListener('input', () => {
          markPreviewInputsChanged();
          applyImmediateTextInputUpdate(element);
          saveSceneState();
          scheduleScenePreview();
        });
      });
      [slot.valueInput, slot.sizeInput, slot.strokeWidthInput].forEach((element) => {
        element?.addEventListener('change', () => {
          markPreviewInputsChanged();
          requestCommittedPreviewUpdate();
        });
        element?.addEventListener('input', () => {
          markPreviewInputsChanged();
          applyImmediateTextInputUpdate(element);
          saveSceneState();
          scheduleScenePreview();
        });
      });
      slot.enabledInput?.addEventListener('change', () => {
        markPreviewInputsChanged();
        updateVisibilityIcon(slot.enabledInput);
        applyImmediateTextInputUpdate(slot.enabledInput);
        saveSceneState();
        if (slot.enabledInput.checked) {
          scheduleScenePreview();
        }
      });
      slot.strokeEnabledInput?.addEventListener('change', () => {
        markPreviewInputsChanged();
        applyImmediateTextInputUpdate(slot.strokeEnabledInput);
        saveSceneState();
        scheduleScenePreview();
      });
      slot.debugInput?.addEventListener('change', () => {
        renderScenePreviewLayers();
        saveSceneState();
      });
      slot.fontInput?.addEventListener('change', async () => {
        markPreviewInputsChanged();
        applyImmediateTextInputUpdate(slot.fontInput);
        const inputRevision = previewInputRevision;
        saveSceneState();
        scheduleScenePreview();
        if (slot.fontInput.value) {
          try {
            await ensurePreviewFont(slot.fontInput.value);
          } catch {
            // The settled server preview still resolves the fallback font.
          }
        }
        if (inputRevision === previewInputRevision) {
          applyImmediateTextInputUpdate(slot.fontInput);
        }
      });
      slot.dragTarget = buildTextDragSlot(slot.key, slot.layerId, slot.xInput, slot.yInput, slot.layer);
      slot.layer?.addEventListener('pointerdown', (event) => beginPreviewObjectDrag(slot.dragTarget, event));
      slot.layer?.addEventListener('pointermove', updatePreviewObjectDrag);
      slot.layer?.addEventListener('pointerup', endPreviewObjectDrag);
      slot.layer?.addEventListener('pointercancel', endPreviewObjectDrag);
    }

    function addCharacterSlot({ save = true } = {}) {
      const nextSlotNumber = Math.max(...characterSlots.map((slot) => slot.slot)) + 1;
      const slot = buildCharacterSlotDef(nextSlotNumber);
      slot.layer = createCharacterPreviewLayer(slot);
      characterSlotDefs.push(slot);
      defaultLayerOrder.push(slot.layerId);
      currentLayerOrder.push(slot.layerId);
      defaultSectionOpenState[slot.layerId] = true;
      currentLayerLocks[slot.layerId] = false;

      const block = createCharacterSlotBlock(slot);
      document.getElementById('character-slots-container')?.appendChild(block);
      bindCharacterSlotDomRefs(slot);
      registerCharacterSlotEvents(slot);
      registerSectionToggle(block.querySelector('[data-settings-toggle]'));
      applyStoredSectionOpenState(slot.layerId);
      updateVisibilityIcon(slot.enabledInput);
      updateLayerOrderInput();
      initializeLayerOrderDrag();
      initializeLayerMoveControls();
      initializeLayerLockControls();
      updateLayerLockControls();
      applyLayerOrderToPreviewDom();
      if (save) {
        saveSceneState();
      }
      updateCharacterSlotControls();
    }

    function removeLastCharacterSlot({ save = true } = {}) {
      if (characterSlots.length <= minimumCharacterSlotCount) return;
      const slot = characterSlots[characterSlots.length - 1];
      const layerId = slot.layerId;

      if (save) {
        savePortraitLayoutState(getCharacterPortraitLayoutKey(slot), slot);
      }
      document
        .querySelector(`.settings-block[data-layer-id="${layerId}"]`)
        ?.remove();
      slot.layer?.remove();
      characterSlots.pop();

      const defaultIndex = defaultLayerOrder.indexOf(layerId);
      if (defaultIndex >= 0) {
        defaultLayerOrder.splice(defaultIndex, 1);
      }
      currentLayerOrder = currentLayerOrder.filter((id) => id !== layerId);
      delete currentLayerLocks[layerId];
      delete defaultSectionOpenState[layerId];
      if (activeLayerId === layerId) {
        activeLayerId = characterSlots[characterSlots.length - 1]?.layerId || '';
      }

      updateLayerOrderInput();
      updateLayerLockControls();
      applyLayerOrderToPreviewDom();
      updateCurrentSourceLabel();
      renderScenePreviewLayers();
      if (save) {
        saveSceneState();
      }
      updateCharacterSlotControls();
    }

    function addTextSlot({ save = true } = {}) {
      const nextSlotNumber = Math.max(...textSettingSlots.map((slot) => slot.slot)) + 1;
      const slot = buildTextSlot(nextSlotNumber);
      createTextPreviewLayer(slot);
      textSettingSlots.push(slot);
      defaultLayerOrder.push(slot.layerId);
      currentLayerOrder.push(slot.layerId);
      defaultSectionOpenState[slot.layerId] = true;
      currentLayerLocks[slot.layerId] = false;

      const block = createTextSlotBlock(slot);
      sceneForm?.insertBefore(block, sceneLayerListEnd || addTextSlotButton);
      bindTextSlotDomRefs(slot);
      registerTextSlotEvents(slot);
      registerSectionToggle(block.querySelector('[data-settings-toggle]'));
      applyStoredSectionOpenState(slot.layerId);
      updateVisibilityIcon(slot.enabledInput);
      updateLayerOrderInput();
      initializeLayerOrderDrag();
      initializeLayerMoveControls();
      initializeLayerLockControls();
      updateLayerLockControls();
      applyLayerOrderToSettingsBlocks();
      applyLayerOrderToPreviewDom();
      if (save) {
        saveSceneState();
      }
      updateTextSlotControls();
    }

    function removeLastTextSlot({ save = true } = {}) {
      if (textSettingSlots.length <= minimumTextSlotCount) return;
      const slot = textSettingSlots[textSettingSlots.length - 1];
      const layerId = slot.layerId;

      document
        .querySelector(`.settings-block[data-layer-id="${layerId}"]`)
        ?.remove();
      slot.layer?.remove();
      textSettingSlots.pop();

      const defaultIndex = defaultLayerOrder.indexOf(layerId);
      if (defaultIndex >= 0) {
        defaultLayerOrder.splice(defaultIndex, 1);
      }
      currentLayerOrder = currentLayerOrder.filter((id) => id !== layerId);
      delete currentLayerLocks[layerId];
      delete defaultSectionOpenState[layerId];
      if (latestPreviewLayout) {
        delete latestPreviewLayout[slot.key];
      }
      if (activeLayerId === layerId) {
        activeLayerId = textSettingSlots[textSettingSlots.length - 1]?.layerId || '';
      }

      updateLayerOrderInput();
      updateLayerLockControls();
      applyLayerOrderToPreviewDom();
      renderScenePreviewLayers();
      if (save) {
        saveSceneState();
        scheduleScenePreview();
      }
      updateTextSlotControls();
    }

    baseImageInput?.addEventListener('change', async () => {
      const baseFile = baseImageInput.files?.[0];
      if (!baseFile) return;

      if (baseImageNameInput) {
        baseImageNameInput.value = '';
      }
      if (baseImageDisplayNameInput) {
        baseImageDisplayNameInput.value = baseFile.name || '';
      }
      restoredBaseImageUrl = '';
      updateBaseImageSourceLabel();
      updatePreviewSources();
      renderScenePreviewLayers();
      saveSceneState();
      try {
        await saveLatestSceneBaseImageBlob(baseFile);
      } catch {
        // IndexedDB restore is optional; server upload still proceeds.
      }

      try {
        showSceneStatus('ベース画像を保存中...', 'loading');
        await uploadSceneBaseImage(baseFile);
        showSceneStatus('');
        updateBaseImageSourceLabel();
        scheduleScenePreview();
      } catch (error) {
        showSceneStatus(error.message || 'ベース画像の保存に失敗しました。', 'error');
      }
    });
    backgroundPickerToggle?.addEventListener('click', () => {
      backgroundPicker?.classList.toggle('is-hidden');
    });
    backgroundPicker?.addEventListener('click', (event) => {
      const item = event.target.closest('[data-background-filename]');
      if (!item) return;
      selectBackgroundImage(item.dataset.backgroundFilename || '', item.dataset.backgroundUrl || '');
      backgroundPicker.classList.add('is-hidden');
    });
    addCharacterSlotButton?.addEventListener('click', () => addCharacterSlot());
    removeCharacterSlotButton?.addEventListener('click', () => removeLastCharacterSlot());
    addTextSlotButton?.addEventListener('click', () => addTextSlot());
    removeTextSlotButton?.addEventListener('click', () => removeLastTextSlot());
    sceneForm?.addEventListener('pointerdown', (event) => {
      const block = event.target.closest('.settings-block[data-layer-id]');
      if (!block || !sceneForm.contains(block)) return;
      setActiveLayer(block.dataset.layerId);
    });
    previewCanvas?.addEventListener('pointerdown', beginSelectedPreviewObjectDrag, { capture: true });
    baseLayer?.addEventListener('load', renderScenePreviewLayers);
    bubbleOverlayLayer?.addEventListener('load', renderScenePreviewLayers);
    window.addEventListener('resize', renderScenePreviewLayers);
    function buildTextDragSlot(slotName, layerId, xInput, yInput, layer) {
      return {
        slot: slotName,
        layerId,
        xInput,
        yInput,
        layer,
        onCommit() {},
        syncPreviewLayoutPosition(x, y) {
          const textLayout = latestPreviewLayout?.[slotName];
          const textBoxRect = textLayout?.text_box_rect;
          const textOrigin = textLayout?.text_origin;
          if (!textBoxRect || !textOrigin) return;
          const offsetX = textOrigin.x - textBoxRect.x;
          const offsetY = textOrigin.y - textBoxRect.y;
          textBoxRect.x = Math.round(x * previewScaleFactor);
          textBoxRect.y = Math.round(y * previewScaleFactor);
          textOrigin.x = textBoxRect.x + offsetX;
          textOrigin.y = textBoxRect.y + offsetY;
        },
      };
    }
    const overlayDragTarget = {
      slot: 'overlay',
      layerId: 'overlay_image',
      xInput: bubbleOverlayXInput,
      yInput: bubbleOverlayYInput,
      layer: bubbleOverlayLayer,
      onCommit() {},
      syncPreviewLayoutPosition(x, y) {
        const bubbleOverlayLayout = latestPreviewLayout?.bubble_overlay;
        if (!bubbleOverlayLayout) return;
        bubbleOverlayLayout.x = Math.round(x * previewScaleFactor);
        bubbleOverlayLayout.y = Math.round(y * previewScaleFactor);
      },
      syncPreviewLayoutSize(width, height) {
        const bubbleOverlayLayout = latestPreviewLayout?.bubble_overlay;
        if (!bubbleOverlayLayout) return;
        bubbleOverlayLayout.width = Math.round(width * previewScaleFactor);
        bubbleOverlayLayout.height = Math.round(height * previewScaleFactor);
      },
    };
    bubbleOverlayLayer?.addEventListener('pointerdown', (event) => beginPreviewObjectDrag(overlayDragTarget, event));
    bubbleOverlayLayer?.addEventListener('pointermove', updatePreviewObjectDrag);
    bubbleOverlayLayer?.addEventListener('pointerup', endPreviewObjectDrag);
    bubbleOverlayLayer?.addEventListener('pointercancel', endPreviewObjectDrag);
    bubbleOverlayResizeHandleRight?.addEventListener('pointerdown', (event) => beginOverlayResize('x', event));
    bubbleOverlayResizeHandleRight?.addEventListener('pointermove', updateOverlayResize);
    bubbleOverlayResizeHandleRight?.addEventListener('pointerup', endOverlayResize);
    bubbleOverlayResizeHandleRight?.addEventListener('pointercancel', endOverlayResize);
    bubbleOverlayResizeHandleBottom?.addEventListener('pointerdown', (event) => beginOverlayResize('y', event));
    bubbleOverlayResizeHandleBottom?.addEventListener('pointermove', updateOverlayResize);
    bubbleOverlayResizeHandleBottom?.addEventListener('pointerup', endOverlayResize);
    bubbleOverlayResizeHandleBottom?.addEventListener('pointercancel', endOverlayResize);
    sceneStage?.addEventListener('pointerdown', beginBaseDrag);
    sceneStage?.addEventListener('pointermove', updateBaseDrag);
    sceneStage?.addEventListener('pointerup', endBaseDrag);
    sceneStage?.addEventListener('pointercancel', endBaseDrag);
    async function initializeScenePage() {
      currentLayerOrderMode = loadLayerOrderMode();
      currentLayerLocks = normalizeLayerLocks(currentLayerLocks);
      initializeLayerOrderDrag();
      initializeLayerMoveControls();
      initializeLayerHeaderLabels();
      initializeLayerLockControls();
      updateVisibilityIcons();
      updateLayerOrderInput();
      applyLayerOrderToPreviewDom();
      initializeSectionToggles();
      await loadFontOptions();
      applyStoredSceneState();
      for (const slot of textSettingSlots) {
        if (slot.fontInput?.value) {
          try {
            await ensurePreviewFont(slot.fontInput.value);
          } catch {
            // Server-rendered preview still uses the selected font when available.
          }
        }
      }
      await restoreIndexedDbBaseImage();
      updateOverlaySourcePanels();
      updatePreviewSources();
      renderScenePreviewLayers();
      await runInitialScenePreview();
      followPendingComposeReflect();
      updateCurrentSourceLabel();
      updateBaseImageSourceLabel();
      updateCharacterSlotControls();
      updateTextSlotControls();
      saveSceneState();
    }

    document.querySelectorAll('.section-visible-toggle input[type="checkbox"]').forEach((input) => {
      input.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    });
    document.querySelectorAll('.section-visible-toggle').forEach((label) => {
      label.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeScenePage, { once: true });
    } else {
      initializeScenePage();
    }
