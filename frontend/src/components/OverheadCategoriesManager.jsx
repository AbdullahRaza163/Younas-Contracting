// src/components/OverheadCategoriesManager.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Save, X, Edit, Trash2, RefreshCw, AlertCircle, Check,
  Circle, Clock, Calendar, Tag, Building2, DollarSign, Search,
  Filter, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon,
  LayoutDashboard, Sparkles, TrendingUp, TrendingDown, Minus, Power,
  PowerOff, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Layers, Flame, Target, Percent, Wallet, Repeat, CircleDollarSign
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import ApiService from '../services/ApiService';
import Utils from '../utils/Utils';
import './OverheadCategoriesManager.css';

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
    <div className="oc-chart-tooltip">
      {label && <div className="oc-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="oc-chart-tooltip-row">
          <span className="oc-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="oc-chart-tooltip-name">{p.name}</span>
          <span className="oc-chart-tooltip-val">
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
const OverheadCategoriesManager = ({
  categories: propCategories = [],
  onCategoryChange,
  refreshData
}) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [localCategories, setLocalCategories] = useState([]);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const isMounted = useRef(true);

  // View / filter / pagination
  const [viewMode, setViewMode] = useState('overview'); // overview | categories
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  const [formData, setFormData] = useState({
    name: '', type: 'company', isRecurring: true,
    defaultFrequency: 'monthly', glAccount: ''
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // ============================================
  // LOAD
  // ============================================
  const loadCategories = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMessage('');
    try {
      const response = await ApiService.getOverheadCategories();
      if (isMounted.current) {
        setLocalCategories(response || []);
        if (onCategoryChange) onCategoryChange(response || []);
        setInitialLoadDone(true);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      if (isMounted.current) setErrorMessage('Failed to load categories. Please try again.');
    } finally {
      if (isMounted.current && !silent) setLoading(false);
    }
  }, [onCategoryChange]);

  useEffect(() => {
    if (propCategories && propCategories.length > 0) {
      setLocalCategories(propCategories);
      setInitialLoadDone(true);
    } else if (!initialLoadDone) {
      loadCategories();
    }
  }, [propCategories, initialLoadDone, loadCategories]);

  // ============================================
  // FILTERED
  // ============================================
  const filteredCategories = useMemo(() => {
    let list = localCategories;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(s) ||
        c.glAccount?.toLowerCase().includes(s)
      );
    }
    if (typeFilter !== 'all') list = list.filter(c => c.type === typeFilter);
    if (statusFilter !== 'all') {
      list = list.filter(c =>
        statusFilter === 'active' ? c.isActive : !c.isActive
      );
    }
    return list;
  }, [localCategories, searchTerm, typeFilter, statusFilter]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / itemsPerPage));
  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(start, start + itemsPerPage);
  }, [filteredCategories, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, typeFilter, statusFilter, itemsPerPage, viewMode]);
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
  // STATS
  // ============================================
  const stats = useMemo(() => {
    const total = localCategories.length;
    const active = localCategories.filter(c => c.isActive).length;
    const inactive = total - active;
    const recurring = localCategories.filter(c => c.isRecurring).length;
    const oneTime = total - recurring;

    // Type breakdown
    const byType = {
      company: localCategories.filter(c => c.type === 'company').length,
      site: localCategories.filter(c => c.type === 'site').length,
      project: localCategories.filter(c => c.type === 'project').length,
      department: localCategories.filter(c => c.type === 'department').length
    };

    // Frequency breakdown
    const byFrequency = {
      daily: localCategories.filter(c => c.defaultFrequency === 'daily').length,
      weekly: localCategories.filter(c => c.defaultFrequency === 'weekly').length,
      monthly: localCategories.filter(c => c.defaultFrequency === 'monthly').length,
      quarterly: localCategories.filter(c => c.defaultFrequency === 'quarterly').length,
      yearly: localCategories.filter(c => c.defaultFrequency === 'yearly').length
    };

    return { total, active, inactive, recurring, oneTime, byType, byFrequency };
  }, [localCategories]);

  // ============================================
  // CHART DATA
  // ============================================
  const typeChartData = useMemo(() => ([
    { name: 'Company', value: stats.byType.company, color: '#3b82f6' },
    { name: 'Site', value: stats.byType.site, color: '#10b981' },
    { name: 'Project', value: stats.byType.project, color: '#f59e0b' },
    { name: 'Department', value: stats.byType.department, color: '#8b5cf6' }
  ].filter(d => d.value > 0)), [stats]);

  const statusChartData = useMemo(() => ([
    { name: 'Active', value: stats.active, color: '#10b981' },
    { name: 'Inactive', value: stats.inactive, color: '#ef4444' }
  ].filter(d => d.value > 0)), [stats]);

  const frequencyChartData = useMemo(() => ([
    { name: 'Daily', value: stats.byFrequency.daily, color: '#06b6d4' },
    { name: 'Weekly', value: stats.byFrequency.weekly, color: '#3b82f6' },
    { name: 'Monthly', value: stats.byFrequency.monthly, color: '#10b981' },
    { name: 'Quarterly', value: stats.byFrequency.quarterly, color: '#f59e0b' },
    { name: 'Yearly', value: stats.byFrequency.yearly, color: '#8b5cf6' }
  ].filter(d => d.value > 0)), [stats]);

  // ============================================
  // KPI CARDS
  // ============================================
  const kpiItems = [
    { id: 'total', icon: Tag, label: 'Total Categories', value: stats.total,
      meta: `${stats.active} active`, color: '#3b82f6',
      accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up' },
    { id: 'active', icon: Power, label: 'Active', value: stats.active,
      meta: `${stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(0) : 0}% of total`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'inactive', icon: PowerOff, label: 'Inactive', value: stats.inactive,
      meta: 'Not in use',
      color: '#ef4444', accent: 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: stats.inactive > 0 ? 'down' : 'flat' },
    { id: 'recurring', icon: Repeat, label: 'Recurring', value: stats.recurring,
      meta: `${stats.oneTime} one-time`,
      color: '#f59e0b', accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)', trend: 'up' }
  ];

  const cardDetails = {
    total: { title: 'Total Categories', details: [
      { label: 'Total', value: stats.total },
      { label: 'Active', value: stats.active },
      { label: 'Inactive', value: stats.inactive },
      { label: 'Recurring', value: stats.recurring }
    ]},
    active: { title: 'Active Categories', details: [
      { label: 'Active', value: stats.active },
      { label: 'Total', value: stats.total },
      { label: 'Rate', value: `${stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}%` },
      { label: 'Recurring', value: stats.recurring }
    ]},
    inactive: { title: 'Inactive Categories', details: [
      { label: 'Inactive', value: stats.inactive },
      { label: 'Total', value: stats.total },
      { label: 'Rate', value: `${stats.total > 0 ? ((stats.inactive / stats.total) * 100).toFixed(1) : 0}%` },
      { label: 'Active', value: stats.active }
    ]},
    recurring: { title: 'Recurring Categories', details: [
      { label: 'Recurring', value: stats.recurring },
      { label: 'One-time', value: stats.oneTime },
      { label: 'Total', value: stats.total },
      { label: 'Rate', value: `${stats.total > 0 ? ((stats.recurring / stats.total) * 100).toFixed(1) : 0}%` }
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErrorMessage(''); setSuccessMessage('');
    try {
      if (!formData.name.trim()) {
        setErrorMessage('Category name is required');
        setLoading(false);
        return;
      }
      const categoryData = {
        name: formData.name.trim(),
        type: formData.type,
        isRecurring: formData.isRecurring,
        defaultFrequency: formData.defaultFrequency,
        glAccount: formData.glAccount || ''
      };
      if (editingId) {
        await ApiService.updateOverheadCategory(editingId, categoryData);
        setSuccessMessage('Category updated successfully!');
      } else {
        await ApiService.createOverheadCategory(categoryData);
        setSuccessMessage('Category created successfully!');
      }
      await loadCategories(true);
      resetForm();
      setShowForm(false);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      console.error('Error saving category:', error);
      setErrorMessage(error.message || 'Failed to save category. Please try again.');
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormData({
      name: '', type: 'company', isRecurring: true,
      defaultFrequency: 'monthly', glAccount: ''
    });
    setEditingId(null); setErrorMessage(''); setSuccessMessage('');
  };

  const handleEdit = (category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name || '',
      type: category.type || 'company',
      isRecurring: category.isRecurring !== undefined ? category.isRecurring : true,
      defaultFrequency: category.defaultFrequency || 'monthly',
      glAccount: category.glAccount || ''
    });
    setShowForm(true);
    setErrorMessage(''); setSuccessMessage('');
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"? This will also delete all associated overhead entries.`)) return;
    setLoading(true); setErrorMessage('');
    try {
      await ApiService.deleteOverheadCategory(id);
      setSuccessMessage(`Category "${name}" deleted successfully!`);
      await loadCategories(true);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      console.error('Error deleting category:', error);
      setErrorMessage('Failed to delete category. Please try again.');
    } finally { setLoading(false); }
  };

  const handleToggleActive = async (category) => {
    try {
      await ApiService.updateOverheadCategory(category.id, {
        ...category,
        isActive: !category.isActive
      });
      await loadCategories(true);
      setSuccessMessage(`Category "${category.name}" ${!category.isActive ? 'activated' : 'deactivated'}!`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      console.error('Error toggling category:', error);
      setErrorMessage('Failed to update category status.');
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const getTypeLabel = (type) => ({
    'company': 'Company', 'site': 'Site',
    'project': 'Project', 'department': 'Department'
  }[type] || type);

  const getTypeColor = (type) => ({
    'company': '#3b82f6', 'site': '#10b981',
    'project': '#f59e0b', 'department': '#8b5cf6'
  }[type] || '#5b7267');

  const getFrequencyLabel = (f) => ({
    'daily': 'Daily', 'weekly': 'Weekly',
    'monthly': 'Monthly', 'quarterly': 'Quarterly', 'yearly': 'Yearly'
  }[f] || f);

  const getStatusBadge = (isActive) => (
    <span className={`oc-status ${isActive ? 'active' : 'inactive'}`}>
      <Circle size={8} fill={isActive ? '#10b981' : '#ef4444'} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  // ============================================
  // OVERVIEW TAB
  // ============================================
  const renderOverviewTab = () => (
    <div className="oc-view">
      <div className="oc-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="oc-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="oc-kpi-accent" style={{ background: item.accent }} />
              <div className="oc-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="oc-kpi-content">
                <span className="oc-kpi-label">{item.label}</span>
                <span className="oc-kpi-value">{item.value}</span>
                <span className="oc-kpi-meta">{item.meta}</span>
              </div>
              <div className={`oc-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={15} />}
                {item.trend === 'down' && <TrendingDown size={15} />}
                {item.trend === 'flat' && <Minus size={15} />}
              </div>
            </div>
          );
        })}
      </div>

      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="oc-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="oc-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="oc-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="oc-tooltip-row">
                <span className="oc-tooltip-label">{d.label}</span>
                <span className="oc-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 1: Status donut + Type bars */}
      <div className="oc-grid-2-1">
        <div className="oc-card">
          <div className="oc-card-header">
            <div className="oc-card-title">
              <span className="oc-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Type Distribution</h4>
                <span>Categories by type</span>
              </div>
            </div>
          </div>
          {typeChartData.length > 0 ? (
            <div className="oc-donut-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={typeChartData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={52} outerRadius={85} paddingAngle={3} stroke="none">
                    {typeChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="oc-donut-legend">
                {typeChartData.map((d, i) => (
                  <div key={i} className="oc-donut-item">
                    <span className="oc-donut-dot" style={{ background: d.color }} />
                    <span className="oc-donut-name">{d.name}</span>
                    <span className="oc-donut-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="oc-empty-mini">No data</div>}
        </div>

        <div className="oc-card">
          <div className="oc-card-header">
            <div className="oc-card-title">
              <span className="oc-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <Power size={16} />
              </span>
              <div>
                <h4>Status Breakdown</h4>
                <span>Active vs inactive</span>
              </div>
            </div>
          </div>
          {statusChartData.length > 0 ? (
            <div className="oc-donut-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusChartData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={52} outerRadius={85} paddingAngle={3} stroke="none">
                    {statusChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="oc-donut-legend">
                {statusChartData.map((d, i) => (
                  <div key={i} className="oc-donut-item">
                    <span className="oc-donut-dot" style={{ background: d.color }} />
                    <span className="oc-donut-name">{d.name}</span>
                    <span className="oc-donut-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="oc-empty-mini">No data</div>}
        </div>
      </div>

      {/* Row 2: Frequency bars */}
      <div className="oc-card">
        <div className="oc-card-header">
          <div className="oc-card-title">
            <span className="oc-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
              <BarChart3 size={16} />
            </span>
            <div>
              <h4>Frequency Distribution</h4>
              <span>Default frequency of categories</span>
            </div>
          </div>
        </div>
        {frequencyChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={frequencyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" name="Categories" radius={[8, 8, 0, 0]} barSize={44}>
                {frequencyChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="oc-empty-mini">No data</div>}
      </div>

      {/* Row 3: Recent categories */}
      {localCategories.length > 0 && (
        <div className="oc-card">
          <div className="oc-card-header">
            <div className="oc-card-title">
              <span className="oc-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <Layers size={16} />
              </span>
              <div>
                <h4>All Categories</h4>
                <span>{localCategories.length} categories</span>
              </div>
            </div>
            <button className="oc-btn oc-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={13} /> Add Category
            </button>
          </div>
          <div className="oc-table-wrap">
            <table className="oc-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Frequency</th>
                  <th>GL Account</th>
                  <th className="center">Status</th>
                </tr>
              </thead>
              <tbody>
                {localCategories.slice(0, 6).map((category, i) => (
                  <tr key={category.id} style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                    <td><strong>{category.name}</strong></td>
                    <td>
                      <span className="oc-type-badge" style={{
                        background: `${getTypeColor(category.type)}1f`,
                        color: getTypeColor(category.type)
                      }}>
                        {getTypeLabel(category.type)}
                      </span>
                    </td>
                    <td><span className="oc-freq-badge">{getFrequencyLabel(category.defaultFrequency)}</span></td>
                    <td className="oc-gl-account">{category.glAccount || '—'}</td>
                    <td className="center">{getStatusBadge(category.isActive)}</td>
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
  // CATEGORIES TAB
  // ============================================
  const renderCategoriesTab = () => (
    <div className="oc-view">
      {/* Filters */}
      <div className="oc-filters">
        <div className="oc-search">
          <Search size={15} className="oc-search-icon" />
          <input type="text" placeholder="Search by name or GL account..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && (
            <button className="oc-search-clear" onClick={() => setSearchTerm('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <div className="oc-filter-group">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="oc-select">
            <option value="all">All Types</option>
            <option value="company">Company</option>
            <option value="site">Site</option>
            <option value="project">Project</option>
            <option value="department">Department</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="oc-select">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <span className="oc-result-count">
          Showing {filteredCategories.length} of {localCategories.length}
        </span>
        <button className="oc-btn oc-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={14} /> New Category
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="oc-loading">
          <div className="oc-loading-spinner" />
          <span>Loading categories...</span>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="oc-empty">
          <div className="oc-empty-icon"><Tag size={40} /></div>
          <h3>No Categories Found</h3>
          <p>{searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
            ? 'Try adjusting your search or filters.'
            : 'Create your first overhead category to get started.'}</p>
          <button className="oc-btn oc-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> Add Category
          </button>
        </div>
      ) : (
        <>
          <div className="oc-table-wrap">
            <table className="oc-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Frequency</th>
                  <th>Recurring</th>
                  <th>GL Account</th>
                  <th className="center">Status</th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCategories.map((category, i) => (
                  <tr key={category.id}
                    className={!category.isActive ? 'oc-row-inactive' : ''}
                    style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                    <td><strong>{category.name}</strong></td>
                    <td>
                      <span className="oc-type-badge" style={{
                        background: `${getTypeColor(category.type)}1f`,
                        color: getTypeColor(category.type)
                      }}>
                        {getTypeLabel(category.type)}
                      </span>
                    </td>
                    <td><span className="oc-freq-badge">{getFrequencyLabel(category.defaultFrequency)}</span></td>
                    <td>
                      <span className={`oc-recurring-badge ${category.isRecurring ? 'yes' : 'no'}`}>
                        {category.isRecurring ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="oc-gl-account">{category.glAccount || '—'}</td>
                    <td className="center">{getStatusBadge(category.isActive)}</td>
                    <td className="center">
                      <div className="oc-action-btns">
                        <button
                          className={`oc-btn-small ${category.isActive ? 'oc-btn-deactivate' : 'oc-btn-activate'}`}
                          onClick={() => handleToggleActive(category)}>
                          {category.isActive ? <PowerOff size={12} /> : <Power size={12} />}
                          {category.isActive ? 'Off' : 'On'}
                        </button>
                        <button className="oc-icon-btn oc-icon-edit" onClick={() => handleEdit(category)}>
                          <Edit size={13} />
                        </button>
                        <button className="oc-icon-btn oc-icon-danger" onClick={() => handleDelete(category.id, category.name)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredCategories.length > 0 && (
            <div className="oc-pagination">
              <div className="oc-pagination-info">
                Showing <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong>–
                <strong>{Math.min(currentPage * itemsPerPage, filteredCategories.length)}</strong> of{' '}
                <strong>{filteredCategories.length}</strong>
              </div>
              <div className="oc-pagination-controls">
                <div className="oc-pagination-items">
                  <span>Show:</span>
                  <select value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="oc-pagination-select">
                    {[6, 9, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="oc-pagination-buttons">
                  <button className="oc-page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}>
                    <ChevronsLeft size={13} />
                  </button>
                  <button className="oc-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                    <ChevronLeft size={13} />
                  </button>
                  {getPageNumbers().map(p => (
                    <button key={p} className={`oc-page-btn ${p === currentPage ? 'active' : ''}`}
                      onClick={() => goToPage(p)}>{p}</button>
                  ))}
                  <button className="oc-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                    <ChevronRight size={13} />
                  </button>
                  <button className="oc-page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>
                    <ChevronsRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ============================================
  // FORM MODAL
  // ============================================
  const renderFormModal = () => (
    <ModalPortal>
      <div className="oc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
        <div className="oc-modal" onClick={e => e.stopPropagation()}>
          <div className="oc-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <div className="oc-modal-header-left">
              <div className="oc-modal-icon">
                {editingId ? <Edit size={18} /> : <Plus size={18} />}
              </div>
              <div>
                <h3>{editingId ? 'Edit Category' : 'New Category'}</h3>
                <p className="oc-modal-sub">{editingId ? 'Update overhead category' : 'Create a new overhead category'}</p>
              </div>
            </div>
            <button className="oc-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="oc-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="oc-form-row">
                <div className="oc-form-group">
                  <label>Category Name <span className="oc-required">*</span></label>
                  <input type="text" value={formData.name} required autoFocus
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rent, Utilities, Salaries"
                    className="oc-form-input" />
                </div>
                <div className="oc-form-group">
                  <label>Type</label>
                  <select value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="oc-form-select">
                    <option value="company">Company</option>
                    <option value="site">Site</option>
                    <option value="project">Project</option>
                    <option value="department">Department</option>
                  </select>
                </div>
              </div>

              <div className="oc-form-row">
                <div className="oc-form-group">
                  <label>Frequency</label>
                  <select value={formData.defaultFrequency}
                    onChange={e => setFormData({ ...formData, defaultFrequency: e.target.value })}
                    className="oc-form-select">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="oc-form-group">
                  <label>GL Account</label>
                  <input type="text" value={formData.glAccount}
                    onChange={e => setFormData({ ...formData, glAccount: e.target.value })}
                    placeholder="e.g. 5000, 6000"
                    className="oc-form-input" />
                </div>
              </div>

              <div className="oc-form-group">
                <label className="oc-checkbox">
                  <input type="checkbox" checked={formData.isRecurring}
                    onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })} />
                  <span>Recurring Expense</span>
                  <span className="oc-hint">Repeats regularly</span>
                </label>
              </div>

              <div className="oc-form-actions">
                <button type="submit" className="oc-btn oc-btn-primary" disabled={loading}>
                  <Save size={14} /> {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
                <button type="button" className="oc-btn oc-btn-secondary"
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
  // MAIN RENDER
  // ============================================
  return (
    <div className={`oc-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="oc-ambient">
        <div className="oc-orb oc-orb-1" />
        <div className="oc-orb oc-orb-2" />
        <div className="oc-orb oc-orb-3" />
      </div>

      {/* Header */}
      <div className="oc-header">
        <div className="oc-header-left">
          <div className="oc-header-icon">
            <Tag size={22} />
            <span className="oc-header-badge"><Sparkles size={10} /> CATEGORIES</span>
          </div>
          <div>
            <h2>Overhead Categories</h2>
            <p className="oc-header-subtitle">
              {stats.total} categories · {stats.active} active · {stats.recurring} recurring
            </p>
          </div>
        </div>
        <div className="oc-header-right">
          <button className="oc-btn oc-btn-ghost" onClick={() => loadCategories(false)} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'oc-spin' : ''} /> Refresh
          </button>
          <button className="oc-btn oc-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> New Category
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="oc-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'categories', label: 'Categories', icon: Tag, badge: filteredCategories.length }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`oc-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => setViewMode(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="oc-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {successMessage && <div className="oc-message success"><Check size={15} /> {successMessage}</div>}
      {errorMessage && <div className="oc-message error"><AlertCircle size={15} /> {errorMessage}</div>}

      {viewMode === 'overview' ? renderOverviewTab() : renderCategoriesTab()}

      {showForm && renderFormModal()}
    </div>
  );
};

export default OverheadCategoriesManager;