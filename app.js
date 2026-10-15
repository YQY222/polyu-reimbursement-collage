(() => {
  const textKeys = ['number', 'project', 'purpose'];
  const defaults = { text: { x: 7.9, y: 71.1 }, signature: { x: 15.7, y: 3.1 } };
  const state = {
    positions: structuredClone(defaults),
    signatureSize: 25,
    textScale: 100,
    textWidth: 37,
    fontScale: 100,
    showText: true,
    showSignature: true,
    compositeSource: '',
    images: {
      left: '',
      right: '',
      signature: ''
    }
  };
  const sheet = document.getElementById('sheet');
  const status = document.getElementById('status');
  const workspace = document.querySelector('.workspace');
  const sheetWrap = document.querySelector('.sheet-wrap');
  const noteDialog = document.getElementById('note-dialog');
  const imageElements = {
    left: document.getElementById('left-image'),
    right: document.getElementById('right-image'),
    signature: document.getElementById('signature-image'),
    composite: document.getElementById('composite-image')
  };
  const setStatus = message => { status.textContent = message; };

  function fitPreview() {
    if (window.innerWidth <= 1100) { sheetWrap.style.width = '100%'; return; }
    const style = getComputedStyle(workspace);
    const head = document.querySelector('.workspace-head');
    const note = document.querySelector('.preview-note');
    const margins = element => {
      const value = getComputedStyle(element);
      return parseFloat(value.marginTop) + parseFloat(value.marginBottom);
    };
    const availableWidth = workspace.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availableHeight = workspace.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      - head.offsetHeight - margins(head) - note.offsetHeight - margins(note);
    const parts = sheet.style.aspectRatio.split('/').map(Number);
    const ratio = parts.length === 2 ? parts[0] / parts[1] : parts[0];
    sheetWrap.style.width = `${Math.max(1, Math.floor(Math.min(900, availableWidth, availableHeight * (ratio || 0.92))))}px`;
  }

  function imageLayout(left, right) {
    const leftWidth = left?.naturalWidth || right?.naturalWidth || 1206;
    const rightWidth = right?.naturalWidth || left?.naturalWidth || 1206;
    const width = leftWidth + rightWidth;
    const imageHeight = Math.max(left?.naturalHeight || 0, right?.naturalHeight || 0);
    const height = left && right ? imageHeight : Math.max(imageHeight, Math.ceil(width / 0.92));
    return { leftWidth, rightWidth, width, height };
  }

  function updateSheetRatio() {
    if (state.compositeSource) {
      const image = imageElements.composite;
      if (image.complete && image.naturalWidth && image.naturalHeight) {
        sheet.style.aspectRatio = String(image.naturalWidth / image.naturalHeight);
      }
      fitPreview();
      applyTextScale();
      applyPositions();
      return;
    }
    for (const key of ['left', 'right']) {
      const image = imageElements[key];
      document.getElementById(`${key}-slot`).classList.toggle(
        'landscape', image.complete && image.naturalWidth > image.naturalHeight
      );
    }
    const left = imageElements.left.naturalWidth ? imageElements.left : null;
    const right = imageElements.right.naturalWidth ? imageElements.right : null;
    const layout = imageLayout(left, right);
    document.querySelector('.image-region').style.gridTemplateColumns = `${layout.leftWidth}fr ${layout.rightWidth}fr`;
    sheet.style.aspectRatio = `${layout.width} / ${layout.height}`;
    fitPreview();
    applyTextScale();
    state.positions.text = clampPosition('text', state.positions.text.x, state.positions.text.y);
    state.positions.signature = clampPosition('signature', state.positions.signature.x, state.positions.signature.y);
    applyPositions();
  }
  imageElements.left.addEventListener('load', updateSheetRatio);
  imageElements.right.addEventListener('load', updateSheetRatio);
  imageElements.composite.addEventListener('load', updateSheetRatio);

  function setCompositeSource(source) {
    state.compositeSource = source || '';
    imageElements.composite.src = source || '';
    sheet.classList.toggle('composite-mode', !!source);
    if (!source) updateSheetRatio();
  }

  function applyVisibility() {
    document.getElementById('text-item').hidden = !state.showText;
    document.getElementById('signature-item').hidden = !state.showSignature;
    document.getElementById('show-text').checked = state.showText;
    document.getElementById('show-signature').checked = state.showSignature;
  }

  function applyPositions() {
    for (const [key, position] of Object.entries(state.positions)) {
      const element = document.querySelector(`[data-item="${key}"]`);
      element.style.left = `${position.x}%`;
      element.style.top = `${position.y}%`;
    }
    document.getElementById('signature-item').style.width = `${state.signatureSize}%`;
    document.getElementById('signature-size').value = state.signatureSize;
    document.getElementById('signature-size-value').textContent = `${state.signatureSize}%`;
  }

  function fitTextLine(line) {
    line.style.fontSize = '';
    if (!line.textContent) return;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const style = getComputedStyle(line);
    let size = parseFloat(style.fontSize);
    const family = style.fontFamily;
    const weight = style.fontWeight;
    while (size > 10) {
      context.font = `${weight} ${size}px ${family}`;
      if (context.measureText(line.textContent).width <= line.clientWidth - 4) break;
      size -= 1;
    }
    line.style.fontSize = `${size}px`;
  }

  function updateText(key) {
    const line = document.querySelector(`[data-line="${key}"]`);
    line.textContent = document.getElementById(`${key}-input`).value.trim();
    fitTextLine(line);
  }
  function openNoteDialog() {
    textKeys.forEach(key => { document.getElementById(`note-${key}`).value = document.getElementById(`${key}-input`).value; });
    noteDialog.hidden = false;
    document.getElementById('note-number').focus();
  }
  function closeNoteDialog() {
    noteDialog.hidden = true;
    document.getElementById('text-item').focus();
  }
  document.getElementById('save-notes').addEventListener('click', () => {
    textKeys.forEach(key => {
      document.getElementById(`${key}-input`).value = document.getElementById(`note-${key}`).value;
      updateText(key);
    });
    closeNoteDialog();
  });
  document.getElementById('cancel-notes').addEventListener('click', closeNoteDialog);
  noteDialog.addEventListener('click', event => { if (event.target === noteDialog) closeNoteDialog(); });
  noteDialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeNoteDialog(); }
  });
  function fitAllText() {
    textKeys.forEach(key => fitTextLine(document.querySelector(`[data-line="${key}"]`)));
  }

  function applyTextScale() {
    const factor = state.textScale / 100;
    const element = document.getElementById('text-item');
    element.style.width = `${state.textWidth}%`;
    element.style.fontSize = `${Math.min(20, sheet.clientWidth * 0.022) * factor * state.fontScale / 100}px`;
    element.style.gap = `${8 * factor}px`;
    element.style.padding = `${12 * factor}px`;
    document.getElementById('text-size').value = state.textScale;
    document.getElementById('text-size-value').textContent = `${state.textScale}%`;
    document.getElementById('text-width').value = state.textWidth;
    document.getElementById('text-width-value').textContent = `${state.textWidth}%`;
    document.getElementById('font-size').value = state.fontScale;
    document.getElementById('font-size-value').textContent = `${state.fontScale}%`;
    fitAllText();
  }

  function setImage(key, source, name) {
    if ((key === 'left' || key === 'right') && state.compositeSource) setCompositeSource('');
    state.images[key] = source;
    imageElements[key].src = source || '';
    if (key !== 'signature') document.getElementById(`${key}-slot`).classList.toggle('empty', !source);
    if (key === 'signature' && source) { state.showSignature = true; applyVisibility(); }
    document.getElementById(`${key}-name`).textContent = name || '尚未上传';
  }

  function readDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  for (const key of ['left', 'right', 'signature']) {
    document.getElementById(`${key}-upload`).addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        setImage(key, await readDataUrl(file), file.name);
        if (key === 'right') document.getElementById('amount-input').value = '';
        setStatus(key === 'right' ? '账单已更新，请填写报销金额' : '图片已更新');
      } catch {
        setStatus('图片读取失败');
      }
    });
  }
  for (const key of ['left', 'right']) {
    const slot = document.getElementById(`${key}-slot`);
    slot.tabIndex = 0;
    slot.setAttribute('role', 'button');
    slot.setAttribute('aria-label', `上传${key === 'left' ? '左侧' : '右侧'}截图`);
    slot.addEventListener('click', () => document.getElementById(`${key}-upload`).click());
    slot.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        document.getElementById(`${key}-upload`).click();
      }
    });
  }
  textKeys.forEach(key => document.getElementById(`${key}-input`).addEventListener('input', () => updateText(key)));
  document.getElementById('show-text').addEventListener('change', event => {
    state.showText = event.target.checked;
    applyVisibility();
  });
  document.getElementById('show-signature').addEventListener('change', event => {
    state.showSignature = event.target.checked;
    applyVisibility();
  });
  document.getElementById('signature-size').addEventListener('input', event => {
    state.signatureSize = Number(event.target.value);
    applyPositions();
  });
  document.getElementById('text-size').addEventListener('input', event => {
    state.textScale = Number(event.target.value);
    applyTextScale();
    state.positions.text = clampPosition('text', state.positions.text.x, state.positions.text.y);
    applyPositions();
  });
  document.getElementById('text-width').addEventListener('input', event => {
    state.textWidth = Number(event.target.value);
    applyTextScale();
    state.positions.text = clampPosition('text', state.positions.text.x, state.positions.text.y);
    applyPositions();
  });
  document.getElementById('font-size').addEventListener('input', event => {
    state.fontScale = Number(event.target.value);
    applyTextScale();
    state.positions.text = clampPosition('text', state.positions.text.x, state.positions.text.y);
    applyPositions();
  });

  function clampPosition(key, x, y) {
    const element = document.querySelector(`[data-item="${key}"]`);
    const rect = sheet.getBoundingClientRect();
    const width = element.offsetWidth / rect.width * 100;
    const height = element.offsetHeight / rect.height * 100;
    return { x: Math.max(0, Math.min(x, 100 - width)), y: Math.max(0, Math.min(y, 100 - height)) };
  }

  document.querySelectorAll('.move-item').forEach(element => {
    const key = element.dataset.item;
    let drag = null;
    const openItem = () => key === 'signature'
      ? document.getElementById('signature-upload').click()
      : openNoteDialog();
    element.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault();
      document.querySelectorAll('.move-item').forEach(item => item.classList.remove('selected'));
      element.classList.add('selected');
      element.focus();
      drag = { x: event.clientX, y: event.clientY, moved: false, start: { ...state.positions[key] } };
      element.setPointerCapture(event.pointerId);
    });
    element.addEventListener('pointermove', event => {
      if (!drag) return;
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= 5) drag.moved = true;
      if (!drag.moved) return;
      const rect = sheet.getBoundingClientRect();
      state.positions[key] = clampPosition(
        key,
        drag.start.x + (event.clientX - drag.x) / rect.width * 100,
        drag.start.y + (event.clientY - drag.y) / rect.height * 100
      );
      applyPositions();
    });
    element.addEventListener('pointerup', () => {
      const clicked = drag && !drag.moved;
      drag = null;
      if (clicked) openItem();
    });
    element.addEventListener('pointercancel', () => { drag = null; });
    element.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openItem(); return; }
      const step = event.shiftKey ? 1 : 0.25;
      const offset = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
      if (!offset) return;
      event.preventDefault();
      state.positions[key] = clampPosition(key, state.positions[key].x + offset[0], state.positions[key].y + offset[1]);
      applyPositions();
    });
  });

  const resizeHandle = document.getElementById('text-resize');
  let resizing = null;
  resizeHandle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    resizing = { x: event.clientX, start: state.textScale };
    resizeHandle.setPointerCapture(event.pointerId);
    document.getElementById('text-item').classList.add('selected');
  });
  resizeHandle.addEventListener('pointermove', event => {
    if (!resizing) return;
    const delta = (event.clientX - resizing.x) / (sheet.clientWidth * 0.45) * 100;
    state.textScale = Math.min(140, Math.max(60, Math.round(resizing.start + delta)));
    applyTextScale();
    state.positions.text = clampPosition('text', state.positions.text.x, state.positions.text.y);
    applyPositions();
  });
  resizeHandle.addEventListener('pointerup', () => { resizing = null; });
  resizeHandle.addEventListener('pointercancel', () => { resizing = null; });

  document.getElementById('reset-layout').addEventListener('click', () => {
    state.positions = structuredClone(defaults);
    state.signatureSize = 25;
    state.textScale = 100;
    state.textWidth = 37;
    state.fontScale = 100;
    applyTextScale();
    applyPositions();
    setStatus('位置已恢复');
  });
  document.getElementById('new-project').addEventListener('click', () => {
    exitEditing();
    setCompositeSource('');
    setImage('left', '', '尚未上传');
    setImage('right', '', '尚未上传');
    textKeys.forEach(key => {
      document.getElementById(`${key}-input`).value = '';
      updateText(key);
    });
    state.positions = structuredClone(defaults);
    state.signatureSize = 25;
    state.textScale = 100;
    state.textWidth = 37;
    state.fontScale = 100;
    state.showText = true;
    state.showSignature = true;
    document.getElementById('amount-input').value = '';
    applyVisibility();
    updateSheetRatio();
    applyTextScale();
    applyPositions();
    document.querySelectorAll('input[type=file]').forEach(input => { input.value = ''; });
    setStatus('已新建空白工程，签名保留');
  });

  async function portableSource(source) {
    if (!source || source.startsWith('data:')) return source;
    const blob = await fetch(source).then(response => response.blob());
    return readDataUrl(blob);
  }
  async function projectSource(source, forHistory) {
    if (!source) return '';
    return forHistory ? fetch(source).then(response => response.blob()) : portableSource(source);
  }
  async function captureProject(forHistory = false) {
    const images = {};
    for (const key of ['left', 'right', 'signature']) images[key] = await projectSource(state.images[key], forHistory);
    return {
      version: 6,
      images,
      compositeSource: await projectSource(state.compositeSource, forHistory),
      positions: structuredClone(state.positions),
      signatureSize: state.signatureSize,
      textScale: state.textScale,
      textWidth: state.textWidth,
      fontScale: state.fontScale,
      showText: state.showText,
      showSignature: state.showSignature,
      amount: document.getElementById('amount-input').value,
      text: Object.fromEntries(textKeys.map(key => [key, document.getElementById(`${key}-input`).value]))
    };
  }
  async function restoreSource(source) {
    if (source instanceof Blob) return readDataUrl(source);
    return typeof source === 'string' ? source : '';
  }
  async function applyProject(project) {
    if (![1, 2, 3, 4, 5, 6].includes(project.version) || !project.images || !project.positions) throw Error('bad project');
    setCompositeSource('');
    for (const key of ['left', 'right', 'signature']) {
      const source = await restoreSource(project.images[key]);
      setImage(key, source, source ? (key === 'signature' ? '工程签名' : '工程截图') : '尚未上传');
    }
    const composite = await restoreSource(project.compositeSource);
    setCompositeSource(composite);
    textKeys.forEach(key => {
      document.getElementById(`${key}-input`).value = String(project.text?.[key] || '');
      updateText(key);
    });
    state.positions = structuredClone(defaults);
    const textPosition = project.positions.text || project.positions.number;
    for (const [key, position] of [['text', textPosition], ['signature', project.positions.signature]]) {
      if (Number.isFinite(position?.x) && Number.isFinite(position?.y)) state.positions[key] = { x: position.x, y: position.y };
    }
    state.signatureSize = Math.min(45, Math.max(10, Number(project.signatureSize) || 25));
    state.textScale = Math.min(140, Math.max(60, Number(project.textScale) || 100));
    state.textWidth = Math.min(80, Math.max(20, Number(project.textWidth) || 45 * state.textScale / 100));
    state.fontScale = Math.min(220, Math.max(70, Number(project.fontScale) || 100));
    state.showText = project.showText !== false;
    state.showSignature = project.showSignature !== false;
    document.getElementById('amount-input').value = String(project.amount || '');
    applyVisibility();
    applyTextScale();
    applyPositions();
    fitAllText();
  }
  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  document.getElementById('save-project').addEventListener('click', async () => {
    try {
      const project = await captureProject();
      downloadBlob(new Blob([JSON.stringify(project)], { type: 'application/json' }), '报销拼接工程.json');
      setStatus('工程已保存');
    } catch {
      setStatus('保存工程失败');
    }
  });
  document.getElementById('import-project').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const project = JSON.parse(await file.text());
      exitEditing();
      await applyProject(project);
      setStatus('工程已导入');
    } catch {
      setStatus('工程文件无效');
    }
    event.target.value = '';
  });

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      if (!source) { resolve(null); return; }
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });
  }
  function drawContain(context, image, box) {
    if (!image) return;
    const scale = Math.min(box.w / image.naturalWidth, box.h / image.naturalHeight);
    const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
    const y = image.naturalWidth > image.naturalHeight ? box.y + box.h - height : box.y;
    context.drawImage(image, box.x + (box.w - width) / 2, y, width, height);
  }

  async function renderPng() {
    const [left, right, signature, composite] = await Promise.all([
      state.images.left, state.images.right, state.images.signature, state.compositeSource
    ].map(loadImage));
    const layout = imageLayout(left, right);
    const width = composite ? composite.naturalWidth : layout.width;
    const height = composite ? composite.naturalHeight : layout.height;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    if (composite) context.drawImage(composite, 0, 0, width, height);
    else {
      drawContain(context, left, { x: 0, y: 0, w: layout.leftWidth, h: height });
      drawContain(context, right, { x: layout.leftWidth, y: 0, w: layout.rightWidth, h: height });
    }

    const sheetRect = sheet.getBoundingClientRect();
    const scaleX = width / sheetRect.width, scaleY = height / sheetRect.height;
    if (state.showText) {
    const textRect = document.getElementById('text-item').getBoundingClientRect();
    const boxX = (textRect.left - sheetRect.left) * scaleX;
    const boxY = (textRect.top - sheetRect.top) * scaleY;
    const boxW = textRect.width * scaleX;
    const boxH = textRect.height * scaleY;
    context.fillStyle = '#fff';
    context.fillRect(boxX, boxY, boxW, boxH);
    context.strokeStyle = '#000';
    context.lineWidth = 2 * scaleX;
    context.strokeRect(boxX + context.lineWidth / 2, boxY + context.lineWidth / 2, boxW - context.lineWidth, boxH - context.lineWidth);
    for (const key of textKeys) {
      const line = document.querySelector(`[data-line="${key}"]`);
      const rect = line.getBoundingClientRect();
      const x = (rect.left - sheetRect.left) * scaleX;
      const y = (rect.top - sheetRect.top) * scaleY;
      const lineWidth = rect.width * scaleX;
      const style = getComputedStyle(line);
      context.fillStyle = '#000';
      context.font = `${style.fontWeight} ${Math.round(parseFloat(style.fontSize) * scaleX)}px sans-serif`;
      context.textBaseline = 'top';
      context.fillText(line.textContent, x, y, lineWidth);
    }
    }
    if (state.showSignature) {
    const signatureElement = document.getElementById('signature-item');
    const rect = signatureElement.getBoundingClientRect();
    const signatureX = (rect.left - sheetRect.left) * scaleX;
    const signatureY = (rect.top - sheetRect.top) * scaleY;
    const signatureW = rect.width * scaleX;
    const signatureH = rect.height * scaleY;
    const signatureStyle = getComputedStyle(signatureElement);
    const insetX = (parseFloat(signatureStyle.borderLeftWidth) + parseFloat(signatureStyle.paddingLeft)) * scaleX;
    const insetY = (parseFloat(signatureStyle.borderTopWidth) + parseFloat(signatureStyle.paddingTop)) * scaleY;
    context.fillStyle = '#fff';
    context.fillRect(signatureX, signatureY, signatureW, signatureH);
    if (signature) context.drawImage(signature, signatureX + insetX, signatureY + insetY, signatureW - insetX * 2, signatureH - insetY * 2);
    context.strokeStyle = '#000';
    context.lineWidth = 2 * scaleX;
    context.strokeRect(signatureX + context.lineWidth / 2, signatureY + context.lineWidth / 2, signatureW - context.lineWidth, signatureH - context.lineWidth);
    }
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }
  const historyList = document.getElementById('history-list');
  const selectedHistory = new Set();
  let historyItems = [];
  let historyUrls = [];
  let editingId = null;
  function exitEditing() {
    editingId = null;
    document.getElementById('editing-banner').hidden = true;
    document.getElementById('save-history').textContent = '保存当前图片';
  }
  function syncEditingUi() {
    const item = historyItems.find(entry => entry.id === editingId);
    if (!item) { exitEditing(); return; }
    document.getElementById('editing-name').textContent = item.name;
    document.getElementById('editing-banner').hidden = false;
    document.getElementById('save-history').textContent = '保存修改';
  }
  document.getElementById('exit-edit').addEventListener('click', () => {
    exitEditing();
    setStatus('已退出历史编辑');
  });
  const historyDb = new Promise((resolve, reject) => {
    const request = indexedDB.open('reimbursement-collage-history', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  function historyStore(mode, operation) {
    return historyDb.then(db => new Promise((resolve, reject) => {
      const transaction = db.transaction('images', mode);
      const request = operation(transaction.objectStore('images'));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }));
  }
  const historyName = () => {
    const rawAmount = document.getElementById('amount-input').value.trim().replace(/[¥￥,\s元]/g, '');
    const amount = Number(rawAmount);
    if (rawAmount && Number.isFinite(amount) && amount !== 0) return `${Math.abs(amount).toFixed(2)}元.png`;
    const now = new Date();
    const stamp = `${now.toLocaleString('sv-SE').replace(/[ :]/g, '-')}-${String(now.getMilliseconds()).padStart(3, '0')}`;
    return `报销凭证-${stamp}.png`;
  };
  function cleanHistoryName(raw) {
    const stem = raw.trim().replace(/\.png$/i, '').replace(/[\\/:*?"<>|]/g, '-').trim().slice(0, 80);
    return stem ? `${stem}.png` : '';
  }
  function updateHistorySelection() {
    const count = selectedHistory.size;
    document.getElementById('selected-count').textContent = count;
    document.getElementById('download-selected').disabled = count === 0;
    document.getElementById('delete-selected').disabled = count === 0;
    const all = document.getElementById('select-all-history');
    all.checked = historyItems.length > 0 && count === historyItems.length;
    all.indeterminate = count > 0 && count < historyItems.length;
  }
  async function editHistoryItem(item) {
    try {
      if (item.project) {
        await applyProject(item.project);
        setStatus('已载入历史图片，可修改后保存');
      } else {
        setCompositeSource('');
        setImage('left', '', '旧记录：仅有成品图');
        setImage('right', '', '旧记录：仅有成品图');
        setCompositeSource(await readDataUrl(item.blob));
        state.positions = structuredClone(defaults);
        state.signatureSize = 25;
        state.textScale = 100;
        state.textWidth = 37;
        state.fontScale = 100;
        state.showText = false;
        state.showSignature = false;
        textKeys.forEach(key => {
          document.getElementById(`${key}-input`).value = '';
          updateText(key);
        });
        document.getElementById('amount-input').value = item.name.match(/^([\d,.]+)元/)?.[1] || '';
        applyVisibility();
        applyTextScale();
        applyPositions();
        setStatus('旧记录已作为底图打开；原有文字和签名不可单独移动');
      }
      editingId = item.id;
      syncEditingUi();
    } catch { setStatus('无法打开这张历史图片'); }
  }
  async function refreshHistory() {
    historyItems = (await historyStore('readonly', store => store.getAll())).sort((a, b) => b.id - a.id);
    const known = new Set(historyItems.map(item => item.id));
    for (const id of selectedHistory) if (!known.has(id)) selectedHistory.delete(id);
    historyUrls.forEach(URL.revokeObjectURL);
    historyUrls = [];
    historyList.replaceChildren();
    document.getElementById('history-count').textContent = `${historyItems.length} 张已保存图片`;
    if (!historyItems.length) {
      const empty = document.createElement('p');
      empty.className = 'history-empty';
      empty.textContent = '还没有保存的拼接图';
      historyList.append(empty);
    }
    for (const item of historyItems) {
      const card = document.createElement('article');
      card.className = 'history-card';
      const url = URL.createObjectURL(item.blob);
      historyUrls.push(url);
      const image = document.createElement('img');
      image.src = url;
      image.alt = item.name;
      image.loading = 'lazy';
      const bottom = document.createElement('div');
      bottom.className = 'history-card-bottom';
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'history-check';
      checkbox.checked = selectedHistory.has(item.id);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) selectedHistory.add(item.id);
        else selectedHistory.delete(item.id);
        updateHistorySelection();
      });
      label.append(checkbox, document.createTextNode('选择'));
      const buttons = document.createElement('div');
      buttons.className = 'history-card-buttons';
      const editButton = document.createElement('button');
      editButton.className = 'history-download';
      editButton.textContent = '编辑';
      editButton.setAttribute('aria-label', `编辑 ${item.name}`);
      editButton.addEventListener('click', () => editHistoryItem(item));
      const renameButton = document.createElement('button');
      renameButton.className = 'history-download';
      renameButton.textContent = '重命名';
      const downloadButton = document.createElement('button');
      downloadButton.className = 'history-download';
      downloadButton.textContent = '下载';
      downloadButton.addEventListener('click', () => downloadBlob(item.blob, item.name));
      const deleteButton = document.createElement('button');
      deleteButton.className = 'history-download history-delete';
      deleteButton.textContent = '删除';
      deleteButton.setAttribute('aria-label', `删除 ${item.name}`);
      deleteButton.addEventListener('click', () => requestDeleteHistoryItems([item.id]));
      buttons.append(editButton, renameButton, downloadButton, deleteButton);
      bottom.append(label, buttons);
      const title = document.createElement('strong');
      title.className = 'history-card-title';
      title.textContent = item.name;
      const renameForm = document.createElement('div');
      renameForm.className = 'history-rename';
      renameForm.hidden = true;
      const renameInput = document.createElement('input');
      renameInput.type = 'text';
      renameInput.maxLength = 80;
      renameInput.setAttribute('aria-label', '图片新名称');
      const saveName = document.createElement('button');
      saveName.textContent = '保存';
      const cancelName = document.createElement('button');
      cancelName.textContent = '取消';
      renameForm.append(renameInput, saveName, cancelName);
      renameButton.addEventListener('click', () => {
        renameInput.value = item.name.replace(/\.png$/i, '');
        renameForm.hidden = false;
        renameInput.focus();
        renameInput.select();
      });
      cancelName.addEventListener('click', () => { renameForm.hidden = true; });
      async function commitRename() {
        const name = cleanHistoryName(renameInput.value);
        if (!name) { setStatus('请输入图片名称'); renameInput.focus(); return; }
        try {
          await historyStore('readwrite', store => store.put({ ...item, name }));
          await refreshHistory();
          setStatus('历史图片已重命名');
        } catch { setStatus('重命名失败，请检查浏览器存储空间'); }
      }
      saveName.addEventListener('click', commitRename);
      renameInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') commitRename();
        if (event.key === 'Escape') renameForm.hidden = true;
      });
      const meta = document.createElement('p');
      meta.className = 'history-card-meta';
      meta.textContent = new Date(item.createdAt).toLocaleString('zh-CN');
      card.append(image, bottom, title, renameForm, meta);
      historyList.append(card);
    }
    updateHistorySelection();
    syncEditingUi();
  }
  async function saveCurrentImage(alsoDownload) {
    const blob = await renderPng();
    if (!blob) throw Error('canvas');
    const project = await captureProject(true);
    const existing = historyItems.find(item => item.id === editingId);
    const name = existing?.name || historyName();
    if (existing) {
      await historyStore('readwrite', store => store.put({ ...existing, blob, project, updatedAt: Date.now() }));
    } else {
      await historyStore('readwrite', store => store.add({ blob, name, project, createdAt: Date.now() }));
    }
    if (alsoDownload) downloadBlob(blob, name);
    await refreshHistory();
    setStatus(existing ? (alsoDownload ? '修改已保存并下载' : '历史图片的修改已保存') : (alsoDownload ? '图片已下载并保存到历史' : '图片已保存到历史'));
  }
  const deleteDialog = document.getElementById('delete-dialog');
  let pendingDeleteIds = [];
  function closeDeleteDialog() {
    deleteDialog.hidden = true;
    pendingDeleteIds = [];
  }
  function requestDeleteHistoryItems(ids) {
    if (!ids.length) return;
    pendingDeleteIds = [...ids];
    document.getElementById('delete-dialog-message').textContent = ids.length === 1
      ? '这张图片将从拼接历史中永久删除。'
      : `选中的 ${ids.length} 张图片将从拼接历史中永久删除。`;
    deleteDialog.hidden = false;
    document.getElementById('cancel-delete').focus();
  }
  async function deleteHistoryItems(ids) {
    if (!ids.length) return;
    try {
      const db = await historyDb;
      await new Promise((resolve, reject) => {
        const transaction = db.transaction('images', 'readwrite');
        const store = transaction.objectStore('images');
        ids.forEach(id => store.delete(id));
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
      ids.forEach(id => selectedHistory.delete(id));
      if (ids.includes(editingId)) exitEditing();
      await refreshHistory();
      setStatus(`已从历史删除 ${ids.length} 张图片`);
    } catch { setStatus('删除失败，请稍后重试'); }
  }
  document.getElementById('cancel-delete').addEventListener('click', closeDeleteDialog);
  document.getElementById('confirm-delete').addEventListener('click', () => {
    const ids = pendingDeleteIds;
    closeDeleteDialog();
    deleteHistoryItems(ids);
  });
  deleteDialog.addEventListener('click', event => {
    if (event.target === deleteDialog) closeDeleteDialog();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !deleteDialog.hidden) closeDeleteDialog();
  });
  function zipHeader(size) {
    const bytes = new Uint8Array(size);
    return { bytes, view: new DataView(bytes.buffer) };
  }
  const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
    let crc = n;
    for (let i = 0; i < 8; i++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    return crc >>> 0;
  });
  function crc32(bytes) {
    let crc = -1;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ -1) >>> 0;
  }
  async function makeZip(items) {
    const encoder = new TextEncoder();
    const parts = [], directory = [];
    const usedNames = new Set();
    let offset = 0;
    for (const item of items) {
      let filename = item.name;
      let duplicate = 2;
      while (usedNames.has(filename)) filename = item.name.replace(/\.png$/i, `-${duplicate++}.png`);
      usedNames.add(filename);
      const name = encoder.encode(filename);
      const data = new Uint8Array(await item.blob.arrayBuffer());
      const crc = crc32(data);
      const local = zipHeader(30);
      local.view.setUint32(0, 0x04034b50, true);
      local.view.setUint16(4, 20, true);
      local.view.setUint16(6, 0x0800, true);
      local.view.setUint32(14, crc, true);
      local.view.setUint32(18, data.length, true);
      local.view.setUint32(22, data.length, true);
      local.view.setUint16(26, name.length, true);
      parts.push(local.bytes, name, data);
      const central = zipHeader(46);
      central.view.setUint32(0, 0x02014b50, true);
      central.view.setUint16(4, 20, true);
      central.view.setUint16(6, 20, true);
      central.view.setUint16(8, 0x0800, true);
      central.view.setUint32(16, crc, true);
      central.view.setUint32(20, data.length, true);
      central.view.setUint32(24, data.length, true);
      central.view.setUint16(28, name.length, true);
      central.view.setUint32(42, offset, true);
      directory.push(central.bytes, name);
      offset += local.bytes.length + name.length + data.length;
    }
    const directorySize = directory.reduce((size, part) => size + part.length, 0);
    const end = zipHeader(22);
    end.view.setUint32(0, 0x06054b50, true);
    end.view.setUint16(8, items.length, true);
    end.view.setUint16(10, items.length, true);
    end.view.setUint32(12, directorySize, true);
    end.view.setUint32(16, offset, true);
    return new Blob([...parts, ...directory, end.bytes], { type: 'application/zip' });
  }
  document.getElementById('download-png').addEventListener('click', async () => {
    try { await saveCurrentImage(true); }
    catch { setStatus('导出或保存失败，请检查图片及浏览器存储空间'); }
  });
  document.getElementById('save-history').addEventListener('click', async () => {
    try { await saveCurrentImage(false); }
    catch { setStatus('保存失败，请检查图片及浏览器存储空间'); }
  });
  document.getElementById('select-all-history').addEventListener('change', event => {
    selectedHistory.clear();
    if (event.target.checked) historyItems.forEach(item => selectedHistory.add(item.id));
    historyList.querySelectorAll('.history-check').forEach(checkbox => { checkbox.checked = event.target.checked; });
    updateHistorySelection();
  });
  document.getElementById('download-selected').addEventListener('click', async () => {
    const chosen = historyItems.filter(item => selectedHistory.has(item.id));
    if (!chosen.length) return;
    try {
      const blob = await makeZip(chosen);
      downloadBlob(blob, `报销拼接图片-${chosen.length}张.zip`);
      setStatus(`已打包下载 ${chosen.length} 张图片`);
    } catch { setStatus('批量下载失败'); }
  });
  document.getElementById('delete-selected').addEventListener('click', () => {
    requestDeleteHistoryItems(historyItems.filter(item => selectedHistory.has(item.id)).map(item => item.id));
  });
  refreshHistory().catch(() => {
    historyList.textContent = '无法读取历史，请检查浏览器是否允许本地存储';
    historyList.classList.add('history-error');
  });
  document.getElementById('print-pdf').addEventListener('click', () => window.print());
  window.addEventListener('resize', () => { fitPreview(); applyTextScale(); applyPositions(); });
  updateSheetRatio();
  applyTextScale();
  applyPositions();
  applyVisibility();
  textKeys.forEach(updateText);
})();
