import { useState } from 'react';
import { FABRICS, FABRIC_CATEGORIES } from '../data/fabrics';
import FabricDetail from './FabricDetail';
import './FabricStyles.css';

export default function FabricCatalog() {
  const [selectedFabric, setSelectedFabric] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [searchQuery, setSearchQuery] = useState("");

  if (selectedFabric) {
    return <FabricDetail fabric={selectedFabric} onBack={() => setSelectedFabric(null)} />;
  }

  const filteredFabrics = FABRICS.filter(f => 
    (activeCategory === "All Categories" || f.category === activeCategory || true) ?
    (f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.sku.toLowerCase().includes(searchQuery.toLowerCase())) : true
  );

  return (
    <div className="fabric-catalog">
      {/* Sidebar */}
      <div className="fc-sidebar">
        <div className="fc-sidebar-header">
          ALL
        </div>
        <div className="fc-categories">
          <div className="fc-cat-title">ALL CATEGORIES</div>
          {FABRIC_CATEGORIES.map(cat => (
            <button 
              key={cat} 
              className={`fc-cat-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              › {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="fc-main">
        <div className="fc-toolbar">
          <div className="fc-search-group">
            <label className="fc-label">Search</label>
            <input 
              type="text" 
              className="fc-input fc-search-input" 
              placeholder="Select Designer / Search" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="fc-sort-group">
            <label className="fc-label">Sort by</label>
            <select className="fc-select">
              <option>Please Select</option>
              <option>Newest</option>
              <option>Price: Low to High</option>
            </select>
          </div>
        </div>

        <div className="fc-grid">
          {filteredFabrics.map(fabric => (
            <div key={fabric.id} className="fc-card" onClick={() => setSelectedFabric(fabric)}>
              <div className="fc-card-sku"><strong>SKU :</strong> {fabric.sku}</div>
              <div className="fc-card-img-wrap">
                <img src={fabric.image} alt={fabric.name} className="fc-card-img" />
              </div>
              <div className="fc-card-info">
                <div className="fc-card-title">{fabric.name}</div>
                <div className="fc-card-author">by <span>{fabric.author}</span></div>
                <div className="fc-card-likes">🤍 ({fabric.likes})</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
