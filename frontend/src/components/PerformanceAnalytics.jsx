// src/components/PerformanceAnalytics.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  TrendingUp, TrendingDown, BarChart3, PieChart, LineChart, Users,
  Building2, Award, Target, AlertCircle, CheckCircle, Clock, Calendar,
  Download, Printer, RefreshCw, ChevronDown, ChevronUp, Filter, Search,
  X, DollarSign, Percent, Activity, Zap, Shield, Star, LayoutDashboard,
  FolderKanban, Wallet, CalendarDays, MessageSquare, Video, Link2, Unlink,
  PhoneCall, Mail as MailIcon, Gauge, Sparkles, Crown, ArrowUpRight,
  ArrowDownRight, Info, HardHat, Briefcase, Timer, User, UserCheck, UserX,
  Plus, Edit, Trash2, Eye, Save, FileText, Settings, Award as AwardIcon,
  Target as TargetIcon, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, Flame, Layers, Minus, CircleDollarSign, Rocket
} from 'lucide-react';
import {
  LineChart as ReLineChart, Line, BarChart, Bar,
  PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend, ResponsiveContainer, Area, AreaChart,
  ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, RadialBarChart, RadialBar
} from 'recharts';
import Utils from '../utils/Utils';
import './PerformanceAnalytics.css';

import { CONFIG } from '../config/constants';
const API_BASE_URL = CONFIG.API_BASE || 'http://localhost:5000/api';

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
    <div className="pa-chart-tooltip">
      {label && <div className="pa-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="pa-chart-tooltip-row">
          <span className="pa-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.fill }} />
          <span className="pa-chart-tooltip-name">{p.name}</span>
          <span className="pa-chart-tooltip-val">
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
const PerformanceAnalytics = ({ data, refreshData }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [trends, setTrends] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [entityType, setEntityType] = useState('site');
  const [viewMode, setViewMode] = useState('overview');
  const [expandedItems, setExpandedItems] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  // Pagination
  const [rankingPage, setRankingPage] = useState(1);
  const [rankingPerPage, setRankingPerPage] = useState(10);
  const [kpiPage, setKpiPage] = useState(1);
  const [kpiPerPage, setKpiPerPage] = useState(10);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '', type: 'site', target: '', currentValue: '',
    unit: '%', period: 'monthly', description: '', notes: ''
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ============================================
  // LOAD FUNCTIONS
  // ============================================
  const loadMetrics = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/performance/metrics?period=${period}`, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) throw new Error('Failed to load metrics');
      const result = await r.json();
      setMetrics(result);
      return result;
    } catch (err) { console.error(err); throw err; }
  }, [period]);

  const loadRankings = useCallback(async () => {
    try {
      setRankings([]);
      const r = await fetch(`${API_BASE_URL}/performance/rankings?entityType=${entityType}&period=${period}`, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) throw new Error('Failed to load rankings');
      const result = await r.json();
      setRankings(Array.isArray(result) ? result : []);
      return result;
    } catch (err) { console.error(err); setRankings([]); throw err; }
  }, [entityType, period]);

  const loadTrends = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/performance/trends?metric=revenue&months=12`, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) throw new Error('Failed to load trends');
      const result = await r.json();
      if (Array.isArray(result) && result.length) setTrends(result);
      return result;
    } catch (err) { console.error(err); throw err; }
  }, []);

  const loadKPIs = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE_URL}/performance/kpis`, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) throw new Error('Failed to load KPIs');
      const result = await r.json();
      if (Array.isArray(result) && result.length) setKpis(result);
      return result;
    } catch (err) { console.error(err); throw err; }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      await loadMetrics();
      await loadRankings();
      await Promise.all([loadTrends(), loadKPIs()]);
    } catch (err) {
      setError('Failed to load data. Please refresh and try again.');
      console.error(err);
    } finally { setLoading(false); }
  }, [loadMetrics, loadRankings, loadTrends, loadKPIs]);

  useEffect(() => { setRankings([]); loadAllData(); }, [period, entityType, loadAllData]);

  // ============================================
  // PAGINATION HELPERS
  // ============================================
  const paginate = (items, page, perPage) => {
    const total = Math.max(1, Math.ceil(items.length / perPage));
    const p = Math.max(1, Math.min(page, total));
    const start = (p - 1) * perPage;
    return { total, page: p, items: items.slice(start, start + perPage) };
  };
  const getPageNumbers = (current, total) => {
    const pages = []; const max = 5;
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };
  const renderPaginationBar = (current, total, perPage, setPerPage, setPage, count) => {
    if (count === 0) return null;
    const startItem = (current - 1) * perPage + 1;
    const endItem = Math.min(current * perPage, count);
    return (
      <div className="pa-pagination">
        <div className="pa-pagination-info">
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{count}</strong>
        </div>
        <div className="pa-pagination-controls">
          <div className="pa-pagination-items">
            <span>Show:</span>
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="pa-pagination-select">
              {[6, 9, 10, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="pa-pagination-buttons">
            <button className="pa-page-btn" onClick={() => setPage(1)} disabled={current === 1}><ChevronsLeft size={13} /></button>
            <button className="pa-page-btn" onClick={() => setPage(current - 1)} disabled={current === 1}><ChevronLeft size={13} /></button>
            {getPageNumbers(current, total).map(p => (
              <button key={p} className={`pa-page-btn ${p === current ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="pa-page-btn" onClick={() => setPage(current + 1)} disabled={current === total}><ChevronRight size={13} /></button>
            <button className="pa-page-btn" onClick={() => setPage(total)} disabled={current === total}><ChevronsRight size={13} /></button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // CHART DATA
  // ============================================
  const productivity = metrics?.productivity || {};
  const financial = metrics?.financial || {};
  const quality = metrics?.quality || {};
  const safety = metrics?.safety || {};

  const kpiItems = [
    { id: 'revenue', label: 'Total Revenue', value: financial.totalRevenue || 0,
      target: 100000, unit: 'BD', icon: DollarSign, color: '#10b981',
      accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'profit', label: 'Total Profit', value: financial.totalProfit || 0,
      target: 25000, unit: 'BD', icon: TrendingUp,
      color: (financial.totalProfit || 0) >= 0 ? '#10b981' : '#ef4444',
      accent: (financial.totalProfit || 0) >= 0 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: (financial.totalProfit || 0) >= 0 ? 'up' : 'down' },
    { id: 'margin', label: 'Profit Margin', value: financial.profitMargin || 0,
      target: 25, unit: '%', icon: Percent, color: '#f59e0b',
      accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)', trend: 'up' },
    { id: 'entries', label: 'Total Entries', value: productivity.totalEntries || 0,
      target: 50, unit: '', icon: Activity, color: '#3b82f6',
      accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up' },
    { id: 'quality', label: 'Quality Pass Rate', value: quality.passRate || 0,
      target: 95, unit: '%', icon: Shield,
      color: (quality.passRate || 0) >= 90 ? '#10b981' : '#ef4444',
      accent: (quality.passRate || 0) >= 90 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: (quality.passRate || 0) >= 90 ? 'up' : 'down' },
    { id: 'safety', label: 'Safety Incidents', value: safety.totalIncidents || 0,
      target: 0, unit: '', icon: AlertCircle,
      color: (safety.totalIncidents || 0) === 0 ? '#10b981' : '#ef4444',
      accent: (safety.totalIncidents || 0) === 0 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: (safety.totalIncidents || 0) === 0 ? 'flat' : 'down' }
  ];

  const cardDetails = {
    revenue: { title: 'Total Revenue', details: [
      { label: 'Revenue', value: Utils.formatCurrency(financial.totalRevenue || 0) },
      { label: 'Cost', value: Utils.formatCurrency(financial.totalCost || 0) },
      { label: 'Profit', value: Utils.formatCurrency(financial.totalProfit || 0) },
      { label: 'Margin', value: `${(financial.profitMargin || 0).toFixed(1)}%` }
    ]},
    profit: { title: 'Total Profit', details: [
      { label: 'Profit', value: Utils.formatCurrency(financial.totalProfit || 0) },
      { label: 'Revenue', value: Utils.formatCurrency(financial.totalRevenue || 0) },
      { label: 'Cost', value: Utils.formatCurrency(financial.totalCost || 0) },
      { label: 'Avg/Entry', value: Utils.formatCurrency(financial.avgProfitPerEntry || 0) }
    ]},
    margin: { title: 'Profit Margin', details: [
      { label: 'Margin', value: `${(financial.profitMargin || 0).toFixed(1)}%` },
      { label: 'Revenue', value: Utils.formatCurrency(financial.totalRevenue || 0) },
      { label: 'Profit', value: Utils.formatCurrency(financial.totalProfit || 0) },
      { label: 'Target', value: '25%' }
    ]},
    entries: { title: 'Total Entries', details: [
      { label: 'Total', value: productivity.totalEntries || 0 },
      { label: 'Avg Daily', value: (productivity.avgDailyEntries || 0).toFixed(1) },
      { label: 'Avg Revenue', value: Utils.formatCurrency(productivity.avgRevenuePerEntry || 0) },
      { label: 'Labour Cost', value: Utils.formatCurrency(productivity.labourCost || 0) }
    ]},
    quality: { title: 'Quality Pass Rate', details: [
      { label: 'Pass Rate', value: `${(quality.passRate || 0).toFixed(1)}%` },
      { label: 'Inspections', value: quality.totalInspections || 0 },
      { label: 'Passed', value: quality.passed || 0 },
      { label: 'Failed', value: quality.failed || 0 }
    ]},
    safety: { title: 'Safety Incidents', details: [
      { label: 'Total', value: safety.totalIncidents || 0 },
      { label: 'Resolved', value: safety.resolved || 0 },
      { label: 'Resolution', value: `${(safety.resolutionRate || 0).toFixed(1)}%` },
      { label: 'Critical', value: safety.criticalIncidents || 0 }
    ]}
  };

  const handleCardHover = (id, e) => {
    setHoveredCard(id);
    setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // HELPERS
  // ============================================
  const getMetricColor = (value, target) => {
    if (!target) return '#f59e0b';
    const ratio = value / target;
    if (ratio >= 1) return '#10b981';
    if (ratio >= 0.75) return '#f59e0b';
    return '#ef4444';
  };
  const formatValue = (value, unit = '') => {
    if (value === undefined || value === null) return '0';
    if (unit === '%') return `${value?.toFixed(1) || 0}%`;
    if (unit === 'BD') return Utils.formatCurrency(value || 0);
    return value?.toFixed(1) || 0;
  };
  const getRankColor = (rank) => {
    if (rank === 1) return '#f59e0b';
    if (rank === 2) return '#94a3b8';
    if (rank === 3) return '#cd7f32';
    return '#94a3b8';
  };

  // ============================================
  // CRUD
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const url = editingId ? `${API_BASE_URL}/performance/kpis/${editingId}` : `${API_BASE_URL}/performance/kpis`;
      const method = editingId ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method, headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save KPI');
      }
      setSuccess(editingId ? 'KPI updated!' : 'KPI created!');
      await loadKPIs();
      resetForm(); setShowForm(false);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this KPI?')) return;
    try {
      const r = await fetch(`${API_BASE_URL}/performance/kpis/${id}`, { method: 'DELETE', headers: { 'Accept': 'application/json' } });
      if (!r.ok) throw new Error('Failed to delete KPI');
      setSuccess('KPI deleted!');
      await loadKPIs();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) { setError(err.message); }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || '', type: item.type || 'site',
      target: item.target || '', currentValue: item.currentValue || '',
      unit: item.unit || '%', period: item.period || 'monthly',
      description: item.description || '', notes: item.notes || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '', type: 'site', target: '', currentValue: '',
      unit: '%', period: 'monthly', description: '', notes: ''
    });
    setEditingId(null);
  };

  // ============================================
  // KPI CARDS
  // ============================================
  const renderKPICards = () => (
    <div className="pa-kpi-grid">
      {kpiItems.map(kpi => {
        const Icon = kpi.icon;
        return (
          <div key={kpi.id} className="pa-kpi-card"
            onMouseEnter={(e) => handleCardHover(kpi.id, e)}
            onMouseLeave={handleCardLeave}
            onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
            <div className="pa-kpi-accent" style={{ background: kpi.accent }} />
            <div className="pa-kpi-icon" style={{ background: `${kpi.color}1f`, color: kpi.color }}>
              <Icon size={20} />
            </div>
            <div className="pa-kpi-content">
              <span className="pa-kpi-label">{kpi.label}</span>
              <span className="pa-kpi-value" style={{ color: kpi.color }}>
                {formatValue(kpi.value, kpi.unit)}
              </span>
              {kpi.target > 0 && (
                <div className="pa-kpi-progress">
                  <div className="pa-kpi-progress-fill"
                    style={{
                      width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%`,
                      background: getMetricColor(kpi.value, kpi.target)
                    }} />
                </div>
              )}
            </div>
            <div className={`pa-kpi-trend ${kpi.trend}`}>
              {kpi.trend === 'up' && <TrendingUp size={15} />}
              {kpi.trend === 'down' && <TrendingDown size={15} />}
              {kpi.trend === 'flat' && <Minus size={15} />}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ============================================
  // RANKINGS
  // ============================================
  const renderRankingsContent = () => {
    if (!rankings.length) {
      return (
        <div className="pa-empty">
          <div className="pa-empty-icon"><Award size={40} /></div>
          <h3>No Rankings Available</h3>
          <p>
            {entityType === 'site' && 'Add more site data to see performance rankings.'}
            {entityType === 'team' && 'Add more team data to see performance rankings.'}
            {entityType === 'worker' && 'Add more worker data to see performance rankings.'}
          </p>
        </div>
      );
    }
    const { total, page, items } = paginate(rankings, rankingPage, rankingPerPage);
    if (page !== rankingPage) setRankingPage(page);
    const getRankIcon = (rank) => {
      if (rank === 1) return <Award size={15} color="#f59e0b" />;
      if (rank === 2) return <Award size={15} color="#94a3b8" />;
      if (rank === 3) return <Award size={15} color="#cd7f32" />;
      return <span className="pa-rank-number">{rank}</span>;
    };
    const getScoreLabel = () => {
      if (entityType === 'site' || entityType === 'team') return 'profit margin %';
      return 'revenue';
    };
    return (
      <>
        <div className="pa-rankings-list">
          {items.map((item, index) => (
            <div key={item.id || index} className="pa-ranking-item"
              style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
              <div className="pa-rank-pos" style={{ color: getRankColor(item.rank) }}>
                {getRankIcon(item.rank)}
              </div>
              <div className="pa-rank-info">
                <div className="pa-rank-name">{item.name}</div>
                <div className="pa-rank-meta">
                  {item.members > 0 && <span><Users size={11} /> {item.members} members</span>}
                  {item.entries > 0 && <span><FileText size={11} /> {item.entries} entries</span>}
                  {item.revenue > 0 && <span><DollarSign size={11} /> {Utils.formatCurrencyShort(item.revenue)}</span>}
                  {item.profit !== undefined && item.profit !== 0 && (
                    <span className={item.profit >= 0 ? 'pa-text-green' : 'pa-text-red'}>
                      {item.profit >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {Utils.formatCurrencyShort(item.profit)}
                    </span>
                  )}
                  {item.daysPresent > 0 && <span><Calendar size={11} /> {item.daysPresent} days</span>}
                </div>
              </div>
              <div className="pa-rank-score">
                <span className="pa-score-value">{item.score?.toFixed(1) || 0}</span>
                <span className="pa-score-label">{getScoreLabel()}</span>
              </div>
            </div>
          ))}
        </div>
        {renderPaginationBar(rankingPage, total, rankingPerPage, setRankingPerPage, setRankingPage, rankings.length)}
      </>
    );
  };

  // ============================================
  // CHARTS
  // ============================================
  const renderChartsContent = () => {
    if (!metrics) {
      return (
        <div className="pa-empty">
          <div className="pa-empty-icon"><BarChart3 size={40} /></div>
          <h3>No Chart Data</h3>
          <p>No chart data available</p>
        </div>
      );
    }
    const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
    const revenueData = [
      { name: 'Revenue', value: financial.totalRevenue || 0, fill: '#10b981' },
      { name: 'Cost', value: financial.totalCost || 0, fill: '#ef4444' },
      { name: 'Profit', value: Math.max(0, financial.totalProfit || 0), fill: '#f59e0b' }
    ];
    const qualitySafety = [
      { name: 'Pass Rate', value: quality.passRate || 0, fill: '#10b981' },
      { name: 'Resolution', value: safety.resolutionRate || 0, fill: '#3b82f6' }
    ];
    const radarData = [
      { metric: 'Revenue', value: Math.min(100, ((financial.totalRevenue || 0) / 100000) * 100) },
      { metric: 'Quality', value: quality.passRate || 0 },
      { metric: 'Safety', value: Math.max(0, 100 - (safety.totalIncidents || 0) * 10) },
      { metric: 'Productivity', value: Math.min(100, (productivity.totalEntries || 0) * 2) },
      { metric: 'Profit', value: Math.min(100, Math.max(0, ((financial.totalProfit || 0) / 25000) * 100)) }
    ];

    return (
      <div className="pa-charts-grid">
        <div className="pa-card">
          <div className="pa-card-header">
            <div className="pa-card-title">
              <span className="pa-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <PieChart size={16} />
              </span>
              <div>
                <h4>Revenue Distribution</h4>
                <span>Revenue vs Cost vs Profit</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <RePieChart>
              <Pie data={revenueData} dataKey="value" nameKey="name"
                cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                {revenueData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
            </RePieChart>
          </ResponsiveContainer>
          <div className="pa-chart-legend">
            {revenueData.map((d, i) => (
              <div key={i} className="pa-legend-item">
                <span className="pa-legend-dot" style={{ background: d.fill }} />
                <span className="pa-legend-name">{d.name}</span>
                <span className="pa-legend-val">{Utils.formatCurrencyShort(d.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pa-card">
          <div className="pa-card-header">
            <div className="pa-card-title">
              <span className="pa-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <BarChart3 size={16} />
              </span>
              <div>
                <h4>Quality & Safety</h4>
                <span>Key operational rates</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={qualitySafety}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]}
                tickFormatter={(v) => `${v}%`} />
              <ReTooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(1)}%`} />}
                cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={48}>
                {qualitySafety.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="pa-card pa-card-wide">
          <div className="pa-card-header">
            <div className="pa-card-title">
              <span className="pa-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <LineChart size={16} />
              </span>
              <div>
                <h4>Performance Trends</h4>
                <span>Last 12 months</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trends.length ? trends : []}>
              <defs>
                <linearGradient id="paTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
              <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2.5}
                fill="url(#paTrendGrad)" name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="pa-card">
          <div className="pa-card-header">
            <div className="pa-card-title">
              <span className="pa-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <TargetIcon size={16} />
              </span>
              <div>
                <h4>Performance Radar</h4>
                <span>All KPIs normalized</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={11} />
              <PolarRadiusAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
              <Radar name="Performance" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
              <ReTooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(1)}%`} />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // ============================================
  // DETAILED METRICS
  // ============================================
  const renderMetricsDetail = () => {
    if (!metrics) {
      return (
        <div className="pa-empty">
          <div className="pa-empty-icon"><FileText size={40} /></div>
          <h3>No Metrics Data</h3>
          <p>No metrics available for the selected period</p>
        </div>
      );
    }
    const sections = [
      { title: 'Productivity', icon: Activity, data: productivity, fields: [
        { key: 'totalEntries', label: 'Total Entries', format: 'number' },
        { key: 'avgDailyEntries', label: 'Avg Daily Entries', format: 'number' },
        { key: 'totalRevenue', label: 'Total Revenue', format: 'currency' },
        { key: 'avgRevenuePerEntry', label: 'Avg Revenue/Entry', format: 'currency' },
        { key: 'labourCost', label: 'Labour Cost', format: 'currency' },
        { key: 'labourToRevenueRatio', label: 'Labour/Revenue Ratio', format: 'percent' }
      ]},
      { title: 'Financial', icon: DollarSign, data: financial, fields: [
        { key: 'totalRevenue', label: 'Total Revenue', format: 'currency' },
        { key: 'totalCost', label: 'Total Cost', format: 'currency' },
        { key: 'totalProfit', label: 'Total Profit', format: 'currency' },
        { key: 'profitMargin', label: 'Profit Margin', format: 'percent' },
        { key: 'avgProfitPerEntry', label: 'Avg Profit/Entry', format: 'currency' }
      ]},
      { title: 'Quality', icon: Shield, data: quality, fields: [
        { key: 'totalInspections', label: 'Total Inspections', format: 'number' },
        { key: 'passed', label: 'Passed', format: 'number' },
        { key: 'failed', label: 'Failed', format: 'number' },
        { key: 'passRate', label: 'Pass Rate', format: 'percent' },
        { key: 'avgScore', label: 'Average Score', format: 'number' }
      ]},
      { title: 'Safety', icon: AlertCircle, data: safety, fields: [
        { key: 'totalIncidents', label: 'Total Incidents', format: 'number' },
        { key: 'resolved', label: 'Resolved', format: 'number' },
        { key: 'resolutionRate', label: 'Resolution Rate', format: 'percent' },
        { key: 'criticalIncidents', label: 'Critical Incidents', format: 'number' },
        { key: 'highIncidents', label: 'High Incidents', format: 'number' }
      ]}
    ];
    const fmt = (v, f) => {
      if (v === undefined || v === null) return 'N/A';
      if (f === 'currency') return Utils.formatCurrency(v);
      if (f === 'percent') return `${(v || 0).toFixed(1)}%`;
      return (v || 0).toFixed(1);
    };
    return (
      <div className="pa-metrics-grid">
        {sections.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="pa-card">
              <div className="pa-card-header">
                <div className="pa-card-title">
                  <span className="pa-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                    <Icon size={16} />
                  </span>
                  <div>
                    <h4>{s.title} Metrics</h4>
                    <span>{s.fields.length} indicators</span>
                  </div>
                </div>
              </div>
              <div className="pa-metrics-list">
                {s.fields.map((f, j) => (
                  <div key={j} className="pa-metric-row">
                    <span className="pa-metric-label">{f.label}</span>
                    <span className="pa-metric-value">{fmt(s.data?.[f.key], f.format)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* KPIs table */}
        {kpis.length > 0 && (() => {
          const { total, page, items } = paginate(kpis, kpiPage, kpiPerPage);
          if (page !== kpiPage) setKpiPage(page);
          return (
            <div className="pa-card pa-card-wide">
              <div className="pa-card-header">
                <div className="pa-card-title">
                  <span className="pa-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                    <Target size={16} />
                  </span>
                  <div>
                    <h4>Custom KPIs</h4>
                    <span>{kpis.length} KPIs tracked</span>
                  </div>
                </div>
                <button className="pa-btn pa-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
                  <Plus size={13} /> Add KPI
                </button>
              </div>
              <div className="pa-table-wrap">
                <table className="pa-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th className="right">Target</th>
                      <th className="right">Current</th>
                      <th className="right">Progress</th>
                      <th className="center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((k, i) => {
                      const pct = k.target > 0 ? Math.min(100, (k.currentValue / k.target) * 100) : 0;
                      const color = pct >= 100 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444';
                      return (
                        <tr key={k.id} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                          <td>
                            <div className="pa-kpi-name">
                              <strong>{k.name}</strong>
                            </div>
                          </td>
                          <td><span className="pa-type-badge">{k.type}</span></td>
                          <td className="right">{formatValue(k.target, k.unit)}</td>
                          <td className="right"><strong>{formatValue(k.currentValue, k.unit)}</strong></td>
                          <td className="right">
                            <div className="pa-mini-progress">
                              <div className="pa-mini-progress-fill"
                                style={{ width: `${pct}%`, background: color }} />
                              <span className="pa-mini-progress-label">{pct.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="center">
                            <div className="pa-action-btns">
                              <button className="pa-icon-btn pa-icon-edit" onClick={() => handleEdit(k)}>
                                <Edit size={13} />
                              </button>
                              <button className="pa-icon-btn pa-icon-danger" onClick={() => handleDelete(k.id)}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {renderPaginationBar(kpiPage, total, kpiPerPage, setKpiPerPage, setKpiPage, kpis.length)}
            </div>
          );
        })()}
      </div>
    );
  };

  // ============================================
  // FORM MODAL
  // ============================================
  const renderFormModal = () => (
    <ModalPortal>
      <div className="pa-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
        <div className="pa-modal" onClick={e => e.stopPropagation()}>
          <div className="pa-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <div className="pa-modal-header-left">
              <div className="pa-modal-icon">
                {editingId ? <Edit size={18} /> : <Plus size={18} />}
              </div>
              <div>
                <h3>{editingId ? 'Edit KPI' : 'Create New KPI'}</h3>
                <p className="pa-modal-sub">{editingId ? 'Update KPI details' : 'Add a KPI to track'}</p>
              </div>
            </div>
            <button className="pa-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="pa-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="pa-form-row">
                <div className="pa-form-group">
                  <label>KPI Name <span className="pa-required">*</span></label>
                  <input type="text" value={formData.name} required
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter KPI name" className="pa-form-input" autoFocus />
                </div>
                <div className="pa-form-group">
                  <label>Type <span className="pa-required">*</span></label>
                  <select value={formData.type} required
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="pa-form-select">
                    <option value="site">Site</option>
                    <option value="team">Team</option>
                    <option value="worker">Worker</option>
                    <option value="project">Project</option>
                  </select>
                </div>
              </div>
              <div className="pa-form-row">
                <div className="pa-form-group">
                  <label>Target Value <span className="pa-required">*</span></label>
                  <input type="number" step="0.01" value={formData.target} required
                    onChange={e => setFormData({ ...formData, target: e.target.value })}
                    placeholder="0.00" className="pa-form-input" />
                </div>
                <div className="pa-form-group">
                  <label>Current Value <span className="pa-required">*</span></label>
                  <input type="number" step="0.01" value={formData.currentValue} required
                    onChange={e => setFormData({ ...formData, currentValue: e.target.value })}
                    placeholder="0.00" className="pa-form-input" />
                </div>
              </div>
              <div className="pa-form-row">
                <div className="pa-form-group">
                  <label>Unit</label>
                  <select value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="pa-form-select">
                    <option value="%">%</option>
                    <option value="BD">BD</option>
                    <option value="USD">USD</option>
                    <option value="number">Number</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
                <div className="pa-form-group">
                  <label>Period</label>
                  <select value={formData.period}
                    onChange={e => setFormData({ ...formData, period: e.target.value })}
                    className="pa-form-select">
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="pa-form-group">
                <label>Description</label>
                <textarea value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="KPI description" rows="2" className="pa-form-textarea" />
              </div>
              <div className="pa-form-group">
                <label>Notes</label>
                <input type="text" value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes" className="pa-form-input" />
              </div>
              <div className="pa-form-actions">
                <button type="submit" className="pa-btn pa-btn-primary" disabled={loading}>
                  <Save size={14} /> {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
                <button type="button" className="pa-btn pa-btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
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
    <div className={`pa-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="pa-ambient">
        <div className="pa-orb pa-orb-1" />
        <div className="pa-orb pa-orb-2" />
        <div className="pa-orb pa-orb-3" />
      </div>

      <div className="pa-header">
        <div className="pa-header-left">
          <div className="pa-header-icon">
            <BarChart3 size={22} />
            <span className="pa-header-badge"><Sparkles size={10} /> ANALYTICS</span>
          </div>
          <div>
            <h2>Performance Analytics</h2>
            <p className="pa-header-subtitle">
              Advanced analytics · {period} view · {rankings.length} ranked entities
            </p>
          </div>
        </div>
        <div className="pa-header-right">
          <button className="pa-btn pa-btn-ghost" onClick={() => window.print()}>
            <Printer size={14} /> Print
          </button>
          <button className="pa-btn pa-btn-ghost" onClick={() => { setLoading(true); setRankings([]); loadAllData(); }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="pa-btn pa-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> New KPI
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="pa-period-bar">
        <div className="pa-period-buttons">
          {['weekly', 'monthly', 'quarterly', 'yearly'].map(p => (
            <button key={p} className={`pa-period-btn ${period === p ? 'active' : ''}`}
              onClick={() => { setPeriod(p); setRankings([]); }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className="pa-period-info">
          Showing: <strong>{period.charAt(0).toUpperCase() + period.slice(1)}</strong>
        </div>
      </div>

      {/* Tabs */}
      <div className="pa-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'rankings', label: 'Rankings', icon: Award, badge: rankings.length },
          { id: 'charts', label: 'Charts', icon: LineChart },
          { id: 'metrics', label: 'Detailed Metrics', icon: Target }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`pa-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => setViewMode(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="pa-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {error && <div className="pa-message error"><AlertCircle size={15} /> {error}</div>}
      {success && <div className="pa-message success"><CheckCircle size={15} /> {success}</div>}

      {loading ? (
        <div className="pa-loading">
          <div className="pa-loading-spinner" />
          <span>Loading analytics data...</span>
        </div>
      ) : (
        <div className="pa-view">
          {viewMode === 'overview' && (
            <>
              {renderKPICards()}
              {hoveredCard && cardDetails[hoveredCard] && (
                <div className="pa-hover-tooltip"
                  style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
                  <div className="pa-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
                  <div className="pa-tooltip-body">
                    {cardDetails[hoveredCard].details.map((d, i) => (
                      <div key={i} className="pa-tooltip-row">
                        <span className="pa-tooltip-label">{d.label}</span>
                        <span className="pa-tooltip-value">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="pa-grid-2-1">
                <div className="pa-card">
                  <div className="pa-card-header">
                    <div className="pa-card-title">
                      <span className="pa-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                        <Award size={16} />
                      </span>
                      <div>
                        <h4>Top Rankings</h4>
                        <span>By {entityType}</span>
                      </div>
                    </div>
                    <div className="pa-inline-controls">
                      <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setRankings([]); }}
                        className="pa-select pa-select-sm">
                        <option value="site">Sites</option>
                        <option value="team">Teams</option>
                        <option value="worker">Workers</option>
                      </select>
                    </div>
                  </div>
                  {renderRankingsContent()}
                </div>
                <div className="pa-charts-preview">
                  {renderChartsContent()}
                </div>
              </div>
            </>
          )}

          {viewMode === 'rankings' && (
            <div className="pa-card">
              <div className="pa-card-header">
                <div className="pa-card-title">
                  <span className="pa-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                    <Award size={16} />
                  </span>
                  <div>
                    <h4>Performance Rankings</h4>
                    <span>{rankings.length} entities · {period}</span>
                  </div>
                </div>
                <div className="pa-inline-controls">
                  <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setRankings([]); }}
                    className="pa-select">
                    <option value="site">Sites</option>
                    <option value="team">Teams</option>
                    <option value="worker">Workers</option>
                  </select>
                </div>
              </div>
              {renderRankingsContent()}
            </div>
          )}

          {viewMode === 'charts' && renderChartsContent()}
          {viewMode === 'metrics' && renderMetricsDetail()}
        </div>
      )}

      {showForm && renderFormModal()}
    </div>
  );
};

export default PerformanceAnalytics;