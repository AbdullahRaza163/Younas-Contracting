// src/components/BOM.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Package, ClipboardList, TrendingUp as TrendingUpIcon, Edit, Trash2,
  PlusCircle, Save, X, Plus, Search, RefreshCw, CheckCircle, AlertCircle,
  DollarSign, Layers, BarChart3, PieChart as PieChartIcon, Boxes,
  Building2, User, Calendar, Clock, Star, Sparkles, Crown, Target,
  Percent, Wallet, Minus, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, LayoutDashboard, FileText, TrendingDown, Flame, Zap
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import Utils from '../utils/Utils';
import './BOM.css';

// ============================================
// PORTAL
// ============================================
const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

// ============================================
// CHART TOOLTIP
// ============================================
const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bom-chart-tooltip">
      {label && <div className="bom-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="bom-chart-tooltip-row">
          <span className="bom-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="bom-chart-tooltip-name">{p.name}</span>
          <span className="bom-chart-tooltip-val">
            {formatter ? formatter(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const BOMComponent = ({ data, updateData }) => {
  const [activeTab, setActiveTab] = useState('overview'); // overview | materials | bom | prediction
  const [mounted, setMounted] = useState(false);

  const [materialForm, setMaterialForm] = useState({
    name: '', category: 'Construction', unit: 'kg', unitPrice: '',
    quantity: '', supplier: '', reorderLevel: ''
  });
  const [bomForm, setBomForm] = useState({
    projectName: '', siteId: '', materials: [], estimatedHours: '',
    labourCost: '', overheadPercentage: '10'
  });
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [predictionParams, setPredictionParams] = useState({
    projectType: 'residential', area: '', floors: '1', materialType: 'all'
  });
  const [predictionResult, setPredictionResult] = useState(null);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Pagination
  const [matPage, setMatPage] = useState(1);
  const [matPer, setMatPer] = useState(10);
  const [bomPage, setBomPage] = useState(1);
  const [bomPer, setBomPer] = useState(9);

  const categories = [
    'Construction', 'Steel', 'Cement', 'Sand', 'Gravel', 'Wood',
    'Electrical', 'Plumbing', 'Finishing', 'Painting', 'Glass', 'Insulation'
  ];
  const units = ['kg', 'ton', 'm3', 'm2', 'liters', 'pieces', 'rolls', 'sheets'];

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const materials = useMemo(() => data.materials || [], [data.materials]);
  const boms = useMemo(() => data.bom || [], [data.bom]);
  const sites = useMemo(() => data.sites || [], [data.sites]);

  // ============================================
  // MATERIAL CRUD
  // ============================================
  const handleMaterialSubmit = (e) => {
    e.preventDefault();
    if (!materialForm.name) return;
    const material = {
      id: editingMaterial || Date.now().toString(),
      ...materialForm,
      unitPrice: parseFloat(materialForm.unitPrice) || 0,
      quantity: parseFloat(materialForm.quantity) || 0,
      reorderLevel: parseFloat(materialForm.reorderLevel) || 0,
      createdAt: new Date().toISOString()
    };
    let updatedMaterials;
    if (editingMaterial) {
      updatedMaterials = materials.map(m => m.id === editingMaterial ? material : m);
    } else {
      updatedMaterials = [...materials, material];
    }
    updateData({ materials: updatedMaterials });
    setMaterialForm({ name: '', category: 'Construction', unit: 'kg', unitPrice: '', quantity: '', supplier: '', reorderLevel: '' });
    setEditingMaterial(null);
    setShowMaterialForm(false);
  };

  const deleteMaterial = (id) => {
    if (window.confirm('Delete this material?')) {
      updateData({ materials: materials.filter(m => m.id !== id) });
    }
  };

  const startEditMaterial = (material) => {
    setEditingMaterial(material.id);
    setMaterialForm({
      name: material.name || '',
      category: material.category || 'Construction',
      unit: material.unit || 'kg',
      unitPrice: material.unitPrice?.toString() || '',
      quantity: material.quantity?.toString() || '',
      supplier: material.supplier || '',
      reorderLevel: material.reorderLevel?.toString() || ''
    });
    setShowMaterialForm(true);
  };

  const resetMaterialForm = () => {
    setMaterialForm({ name: '', category: 'Construction', unit: 'kg', unitPrice: '', quantity: '', supplier: '', reorderLevel: '' });
    setEditingMaterial(null);
  };

  // ============================================
  // BOM
  // ============================================
  const addMaterialToBOM = (material) => {
    setBomForm(prev => ({
      ...prev,
      materials: [...prev.materials, {
        materialId: material.id,
        name: material.name,
        unit: material.unit,
        unitPrice: material.unitPrice,
        quantity: 1,
        totalCost: material.unitPrice
      }]
    }));
  };

  const removeFromBOM = (index) => {
    setBomForm(prev => ({ ...prev, materials: prev.materials.filter((_, i) => i !== index) }));
  };

  const updateBOMQuantity = (index, quantity) => {
    setBomForm(prev => {
      const updated = [...prev.materials];
      updated[index].quantity = parseFloat(quantity) || 0;
      updated[index].totalCost = updated[index].unitPrice * updated[index].quantity;
      return { ...prev, materials: updated };
    });
  };

  const saveBOM = (e) => {
    e.preventDefault();
    if (!bomForm.projectName) return;
    const totalMaterialCost = bomForm.materials.reduce((sum, m) => sum + m.totalCost, 0);
    const labourCost = parseFloat(bomForm.labourCost) || 0;
    const overhead = (totalMaterialCost + labourCost) * (parseFloat(bomForm.overheadPercentage) / 100);
    const totalCost = totalMaterialCost + labourCost + overhead;
    const bom = {
      id: Date.now().toString(), ...bomForm,
      totalMaterialCost, labourCost, overhead, totalCost,
      createdAt: new Date().toISOString()
    };
    updateData({ bom: [...boms, bom] });
    setBomForm({
      projectName: '', siteId: '', materials: [], estimatedHours: '',
      labourCost: '', overheadPercentage: '10'
    });
  };

  // ============================================
  // PREDICTION
  // ============================================
  const generatePrediction = () => {
    const { projectType, area, floors, materialType } = predictionParams;
    const areaNum = parseFloat(area) || 0;
    const floorsNum = parseInt(floors) || 1;
    const materialRates = {
      residential: { cement: 0.15, steel: 0.08, sand: 0.12, gravel: 0.10, wood: 0.05, bricks: 50 },
      commercial: { cement: 0.20, steel: 0.12, sand: 0.15, gravel: 0.12, wood: 0.03, bricks: 40 },
      industrial: { cement: 0.25, steel: 0.18, sand: 0.10, gravel: 0.15, wood: 0.02, bricks: 30 }
    };
    const rates = materialRates[projectType] || materialRates.residential;
    const totalArea = areaNum * floorsNum;
    const prediction = {
      projectType, totalArea, floors: floorsNum,
      materials: {
        cement: { quantity: rates.cement * totalArea, unit: 'tons' },
        steel: { quantity: rates.steel * totalArea, unit: 'tons' },
        sand: { quantity: rates.sand * totalArea, unit: 'm3' },
        gravel: { quantity: rates.gravel * totalArea, unit: 'm3' },
        wood: { quantity: rates.wood * totalArea, unit: 'm3' },
        bricks: { quantity: Math.round(rates.bricks * totalArea), unit: 'pieces' }
      },
      estimatedCost: 0,
      laborHours: totalArea * 2.5,
      timeline: Math.ceil(totalArea / 100)
    };
    let totalCost = 0;
    Object.keys(prediction.materials).forEach(key => {
      const material = materials.find(m =>
        m.category.toLowerCase() === key || m.name.toLowerCase().includes(key));
      if (material) {
        const cost = prediction.materials[key].quantity * material.unitPrice;
        prediction.materials[key].cost = cost;
        totalCost += cost;
      } else {
        const avgPrice = 50;
        prediction.materials[key].cost = prediction.materials[key].quantity * avgPrice;
        totalCost += prediction.materials[key].quantity * avgPrice;
        prediction.materials[key].estimatedPrice = true;
      }
    });
    prediction.estimatedCost = totalCost;
    if (materialType !== 'all') {
      const filtered = {};
      Object.keys(prediction.materials).forEach(key => {
        if (key === materialType || key.includes(materialType)) filtered[key] = prediction.materials[key];
      });
      prediction.materials = filtered;
    }
    setPredictionResult(prediction);
  };

  // ============================================
  // FILTERED + PAGINATION
  // ============================================
  const filteredMaterials = useMemo(() => {
    let list = materials;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(m =>
        m.name?.toLowerCase().includes(s) ||
        m.category?.toLowerCase().includes(s) ||
        m.supplier?.toLowerCase().includes(s)
      );
    }
    if (categoryFilter !== 'all') list = list.filter(m => m.category === categoryFilter);
    return list;
  }, [materials, searchTerm, categoryFilter]);

  const paginate = (list, page, per) => {
    const total = Math.max(1, Math.ceil(list.length / per));
    const p = Math.max(1, Math.min(page, total));
    const start = (p - 1) * per;
    return { total, page: p, items: list.slice(start, start + per) };
  };
  const getPageNumbers = (current, total) => {
    const pages = []; const max = 5;
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };
  const renderPagination = (current, total, per, setPer, setPage, count, label = 'items') => {
    if (count === 0) return null;
    const startItem = (current - 1) * per + 1;
    const endItem = Math.min(current * per, count);
    return (
      <div className="bom-pagination">
        <div className="bom-pagination-info">
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{count}</strong> {label}
        </div>
        <div className="bom-pagination-controls">
          <div className="bom-pagination-items">
            <span>Show:</span>
            <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }} className="bom-pagination-select">
              {[6, 9, 10, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="bom-pagination-buttons">
            <button className="bom-page-btn" onClick={() => setPage(1)} disabled={current === 1}><ChevronsLeft size={13} /></button>
            <button className="bom-page-btn" onClick={() => setPage(current - 1)} disabled={current === 1}><ChevronLeft size={13} /></button>
            {getPageNumbers(current, total).map(p => (
              <button key={p} className={`bom-page-btn ${p === current ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="bom-page-btn" onClick={() => setPage(current + 1)} disabled={current === total}><ChevronRight size={13} /></button>
            <button className="bom-page-btn" onClick={() => setPage(total)} disabled={current === total}><ChevronsRight size={13} /></button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => { setMatPage(1); }, [searchTerm, categoryFilter, matPer]);

  // ============================================
  // STATS + CHART DATA
  // ============================================
  const stats = useMemo(() => {
    const totalValue = materials.reduce((s, m) => s + (m.quantity || 0) * (m.unitPrice || 0), 0);
    const lowStock = materials.filter(m => m.reorderLevel > 0 && m.quantity <= m.reorderLevel).length;
    return {
      totalMaterials: materials.length,
      totalCategories: new Set(materials.map(m => m.category)).size,
      totalValue,
      lowStock,
      totalBOMs: boms.length,
      totalBOMValue: boms.reduce((s, b) => s + (b.totalCost || 0), 0)
    };
  }, [materials, boms]);

  const categoryChartData = useMemo(() => {
    const map = {};
    materials.forEach(m => { map[m.category] = (map[m.category] || 0) + 1; });
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];
    return Object.entries(map)
      .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [materials]);

  const categoryValueData = useMemo(() => {
    const map = {};
    materials.forEach(m => { map[m.category] = (map[m.category] || 0) + (m.quantity || 0) * (m.unitPrice || 0); });
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    return Object.entries(map)
      .map(([name, value], i) => ({
        name: name.length > 12 ? name.slice(0, 12) + '…' : name,
        value, color: palette[i % palette.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [materials]);

  const kpiItems = [
    { id: 'materials', icon: Package, label: 'Total Materials',
      value: stats.totalMaterials,
      meta: `${stats.totalCategories} categories`,
      color: '#3b82f6', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up' },
    { id: 'value', icon: DollarSign, label: 'Inventory Value',
      value: Utils.formatCurrencyShort(stats.totalValue),
      meta: `${materials.length} items`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'boms', icon: ClipboardList, label: 'Saved BOMs',
      value: stats.totalBOMs,
      meta: `${Utils.formatCurrencyShort(stats.totalBOMValue)} total`,
      color: '#8b5cf6', accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)', trend: 'up' },
    { id: 'low', icon: AlertCircle, label: 'Low Stock',
      value: stats.lowStock,
      meta: 'Need reordering',
      color: '#ef4444', accent: 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: stats.lowStock > 0 ? 'down' : 'flat' }
  ];

  const cardDetails = {
    materials: { title: 'Total Materials', details: [
      { label: 'Total', value: stats.totalMaterials },
      { label: 'Categories', value: stats.totalCategories },
      { label: 'Low Stock', value: stats.lowStock },
      { label: 'Total Value', value: Utils.formatCurrency(stats.totalValue) }
    ]},
    value: { title: 'Inventory Value', details: [
      { label: 'Total Value', value: Utils.formatCurrency(stats.totalValue) },
      { label: 'Items', value: materials.length },
      { label: 'Avg Value', value: materials.length ? Utils.formatCurrency(stats.totalValue / materials.length) : '0' },
      { label: 'Highest', value: Utils.formatCurrency(Math.max(...materials.map(m => (m.quantity || 0) * (m.unitPrice || 0)), 0)) }
    ]},
    boms: { title: 'Saved BOMs', details: [
      { label: 'Total BOMs', value: stats.totalBOMs },
      { label: 'Total Value', value: Utils.formatCurrency(stats.totalBOMValue) },
      { label: 'Avg BOM', value: stats.totalBOMs ? Utils.formatCurrency(stats.totalBOMValue / stats.totalBOMs) : '0' },
      { label: 'Materials', value: materials.length }
    ]},
    low: { title: 'Low Stock', details: [
      { label: 'Low Stock', value: stats.lowStock },
      { label: 'Total', value: materials.length },
      { label: 'Rate', value: `${materials.length ? ((stats.lowStock / materials.length) * 100).toFixed(1) : 0}%` },
      { label: 'In Stock', value: materials.length - stats.lowStock }
    ]}
  };

  const handleCardHover = (id, e) => { setHoveredCard(id); setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 }); };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // OVERVIEW TAB
  // ============================================
  const renderOverviewTab = () => (
    <div className="bom-view">
      <div className="bom-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="bom-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="bom-kpi-accent" style={{ background: item.accent }} />
              <div className="bom-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="bom-kpi-content">
                <span className="bom-kpi-label">{item.label}</span>
                <span className="bom-kpi-value">{item.value}</span>
                <span className="bom-kpi-meta">{item.meta}</span>
              </div>
              <div className={`bom-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUpIcon size={15} />}
                {item.trend === 'down' && <TrendingDown size={15} />}
                {item.trend === 'flat' && <Minus size={15} />}
              </div>
            </div>
          );
        })}
      </div>

      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="bom-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="bom-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="bom-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="bom-tooltip-row">
                <span className="bom-tooltip-label">{d.label}</span>
                <span className="bom-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bom-grid-1-1">
        <div className="bom-card">
          <div className="bom-card-header">
            <div className="bom-card-title">
              <span className="bom-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Materials by Category</h4>
                <span>{stats.totalCategories} categories</span>
              </div>
            </div>
          </div>
          {categoryChartData.length > 0 ? (
            <div className="bom-donut-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryChartData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={52} outerRadius={85} paddingAngle={3} stroke="none">
                    {categoryChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="bom-donut-legend">
                {categoryChartData.map((d, i) => (
                  <div key={i} className="bom-donut-item">
                    <span className="bom-donut-dot" style={{ background: d.color }} />
                    <span className="bom-donut-name">{d.name}</span>
                    <span className="bom-donut-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="bom-empty-mini">No materials</div>}
        </div>

        <div className="bom-card">
          <div className="bom-card-header">
            <div className="bom-card-title">
              <span className="bom-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <BarChart3 size={16} />
              </span>
              <div>
                <h4>Value by Category</h4>
                <span>Quantity × Unit Price</span>
              </div>
            </div>
          </div>
          {categoryValueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryValueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
                <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={36}>
                  {categoryValueData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="bom-empty-mini">No data</div>}
        </div>
      </div>

      {boms.length > 0 && (
        <div className="bom-card">
          <div className="bom-card-header">
            <div className="bom-card-title">
              <span className="bom-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <ClipboardList size={16} />
              </span>
              <div>
                <h4>Recent BOMs</h4>
                <span>{boms.length} saved bills</span>
              </div>
            </div>
          </div>
          <div className="bom-table-wrap">
            <table className="bom-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th className="right">Materials</th>
                  <th className="right">Labor</th>
                  <th className="right">Overhead</th>
                  <th className="right">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {boms.slice(-5).reverse().map((b, i) => (
                  <tr key={b.id} style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                    <td><strong>{b.projectName}</strong></td>
                    <td className="right">{b.materials?.length || 0}</td>
                    <td className="right">{Utils.formatCurrencyShort(b.labourCost || 0)}</td>
                    <td className="right">{Utils.formatCurrencyShort(b.overhead || 0)}</td>
                    <td className="right bom-td-green"><strong>{Utils.formatCurrencyShort(b.totalCost || 0)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // MATERIALS TAB
  // ============================================
  const renderMaterialsTab = () => {
    const { total, page, items } = paginate(filteredMaterials, matPage, matPer);
    if (page !== matPage) setMatPage(page);
    return (
      <div className="bom-view">
        <div className="bom-filters">
          <div className="bom-search">
            <Search size={15} className="bom-search-icon" />
            <input type="text" placeholder="Search materials..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button className="bom-search-clear" onClick={() => setSearchTerm('')}><X size={13} /></button>
            )}
          </div>
          <div className="bom-filter-group">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bom-select">
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <span className="bom-result-count">
            {filteredMaterials.length} of {materials.length}
          </span>
          <button className="bom-btn bom-btn-primary" onClick={() => { resetMaterialForm(); setShowMaterialForm(true); }}>
            <Plus size={14} /> Add Material
          </button>
        </div>

        {filteredMaterials.length === 0 ? (
          <div className="bom-empty">
            <div className="bom-empty-icon"><Package size={40} /></div>
            <h3>No Materials Found</h3>
            <p>{materials.length === 0 ? 'Add your first material to start building BOMs.' : 'Try adjusting your filters.'}</p>
            <button className="bom-btn bom-btn-primary" onClick={() => { resetMaterialForm(); setShowMaterialForm(true); }}>
              <Plus size={14} /> Add Material
            </button>
          </div>
        ) : (
          <>
            <div className="bom-materials-grid">
              {items.map((m, i) => {
                const low = m.reorderLevel > 0 && m.quantity <= m.reorderLevel;
                return (
                  <div key={m.id} className="bom-material-card" style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
                    <div className="bom-material-accent" style={{
                      background: low ? 'linear-gradient(90deg,#ef4444,#f87171)' : 'linear-gradient(90deg,#10b981,#3b82f6)'
                    }} />
                    <div className="bom-material-header">
                      <div className="bom-material-icon"><Package size={18} /></div>
                      <div className="bom-material-title">
                        <div className="bom-material-name">{m.name}</div>
                        <div className="bom-material-category">{m.category}</div>
                      </div>
                      {low && (
                        <span className="bom-low-stock-badge"><AlertCircle size={10} /> Low</span>
                      )}
                    </div>
                    <div className="bom-material-body">
                      <div className="bom-material-details">
                        <div className="bom-detail-item">
                          <span className="bom-detail-label">Qty</span>
                          <span className={`bom-detail-value ${low ? 'bom-td-red' : ''}`}>
                            {m.quantity} {m.unit}
                          </span>
                        </div>
                        <div className="bom-detail-item">
                          <span className="bom-detail-label">Price</span>
                          <span className="bom-detail-value bom-td-green">
                            {Utils.formatCurrency(m.unitPrice)}
                          </span>
                        </div>
                        <div className="bom-detail-item">
                          <span className="bom-detail-label">Value</span>
                          <span className="bom-detail-value">
                            {Utils.formatCurrencyShort((m.quantity || 0) * (m.unitPrice || 0))}
                          </span>
                        </div>
                        <div className="bom-detail-item">
                          <span className="bom-detail-label">Reorder</span>
                          <span className="bom-detail-value">{m.reorderLevel || 0}</span>
                        </div>
                      </div>
                      {m.supplier && (
                        <div className="bom-material-meta">
                          <Building2 size={11} /> {m.supplier}
                        </div>
                      )}
                    </div>
                    <div className="bom-material-footer">
                      <div className="bom-material-actions">
                        <button className="bom-icon-btn bom-icon-edit" title="Edit"
                          onClick={() => startEditMaterial(m)}>
                          <Edit size={13} />
                        </button>
                        <button className="bom-icon-btn bom-icon-add" title="Add to BOM"
                          onClick={() => addMaterialToBOM(m)}>
                          <PlusCircle size={13} />
                        </button>
                        <button className="bom-icon-btn bom-icon-danger" title="Delete"
                          onClick={() => deleteMaterial(m.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {renderPagination(matPage, total, matPer, setMatPer, setMatPage, filteredMaterials.length, 'materials')}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // BOM TAB
  // ============================================
  const renderBOMTab = () => {
    const { total, page, items } = paginate([...boms].reverse(), bomPage, bomPer);
    if (page !== bomPage) setBomPage(page);
    return (
      <div className="bom-view">
        <div className="bom-grid-2-1">
          {/* BOM Form */}
          <div className="bom-card">
            <div className="bom-card-header">
              <div className="bom-card-title">
                <span className="bom-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                  <ClipboardList size={16} />
                </span>
                <div>
                  <h4>Create BOM</h4>
                  <span>Bill of Materials builder</span>
                </div>
              </div>
            </div>
            <form onSubmit={saveBOM}>
              <div className="bom-form-row">
                <div className="bom-form-group">
                  <label>Project Name <span className="bom-required">*</span></label>
                  <input type="text" value={bomForm.projectName} required
                    onChange={e => setBomForm({ ...bomForm, projectName: e.target.value })}
                    placeholder="Project name" className="bom-form-input" />
                </div>
                <div className="bom-form-group">
                  <label>Site</label>
                  <select value={bomForm.siteId}
                    onChange={e => setBomForm({ ...bomForm, siteId: e.target.value })}
                    className="bom-form-select">
                    <option value="">Select Site</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="bom-materials-list">
                <div className="bom-materials-header">
                  <h4>Materials ({bomForm.materials.length})</h4>
                </div>
                {bomForm.materials.length === 0 ? (
                  <div className="bom-empty-mini">Add materials from the Materials tab.</div>
                ) : (
                  bomForm.materials.map((mat, index) => (
                    <div key={index} className="bom-material-row">
                      <div className="bom-mat-info">
                        <span className="bom-mat-name">{mat.name}</span>
                        <span className="bom-mat-unit">{mat.unit}</span>
                      </div>
                      <div className="bom-mat-controls">
                        <input type="number" step="0.01" value={mat.quantity}
                          onChange={e => updateBOMQuantity(index, e.target.value)}
                          className="bom-qty-input" />
                        <span className="bom-mat-cost">{Utils.formatCurrency(mat.totalCost)}</span>
                        <button type="button" className="bom-icon-btn bom-icon-danger"
                          onClick={() => removeFromBOM(index)}>
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bom-form-row">
                <div className="bom-form-group">
                  <label>Estimated Hours</label>
                  <input type="number" step="0.5" value={bomForm.estimatedHours}
                    onChange={e => setBomForm({ ...bomForm, estimatedHours: e.target.value })}
                    placeholder="0" className="bom-form-input" />
                </div>
                <div className="bom-form-group">
                  <label>Labour Cost (BD)</label>
                  <input type="number" step="0.001" value={bomForm.labourCost}
                    onChange={e => setBomForm({ ...bomForm, labourCost: e.target.value })}
                    placeholder="0.000" className="bom-form-input" />
                </div>
              </div>

              <div className="bom-form-group">
                <label>Overhead Percentage (%)</label>
                <input type="number" step="0.1" value={bomForm.overheadPercentage}
                  onChange={e => setBomForm({ ...bomForm, overheadPercentage: e.target.value })}
                  placeholder="10" className="bom-form-input" />
              </div>

              {bomForm.materials.length > 0 && (
                <div className="bom-summary">
                  {(() => {
                    const mc = bomForm.materials.reduce((s, m) => s + m.totalCost, 0);
                    const lc = parseFloat(bomForm.labourCost) || 0;
                    const oh = (mc + lc) * (parseFloat(bomForm.overheadPercentage) / 100);
                    return (
                      <>
                        <div className="bom-summary-row"><span>Material Cost:</span><span>{Utils.formatCurrency(mc)}</span></div>
                        <div className="bom-summary-row"><span>Labour Cost:</span><span>{Utils.formatCurrency(lc)}</span></div>
                        <div className="bom-summary-row"><span>Overhead ({bomForm.overheadPercentage}%):</span><span>{Utils.formatCurrency(oh)}</span></div>
                        <div className="bom-summary-row total"><span>Total Cost:</span><strong>{Utils.formatCurrency(mc + lc + oh)}</strong></div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="bom-form-actions">
                <button type="submit" className="bom-btn bom-btn-primary" disabled={bomForm.materials.length === 0}>
                  <Save size={14} /> Save BOM
                </button>
              </div>
            </form>
          </div>

          {/* Saved BOMs */}
          <div className="bom-card">
            <div className="bom-card-header">
              <div className="bom-card-title">
                <span className="bom-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                  <Layers size={16} />
                </span>
                <div>
                  <h4>Saved BOMs</h4>
                  <span>{boms.length} bills</span>
                </div>
              </div>
            </div>
            {boms.length === 0 ? (
              <div className="bom-empty-mini">No BOMs saved yet.</div>
            ) : (
              <>
                <div className="bom-saved-list">
                  {items.map(b => (
                    <div key={b.id} className="bom-saved-item">
                      <div className="bom-saved-header">
                        <div className="bom-saved-name">{b.projectName}</div>
                        <div className="bom-saved-date">
                          <Calendar size={10} /> {Utils.formatDate(b.createdAt)}
                        </div>
                      </div>
                      <div className="bom-saved-body">
                        <div className="bom-saved-stat">
                          <span className="bom-saved-label">Materials</span>
                          <span className="bom-saved-value">{b.materials?.length || 0}</span>
                        </div>
                        <div className="bom-saved-stat">
                          <span className="bom-saved-label">Total Cost</span>
                          <span className="bom-saved-value bom-td-green">{Utils.formatCurrencyShort(b.totalCost)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {renderPagination(bomPage, total, bomPer, setBomPer, setBomPage, boms.length, 'BOMs')}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // PREDICTION TAB
  // ============================================
  const renderPredictionTab = () => (
    <div className="bom-view">
      <div className="bom-card">
        <div className="bom-card-header">
          <div className="bom-card-title">
            <span className="bom-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
              <Sparkles size={16} />
            </span>
            <div>
              <h4>Material Prediction Engine</h4>
              <span>Estimate materials based on project parameters</span>
            </div>
          </div>
        </div>
        <div className="bom-form-row">
          <div className="bom-form-group">
            <label>Project Type</label>
            <select value={predictionParams.projectType}
              onChange={e => setPredictionParams({ ...predictionParams, projectType: e.target.value })}
              className="bom-form-select">
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
            </select>
          </div>
          <div className="bom-form-group">
            <label>Area (m²)</label>
            <input type="number" value={predictionParams.area}
              onChange={e => setPredictionParams({ ...predictionParams, area: e.target.value })}
              placeholder="Area in m²" className="bom-form-input" />
          </div>
        </div>
        <div className="bom-form-row">
          <div className="bom-form-group">
            <label>Floors</label>
            <input type="number" min="1" value={predictionParams.floors}
              onChange={e => setPredictionParams({ ...predictionParams, floors: e.target.value })}
              className="bom-form-input" />
          </div>
          <div className="bom-form-group">
            <label>Material Type</label>
            <select value={predictionParams.materialType}
              onChange={e => setPredictionParams({ ...predictionParams, materialType: e.target.value })}
              className="bom-form-select">
              <option value="all">All Materials</option>
              <option value="cement">Cement</option>
              <option value="steel">Steel</option>
              <option value="sand">Sand</option>
              <option value="gravel">Gravel</option>
              <option value="wood">Wood</option>
              <option value="bricks">Bricks</option>
            </select>
          </div>
        </div>
        <div className="bom-form-actions">
          <button className="bom-btn bom-btn-primary" onClick={generatePrediction}>
            <TrendingUpIcon size={14} /> Generate Prediction
          </button>
        </div>
      </div>

      {predictionResult && (
        <>
          <div className="bom-pred-summary">
            <div className="bom-pred-item">
              <span className="bom-pred-label">Project Type</span>
              <span className="bom-pred-value" style={{ textTransform: 'capitalize' }}>{predictionResult.projectType}</span>
            </div>
            <div className="bom-pred-item">
              <span className="bom-pred-label">Total Area</span>
              <span className="bom-pred-value">{predictionResult.totalArea.toFixed(1)} m²</span>
            </div>
            <div className="bom-pred-item">
              <span className="bom-pred-label">Floors</span>
              <span className="bom-pred-value">{predictionResult.floors}</span>
            </div>
            <div className="bom-pred-item highlight">
              <span className="bom-pred-label">Estimated Cost</span>
              <span className="bom-pred-value bom-td-green">{Utils.formatCurrency(predictionResult.estimatedCost)}</span>
            </div>
            <div className="bom-pred-item">
              <span className="bom-pred-label">Labor Hours</span>
              <span className="bom-pred-value">{predictionResult.laborHours.toFixed(1)} hrs</span>
            </div>
            <div className="bom-pred-item">
              <span className="bom-pred-label">Timeline</span>
              <span className="bom-pred-value">{predictionResult.timeline} days</span>
            </div>
          </div>

          <div className="bom-card">
            <div className="bom-card-header">
              <div className="bom-card-title">
                <span className="bom-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                  <Package size={16} />
                </span>
                <div>
                  <h4>Required Materials</h4>
                  <span>{Object.keys(predictionResult.materials).length} material types</span>
                </div>
              </div>
            </div>
            <div className="bom-pred-materials-grid">
              {Object.entries(predictionResult.materials).map(([key, value]) => (
                <div key={key} className="bom-pred-material">
                  <div className="bom-pred-mat-name">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
                  <div className="bom-pred-mat-qty">{value.quantity.toFixed(2)} {value.unit}</div>
                  {value.cost && (
                    <div className="bom-pred-mat-cost">
                      {Utils.formatCurrency(value.cost)}
                      {value.estimatedPrice && <span className="bom-est-badge">*</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="bom-pred-actions">
              <button className="bom-btn bom-btn-secondary" onClick={() => {
                const list = [...materials];
                Object.entries(predictionResult.materials).forEach(([key, value]) => {
                  const existing = list.find(m => m.name.toLowerCase().includes(key));
                  if (!existing) {
                    list.push({
                      id: Date.now().toString() + Math.random().toString(36).slice(2, 5),
                      name: key.charAt(0).toUpperCase() + key.slice(1),
                      category: 'Construction', unit: value.unit,
                      unitPrice: 50, quantity: 0, supplier: '',
                      reorderLevel: value.quantity * 0.2
                    });
                  }
                });
                updateData({ materials: list });
                alert('Predicted materials added to inventory!');
              }}>
                <PlusCircle size={14} /> Add to Inventory
              </button>
              <button className="bom-btn bom-btn-primary" onClick={() => {
                const newMaterials = Object.entries(predictionResult.materials).map(([key, value]) => ({
                  materialId: Date.now().toString() + Math.random().toString(36).slice(2, 5),
                  name: key.charAt(0).toUpperCase() + key.slice(1),
                  unit: value.unit,
                  unitPrice: value.cost ? value.cost / value.quantity : 50,
                  quantity: value.quantity,
                  totalCost: value.cost || value.quantity * 50
                }));
                const bom = {
                  id: Date.now().toString(),
                  projectName: `${predictionResult.projectType} Project - ${Utils.today()}`,
                  siteId: '', materials: newMaterials,
                  estimatedHours: predictionResult.laborHours.toString(),
                  labourCost: (predictionResult.laborHours * 8).toString(),
                  overheadPercentage: '10',
                  totalMaterialCost: predictionResult.estimatedCost,
                  overhead: predictionResult.estimatedCost * 0.1,
                  totalCost: predictionResult.estimatedCost * 1.1,
                  createdAt: new Date().toISOString()
                };
                updateData({ bom: [...boms, bom] });
                alert('BOM created from prediction!');
              }}>
                <ClipboardList size={14} /> Create BOM
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ============================================
  // MATERIAL FORM MODAL
  // ============================================
  const renderMaterialFormModal = () => (
    <ModalPortal>
      <div className="bom-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowMaterialForm(false); resetMaterialForm(); } }}>
        <div className="bom-modal" onClick={e => e.stopPropagation()}>
          <div className="bom-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <div className="bom-modal-header-left">
              <div className="bom-modal-icon">
                {editingMaterial ? <Edit size={18} /> : <Package size={18} />}
              </div>
              <div>
                <h3>{editingMaterial ? 'Edit Material' : 'New Material'}</h3>
                <p className="bom-modal-sub">{editingMaterial ? 'Update material details' : 'Add a new material'}</p>
              </div>
            </div>
            <button className="bom-modal-close" onClick={() => { setShowMaterialForm(false); resetMaterialForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="bom-modal-body">
            <form onSubmit={handleMaterialSubmit}>
              <div className="bom-form-row">
                <div className="bom-form-group">
                  <label>Name <span className="bom-required">*</span></label>
                  <input type="text" value={materialForm.name} required autoFocus
                    onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })}
                    placeholder="Material name" className="bom-form-input" />
                </div>
                <div className="bom-form-group">
                  <label>Category</label>
                  <select value={materialForm.category}
                    onChange={e => setMaterialForm({ ...materialForm, category: e.target.value })}
                    className="bom-form-select">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="bom-form-row">
                <div className="bom-form-group">
                  <label>Unit</label>
                  <select value={materialForm.unit}
                    onChange={e => setMaterialForm({ ...materialForm, unit: e.target.value })}
                    className="bom-form-select">
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="bom-form-group">
                  <label>Unit Price (BD)</label>
                  <input type="number" step="0.001" value={materialForm.unitPrice}
                    onChange={e => setMaterialForm({ ...materialForm, unitPrice: e.target.value })}
                    placeholder="0.000" className="bom-form-input" />
                </div>
              </div>
              <div className="bom-form-row">
                <div className="bom-form-group">
                  <label>Current Quantity</label>
                  <input type="number" step="0.01" value={materialForm.quantity}
                    onChange={e => setMaterialForm({ ...materialForm, quantity: e.target.value })}
                    placeholder="0" className="bom-form-input" />
                </div>
                <div className="bom-form-group">
                  <label>Reorder Level</label>
                  <input type="number" step="0.01" value={materialForm.reorderLevel}
                    onChange={e => setMaterialForm({ ...materialForm, reorderLevel: e.target.value })}
                    placeholder="0" className="bom-form-input" />
                </div>
              </div>
              <div className="bom-form-group">
                <label>Supplier</label>
                <input type="text" value={materialForm.supplier}
                  onChange={e => setMaterialForm({ ...materialForm, supplier: e.target.value })}
                  placeholder="Supplier name" className="bom-form-input" />
              </div>
              <div className="bom-form-actions">
                <button type="submit" className="bom-btn bom-btn-primary">
                  <Save size={14} /> {editingMaterial ? 'Update' : 'Add Material'}
                </button>
                <button type="button" className="bom-btn bom-btn-secondary"
                  onClick={() => { setShowMaterialForm(false); resetMaterialForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className={`bom-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="bom-ambient">
        <div className="bom-orb bom-orb-1" />
        <div className="bom-orb bom-orb-2" />
        <div className="bom-orb bom-orb-3" />
      </div>

      <div className="bom-header">
        <div className="bom-header-left">
          <div className="bom-header-icon">
            <ClipboardList size={22} />
            <span className="bom-header-badge"><Sparkles size={10} /> BOM</span>
          </div>
          <div>
            <h2>Bill of Materials &amp; Prediction</h2>
            <p className="bom-header-subtitle">
              {stats.totalMaterials} materials · {stats.totalBOMs} BOMs · {Utils.formatCurrencyShort(stats.totalValue)} value
            </p>
          </div>
        </div>
        <div className="bom-header-right">
          <button className="bom-btn bom-btn-ghost" onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="bom-btn bom-btn-primary" onClick={() => { resetMaterialForm(); setShowMaterialForm(true); }}>
            <Plus size={14} /> New Material
          </button>
        </div>
      </div>

      <div className="bom-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'materials', label: 'Materials', icon: Package, badge: materials.length },
          { id: 'bom', label: 'BOM', icon: ClipboardList, badge: boms.length },
          { id: 'prediction', label: 'Prediction', icon: TrendingUpIcon }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`bom-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="bom-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'materials' && renderMaterialsTab()}
      {activeTab === 'bom' && renderBOMTab()}
      {activeTab === 'prediction' && renderPredictionTab()}

      {showMaterialForm && renderMaterialFormModal()}
    </div>
  );
};

export default BOMComponent;