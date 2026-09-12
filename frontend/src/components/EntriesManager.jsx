// src/components/EntriesManager.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Edit, Trash2, Calendar, Building2, DollarSign, Users, Receipt,
  FileText, X, Filter, Search, RefreshCw, Save, AlertCircle, CheckCircle,
  TrendingUp, TrendingDown, Clock, Info, Eye, Printer, Download, Settings,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LayoutDashboard,
  Wallet, Briefcase, ArrowUpRight, ArrowDownRight, Award, Star, Gauge,
  Timer, Activity, Zap, Shield, Crown, Sparkles, RotateCcw,
  BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon,
  Layers, Flame, Percent, CircleDollarSign, Target, ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, Legend, Area, AreaChart,
  PieChart, Pie, Cell, LineChart
} from 'recharts';
import Utils from '../utils/Utils';
import './EntriesManager.css';

const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

// ============================================
// CUSTOM TOOLTIP
// ============================================
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="em-chart-tooltip">
      {label && <div className="em-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="em-chart-tooltip-row">
          <span className="em-chart-tooltip-dot" style={{ background: p.color || p.fill }} />
          <span className="em-chart-tooltip-name">{p.name}</span>
          <span className="em-chart-tooltip-val">{Utils.formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const EntriesManagerComponent = ({ data, addEntry, updateEntry, deleteEntry }) => {
  const [formData, setFormData] = useState({
    date: Utils.today(),
    siteId: '', kamai: '', labour: '', oneTime: '', note: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [isOverrideMode, setIsOverrideMode] = useState(false);
  const [filter, setFilter] = useState({ site: '', dateFrom: '', dateTo: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hoveredEntry, setHoveredEntry] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState('overview'); // overview | entries
  const [mounted, setMounted] = useState(false);

  const dailyOH = useMemo(() =>
    Utils.calculateDailyOH(data.monthlyOverhead, new Date(formData.date)),
    [data.monthlyOverhead, formData.date]
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ============================================
  // HELPERS
  // ============================================
  const isAutoEntry = (entry) =>
    entry?.source === 'auto' || (entry?.id && String(entry.id).startsWith('auto-'));

  const getSourceBadge = (entry) => {
    const auto = isAutoEntry(entry);
    const overridden = entry?.manualOverride;
    if (auto) return { label: 'Auto', className: 'em-source-badge em-source-auto', icon: <Zap size={11} /> };
    if (overridden) return { label: 'Override', className: 'em-source-badge em-source-override', icon: <Edit size={11} /> };
    return { label: 'Manual', className: 'em-source-badge em-source-manual', icon: <Edit size={11} /> };
  };

  // ============================================
  // FILTERED
  // ============================================
  const filteredEntries = useMemo(() => {
    return (data.entries || []).filter(entry => {
      if (filter.site && entry.siteId !== filter.site) return false;
      if (filter.dateFrom && entry.date < filter.dateFrom) return false;
      if (filter.dateTo && entry.date > filter.dateTo) return false;
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const site = (data.sites.find(x => x.id === entry.siteId)?.name || '').toLowerCase();
        const note = (entry.note || '').toLowerCase();
        if (!site.includes(s) && !note.includes(s) && !(entry.date || '').includes(s)) return false;
      }
      return true;
    }).sort((a, b) => {
      const d = (b.date || '').localeCompare(a.date || '');
      if (d !== 0) return d;
      return (b.id || '').localeCompare(a.id || '');
    });
  }, [data.entries, data.sites, filter, searchTerm]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / itemsPerPage));
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEntries.slice(start, start + itemsPerPage);
  }, [filteredEntries, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [filter, searchTerm, itemsPerPage]);

  // ============================================
  // TOTALS
  // ============================================
  const totalEntries = filteredEntries.length;
  const totalRevenue = filteredEntries.reduce((s, e) => s + (e.kamai || 0), 0);
  const totalLabour = filteredEntries.reduce((s, e) => s + (e.labour || 0), 0);
  const totalOverhead = filteredEntries.reduce((s, e) => s + (e.overhead || 0), 0);
  const totalOneTime = filteredEntries.reduce((s, e) => s + (e.oneTime || 0), 0);
  const totalProfit = filteredEntries.reduce((s, e) => s + Utils.calculateEntryProfit(e), 0);
  const avgProfit = totalEntries > 0 ? totalProfit / totalEntries : 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const bestEntry = totalEntries > 0
    ? Math.max(...filteredEntries.map(e => Utils.calculateEntryProfit(e))) : 0;

  // ============================================
  // CHART DATA
  // ============================================
  // Daily trend (last 14 days by date)
  const dailyTrend = useMemo(() => {
    const byDate = {};
    filteredEntries.forEach(e => {
      if (!e.date) return;
      if (!byDate[e.date]) byDate[e.date] = { date: e.date, revenue: 0, cost: 0, profit: 0, count: 0 };
      const cost = (e.labour || 0) + (e.overhead || 0) + (e.oneTime || 0);
      byDate[e.date].revenue += (e.kamai || 0);
      byDate[e.date].cost += cost;
      byDate[e.date].profit += (e.kamai || 0) - cost;
      byDate[e.date].count += 1;
    });
    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
      .map(d => ({
        ...d,
        label: Utils.formatDate(d.date).slice(0, 6)
      }));
  }, [filteredEntries]);

  // Top sites by profit
  const topSites = useMemo(() => {
    const bySite = {};
    filteredEntries.forEach(e => {
      const name = data.sites.find(s => s.id === e.siteId)?.name || 'Unknown';
      if (!bySite[name]) bySite[name] = { name, revenue: 0, profit: 0, count: 0 };
      bySite[name].revenue += (e.kamai || 0);
      bySite[name].profit += Utils.calculateEntryProfit(e);
      bySite[name].count += 1;
    });
    return Object.values(bySite)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 6)
      .map(s => ({
        ...s,
        shortName: s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name
      }));
  }, [filteredEntries, data.sites]);

  // Source distribution
  const sourceData = useMemo(() => {
    const auto = filteredEntries.filter(e => isAutoEntry(e)).length;
    const override = filteredEntries.filter(e => !isAutoEntry(e) && e.manualOverride).length;
    const manual = filteredEntries.filter(e => !isAutoEntry(e) && !e.manualOverride).length;
    return [
      { name: 'Auto', value: auto, color: '#3b82f6' },
      { name: 'Override', value: override, color: '#f59e0b' },
      { name: 'Manual', value: manual, color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [filteredEntries]);

  // Cost breakdown pie
  const costBreakdown = useMemo(() => [
    { name: 'Labour', value: totalLabour, color: '#ef4444' },
    { name: 'Overhead', value: totalOverhead, color: '#3b82f6' },
    { name: 'One-Time', value: totalOneTime, color: '#8b5cf6' }
  ].filter(d => d.value > 0), [totalLabour, totalOverhead, totalOneTime]);

  // ============================================
  // TOOLTIP DETAILS
  // ============================================
  const cardDetails = {
    entries: { title: 'Total Entries', details: [
      { label: 'Entries', value: totalEntries },
      { label: 'Revenue', value: Utils.formatCurrency(totalRevenue) },
      { label: 'Profit', value: Utils.formatCurrency(totalProfit) },
      { label: 'Avg Profit', value: Utils.formatCurrency(avgProfit) }
    ]},
    revenue: { title: 'Total Revenue', details: [
      { label: 'Revenue', value: Utils.formatCurrency(totalRevenue) },
      { label: 'Entries', value: totalEntries },
      { label: 'Avg/Entry', value: Utils.formatCurrency(totalEntries ? totalRevenue / totalEntries : 0) },
      { label: 'Profit', value: Utils.formatCurrency(totalProfit) }
    ]},
    profit: { title: 'Total Profit', details: [
      { label: 'Profit', value: Utils.formatCurrency(totalProfit) },
      { label: 'Revenue', value: Utils.formatCurrency(totalRevenue) },
      { label: 'Margin', value: `${profitMargin.toFixed(1)}%` },
      { label: 'Avg', value: Utils.formatCurrency(avgProfit) }
    ]},
    avg: { title: 'Avg Profit/Entry', details: [
      { label: 'Avg Profit', value: Utils.formatCurrency(avgProfit) },
      { label: 'Entries', value: totalEntries },
      { label: 'Total Profit', value: Utils.formatCurrency(totalProfit) },
      { label: 'Best Entry', value: Utils.formatCurrency(bestEntry) }
    ]}
  };

  const handleCardHover = (id, e) => {
    setHoveredCard(id);
    setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // HANDLERS
  // ============================================
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.siteId) {
      setErrorMessage('Please select a site');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    const entry = {
      date: formData.date,
      siteId: formData.siteId,
      kamai: parseFloat(formData.kamai) || 0,
      labour: parseFloat(formData.labour) || 0,
      overhead: dailyOH,
      oneTime: parseFloat(formData.oneTime) || 0,
      note: formData.note,
      manualOverride: isOverrideMode || !!editingId
    };
    try {
      if (editingId) {
        updateEntry(editingId, entry);
        setSuccessMessage('Entry updated successfully!');
        setEditingId(null);
      } else if (isOverrideMode) {
        addEntry(entry);
        setSuccessMessage('Override saved successfully!');
      } else {
        addEntry(entry);
        setSuccessMessage('Entry added successfully!');
      }
      setTimeout(() => setSuccessMessage(''), 3000);
      resetForm();
      setShowModal(false);
    } catch (err) {
      setErrorMessage('Failed to save entry. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleDelete = (id) => {
    try {
      deleteEntry(id);
      setSuccessMessage('Entry deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowDeleteConfirm(null);
      if (paginatedEntries.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
    } catch (err) {
      setErrorMessage('Failed to delete entry. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const resetForm = () => {
    setFormData({ date: Utils.today(), siteId: '', kamai: '', labour: '', oneTime: '', note: '' });
    setEditingId(null);
    setIsOverrideMode(false);
  };

  const openEditModal = (entry) => {
    setEditingId(entry.id); setIsOverrideMode(false);
    setFormData({
      date: entry.date, siteId: entry.siteId,
      kamai: (entry.kamai || 0).toString(),
      labour: (entry.labour || 0).toString(),
      oneTime: (entry.oneTime || 0).toString(),
      note: entry.note || ''
    });
    setShowModal(true);
  };

  const openOverrideModal = (entry) => {
    setEditingId(null); setIsOverrideMode(true);
    setFormData({
      date: entry.date, siteId: entry.siteId,
      kamai: (entry.kamai || 0).toString(),
      labour: (entry.labour || 0).toString(),
      oneTime: (entry.oneTime || 0).toString(),
      note: entry.note || ''
    });
    setShowModal(true);
  };

  const openAddModal = () => { resetForm(); setShowModal(true); };

  const getSiteName = (id) => data.sites.find(s => s.id === id)?.name || 'Unknown Site';

  const goToPage = (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  const getPageNumbers = () => {
    const pages = []; const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const clearFilters = () => { setFilter({ site: '', dateFrom: '', dateTo: '' }); setSearchTerm(''); };
  const hasActiveFilters = filter.site || filter.dateFrom || filter.dateTo || searchTerm.trim();

  // ============================================
  // KPI CARDS
  // ============================================
  const kpiItems = [
    { id: 'entries', icon: FileText, label: 'Total Entries', value: totalEntries,
      meta: `${data.sites.length} sites`, color: '#3b82f6',
      accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up' },
    { id: 'revenue', icon: DollarSign, label: 'Total Revenue',
      value: Utils.formatCurrencyShort(totalRevenue),
      meta: `${totalEntries} entries`, color: '#10b981',
      accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'profit', icon: TrendingUp, label: 'Total Profit',
      value: Utils.formatCurrencyShort(totalProfit),
      meta: `${profitMargin.toFixed(1)}% margin`,
      color: totalProfit >= 0 ? '#10b981' : '#ef4444',
      accent: totalProfit >= 0
        ? 'linear-gradient(90deg,#10b981,#34d399)'
        : 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: totalProfit >= 0 ? 'up' : 'down' },
    { id: 'avg', icon: Award, label: 'Avg Profit/Entry',
      value: Utils.formatCurrencyShort(avgProfit),
      meta: `Best: ${Utils.formatCurrencyShort(bestEntry)}`,
      color: '#8b5cf6',
      accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)',
      trend: avgProfit >= 0 ? 'up' : 'down' }
  ];

  // ============================================
  // OVERVIEW TAB
  // ============================================
  const renderOverviewTab = () => (
    <div className="em-view">
      <div className="em-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="em-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="em-kpi-accent" style={{ background: item.accent }} />
              <div className="em-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="em-kpi-content">
                <span className="em-kpi-label">{item.label}</span>
                <span className="em-kpi-value">{item.value}</span>
                <span className="em-kpi-meta">{item.meta}</span>
              </div>
              <div className={`em-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={16} />}
                {item.trend === 'down' && <TrendingDown size={16} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 1 — daily trend (wide) + cost breakdown pie */}
      <div className="em-grid-2-1">
        <div className="em-card">
          <div className="em-card-header">
            <div className="em-card-title">
              <span className="em-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <LineChartIcon size={16} />
              </span>
              <div>
                <h4>Revenue &amp; Profit Trend</h4>
                <span>Recent daily performance</span>
              </div>
            </div>
            <div className="em-legend">
              <span><i style={{ background: '#10b981' }} />Revenue</span>
              <span><i style={{ background: '#ef4444' }} />Cost</span>
              <span><i style={{ background: '#f59e0b' }} />Profit</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={dailyTrend}>
              <defs>
                <linearGradient id="emRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="emProfitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <ReTooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5}
                fill="url(#emRevGrad)" name="Revenue" />
              <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2.5}
                name="Cost" dot={{ r: 3, strokeWidth: 2 }} />
              <Area type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={2.5}
                fill="url(#emProfitGrad)" name="Profit" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="em-card">
          <div className="em-card-header">
            <div className="em-card-title">
              <span className="em-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Cost Breakdown</h4>
                <span>By category</span>
              </div>
            </div>
          </div>
          {costBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={costBreakdown} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} stroke="none">
                    {costBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="em-pie-legend">
                {costBreakdown.map((d, i) => (
                  <div key={i} className="em-pie-item">
                    <span className="em-pie-dot" style={{ background: d.color }} />
                    <span className="em-pie-name">{d.name}</span>
                    <span className="em-pie-val">{Utils.formatCurrencyShort(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="em-empty-mini">No cost data available</div>
          )}
        </div>
      </div>

      {/* Row 2 — top sites bar + source distribution */}
      <div className="em-grid-1-1">
        <div className="em-card">
          <div className="em-card-header">
            <div className="em-card-title">
              <span className="em-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <BarChart3 size={16} />
              </span>
              <div>
                <h4>Top Sites by Profit</h4>
                <span>Highest performing sites</span>
              </div>
            </div>
          </div>
          {topSites.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={topSites} layout="vertical" margin={{ left: 10, right: 20 }}>
                <defs>
                  <linearGradient id="emSiteProfit" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11}
                  tickFormatter={(v) => Utils.formatCurrencyShort(v)} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="shortName" stroke="#94a3b8" fontSize={11}
                  tickLine={false} axisLine={false} width={90} />
                <ReTooltip content={<ChartTooltip />} />
                <Bar dataKey="profit" name="Profit" fill="url(#emSiteProfit)"
                  radius={[0, 8, 8, 0]} barSize={22} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="em-empty-mini">No site data</div>
          )}
        </div>

        <div className="em-card">
          <div className="em-card-header">
            <div className="em-card-title">
              <span className="em-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Layers size={16} />
              </span>
              <div>
                <h4>Source Distribution</h4>
                <span>Auto · Override · Manual</span>
              </div>
            </div>
          </div>
          {sourceData.length > 0 ? (
            <div className="em-source-list">
              {sourceData.map((d, i) => {
                const total = sourceData.reduce((s, x) => s + x.value, 0) || 1;
                const pct = (d.value / total) * 100;
                return (
                  <div key={i} className="em-source-row">
                    <div className="em-source-row-head">
                      <span className="em-source-dot" style={{ background: d.color }} />
                      <span className="em-source-name">{d.name}</span>
                      <span className="em-source-val">{d.value}</span>
                    </div>
                    <div className="em-source-track">
                      <div className="em-source-fill"
                        style={{ width: `${pct}%`, background: d.color }} />
                    </div>
                    <span className="em-source-pct">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="em-empty-mini">No data</div>
          )}
        </div>
      </div>
    </div>
  );

  // ============================================
  // ENTRIES TAB
  // ============================================
  const renderEntriesTab = () => (
    <div className="em-view">
      {/* Filters */}
      <div className="em-filters">
        <div className="em-search">
          <Search size={15} className="em-search-icon" />
          <input type="text" placeholder="Search by site, note, or date..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && (
            <button className="em-search-clear" onClick={() => setSearchTerm('')}>
              <X size={13} />
            </button>
          )}
        </div>
        <div className="em-filter-group">
          <select value={filter.site}
            onChange={e => setFilter({ ...filter, site: e.target.value })} className="em-select">
            <option value="">All Sites</option>
            {data.sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select>
          <input type="date" value={filter.dateFrom}
            onChange={e => setFilter({ ...filter, dateFrom: e.target.value })} className="em-date" />
          <input type="date" value={filter.dateTo}
            onChange={e => setFilter({ ...filter, dateTo: e.target.value })} className="em-date" />
        </div>
        {hasActiveFilters && (
          <button className="em-clear-filters" onClick={clearFilters}>
            <X size={13} /> Clear
          </button>
        )}
        <span className="em-result-count">
          Showing {filteredEntries.length} of {data.entries?.length || 0}
        </span>
      </div>

      {/* Entries grid */}
      {filteredEntries.length === 0 ? (
        <div className="em-empty">
          <div className="em-empty-icon-wrapper">
            {hasActiveFilters ? <Search size={40} /> : <FileText size={40} />}
          </div>
          <h3>{hasActiveFilters ? 'No matching entries' : 'No entries yet'}</h3>
          <p>{hasActiveFilters ? 'Try adjusting your search or filters.' : 'Add your first entry to get started.'}</p>
          {hasActiveFilters ? (
            <button className="em-btn-secondary" onClick={clearFilters}>
              <X size={14} /> Clear filters
            </button>
          ) : (
            <button className="em-btn-primary" onClick={openAddModal}>
              <Plus size={15} /> Add Entry
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="em-entries-grid">
            {paginatedEntries.map((entry, index) => {
              const profit = Utils.calculateEntryProfit(entry);
              const siteName = getSiteName(entry.siteId);
              const auto = isAutoEntry(entry);
              const badge = getSourceBadge(entry);
              return (
                <div key={entry.id}
                  className={`em-entry-card ${auto ? 'em-entry-auto' : ''}`}
                  style={{ animationDelay: `${Math.min(index * 50, 450)}ms` }}>
                  <div className="em-entry-card-accent"
                    style={{ background: auto ? 'linear-gradient(90deg,#3b82f6,#60a5fa)'
                      : entry.manualOverride ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                      : 'linear-gradient(90deg,#10b981,#34d399)' }} />

                  <div className="em-entry-header">
                    <div className="em-entry-left">
                      <div className="em-entry-date">
                        <Calendar size={13} />
                        {Utils.formatDate(entry.date)}
                      </div>
                      <div className="em-entry-site">
                        <Building2 size={13} />
                        {siteName}
                      </div>
                      <div className={badge.className}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </div>
                    </div>
                    <div className={`em-entry-profit ${profit >= 0 ? 'em-positive' : 'em-negative'}`}>
                      {profit >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {Utils.formatCurrency(profit)}
                    </div>
                  </div>

                  <div className="em-entry-details-grid">
                    <div className="em-detail-item">
                      <span className="em-detail-label">Revenue</span>
                      <span className="em-detail-value">{Utils.formatCurrency(entry.kamai)}</span>
                    </div>
                    <div className="em-detail-item">
                      <span className="em-detail-label">Labour</span>
                      <span className="em-detail-value">{Utils.formatCurrency(entry.labour)}</span>
                    </div>
                    <div className="em-detail-item">
                      <span className="em-detail-label">Overhead</span>
                      <span className="em-detail-value">{Utils.formatCurrency(entry.overhead)}</span>
                    </div>
                    <div className="em-detail-item">
                      <span className="em-detail-label">One-Time</span>
                      <span className="em-detail-value">{Utils.formatCurrency(entry.oneTime)}</span>
                    </div>
                  </div>

                  {entry.note && (
                    <div className="em-entry-note">
                      <FileText size={13} />
                      <span>{entry.note}</span>
                    </div>
                  )}

                  <div className="em-entry-actions">
                    {auto ? (
                      <button className="em-btn-action em-btn-override"
                        onClick={() => openOverrideModal(entry)}>
                        <Zap size={14} /> Override
                      </button>
                    ) : (
                      <>
                        <button className="em-btn-action em-btn-edit"
                          onClick={() => openEditModal(entry)}>
                          <Edit size={14} /> Edit
                        </button>
                        {entry.manualOverride && (
                          <button className="em-btn-action em-btn-revert"
                            onClick={() => setShowDeleteConfirm(entry.id)}
                            title="Remove override and revert to auto">
                            <RotateCcw size={14} /> Revert
                          </button>
                        )}
                        <button className="em-btn-action em-btn-delete"
                          onClick={() => setShowDeleteConfirm(entry.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="em-pagination">
            <div className="em-pagination-info">
              Showing <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong>–
              <strong>{Math.min(currentPage * itemsPerPage, filteredEntries.length)}</strong> of{' '}
              <strong>{filteredEntries.length}</strong> entries
            </div>
            <div className="em-pagination-controls">
              <div className="em-pagination-items">
                <span>Show:</span>
                <select value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="em-pagination-select">
                  {[5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="em-pagination-buttons">
                <button className="em-page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}>
                  <ChevronsLeft size={14} />
                </button>
                <button className="em-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft size={14} />
                </button>
                {getPageNumbers().map(page => (
                  <button key={page}
                    className={`em-page-btn ${page === currentPage ? 'active' : ''}`}
                    onClick={() => goToPage(page)}>{page}</button>
                ))}
                <button className="em-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  <ChevronRight size={14} />
                </button>
                <button className="em-page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>
                  <ChevronsRight size={14} />
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
  const renderFormModal = () => {
    const modalTitle = editingId ? 'Edit Entry' : isOverrideMode ? 'Override Auto Entry' : 'New Entry';
    const submitLabel = editingId ? 'Update Entry' : isOverrideMode ? 'Save Override' : 'Add Entry';
    return (
      <ModalPortal>
        <div className="em-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); resetForm(); } }}>
          <div className="em-modal em-entry-modal" onClick={e => e.stopPropagation()}>
            <div className="em-modal-header"
              style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <div className="em-modal-header-left">
                <div className="em-modal-icon">
                  {editingId ? <Edit size={18} /> : isOverrideMode ? <Zap size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h3>{modalTitle}</h3>
                  <p className="em-modal-sub">
                    {editingId ? 'Update entry details' : isOverrideMode ? 'Lock in auto-computed values' : 'Create a new entry'}
                  </p>
                </div>
              </div>
              <button className="em-modal-close" onClick={() => { setShowModal(false); resetForm(); }}>
                <X size={18} />
              </button>
            </div>
            <div className="em-modal-body">
              {isOverrideMode && (
                <div className="em-override-notice">
                  <Zap size={16} />
                  <span>You're editing an auto-computed entry. Saving will lock in these values as a manual override.</span>
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="em-form-row">
                  <div className="em-form-group">
                    <label><Calendar size={12} /> Date <span className="em-required">*</span></label>
                    <input type="date" value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      required disabled={isOverrideMode}
                      className={`em-form-input ${isOverrideMode ? 'em-disabled-input' : ''}`} />
                  </div>
                  <div className="em-form-group">
                    <label><Building2 size={12} /> Site <span className="em-required">*</span></label>
                    <select value={formData.siteId}
                      onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                      required disabled={isOverrideMode}
                      className={`em-form-select ${isOverrideMode ? 'em-disabled-input' : ''}`}>
                      <option value="">Select Site</option>
                      {data.sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="em-form-row">
                  <div className="em-form-group">
                    <label><DollarSign size={12} /> Revenue (BD)</label>
                    <input type="number" step="0.001" value={formData.kamai}
                      onChange={e => setFormData({ ...formData, kamai: e.target.value })}
                      placeholder="0.000" className="em-form-input" />
                  </div>
                  <div className="em-form-group">
                    <label><Users size={12} /> Labour Cost (BD)</label>
                    <input type="number" step="0.001" value={formData.labour}
                      onChange={e => setFormData({ ...formData, labour: e.target.value })}
                      placeholder="0.000" className="em-form-input" />
                  </div>
                </div>
                <div className="em-form-row">
                  <div className="em-form-group">
                    <label><Receipt size={12} /> Overhead (Auto) BD</label>
                    <input type="text" value={Utils.formatCurrency(dailyOH)} disabled
                      className="em-form-input em-disabled-input" />
                  </div>
                  <div className="em-form-group">
                    <label><FileText size={12} /> One-Time Expense BD</label>
                    <input type="number" step="0.001" value={formData.oneTime}
                      onChange={e => setFormData({ ...formData, oneTime: e.target.value })}
                      placeholder="0.000" className="em-form-input" />
                  </div>
                </div>
                <div className="em-form-group">
                  <label><FileText size={12} /> Note</label>
                  <input type="text" value={formData.note}
                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                    placeholder="What work was done today?" className="em-form-input" />
                </div>
                <div className="em-form-actions">
                  <button type="submit" className="em-btn-primary">
                    <Save size={14} /> {submitLabel}
                  </button>
                  <button type="button" className="em-btn-secondary"
                    onClick={() => { setShowModal(false); resetForm(); }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  };

  // ============================================
  // DELETE CONFIRM
  // ============================================
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm) return null;
    const target = filteredEntries.find(e => e.id === showDeleteConfirm);
    const isOverride = target?.manualOverride;
    return (
      <ModalPortal>
        <div className="em-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(null); }}>
          <div className="em-modal em-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="em-modal-header"
              style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
              <div className="em-modal-header-left">
                <div className="em-modal-icon">
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3>{isOverride ? 'Revert to Auto' : 'Delete Entry'}</h3>
                  <p className="em-modal-sub">
                    {isOverride ? 'Remove manual override' : 'This action cannot be undone'}
                  </p>
                </div>
              </div>
              <button className="em-modal-close" onClick={() => setShowDeleteConfirm(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="em-modal-body">
              <div className="em-delete-content">
                <div className="em-delete-icon-wrap">
                  <AlertCircle size={40} />
                </div>
                {isOverride ? (
                  <>
                    <p className="em-delete-text">Revert this entry back to its auto-computed values?</p>
                    <p className="em-delete-subtext">The manual override will be removed and the entry will be re-computed from attendance, expenses, and invoices.</p>
                  </>
                ) : (
                  <>
                    <p className="em-delete-text">Are you sure you want to delete this entry?</p>
                    <p className="em-delete-subtext">This action cannot be undone.</p>
                  </>
                )}
                <div className="em-delete-actions">
                  <button className="em-btn-danger" onClick={() => handleDelete(showDeleteConfirm)}>
                    <Trash2 size={14} /> {isOverride ? 'Revert' : 'Delete'}
                  </button>
                  <button className="em-btn-secondary" onClick={() => setShowDeleteConfirm(null)}>
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
    <div className={`em-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="em-ambient">
        <div className="em-orb em-orb-1" />
        <div className="em-orb em-orb-2" />
        <div className="em-orb em-orb-3" />
      </div>

      {/* Header */}
      <div className="em-header">
        <div className="em-header-left">
          <div className="em-header-icon-wrapper">
            <FileText size={22} />
            <span className="em-header-badge"><Sparkles size={10} /> ENTRIES</span>
          </div>
          <div>
            <h2>Manage Entries</h2>
            <p className="em-header-subtitle">
              {totalEntries} entries · {Utils.formatCurrencyShort(totalRevenue)} revenue · {Utils.formatCurrencyShort(totalProfit)} profit
            </p>
          </div>
        </div>
        <div className="em-header-right">
          <button className="em-btn-ghost" onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="em-btn-primary" onClick={openAddModal}>
            <Plus size={15} /> New Entry
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="em-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'entries', label: 'Entries', icon: FileText, badge: filteredEntries.length }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id}
              className={`em-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => setViewMode(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="em-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* Tooltip */}
      {hoveredCard && cardDetails[hoveredCard] && viewMode === 'overview' && (
        <div className="em-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="em-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="em-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="em-tooltip-row">
                <span className="em-tooltip-label">{d.label}</span>
                <span className="em-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {errorMessage && <div className="em-message error"><AlertCircle size={15} /> {errorMessage}</div>}
      {successMessage && <div className="em-message success"><CheckCircle size={15} /> {successMessage}</div>}

      {/* View */}
      {viewMode === 'overview' ? renderOverviewTab() : renderEntriesTab()}

      {/* Modals */}
      {showModal && renderFormModal()}
      {renderDeleteConfirm()}
    </div>
  );
};

export default EntriesManagerComponent;