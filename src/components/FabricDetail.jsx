import { useState, useEffect, useRef } from 'react';

const IconBasic = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="2" width="20" height="20" />
    <text x="12" y="16" textAnchor="middle" stroke="none" fill="currentColor" fontSize="12" fontFamily="sans-serif" fontWeight="bold">R</text>
  </svg>
);

const IconHalfDrop = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="2" width="20" height="20" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="12" x2="12" y2="12" />
    <line x1="12" y1="8" x2="22" y2="8" />
    <line x1="12" y1="16" x2="22" y2="16" />
    <text x="7" y="10" textAnchor="middle" stroke="none" fill="currentColor" fontSize="6" fontFamily="sans-serif">R</text>
    <text x="7" y="19" textAnchor="middle" stroke="none" fill="currentColor" fontSize="6" fontFamily="sans-serif">R</text>
    <text x="17" y="7" textAnchor="middle" stroke="none" fill="currentColor" fontSize="6" fontFamily="sans-serif">R</text>
    <text x="17" y="14" textAnchor="middle" stroke="none" fill="currentColor" fontSize="6" fontFamily="sans-serif">R</text>
    <text x="17" y="21" textAnchor="middle" stroke="none" fill="currentColor" fontSize="6" fontFamily="sans-serif">R</text>
  </svg>
);

const IconHalfBrick = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="2" width="20" height="20" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="12" y1="2" x2="12" y2="12" />
    <line x1="8" y1="12" x2="8" y2="22" />
    <line x1="16" y1="12" x2="16" y2="22" />
    <text x="7" y="10" textAnchor="middle" stroke="none" fill="currentColor" fontSize="6" fontFamily="sans-serif">R</text>
    <text x="17" y="10" textAnchor="middle" stroke="none" fill="currentColor" fontSize="6" fontFamily="sans-serif">R</text>
    <text x="4" y="19" textAnchor="middle" stroke="none" fill="currentColor" fontSize="6" fontFamily="sans-serif">R</text>
    <text x="12" y="19" textAnchor="middle" stroke="none" fill="currentColor" fontSize="6" fontFamily="sans-serif">R</text>
    <text x="20" y="19" textAnchor="middle" stroke="none" fill="currentColor" fontSize="6" fontFamily="sans-serif">R</text>
  </svg>
);

const IconMirror = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <rect x="2" y="2" width="20" height="20" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />

    {/* Top */}
    <text
      x="7"
      y="10"
      textAnchor="middle"
      stroke="none"
      fill="currentColor"
      fontSize="7"
      fontFamily="sans-serif"
    >
      R
    </text>

    <text
      x="17"
      y="10"
      textAnchor="middle"
      stroke="none"
      fill="currentColor"
      fontSize="7"
      fontFamily="sans-serif"
      transform="scale(-1, 1) translate(-34, 0)"
    >
      R
    </text>

    {/* Bottom - moved slightly down */}
    <text
      x="7"
      y="20.5"
      textAnchor="middle"
      stroke="none"
      fill="currentColor"
      fontSize="7"
      fontFamily="sans-serif"
      transform="scale(1, -1) translate(0, -31)"
    >
      R
    </text>

    <text
      x="17"
      y="20.5"
      textAnchor="middle"
      stroke="none"
      fill="currentColor"
      fontSize="7"
      fontFamily="sans-serif"
      transform="scale(-1, -1) translate(-34, -31)"
    >
      R
    </text>
  </svg>
);

const IconMirrorX = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="2" width="20" height="20" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <text x="7" y="10" textAnchor="middle" stroke="none" fill="currentColor" fontSize="7" fontFamily="sans-serif">R</text>
    <text x="17" y="10" textAnchor="middle" stroke="none" fill="currentColor" fontSize="7" fontFamily="sans-serif" transform="scale(-1, 1) translate(-34, 0)">R</text>
    <text x="7" y="19" textAnchor="middle" stroke="none" fill="currentColor" fontSize="7" fontFamily="sans-serif">R</text>
    <text x="17" y="19" textAnchor="middle" stroke="none" fill="currentColor" fontSize="7" fontFamily="sans-serif" transform="scale(-1, 1) translate(-34, 0)">R</text>
  </svg>
);
import { FABRIC_TYPES, SIZES } from '../data/fabrics';

export default function FabricDetail({ fabric, onBack }) {
  const [scale, setScale] = useState(100);
  const [layout, setLayout] = useState('basic');
  const [rotation, setRotation] = useState(0);
  const [selectedFabricType, setSelectedFabricType] = useState(FABRIC_TYPES[0].id);
  const [selectedSize, setSelectedSize] = useState(SIZES[0].id);
  const [qty, setQty] = useState(1);
  const [customImage, setCustomImage] = useState(null);
  const canvasRef = useRef(null);

  const fabricType = FABRIC_TYPES.find(f => f.id === selectedFabricType);
  const sizeOption = SIZES.find(s => s.id === selectedSize);
  const cost = (fabricType.baseCost * sizeOption.multiplier * qty).toFixed(2);

  const handleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setCustomImage(event.target.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `fabric-pattern-${layout}.png`;
    a.click();
  };

  // Simple pattern rendering on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = customImage || fabric.image;
    img.onload = () => {
      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      const patternSize = (img.width * (scale / 100));
      const patternHeight = (img.height * (scale / 100));

      // Pattern drawing logic with precise offset for different layouts
      const cols = Math.ceil(canvas.width / patternSize) + 2;
      const rows = Math.ceil(canvas.height / patternHeight) + 2;

      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          let xOffset = 0;
          let yOffset = 0;
          let scaleX = 1;
          let scaleY = 1;

          // Half-Brick: Alternate rows are shifted horizontally by half the width
          if (layout === 'half-brick' && (Math.abs(r) % 2 === 1)) {
            xOffset = patternSize / 2;
          }

          // Half-Drop: Alternate columns are shifted vertically by half the height
          if (layout === 'half-drop' && (Math.abs(c) % 2 === 1)) {
            yOffset = patternHeight / 2;
          }

          // Mirror: Every alternate column is flipped horizontally, every alternate row is flipped vertically
          if (layout === 'mirror') {
            if (Math.abs(c) % 2 === 1) scaleX = -1;
            if (Math.abs(r) % 2 === 1) scaleY = -1;
          }

          // Mirror X: Every alternate column is flipped horizontally
          if (layout === 'mirror-x') {
            if (Math.abs(c) % 2 === 1) scaleX = -1;
          }

          const x = c * patternSize + xOffset + patternSize / 2;
          const y = r * patternHeight + yOffset + patternHeight / 2;

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(rotation * Math.PI / 180);
          ctx.scale(scaleX, scaleY);
          ctx.drawImage(img, -patternSize / 2, -patternHeight / 2, patternSize, patternHeight);
          ctx.restore();
        }
      }
      ctx.restore();
    };
  }, [fabric, scale, layout, rotation, customImage]);

  return (
    <div className="fabric-detail">
      <div className="fd-header">
        <button className="fd-back-btn" onClick={onBack}>← Back to Catalog</button>
      </div>

      <div className="fd-content">
        {/* Left Side: Preview */}
        <div className="fd-preview-col">
          <div className="fd-canvas-wrapper">
            <div className="fd-ruler-h"></div>
            <div className="fd-ruler-v"></div>
            <canvas ref={canvasRef} width={800} height={800} className="fd-canvas"></canvas>
          </div>
        </div>

        {/* Right Side: Options */}
        <div className="fd-options-col">
          <h1 className="fd-title">FABRIC BY METER</h1>
          <div className="fd-meta">
            <strong>Design:</strong> {fabric.name}<br />
            <strong>By:</strong> <span className="fd-accent-text">{fabric.author}</span>
          </div>

          <div className="fd-action-buttons">
            <label className="fd-btn fd-btn-red" style={{ cursor: 'pointer' }}>
              ↑ Upload design
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
            </label>
            <div className="fd-btn-group">
              <button className="fd-btn fd-btn-dark">Select Design</button>
              <button className="fd-btn fd-btn-red-dark">×</button>
            </div>
          </div>

          <div className="fd-resolution-box">
            <img src={customImage || fabric.image} alt="thumb" className="fd-thumb" />
            <div className="fd-dpi">
              <div className="fd-dpi-val">72 DPI</div>
              <div className="fd-dpi-label">Print File Resolution</div>
            </div>
          </div>

          <div className="fd-section">
            <div className="fd-section-title">PRINT SIZE</div>
            <div className="fd-slider-wrap">
              <div className="fd-slider-labels">
                <span>0%</span>
                <span className="fd-slider-val-badge">{scale}%</span>
              </div>
              <input type="range" min="10" max="100" value={scale} onChange={e => setScale(Number(e.target.value))} className="fd-slider" />
            </div>
          </div>

          <div className="fd-section">
            <div className="fd-section-title">ARRANGEMENT</div>
            <div className="fd-layout-controls">
              <div className="fd-layouts">
                <span className="fd-sublabel">SELECT A LAYOUT</span>
                <div className="fd-layout-btns">
                  <button className={`fd-layout-btn ${layout === 'basic' ? 'active' : ''}`} onClick={() => setLayout('basic')} title="Basic">
                    <IconBasic />
                  </button>
                  <button className={`fd-layout-btn ${layout === 'half-drop' ? 'active' : ''}`} onClick={() => setLayout('half-drop')} title="Half Drop">
                    <IconHalfDrop />
                  </button>
                  <button className={`fd-layout-btn ${layout === 'half-brick' ? 'active' : ''}`} onClick={() => setLayout('half-brick')} title="Half Brick">
                    <IconHalfBrick />
                  </button>
                  <button className={`fd-layout-btn ${layout === 'mirror' ? 'active' : ''}`} onClick={() => setLayout('mirror')} title="Mirror XY">
                    <IconMirror />
                  </button>
                  <button className={`fd-layout-btn ${layout === 'mirror-x' ? 'active' : ''}`} onClick={() => setLayout('mirror-x')} title="Mirror X">
                    <IconMirrorX />
                  </button>
                </div>
              </div>
              <div className="fd-rotate">
                <span className="fd-sublabel">ROTATE</span>
                <button className="fd-rotate-btn" onClick={() => setRotation(r => (r + 90) % 360)}>↻</button>
              </div>
            </div>
          </div>

          <div className="fd-pricing-box">
            <div className="fd-form-group">
              <label>Select Fabric</label>
              <select value={selectedFabricType} onChange={e => setSelectedFabricType(e.target.value)}>
                {FABRIC_TYPES.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="fd-form-group">
              <label>Select Size</label>
              <select value={selectedSize} onChange={e => setSelectedSize(e.target.value)}>
                {SIZES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="fd-cart-row">
            <div className="fd-qty-group">
              <span className="fd-qty-label">Qty</span>
              <input type="number" min="1" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} className="fd-qty-input" />
              <span className="fd-unit">{sizeOption.unit}</span>
            </div>
            <div className="fd-price">₹{cost}</div>
          </div>

          <div className="fd-bulk-msg">
            Quantity above 1000 meters, please click <a href="#">here</a>
          </div>

          <div className="fd-terms">
            <label>
              <input type="checkbox" /> I have the rights to use this image in accordance with <a href="#">Terms & Conditions</a>
            </label>
          </div>

          <button className="fd-add-to-cart">ADD TO CART 🛒</button>
          <button className="fd-download-btn" onClick={handleDownload} style={{ width: '100%', padding: '1rem', background: '#e2e8f0', color: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: '800', letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.3s', marginTop: '10px' }}>DOWNLOAD DESIGN ⬇</button>
        </div>
      </div>

      <div className="fd-bottom-info">
        <div className="fd-info-card">
          <div className="fd-icon">📄</div>
          <div>Product Details</div>
        </div>
        <div className="fd-info-card">
          <div className="fd-icon">🚚</div>
          <div>Shipping Info</div>
        </div>
        <div className="fd-info-card">
          <div className="fd-icon">📚</div>
          <div>Fabric Swatch Book</div>
        </div>
      </div>
    </div>
  );
}
