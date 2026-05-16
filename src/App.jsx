import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import QRCode from 'qrcode';
import FabricCatalog from './components/FabricCatalog';
import './App.css';

/* ───── constants ───── */
const COLORS = [
  '#ffffff', '#1a1a1a', '#1e3a5f', '#dc2626', '#166534', '#0d9488',
  '#78350f', '#1d4ed8', '#7c3aed', '#ea580c', '#ec4899', '#6b7280',
  '#7f1d1d', '#eab308', '#38bdf8', '#65a30d',
];
const PRINT_METHODS = [
  'Block Printing', 'Digital printing (DTG)', 'DTF Printing',
  'Embroidery', 'Screen Printing', 'Sublimation Printing',
];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const FONTS = ['Inter', 'Arial', 'Georgia', 'Courier New', 'Times New Roman', 'Verdana', 'Impact', 'Trebuchet MS'];
const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42];
const TABS = ['product', 'text', 'graphics', 'qrcode'];

const ICO = {
  undo: '↺', redo: '↻', zoomIn: '＋', zoomOut: '−', flipH: '⇔', flipV: '⇕',
  centerH: '⊞', delete: '✕', lock: '🔒', unlock: '🔓', eye: '👁', hide: '⊘',
  up: '▲', down: '▼', save: '💾', cart: '🛒', download: '⬇',
};

/**
 * Professional t-shirt color tinting using the MULTIPLY blend mode technique.
 *
 * HOW IT WORKS (same as fabricprint.in and all pro mockup tools):
 * 1. Start with a transparent canvas
 * 2. Fill it with the target color, but ONLY where the shirt pixels are
 *    (using the original image as a mask via 'destination-in')
 * 3. Draw the original image ON TOP with 'multiply' blend mode
 *    → multiply darkens only where there are shadows/wrinkles (dark pixels)
 *    → white pixels in the original × color = the color itself (no change)
 *    → dark shadow pixels × color = darker version of color (realistic shading)
 * 4. Background (transparent in original) stays transparent throughout
 *
 * REQUIREMENT: Upload a PNG with a TRANSPARENT background (no white bg).
 * White-bg PNGs will show the white bg tinted.
 */
function tintImage(img, hexColor) {
  const W = img.naturalWidth || img.width;
  const H = img.naturalHeight || img.height;

  // Step 1: Create a solid color layer masked to the shirt shape
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = W; colorCanvas.height = H;
  const colorCtx = colorCanvas.getContext('2d');

  // Draw the original image first (to get the alpha mask)
  colorCtx.drawImage(img, 0, 0);
  // Switch to source-atop: next draw only affects existing non-transparent pixels
  colorCtx.globalCompositeOperation = 'source-atop';
  colorCtx.fillStyle = hexColor;
  colorCtx.fillRect(0, 0, W, H);
  // Reset
  colorCtx.globalCompositeOperation = 'source-over';

  // Step 2: Composite result canvas — color layer + original on top with multiply
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const ctx = out.getContext('2d');

  // Draw the colored (masked) base
  ctx.drawImage(colorCanvas, 0, 0);

  // Draw original image on top with multiply blend → shadows/wrinkles preserved
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  return out.toDataURL('image/png');
}

export function TShirtDesigner() {
  /* refs */
  const canvasEl = useRef(null);
  const fc = useRef(null);
  const initDone = useRef(false);
  const historyRef = useRef([]);
  const isRestoring = useRef(false);
  const nameCounter = useRef({ text: 0, rect: 0, circle: 0, triangle: 0, star: 0, line: 0, image: 0, qr: 0 });
  const frontState = useRef(null);
  const backState = useRef(null);
  const mockupImgRef = useRef(null); // <img> element reference for download compositing
  const tintedCanvasRef = useRef(null); // offscreen canvas for tinted product

  /* state */
  const [tab, setTab] = useState('product');
  const [color, setColor] = useState('#ffffff');
  const [printMethod, setPrintMethod] = useState(PRINT_METHODS[0]);
  const [size, setSize] = useState('M');
  const [qty, setQty] = useState(1);
  const [layers, setLayers] = useState([]);
  const [selId, setSelId] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [view, setView] = useState('front');
  const [mockupSrc, setMockupSrc] = useState(null);
  const [tintedSrc, setTintedSrc] = useState(null); // tinted version of mockup

  // FIX: use state for history index so undo/redo buttons re-render
  const [histIdx, setHistIdx] = useState(-1);

  /* text editing state */
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontSize, setFontSize] = useState(20);
  const [fontColor, setFontColor] = useState('#000000');
  const [textAlign, setTextAlign] = useState('left');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);

  /* qr state */
  const [qrUrl, setQrUrl] = useState('');

  const canvas = () => fc.current;

  const refreshLayers = useCallback(() => {
    const c = fc.current; if (!c) return;
    const objs = c.getObjects().map((o, i) => ({
      idx: i, id: o._myId,
      name: o._myName || o.type,
      type: o.type,
      locked: !!(o.lockMovementX),
      visible: o.visible !== false,
    }));
    setLayers([...objs].reverse());
  }, []);

  /* FIX: pushHistory now updates both ref AND state so buttons re-render */
  const pushHistory = useCallback(() => {
    if (isRestoring.current) return;
    const c = fc.current; if (!c) return;
    const json = JSON.stringify(c.toJSON(['_myId', '_myName']));
    const newHistory = historyRef.current.slice(0, historyRef.current._idx !== undefined
      ? historyRef.current._idx + 1
      : historyRef.current.length);

    // Use a simple approach: slice up to current index then push
    setHistIdx(prev => {
      const nextIdx = prev + 1;
      historyRef.current = historyRef.current.slice(0, nextIdx);
      historyRef.current.push(json);
      return nextIdx;
    });
  }, []);

  /* ───── canvas init ───── */
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const c = new fabric.Canvas(canvasEl.current, {
      width: 200, height: 260, backgroundColor: 'transparent', preserveObjectStacking: true,
    });
    fc.current = c;

    const onModified = () => { pushHistory(); refreshLayers(); };
    c.on('object:added', onModified);
    c.on('object:removed', onModified);
    c.on('object:modified', onModified);
    c.on('selection:created', (e) => { setSelId(e.selected?.[0]?._myId ?? null); syncTextState(e.selected?.[0]); });
    c.on('selection:updated', (e) => { setSelId(e.selected?.[0]?._myId ?? null); syncTextState(e.selected?.[0]); });
    c.on('selection:cleared', () => setSelId(null));

    // Push initial empty state
    const json = JSON.stringify(c.toJSON(['_myId', '_myName']));
    historyRef.current = [json];
    setHistIdx(0);

    refreshLayers();

    return () => { c.dispose(); initDone.current = false; };
  }, []); // eslint-disable-line

  /* ── Recompute tinted image whenever mockupSrc or color changes ── */
  useEffect(() => {
    if (!mockupSrc) { setTintedSrc(null); return; }
    if (color === '#ffffff') { setTintedSrc(mockupSrc); return; } // white = no tint needed

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      mockupImgRef.current = img;
      const tinted = tintImage(img, color);
      setTintedSrc(tinted);
    };
    img.src = mockupSrc;
  }, [mockupSrc, color]);

  /* ───── CHANGE PRODUCT MOCKUP ───── */
  const handleMockupUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await fileToDataUrl(file);
    setMockupSrc(url);
    e.target.value = '';
  };
  const removeMockup = () => { setMockupSrc(null); setTintedSrc(null); mockupImgRef.current = null; };

  /* sync text tool state */
  const syncTextState = (obj) => {
    if (!obj || (obj.type !== 'i-text' && obj.type !== 'textbox')) return;
    setFontFamily(obj.fontFamily || 'Inter');
    setFontSize(obj.fontSize || 20);
    setFontColor(obj.fill || '#000000');
    setTextAlign(obj.textAlign || 'left');
    setBold(obj.fontWeight === 'bold');
    setItalic(obj.fontStyle === 'italic');
    setUnderline(!!obj.underline);
  };

  /* ───── UNDO / REDO ───── */
  const canUndo = histIdx > 0;
  const canRedo = histIdx < historyRef.current.length - 1;

  const doUndo = async () => {
    if (!canUndo) return;
    const newIdx = histIdx - 1;
    isRestoring.current = true;
    const c = canvas(); if (!c) return;
    await c.loadFromJSON(historyRef.current[newIdx]);
    c.renderAll();
    isRestoring.current = false;
    setHistIdx(newIdx);
    refreshLayers();
  };

  const doRedo = async () => {
    if (!canRedo) return;
    const newIdx = histIdx + 1;
    isRestoring.current = true;
    const c = canvas(); if (!c) return;
    await c.loadFromJSON(historyRef.current[newIdx]);
    c.renderAll();
    isRestoring.current = false;
    setHistIdx(newIdx);
    refreshLayers();
  };

  /* ───── ZOOM ───── */
  const doZoom = (dir) => {
    const c = canvas(); if (!c) return;
    let z = zoom + dir * 10;
    z = Math.max(50, Math.min(200, z));
    setZoom(z);
    c.setZoom(z / 100);
    c.setDimensions({ width: 200 * z / 100, height: 260 * z / 100 });
    c.renderAll();
  };

  /* ───── FLIP ───── */
  const doFlip = (axis) => {
    const obj = canvas()?.getActiveObject(); if (!obj) return;
    if (axis === 'x') obj.set('flipX', !obj.flipX);
    else obj.set('flipY', !obj.flipY);
    canvas().renderAll(); pushHistory();
  };

  /* ───── CENTER ───── */
  const doCenter = () => {
    const c = canvas(); const obj = c?.getActiveObject(); if (!obj) return;
    c.centerObject(obj); obj.setCoords(); c.renderAll(); pushHistory();
  };

  /* ───── DELETE ───── */
  const doDelete = () => {
    const c = canvas(); if (!c) return;
    const objs = c.getActiveObjects();
    c.remove(...objs); c.discardActiveObject(); c.renderAll(); refreshLayers();
  };

  /* ───── VIEW SWITCH ───── */
  const switchView = async (v) => {
    if (v === view) return;
    const c = canvas(); if (!c) return;
    const json = JSON.stringify(c.toJSON(['_myId', '_myName']));
    if (view === 'front') frontState.current = json; else backState.current = json;
    const target = v === 'front' ? frontState.current : backState.current;
    if (target) {
      isRestoring.current = true;
      await c.loadFromJSON(target);
      c.renderAll();
      isRestoring.current = false;
    } else {
      c.clear(); c.backgroundColor = 'transparent'; c.renderAll();
    }
    setView(v); refreshLayers();
  };

  /* ───── ADD TEXT ───── */
  const addText = () => {
    const c = canvas(); if (!c) return;
    nameCounter.current.text++;
    const t = new fabric.IText('Your Text', {
      left: 40, top: 60, fontFamily, fontSize, fill: fontColor,
      textAlign, fontWeight: bold ? 'bold' : 'normal',
      fontStyle: italic ? 'italic' : 'normal', underline,
    });
    t._myId = `text-${Date.now()}`;
    t._myName = `Text ${nameCounter.current.text}`;
    c.add(t); c.setActiveObject(t); c.renderAll();
  };

  const applyTextProp = (prop, val) => {
    const obj = canvas()?.getActiveObject();
    if (!obj || (obj.type !== 'i-text' && obj.type !== 'textbox')) return;
    obj.set(prop, val); canvas().renderAll(); pushHistory();
  };

  /* ───── ADD SHAPES ───── */
  const addShape = (type) => {
    const c = canvas(); if (!c) return;
    let obj;
    const base = { left: 50, top: 80, fill: '#6b7280', stroke: '#000', strokeWidth: 0 };
    switch (type) {
      case 'rect':
        nameCounter.current.rect++;
        obj = new fabric.Rect({ ...base, width: 60, height: 60 });
        obj._myName = `Rectangle ${nameCounter.current.rect}`; break;
      case 'circle':
        nameCounter.current.circle++;
        obj = new fabric.Circle({ ...base, radius: 30 });
        obj._myName = `Circle ${nameCounter.current.circle}`; break;
      case 'triangle':
        nameCounter.current.triangle++;
        obj = new fabric.Triangle({ ...base, width: 60, height: 60 });
        obj._myName = `Triangle ${nameCounter.current.triangle}`; break;
      case 'line':
        nameCounter.current.line++;
        obj = new fabric.Line([20, 100, 180, 100], { stroke: '#6b7280', strokeWidth: 3 });
        obj._myName = `Line ${nameCounter.current.line}`; break;
      case 'star': {
        nameCounter.current.star++;
        const pts = starPoints(5, 30, 15);
        obj = new fabric.Polygon(pts, { ...base, left: 60, top: 80 });
        obj._myName = `Star ${nameCounter.current.star}`; break;
      }
      default: return;
    }
    obj._myId = `${type}-${Date.now()}`;
    c.add(obj); c.setActiveObject(obj); c.renderAll();
  };

  const starPoints = (spikes, outerR, innerR) => {
    const pts = []; const step = Math.PI / spikes;
    for (let i = 0; i < 2 * spikes; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      pts.push({ x: outerR + r * Math.cos(i * step - Math.PI / 2), y: outerR + r * Math.sin(i * step - Math.PI / 2) });
    }
    return pts;
  };

  /* ───── IMAGE UPLOAD (onto canvas) ───── */
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const c = canvas(); if (!c) return;
    const url = await fileToDataUrl(file);
    try {
      const img = await fabric.FabricImage.fromURL(url);
      img.scaleToWidth(120);
      nameCounter.current.image++;
      img._myId = `img-${Date.now()}`;
      img._myName = `Image ${nameCounter.current.image}`;
      c.add(img); c.centerObject(img); c.setActiveObject(img); c.renderAll();
    } catch (err) { console.error('Image load error', err); }
    e.target.value = '';
  };

  const fileToDataUrl = (file) => new Promise((res) => {
    const r = new FileReader(); r.onload = (e) => res(e.target.result); r.readAsDataURL(file);
  });

  /* ───── QR CODE ───── */
  const addQRCode = async () => {
    if (!qrUrl.trim()) return;
    const c = canvas(); if (!c) return;
    try {
      const dataUrl = await QRCode.toDataURL(qrUrl.trim(), { width: 200, margin: 1 });
      const img = await fabric.FabricImage.fromURL(dataUrl);
      img.scaleToWidth(80);
      nameCounter.current.qr++;
      img._myId = `qr-${Date.now()}`;
      img._myName = `QR Code ${nameCounter.current.qr}`;
      c.add(img); c.centerObject(img); c.setActiveObject(img); c.renderAll();
    } catch (err) { console.error('QR error', err); }
  };

  /* ───── LAYER ACTIONS ───── */
  const selectLayer = (id) => {
    const c = canvas(); if (!c) return;
    const obj = c.getObjects().find(o => o._myId === id);
    if (obj) { c.setActiveObject(obj); c.renderAll(); setSelId(id); }
  };
  const toggleLock = (id) => {
    const c = canvas(); if (!c) return;
    const obj = c.getObjects().find(o => o._myId === id); if (!obj) return;
    const lock = !obj.lockMovementX;
    obj.set({ lockMovementX: lock, lockMovementY: lock, lockRotation: lock, lockScalingX: lock, lockScalingY: lock, hasControls: !lock });
    c.renderAll(); refreshLayers();
  };
  const toggleVisibility = (id) => {
    const c = canvas(); if (!c) return;
    const obj = c.getObjects().find(o => o._myId === id); if (!obj) return;
    obj.set('visible', !obj.visible); c.renderAll(); refreshLayers();
  };
  const moveLayer = (id, dir) => {
    const c = canvas(); if (!c) return;
    const obj = c.getObjects().find(o => o._myId === id); if (!obj) return;
    if (dir === 'up') c.bringObjectForward(obj); else c.sendObjectBackwards(obj);
    c.renderAll(); refreshLayers(); pushHistory();
  };
  const deleteLayer = (id) => {
    const c = canvas(); if (!c) return;
    const obj = c.getObjects().find(o => o._myId === id); if (!obj) return;
    c.remove(obj); c.renderAll(); refreshLayers();
  };

  /* ───── DOWNLOAD: composite mockup + design ───── */
  const downloadDesign = async () => {
    const c = canvas(); if (!c) return;

    // Target output size matching the mockup-container dimensions
    const MOCKUP_W = 460, MOCKUP_H = 560;

    const out = document.createElement('canvas');
    out.width = MOCKUP_W;
    out.height = MOCKUP_H;
    const ctx = out.getContext('2d');

    // 1. Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, MOCKUP_W, MOCKUP_H);

    // 2. Draw tinted product image (if uploaded)
    const drawMockup = () => new Promise((resolve) => {
      if (!tintedSrc) return resolve();
      const img = new Image();
      img.onload = () => {
        // Calculate dimensions for object-fit: contain
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;
        const scale = Math.min(MOCKUP_W / imgW, MOCKUP_H / imgH);
        const w = imgW * scale;
        const h = imgH * scale;
        const x = (MOCKUP_W - w) / 2;
        const y = (MOCKUP_H - h) / 2;
        
        ctx.drawImage(img, x, y, w, h);
        resolve();
      };
      img.onerror = resolve;
      img.src = tintedSrc;
    });
    await drawMockup();

    // 3. Draw the Fabric canvas contents on top (in the canvas-wrapper position)
    // canvas-wrapper: top: 28%, left: 50% transform(-50%), width: 200px, height: 260px
    const designX = (MOCKUP_W - 200) / 2;
    const designY = Math.round(MOCKUP_H * 0.28);

    // Get fabric canvas as image
    const designDataUrl = c.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
    await new Promise((resolve) => {
      const dImg = new Image();
      dImg.onload = () => {
        ctx.drawImage(dImg, designX, designY, 200, 260);
        resolve();
      };
      dImg.onerror = resolve;
      dImg.src = designDataUrl;
    });

    // 4. Download
    const a = document.createElement('a');
    a.href = out.toDataURL('image/png', 1.0);
    a.download = `design-${view}.png`;
    a.click();
  };

  const saveDesign = () => {
    const c = canvas(); if (!c) return;
    const json = JSON.stringify(c.toJSON(['_myId', '_myName']));
    localStorage.setItem('savedDesign', json);
    alert('Design saved!');
  };

  const addToCart = () => {
    alert(`Added to cart!\nColor: ${color}\nPrint: ${printMethod}\nSize: ${size}\nQty: ${qty}`);
  };

  const layerIcon = (type) => {
    if (type === 'i-text' || type === 'textbox') return 'T';
    if (type === 'rect') return '■';
    if (type === 'circle') return '●';
    if (type === 'triangle') return '▲';
    if (type === 'polygon') return '★';
    if (type === 'line') return '—';
    if (type === 'image') return '🖼';
    return '◆';
  };

  /* ──────────────── RENDER ──────────────── */
  return (
    <div className="app">
      {/* ─── TOOLBAR ─── */}
      <div className="toolbar">
        <div className="toolbar-group">
          <div className="brand">Fabric<span>Designer</span></div>
        </div>

        <div className="toolbar-group center">
          <button className="tb" onClick={doUndo} disabled={!canUndo} title="Undo">{ICO.undo} Undo</button>
          <button className="tb" onClick={doRedo} disabled={!canRedo} title="Redo">{ICO.redo} Redo</button>
          <div className="toolbar-divider" />
          <button className="tb" onClick={() => doZoom(1)} title="Zoom In">{ICO.zoomIn}</button>
          <button className="tb" onClick={() => doZoom(-1)} title="Zoom Out">{ICO.zoomOut}</button>
          <div className="toolbar-divider" />
          <button className="tb" onClick={() => doFlip('x')} title="Flip Horizontal">{ICO.flipH}</button>
          <button className="tb" onClick={() => doFlip('y')} title="Flip Vertical">{ICO.flipV}</button>
          <button className="tb" onClick={doCenter} title="Center Object">{ICO.centerH}</button>
          <div className="toolbar-divider" />
          <button className="tb danger" onClick={doDelete} title="Delete">{ICO.delete}</button>
          <div className="toolbar-divider" />
          <div className="view-toggle">
            <button className={`tb ${view === 'front' ? 'active' : ''}`} onClick={() => switchView('front')}>Front</button>
          </div>
        </div>

        <div className="toolbar-group">
          <button className="tb" onClick={saveDesign} title="Save">{ICO.save}</button>
          <button className="tb accent" onClick={addToCart}>{ICO.cart} Add to Cart</button>
          <button className="tb" onClick={downloadDesign}>{ICO.download} Download</button>
        </div>
      </div>

      <div className="main">
        {/* ─── LEFT SIDEBAR ─── */}
        <div className="sidebar">
          <div className="sidebar-nav">
            {TABS.map(t => (
              <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
                {t === 'product' ? 'Product' : t === 'text' ? 'Text' : t === 'graphics' ? 'Graphics' : 'QR Code'}
              </button>
            ))}
          </div>

          <div className="sidebar-body">
            {/* ── PRODUCT TAB ── */}
            {tab === 'product' && (<>
              <div>
                <div className="section-title">Product Image</div>
                <input type="file" accept="image/*" className="hidden-input" id="mockup-upload" onChange={handleMockupUpload} />
                <label htmlFor="mockup-upload" className="btn btn-primary btn-block" style={{ cursor: 'pointer' }}>📷 Upload Product Image</label>
                {mockupSrc && <button className="btn btn-danger btn-block btn-sm" style={{ marginTop: '0.4rem' }} onClick={removeMockup}>✕ Remove Image</button>}
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>⚠️ PNG with transparent background required — white background PNGs will not tint correctly</p>
              </div>
              <div>
                <div className="section-title">Color</div>
                <div className="color-palette">
                  {COLORS.map(c => (
                    <div key={c} className={`color-swatch ${color === c ? 'active' : ''}`}
                      data-color={c} style={{ backgroundColor: c }} onClick={() => setColor(c)} />
                  ))}
                </div>
                <div style={{ marginTop: '0.8rem' }}>
                  <div className="section-title" style={{ fontSize: '0.75rem' }}>Custom Color</div>
                  <div className="color-picker-row">
                    <input type="color" className="color-picker-input" value={color} onChange={e => setColor(e.target.value)} />
                    <input type="text" className="input input-sm" value={color} placeholder="#ffffff"
                      onChange={e => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(v); }}
                      style={{ flex: 1, fontFamily: 'monospace' }} />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <div className="section-title">Printing Technique</div>
                <select className="select" value={printMethod} onChange={e => setPrintMethod(e.target.value)}>
                  {PRINT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <div className="section-title">Size</div>
                <div className="size-chips">
                  {SIZES.map(s => (
                    <button key={s} className={`size-chip ${size === s ? 'active' : ''}`} onClick={() => setSize(s)}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <div className="section-title">Quantity</div>
                <div className="qty-stepper">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                  <input type="number" value={qty} min={1} onChange={e => setQty(Math.max(1, +e.target.value || 1))} />
                  <button onClick={() => setQty(q => q + 1)}>+</button>
                </div>
              </div>
            </>)}

            {/* ── TEXT TAB ── */}
            {tab === 'text' && (<>
              <button className="btn btn-primary btn-block" onClick={addText}>+ Add Text</button>
              <div className="form-group">
                <div className="section-title">Font Family</div>
                <select className="select" value={fontFamily} onChange={e => { setFontFamily(e.target.value); applyTextProp('fontFamily', e.target.value); }}>
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-group">
                <div className="section-title">Font Size</div>
                <select className="select" value={fontSize} onChange={e => { const v = +e.target.value; setFontSize(v); applyTextProp('fontSize', v); }}>
                  {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
                </select>
              </div>
              <div className="form-group">
                <div className="section-title">Text Color</div>
                <input type="color" className="input" value={fontColor} onChange={e => { setFontColor(e.target.value); applyTextProp('fill', e.target.value); }} />
              </div>
              <div>
                <div className="section-title">Formatting</div>
                <div className="text-format-bar">
                  <button className={`tb ${bold ? 'active' : ''}`} onClick={() => { setBold(!bold); applyTextProp('fontWeight', !bold ? 'bold' : 'normal'); }}><b>B</b></button>
                  <button className={`tb ${italic ? 'active' : ''}`} onClick={() => { setItalic(!italic); applyTextProp('fontStyle', !italic ? 'italic' : 'normal'); }}><i>I</i></button>
                  <button className={`tb ${underline ? 'active' : ''}`} onClick={() => { setUnderline(!underline); applyTextProp('underline', !underline); }}><u>U</u></button>
                  <div className="toolbar-divider" />
                  <button className={`tb ${textAlign === 'left' ? 'active' : ''}`} onClick={() => { setTextAlign('left'); applyTextProp('textAlign', 'left'); }}>⫷</button>
                  <button className={`tb ${textAlign === 'center' ? 'active' : ''}`} onClick={() => { setTextAlign('center'); applyTextProp('textAlign', 'center'); }}>☰</button>
                  <button className={`tb ${textAlign === 'right' ? 'active' : ''}`} onClick={() => { setTextAlign('right'); applyTextProp('textAlign', 'right'); }}>⫸</button>
                </div>
              </div>
            </>)}

            {/* ── GRAPHICS TAB ── */}
            {tab === 'graphics' && (<>
              <div>
                <div className="section-title">Shapes</div>
                <div className="shapes-grid">
                  <button className="shape-btn" onClick={() => addShape('rect')} title="Rectangle">■</button>
                  <button className="shape-btn" onClick={() => addShape('circle')} title="Circle">●</button>
                  <button className="shape-btn" onClick={() => addShape('triangle')} title="Triangle">▲</button>
                  <button className="shape-btn" onClick={() => addShape('star')} title="Star">★</button>
                  <button className="shape-btn" onClick={() => addShape('line')} title="Line">─</button>
                </div>
              </div>
              <div>
                <div className="section-title">Upload Image</div>
                <input type="file" accept="image/*" className="hidden-input" id="img-upload" onChange={handleImageUpload} />
                <label htmlFor="img-upload" className="btn btn-primary btn-block" style={{ cursor: 'pointer' }}>📁 Choose File</label>
              </div>
            </>)}

            {/* ── QR CODE TAB ── */}
            {tab === 'qrcode' && (<>
              <div className="form-group">
                <div className="section-title">Enter URL or Text</div>
                <input className="input" placeholder="e.g. https://google.com" value={qrUrl} onChange={e => setQrUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addQRCode()} />
              </div>
              <button className="btn btn-primary btn-block" onClick={addQRCode}>Generate QR Code</button>
            </>)}
          </div>
        </div>

        {/* ─── CANVAS AREA ─── */}
        <div className="canvas-area">
          <div className="mockup-container">
            {/* FIX: use tintedSrc (Canvas-processed) instead of CSS mask */}
            {tintedSrc ? (
              <img src={tintedSrc} alt="Product" className="mockup-img" style={{ mixBlendMode: 'normal', opacity: 1 }} />
            ) : !mockupSrc ? (
              <div className="mockup-placeholder">
                <div className="mockup-placeholder-icon">📷</div>
                <p>Upload a product image</p>
                <p style={{ fontSize: '0.7rem', color: '#888' }}>PNG without background recommended</p>
                <label htmlFor="mockup-upload" className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>Choose File</label>
              </div>
            ) : null}

            <div className="canvas-wrapper">
              <canvas ref={canvasEl} />
            </div>

            {/* color badge */}
            <div className="color-badge">
              <span className="color-badge-dot" style={{ backgroundColor: color }} />
              {color}
            </div>
          </div>
          <div className="zoom-indicator">{zoom}%</div>
        </div>

        {/* ─── RIGHT PANEL – LAYERS ─── */}
        <div className="right-panel">
          <div className="right-panel-header">Manage Layers</div>
          {layers.length === 0 ? (
            <div className="layers-empty">No elements yet. Add text, shapes or images.</div>
          ) : (
            <div className="layers-list">
              {layers.map(l => (
                <div key={l.id} className={`layer-item ${selId === l.id ? 'active' : ''}`} onClick={() => selectLayer(l.id)}>
                  <div className="layer-icon">{layerIcon(l.type)}</div>
                  <div className="layer-info">
                    <div className="layer-name">{l.name}</div>
                    <div className="layer-type">{l.type}</div>
                  </div>
                  <div className="layer-actions" onClick={e => e.stopPropagation()}>
                    <button title="Move Up" onClick={() => moveLayer(l.id, 'up')}>{ICO.up}</button>
                    <button title="Move Down" onClick={() => moveLayer(l.id, 'down')}>{ICO.down}</button>
                    <button title={l.locked ? 'Unlock' : 'Lock'} className={l.locked ? 'locked' : ''} onClick={() => toggleLock(l.id)}>
                      {l.locked ? ICO.lock : ICO.unlock}
                    </button>
                    <button title={l.visible ? 'Hide' : 'Show'} onClick={() => toggleVisibility(l.id)}>
                      {l.visible ? ICO.eye : ICO.hide}
                    </button>
                    <button title="Delete" onClick={() => deleteLayer(l.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── BOTTOM BAR ─── */}
      <div className="bottom-bar">
        <button className="btn" onClick={saveDesign}>{ICO.save} Save Progress</button>
        <button className="btn btn-primary" onClick={addToCart}>{ICO.cart} Add to Cart</button>
        <button className="btn" onClick={downloadDesign}>{ICO.download} Download Preview</button>
      </div>
    </div>
  );
}

export default function App() {
  const [appMode, setAppMode] = useState('fabric'); // 'tshirt' or 'fabric'

  return (
    <>
      <div style={{ background: '#1e293b', padding: '10px 20px', display: 'flex', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', alignItems: 'center' }}>
         <div style={{ color: '#fff', fontWeight: 800, marginRight: '20px' }}>App Nav:</div>
         <button 
            style={{ background: 'none', border: 'none', color: appMode === 'tshirt' ? '#3b82f6' : '#94a3b8', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }} 
            onClick={() => setAppMode('tshirt')}
         >
            T-Shirt Designer
         </button>
         <button 
            style={{ background: 'none', border: 'none', color: appMode === 'fabric' ? '#3b82f6' : '#94a3b8', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }} 
            onClick={() => setAppMode('fabric')}
         >
            Fabric Designer
         </button>
      </div>
      {appMode === 'tshirt' ? <TShirtDesigner /> : <FabricCatalog />}
    </>
  );
}