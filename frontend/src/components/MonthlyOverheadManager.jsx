// src/components/MonthlyOverheadManager.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Save, X, Edit, Trash2, RefreshCw, Building2, Calendar, AlertCircle, ChevronDown, Filter, ChevronLeft,
  ChevronRight, TrendingUp, TrendingDown, Users, Clock, BarChart3,
  LayoutDashboard, FileText, Tag, ChevronUp, Search, Sparkles,
  PieChart as PieChartIcon, LineChart as LineChartIcon, Layers,
  Target, Percent, Wallet, Minus, ChevronsLeft, ChevronsRight,
  Repeat, Banknote, Flame, Crown
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  ComposedChart, Area, AreaChart, Line
} from 'recharts';
import Utils from '../utils/Utils';
import ApiService from '../services/ApiService';
import './MonthlyOverheadManager.css';

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
    <div className="mo-chart-tooltip">
      {label && <div className="mo-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="mo-chart-tooltip-row">
          <span className="mo-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="mo-chart-tooltip-name">{p.name}</span>
          <span className="mo-chart-tooltip-val">
            {formatter ? formatter(p.value, p.name) : Utils.formatCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const MonthlyOverheadManager = ({
  data,
  addMonthlyOverhead,
  updateMonthlyOverhead,
  deleteMonthlyOverhead,
  refreshData,
  selectedMonth,
  setSelectedMonth
}) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [filterType, setFilterType] = useState('month');
  const [customMonth, setCustomMonth] = useState(selectedMonth);
  const [viewMonth, setViewMonth] = useState(selectedMonth);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  // Tabs
  const [viewMode, setViewMode] = useState('overview'); // overview | entries

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    month: selectedMonth, categoryId: '', amount: '', siteIds: [],
    sitesCount: '1', workingDays: '26', notes: ''
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const sites = useMemo(() => data?.sites || [], [data]);
  const overheads = useMemo(() => data?.monthlyOverhead || [], [data]);

  useEffect(() => { loadCategories(); }, []);

  useEffect(() => {
    setViewMonth(selectedMonth);
    setCustomMonth(selectedMonth);
  }, [selectedMonth]);

  // ============================================
  // LOAD CATEGORIES
  // ============================================
  const loadCategories = async () => {
    setLoadingCategories(true); setErrorMessage('');
    try {
      const response = await ApiService.getOverheadCategories();
      setCategories(response || []);
      if (!response || response.length === 0) {
        setErrorMessage('No categories found. Please create categories first.');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setErrorMessage('Failed to load categories. Please check the connection.');
    } finally { setLoadingCategories(false); }
  };

  // ============================================
  // HELPERS
  // ============================================
  const getDisplayMonth = () => (filterType === 'custom' && customMonth) ? customMonth : viewMonth;

  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || 'Unknown';
  };

  const getSiteNames = (overhead) => {
    if (overhead.siteNames && overhead.siteNames.length > 0) return overhead.siteNames.join(', ');
    if (!overhead.siteId) {
      const allNames = sites.map(s => s.name);
      return allNames.length > 0 ? allNames.join(', ') : 'All Sites';
    }
    const site = sites.find(s => s.id === overhead.siteId);
    return site?.name || 'Unknown Site';
  };

  const getSelectedSiteNames = () => {
    if (!formData.siteIds || formData.siteIds.length === 0) return 'All Sites (Company-wide)';
    if (formData.siteIds.length === sites.length) return 'All Sites';
    const names = formData.siteIds.map(id => sites.find(s => s.id === id)?.name || id);
    return names.join(', ');
  };

  const getMonthLabel = (monthStr) => {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-');
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${names[parseInt(m) - 1]} ${y}`;
  };

  // ============================================
  // FILTERED
  // ============================================
  const filteredOverheads = useMemo(() => {
    const displayMonth = getDisplayMonth();
    let list = overheads.filter(o => o.month === displayMonth);
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(o =>
        getCategoryName(o.categoryId).toLowerCase().includes(s) ||
        (o.notes || '').toLowerCase().includes(s) ||
        getSiteNames(o).toLowerCase().includes(s)
      );
    }
    return list;
  }, [overheads, viewMonth, customMonth, filterType, searchTerm, categories, sites]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.max(1, Math.ceil(filteredOverheads.length / itemsPerPage));
  const paginatedOverheads = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOverheads.slice(start, start + itemsPerPage);
  }, [filteredOverheads, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [viewMonth, customMonth, filterType, searchTerm, itemsPerPage, viewMode]);
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
  // SUMMARY
  // ============================================
  const summary = useMemo(() => {
    const total = filteredOverheads.reduce((s, o) => s + (o.amount || 0), 0);
    const workingDays = filteredOverheads.length > 0 ? (filteredOverheads[0].workingDays || 26) : 26;
    const sitesCount = filteredOverheads.length > 0 ? (filteredOverheads[0].sitesCount || 1) : 1;
    const perSite = sitesCount > 0 ? total / sitesCount : 0;
    const perDayPerSite = workingDays > 0 ? perSite / workingDays : 0;
    return { total, workingDays, sitesCount, perSite, perDayPerSite, count: filteredOverheads.length };
  }, [filteredOverheads]);

  // ============================================
  // CHART DATA
  // ============================================
  const categoryChartData = useMemo(() => {
    const map = {};
    filteredOverheads.forEach(o => {
      const name = getCategoryName(o.categoryId);
      map[name] = (map[name] || 0) + (o.amount || 0);
    });
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#ec4899'];
    return Object.entries(map)
      .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }))
      .sort((a, b) => b.value - a.value);
  }, [filteredOverheads, categories]);

  const siteChartData = useMemo(() => {
    const map = {};
    filteredOverheads.forEach(o => {
      if (o.siteNames && o.siteNames.length > 0) {
        const share = (o.amount || 0) / o.siteNames.length;
        o.siteNames.forEach(n => { map[n] = (map[n] || 0) + share; });
      } else if (o.siteId) {
        const n = sites.find(s => s.id === o.siteId)?.name || 'Unknown';
        map[n] = (map[n] || 0) + (o.amount || 0);
      } else {
        const share = (o.amount || 0) / Math.max(1, sites.length);
        sites.forEach(s => { map[s.name] = (map[s.name] || 0) + share; });
      }
    });
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'];
    return Object.entries(map)
      .map(([name, value], i) => ({
        name: name.length > 14 ? name.slice(0, 14) + '…' : name,
        fullName: name,
        value,
        color: palette[i % palette.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredOverheads, sites]);

  // Monthly trend across the last 12 months (independent of filter)
  const monthlyTrend = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const total = overheads.filter(o => o.month === key).reduce((s, o) => s + (o.amount || 0), 0);
      const count = overheads.filter(o => o.month === key).length;
      months.push({
        label: d.toLocaleString('en-US', { month: 'short' }),
        month: key,
        total, count
      });
    }
    return months;
  }, [overheads]);

  // ============================================
  // KPI CARDS
  // ============================================
  const kpiItems = [
    { id: 'total', icon: Banknote, label: 'Total Overhead',
      value: Utils.formatCurrencyShort(summary.total),
      meta: `${summary.count} entries`,
      color: '#3b82f6', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)',
      trend: summary.count > 0 ? 'up' : 'flat' },
    { id: 'perSite', icon: Building2, label: 'Per Site',
      value: Utils.formatCurrencyShort(summary.perSite),
      meta: `${summary.sitesCount} sites`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)',
      trend: summary.perSite > 0 ? 'up' : 'flat' },
    { id: 'perDay', icon: Clock, label: 'Per Day / Site',
      value: Utils.formatCurrencyShort(summary.perDayPerSite),
      meta: `${summary.workingDays} working days`,
      color: '#f59e0b', accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
      trend: summary.perDayPerSite > 0 ? 'up' : 'flat' },
    { id: 'workingDays', icon: Calendar, label: 'Working Days',
      value: summary.workingDays,
      meta: `Month ${getMonthLabel(getDisplayMonth())}`,
      color: '#8b5cf6', accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)',
      trend: 'flat' }
  ];

  const cardDetails = {
    total: { title: 'Total Overhead', details: [
      { label: 'Total', value: Utils.formatCurrency(summary.total) },
      { label: 'Entries', value: summary.count },
      { label: 'Categories', value: new Set(filteredOverheads.map(o => o.categoryId)).size },
      { label: 'Avg/Entry', value: summary.count > 0 ? Utils.formatCurrency(summary.total / summary.count) : '0' }
    ]},
    perSite: { title: 'Per Site', details: [
      { label: 'Per Site', value: Utils.formatCurrency(summary.perSite) },
      { label: 'Total', value: Utils.formatCurrency(summary.total) },
      { label: 'Sites', value: summary.sitesCount },
      { label: 'Per Day/Site', value: Utils.formatCurrency(summary.perDayPerSite) }
    ]},
    perDay: { title: 'Per Day / Site', details: [
      { label: 'Per Day/Site', value: Utils.formatCurrency(summary.perDayPerSite) },
      { label: 'Working Days', value: summary.workingDays },
      { label: 'Per Site', value: Utils.formatCurrency(summary.perSite) },
      { label: 'Total Sites', value: summary.sitesCount }
    ]},
    workingDays: { title: 'Working Days', details: [
      { label: 'Working Days', value: summary.workingDays },
      { label: 'Entries', value: summary.count },
      { label: 'Total', value: Utils.formatCurrency(summary.total) },
      { label: 'Per Day', value: summary.workingDays > 0 ? Utils.formatCurrency(summary.total / summary.workingDays) : '0' }
    ]}
  };

  const handleCardHover = (id, e) => {
    setHoveredCard(id);
    setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // MONTH NAVIGATION
  // ============================================
  const navigateMonth = (direction) => {
    const currentMonth = getDisplayMonth();
    const [y, m] = currentMonth.split('-').map(Number);
    let nm = m + direction, ny = y;
    if (nm > 12) { nm = 1; ny = y + 1; }
    else if (nm < 1) { nm = 12; ny = y - 1; }
    const newMonth = `${ny}-${String(nm).padStart(2, '0')}`;
    if (filterType === 'custom') setCustomMonth(newMonth);
    else {
      setViewMonth(newMonth);
      if (setSelectedMonth) setSelectedMonth(newMonth);
    }
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    setShowFilterDropdown(false);
    if (type === 'month' && setSelectedMonth) setSelectedMonth(viewMonth);
  };

  const applyCustomMonth = () => {
    if (customMonth) {
      setShowFilterDropdown(false);
      if (setSelectedMonth) setSelectedMonth(customMonth);
    }
  };

  // ============================================
  // SITE HANDLERS
  // ============================================
  const handleSiteToggle = (siteId) => {
    setFormData(prev => {
      let ids = [...prev.siteIds];
      if (ids.includes(siteId)) ids = ids.filter(i => i !== siteId);
      else ids.push(siteId);
      return { ...prev, siteIds: ids, sitesCount: (ids.length > 0 ? ids.length : 1).toString() };
    });
  };
  const handleSelectAllSites = () => {
    const ids = sites.map(s => s.id);
    setFormData(prev => ({ ...prev, siteIds: ids, sitesCount: ids.length.toString() }));
  };
  const handleDeselectAllSites = () => setFormData(prev => ({ ...prev, siteIds: [], sitesCount: '1' }));

  // ============================================
  // RESET
  // ============================================
  const resetForm = () => {
    setFormData({
      month: getDisplayMonth(), categoryId: '', amount: '', siteIds: [],
      sitesCount: sites.length > 0 ? sites.length.toString() : '1',
      workingDays: '26', notes: ''
    });
    setEditingId(null); setErrorMessage(''); setShowSiteDropdown(false);
  };

  // ============================================
  // CRUD
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErrorMessage(''); setSuccessMessage('');
    try {
      if (!formData.categoryId) {
        setErrorMessage('Please select a category'); setLoading(false); return;
      }
      const base = {
        month: formData.month || getDisplayMonth(),
        categoryId: formData.categoryId,
        amount: parseFloat(formData.amount) || 0,
        workingDays: parseInt(formData.workingDays) || 26,
        notes: formData.notes || ''
      };
      const hasMultipleSites = formData.siteIds && formData.siteIds.length > 1;
      const hasNoSites = !formData.siteIds || formData.siteIds.length === 0;
      let createData;
      if (hasMultipleSites || hasNoSites) {
        const siteNames = hasMultipleSites
          ? formData.siteIds.map(id => sites.find(s => s.id === id)?.name || id)
          : sites.map(s => s.name);
        createData = {
          ...base, siteId: null,
          sitesCount: hasMultipleSites ? formData.siteIds.length : parseInt(formData.sitesCount) || 1,
          siteNames
        };
      } else {
        const singleSite = sites.find(s => s.id === formData.siteIds[0]);
        createData = { ...base, siteId: formData.siteIds[0], sitesCount: 1, siteNames: [singleSite?.name || 'Unknown Site'] };
      }
      if (editingId) await updateMonthlyOverhead(editingId, createData);
      else await addMonthlyOverhead(createData);
      setSuccessMessage(editingId ? 'Overhead updated!' : 'Overhead added!');
      await refreshData();
      resetForm(); setShowForm(false);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      console.error('Error saving overhead:', error);
      setErrorMessage(error.message || 'Failed to save. Please try again.');
    } finally { setLoading(false); }
  };

  const handleEdit = (overhead) => {
    let siteIds = [];
    if (overhead.siteId) siteIds = [overhead.siteId];
    else if (overhead.siteNames && overhead.siteNames.length > 0) {
      siteIds = overhead.siteNames.map(n => sites.find(s => s.name === n)?.id).filter(Boolean);
      if (siteIds.length === 0) siteIds = sites.map(s => s.id);
    } else siteIds = sites.map(s => s.id);
    setEditingId(overhead.id);
    setFormData({
      month: overhead.month || getDisplayMonth(),
      categoryId: overhead.categoryId || '',
      amount: overhead.amount?.toString() || '',
      siteIds,
      sitesCount: overhead.sitesCount?.toString() || (siteIds.length > 0 ? siteIds.length.toString() : '1'),
      workingDays: overhead.workingDays?.toString() || '26',
      notes: overhead.notes || ''
    });
    setShowForm(true); setErrorMessage('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this overhead entry?')) return;
    try {
      await deleteMonthlyOverhead(id);
      setSuccessMessage('Overhead deleted!');
      await refreshData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      console.error('Error deleting overhead:', error);
      setErrorMessage('Failed to delete. Please try again.');
    }
  };

  // ============================================
  // OVERVIEW TAB
  // ============================================
  const renderOverviewTab = () => (
    <div className="mo-view">
      <div className="mo-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="mo-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="mo-kpi-accent" style={{ background: item.accent }} />
              <div className="mo-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="mo-kpi-content">
                <span className="mo-kpi-label">{item.label}</span>
                <span className="mo-kpi-value">{item.value}</span>
                <span className="mo-kpi-meta">{item.meta}</span>
              </div>
              <div className={`mo-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={15} />}
                {item.trend === 'down' && <TrendingDown size={15} />}
                {item.trend === 'flat' && <Minus size={15} />}
              </div>
            </div>
          );
        })}
      </div>

      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="mo-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="mo-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="mo-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="mo-tooltip-row">
                <span className="mo-tooltip-label">{d.label}</span>
                <span className="mo-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 1 — Monthly trend (12 months) + Category donut */}
      <div className="mo-grid-2-1">
        <div className="mo-card">
          <div className="mo-card-header">
            <div className="mo-card-title">
              <span className="mo-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <LineChartIcon size={16} />
              </span>
              <div>
                <h4>12-Month Overhead Trend</h4>
                <span>Total overhead by month</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="moTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <ReTooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2.5}
                fill="url(#moTrendGrad)" name="Total" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mo-card">
          <div className="mo-card-header">
            <div className="mo-card-title">
              <span className="mo-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>By Category</h4>
                <span>{getMonthLabel(getDisplayMonth())}</span>
              </div>
            </div>
          </div>
          {categoryChartData.length > 0 ? (
            <div className="mo-donut-wrap">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryChartData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={52} outerRadius={85} paddingAngle={3} stroke="none">
                    {categoryChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mo-donut-legend">
                {categoryChartData.map((d, i) => (
                  <div key={i} className="mo-donut-item">
                    <span className="mo-donut-dot" style={{ background: d.color }} />
                    <span className="mo-donut-name">{d.name}</span>
                    <span className="mo-donut-val">{Utils.formatCurrencyShort(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="mo-empty-mini">No categories</div>}
        </div>
      </div>

      {/* Row 2 — Site distribution */}
      <div className="mo-card">
        <div className="mo-card-header">
          <div className="mo-card-title">
            <span className="mo-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
              <BarChart3 size={16} />
            </span>
            <div>
              <h4>Overhead by Site</h4>
              <span>Allocated across sites</span>
            </div>
          </div>
        </div>
        {siteChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={siteChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11}
                tickLine={false} axisLine={false} width={110} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" name="Overhead" radius={[0, 8, 8, 0]} barSize={22}>
                {siteChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="mo-empty-mini">No sites</div>}
      </div>

      {/* Row 3 — Category breakdown bars */}
      {categoryChartData.length > 0 && (
        <div className="mo-card">
          <div className="mo-card-header">
            <div className="mo-card-title">
              <span className="mo-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Layers size={16} />
              </span>
              <div>
                <h4>Category Breakdown</h4>
                <span>Share of total overhead</span>
              </div>
            </div>
          </div>
          <div className="mo-breakdown">
            {categoryChartData.map((d, i) => {
              const max = Math.max(...categoryChartData.map(x => x.value), 1);
              const pct = (d.value / max) * 100;
              const share = summary.total > 0 ? (d.value / summary.total) * 100 : 0;
              return (
                <div key={i} className="mo-breakdown-row">
                  <div className="mo-breakdown-head">
                    <span className="mo-breakdown-dot" style={{ background: d.color }} />
                    <span className="mo-breakdown-name">{d.name}</span>
                    <span className="mo-breakdown-share">{share.toFixed(1)}%</span>
                    <span className="mo-breakdown-val">{Utils.formatCurrencyShort(d.value)}</span>
                  </div>
                  <div className="mo-breakdown-track">
                    <div className="mo-breakdown-fill"
                      style={{ width: `${pct}%`, background: d.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // ENTRIES TAB
  // ============================================
  const renderEntriesTab = () => (
    <div className="mo-view">
      <div className="mo-filters">
        <div className="mo-search">
          <Search size={15} className="mo-search-icon" />
          <input type="text" placeholder="Search by category, site, or notes..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && (
            <button className="mo-search-clear" onClick={() => setSearchTerm('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <span className="mo-result-count">
          Showing {filteredOverheads.length} of {overheads.length}
        </span>
        <button className="mo-btn mo-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={14} /> Add Overhead
        </button>
      </div>

      {filteredOverheads.length === 0 ? (
        <div className="mo-empty">
          <div className="mo-empty-icon"><FileText size={40} /></div>
          <h3>No Overhead Entries</h3>
          <p>Click "Add Overhead" to set up monthly overhead for {getMonthLabel(getDisplayMonth())}</p>
        </div>
      ) : (
        <>
          <div className="mo-table-wrap">
            <table className="mo-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="right">Amount</th>
                  <th>Site(s)</th>
                  <th className="center">Sites</th>
                  <th className="right">Working Days</th>
                  <th className="right">Per Site</th>
                  <th className="right">Per Day/Site</th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOverheads.map((o, i) => (
                  <tr key={o.id} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                    <td><span className="mo-category-badge">{getCategoryName(o.categoryId)}</span></td>
                    <td className="right mo-td-blue"><strong>{Utils.formatCurrencyShort(o.amount)}</strong></td>
                    <td><div className="mo-site-names">{getSiteNames(o)}</div></td>
                    <td className="center"><span className="mo-count-badge">{o.sitesCount || 1}</span></td>
                    <td className="right">{o.workingDays || 26}</td>
                    <td className="right mo-td-green">{Utils.formatCurrencyShort(o.perSite || 0)}</td>
                    <td className="right mo-td-amber">{Utils.formatCurrencyShort(o.perDayPerSite || 0)}</td>
                    <td className="center">
                      <div className="mo-action-btns">
                        <button className="mo-icon-btn mo-icon-edit" onClick={() => handleEdit(o)} title="Edit">
                          <Edit size={13} />
                        </button>
                        <button className="mo-icon-btn mo-icon-danger" onClick={() => handleDelete(o.id)} title="Delete">
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
          <div className="mo-pagination">
            <div className="mo-pagination-info">
              Showing <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong>–
              <strong>{Math.min(currentPage * itemsPerPage, filteredOverheads.length)}</strong> of{' '}
              <strong>{filteredOverheads.length}</strong>
            </div>
            <div className="mo-pagination-controls">
              <div className="mo-pagination-items">
                <span>Show:</span>
                <select value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="mo-pagination-select">
                  {[6, 9, 10, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="mo-pagination-buttons">
                <button className="mo-page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}>
                  <ChevronsLeft size={13} />
                </button>
                <button className="mo-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft size={13} />
                </button>
                {getPageNumbers().map(p => (
                  <button key={p} className={`mo-page-btn ${p === currentPage ? 'active' : ''}`}
                    onClick={() => goToPage(p)}>{p}</button>
                ))}
                <button className="mo-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  <ChevronRight size={13} />
                </button>
                <button className="mo-page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>
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
      <div className="mo-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
        <div className="mo-modal" onClick={e => e.stopPropagation()}>
          <div className="mo-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <div className="mo-modal-header-left">
              <div className="mo-modal-icon">
                {editingId ? <Edit size={18} /> : <Plus size={18} />}
              </div>
              <div>
                <h3>{editingId ? 'Edit Overhead' : 'Add Monthly Overhead'}</h3>
                <p className="mo-modal-sub">{editingId ? 'Update overhead entry' : 'Create a new overhead record'}</p>
              </div>
            </div>
            <button className="mo-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="mo-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="mo-form-row">
                <div className="mo-form-group">
                  <label><Calendar size={12} /> Month <span className="mo-required">*</span></label>
                  <input type="month" value={formData.month}
                    onChange={e => setFormData({ ...formData, month: e.target.value })}
                    required className="mo-form-input" />
                </div>
                <div className="mo-form-group">
                  <label><Tag size={12} /> Category <span className="mo-required">*</span></label>
                  <select value={formData.categoryId}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    required className="mo-form-select">
                    <option value="">Select Category</option>
                    {loadingCategories ? (
                      <option value="" disabled>Loading...</option>
                    ) : categories.length === 0 ? (
                      <option value="" disabled>No categories</option>
                    ) : categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="mo-form-row">
                <div className="mo-form-group">
                  <label><Banknote size={12} /> Amount (BD) <span className="mo-required">*</span></label>
                  <input type="number" step="0.001" value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    required placeholder="0.000" className="mo-form-input" />
                </div>
                <div className="mo-form-group">
                  <label><Building2 size={12} /> Apply to Sites</label>
                  <div className="mo-site-selector">
                    <button type="button" className="mo-site-selector-btn"
                      onClick={() => setShowSiteDropdown(!showSiteDropdown)}>
                      <span className="mo-selected-text">{getSelectedSiteNames()}</span>
                      <ChevronDown size={14} />
                    </button>
                    {showSiteDropdown && (
                      <div className="mo-site-dropdown">
                        <div className="mo-dropdown-actions">
                          <button type="button" onClick={handleSelectAllSites}>Select All</button>
                          <button type="button" onClick={handleDeselectAllSites}>Deselect All</button>
                        </div>
                        {sites.map(s => (
                          <label key={s.id} className="mo-site-item">
                            <input type="checkbox" checked={formData.siteIds.includes(s.id)}
                              onChange={() => handleSiteToggle(s.id)} />
                            <span>{s.name}</span>
                          </label>
                        ))}
                        {sites.length === 0 && <div className="mo-no-sites">No sites available</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mo-form-row">
                <div className="mo-form-group">
                  <label><Users size={12} /> Sites Count</label>
                  <input type="number" value={formData.sitesCount}
                    onChange={e => setFormData({ ...formData, sitesCount: e.target.value })}
                    className="mo-form-input" />
                </div>
                <div className="mo-form-group">
                  <label><Clock size={12} /> Working Days</label>
                  <input type="number" value={formData.workingDays}
                    onChange={e => setFormData({ ...formData, workingDays: e.target.value })}
                    className="mo-form-input" />
                </div>
              </div>

              <div className="mo-form-group">
                <label><FileText size={12} /> Notes</label>
                <input type="text" value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..." className="mo-form-input" />
              </div>

              <div className="mo-form-actions">
                <button type="submit" className="mo-btn mo-btn-primary" disabled={loading}>
                  <Save size={14} /> {loading ? 'Saving...' : (editingId ? 'Update' : 'Save')}
                </button>
                <button type="button" className="mo-btn mo-btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );

  const displayMonth = getDisplayMonth();

  return (
    <div className={`mo-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="mo-ambient">
        <div className="mo-orb mo-orb-1" />
        <div className="mo-orb mo-orb-2" />
        <div className="mo-orb mo-orb-3" />
      </div>

      {/* Header */}
      <div className="mo-header">
        <div className="mo-header-left">
          <div className="mo-header-icon">
            <LayoutDashboard size={22} />
            <span className="mo-header-badge"><Sparkles size={10} /> OVERHEAD</span>
          </div>
          <div>
            <h2>Monthly Overhead Management</h2>
            <p className="mo-header-subtitle">
              {summary.count} entries · {Utils.formatCurrencyShort(summary.total)} total · {getMonthLabel(displayMonth)}
            </p>
          </div>
        </div>
        <div className="mo-header-right">
          <div className="mo-month-nav">
            <button className="mo-month-btn" onClick={() => navigateMonth(-1)}>
              <ChevronLeft size={16} />
            </button>
            <span className="mo-month-label">{displayMonth}</span>
            <button className="mo-month-btn" onClick={() => navigateMonth(1)}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="mo-filter-dropdown">
            <button className="mo-btn mo-btn-ghost" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
              <Filter size={14} /> {filterType === 'month' ? 'Current Month' : 'Custom'}
              <ChevronDown size={13} />
            </button>
            {showFilterDropdown && (
              <div className="mo-dropdown">
                <button className={`mo-dd-item ${filterType === 'month' ? 'active' : ''}`}
                  onClick={() => handleFilterChange('month')}>
                  Current Month ({viewMonth})
                </button>
                <div className="mo-dd-divider" />
                <div className="mo-dd-section">
                  <label>Custom Month</label>
                  <input type="month" value={customMonth}
                    onChange={(e) => setCustomMonth(e.target.value)} className="mo-dd-input" />
                  <button className="mo-dd-apply" onClick={applyCustomMonth}>Apply Filter</button>
                </div>
              </div>
            )}
          </div>
          <button className="mo-btn mo-btn-ghost" onClick={refreshData}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="mo-btn mo-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> Add Overhead
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mo-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'entries', label: 'Entries', icon: FileText, badge: filteredOverheads.length }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`mo-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => setViewMode(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="mo-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {successMessage && <div className="mo-message success"><AlertCircle size={15} /> {successMessage}</div>}
      {errorMessage && <div className="mo-message error"><AlertCircle size={15} /> {errorMessage}</div>}

      {viewMode === 'overview' ? renderOverviewTab() : renderEntriesTab()}

      {showForm && renderFormModal()}
    </div>
  );
};

export default MonthlyOverheadManager;