// src/components/CumulativeTrackerComponent.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  TrendingUp, TrendingDown, Calendar, Filter, ChevronDown, ChevronLeft,
  ChevronRight, Search, XCircle, Plus, Save, X, CheckCircle, RefreshCw,
  Calculator, AlertCircle, Edit, Trash2, BarChart2, PieChart, Activity,
  DollarSign, Users, LineChart as LineChartIcon, Target, Zap, Award,
  Clock, LayoutDashboard, FileText, BarChart3, Gauge, Sparkles, Crown,
  ArrowUpRight, ArrowDownRight, Minus, Circle, Layers, Flame, Percent,
  Wallet, Briefcase, Info, TrendingUp as UpIcon
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  Legend, ResponsiveContainer, Area, ComposedChart, Bar,
  PieChart as RePieChart, Pie, Cell, ReferenceLine
} from 'recharts';
import Utils from '../utils/Utils';
import ApiService from '../services/ApiService';
import './CumulativeTracker.css';

const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

// ============================================
// SOFT PROGRESS RING (matches light theme)
// ============================================
const ProgressRing = ({ value = 0, max = 100, size = 84, stroke = 7, color = '#10b981', label }) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = circ * pct;
  const gap = circ - dash;
  return (
    <div className="ct-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="rgba(148,163,184,0.18)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="ct-ring-center">
        <span className="ct-ring-value" style={{ color }}>{Math.round(pct * 100)}%</span>
        {label && <span className="ct-ring-label">{label}</span>}
      </div>
    </div>
  );
};

// ============================================
// CUSTOM TOOLTIP
// ============================================
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="ct-chart-tooltip">
      {label && <div className="ct-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="ct-chart-tooltip-row">
          <span className="ct-chart-tooltip-dot" style={{ background: p.color || p.fill }} />
          <span className="ct-chart-tooltip-name">{p.name}</span>
          <span className="ct-chart-tooltip-val">{Utils.formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const CumulativeTrackerComponent = ({ data, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [autoCalcLoading, setAutoCalcLoading] = useState(false);
  const [chartView, setChartView] = useState('cumulative');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [filterType, setFilterType] = useState('month');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [monthRangeStart, setMonthRangeStart] = useState(selectedMonth);
  const [monthRangeEnd, setMonthRangeEnd] = useState(selectedMonth);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    revenue: '', labour: '', ohShare: '', net: '', notes: ''
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // MEMOIZED
  const cumulativeData = useMemo(() => data?.cumulativeTracker || [], [data?.cumulativeTracker]);
  const monthlySummary = useMemo(() => data?.monthlySummary || [], [data?.monthlySummary]);
  const entries = useMemo(() => data?.entries || [], [data?.entries]);

  // FILTERS
  const filteredData = useMemo(() => {
    let filtered = [...cumulativeData];
    if (filterType === 'month') {
      filtered = filtered.filter(i => i.date && i.date.substring(0, 7) === selectedMonth);
    } else if (filterType === 'range') {
      filtered = filtered.filter(i => {
        if (!i.date) return false;
        const m = i.date.substring(0, 7);
        return m >= monthRangeStart && m <= monthRangeEnd;
      });
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(i => {
        const d = i.date || '';
        const s = i.status?.toLowerCase() || '';
        return d.includes(term) || s.includes(term);
      });
    }
    return filtered.sort((a, b) => (!a.date ? 1 : !b.date ? -1 : a.date.localeCompare(b.date)));
  }, [cumulativeData, selectedMonth, filterType, monthRangeStart, monthRangeEnd, searchTerm]);

  // TOTALS
  const totals = useMemo(() => {
    const totalRevenue = filteredData.reduce((s, i) => s + (i.revenue || 0), 0);
    const totalLabour = filteredData.reduce((s, i) => s + (i.labour || 0), 0);
    const totalOH = filteredData.reduce((s, i) => s + (i.ohShare || 0), 0);
    const totalNet = filteredData.reduce((s, i) => s + (i.net || 0), 0);
    const finalCumulative = filteredData.length ? filteredData[filteredData.length - 1].cumulative : 0;
    return {
      totalRevenue, totalLabour, totalOH, totalNet, finalCumulative,
      isProfit: finalCumulative >= 0,
      count: filteredData.length,
      avgNet: filteredData.length ? totalNet / filteredData.length : 0,
      maxRevenue: filteredData.length ? Math.max(...filteredData.map(d => d.revenue || 0)) : 0,
      minRevenue: filteredData.length ? Math.min(...filteredData.map(d => d.revenue || 0)) : 0,
      profitMargin: totalRevenue > 0 ? (totalNet / totalRevenue) * 100 : 0
    };
  }, [filteredData]);

  const monthEntriesCount = useMemo(() => (
    entries.filter(e => e.date && e.date.substring(0, 7) === selectedMonth).length
  ), [entries, selectedMonth]);

  // CHART DATA
  const chartData = useMemo(() => filteredData.map(item => ({
    date: item.date ? Utils.formatDate(item.date) : '',
    revenue: item.revenue || 0,
    labour: item.labour || 0,
    net: item.net || 0,
    cumulative: item.cumulative || 0,
    ohShare: item.ohShare || 0,
    profitMargin: item.revenue > 0 ? ((item.net || 0) / (item.revenue || 1)) * 100 : 0
  })), [filteredData]);

  const summaryChartData = useMemo(() => monthlySummary
    .filter(item => {
      if (filterType === 'month') return item.month === selectedMonth;
      if (filterType === 'range') return item.month >= monthRangeStart && item.month <= monthRangeEnd;
      return true;
    })
    .sort((a, b) => a.month?.localeCompare(b.month) || 0)
    .map(item => ({
      month: item.month,
      revenue: item.totalRevenue || 0,
      labour: item.totalLabour || 0,
      net: item.netProfit || item.net || 0
    })), [monthlySummary, filterType, selectedMonth, monthRangeStart, monthRangeEnd]);

  const costStructure = useMemo(() => {
    const total = totals.totalLabour + totals.totalOH + Math.max(0, totals.totalNet);
    if (total === 0) return [];
    return [
      { name: 'Labour', value: totals.totalLabour, color: '#ef4444' },
      { name: 'OH', value: totals.totalOH, color: '#3b82f6' },
      { name: 'Net', value: Math.max(0, totals.totalNet), color: '#10b981' }
    ].filter(s => s.value > 0);
  }, [totals]);

  const pieData = useMemo(() => {
    const latest = filteredData.length ? filteredData[filteredData.length - 1] : null;
    if (!latest) return [];
    return [
      { name: 'Revenue', value: latest.revenue || 0, color: '#10b981' },
      { name: 'Labour', value: latest.labour || 0, color: '#ef4444' },
      { name: 'OH Share', value: latest.ohShare || 0, color: '#3b82f6' },
      { name: 'Net', value: Math.max(0, latest.net || 0), color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [filteredData]);

  // NAVIGATION
  const navigateMonth = useCallback((direction) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    let nm = m + direction, ny = y;
    if (nm > 12) { nm = 1; ny = y + 1; }
    else if (nm < 1) { nm = 12; ny = y - 1; }
    setSelectedMonth(`${ny}-${String(nm).padStart(2, '0')}`);
  }, [selectedMonth]);

  const getMonthLabel = (s) => {
    if (!s) return '';
    const [y, m] = s.split('-');
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${names[parseInt(m) - 1]} ${y}`;
  };

  const getStatusBadge = (status) => {
    const isProfit = status === '✅ Profit' || status === '✅ FAIDA' || status === 'Profit' ||
      status?.includes('Profit') || status?.includes('Faida');
    return (
      <span className={`ct-status ${isProfit ? 'profit' : 'loss'}`}>
        {isProfit ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
        {isProfit ? 'Profit' : 'Loss'}
      </span>
    );
  };

  // HANDLERS
  const handleCardHover = (id, e) => {
    setHoveredCard(id);
    setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  const handleAutoCalculate = async () => {
    setAutoCalcLoading(true); setErrorMessage(''); setSuccessMessage('');
    try {
      const res = await ApiService.calculateCumulative(selectedMonth);
      if (res.calculated === false) {
        setErrorMessage(`No entries found for ${getMonthLabel(selectedMonth)}.`);
        setAutoCalcLoading(false);
        return;
      }
      if (refreshData) await refreshData();
      setSuccessMessage(`Auto-calculated! Created: ${res.created || 0}, Updated: ${res.updated || 0}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to auto-calculate.');
    } finally { setAutoCalcLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErrorMessage(''); setSuccessMessage('');
    try {
      const entryData = {
        date: formData.date,
        revenue: parseFloat(formData.revenue) || 0,
        labour: parseFloat(formData.labour) || 0,
        ohShare: parseFloat(formData.ohShare) || 0,
        net: parseFloat(formData.net) || 0,
        notes: formData.notes || ''
      };
      if (editingId) {
        await ApiService.updateCumulativeTracker(editingId, entryData);
        setSuccessMessage('Entry updated successfully!');
      } else {
        await ApiService.createCumulativeTracker(entryData);
        setSuccessMessage('Entry created successfully!');
      }
      if (refreshData) await refreshData();
      resetForm(); setShowForm(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save.');
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      revenue: '', labour: '', ohShare: '', net: '', notes: ''
    });
    setEditingId(null); setErrorMessage(''); setSuccessMessage('');
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setFormData({
      date: entry.date || new Date().toISOString().split('T')[0],
      revenue: entry.revenue?.toString() || '',
      labour: entry.labour?.toString() || '',
      ohShare: entry.ohShare?.toString() || '',
      net: entry.net?.toString() || '',
      notes: entry.notes || ''
    });
    setShowForm(true); setErrorMessage('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await ApiService.deleteCumulativeTracker(id);
      setSuccessMessage('Entry deleted.');
      if (refreshData) await refreshData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) { setErrorMessage('Failed to delete.'); }
  };

  useEffect(() => {
    const r = parseFloat(formData.revenue) || 0;
    const l = parseFloat(formData.labour) || 0;
    const o = parseFloat(formData.ohShare) || 0;
    setFormData(prev => ({ ...prev, net: (r - l - o).toFixed(3) }));
  }, [formData.revenue, formData.labour, formData.ohShare]);

  // KPI CARDS
  const statItems = [
    { id: 'revenue', icon: DollarSign, label: 'Revenue',
      value: Utils.formatCurrencyShort(totals.totalRevenue),
      color: '#10b981', ringPct: totals.totalRevenue > 0 ? 75 : 0 },
    { id: 'labour', icon: Users, label: 'Labour',
      value: Utils.formatCurrencyShort(totals.totalLabour),
      color: '#ef4444', ringPct: totals.totalRevenue > 0 ? Math.min(100, (totals.totalLabour / totals.totalRevenue) * 100) : 0 },
    { id: 'ohShare', icon: BarChart3, label: 'OH Share',
      value: Utils.formatCurrencyShort(totals.totalOH),
      color: '#3b82f6', ringPct: totals.totalRevenue > 0 ? Math.min(100, (totals.totalOH / totals.totalRevenue) * 100) : 0 },
    { id: 'net', icon: TrendingUp, label: 'Net Profit',
      value: Utils.formatCurrencyShort(totals.totalNet),
      color: totals.isProfit ? '#10b981' : '#ef4444', ringPct: Math.min(100, Math.abs(totals.profitMargin)) },
    { id: 'cumulative', icon: Target, label: 'Cumulative',
      value: Utils.formatCurrencyShort(totals.finalCumulative),
      color: '#f59e0b', ringPct: totals.finalCumulative >= 0 ? 80 : 30 }
  ];

  const cardDetails = {
    revenue: { title: 'Total Revenue', details: [
      { label: 'Revenue', value: Utils.formatCurrency(totals.totalRevenue) },
      { label: 'Entries', value: totals.count },
      { label: 'Average', value: Utils.formatCurrency(totals.count ? totals.totalRevenue / totals.count : 0) },
      { label: 'Max', value: Utils.formatCurrency(totals.maxRevenue) }
    ]},
    labour: { title: 'Total Labour', details: [
      { label: 'Labour', value: Utils.formatCurrency(totals.totalLabour) },
      { label: 'Avg', value: Utils.formatCurrency(totals.count ? totals.totalLabour / totals.count : 0) },
      { label: '% of Revenue', value: totals.totalRevenue > 0 ? `${((totals.totalLabour / totals.totalRevenue) * 100).toFixed(1)}%` : '0%' },
      { label: 'Entries', value: totals.count }
    ]},
    ohShare: { title: 'OH Share', details: [
      { label: 'OH Share', value: Utils.formatCurrency(totals.totalOH) },
      { label: 'Avg', value: Utils.formatCurrency(totals.count ? totals.totalOH / totals.count : 0) },
      { label: '% of Revenue', value: totals.totalRevenue > 0 ? `${((totals.totalOH / totals.totalRevenue) * 100).toFixed(1)}%` : '0%' },
      { label: 'Entries', value: totals.count }
    ]},
    net: { title: 'Net Profit', details: [
      { label: 'Net', value: Utils.formatCurrency(totals.totalNet) },
      { label: 'Avg Net', value: Utils.formatCurrency(totals.avgNet) },
      { label: 'Revenue', value: Utils.formatCurrency(totals.totalRevenue) },
      { label: 'Margin', value: `${totals.profitMargin.toFixed(1)}%` }
    ]},
    cumulative: { title: 'Cumulative', details: [
      { label: 'Final', value: Utils.formatCurrency(totals.finalCumulative) },
      { label: 'Net', value: Utils.formatCurrency(totals.totalNet) },
      { label: 'Revenue', value: Utils.formatCurrency(totals.totalRevenue) },
      { label: 'Status', value: totals.isProfit ? 'Profit' : 'Loss' }
    ]}
  };

  // CHART RENDER
  const renderChart = () => {
    const axis = { stroke: '#94a3b8', fontSize: 11, tickLine: false, axisLine: false };
    const grid = { strokeDasharray: '3 3', stroke: '#e5e7eb', strokeOpacity: 0.5, vertical: false };

    switch (chartView) {
      case 'cumulative':
        return (
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="ctCumGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ctRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="ctLabGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid {...grid} />
            <XAxis dataKey="date" {...axis} />
            <YAxis {...axis} />
            <ReTooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
            <Area type="monotone" dataKey="cumulative" stroke="#f59e0b" strokeWidth={2.5}
              fill="url(#ctCumGrad)" name="Cumulative" />
            <Bar dataKey="revenue" fill="url(#ctRevGrad)" name="Revenue" radius={[6, 6, 0, 0]} />
            <Bar dataKey="labour" fill="url(#ctLabGrad)" name="Labour" radius={[6, 6, 0, 0]} />
          </ComposedChart>
        );
      case 'revenue':
        return (
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="ctRev2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="ctLab2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="ctOh2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid {...grid} />
            <XAxis dataKey="date" {...axis} />
            <YAxis {...axis} />
            <ReTooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
            <Bar dataKey="revenue" fill="url(#ctRev2)" name="Revenue" radius={[6, 6, 0, 0]} />
            <Bar dataKey="labour" fill="url(#ctLab2)" name="Labour" radius={[6, 6, 0, 0]} />
            <Bar dataKey="ohShare" fill="url(#ctOh2)" name="OH Share" radius={[6, 6, 0, 0]} />
          </ComposedChart>
        );
      case 'profit':
        return (
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="ctNetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...grid} />
            <XAxis dataKey="date" {...axis} />
            <YAxis {...axis} />
            <ReTooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="net" stroke="#f59e0b" strokeWidth={2.5}
              fill="url(#ctNetGrad)" name="Net Profit" />
            <Line type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 2 }} name="Cumulative" />
          </ComposedChart>
        );
      case 'comparison':
        return (
          <ComposedChart data={summaryChartData}>
            <defs>
              <linearGradient id="ctRev3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="ctLab3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid {...grid} />
            <XAxis dataKey="month" {...axis} />
            <YAxis {...axis} />
            <ReTooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
            <Bar dataKey="revenue" fill="url(#ctRev3)" name="Revenue" radius={[6, 6, 0, 0]} />
            <Bar dataKey="labour" fill="url(#ctLab3)" name="Labour" radius={[6, 6, 0, 0]} />
            <Line type="monotone" dataKey="net" stroke="#f59e0b" strokeWidth={2.5} name="Net" />
          </ComposedChart>
        );
      default: return null;
    }
  };

  return (
    <div className={`ct-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="ct-ambient">
        <div className="ct-orb ct-orb-1" />
        <div className="ct-orb ct-orb-2" />
        <div className="ct-orb ct-orb-3" />
      </div>

      {/* HEADER */}
      <div className="ct-header">
        <div className="ct-header-left">
          <div className="ct-header-icon">
            <Target size={22} />
            <span className="ct-header-badge"><Sparkles size={10} /> LIVE</span>
          </div>
          <div>
            <h2>Cumulative Tracker</h2>
            <p className="ct-header-subtitle">
              Running balance · {totals.count} entries · {getMonthLabel(selectedMonth)}
            </p>
          </div>
        </div>
        <div className="ct-header-right">
          {filterType === 'month' && (
            <div className="ct-month-nav">
              <button className="ct-month-btn" onClick={() => navigateMonth(-1)}>
                <ChevronLeft size={16} />
              </button>
              <span className="ct-month-label">{getMonthLabel(selectedMonth)}</span>
              <button className="ct-month-btn" onClick={() => navigateMonth(1)}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          <div className="ct-chart-selector">
            {[
              { id: 'cumulative', icon: Activity, title: 'Cumulative' },
              { id: 'revenue', icon: DollarSign, title: 'Revenue vs Labour' },
              { id: 'profit', icon: TrendingUp, title: 'Profit' },
              { id: 'comparison', icon: BarChart2, title: 'Monthly' }
            ].map(v => {
              const Icon = v.icon;
              return (
                <button key={v.id}
                  className={`ct-chart-btn ${chartView === v.id ? 'active' : ''}`}
                  onClick={() => setChartView(v.id)} title={v.title}>
                  <Icon size={15} />
                </button>
              );
            })}
          </div>
          <button className="ct-btn ct-btn-amber" onClick={handleAutoCalculate} disabled={autoCalcLoading}>
            <Calculator size={15} /> {autoCalcLoading ? 'Calculating…' : 'Auto-Calculate'}
          </button>
          <button className="ct-btn ct-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={15} /> Add Entry
          </button>
          <div className="ct-filter-wrap">
            <button className="ct-btn ct-btn-ghost" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
              <Filter size={14} />
              {filterType === 'month' ? 'Monthly' : filterType === 'range' ? 'Range' : 'All'}
              <ChevronDown size={13} />
            </button>
            {showFilterDropdown && (
              <div className="ct-dropdown">
                <div className="ct-dd-section">
                  <label>View Mode</label>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="month">Monthly</option>
                    <option value="range">Date Range</option>
                    <option value="all">All Data</option>
                  </select>
                </div>
                {filterType === 'range' && (
                  <>
                    <div className="ct-dd-section">
                      <label>Start Month</label>
                      <input type="month" value={monthRangeStart}
                        onChange={(e) => setMonthRangeStart(e.target.value)} />
                    </div>
                    <div className="ct-dd-section">
                      <label>End Month</label>
                      <input type="month" value={monthRangeEnd}
                        onChange={(e) => setMonthRangeEnd(e.target.value)} />
                    </div>
                  </>
                )}
                <button className="ct-dd-apply" onClick={() => setShowFilterDropdown(false)}>
                  Apply Filters
                </button>
              </div>
            )}
          </div>
          <button className="ct-btn ct-btn-ghost" onClick={refreshData}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* INFO BANNER */}
      <div className="ct-info-banner">
        <AlertCircle size={16} />
        <span>
          <strong>{monthEntriesCount}</strong> entries found for {getMonthLabel(selectedMonth)}.
          Click <strong>Auto-Calculate</strong> to generate cumulative data.
        </span>
      </div>

      {successMessage && <div className="ct-message success"><CheckCircle size={15} /> {successMessage}</div>}
      {errorMessage && <div className="ct-message error"><AlertCircle size={15} /> {errorMessage}</div>}

      {/* KPI GRID */}
      <div className="ct-kpi-grid">
        {statItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="ct-kpi-card"
              style={{ '--kpi-color': item.color }}
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="ct-kpi-accent" style={{ background: item.color }} />
              <div className="ct-kpi-row">
                <ProgressRing value={item.ringPct} max={100} size={84} stroke={7} color={item.color} />
                <div className="ct-kpi-content">
                  <div className="ct-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                    <Icon size={14} />
                  </div>
                  <span className="ct-kpi-label">{item.label}</span>
                  <span className="ct-kpi-value">{item.value}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TOOLTIP */}
      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="ct-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="ct-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="ct-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="ct-tooltip-row">
                <span className="ct-tooltip-label">{d.label}</span>
                <span className="ct-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH */}
      <div className="ct-search-bar">
        <Search size={16} />
        <input type="text" placeholder="Search by date or status..."
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        {searchTerm && (
          <button className="ct-search-clear" onClick={() => setSearchTerm('')}>
            <XCircle size={16} />
          </button>
        )}
        <span className="ct-search-count">{filteredData.length} entries</span>
      </div>

      {/* CHARTS */}
      {chartData.length > 0 && (
        <div className="ct-charts-grid">
          <div className="ct-card ct-card-wide">
            <div className="ct-card-header">
              <div className="ct-card-title">
                <span className="ct-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                  <Activity size={16} />
                </span>
                <div>
                  <h4>{chartView === 'cumulative' ? 'Cumulative Trend' :
                    chartView === 'revenue' ? 'Revenue vs Labour' :
                    chartView === 'profit' ? 'Profit Analysis' : 'Monthly Comparison'}</h4>
                  <span>Visual performance overview</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              {renderChart()}
            </ResponsiveContainer>
          </div>

          <div className="ct-card">
            <div className="ct-card-header">
              <div className="ct-card-title">
                <span className="ct-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                  <Layers size={16} />
                </span>
                <div>
                  <h4>Cost Structure</h4>
                  <span>Colored breakdown</span>
                </div>
              </div>
            </div>
            <div className="ct-cost-rows">
              {costStructure.map((s, i) => {
                const max = Math.max(...costStructure.map(x => x.value), 1);
                const pct = (s.value / max) * 100;
                return (
                  <div key={i} className="ct-cost-row">
                    <div className="ct-cost-head">
                      <span className="ct-cost-name">{s.name}</span>
                      <span className="ct-cost-val">{Utils.formatCurrencyShort(s.value)}</span>
                    </div>
                    <div className="ct-cost-track">
                      <div className="ct-cost-fill"
                        style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                  </div>
                );
              })}
              {costStructure.length === 0 && <div className="ct-empty-mini">No data</div>}
            </div>
          </div>

          {pieData.length > 0 && (
            <div className="ct-card">
              <div className="ct-card-header">
                <div className="ct-card-title">
                  <span className="ct-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                    <PieChart size={16} />
                  </span>
                  <div>
                    <h4>Latest Distribution</h4>
                    <span>Most recent entry</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <RePieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={52} outerRadius={88} paddingAngle={3} stroke="none">
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </RePieChart>
              </ResponsiveContainer>
              <div className="ct-pie-legend">
                {pieData.map((d, i) => (
                  <div key={i} className="ct-pie-item">
                    <span className="ct-pie-dot" style={{ background: d.color }} />
                    <span className="ct-pie-name">{d.name}</span>
                    <span className="ct-pie-val">{Utils.formatCurrencyShort(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="ct-card">
            <div className="ct-card-header">
              <div className="ct-card-title">
                <span className="ct-card-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                  <Gauge size={16} />
                </span>
                <div>
                  <h4>Statistics</h4>
                  <span>Quick metrics</span>
                </div>
              </div>
            </div>
            <div className="ct-stats-mini">
              <div className="ct-stat-mini">
                <span className="ct-sm-label">Avg Net</span>
                <span className={`ct-sm-value ${totals.avgNet >= 0 ? 'pos' : 'neg'}`}>
                  {Utils.formatCurrencyShort(totals.avgNet)}
                </span>
              </div>
              <div className="ct-stat-mini">
                <span className="ct-sm-label">Max Rev</span>
                <span className="ct-sm-value pos">{Utils.formatCurrencyShort(totals.maxRevenue)}</span>
              </div>
              <div className="ct-stat-mini">
                <span className="ct-sm-label">Min Rev</span>
                <span className="ct-sm-value neg">{Utils.formatCurrencyShort(totals.minRevenue)}</span>
              </div>
              <div className="ct-stat-mini">
                <span className="ct-sm-label">Days</span>
                <span className="ct-sm-value">{totals.count}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="ct-table-card">
        <div className="ct-table-header">
          <div className="ct-card-title">
            <span className="ct-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
              <FileText size={16} />
            </span>
            <div>
              <h4>Tracker Entries</h4>
              <span>{filteredData.length} entries</span>
            </div>
          </div>
        </div>
        <div className="ct-table-wrap">
          <table className="ct-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="right">Revenue</th>
                <th className="right">Labour</th>
                <th className="right">OH Share</th>
                <th className="right">Net</th>
                <th className="right">Cumulative</th>
                <th className="center">Status</th>
                <th className="center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="ct-empty">
                      <Target size={44} />
                      <h3>No Data Available</h3>
                      <p>{monthEntriesCount > 0
                        ? `Click "Auto-Calculate" to generate data from ${monthEntriesCount} entries.`
                        : `No entries found for ${getMonthLabel(selectedMonth)}.`}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.map((item, i) => (
                <tr key={item.id || i} style={{ animationDelay: `${Math.min(i * 25, 400)}ms` }}>
                  <td>{Utils.formatDate(item.date)}</td>
                  <td className="right ct-td-green">{Utils.formatCurrencyShort(item.revenue)}</td>
                  <td className="right ct-td-red">{Utils.formatCurrencyShort(item.labour)}</td>
                  <td className="right ct-td-blue">{Utils.formatCurrencyShort(item.ohShare)}</td>
                  <td className={`right ${(item.net || 0) >= 0 ? 'ct-td-green' : 'ct-td-red'}`}>
                    {Utils.formatCurrencyShort(item.net)}
                  </td>
                  <td className={`right ${(item.cumulative || 0) >= 0 ? 'ct-td-amber' : 'ct-td-red'}`}>
                    {Utils.formatCurrencyShort(item.cumulative)}
                  </td>
                  <td className="center">{getStatusBadge(item.status)}</td>
                  <td className="center">
                    <div className="ct-action-btns">
                      <button className="ct-action-btn" onClick={() => handleEdit(item)} title="Edit">
                        <Edit size={13} />
                      </button>
                      <button className="ct-action-btn danger" onClick={() => handleDelete(item.id)} title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <ModalPortal>
          <div className="ct-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
            <div className="ct-modal" onClick={e => e.stopPropagation()}>
              <div className="ct-modal-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <div className="ct-modal-header-left">
                  <div className="ct-modal-icon">
                    {editingId ? <Edit size={18} /> : <Plus size={18} />}
                  </div>
                  <div>
                    <h3>{editingId ? 'Edit Entry' : 'Add Entry'}</h3>
                    <p className="ct-modal-sub">{editingId ? 'Update tracker entry' : 'Create a new entry'}</p>
                  </div>
                </div>
                <button className="ct-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
                  <X size={18} />
                </button>
              </div>
              <div className="ct-modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="ct-form-row">
                    <div className="ct-form-group">
                      <label><Calendar size={12} /> Date <span className="ct-required">*</span></label>
                      <input type="date" value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                        required className="ct-form-input" autoFocus />
                    </div>
                    <div className="ct-form-group">
                      <label><DollarSign size={12} /> Revenue (BD)</label>
                      <input type="number" step="0.001" value={formData.revenue}
                        onChange={e => setFormData({ ...formData, revenue: e.target.value })}
                        placeholder="0.000" className="ct-form-input" />
                    </div>
                  </div>
                  <div className="ct-form-row">
                    <div className="ct-form-group">
                      <label><Users size={12} /> Labour (BD)</label>
                      <input type="number" step="0.001" value={formData.labour}
                        onChange={e => setFormData({ ...formData, labour: e.target.value })}
                        placeholder="0.000" className="ct-form-input" />
                    </div>
                    <div className="ct-form-group">
                      <label><BarChart3 size={12} /> OH Share (BD)</label>
                      <input type="number" step="0.001" value={formData.ohShare}
                        onChange={e => setFormData({ ...formData, ohShare: e.target.value })}
                        placeholder="0.000" className="ct-form-input" />
                    </div>
                  </div>
                  <div className="ct-form-row">
                    <div className="ct-form-group">
                      <label><TrendingUp size={12} /> Net (Auto)</label>
                      <input type="text" value={formData.net} disabled className="ct-form-input ct-net-input"
                        style={{ color: parseFloat(formData.net) >= 0 ? '#10b981' : '#ef4444' }} />
                    </div>
                    <div className="ct-form-group">
                      <label><FileText size={12} /> Notes</label>
                      <input type="text" value={formData.notes}
                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Optional notes" className="ct-form-input" />
                    </div>
                  </div>
                  <div className="ct-form-actions">
                    <button type="submit" className="ct-btn ct-btn-primary" disabled={loading}>
                      <Save size={14} /> {loading ? 'Saving…' : (editingId ? 'Update' : 'Save')}
                    </button>
                    <button type="button" className="ct-btn ct-btn-ghost"
                      onClick={() => { setShowForm(false); resetForm(); }}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default CumulativeTrackerComponent;