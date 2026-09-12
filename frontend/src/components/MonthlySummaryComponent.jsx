// src/components/MonthlySummaryComponent.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  TrendingUp, TrendingDown, Calendar, Filter, ChevronDown,
  ChevronLeft, ChevronRight, Search, XCircle, Plus, Save, X,
  RefreshCw, AlertCircle, Edit, Trash2, DollarSign, BarChart2,
  PieChart, Activity, Users, Building2, Truck, Download, Printer,
  Eye, EyeOff, Calculator, LayoutDashboard, FileText, Tag, Clock,
  Award, Crown, Sparkles, ArrowUpRight, ArrowDownRight, CheckCircle,
  Info, BarChart3, Gauge, Zap, ChevronLeft as ChevLeft,
  ChevronsLeft, ChevronsRight, Layers, Flame, Target, Percent,
  Wallet, Repeat, CircleDollarSign, Minus, Medal
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, Legend, Area, AreaChart,
  ComposedChart, Bar, PieChart as RePieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import Utils from '../utils/Utils';
import './MonthlySummaryComponent.css';

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
    <div className="ms-chart-tooltip">
      {label && <div className="ms-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="ms-chart-tooltip-row">
          <span className="ms-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="ms-chart-tooltip-name">{p.name}</span>
          <span className="ms-chart-tooltip-val">
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
const MonthlySummaryComponent = ({ data, refreshData, onDataUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'));
  const [chartView, setChartView] = useState('trend');
  const [localMonthlySummaries, setLocalMonthlySummaries] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  // View mode tabs
  const [viewMode, setViewMode] = useState('overview'); // overview | summaries

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [filterType, setFilterType] = useState('year');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [yearRangeStart, setYearRangeStart] = useState(selectedYear);
  const [yearRangeEnd, setYearRangeEnd] = useState(selectedYear);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    month: '', totalRevenue: '', totalLabour: '', carPatrol: '',
    monthlyOh: '', oneTime: '', netProfit: '', status: 'FAIDA', notes: ''
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const monthlySummary = useMemo(() => {
    if (data?.monthlySummary && data.monthlySummary.length > 0) return data.monthlySummary;
    return localMonthlySummaries;
  }, [data?.monthlySummary, localMonthlySummaries]);

  useEffect(() => {
    const fetchData = async () => {
      setIsInitialLoad(true); setApiError(null);
      if (data?.monthlySummary && data.monthlySummary.length > 0) {
        setLocalMonthlySummaries(data.monthlySummary);
        setIsInitialLoad(false); return;
      }
      await loadMonthlySummaries();
      setIsInitialLoad(false);
    };
    fetchData();
  }, [data?.monthlySummary]);

  // ============================================
  // LOAD
  // ============================================
  const loadMonthlySummaries = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/monthly-summary/`, {
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errorMessage = errData.error;
        } catch {}
        throw new Error(errorMessage);
      }
      const result = await response.json();
      if (Array.isArray(result)) {
        setLocalMonthlySummaries(result);
        if (onDataUpdate) onDataUpdate({ monthlySummary: result });
        setApiError(null);
        return result;
      }
      setLocalMonthlySummaries([]);
      setApiError('Unexpected response format from server');
      return [];
    } catch (error) {
      console.error('Error loading monthly summaries:', error);
      setApiError(error.message || 'Failed to load monthly summaries');
      setErrorMessage(`Failed to load monthly summaries: ${error.message}`);
      return [];
    }
  }, [onDataUpdate]);

  const refreshSummaries = useCallback(async () => {
    setLoading(true); setErrorMessage(''); setSuccessMessage(''); setApiError(null);
    try {
      if (refreshData) await refreshData();
      await loadMonthlySummaries();
      setSuccessMessage('Data refreshed successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error refreshing summaries:', error);
      setErrorMessage(`Failed to refresh data: ${error.message}`);
    } finally { setLoading(false); }
  }, [refreshData, loadMonthlySummaries]);

  // ============================================
  // FILTERED
  // ============================================
  const availableYears = useMemo(() => {
    const years = new Set();
    monthlySummary.forEach(item => { if (item.month) years.add(item.month.substring(0, 4)); });
    return Array.from(years).sort();
  }, [monthlySummary]);

  const availableMonths = useMemo(() => {
    const months = new Set();
    monthlySummary.forEach(item => {
      if (item.month && item.month.startsWith(selectedYear)) months.add(item.month.substring(5, 7));
    });
    return Array.from(months).sort();
  }, [monthlySummary, selectedYear]);

  const filteredData = useMemo(() => {
    let filtered = [...monthlySummary];
    if (filterType === 'year') {
      filtered = filtered.filter(i => i.month && i.month.substring(0, 4) === selectedYear);
    } else if (filterType === 'month') {
      filtered = filtered.filter(i => i.month === `${selectedYear}-${selectedMonth}`);
    } else if (filterType === 'range') {
      filtered = filtered.filter(i => i.month && i.month >= yearRangeStart && i.month <= yearRangeEnd);
    }
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      filtered = filtered.filter(i =>
        (i.month || '').includes(t) ||
        (i.status || '').toLowerCase().includes(t) ||
        (i.notes || '').toLowerCase().includes(t)
      );
    }
    return filtered.sort((a, b) => (!a.month ? 1 : !b.month ? -1 : a.month.localeCompare(b.month)));
  }, [monthlySummary, selectedYear, selectedMonth, filterType, yearRangeStart, yearRangeEnd, searchTerm]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [filterType, selectedYear, selectedMonth, searchTerm, itemsPerPage, viewMode]);
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
  // TOTALS
  // ============================================
  const totals = useMemo(() => {
    const totalRevenue = filteredData.reduce((s, i) => s + (i.totalRevenue || 0), 0);
    const totalLabour = filteredData.reduce((s, i) => s + (i.totalLabour || 0), 0);
    const totalCarPatrol = filteredData.reduce((s, i) => s + (i.carPatrol || 0), 0);
    const totalMonthlyOH = filteredData.reduce((s, i) => s + (i.monthlyOh || 0), 0);
    const totalOneTime = filteredData.reduce((s, i) => s + (i.oneTime || 0), 0);
    const totalNet = filteredData.reduce((s, i) => s + (i.netProfit || 0), 0);
    const totalCosts = totalLabour + totalCarPatrol + totalMonthlyOH + totalOneTime;
    return {
      totalRevenue, totalLabour, totalCarPatrol, totalMonthlyOH, totalOneTime,
      totalNet, totalCosts,
      isProfit: totalNet >= 0,
      count: filteredData.length,
      avgNet: filteredData.length > 0 ? totalNet / filteredData.length : 0,
      avgRevenue: filteredData.length > 0 ? totalRevenue / filteredData.length : 0,
      profitMargin: totalRevenue > 0 ? (totalNet / totalRevenue) * 100 : 0,
      bestMonth: filteredData.length > 0 ? filteredData.reduce((a, b) => (a.netProfit || 0) > (b.netProfit || 0) ? a : b) : null,
      worstMonth: filteredData.length > 0 ? filteredData.reduce((a, b) => (a.netProfit || 0) < (b.netProfit || 0) ? a : b) : null,
      profitableMonths: filteredData.filter(i => (i.netProfit || 0) > 0).length,
      lossMonths: filteredData.filter(i => (i.netProfit || 0) < 0).length
    };
  }, [filteredData]);

  // ============================================
  // CHART DATA
  // ============================================
  const chartData = useMemo(() => filteredData.map(item => {
    const parts = item.month?.split('-') || [];
    const monthName = parts.length === 2
      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(parts[1]) - 1]
      : item.month || '';
    return {
      month: monthName,
      fullMonth: item.month,
      revenue: item.totalRevenue || 0,
      labour: item.totalLabour || 0,
      carPatrol: item.carPatrol || 0,
      monthlyOh: item.monthlyOh || 0,
      oneTime: item.oneTime || 0,
      cost: (item.totalLabour || 0) + (item.carPatrol || 0) + (item.monthlyOh || 0) + (item.oneTime || 0),
      net: item.netProfit || 0,
      status: item.status || 'NUKSAN',
      profitMargin: item.totalRevenue > 0 ? ((item.netProfit || 0) / item.totalRevenue) * 100 : 0
    };
  }), [filteredData]);

  const pieData = useMemo(() => {
    const latest = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
    if (!latest) return [];
    return [
      { name: 'Revenue', value: latest.totalRevenue || 0, color: '#10b981' },
      { name: 'Labour', value: latest.totalLabour || 0, color: '#ef4444' },
      { name: 'Car Patrol', value: latest.carPatrol || 0, color: '#f59e0b' },
      { name: 'Monthly OH', value: latest.monthlyOh || 0, color: '#3b82f6' },
      { name: 'One Time', value: latest.oneTime || 0, color: '#8b5cf6' },
      { name: 'Net Profit', value: Math.max(0, latest.netProfit || 0), color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [filteredData]);

  const costBreakdownData = useMemo(() => ([
    { name: 'Labour', value: totals.totalLabour, color: '#ef4444' },
    { name: 'Car Patrol', value: totals.totalCarPatrol, color: '#f59e0b' },
    { name: 'Monthly OH', value: totals.totalMonthlyOH, color: '#3b82f6' },
    { name: 'One Time', value: totals.totalOneTime, color: '#8b5cf6' }
  ].filter(d => d.value > 0)), [totals]);

  const radarData = useMemo(() => ([
    { metric: 'Revenue', value: totals.avgRevenue || 0 },
    { metric: 'Profit', value: Math.max(0, totals.avgNet || 0) },
    { metric: 'Labour', value: totals.count ? totals.totalLabour / totals.count : 0 },
    { metric: 'Car Patrol', value: totals.count ? totals.totalCarPatrol / totals.count : 0 },
    { metric: 'Monthly OH', value: totals.count ? totals.totalMonthlyOH / totals.count : 0 }
  ]), [totals]);

  // ============================================
  // KPI CARDS
  // ============================================
  const kpiItems = [
    { id: 'revenue', icon: DollarSign, label: 'Total Revenue',
      value: Utils.formatCurrencyShort(totals.totalRevenue),
      meta: `Avg ${Utils.formatCurrencyShort(totals.avgRevenue)}/mo`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'costs', icon: Wallet, label: 'Total Costs',
      value: Utils.formatCurrencyShort(totals.totalCosts),
      meta: `${totals.totalRevenue > 0 ? ((totals.totalCosts / totals.totalRevenue) * 100).toFixed(0) : 0}% of revenue`,
      color: '#ef4444', accent: 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: totals.totalCosts > 0 ? 'down' : 'flat' },
    { id: 'profit', icon: TrendingUp, label: 'Net Profit',
      value: Utils.formatCurrencyShort(totals.totalNet),
      meta: `${totals.profitMargin.toFixed(1)}% margin`,
      color: totals.isProfit ? '#10b981' : '#ef4444',
      accent: totals.isProfit ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: totals.isProfit ? 'up' : 'down' },
    { id: 'months', icon: Calendar, label: 'Months',
      value: totals.count,
      meta: `${totals.profitableMonths} profitable`,
      color: '#3b82f6', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up' }
  ];

  const cardDetails = {
    revenue: { title: 'Total Revenue', details: [
      { label: 'Total Revenue', value: Utils.formatCurrency(totals.totalRevenue) },
      { label: 'Months', value: totals.count },
      { label: 'Avg Revenue', value: Utils.formatCurrency(totals.avgRevenue) },
      { label: 'Best Month', value: totals.bestMonth ? Utils.formatCurrency(totals.bestMonth.totalRevenue) : '-' }
    ]},
    costs: { title: 'Total Costs', details: [
      { label: 'Total Costs', value: Utils.formatCurrency(totals.totalCosts) },
      { label: 'Labour', value: Utils.formatCurrency(totals.totalLabour) },
      { label: 'Car Patrol', value: Utils.formatCurrency(totals.totalCarPatrol) },
      { label: 'Monthly OH', value: Utils.formatCurrency(totals.totalMonthlyOH) },
      { label: 'One Time', value: Utils.formatCurrency(totals.totalOneTime) }
    ]},
    profit: { title: 'Net Profit', details: [
      { label: 'Net Profit', value: Utils.formatCurrency(totals.totalNet) },
      { label: 'Revenue', value: Utils.formatCurrency(totals.totalRevenue) },
      { label: 'Margin', value: `${totals.profitMargin.toFixed(1)}%` },
      { label: 'Best Month', value: totals.bestMonth ? Utils.formatCurrency(totals.bestMonth.netProfit) : '-' }
    ]},
    months: { title: 'Months Summary', details: [
      { label: 'Total Months', value: totals.count },
      { label: 'Profitable', value: totals.profitableMonths },
      { label: 'Loss Making', value: totals.lossMonths },
      { label: 'Avg Profit', value: Utils.formatCurrency(totals.avgNet) }
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
  const getMonthLabel = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const getStatusBadge = (status) => {
    const isProfit = status === 'FAIDA' || status === 'Profit' ||
      status === '✅ FAIDA' || status?.includes('Faida');
    return (
      <span className={`ms-status ${isProfit ? 'profit' : 'loss'}`}>
        {isProfit ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
        {isProfit ? 'Profit' : 'Loss'}
      </span>
    );
  };

  // ============================================
  // CRUD
  // ============================================
  const resetForm = () => {
    const now = new Date();
    setFormData({
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      totalRevenue: '', totalLabour: '', carPatrol: '',
      monthlyOh: '', oneTime: '', netProfit: '', status: 'FAIDA', notes: ''
    });
    setEditingId(null); setErrorMessage(''); setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErrorMessage(''); setSuccessMessage('');
    try {
      const summaryData = {
        month: formData.month,
        totalRevenue: parseFloat(formData.totalRevenue) || 0,
        totalLabour: parseFloat(formData.totalLabour) || 0,
        carPatrol: parseFloat(formData.carPatrol) || 0,
        monthlyOh: parseFloat(formData.monthlyOh) || 0,
        oneTime: parseFloat(formData.oneTime) || 0,
        netProfit: parseFloat(formData.netProfit) || 0,
        status: formData.status || 'NUKSAN',
        notes: formData.notes || ''
      };
      const url = editingId ? `${API_BASE_URL}/monthly-summary/${editingId}/` : `${API_BASE_URL}/monthly-summary/`;
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method, headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(summaryData)
      });
      if (!response.ok) {
        let errorMsg = `Failed to save summary: ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errorMsg = errData.error;
        } catch {}
        throw new Error(errorMsg);
      }
      setSuccessMessage(editingId ? 'Summary updated!' : 'Summary created!');
      await refreshSummaries();
      resetForm(); setShowForm(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving monthly summary:', error);
      setErrorMessage(error.message || 'Failed to save. Please try again.');
    } finally { setLoading(false); }
  };

  const handleEdit = (summary) => {
    setEditingId(summary.id);
    setFormData({
      month: summary.month || '',
      totalRevenue: summary.totalRevenue?.toString() || '',
      totalLabour: summary.totalLabour?.toString() || '',
      carPatrol: summary.carPatrol?.toString() || '',
      monthlyOh: summary.monthlyOh?.toString() || '',
      oneTime: summary.oneTime?.toString() || '',
      netProfit: summary.netProfit?.toString() || '',
      status: summary.status || 'NUKSAN',
      notes: summary.notes || ''
    });
    setShowForm(true); setErrorMessage('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this monthly summary?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/monthly-summary/${id}/`, {
        method: 'DELETE', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`Failed to delete: ${response.status}`);
      setSuccessMessage('Summary deleted!');
      await refreshSummaries();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting monthly summary:', error);
      setErrorMessage('Failed to delete. Please try again.');
    }
  };

  useEffect(() => {
    const revenue = parseFloat(formData.totalRevenue) || 0;
    const labour = parseFloat(formData.totalLabour) || 0;
    const carPatrol = parseFloat(formData.carPatrol) || 0;
    const monthlyOh = parseFloat(formData.monthlyOh) || 0;
    const oneTime = parseFloat(formData.oneTime) || 0;
    const net = revenue - labour - carPatrol - monthlyOh - oneTime;
    setFormData(prev => ({
      ...prev,
      netProfit: net.toFixed(3),
      status: net >= 0 ? 'FAIDA' : 'NUKSAN'
    }));
  }, [formData.totalRevenue, formData.totalLabour, formData.carPatrol, formData.monthlyOh, formData.oneTime]);

  const handleAutoGenerate = async () => {
    setLoading(true); setErrorMessage(''); setSuccessMessage('');
    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const response = await fetch(`${API_BASE_URL}/monthly-summary/auto-update/`, {
        method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`Failed to auto-update: ${response.status}`);
      const result = await response.json();
      if (result.data) {
        setSuccessMessage(`Summary updated for ${getMonthLabel(currentMonth)}!`);
        await refreshSummaries();
      } else {
        setErrorMessage('Failed to generate. Check entries for this month.');
      }
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error auto-generating summary:', error);
      setErrorMessage(error.message || 'Failed to auto-generate.');
    } finally { setLoading(false); }
  };

  const handleGenerateAll = async () => {
    setLoading(true); setErrorMessage(''); setSuccessMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/monthly-summary/calculate-all/`, {
        method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(`Failed to calculate all: ${response.status}`);
      const result = await response.json();
      await refreshSummaries();
      setSuccessMessage(`Auto-generated! Created/Updated ${result.success} summaries.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error auto-generating summaries:', error);
      setErrorMessage(error.message || 'Failed to auto-generate.');
    } finally { setLoading(false); }
  };

  // ============================================
  // OVERVIEW TAB
  // ============================================
  const renderOverviewTab = () => (
    <div className="ms-view">
      <div className="ms-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="ms-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="ms-kpi-accent" style={{ background: item.accent }} />
              <div className="ms-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="ms-kpi-content">
                <span className="ms-kpi-label">{item.label}</span>
                <span className="ms-kpi-value">{item.value}</span>
                <span className="ms-kpi-meta">{item.meta}</span>
              </div>
              <div className={`ms-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={15} />}
                {item.trend === 'down' && <TrendingDown size={15} />}
                {item.trend === 'flat' && <Minus size={15} />}
              </div>
            </div>
          );
        })}
      </div>

      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="ms-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="ms-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="ms-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="ms-tooltip-row">
                <span className="ms-tooltip-label">{d.label}</span>
                <span className="ms-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best & Worst month cards */}
      {filteredData.length > 0 && (
        <div className="ms-grid-2">
          <div className="ms-highlight-card ms-highlight-good">
            <div className="ms-highlight-icon"><TrendingUp size={20} /></div>
            <div className="ms-highlight-content">
              <span className="ms-highlight-label">Best Month</span>
              <span className="ms-highlight-value">
                {totals.bestMonth ? getMonthLabel(totals.bestMonth.month) : '—'}
              </span>
              <span className="ms-highlight-meta">
                {totals.bestMonth ? Utils.formatCurrency(totals.bestMonth.netProfit) : ''}
              </span>
            </div>
            <Award size={28} className="ms-highlight-badge" />
          </div>
          <div className="ms-highlight-card ms-highlight-bad">
            <div className="ms-highlight-icon"><TrendingDown size={20} /></div>
            <div className="ms-highlight-content">
              <span className="ms-highlight-label">Worst Month</span>
              <span className="ms-highlight-value">
                {totals.worstMonth ? getMonthLabel(totals.worstMonth.month) : '—'}
              </span>
              <span className="ms-highlight-meta">
                {totals.worstMonth ? Utils.formatCurrency(totals.worstMonth.netProfit) : ''}
              </span>
            </div>
            <AlertCircle size={28} className="ms-highlight-badge" />
          </div>
        </div>
      )}

      {/* Row 1: Monthly trend */}
      <div className="ms-card">
        <div className="ms-card-header">
          <div className="ms-card-title">
            <span className="ms-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
              <TrendingUp size={16} />
            </span>
            <div>
              <h4>Revenue & Profit Trend</h4>
              <span>Monthly performance overview</span>
            </div>
          </div>
          <div className="ms-legend">
            <span><i style={{ background: '#10b981' }} />Revenue</span>
            <span><i style={{ background: '#ef4444' }} />Costs</span>
            <span><i style={{ background: '#f59e0b' }} />Net Profit</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="msRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="msNetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
              tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
            <ReTooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5}
              fill="url(#msRevGrad)" name="Revenue" />
            <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2.5}
              name="Costs" dot={{ r: 3, strokeWidth: 2 }} />
            <Area type="monotone" dataKey="net" stroke="#f59e0b" strokeWidth={2.5}
              fill="url(#msNetGrad)" name="Net Profit" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Row 2: Cost breakdown pie + Radar */}
      <div className="ms-grid-2-1">
        <div className="ms-card">
          <div className="ms-card-header">
            <div className="ms-card-title">
              <span className="ms-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <PieChart size={16} />
              </span>
              <div>
                <h4>Cost Breakdown</h4>
                <span>All categories for selected period</span>
              </div>
            </div>
          </div>
          {costBreakdownData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <RePieChart>
                  <Pie data={costBreakdownData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={3} stroke="none">
                    {costBreakdownData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </RePieChart>
              </ResponsiveContainer>
              <div className="ms-pie-legend">
                {costBreakdownData.map((d, i) => (
                  <div key={i} className="ms-pie-item">
                    <span className="ms-pie-dot" style={{ background: d.color }} />
                    <span className="ms-pie-name">{d.name}</span>
                    <span className="ms-pie-val">{Utils.formatCurrencyShort(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="ms-empty-mini">No cost data</div>}
        </div>

        <div className="ms-card">
          <div className="ms-card-header">
            <div className="ms-card-title">
              <span className="ms-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <Target size={16} />
              </span>
              <div>
                <h4>Performance Radar</h4>
                <span>Monthly averages</span>
              </div>
            </div>
          </div>
          {radarData.length > 0 && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={11} />
                <PolarRadiusAxis stroke="#94a3b8" fontSize={10} />
                <Radar name="Average" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.35} />
                <ReTooltip content={<ChartTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <div className="ms-empty-mini">No data</div>}
        </div>
      </div>

      {/* Row 3: Latest distribution pie */}
      {pieData.length > 0 && (
        <div className="ms-card">
          <div className="ms-card-header">
            <div className="ms-card-title">
              <span className="ms-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <PieChart size={16} />
              </span>
              <div>
                <h4>Latest Month Distribution</h4>
                <span>{filteredData.length > 0 ? getMonthLabel(filteredData[filteredData.length - 1].month) : ''}</span>
              </div>
            </div>
          </div>
          <div className="ms-latest-pie-wrap">
            <ResponsiveContainer width="100%" height={220}>
              <RePieChart>
                <Pie data={pieData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={3} stroke="none">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <ReTooltip content={<ChartTooltip />} />
              </RePieChart>
            </ResponsiveContainer>
            <div className="ms-pie-legend">
              {pieData.map((d, i) => (
                <div key={i} className="ms-pie-item">
                  <span className="ms-pie-dot" style={{ background: d.color }} />
                  <span className="ms-pie-name">{d.name}</span>
                  <span className="ms-pie-val">{Utils.formatCurrencyShort(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // SUMMARIES TAB
  // ============================================
  const renderSummariesTab = () => (
    <div className="ms-view">
      {/* Chart view selector */}
      {chartData.length > 0 && (
        <div className="ms-chart-toggle">
          {[
            { id: 'trend', label: 'Trend' },
            { id: 'comparison', label: 'Comparison' },
            { id: 'distribution', label: 'Distribution' }
          ].map(v => (
            <button key={v.id} className={`ms-chart-toggle-btn ${chartView === v.id ? 'active' : ''}`}
              onClick={() => setChartView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
      )}

      {chartData.length > 0 && (
        <div className="ms-card">
          <div className="ms-card-header">
            <div className="ms-card-title">
              <span className="ms-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <BarChart3 size={16} />
              </span>
              <div>
                <h4>
                  {chartView === 'trend' ? 'Monthly Trend' :
                    chartView === 'comparison' ? 'Revenue vs Costs' : 'Cost Distribution'}
                </h4>
                <span>{filteredData.length} months</span>
              </div>
            </div>
            <div className="ms-legend">
              {chartView === 'trend' && (
                <>
                  <span><i style={{ background: '#10b981' }} />Revenue</span>
                  <span><i style={{ background: '#f59e0b' }} />Net</span>
                  <span><i style={{ background: '#ef4444' }} />Labour</span>
                </>
              )}
              {chartView === 'comparison' && (
                <>
                  <span><i style={{ background: '#10b981' }} />Revenue</span>
                  <span><i style={{ background: '#ef4444' }} />Labour</span>
                  <span><i style={{ background: '#3b82f6' }} />OH</span>
                  <span><i style={{ background: '#f59e0b' }} />Patrol</span>
                </>
              )}
              {chartView === 'distribution' && (
                <>
                  <span><i style={{ background: '#10b981' }} />Revenue</span>
                  <span><i style={{ background: '#ef4444' }} />Labour</span>
                  <span><i style={{ background: '#3b82f6' }} />OH</span>
                  <span><i style={{ background: '#f59e0b' }} />Net</span>
                </>
              )}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            {chartView === 'trend' ? (
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="msTRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="msTNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
                <ReTooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5}
                  fill="url(#msTRev)" name="Revenue" />
                <Area type="monotone" dataKey="net" stroke="#f59e0b" strokeWidth={2.5}
                  fill="url(#msTNet)" name="Net" />
                <Line type="monotone" dataKey="labour" stroke="#ef4444" strokeWidth={2.5}
                  name="Labour" dot={{ r: 3, strokeWidth: 2 }} />
              </ComposedChart>
            ) : chartView === 'comparison' ? (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
                <ReTooltip content={<ChartTooltip />} />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[6, 6, 0, 0]} />
                <Bar dataKey="labour" fill="#ef4444" name="Labour" radius={[6, 6, 0, 0]} />
                <Bar dataKey="monthlyOh" fill="#3b82f6" name="Monthly OH" radius={[6, 6, 0, 0]} />
                <Bar dataKey="carPatrol" fill="#f59e0b" name="Car Patrol" radius={[6, 6, 0, 0]} />
              </ComposedChart>
            ) : (
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="msDRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="msDLab" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="msDOh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="msDNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
                <ReTooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#msDRev)" name="Revenue" />
                <Area type="monotone" dataKey="labour" stroke="#ef4444" fill="url(#msDLab)" name="Labour" />
                <Area type="monotone" dataKey="monthlyOh" stroke="#3b82f6" fill="url(#msDOh)" name="OH" />
                <Area type="monotone" dataKey="net" stroke="#f59e0b" fill="url(#msDNet)" name="Net" />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="ms-card">
        <div className="ms-card-header">
          <div className="ms-card-title">
            <span className="ms-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
              <FileText size={16} />
            </span>
            <div>
              <h4>Summary Entries</h4>
              <span>{filteredData.length} months</span>
            </div>
          </div>
          <button className="ms-btn ms-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={13} /> Add Summary
          </button>
        </div>

        {filteredData.length === 0 ? (
          <div className="ms-empty">
            <div className="ms-empty-icon"><FileText size={40} /></div>
            <h3>No Summary Data</h3>
            <p>Click "Generate All" or add a summary manually.</p>
          </div>
        ) : (
          <>
            <div className="ms-table-wrap">
              <table className="ms-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="right">Revenue</th>
                    <th className="right">Labour</th>
                    <th className="right">Car Patrol</th>
                    <th className="right">Monthly OH</th>
                    <th className="right">One Time</th>
                    <th className="right">Net Profit</th>
                    <th className="center">Status</th>
                    <th className="center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((item, i) => (
                    <tr key={item.id || i} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                      <td><strong>{getMonthLabel(item.month)}</strong></td>
                      <td className="right ms-td-green">{Utils.formatCurrencyShort(item.totalRevenue)}</td>
                      <td className="right ms-td-red">{Utils.formatCurrencyShort(item.totalLabour)}</td>
                      <td className="right ms-td-amber">{Utils.formatCurrencyShort(item.carPatrol)}</td>
                      <td className="right ms-td-blue">{Utils.formatCurrencyShort(item.monthlyOh)}</td>
                      <td className="right ms-td-purple">{Utils.formatCurrencyShort(item.oneTime)}</td>
                      <td className={`right ${(item.netProfit || 0) >= 0 ? 'ms-td-green' : 'ms-td-red'}`}>
                        <strong>{Utils.formatCurrencyShort(item.netProfit)}</strong>
                      </td>
                      <td className="center">{getStatusBadge(item.status)}</td>
                      <td className="center">
                        <div className="ms-action-btns">
                          <button className="ms-icon-btn ms-icon-edit" onClick={() => handleEdit(item)}>
                            <Edit size={13} />
                          </button>
                          <button className="ms-icon-btn ms-icon-danger" onClick={() => handleDelete(item.id)}>
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
            <div className="ms-pagination">
              <div className="ms-pagination-info">
                Showing <strong>{((currentPage - 1) * itemsPerPage) + 1}</strong>–
                <strong>{Math.min(currentPage * itemsPerPage, filteredData.length)}</strong> of{' '}
                <strong>{filteredData.length}</strong>
              </div>
              <div className="ms-pagination-controls">
                <div className="ms-pagination-items">
                  <span>Show:</span>
                  <select value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="ms-pagination-select">
                    {[6, 9, 10, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="ms-pagination-buttons">
                  <button className="ms-page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}>
                    <ChevronsLeft size={13} />
                  </button>
                  <button className="ms-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                    <ChevronLeft size={13} />
                  </button>
                  {getPageNumbers().map(p => (
                    <button key={p} className={`ms-page-btn ${p === currentPage ? 'active' : ''}`}
                      onClick={() => goToPage(p)}>{p}</button>
                  ))}
                  <button className="ms-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                    <ChevronRight size={13} />
                  </button>
                  <button className="ms-page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>
                    <ChevronsRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ============================================
  // FORM MODAL
  // ============================================
  const renderFormModal = () => (
    <ModalPortal>
      <div className="ms-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
        <div className="ms-modal" onClick={e => e.stopPropagation()}>
          <div className="ms-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <div className="ms-modal-header-left">
              <div className="ms-modal-icon">
                {editingId ? <Edit size={18} /> : <Plus size={18} />}
              </div>
              <div>
                <h3>{editingId ? 'Edit Summary' : 'Add Monthly Summary'}</h3>
                <p className="ms-modal-sub">{editingId ? 'Update summary details' : 'Create a new monthly summary'}</p>
              </div>
            </div>
            <button className="ms-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="ms-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="ms-form-row">
                <div className="ms-form-group">
                  <label>Month <span className="ms-required">*</span></label>
                  <input type="month" value={formData.month} required
                    onChange={e => setFormData({ ...formData, month: e.target.value })}
                    className="ms-form-input" />
                </div>
                <div className="ms-form-group">
                  <label>Total Revenue (BD)</label>
                  <input type="number" step="0.001" value={formData.totalRevenue}
                    onChange={e => setFormData({ ...formData, totalRevenue: e.target.value })}
                    placeholder="0.000" className="ms-form-input" />
                </div>
              </div>

              <div className="ms-form-row">
                <div className="ms-form-group">
                  <label>Total Labour (BD)</label>
                  <input type="number" step="0.001" value={formData.totalLabour}
                    onChange={e => setFormData({ ...formData, totalLabour: e.target.value })}
                    placeholder="0.000" className="ms-form-input" />
                </div>
                <div className="ms-form-group">
                  <label>Car Patrol (BD)</label>
                  <input type="number" step="0.001" value={formData.carPatrol}
                    onChange={e => setFormData({ ...formData, carPatrol: e.target.value })}
                    placeholder="0.000" className="ms-form-input" />
                </div>
              </div>

              <div className="ms-form-row">
                <div className="ms-form-group">
                  <label>Monthly OH (BD)</label>
                  <input type="number" step="0.001" value={formData.monthlyOh}
                    onChange={e => setFormData({ ...formData, monthlyOh: e.target.value })}
                    placeholder="0.000" className="ms-form-input" />
                </div>
                <div className="ms-form-group">
                  <label>One Time (BD)</label>
                  <input type="number" step="0.001" value={formData.oneTime}
                    onChange={e => setFormData({ ...formData, oneTime: e.target.value })}
                    placeholder="0.000" className="ms-form-input" />
                </div>
              </div>

              <div className="ms-form-row">
                <div className="ms-form-group">
                  <label>Net Profit (Auto)</label>
                  <input type="text" value={formData.netProfit} disabled
                    className="ms-form-input"
                    style={{ color: parseFloat(formData.netProfit) >= 0 ? '#047857' : '#b91c1c', fontWeight: 800 }} />
                </div>
                <div className="ms-form-group">
                  <label>Status</label>
                  <input type="text" value={formData.status} disabled
                    className="ms-form-input"
                    style={{ color: formData.status === 'FAIDA' ? '#047857' : '#b91c1c', fontWeight: 800 }} />
                </div>
              </div>

              <div className="ms-form-group">
                <label>Notes</label>
                <input type="text" value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes" className="ms-form-input" />
              </div>

              <div className="ms-form-actions">
                <button type="submit" className="ms-btn ms-btn-primary" disabled={loading}>
                  <Save size={14} /> {loading ? 'Saving...' : (editingId ? 'Update' : 'Save')}
                </button>
                <button type="button" className="ms-btn ms-btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
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
  if (isInitialLoad) {
    return (
      <div className="ms-root">
        <div className="ms-loading">
          <div className="ms-loading-spinner" />
          <span>Loading Monthly Summaries...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`ms-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="ms-ambient">
        <div className="ms-orb ms-orb-1" />
        <div className="ms-orb ms-orb-2" />
        <div className="ms-orb ms-orb-3" />
      </div>

      {/* Header */}
      <div className="ms-header">
        <div className="ms-header-left">
          <div className="ms-header-icon">
            <LayoutDashboard size={22} />
            <span className="ms-header-badge"><Sparkles size={10} /> SUMMARY</span>
          </div>
          <div>
            <h2>Monthly Summary</h2>
            <p className="ms-header-subtitle">
              {totals.count} months · {Utils.formatCurrencyShort(totals.totalRevenue)} revenue · {Utils.formatCurrencyShort(totals.totalNet)} profit
            </p>
          </div>
        </div>
        <div className="ms-header-right">
          <div className="ms-filter-dropdown">
            <button className="ms-btn ms-btn-ghost" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
              <Filter size={14} />
              {filterType === 'all' ? 'All' : filterType === 'year' ? `Year: ${selectedYear}` :
                filterType === 'month' ? getMonthLabel(`${selectedYear}-${selectedMonth}`) : 'Range'}
              <ChevronDown size={13} />
            </button>
            {showFilterDropdown && (
              <div className="ms-dropdown">
                <div className="ms-dd-section">
                  <label>View Mode</label>
                  <div className="ms-view-grid">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'year', label: 'Year' },
                      { id: 'month', label: 'Month' },
                      { id: 'range', label: 'Range' }
                    ].map(v => (
                      <button key={v.id} className={`ms-view-btn ${filterType === v.id ? 'active' : ''}`}
                        onClick={() => { setFilterType(v.id); setShowFilterDropdown(false); }}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
                {(filterType === 'year' || filterType === 'month') && (
                  <div className="ms-dd-section">
                    <label>Year</label>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
                      className="ms-dd-select">
                      {(availableYears.length > 0 ? availableYears : [selectedYear]).map(y =>
                        <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                )}
                {filterType === 'month' && (
                  <div className="ms-dd-section">
                    <label>Month</label>
                    <div className="ms-month-grid">
                      {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => {
                        const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                        const hasData = availableMonths.includes(m);
                        return (
                          <button key={m} disabled={!hasData}
                            className={`ms-month-btn ${selectedMonth === m ? 'active' : ''}`}
                            onClick={() => { setSelectedMonth(m); setShowFilterDropdown(false); }}>
                            {names[parseInt(m) - 1]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {filterType === 'range' && (
                  <>
                    <div className="ms-dd-section">
                      <label>Start Month</label>
                      <input type="month" value={yearRangeStart}
                        onChange={e => setYearRangeStart(e.target.value)} className="ms-dd-input" />
                    </div>
                    <div className="ms-dd-section">
                      <label>End Month</label>
                      <input type="month" value={yearRangeEnd}
                        onChange={e => setYearRangeEnd(e.target.value)} className="ms-dd-input" />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <button className="ms-btn ms-btn-amber" onClick={handleAutoGenerate} disabled={loading}>
            <Calculator size={14} /> Generate Current
          </button>
          <button className="ms-btn ms-btn-amber" onClick={handleGenerateAll} disabled={loading}>
            <RefreshCw size={14} /> Generate All
          </button>
          <button className="ms-btn ms-btn-ghost" onClick={refreshSummaries} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="ms-btn ms-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> Add Summary
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="ms-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'summaries', label: 'Summaries', icon: FileText, badge: filteredData.length }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`ms-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => setViewMode(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="ms-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* Search (only in summaries tab) */}
      {viewMode === 'summaries' && (
        <div className="ms-search-bar">
          <Search size={16} />
          <input type="text" placeholder="Search by month, status, or notes..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          {searchTerm && (
            <button className="ms-search-clear" onClick={() => setSearchTerm('')}>
              <XCircle size={15} />
            </button>
          )}
          <span className="ms-search-count">{filteredData.length} months</span>
        </div>
      )}

      {/* Messages */}
      {successMessage && <div className="ms-message success"><CheckCircle size={15} /> {successMessage}</div>}
      {errorMessage && <div className="ms-message error"><AlertCircle size={15} /> {errorMessage}</div>}

      {/* API Error banner */}
      {apiError && (
        <div className="ms-api-error">
          <AlertCircle size={18} />
          <div>
            <div className="ms-api-error-title">API Connection Error</div>
            <div className="ms-api-error-detail">{apiError}</div>
            <div className="ms-api-error-hint">
              Make sure the backend is running at <code>{API_BASE_URL}</code>
            </div>
            <button className="ms-btn ms-btn-ghost" onClick={() => { setApiError(null); loadMonthlySummaries(); }}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* View */}
      {viewMode === 'overview' ? renderOverviewTab() : renderSummariesTab()}

      {/* Modals */}
      {showForm && renderFormModal()}
    </div>
  );
};

export default MonthlySummaryComponent;