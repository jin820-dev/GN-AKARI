    const sceneBootstrap = window.sceneBootstrap || {};
    const canvasPresets = sceneBootstrap.canvasPresets || {};
    const bubbleOverlayAssets = sceneBootstrap.bubbleOverlayAssets || {};
    const previewScaleFactor = 0.5;

    // Scene state: initialPortraitFilename is a one-time URL seed; lastSelectedPortraitFilename is kept separately from the active source.
    let initialPortraitFilename = sceneBootstrap.initialPortraitFilename || '';
    let initialPortraitSlot = sceneBootstrap.initialPortraitSlot === 2 ? 2 : 1;
    let lastSelectedPortraitFilename = '';
    let lastSelectedCharacter2PortraitFilename = '';
    const sceneStorageKey = 'gn_akari_scene_state';
    const portraitLayoutStorageKey = 'gn_akari_scene_portrait_layouts';
    const sceneUiStateStorageKey = 'gn_akari_scene_ui_state';
    const layerOrderModeStorageKey = 'gn_akari_layer_order_mode';
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
    const baseLayer = document.getElementById('base-layer');
    const messageBandLayer = document.getElementById('message-band-layer');
    const portraitLayer = document.getElementById('portrait-layer');
    const portraitLayer2 = document.getElementById('portrait-layer-2');
    const bubbleOverlayLayer = document.getElementById('bubble-overlay-layer');
    const bubbleOverlayResizeHandleRight = document.getElementById('bubble-overlay-resize-handle-right');
    const bubbleOverlayResizeHandleBottom = document.getElementById('bubble-overlay-resize-handle-bottom');
    const textLayer = document.getElementById('text-layer');
    const textLayer2 = document.getElementById('text-layer-2');
    const bubbleDebugRect = document.getElementById('bubble-debug-rect');
    const textBoxDebugRect = document.getElementById('text-box-debug-rect');
    const textBoxDebugRect2 = document.getElementById('text-box-debug-rect-2');
    const textContentBox = document.getElementById('text-content-box');
    const textContentBox2 = document.getElementById('text-content-box-2');
    const textContent = document.getElementById('text-content');
    const textContent2 = document.getElementById('text-content-2');
    const sceneEmpty = document.getElementById('scene-empty');
    const sceneLink = document.getElementById('scene-link');
    const sceneLinkRow = document.getElementById('scene-link-row');
    const baseImageInput = document.getElementById('base-image');
    const baseImageSource = document.getElementById('base-image-source');
    const baseImageNameInput = document.getElementById('base-image-name');
    const baseImageDisplayNameInput = document.getElementById('base-image-display-name');
    const baseFitModeSelect = document.getElementById('base-fit-mode');
    const baseScaleInput = document.getElementById('base-scale');
    const baseXInput = document.getElementById('base-x');
    const baseYInput = document.getElementById('base-y');
    const canvasPresetSelect = document.getElementById('canvas-preset');
    const characterSlotDefs = [
      {
        slot: 1,
        layerId: 'character1',
        enabledInput: document.getElementById('character1-enabled'),
        cacheKeyInput: document.getElementById('cache-key'),
        portraitFilenameInput: document.getElementById('portrait-filename'),
        xInput: document.getElementById('position-x'),
        yInput: document.getElementById('position-y'),
        scaleInput: document.getElementById('scale'),
        layer: portraitLayer,
      },
      {
        slot: 2,
        layerId: 'character2',
        enabledInput: document.getElementById('character2-enabled'),
        cacheKeyInput: document.getElementById('character2-cache-key'),
        portraitFilenameInput: document.getElementById('character2-portrait-filename'),
        xInput: document.getElementById('character2-x'),
        yInput: document.getElementById('character2-y'),
        scaleInput: document.getElementById('character2-scale'),
        layer: portraitLayer2,
      },
    ];
    const character1SlotDef = characterSlotDefs[0];
    const character2SlotDef = characterSlotDefs[1];
    const character1EnabledInput = character1SlotDef.enabledInput;
    const cacheKeySelect = character1SlotDef.cacheKeyInput;
    const portraitFilenameInput = character1SlotDef.portraitFilenameInput;
    const positionXInput = character1SlotDef.xInput;
    const positionYInput = character1SlotDef.yInput;
    const scaleInput = character1SlotDef.scaleInput;
    const character2EnabledInput = character2SlotDef.enabledInput;
    const character2CacheKeySelect = character2SlotDef.cacheKeyInput;
    const character2PortraitFilenameInput = character2SlotDef.portraitFilenameInput;
    const character2XInput = character2SlotDef.xInput;
    const character2YInput = character2SlotDef.yInput;
    const character2ScaleInput = character2SlotDef.scaleInput;
    const textEnabledInput = document.getElementById('text-enabled');
    const textValueInput = document.getElementById('text-value');
    const textFontSelect = document.getElementById('text-font');
    const textSizeInput = document.getElementById('text-size');
    const textColorInput = document.getElementById('text-color');
    const textStrokeEnabledInput = document.getElementById('text-stroke-enabled');
    const textDebugLayoutInput = document.getElementById('text-debug-layout');
    const textStrokeColorInput = document.getElementById('text-stroke-color');
    const textStrokeWidthInput = document.getElementById('text-stroke-width');
    const textXInput = document.getElementById('text-x');
    const textYInput = document.getElementById('text-y');
    const text2EnabledInput = document.getElementById('text2-enabled');
    const text2ValueInput = document.getElementById('text2-value');
    const text2FontSelect = document.getElementById('text2-font');
    const text2SizeInput = document.getElementById('text2-size');
    const text2ColorInput = document.getElementById('text2-color');
    const text2StrokeEnabledInput = document.getElementById('text2-stroke-enabled');
    const text2StrokeColorInput = document.getElementById('text2-stroke-color');
    const text2StrokeWidthInput = document.getElementById('text2-stroke-width');
    const text2XInput = document.getElementById('text2-x');
    const text2YInput = document.getElementById('text2-y');
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
    let baseDragState = null;
    let previewObjectDragState = null;
    let overlayResizeState = null;
    let baseObjectUrl = null;
    let restoredBaseImageUrl = '';
    let indexedDbBaseImageBlob = null;
    let activePortraitLayoutKey = '';
    let activeCharacter2PortraitLayoutKey = '';
    let sceneBaseImageDbPromise = null;
    let latestPreviewLayout = null;
    let lastBubbleOverlayAssetValue = bubbleOverlayAssetInput?.value || '';
    const defaultLayerOrder = ['base_image', 'message_band', 'character1', 'character2', 'overlay_image', 'text2', 'text1'];
    let currentLayerOrder = [...defaultLayerOrder];
    let currentLayerOrderMode = 'aviutl';
    let currentLayerLocks = {};
    const loadedPreviewFonts = new Set();
    const defaultSectionOpenState = {
      base: true,
      canvas: false,
      character1: true,
      character2: false,
      text: true,
      text2: true,
      'message-band': true,
      overlay: true,
    };
    const characterSlots = characterSlotDefs;

    function getLastSelectedPortrait(slot) {
      return slot?.slot === 2 ? lastSelectedCharacter2PortraitFilename : lastSelectedPortraitFilename;
    }

    function setLastSelectedPortrait(slot, filename) {
      if (slot?.slot === 2) {
        lastSelectedCharacter2PortraitFilename = filename || '';
      } else {
        lastSelectedPortraitFilename = filename || '';
      }
    }

    const textSettingSlots = [
      {
        key: 'text',
        enabledInput: textEnabledInput,
        valueInput: textValueInput,
        fontInput: textFontSelect,
        sizeInput: textSizeInput,
        colorInput: textColorInput,
        strokeEnabledInput: textStrokeEnabledInput,
        strokeColorInput: textStrokeColorInput,
        strokeWidthInput: textStrokeWidthInput,
        xInput: textXInput,
        yInput: textYInput,
        defaultX: '0',
        defaultY: '0',
        defaultSize: '32',
      },
      {
        key: 'text2',
        enabledInput: text2EnabledInput,
        valueInput: text2ValueInput,
        fontInput: text2FontSelect,
        sizeInput: text2SizeInput,
        colorInput: text2ColorInput,
        strokeEnabledInput: text2StrokeEnabledInput,
        strokeColorInput: text2StrokeColorInput,
        strokeWidthInput: text2StrokeWidthInput,
        xInput: text2XInput,
        yInput: text2YInput,
        defaultX: '100',
        defaultY: '100',
        defaultSize: '64',
      },
    ];

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

    function applyLayerOrderToSettingsBlocks() {
      if (!sceneForm) return;
      const saveButton = sceneForm.querySelector('button[type="submit"]');
      currentLayerOrder.forEach((layerId) => {
        const block = getLayerBlock(layerId);
        if (block && saveButton) {
          sceneForm.insertBefore(block, saveButton);
        }
      });
    }

    function updateLayerOrderFromSettingsBlocks() {
      currentLayerOrder = normalizeLayerOrder(
        Array.from(sceneForm?.querySelectorAll('.settings-block[data-layer-id]') || [])
          .map((block) => block.dataset.layerId),
      );
      updateLayerOrderInput();
    }

    function moveLayerOrder(layerId, direction) {
      currentLayerOrder = normalizeLayerOrder(currentLayerOrder);
      const currentIndex = currentLayerOrder.indexOf(layerId);
      if (currentIndex < 0) return;
      const offset = currentLayerOrderMode === 'after_effects'
        ? (direction === 'front' ? -1 : 1)
        : (direction === 'front' ? 1 : -1);
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
        character1: [portraitLayer],
        character2: [portraitLayer2],
        overlay_image: [bubbleOverlayLayer, bubbleOverlayResizeHandleRight, bubbleOverlayResizeHandleBottom, bubbleDebugRect],
        text2: [textLayer2],
        text1: [textLayer],
      };
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
          node.style.zIndex = String((index + 1) * 10);
        });
      });
      updateLayerLockControls();
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
        slot.fontInput.value = textState.font;
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
      const storedPortraitFilename = slot.slot === 2
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
      if (slot.slot === 2) {
        return {
          character2_enabled: slot.enabledInput?.checked ? '1' : '0',
          character2_cache_key: slot.cacheKeyInput?.value || '',
          character2_portrait_filename: slot.portraitFilenameInput?.value || '',
          character2_last_selected_portrait_filename: getLastSelectedPortrait(slot) || '',
          character2_x: slot.xInput?.value || '0',
          character2_y: slot.yInput?.value || '0',
          character2_scale: slot.scaleInput?.value || '100',
        };
      }
      return {
        character1_enabled: slot.enabledInput?.checked ? '1' : '0',
        cache_key: slot.cacheKeyInput?.value || '',
        portrait_filename: slot.portraitFilenameInput?.value || '',
        last_selected_portrait_filename: getLastSelectedPortrait(slot) || '',
        scale: slot.scaleInput?.value || '100',
        x: slot.xInput?.value || '0',
        y: slot.yInput?.value || '0',
      };
    }

    function applyCharacterState(slot, stored) {
      if (slot.slot === 2) {
        const storedPortraitFilename = stored.character2_portrait_filename || '';
        const storedLastPortraitFilename = stored.character2_last_selected_portrait_filename
          || storedPortraitFilename
          || '';
        const storedCacheKey = stored.character2_cache_key || '';
        setLastSelectedPortrait(slot, storedLastPortraitFilename);
        if (slot.enabledInput) {
          slot.enabledInput.checked = stored.character2_enabled === '1';
          updateVisibilityIcon(slot.enabledInput);
        }
        if (slot.cacheKeyInput) {
          slot.cacheKeyInput.value = storedPortraitFilename ? '' : storedCacheKey;
          if (storedLastPortraitFilename) {
            slot.cacheKeyInput.dataset.portraitFilename = storedLastPortraitFilename;
          }
        }
        if (slot.portraitFilenameInput && storedPortraitFilename) {
          slot.portraitFilenameInput.value = storedPortraitFilename;
        }
        normalizeCharacterSourceState(slot, storedPortraitFilename ? 'portrait' : 'preview');
        if (slot.xInput && stored.character2_x) {
          slot.xInput.value = stored.character2_x;
        }
        if (slot.yInput && stored.character2_y) {
          slot.yInput.value = stored.character2_y;
        }
        if (slot.scaleInput && stored.character2_scale) {
          slot.scaleInput.value = stored.character2_scale;
        }
        return;
      }

      const storedPortraitFilename = stored.portrait_filename || '';
      const storedCacheKey = stored.cache_key || '';
      setLastSelectedPortrait(slot, stored.last_selected_portrait_filename || storedPortraitFilename || '');
      if (storedPortraitFilename && slot.portraitFilenameInput) {
        slot.portraitFilenameInput.value = storedPortraitFilename;
      }
      if (slot.enabledInput) {
        slot.enabledInput.checked = stored.character1_enabled !== '0';
        updateVisibilityIcon(slot.enabledInput);
      }
      if (slot.cacheKeyInput) {
        slot.cacheKeyInput.value = storedPortraitFilename ? '' : storedCacheKey;
      }
      normalizeCharacterSourceState(slot, storedPortraitFilename ? 'portrait' : 'preview');
      if (slot.scaleInput && stored.scale) {
        slot.scaleInput.value = stored.scale;
      }
      if (slot.xInput && stored.x) {
        slot.xInput.value = stored.x;
      }
      if (slot.yInput && stored.y) {
        slot.yInput.value = stored.y;
      }
    }

    function buildSceneStatePayload() {
      normalizeCharacterSourceState(character1SlotDef);
      normalizeCharacterSourceState(character2SlotDef);
      return {
        ...buildCharacterState(character1SlotDef),
        ...buildCharacterState(character2SlotDef),
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
        text: buildTextState(textSettingSlots[0]),
        text2: buildTextState(textSettingSlots[1]),
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

    function commitInitialPortraitSelection() {
      if (!initialPortraitFilename) return;
      if (initialPortraitSlot === 2) {
        setLastSelectedPortrait(character2SlotDef, initialPortraitFilename);
        if (character2PortraitFilenameInput) {
          character2PortraitFilenameInput.value = initialPortraitFilename;
        }
        if (character2CacheKeySelect) {
          character2CacheKeySelect.value = '';
        }
        if (character2EnabledInput) {
          character2EnabledInput.checked = true;
          updateVisibilityIcon(character2EnabledInput);
        }
        normalizeCharacterSourceState(character2SlotDef, 'portrait');
        updateCharacterPreviewSelectLabels();
        saveSceneState();
        clearInitialPortraitSeed();
        return;
      }
      setLastSelectedPortrait(character1SlotDef, initialPortraitFilename);
      if (portraitFilenameInput) {
        portraitFilenameInput.value = initialPortraitFilename;
      }
      if (cacheKeySelect) {
        cacheKeySelect.value = '';
      }
      if (character1EnabledInput) {
        character1EnabledInput.checked = true;
        updateVisibilityIcon(character1EnabledInput);
      }
      normalizeCharacterSourceState(character1SlotDef, 'portrait');
      updateCharacterPreviewSelectLabels();
      saveSceneState();
      clearInitialPortraitSeed();
    }

    function applyStoredSceneState() {
      const stored = loadSceneState();
      if (!stored) {
        commitInitialPortraitSelection();
        return;
      }

      applyCharacterState(character1SlotDef, stored);
      applyCharacterState(character2SlotDef, stored);
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
      const text = stored.text || {};
      applyStoredTextState(textSettingSlots[0], text, { enabledDefault: true });
      applyStoredTextState(textSettingSlots[1], stored.text2 || {}, { enabledDefault: false });
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
        return slot.slot === 1 ? cacheLayoutKey : `character2:${cacheLayoutKey}`;
      }
      const portraitFilename = slot.portraitFilenameInput?.value
        || (slot.slot === 1 ? getLastSelectedPortrait(slot) : slot.cacheKeyInput?.dataset.portraitFilename)
        || '';
      if (portraitFilename) {
        return slot.slot === 1 ? portraitFilename : `character2:${portraitFilename}`;
      }
      return '';
    }

    function getCharacter1PortraitLayoutKey() {
      return getCharacterPortraitLayoutKey(characterSlots[0]);
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

    function initializeSectionToggles() {
      const uiState = loadSceneUiState();
      Object.entries(defaultSectionOpenState).forEach(([sectionKey, defaultOpen]) => {
        const isOpen = uiState[sectionKey] ?? defaultOpen;
        applySectionOpenState(sectionKey, isOpen);
      });

      document.querySelectorAll('[data-settings-toggle]').forEach((toggle) => {
        toggle.addEventListener('click', () => {
          const sectionKey = toggle.dataset.settingsToggle;
          if (!sectionKey) return;
          const nextState = loadSceneUiState();
          const currentOpen = nextState[sectionKey] ?? defaultSectionOpenState[sectionKey] ?? true;
          nextState[sectionKey] = !currentOpen;
          saveSceneUiState(nextState);
          applySectionOpenState(sectionKey, !currentOpen);
        });
      });
    }

    function savePortraitLayoutState(layoutKey = getCharacter1PortraitLayoutKey(), slot = characterSlots[0]) {
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
      const activeKey = slot.slot === 1 ? activePortraitLayoutKey : activeCharacter2PortraitLayoutKey;
      if (!portraitFilename) {
        if (slot.slot === 1) {
          activePortraitLayoutKey = '';
        } else {
          activeCharacter2PortraitLayoutKey = '';
        }
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
      if (slot.slot === 1) {
        activePortraitLayoutKey = portraitFilename;
      } else {
        activeCharacter2PortraitLayoutKey = portraitFilename;
      }
    }

    function applyPortraitLayoutState() {
      characterSlots.forEach(applyPortraitLayoutStateForSlot);
    }

    function getServerBaseImageUrl() {
      if (restoredBaseImageUrl) {
        return restoredBaseImageUrl;
      }
      if (baseImageNameInput?.value) {
        return `/outputs/scene_base/${encodeURIComponent(baseImageNameInput.value)}`;
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
        [textFontSelect, text2FontSelect].forEach((fontSelect) => {
          const currentValue = fontSelect?.value || '';
          if (!fontSelect) return;
          fontSelect.innerHTML = '';
          const defaultOption = document.createElement('option');
          defaultOption.value = '';
          defaultOption.textContent = '既定フォント';
          fontSelect.appendChild(defaultOption);
          (data.items || []).forEach((item) => {
            const option = document.createElement('option');
            option.value = item.name;
            option.textContent = item.name;
            fontSelect.appendChild(option);
          });
          fontSelect.value = currentValue;
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
      formData.set('character1_enabled', character1EnabledInput?.checked ? '1' : '0');
      formData.set('character2_enabled', character2EnabledInput?.checked ? '1' : '0');
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
      if (baseObjectUrl) {
        URL.revokeObjectURL(baseObjectUrl);
        baseObjectUrl = null;
      }

      const baseFile = baseImageInput?.files?.[0];
      if (baseFile && baseLayer) {
        baseObjectUrl = URL.createObjectURL(baseFile);
        baseLayer.src = baseObjectUrl;
        baseLayer.classList.remove('is-hidden');
      } else if (baseLayer && getServerBaseImageUrl()) {
        const restoredUrl = getServerBaseImageUrl();
        baseLayer.src = `${restoredUrl}?t=${Date.now()}`;
        baseLayer.classList.remove('is-hidden');
      } else if (baseLayer && indexedDbBaseImageBlob) {
        baseObjectUrl = URL.createObjectURL(indexedDbBaseImageBlob);
        baseLayer.src = baseObjectUrl;
        baseLayer.classList.remove('is-hidden');
      } else if (baseLayer) {
        baseLayer.removeAttribute('src');
        baseLayer.classList.add('is-hidden');
      }

      characterSlots.forEach((slot) => {
        const activePortraitUrl = getCharacterActiveUrl(slot);
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
        content.style.removeProperty('text-align');
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

    function renderTextPreviewLayer({
      layout,
      layer,
      content,
      contentBox,
      debugRect,
      debugVisible,
      colorInput,
      strokeEnabledInput,
      strokeColorInput,
      fontInput,
    }) {
      if (!layout || !layer || !content || !contentBox) {
        clearTextPreviewLayer({ layer, content, contentBox, debugRect });
        return;
      }

      const textBoxRect = layout.text_box_rect || null;
      const layerLeft = textBoxRect?.x || 0;
      const layerTop = textBoxRect?.y || 0;
      const layerWidth = textBoxRect?.width || 0;
      const layerHeight = textBoxRect?.height || 0;
      layer.style.left = `${layerLeft}px`;
      layer.style.top = `${layerTop}px`;
      layer.style.width = `${layerWidth}px`;
      layer.style.height = `${layerHeight}px`;
      content.textContent = layout.wrapped_text || '';
      content.style.fontSize = `${layout.text_size || 16}px`;
      content.style.lineHeight = `${(layout.text_size || 16) + (layout.line_spacing || 0)}px`;
      content.style.color = colorInput?.value || '#ffffff';
      content.style.textShadow = strokeEnabledInput?.checked ? buildPreviewTextShadow(layout.stroke_width || 0, strokeColorInput?.value || '#000000') : 'none';
      content.style.fontFamily = fontInput?.value ? `"${buildPreviewFontFamily(fontInput.value)}", sans-serif` : '';
      content.style.textAlign = layout.text_align || 'left';
      if (textBoxRect) {
        setDebugRect(debugRect, textBoxRect, debugVisible, layerLeft, layerTop);
        contentBox.style.position = 'absolute';
        contentBox.style.left = '0px';
        contentBox.style.top = '0px';
        contentBox.style.width = `${textBoxRect.width}px`;
        contentBox.style.height = `${textBoxRect.height}px`;
      }
      layer.classList.remove('is-hidden');
    }

    function renderMessageBandPreviewLayer() {
      const layout = messageBandEnabledInput?.checked ? latestPreviewLayout?.message_band || null : null;
      if (!messageBandLayer || !layout) {
        messageBandLayer?.classList.add('is-hidden');
        return;
      }
      setLayerRect(messageBandLayer, layout.x, layout.y, layout.width, layout.height);
      messageBandLayer.style.background = buildPreviewRgba(layout.color || '#000000', layout.opacity || 0);
      messageBandLayer.classList.remove('is-hidden');
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
      if (!previewCanvas || !sceneStage || !sceneEmpty || !baseLayer || !textLayer) return;
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

      const debugVisible = Boolean(textDebugLayoutInput?.checked);
      const bubbleOverlayLayout = bubbleOverlayEnabledInput?.checked ? latestPreviewLayout?.bubble_overlay || null : null;
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
          bubbleOverlayLayer.src = bubbleOverlayLayout.source_type === 'file'
            ? `/data/src/${encodeURIComponent(bubbleOverlayLayout.upload_file)}?t=${Date.now()}`
            : bubbleOverlayLayout.image_url
              ? `${bubbleOverlayLayout.image_url}?t=${Date.now()}`
              : bubbleAsset?.file || '';
          bubbleOverlayLayer.classList.remove('is-hidden');
          bubbleOverlayLayer.classList.add('preview-overlay-layer--interactive');
          bubbleOverlayResizeHandleRight?.classList.add('is-visible');
          bubbleOverlayResizeHandleBottom?.classList.add('is-visible');
          setOverlayResizeHandlePosition(overlayLeft, overlayTop, overlayWidth, overlayHeight);
          setDebugRect(bubbleDebugRect, bubbleOverlayLayout, debugVisible);
        } else {
          bubbleOverlayLayer.removeAttribute('src');
          bubbleOverlayLayer.classList.add('is-hidden');
          bubbleOverlayLayer.classList.remove('preview-overlay-layer--interactive');
          bubbleOverlayResizeHandleRight?.classList.remove('is-visible');
          bubbleOverlayResizeHandleBottom?.classList.remove('is-visible');
          setDebugRect(bubbleDebugRect, null, false);
        }
      } else {
        if (bubbleOverlayLayer) {
          bubbleOverlayLayer.removeAttribute('src');
          bubbleOverlayLayer.classList.add('is-hidden');
          bubbleOverlayLayer.classList.remove('preview-overlay-layer--interactive');
        }
        bubbleOverlayResizeHandleRight?.classList.remove('is-visible');
        bubbleOverlayResizeHandleBottom?.classList.remove('is-visible');
        setDebugRect(bubbleDebugRect, null, false);
      }

      renderTextPreviewLayer({
        layout: text2EnabledInput?.checked ? latestPreviewLayout?.text2 || null : null,
        layer: textLayer2,
        content: textContent2,
        contentBox: textContentBox2,
        debugRect: textBoxDebugRect2,
        debugVisible,
        colorInput: text2ColorInput,
        strokeEnabledInput: text2StrokeEnabledInput,
        strokeColorInput: text2StrokeColorInput,
        fontInput: text2FontSelect,
      });
      renderTextPreviewLayer({
        layout: textEnabledInput?.checked ? latestPreviewLayout?.text || null : null,
        layer: textLayer,
        content: textContent,
        contentBox: textContentBox,
        debugRect: textBoxDebugRect,
        debugVisible,
        colorInput: textColorInput,
        strokeEnabledInput: textStrokeEnabledInput,
        strokeColorInput: textStrokeColorInput,
        fontInput: textFontSelect,
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
      target.layer.classList.add('is-dragging');
      target.layer.setPointerCapture(event.pointerId);
      event.stopPropagation();
      event.preventDefault();
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
      let draggingBlock = null;
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
          draggingBlock = block;
          block.classList.add('is-layer-dragging');
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', block.dataset.layerId || '');
        });
        handle.addEventListener('dragend', () => {
          draggingBlock?.classList.remove('is-layer-dragging');
          draggingBlock = null;
          updateLayerOrderFromSettingsBlocks();
          applyLayerOrderToPreviewDom();
          saveSceneState();
        });
        block.addEventListener('dragover', (event) => {
          if (!draggingBlock || draggingBlock === block) return;
          event.preventDefault();
          const rect = block.getBoundingClientRect();
          const isAfter = event.clientY > rect.top + rect.height / 2;
          sceneForm.insertBefore(draggingBlock, isAfter ? block.nextSibling : block);
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
        text1: 'テキスト1',
        text2: 'テキスト2',
        message_band: 'メッセージ帯',
        overlay_image: '画像オーバーレイ',
      };
      sceneForm?.querySelectorAll('.settings-block[data-layer-id]').forEach((block) => {
        const label = labels[block.dataset.layerId];
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

    async function runScenePreview(requestId) {
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
        if (requestId !== latestPreviewRequestId) return;
        if (!response.ok || !data.ok) {
          throw new Error(data.error || 'プレビュー更新に失敗しました。');
        }
        latestPreviewLayout = data.layout || null;
        renderScenePreviewLayers();
        showSceneStatus('');
        saveSceneState();
      } catch (error) {
        if (requestId !== latestPreviewRequestId) return;
        showSceneStatus(error.message || 'プレビュー更新に失敗しました。', 'error');
      }
    }

    function scheduleScenePreview() {
      if (previewTimer) {
        clearTimeout(previewTimer);
      }
      const requestId = ++latestPreviewRequestId;
      previewTimer = setTimeout(() => {
        runScenePreview(requestId);
      }, 400);
    }

    async function runInitialScenePreview() {
      if (previewTimer) {
        clearTimeout(previewTimer);
        previewTimer = null;
      }
      const requestId = ++latestPreviewRequestId;
      await runScenePreview(requestId);
    }

    function getCharacterSlotForLayoutInput(element) {
      return characterSlots.find((slot) => (
        element === slot.xInput || element === slot.yInput || element === slot.scaleInput
      )) || null;
    }

    function applyImmediatePreviewUpdate({ savePortrait = true, portraitSlot = characterSlots[0] } = {}) {
      syncImmediatePreviewLayoutFromInputs();
      renderScenePreviewLayers();
      if (savePortrait) {
        const layoutKey = portraitSlot.slot === 1
          ? getCharacter1PortraitLayoutKey()
          : getCharacterPortraitLayoutKey(portraitSlot);
        savePortraitLayoutState(layoutKey, portraitSlot);
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
      syncTextPreviewLayoutPosition('text', textXInput, textYInput);
      syncTextPreviewLayoutPosition('text2', text2XInput, text2YInput);
    }

    function applyImmediateTextInputUpdate(element) {
      if (element === textValueInput && textContent) {
        textContent.textContent = textValueInput.value || '';
      } else if (element === text2ValueInput && textContent2) {
        textContent2.textContent = text2ValueInput.value || '';
      } else if (element === textSizeInput && textContent) {
        textContent.style.fontSize = `${Number(textSizeInput.value || 32) * previewScaleFactor}px`;
      } else if (element === text2SizeInput && textContent2) {
        textContent2.style.fontSize = `${Number(text2SizeInput.value || 64) * previewScaleFactor}px`;
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
      positionXInput,
      positionYInput,
      scaleInput,
      character2XInput,
      character2YInput,
      character2ScaleInput,
      bubbleOverlayXInput,
      bubbleOverlayYInput,
      bubbleOverlayWidthInput,
      bubbleOverlayHeightInput,
      textColorInput,
      textStrokeColorInput,
      textXInput,
      textYInput,
      text2ColorInput,
      text2StrokeColorInput,
      text2XInput,
      text2YInput,
      messageBandXInput,
      messageBandYInput,
      messageBandWidthInput,
      messageBandHeightInput,
      messageBandColorInput,
      messageBandOpacityInput,
      textDebugLayoutInput,
    ];
    const committedPreviewInputs = [
      textValueInput,
      textSizeInput,
      textStrokeWidthInput,
      text2ValueInput,
      text2SizeInput,
      text2StrokeWidthInput,
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
        applyImmediatePreviewUpdate({ portraitSlot: getCharacterSlotForLayoutInput(element) || characterSlots[0] });
      });
    });
    committedPreviewInputs.forEach((element) => {
      element?.addEventListener('change', () => {
        requestCommittedPreviewUpdate();
      });
      element?.addEventListener('input', () => {
        applyImmediateTextInputUpdate(element);
        saveSceneState();
      });
    });

    [character1EnabledInput, character2EnabledInput].forEach((element) => {
      element?.addEventListener('change', () => {
        updateVisibilityIcon(element);
        updatePreviewSources();
        renderScenePreviewLayers();
        saveSceneState();
      });
    });
    textEnabledInput?.addEventListener('change', () => {
      updateVisibilityIcon(textEnabledInput);
      renderScenePreviewLayers();
      saveSceneState();
      if (textEnabledInput.checked && !latestPreviewLayout?.text) {
        scheduleScenePreview();
      }
    });
    text2EnabledInput?.addEventListener('change', () => {
      updateVisibilityIcon(text2EnabledInput);
      renderScenePreviewLayers();
      saveSceneState();
      if (text2EnabledInput.checked && !latestPreviewLayout?.text2) {
        scheduleScenePreview();
      }
    });
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
    [textStrokeEnabledInput, text2StrokeEnabledInput, messageBandEnabledInput].forEach((element) => {
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
    textFontSelect?.addEventListener('change', async () => {
      if (textFontSelect.value) {
        await ensurePreviewFont(textFontSelect.value);
      }
      renderScenePreviewLayers();
      saveSceneState();
      scheduleScenePreview();
    });
    text2FontSelect?.addEventListener('change', async () => {
      if (text2FontSelect.value) {
        await ensurePreviewFont(text2FontSelect.value);
      }
      renderScenePreviewLayers();
      saveSceneState();
      scheduleScenePreview();
    });

    function handleCharacterSourceChange(slot) {
      normalizeCharacterSourceState(slot, slot.cacheKeyInput?.value ? 'preview' : 'portrait');
      updatePreviewSources();
      renderScenePreviewLayers();
      scheduleScenePreview();
    }

    function handleCharacterPreviewSelectChange(slot) {
      if (slot.slot === 1) {
        savePortraitLayoutState(activePortraitLayoutKey);
      } else {
        savePortraitLayoutState(activeCharacter2PortraitLayoutKey, slot);
      }
      const selectedCacheKey = slot.cacheKeyInput?.value || '';
      if (selectedCacheKey) {
        const portraitFilename = slot.slot === 1
          ? (slot.portraitFilenameInput?.value || getLastSelectedPortrait(slot))
          : (slot.portraitFilenameInput?.value || getLastSelectedPortrait(slot) || slot.cacheKeyInput?.dataset.portraitFilename || '');
        if (slot.slot === 1 && portraitFilename) {
          setLastSelectedPortrait(slot, portraitFilename);
        } else if (slot.slot === 2 && portraitFilename) {
          setLastSelectedPortrait(slot, portraitFilename);
        }
        if (portraitFilename && slot.cacheKeyInput) {
          slot.cacheKeyInput.dataset.portraitFilename = portraitFilename;
        }
        if (slot.portraitFilenameInput) {
          slot.portraitFilenameInput.value = '';
        }
      } else if (slot.portraitFilenameInput && !slot.portraitFilenameInput.value) {
        slot.portraitFilenameInput.value = slot.slot === 1
          ? getLastSelectedPortrait(slot)
          : (slot.cacheKeyInput?.dataset.portraitFilename || '');
      }
      updateCharacterPreviewSelectLabels();
      handleCharacterSourceChange(slot);
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
    cacheKeySelect?.addEventListener('change', () => {
      handleCharacterPreviewSelectChange(characterSlots[0]);
    });
    character2CacheKeySelect?.addEventListener('change', () => {
      handleCharacterPreviewSelectChange(characterSlots[1]);
    });
    baseLayer?.addEventListener('load', renderScenePreviewLayers);
    portraitLayer?.addEventListener('load', renderScenePreviewLayers);
    portraitLayer2?.addEventListener('load', renderScenePreviewLayers);
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
    const textDragSlot = buildTextDragSlot('text', 'text1', textXInput, textYInput, textLayer);
    const text2DragSlot = buildTextDragSlot('text2', 'text2', text2XInput, text2YInput, textLayer2);
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
    characterSlots.forEach((slot) => {
      slot.onCommit = slot.slot === 1
        ? () => savePortraitLayoutState()
        : () => savePortraitLayoutState(getCharacterPortraitLayoutKey(slot), slot);
      slot.syncPreviewLayoutPosition = () => {};
      slot.layer?.addEventListener('pointerdown', (event) => beginPreviewObjectDrag(slot, event));
      slot.layer?.addEventListener('pointermove', updatePreviewObjectDrag);
      slot.layer?.addEventListener('pointerup', endPreviewObjectDrag);
      slot.layer?.addEventListener('pointercancel', endPreviewObjectDrag);
    });
    textLayer?.addEventListener('pointerdown', (event) => beginPreviewObjectDrag(textDragSlot, event));
    textLayer?.addEventListener('pointermove', updatePreviewObjectDrag);
    textLayer?.addEventListener('pointerup', endPreviewObjectDrag);
    textLayer?.addEventListener('pointercancel', endPreviewObjectDrag);
    textLayer2?.addEventListener('pointerdown', (event) => beginPreviewObjectDrag(text2DragSlot, event));
    textLayer2?.addEventListener('pointermove', updatePreviewObjectDrag);
    textLayer2?.addEventListener('pointerup', endPreviewObjectDrag);
    textLayer2?.addEventListener('pointercancel', endPreviewObjectDrag);
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
      if (textFontSelect?.value) {
        try {
          await ensurePreviewFont(textFontSelect.value);
        } catch {
          // Server-rendered preview still uses the selected font when available.
        }
      }
      if (text2FontSelect?.value) {
        try {
          await ensurePreviewFont(text2FontSelect.value);
        } catch {
          // Server-rendered preview still uses the selected font when available.
        }
      }
      await restoreIndexedDbBaseImage();
      updateOverlaySourcePanels();
      updatePreviewSources();
      renderScenePreviewLayers();
      await runInitialScenePreview();
      updateCurrentSourceLabel();
      updateBaseImageSourceLabel();
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
