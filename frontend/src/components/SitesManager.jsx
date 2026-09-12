// src/components/SitesManagerComponent.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2, Edit, Trash2, Plus, X, Save,
  MapPin, User, Phone, RefreshCw,
  TrendingUp, TrendingDown, BarChart3, Search,
  LayoutDashboard, Users, DollarSign,
  Calendar, Clock, Award, Crown, Star,
  Info, ArrowUpRight, ArrowDownRight,
  CheckCircle, AlertCircle, Target, Gauge,
  Zap, Sparkles, HardHat, Hash, Layers,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Activity, Flame, Percent as PercentIcon,
  PieChart as PieChartIcon, LineChart as LineChartIcon,
  Trophy, Wallet, Landmark, Receipt, Scale,
  BadgeCheck, Minus, Briefcase, Calculator,
  CircleDollarSign, Package, Timer, Filter,
  ChevronDown, MoreHorizontal, Eye
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  ComposedChart, Area, AreaChart, Line
} from 'recharts';
import Utils from '../utils/Utils';
import './SitesManager.css';

// ============================================
// PORTAL
// ============================================
const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

// ============================================
// RING PERCENTAGE GAUGE
// ============================================
const RingGauge = ({ value = 0, max = 100, size = 130, stroke = 10, color = '#009846', label, sublabel }) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = circ * pct;
  const gap = circ - dash;
  return (
    <div className="sites-ring-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="rgba(148,163,184,0.18)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="sites-ring-center">
        <span className="sites-ring-value" style={{ color }}>{Math.round(pct * 100)}%</span>
        {label && <span className="sites-ring-label">{label}</span>}
        {sublabel && <span className="sites-ring-sublabel">{sublabel}</span>}
      </div>
    </div>
  );
};

// ============================================
// CHART TOOLTIP
// ============================================
const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="sites-chart-tooltip">
      {label && <div className="sites-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="sites-chart-tooltip-row">
          <span className="sites-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="sites-chart-tooltip-name">{p.name}</span>
          <span className="sites-chart-tooltip-val">
            {formatter ? formatter(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const SITE_COLORS = ['#009846', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

// ============================================
// MAIN COMPONENT
// ============================================
const SitesManagerComponent = ({ data, addSite, updateSite, deleteSite, refreshData }) => {
  // View mode: 'overview' | 'sites'
  const [viewMode, setViewMode] = useState('overview');

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  // Pagination for sites list
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    manager: '',
    phone: ''
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  };

  // ============================================
  // DATA
  // ============================================
  const sites = data?.sites || [];
  const entries = data?.entries || [];

  const siteStats = useMemo(() => {
    return sites.map(site => {
      const siteEntries = entries.filter(e => e.siteId === site.id);
      const totalRevenue = siteEntries.reduce((sum, e) => sum + (e.revenue ?? e.kamai ?? 0), 0);
      const totalLabour = siteEntries.reduce((sum, e) => sum + (e.labour || 0), 0);
      const totalOH = siteEntries.reduce((sum, e) => sum + (e.ohShare ?? e.overhead ?? 0), 0);
      const totalOneTime = siteEntries.reduce((sum, e) => sum + (e.oneTime || 0), 0);
      const totalMaterial = siteEntries.reduce((sum, e) => sum + (e.materialCost || 0), 0);
      const totalEquipment = siteEntries.reduce((sum, e) => sum + (e.equipmentCost || 0), 0);
      const totalTransport = siteEntries.reduce((sum, e) => sum + (e.transportCost || 0), 0);
      const totalOther = siteEntries.reduce((sum, e) => sum + (e.otherExpense || 0), 0);

      const profit = totalRevenue - totalLabour - totalOH - totalOneTime
        - totalMaterial - totalEquipment - totalTransport - totalOther;
      const entryCount = siteEntries.length;
      const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      let health = 'idle';
      if (entryCount === 0) health = 'idle';
      else if (profit > 0) health = 'profit';
      else health = 'loss';

      return {
        ...site,
        totalRevenue, totalLabour, totalOH, totalOneTime,
        totalMaterial, totalEquipment, totalTransport, totalOther,
        profit, entryCount, margin,
        avgPerEntry: entryCount > 0 ? profit / entryCount : 0,
        isProfit: profit >= 0,
        health
      };
    });
  }, [sites, entries]);

  const filteredSites = useMemo(() => {
    let filtered = siteStats;
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(site =>
        site.name.toLowerCase().includes(search) ||
        (site.location && site.location.toLowerCase().includes(search)) ||
        (site.manager && site.manager.toLowerCase().includes(search))
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter(s => s.health === statusFilter);
    return filtered;
  }, [siteStats, searchTerm, statusFilter]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.max(1, Math.ceil(filteredSites.length / itemsPerPage));
  const paginatedSites = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSites.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSites, currentPage, itemsPerPage]);

  const goToPage = (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, itemsPerPage, viewMode]);

  // ============================================
  // SUMMARY
  // ============================================
  const summary = useMemo(() => {
    const totalSites = siteStats.length;
    const totalProfit = siteStats.reduce((sum, s) => sum + s.profit, 0);
    const totalRevenue = siteStats.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalLabour = siteStats.reduce((sum, s) => sum + s.totalLabour, 0);
    const totalOH = siteStats.reduce((sum, s) => sum + s.totalOH, 0);
    const totalOneTime = siteStats.reduce((sum, s) => sum + s.totalOneTime, 0);
    const totalMaterial = siteStats.reduce((sum, s) => sum + s.totalMaterial, 0);
    const totalEquipment = siteStats.reduce((sum, s) => sum + s.totalEquipment, 0);
    const totalTransport = siteStats.reduce((sum, s) => sum + s.totalTransport, 0);
    const totalOther = siteStats.reduce((sum, s) => sum + s.totalOther, 0);

    const profitSites = siteStats.filter(s => s.health === 'profit').length;
    const lossSites = siteStats.filter(s => s.health === 'loss').length;
    const idleSites = siteStats.filter(s => s.health === 'idle').length;
    const totalEntries = siteStats.reduce((sum, s) => sum + s.entryCount, 0);
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    let bestSite = null;
    let worstSite = null;
    if (siteStats.length > 0) {
      const withEntries = siteStats.filter(s => s.entryCount > 0);
      if (withEntries.length > 0) {
        const sorted = [...withEntries].sort((a, b) => b.profit - a.profit);
        bestSite = sorted[0];
        worstSite = sorted[sorted.length - 1];
      }
    }

    return {
      totalSites, totalProfit, totalRevenue, totalLabour, totalOH, totalOneTime,
      totalMaterial, totalEquipment, totalTransport, totalOther,
      profitSites, lossSites, idleSites, totalEntries, avgMargin,
      avgProfitPerSite: totalSites > 0 ? totalProfit / totalSites : 0,
      avgRevenuePerSite: totalSites > 0 ? totalRevenue / totalSites : 0,
      bestSite, worstSite
    };
  }, [siteStats]);

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const cardDetails = {
    totalSites: {
      title: 'Total Sites',
      details: [
        { label: 'Total Sites', value: summary.totalSites },
        { label: 'Profitable', value: summary.profitSites },
        { label: 'In Loss', value: summary.lossSites },
        { label: 'Idle (no entries)', value: summary.idleSites }
      ]
    },
    totalRevenue: {
      title: 'Total Revenue',
      details: [
        { label: 'Total Revenue', value: Utils.formatCurrency(summary.totalRevenue) },
        { label: 'Total Labour', value: Utils.formatCurrency(summary.totalLabour) },
        { label: 'Total Overhead', value: Utils.formatCurrency(summary.totalOH) },
        { label: 'Avg per Site', value: Utils.formatCurrency(summary.avgRevenuePerSite) }
      ]
    },
    totalProfit: {
      title: 'Net Profit',
      details: [
        { label: 'Total Profit', value: Utils.formatCurrency(summary.totalProfit) },
        { label: 'Profit Margin', value: `${summary.avgMargin.toFixed(1)}%` },
        { label: 'Total Revenue', value: Utils.formatCurrency(summary.totalRevenue) },
        { label: 'Avg per Site', value: Utils.formatCurrency(summary.avgProfitPerSite) }
      ]
    },
    profitSites: {
      title: 'Profitable Sites',
      details: [
        { label: 'Profitable', value: summary.profitSites },
        { label: 'In Loss', value: summary.lossSites },
        { label: 'Idle', value: summary.idleSites },
        {
          label: 'Success Rate',
          value: summary.totalSites > 0
            ? `${((summary.profitSites / summary.totalSites) * 100).toFixed(1)}%`
            : '0%'
        }
      ]
    }
  };

  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({ x: event.clientX + 15, y: event.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // CHART DATA
  // ============================================
  const healthDistribution = useMemo(() => {
    return [
      { name: 'Profitable', value: summary.profitSites, color: '#009846' },
      { name: 'In Loss', value: summary.lossSites, color: '#ef4444' },
      { name: 'Idle', value: summary.idleSites, color: '#94a3b8' }
    ].filter(d => d.value > 0);
  }, [summary]);

  const costBreakdownData = useMemo(() => {
    const total = summary.totalRevenue || 1;
    return [
      { key: 'labour', label: 'Labour', value: summary.totalLabour, pct: (summary.totalLabour / total) * 100, color: '#ef4444' },
      { key: 'overhead', label: 'Overhead', value: summary.totalOH, pct: (summary.totalOH / total) * 100, color: '#f59e0b' },
      { key: 'oneTime', label: 'One-Time', value: summary.totalOneTime, pct: (summary.totalOneTime / total) * 100, color: '#8b5cf6' },
      { key: 'material', label: 'Material', value: summary.totalMaterial, pct: (summary.totalMaterial / total) * 100, color: '#06b6d4' },
      { key: 'other', label: 'Other', value: summary.totalEquipment + summary.totalTransport + summary.totalOther, pct: ((summary.totalEquipment + summary.totalTransport + summary.totalOther) / total) * 100, color: '#94a3b8' },
      { key: 'profit', label: 'Profit', value: Math.max(0, summary.totalProfit), pct: (Math.max(0, summary.totalProfit) / total) * 100, color: '#009846' }
    ];
  }, [summary]);

  const topSitesData = useMemo(() => {
    return [...siteStats]
      .filter(s => s.entryCount > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8)
      .map(s => ({
        name: s.name.length > 14 ? s.name.slice(0, 14) + '…' : s.name,
        value: s.profit,
        revenue: s.totalRevenue
      }));
  }, [siteStats]);

  const siteRevenueChartData = useMemo(() => {
    return [...siteStats]
      .filter(s => s.entryCount > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)
      .map(s => ({
        name: s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name,
        revenue: s.totalRevenue,
        profit: Math.max(0, s.profit),
        labour: s.totalLabour
      }));
  }, [siteStats]);

  const monthlyTrendData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      const monthEntries = entries.filter(e => e.date && e.date.startsWith(key));
      const revenue = monthEntries.reduce((s, e) => s + (e.revenue ?? e.kamai ?? 0), 0);
      const labour = monthEntries.reduce((s, e) => s + (e.labour || 0), 0);
      const profit = monthEntries.reduce((s, e) => {
        const rev = e.revenue ?? e.kamai ?? 0;
        const lab = e.labour || 0;
        const oh = e.ohShare ?? e.overhead ?? 0;
        const ot = e.oneTime || 0;
        return s + (rev - lab - oh - ot);
      }, 0);
      months.push({ label, revenue, profit, labour });
    }
    return months;
  }, [entries]);

  // ============================================
  // KPI ITEMS
  // ============================================
  const kpiItems = [
    {
      id: 'totalSites', icon: Building2, label: 'Total Sites',
      value: summary.totalSites,
      meta: `${summary.profitSites} up · ${summary.lossSites} down · ${summary.idleSites} idle`,
      color: '#3b82f6', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up'
    },
    {
      id: 'totalRevenue', icon: DollarSign, label: 'Total Revenue',
      value: Utils.formatCurrencyShort(summary.totalRevenue),
      meta: `${summary.totalEntries} entries`,
      color: '#009846', accent: 'linear-gradient(90deg,#009846,#34d399)', trend: 'up'
    },
    {
      id: 'totalProfit', icon: TrendingUp, label: 'Net Profit',
      value: Utils.formatCurrencyShort(summary.totalProfit),
      meta: `${summary.avgMargin.toFixed(1)}% margin`,
      color: summary.totalProfit >= 0 ? '#009846' : '#ef4444',
      accent: summary.totalProfit >= 0
        ? 'linear-gradient(90deg,#009846,#34d399)'
        : 'linear-gradient(90deg,#dc2626,#ef4444)',
      trend: summary.totalProfit >= 0 ? 'up' : 'down'
    },
    {
      id: 'profitSites', icon: Target, label: 'Profitable Sites',
      value: summary.profitSites,
      meta: summary.totalSites > 0
        ? `${((summary.profitSites / summary.totalSites) * 100).toFixed(0)}% success`
        : 'no sites',
      color: '#8b5cf6', accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)', trend: 'neutral'
    }
  ];

  // ============================================
  // HANDLERS
  // ============================================
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Site name is required', 'error');
      return;
    }
    if (editingId) {
      updateSite(editingId, formData);
      showToast('Site updated');
    } else {
      addSite(formData);
      showToast('Site added');
    }
    setFormData({ name: '', location: '', manager: '', phone: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const resetForm = () => {
    setFormData({ name: '', location: '', manager: '', phone: '' });
    setEditingId(null);
  };

  const handleEdit = (site) => {
    setEditingId(site.id);
    setFormData({
      name: site.name || '',
      location: site.location || '',
      manager: site.manager || '',
      phone: site.phone || ''
    });
    setShowForm(true);
  };

  const handleDelete = (site) => {
    if (!window.confirm(`Delete site "${site.name}"? This cannot be undone.`)) return;
    deleteSite(site.id);
    showToast('Site deleted');
  };

  const toggleExpand = (id) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'all';

  // ============================================
  // OVERVIEW TAB
  // ============================================
  const renderOverviewTab = () => (
    <div className="sites-view">
      {/* KPI Cards */}
      <div className="sites-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="sites-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="sites-kpi-accent" style={{ background: item.accent }} />
              <div className="sites-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="sites-kpi-content">
                <span className="sites-kpi-label">{item.label}</span>
                <span className="sites-kpi-value">{item.value}</span>
                <span className="sites-kpi-meta">{item.meta}</span>
              </div>
              <div className={`sites-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={15} />}
                {item.trend === 'down' && <ArrowDownRight size={15} />}
                {item.trend === 'neutral' && <BarChart3 size={15} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="sites-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="sites-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="sites-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="sites-tooltip-row">
                <span className="sites-tooltip-label">{d.label}</span>
                <span className="sites-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 1 — Percentage Ring Gauges */}
      <div className="sites-card">
        <div className="sites-card-header-top">
          <div className="sites-card-title">
            <span className="sites-card-icon" style={{ background: 'rgba(0,152,70,0.12)', color: '#009846' }}>
              <PercentIcon size={16} />
            </span>
            <div>
              <h4>Key Performance Rates</h4>
              <span>Live percentages from current data</span>
            </div>
          </div>
        </div>
        <div className="sites-rings-row">
          <RingGauge
            value={summary.totalSites > 0 ? (summary.profitSites / summary.totalSites) * 100 : 0}
            max={100} size={140} stroke={11} color="#009846"
            label="SUCCESS RATE" sublabel="profitable sites" />
          <RingGauge
            value={summary.totalSites > 0 ? (summary.lossSites / summary.totalSites) * 100 : 0}
            max={100} size={140} stroke={11} color="#ef4444"
            label="LOSS RATE" sublabel="in loss" />
          <RingGauge
            value={summary.avgMargin}
            max={100} size={140} stroke={11} color="#3b82f6"
            label="PROFIT MARGIN" sublabel="of revenue" />
          <RingGauge
            value={summary.totalRevenue > 0 ? (summary.totalLabour / summary.totalRevenue) * 100 : 0}
            max={100} size={140} stroke={11} color="#f59e0b"
            label="LABOUR" sublabel="of revenue" />
          <RingGauge
            value={summary.totalSites > 0 ? (summary.idleSites / summary.totalSites) * 100 : 0}
            max={100} size={140} stroke={11} color="#94a3b8"
            label="IDLE" sublabel="no entries" />
        </div>
        <div className="sites-rings-legend">
          <span><i style={{ background: '#009846' }} />Success Rate</span>
          <span><i style={{ background: '#ef4444' }} />Loss Rate</span>
          <span><i style={{ background: '#3b82f6' }} />Profit Margin</span>
          <span><i style={{ background: '#f59e0b' }} />Labour %</span>
          <span><i style={{ background: '#94a3b8' }} />Idle %</span>
        </div>
      </div>

      {/* Row 2 — Health Donut + Cost Breakdown */}
      <div className="sites-grid-1-1">
        <div className="sites-card">
          <div className="sites-card-header-top">
            <div className="sites-card-title">
              <span className="sites-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Sites by Health</h4>
                <span>{summary.totalSites} total sites</span>
              </div>
            </div>
          </div>
          {healthDistribution.length > 0 ? (
            <div className="sites-donut-wrap">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={healthDistribution} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                    {healthDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="sites-donut-legend">
                {healthDistribution.map((d, i) => (
                  <div key={i} className="sites-donut-item">
                    <span className="sites-donut-dot" style={{ background: d.color }} />
                    <span className="sites-donut-name">{d.name}</span>
                    <span className="sites-donut-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="sites-empty-mini">No sites yet</div>}
        </div>

        <div className="sites-card">
          <div className="sites-card-header-top">
            <div className="sites-card-title">
              <span className="sites-card-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                <Scale size={16} />
              </span>
              <div>
                <h4>Cost Breakdown</h4>
                <span>Percentage of revenue</span>
              </div>
            </div>
          </div>
          <div className="sites-method-rings">
            {costBreakdownData.map((m, i) => (
              <div key={i} className="sites-method-item">
                <RingGauge value={m.pct} max={100} size={100} stroke={8} color={m.color} label={m.label} />
                <span className="sites-method-value">{Utils.formatCurrencyShort(m.value)}</span>
                <span className="sites-method-pct">{m.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 — 12-Month Trend */}
      <div className="sites-card">
        <div className="sites-card-header-top">
          <div className="sites-card-title">
            <span className="sites-card-icon" style={{ background: 'rgba(0,152,70,0.12)', color: '#009846' }}>
              <LineChartIcon size={16} />
            </span>
            <div>
              <h4>12-Month Site Performance Trend</h4>
              <span>Revenue, Profit & Labour by month</span>
            </div>
          </div>
          <div className="sites-legend">
            <span><i style={{ background: '#3b82f6' }} />Revenue</span>
            <span><i style={{ background: '#009846' }} />Profit</span>
            <span><i style={{ background: '#ef4444' }} />Labour</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={monthlyTrendData}>
            <defs>
              <linearGradient id="sitesRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
              tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
            <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5}
              fill="url(#sitesRevGrad)" name="Revenue" />
            <Line type="monotone" dataKey="profit" stroke="#009846" strokeWidth={2.5}
              dot={{ fill: '#009846', r: 3 }} name="Profit" />
            <Line type="monotone" dataKey="labour" stroke="#ef4444" strokeWidth={2.5}
              dot={{ fill: '#ef4444', r: 3 }} name="Labour" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Row 4 — Top Sites by Profit + Site Revenue */}
      <div className="sites-grid-1-1">
        <div className="sites-card">
          <div className="sites-card-header-top">
            <div className="sites-card-title">
              <span className="sites-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Trophy size={16} />
              </span>
              <div>
                <h4>Top Sites by Profit</h4>
                <span>Highest performing sites</span>
              </div>
            </div>
          </div>
          {topSitesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topSitesData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <defs>
                  <linearGradient id="sitesTopGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11}
                  tickLine={false} axisLine={false} width={120} />
                <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" name="Profit" fill="url(#sitesTopGrad)" radius={[0, 8, 8, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="sites-empty-mini">No site data</div>}
        </div>

        <div className="sites-card">
          <div className="sites-card-header-top">
            <div className="sites-card-title">
              <span className="sites-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <BarChart3 size={16} />
              </span>
              <div>
                <h4>Site Revenue & Profit</h4>
                <span>Top 10 by revenue</span>
              </div>
            </div>
            <div className="sites-legend">
              <span><i style={{ background: '#3b82f6' }} />Revenue</span>
              <span><i style={{ background: '#009846' }} />Profit</span>
            </div>
          </div>
          {siteRevenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={siteRevenueChartData} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}
                  angle={-30} textAnchor="end" height={60} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
                <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={18} />
                <Bar dataKey="profit" name="Profit" fill="#009846" radius={[6, 6, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="sites-empty-mini">No site data</div>}
        </div>
      </div>

      {/* Best / Worst Highlights */}
      {(summary.bestSite || summary.worstSite) && (
        <div className="sites-highlight-grid">
          {summary.bestSite && (
            <div className="sites-highlight sites-highlight-best">
              <div className="sites-highlight-left">
                <div className="sites-highlight-icon sites-highlight-icon-best">
                  <Crown size={20} />
                </div>
                <div>
                  <div className="sites-highlight-label">Best Performing Site</div>
                  <div className="sites-highlight-name">{summary.bestSite.name}</div>
                  <div className="sites-highlight-meta">
                    {summary.bestSite.entryCount} entries · {summary.bestSite.location || 'No location'}
                  </div>
                </div>
              </div>
              <div className="sites-highlight-value is-positive">
                <TrendingUp size={14} />
                {Utils.formatCurrencyShort(summary.bestSite.profit)}
              </div>
            </div>
          )}
          {summary.worstSite && (
            <div className="sites-highlight sites-highlight-worst">
              <div className="sites-highlight-left">
                <div className="sites-highlight-icon sites-highlight-icon-worst">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <div className="sites-highlight-label">Needs Attention</div>
                  <div className="sites-highlight-name">{summary.worstSite.name}</div>
                  <div className="sites-highlight-meta">
                    {summary.worstSite.entryCount} entries · {summary.worstSite.location || 'No location'}
                  </div>
                </div>
              </div>
              <div className={`sites-highlight-value ${summary.worstSite.profit >= 0 ? 'is-positive' : 'is-negative'}`}>
                {summary.worstSite.profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {Utils.formatCurrencyShort(summary.worstSite.profit)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ============================================
  // SITES TAB (like Loan cards)
  // ============================================
  const renderSitesTab = () => (
    <div className="sites-view">
      {/* Filters Row */}
      <div className="sites-filters">
        <div className="sites-search">
          <Search size={15} className="sites-search-icon" />
          <input
            type="text"
            placeholder="Search sites, location, or manager..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="sites-search-clear" onClick={() => setSearchTerm('')}>
              <X size={13} />
            </button>
          )}
        </div>

        <div className="sites-status-filter">
          {[
            { id: 'all', label: 'All', icon: Layers, count: summary.totalSites },
            { id: 'profit', label: 'Profitable', icon: TrendingUp, count: summary.profitSites },
            { id: 'loss', label: 'In Loss', icon: TrendingDown, count: summary.lossSites },
            { id: 'idle', label: 'Idle', icon: Clock, count: summary.idleSites }
          ].map(f => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                className={`sites-status-pill ${statusFilter === f.id ? 'active' : ''}`}
                onClick={() => setStatusFilter(f.id)}
              >
                <Icon size={13} />
                <span>{f.label}</span>
                <span className="sites-pill-count">{f.count}</span>
              </button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <button className="sites-clear-filters" onClick={clearFilters}>
            <X size={13} /> Clear
          </button>
        )}

        <span className="sites-result-count">
          {filteredSites.length} of {siteStats.length}
        </span>

        <button
          className="sites-btn sites-btn-primary"
          onClick={() => { resetForm(); setShowForm(true); }}
        >
          <Plus size={14} /> Add Site
        </button>
      </div>

      {error && !toast && <div className="sites-message error"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="sites-message success"><CheckCircle size={16} /> {success}</div>}

      {/* Sites Grid (like Loan cards) */}
      {paginatedSites.length === 0 ? (
        <div className="sites-empty">
          <div className="sites-empty-icon">
            {hasActiveFilters ? <Search size={40} /> : <Building2 size={40} />}
          </div>
          <h3>{hasActiveFilters ? 'No matching sites' : 'No sites yet'}</h3>
          <p>
            {hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'Add your first site by clicking the button above.'}
          </p>
          {hasActiveFilters ? (
            <button className="sites-btn sites-btn-secondary" onClick={clearFilters}>
              <X size={14} /> Clear filters
            </button>
          ) : (
            <button className="sites-btn sites-btn-primary"
              onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={15} /> Add Site
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="sites-grid">
            {paginatedSites.map((site, i) => {
              const isProfit = site.health === 'profit';
              const isLoss = site.health === 'loss';
              const isIdle = site.health === 'idle';
              const isExpanded = expandedItems[site.id];

              return (
                <div
                  key={site.id}
                  className={`sites-card-item sites-card-${site.health}`}
                  style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                >
                  <div className="sites-card-accent"
                    style={{
                      background: isProfit
                        ? 'linear-gradient(90deg, #009846, #00b856)'
                        : isLoss
                          ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                          : 'linear-gradient(90deg, #94a3b8, #cbd5e1)'
                    }}
                  />

                  {/* Card Head */}
                  <div className="sites-card-head">
                    <div className="sites-head-left">
                      <div className="sites-number">
                        <Hash size={11} />
                        {site.id}
                      </div>
                      <div className="sites-employee">
                        <Building2 size={12} /> {site.name}
                      </div>
                      {site.location && (
                        <div className="sites-location-tag">
                          <MapPin size={10} /> {site.location}
                        </div>
                      )}
                    </div>
                    <div className="sites-head-right">
                      <span className={`sites-status-chip ${site.health}`}>
                        {isProfit ? <TrendingUp size={11} /> : isLoss ? <TrendingDown size={11} /> : <Clock size={11} />}
                        {isProfit ? 'Profit' : isLoss ? 'Loss' : 'Idle'}
                      </span>
                      <div className={`sites-amount ${isProfit ? 'is-positive' : isLoss ? 'is-negative' : 'is-idle'}`}>
                        {Utils.formatCurrencyShort(site.profit)}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="sites-body">
                    <div className="sites-detail-grid">
                      <div className="sites-detail">
                        <span className="sites-detail-label">Revenue</span>
                        <span className="sites-detail-value sites-td-green">
                          {Utils.formatCurrencyShort(site.totalRevenue)}
                        </span>
                      </div>
                      <div className="sites-detail">
                        <span className="sites-detail-label">Labour</span>
                        <span className="sites-detail-value sites-td-red">
                          {Utils.formatCurrencyShort(site.totalLabour)}
                        </span>
                      </div>
                      <div className="sites-detail">
                        <span className="sites-detail-label">Overhead</span>
                        <span className="sites-detail-value sites-td-amber">
                          {Utils.formatCurrencyShort(site.totalOH)}
                        </span>
                      </div>
                      <div className="sites-detail">
                        <span className="sites-detail-label">Entries</span>
                        <span className="sites-detail-value sites-td-blue">
                          {site.entryCount}
                        </span>
                      </div>
                    </div>

                    {site.totalRevenue > 0 && (
                      <div className="sites-progress-section">
                        <div className="sites-progress-header">
                          <span className="sites-progress-label">
                            <Gauge size={11} /> Margin
                          </span>
                          <span className="sites-progress-value">{site.margin.toFixed(1)}%</span>
                        </div>
                        <div className="sites-progress-bar">
                          <div
                            className={`sites-progress-fill ${isProfit ? 'is-positive' : 'is-negative'}`}
                            style={{ width: `${Math.min(Math.abs(site.margin), 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {site.manager && (
                      <div className="sites-meta-row">
                        <User size={11} /> {site.manager}
                        {site.phone && <span className="sites-meta-divider">·</span>}
                        {site.phone && <><Phone size={11} /> {site.phone}</>}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="sites-card-foot">
                    <div className="sites-actions">
                      <button className="sites-icon-btn sites-icon-view" title="View"
                        onClick={() => { setSelectedSite(site); setShowDetailModal(true); }}>
                        <Eye size={13} />
                      </button>
                      <button className="sites-icon-btn sites-icon-edit" title="Edit"
                        onClick={() => handleEdit(site)}>
                        <Edit size={13} />
                      </button>
                      <button className="sites-icon-btn sites-icon-danger" title="Delete"
                        onClick={() => handleDelete(site)}>
                        <Trash2 size={13} />
                      </button>
                      <button className="sites-icon-btn sites-icon-expand" title="More"
                        onClick={() => toggleExpand(site.id)}>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="sites-expanded">
                      <div className="sites-expanded-grid">
                        <div><strong>Site ID:</strong> {site.id}</div>
                        <div><strong>Site Name:</strong> {site.name}</div>
                        <div><strong>Location:</strong> {site.location || 'N/A'}</div>
                        <div><strong>Manager:</strong> {site.manager || 'N/A'}</div>
                        <div><strong>Phone:</strong> {site.phone || 'N/A'}</div>
                        <div><strong>Entries:</strong> {site.entryCount}</div>
                        <div><strong>Total Revenue:</strong> {Utils.formatCurrency(site.totalRevenue)}</div>
                        <div><strong>Total Labour:</strong> {Utils.formatCurrency(site.totalLabour)}</div>
                        <div><strong>Total Overhead:</strong> {Utils.formatCurrency(site.totalOH)}</div>
                        <div><strong>Total One-Time:</strong> {Utils.formatCurrency(site.totalOneTime)}</div>
                        <div><strong>Material:</strong> {Utils.formatCurrency(site.totalMaterial)}</div>
                        <div><strong>Equipment:</strong> {Utils.formatCurrency(site.totalEquipment)}</div>
                        <div><strong>Transport:</strong> {Utils.formatCurrency(site.totalTransport)}</div>
                        <div><strong>Other:</strong> {Utils.formatCurrency(site.totalOther)}</div>
                        <div><strong>Net Profit:</strong> {Utils.formatCurrency(site.profit)}</div>
                        <div><strong>Margin:</strong> {site.margin.toFixed(1)}%</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="sites-pagination">
            <div className="sites-pagination-info">
              Showing <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong>–<strong>{Math.min(currentPage * itemsPerPage, filteredSites.length)}</strong> of <strong>{filteredSites.length}</strong> sites
            </div>
            <div className="sites-pagination-controls">
              <div className="sites-pagination-items">
                <span>Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="sites-pagination-select"
                >
                  {[6, 9, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="sites-pagination-buttons">
                <button className="sites-page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}>
                  <ChevronsLeft size={13} />
                </button>
                <button className="sites-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft size={13} />
                </button>
                {getPageNumbers().map(page => (
                  <button
                    key={page}
                    className={`sites-page-btn ${page === currentPage ? 'active' : ''}`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button className="sites-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  <ChevronRight size={13} />
                </button>
                <button className="sites-page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>
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
      <div className="sites-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
        <div className="sites-modal" onClick={e => e.stopPropagation()}>
          <div className="sites-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="sites-modal-header-left">
              <div className="sites-modal-icon">
                {editingId ? <Edit size={18} /> : <Building2 size={18} />}
              </div>
              <div>
                <h3>{editingId ? 'Edit Site' : 'Add Site'}</h3>
                <p className="sites-modal-sub">
                  {editingId ? 'Update site details' : 'Create a new construction site'}
                </p>
              </div>
            </div>
            <button className="sites-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="sites-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="sites-form-row">
                <div className="sites-form-group">
                  <label><Building2 size={12} /> Site Name <span className="sites-required">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Amwaj Residence"
                    required
                    className="sites-form-input"
                    autoFocus
                  />
                </div>
                <div className="sites-form-group">
                  <label><MapPin size={12} /> Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Amwaj Islands, Block 257"
                    className="sites-form-input"
                  />
                </div>
              </div>

              <div className="sites-form-row">
                <div className="sites-form-group">
                  <label><User size={12} /> Site Manager</label>
                  <input
                    type="text"
                    value={formData.manager}
                    onChange={e => setFormData({ ...formData, manager: e.target.value })}
                    placeholder="Manager name"
                    className="sites-form-input"
                  />
                </div>
                <div className="sites-form-group">
                  <label><Phone size={12} /> Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+973 ..."
                    className="sites-form-input"
                  />
                </div>
              </div>

              <div className="sites-form-actions">
                <button type="submit" className="sites-btn sites-btn-primary" disabled={loading}>
                  <Save size={14} /> {loading ? 'Saving...' : (editingId ? 'Update Site' : 'Add Site')}
                </button>
                <button
                  type="button"
                  className="sites-btn sites-btn-secondary"
                  onClick={() => { setShowForm(false); resetForm(); }}
                >
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
  // DETAIL MODAL
  // ============================================
  const renderDetailModal = () => {
    if (!selectedSite) return null;
    const isProfit = selectedSite.health === 'profit';
    const isLoss = selectedSite.health === 'loss';
    return (
      <ModalPortal>
        <div className="sites-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDetailModal(false); }}>
          <div className="sites-modal sites-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="sites-modal-header" style={{ background: 'linear-gradient(135deg, #0b1a12, #1f3a2c)' }}>
              <div className="sites-modal-header-left">
                <div className="sites-modal-icon"><Building2 size={18} /></div>
                <div>
                  <h3>{selectedSite.name}</h3>
                  <p className="sites-modal-sub">{selectedSite.location || 'No location'}</p>
                </div>
              </div>
              <button className="sites-modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="sites-modal-body">
              <div className="sites-detail-grid-lg">
                <div className="sites-detail-section">
                  <h4>Basic Information</h4>
                  <div className="sites-detail-row"><span>Site ID</span><strong>{selectedSite.id}</strong></div>
                  <div className="sites-detail-row"><span>Name</span><strong>{selectedSite.name}</strong></div>
                  <div className="sites-detail-row"><span>Location</span><strong>{selectedSite.location || '—'}</strong></div>
                  <div className="sites-detail-row"><span>Manager</span><strong>{selectedSite.manager || '—'}</strong></div>
                  <div className="sites-detail-row"><span>Phone</span><strong>{selectedSite.phone || '—'}</strong></div>
                  <div className="sites-detail-row"><span>Entries</span><strong>{selectedSite.entryCount}</strong></div>
                </div>

                <div className="sites-detail-section">
                  <h4>Financials</h4>
                  <div className="sites-detail-row"><span>Revenue</span><strong style={{ color: '#047857' }}>{Utils.formatCurrency(selectedSite.totalRevenue)}</strong></div>
                  <div className="sites-detail-row"><span>Labour</span><strong style={{ color: '#b91c1c' }}>{Utils.formatCurrency(selectedSite.totalLabour)}</strong></div>
                  <div className="sites-detail-row"><span>Overhead</span><strong style={{ color: '#b45309' }}>{Utils.formatCurrency(selectedSite.totalOH)}</strong></div>
                  <div className="sites-detail-row"><span>One-Time</span><strong>{Utils.formatCurrency(selectedSite.totalOneTime)}</strong></div>
                  <div className="sites-detail-row"><span>Net Profit</span><strong style={{ color: isProfit ? '#047857' : '#b91c1c' }}>{Utils.formatCurrency(selectedSite.profit)}</strong></div>
                  <div className="sites-detail-row"><span>Margin</span><strong>{selectedSite.margin.toFixed(1)}%</strong></div>
                </div>

                <div className="sites-detail-section full-width">
                  <h4>Other Costs</h4>
                  <div className="sites-detail-row"><span>Material</span><strong>{Utils.formatCurrency(selectedSite.totalMaterial)}</strong></div>
                  <div className="sites-detail-row"><span>Equipment</span><strong>{Utils.formatCurrency(selectedSite.totalEquipment)}</strong></div>
                  <div className="sites-detail-row"><span>Transport</span><strong>{Utils.formatCurrency(selectedSite.totalTransport)}</strong></div>
                  <div className="sites-detail-row"><span>Other</span><strong>{Utils.formatCurrency(selectedSite.totalOther)}</strong></div>
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
    <div className={`sites-root ${mounted ? 'is-mounted' : ''}`}>
      {/* Toast */}
      {toast && (
        <div className={`sites-toast sites-toast-${toast.type}`} key={toast.id}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Ambient orbs */}
      <div className="sites-ambient">
        <div className="sites-orb sites-orb-1" />
        <div className="sites-orb sites-orb-2" />
        <div className="sites-orb sites-orb-3" />
      </div>

      {/* Header */}
      <div className="sites-header">
        <div className="sites-header-left">
          <div className="sites-header-icon">
            <Building2 size={22} />
            <span className="sites-header-badge"><Sparkles size={10} /> SITES</span>
          </div>
          <div>
            <h2>Sites Management</h2>
            <p className="sites-header-subtitle">
              {summary.totalSites} site{summary.totalSites !== 1 ? 's' : ''} · {summary.totalEntries} entr{summary.totalEntries === 1 ? 'y' : 'ies'} · {Utils.formatCurrencyShort(summary.totalProfit)} net profit
            </p>
          </div>
        </div>

        <div className="sites-header-right">
          <button className="sites-btn sites-btn-ghost" onClick={refreshData}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            className="sites-btn sites-btn-primary"
            onClick={() => { resetForm(); setShowForm(true); }}
          >
            <Plus size={14} /> Add Site
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sites-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'sites', label: 'Sites', icon: Building2, badge: summary.totalSites }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`sites-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => setViewMode(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && <span className="sites-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {viewMode === 'overview' && renderOverviewTab()}
      {viewMode === 'sites' && renderSitesTab()}

      {showForm && renderFormModal()}
      {showDetailModal && renderDetailModal()}
    </div>
  );
};

export default SitesManagerComponent;