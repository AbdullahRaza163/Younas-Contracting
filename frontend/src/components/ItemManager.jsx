// src/components/ItemManager.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Edit, Trash2, Package, Plus, Save, X, Search, RefreshCw,
   Tag, Box, Layers, Award, Star, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle, User, Calendar, Building2, Settings,
  Zap, Shield, Crown, Sparkles, Briefcase, Timer, Activity, Gauge,
  ArrowUpRight, ArrowDownRight, Info, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Filter, Clock, FileText, Wallet,
  CreditCard, Banknote, Percent, HardHat, Boxes, FolderKanban,
  BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon,
  LayoutDashboard, Flame, Target, Minus, Crown as CrownIcon
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import Utils from '../utils/Utils';
import './ItemManager.css';

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
    <div className="im-chart-tooltip">
      {label && <div className="im-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="im-chart-tooltip-row">
          <span className="im-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="im-chart-tooltip-name">{p.name}</span>
          <span className="im-chart-tooltip-val">
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
const ItemManagerComponent = ({ data, addItem, updateItem, deleteItem }) => {
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // overview | items
  const [mounted, setMounted] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    name: '', category: 'Materials', unit: 'pcs', unitPrice: '',
    description: '', sku: '', taxRate: '0', isTaxable: false
  });

  const categories = [
    'Materials', 'Labour', 'Equipment', 'Transport', 'Services',
    'Maintenance', 'Electrical', 'Plumbing', 'Carpentry', 'Painting',
    'Tiling', 'Marble', 'Steel', 'Cement', 'Sand', 'Gravel'
  ];

  const units = ['SQ.M', 'SQ.FT', 'PCS', 'KG', 'TON', 'M3', 'M2', 'FT2', 'LITERS', 'HOURS', 'DAYS', 'BOX', 'ROLL'];

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ============================================
  // STATS
  // ============================================
  const items = useMemo(() => data.items || [], [data.items]);
  const totalItems = items.length;
  const totalCategories = new Set(items.map(i => i.category)).size;
  const totalValue = items.reduce((s, i) => s + (i.unitPrice || 0), 0);
  const taxableItems = items.filter(i => i.isTaxable).length;
  const avgPrice = totalItems > 0 ? totalValue / totalItems : 0;
  const maxPrice = totalItems > 0 ? Math.max(...items.map(i => i.unitPrice || 0)) : 0;
  const minPrice = totalItems > 0 ? Math.min(...items.map(i => i.unitPrice || 0)) : 0;

  // Most popular category
  const mostPopularCategory = useMemo(() => {
    const map = {};
    items.forEach(i => { map[i.category] = (map[i.category] || 0) + 1; });
    const entries = Object.entries(map);
    if (!entries.length) return null;
    return entries.sort((a, b) => b[1] - a[1])[0];
  }, [items]);

  // ============================================
  // FILTERED
  // ============================================
  const filteredItems = useMemo(() => {
    let filtered = items;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(i =>
        i.name?.toLowerCase().includes(s) ||
        i.category?.toLowerCase().includes(s) ||
        (i.sku && i.sku.toLowerCase().includes(s)) ||
        (i.description && i.description.toLowerCase().includes(s))
      );
    }
    if (categoryFilter !== 'all') filtered = filtered.filter(i => i.category === categoryFilter);
    return filtered;
  }, [items, searchTerm, categoryFilter]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, categoryFilter, itemsPerPage, viewMode]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  const getPageNumbers = () => {
    const pages = []; const max = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // ============================================
  // CHART DATA
  // ============================================
  const categoryChartData = useMemo(() => {
    const map = {};
    items.forEach(i => { map[i.category] = (map[i.category] || 0) + 1; });
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];
    return Object.entries(map)
      .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [items]);

  const categoryValueData = useMemo(() => {
    const map = {};
    items.forEach(i => { map[i.category] = (map[i.category] || 0) + (i.unitPrice || 0); });
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'];
    return Object.entries(map)
      .map(([name, value], i) => ({
        name: name.length > 12 ? name.slice(0, 12) + '…' : name,
        fullName: name,
        value,
        color: palette[i % palette.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [items]);

  const taxableChartData = useMemo(() => ([
    { name: 'Taxable', value: taxableItems, color: '#10b981' },
    { name: 'Non-Taxable', value: totalItems - taxableItems, color: '#94a3b8' }
  ].filter(d => d.value > 0)), [taxableItems, totalItems]);

  const topItems = useMemo(() => (
    [...items]
      .sort((a, b) => (b.unitPrice || 0) - (a.unitPrice || 0))
      .slice(0, 8)
      .map(i => ({
        name: i.name.length > 14 ? i.name.slice(0, 14) + '…' : i.name,
        value: i.unitPrice || 0,
        color: '#10b981'
      }))
  ), [items]);

  // ============================================
  // KPI CARDS
  // ============================================
  const kpiItems = [
    { id: 'total', icon: Package, label: 'Total Items', value: totalItems,
      meta: `${totalCategories} categories`,
      color: '#3b82f6', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up' },
    { id: 'categories', icon: Layers, label: 'Categories', value: totalCategories,
      meta: mostPopularCategory ? `Top: ${mostPopularCategory[0]}` : '—',
      color: '#8b5cf6', accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)', trend: 'up' },
    { id: 'value', icon: Banknote, label: 'Total Value',
      value: Utils.formatCurrencyShort(totalValue),
      meta: `Avg ${Utils.formatCurrencyShort(avgPrice)}`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'taxable', icon: Percent, label: 'Taxable Items', value: taxableItems,
      meta: `${totalItems > 0 ? ((taxableItems / totalItems) * 100).toFixed(0) : 0}% of items`,
      color: '#f59e0b', accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
      trend: taxableItems > 0 ? 'up' : 'flat' }
  ];

  const cardDetails = {
    total: { title: 'Total Items', details: [
      { label: 'Total', value: totalItems },
      { label: 'Categories', value: totalCategories },
      { label: 'Total Value', value: Utils.formatCurrency(totalValue) },
      { label: 'Avg Price', value: Utils.formatCurrency(avgPrice) }
    ]},
    categories: { title: 'Categories', details: [
      { label: 'Total', value: totalCategories },
      { label: 'Most Popular', value: mostPopularCategory ? mostPopularCategory[0] : 'N/A' },
      { label: 'Items in Top', value: mostPopularCategory ? mostPopularCategory[1] : 0 },
      { label: 'Total Items', value: totalItems }
    ]},
    value: { title: 'Total Value', details: [
      { label: 'Total', value: Utils.formatCurrency(totalValue) },
      { label: 'Avg', value: Utils.formatCurrency(avgPrice) },
      { label: 'Highest', value: Utils.formatCurrency(maxPrice) },
      { label: 'Lowest', value: Utils.formatCurrency(minPrice) }
    ]},
    taxable: { title: 'Taxable Items', details: [
      { label: 'Taxable', value: taxableItems },
      { label: 'Non-Taxable', value: totalItems - taxableItems },
      { label: 'Total', value: totalItems },
      { label: 'Rate', value: `${totalItems > 0 ? ((taxableItems / totalItems) * 100).toFixed(1) : 0}%` }
    ]}
  };

  const handleCardHover = (id, e) => {
    setHoveredCard(id);
    setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // CRUD
  // ============================================
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Item name is required');
      return;
    }
    const item = {
      id: editingId || Date.now().toString(),
      ...formData,
      unitPrice: parseFloat(formData.unitPrice) || 0,
      taxRate: parseFloat(formData.taxRate) || 0,
      isTaxable: formData.isTaxable,
      createdAt: new Date().toISOString()
    };
    if (editingId) {
      updateItem(editingId, item);
      setEditingId(null);
    } else {
      addItem(item);
    }
    resetForm();
    setShowForm(false);
  };

  const resetForm = () => {
    setFormData({
      name: '', category: 'Materials', unit: 'pcs', unitPrice: '',
      description: '', sku: '', taxRate: '0', isTaxable: false
    });
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || '',
      category: item.category || 'Materials',
      unit: item.unit || 'pcs',
      unitPrice: item.unitPrice?.toString() || '',
      description: item.description || '',
      sku: item.sku || '',
      taxRate: item.taxRate?.toString() || '0',
      isTaxable: item.isTaxable || false
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    deleteItem(id);
    setShowDeleteConfirm(null);
  };

  // ============================================
  // OVERVIEW TAB
  // ============================================
  const renderOverviewTab = () => (
    <div className="im-view">
      <div className="im-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="im-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="im-kpi-accent" style={{ background: item.accent }} />
              <div className="im-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="im-kpi-content">
                <span className="im-kpi-label">{item.label}</span>
                <span className="im-kpi-value">{item.value}</span>
                <span className="im-kpi-meta">{item.meta}</span>
              </div>
              <div className={`im-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={15} />}
                {item.trend === 'down' && <TrendingDown size={15} />}
                {item.trend === 'flat' && <Minus size={15} />}
              </div>
            </div>
          );
        })}
      </div>

      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="im-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="im-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="im-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="im-tooltip-row">
                <span className="im-tooltip-label">{d.label}</span>
                <span className="im-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 1 — category distribution donut + taxable donut */}
      <div className="im-grid-1-1">
        <div className="im-card">
          <div className="im-card-header">
            <div className="im-card-title">
              <span className="im-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Items by Category</h4>
                <span>{totalCategories} categories</span>
              </div>
            </div>
          </div>
          {categoryChartData.length > 0 ? (
            <div className="im-donut-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryChartData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={52} outerRadius={85} paddingAngle={3} stroke="none">
                    {categoryChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="im-donut-legend">
                {categoryChartData.map((d, i) => (
                  <div key={i} className="im-donut-item">
                    <span className="im-donut-dot" style={{ background: d.color }} />
                    <span className="im-donut-name">{d.name}</span>
                    <span className="im-donut-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="im-empty-mini">No items</div>}
        </div>

        <div className="im-card">
          <div className="im-card-header">
            <div className="im-card-title">
              <span className="im-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Percent size={16} />
              </span>
              <div>
                <h4>Taxability</h4>
                <span>Taxable vs non-taxable</span>
              </div>
            </div>
          </div>
          {taxableChartData.length > 0 ? (
            <div className="im-donut-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={taxableChartData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={52} outerRadius={85} paddingAngle={3} stroke="none">
                    {taxableChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="im-donut-legend">
                {taxableChartData.map((d, i) => (
                  <div key={i} className="im-donut-item">
                    <span className="im-donut-dot" style={{ background: d.color }} />
                    <span className="im-donut-name">{d.name}</span>
                    <span className="im-donut-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="im-empty-mini">No items</div>}
        </div>
      </div>

      {/* Row 2 — Top items bar chart */}
      <div className="im-card">
        <div className="im-card-header">
          <div className="im-card-title">
            <span className="im-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
              <CrownIcon size={16} />
            </span>
            <div>
              <h4>Most Expensive Items</h4>
              <span>Top 8 by unit price</span>
            </div>
          </div>
        </div>
        {topItems.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topItems} layout="vertical" margin={{ left: 10, right: 20 }}>
              <defs>
                <linearGradient id="imTopGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11}
                tickLine={false} axisLine={false} width={110} />
              <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
                cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" name="Unit Price" fill="url(#imTopGrad)" radius={[0, 8, 8, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="im-empty-mini">No items</div>}
      </div>

      {/* Row 3 — Category value */}
      <div className="im-card">
        <div className="im-card-header">
          <div className="im-card-title">
            <span className="im-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
              <BarChart3 size={16} />
            </span>
            <div>
              <h4>Value by Category</h4>
              <span>Total unit price per category</span>
            </div>
          </div>
        </div>
        {categoryValueData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryValueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
                cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                {categoryValueData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="im-empty-mini">No data</div>}
      </div>
    </div>
  );

  // ============================================
  // ITEMS TAB
  // ============================================
  const renderItemsTab = () => (
    <div className="im-view">
      {/* Filters */}
      <div className="im-filters">
        <div className="im-search">
          <Search size={15} className="im-search-icon" />
          <input type="text" placeholder="Search by name, SKU, or category..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && (
            <button className="im-search-clear" onClick={() => setSearchTerm('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <div className="im-filter-group">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="im-select">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <span className="im-result-count">
          Showing {filteredItems.length} of {items.length}
        </span>
        <button className="im-btn im-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={14} /> New Item
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="im-empty">
          <div className="im-empty-icon"><Package size={40} /></div>
          <h3>No Items Found</h3>
          <p>{searchTerm || categoryFilter !== 'all' ? 'Try adjusting your filters.' : 'Add your first item to get started.'}</p>
          <button className="im-btn im-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> Add Item
          </button>
        </div>
      ) : (
        <>
          <div className="im-items-grid">
            {paginatedItems.map((item, index) => (
              <div key={item.id} className="im-item-card" style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
                <div className="im-item-card-accent" />
                <div className="im-item-header">
                  <div className="im-item-icon-wrapper">
                    <Package size={18} />
                  </div>
                  <div className="im-item-info">
                    <div className="im-item-name">{item.name}</div>
                    <div className="im-item-meta">
                      <span className="im-item-category">{item.category}</span>
                      {item.sku && <span className="im-item-sku">SKU: {item.sku}</span>}
                      <span className="im-item-unit">{item.unit}</span>
                    </div>
                  </div>
                  <div className="im-item-price">
                    <span className="im-price-value">{Utils.formatCurrency(item.unitPrice)}</span>
                    {item.isTaxable && <span className="im-tax-badge">+ VAT</span>}
                  </div>
                </div>

                {item.description && (
                  <div className="im-item-description">
                    <FileText size={12} /> {item.description}
                  </div>
                )}

                <div className="im-item-footer">
                  <div className="im-item-actions">
                    <button className="im-icon-btn im-icon-edit" onClick={() => handleEdit(item)}>
                      <Edit size={13} />
                    </button>
                    <button className="im-icon-btn im-icon-danger" onClick={() => setShowDeleteConfirm(item.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="im-pagination">
            <div className="im-pagination-info">
              Showing <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong>–
              <strong>{Math.min(currentPage * itemsPerPage, filteredItems.length)}</strong> of{' '}
              <strong>{filteredItems.length}</strong>
            </div>
            <div className="im-pagination-controls">
              <div className="im-pagination-items">
                <span>Show:</span>
                <select value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="im-pagination-select">
                  {[6, 9, 10, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="im-pagination-buttons">
                <button className="im-page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}>
                  <ChevronsLeft size={13} />
                </button>
                <button className="im-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft size={13} />
                </button>
                {getPageNumbers().map(p => (
                  <button key={p} className={`im-page-btn ${p === currentPage ? 'active' : ''}`}
                    onClick={() => goToPage(p)}>{p}</button>
                ))}
                <button className="im-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  <ChevronRight size={13} />
                </button>
                <button className="im-page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>
                  <ChevronsRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ============================================
  // FORM MODAL
  // ============================================
  const renderFormModal = () => (
    <ModalPortal>
      <div className="im-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
        <div className="im-modal" onClick={e => e.stopPropagation()}>
          <div className="im-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <div className="im-modal-header-left">
              <div className="im-modal-icon">
                {editingId ? <Edit size={18} /> : <Package size={18} />}
              </div>
              <div>
                <h3>{editingId ? 'Edit Item' : 'New Item'}</h3>
                <p className="im-modal-sub">{editingId ? 'Update item details' : 'Add a new item to inventory'}</p>
              </div>
            </div>
            <button className="im-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="im-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="im-form-row">
                <div className="im-form-group">
                  <label>Item Name <span className="im-required">*</span></label>
                  <input type="text" value={formData.name} required autoFocus
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter item name" className="im-form-input" />
                </div>
                <div className="im-form-group">
                  <label>Category</label>
                  <select value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="im-form-select">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="im-form-row">
                <div className="im-form-group">
                  <label>SKU</label>
                  <input type="text" value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g., MAT-001" className="im-form-input" />
                </div>
                <div className="im-form-group">
                  <label>Unit</label>
                  <select value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="im-form-select">
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              <div className="im-form-row">
                <div className="im-form-group">
                  <label>Unit Price (BD) <span className="im-required">*</span></label>
                  <input type="number" step="0.001" value={formData.unitPrice} required
                    onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                    placeholder="0.000" className="im-form-input" />
                </div>
                <div className="im-form-group">
                  <label>Description</label>
                  <input type="text" value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Item description" className="im-form-input" />
                </div>
              </div>

              <div className="im-form-row">
                <div className="im-form-group">
                  <label>Tax Rate (%)</label>
                  <input type="number" step="0.01" value={formData.taxRate}
                    onChange={e => setFormData({ ...formData, taxRate: e.target.value })}
                    placeholder="0" className="im-form-input" />
                </div>
                <div className="im-form-group">
                  <label>Tax</label>
                  <label className="im-checkbox">
                    <input type="checkbox" checked={formData.isTaxable}
                      onChange={e => setFormData({ ...formData, isTaxable: e.target.checked })} />
                    <span>Is Taxable</span>
                  </label>
                </div>
              </div>

              <div className="im-form-actions">
                <button type="submit" className="im-btn im-btn-primary">
                  <Save size={14} /> {editingId ? 'Update' : 'Add Item'}
                </button>
                <button type="button" className="im-btn im-btn-secondary"
                  onClick={() => { setShowForm(false); resetForm(); }}>
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
  // DELETE CONFIRM
  // ============================================
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm) return null;
    return (
      <ModalPortal>
        <div className="im-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(null); }}>
          <div className="im-modal im-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="im-modal-header" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
              <div className="im-modal-header-left">
                <div className="im-modal-icon"><Trash2 size={18} /></div>
                <div>
                  <h3>Delete Item</h3>
                  <p className="im-modal-sub">This action cannot be undone</p>
                </div>
              </div>
              <button className="im-modal-close" onClick={() => setShowDeleteConfirm(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="im-modal-body">
              <div className="im-delete-content">
                <div className="im-delete-icon"><AlertCircle size={40} /></div>
                <p className="im-delete-text">Are you sure you want to delete this item?</p>
                <p className="im-delete-subtext">This action cannot be undone.</p>
                <div className="im-delete-actions">
                  <button className="im-btn im-btn-danger" onClick={() => handleDelete(showDeleteConfirm)}>
                    <Trash2 size={14} /> Delete
                  </button>
                  <button className="im-btn im-btn-secondary" onClick={() => setShowDeleteConfirm(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className={`im-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="im-ambient">
        <div className="im-orb im-orb-1" />
        <div className="im-orb im-orb-2" />
        <div className="im-orb im-orb-3" />
      </div>

      {/* Header */}
      <div className="im-header">
        <div className="im-header-left">
          <div className="im-header-icon">
            <Package size={22} />
            <span className="im-header-badge"><Sparkles size={10} /> ITEMS</span>
          </div>
          <div>
            <h2>Item &amp; Inventory Management</h2>
            <p className="im-header-subtitle">
              {totalItems} items · {totalCategories} categories · {Utils.formatCurrencyShort(totalValue)} value
            </p>
          </div>
        </div>
        <div className="im-header-right">
          <button className="im-btn im-btn-ghost" onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="im-btn im-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> New Item
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="im-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'items', label: 'Items', icon: Package, badge: filteredItems.length }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`im-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => setViewMode(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="im-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {viewMode === 'overview' ? renderOverviewTab() : renderItemsTab()}

      {showForm && renderFormModal()}
      {renderDeleteConfirm()}
    </div>
  );
};

export default ItemManagerComponent;