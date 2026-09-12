// src/components/ExpensesManagerComponent.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Edit, Trash2, RefreshCw, TrendingUp, TrendingDown,
  Zap, Landmark, Utensils, Car, Building2, Droplets, Globe,
  Sparkles, Shield, Package, Wrench, Truck, HardHat, Hammer,
  ShieldCheck, ClipboardList, Pin, DollarSign,
  Calendar, PieChart as PieChartIcon, BarChart3, Plus,
  Save, X, Filter, ChevronDown, Info, Search, FileText, AlertCircle,
  CheckCircle, LayoutDashboard, Wallet, Receipt, ArrowUpRight,
  ArrowDownRight, Award, Star, Gauge, Timer, Activity,
  Crown, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, Flame, Target, Percent, Minus, CircleDollarSign,
  Layers, TrendingUp as TrendingUpIcon, LineChart as LineChartIcon,
  RefreshCcw
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend, ResponsiveContainer, LineChart, Line,
  Area, AreaChart, ComposedChart
} from 'recharts';
import Utils from '../utils/Utils';
import './ExpensesManager.css';

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
    <div className="ex-chart-tooltip">
      {label && <div className="ex-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="ex-chart-tooltip-row">
          <span className="ex-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="ex-chart-tooltip-name">{p.name}</span>
          <span className="ex-chart-tooltip-val">
            {formatter ? formatter(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// CATEGORY DEFINITIONS (all Lucide, no emoji)
// ============================================
const overheadCategories = [
  { id: 'electricity', label: 'Electricity Bill',   icon: Zap,           color: '#f59e0b' },
  { id: 'lmra',        label: 'LMRA Fees',          icon: Landmark,      color: '#8b5cf6' },
  { id: 'gossi',       label: 'Gossi Fees',         icon: Utensils,      color: '#ec4899' },
  { id: 'car_patrol',  label: 'Car Patrol',         icon: Car,           color: '#3b82f6' },
  { id: 'office_rent', label: 'Office Rent',        icon: Building2,     color: '#14b8a6' },
  { id: 'water',       label: 'Water Bill',         icon: Droplets,      color: '#06b6d4' },
  { id: 'internet',    label: 'Internet Bill',      icon: Globe,         color: '#8b5cf6' },
  { id: 'cleaning',    label: 'Cleaning Services',  icon: Sparkles,      color: '#22c55e' },
  { id: 'security',    label: 'Security Services',  icon: Shield,        color: '#ef4444' },
  { id: 'maintenance', label: 'Maintenance',        icon: Wrench,        color: '#f97316' },
  { id: 'insurance',   label: 'Insurance',          icon: ShieldCheck,   color: '#10b981' },
  { id: 'other_oh',    label: 'Other Overhead',     icon: Pin,           color: '#6b7280' }
];

const expenseCategories = [
  { id: 'electricity', label: 'Electricity Bill',   icon: Zap,           color: '#f59e0b' },
  { id: 'lmra',        label: 'LMRA Fees',          icon: Landmark,      color: '#8b5cf6' },
  { id: 'gossi',       label: 'Gossi Fees',         icon: Utensils,      color: '#ec4899' },
  { id: 'car_patrol',  label: 'Car Patrol',         icon: Car,           color: '#3b82f6' },
  { id: 'office_rent', label: 'Office Rent',        icon: Building2,     color: '#14b8a6' },
  { id: 'water',       label: 'Water Bill',         icon: Droplets,      color: '#06b6d4' },
  { id: 'internet',    label: 'Internet Bill',      icon: Globe,         color: '#8b5cf6' },
  { id: 'cleaning',    label: 'Cleaning Services',  icon: Sparkles,      color: '#22c55e' },
  { id: 'security',    label: 'Security Services',  icon: Shield,        color: '#ef4444' },
  { id: 'material',    label: 'Material',           icon: Package,       color: '#22c55e' },
  { id: 'equipment',   label: 'Equipment',          icon: Wrench,        color: '#f97316' },
  { id: 'transport',   label: 'Transport',          icon: Truck,         color: '#06b6d4' },
  { id: 'labour',      label: 'Labour',             icon: HardHat,       color: '#a855f7' },
  { id: 'maintenance', label: 'Maintenance',        icon: Hammer,        color: '#ef4444' },
  { id: 'insurance',   label: 'Insurance',          icon: ShieldCheck,   color: '#10b981' },
  { id: 'tax',         label: 'Tax',                icon: ClipboardList, color: '#f43f5e' },
  { id: 'other',       label: 'Other',              icon: Pin,           color: '#6b7280' }
];

const recurrenceTypes = ['daily', 'weekly', 'monthly'];

const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#a855f7', '#f43f5e', '#6b7280'
];

const overheadCategoriesList = [
  'Electricity Bill', 'LMRA Fees', 'Gossi Fees', 'Car Patrol',
  'Office Rent', 'Water Bill', 'Internet Bill', 'Cleaning Services',
  'Security Services', 'Maintenance', 'Insurance', 'Other Overhead'
];

const dateFilterPresets = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'thisWeek', label: 'This Week' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'thisYear', label: 'This Year' },
  { id: 'custom', label: 'Custom Range' }
];

// ============================================
// HELPERS
// ============================================
const getCategoryConfig = (category) => {
  return expenseCategories.find(c => c.label === category || c.id === category);
};

const CategoryIcon = ({ category, size = 14, ...rest }) => {
  const config = getCategoryConfig(category);
  const Icon = config?.icon || Pin;
  return <Icon size={size} {...rest} />;
};

// ============================================
// MAIN COMPONENT
// ============================================
const ExpensesManagerComponent = ({
  data, addExpense, updateExpense, deleteExpense, refreshData,
  addMonthlyOverhead, updateMonthlyOverhead, deleteMonthlyOverhead
}) => {
  const [editingId, setEditingId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [formData, setFormData] = useState({
    date: Utils.today(), siteId: '', category: '', description: '',
    amount: '', quantity: '1', unit: '', isRecurring: false,
    recurrenceType: '', note: '', month: selectedMonth,
    recurrenceStart: Utils.today(),   // NEW
    recurrenceEnd: ''                 // NEW
  });
  const [filter, setFilter] = useState({
    site: '', category: '', dateFrom: '', dateTo: '',
    showAuto: false                    // NEW
  });
  const [activeChart, setActiveChart] = useState('pie');
  const [showMonthlyOHForm, setShowMonthlyOHForm] = useState(false);
  const [monthlyOHData, setMonthlyOHData] = useState({
    month: '', category: '', amount: '', siteId: '',
    sitesCount: '1', workingDays: '26', notes: ''
  });
  const [editingOHId, setEditingOHId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  const [viewMode, setViewMode] = useState('overview');

  const [dateFilterType, setDateFilterType] = useState('thisMonth');
  const [customStartDate, setCustomStartDate] = useState(Utils.today());
  const [customEndDate, setCustomEndDate] = useState(Utils.today());
  const [showDateFilterDropdown, setShowDateFilterDropdown] = useState(false);

  const [expensePage, setExpensePage] = useState(1);
  const [expensePerPage, setExpensePerPage] = useState(10);
  const [overheadPage, setOverheadPage] = useState(1);
  const [overheadPerPage, setOverheadPerPage] = useState(10);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ============================================
  // MEMOIZED
  // ============================================
  const getDateRange = useMemo(() => {
    const today = new Date();
    const todayStr = Utils.today();
    let start = new Date(today);
    let end = new Date(today);
    switch (dateFilterType) {
      case 'today': return { start: todayStr, end: todayStr };
      case 'yesterday': {
        start.setDate(start.getDate() - 1);
        const yStr = start.toISOString().split('T')[0];
        return { start: yStr, end: yStr };
      }
      case 'thisWeek': {
        start.setDate(start.getDate() - 7);
        return { start: start.toISOString().split('T')[0], end: todayStr };
      }
      case 'thisMonth': {
        start.setDate(1);
        return { start: start.toISOString().split('T')[0], end: todayStr };
      }
      case 'lastMonth': {
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
      }
      case 'thisYear': {
        start.setMonth(0, 1);
        return { start: start.toISOString().split('T')[0], end: todayStr };
      }
      case 'custom': return { start: customStartDate, end: customEndDate };
      default: return { start: todayStr, end: todayStr };
    }
  }, [dateFilterType, customStartDate, customEndDate]);

  const monthlyOverheadData = useMemo(() => Array.isArray(data?.monthlyOverhead) ? data.monthlyOverhead : [], [data?.monthlyOverhead]);
  const expensesData = useMemo(() => Array.isArray(data?.expenses) ? data.expenses : [], [data?.expenses]);
  const sitesData = useMemo(() => Array.isArray(data?.sites) ? data.sites : [], [data?.sites]);

  // ============================================
  // CALCULATIONS
  // ============================================
  const monthlyOverheadSummary = useMemo(() => {
    const monthExpenses = monthlyOverheadData.filter(e => e.month === selectedMonth);
    const grouped = {};
    monthExpenses.forEach(exp => {
      const key = exp.category + (exp.siteId ? `_${exp.siteId}` : '_all');
      if (!grouped[key]) {
        grouped[key] = { total: 0, count: 0, items: [], category: exp.category, siteId: exp.siteId, siteName: exp.siteName || 'All Sites' };
      }
      grouped[key].total += exp.amount || 0;
      grouped[key].count += 1;
      grouped[key].items.push(exp);
    });
    const totalAmount = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const siteCount = sitesData.length || 1;
    const workingDays = 26;
    const perSite = siteCount > 0 ? totalAmount / siteCount : 0;
    const perDayPerSite = workingDays > 0 ? perSite / workingDays : 0;
    return { total: totalAmount, siteCount, workingDays, perSite, perDayPerSite, grouped, count: monthExpenses.length };
  }, [monthlyOverheadData, selectedMonth, sitesData]);

  const monthlyOverheadBreakdown = useMemo(() => {
    const monthExpenses = monthlyOverheadData.filter(e => e.month === selectedMonth);
    if (monthExpenses.length === 0) return [];
    const allCategories = [...new Set(monthExpenses.map(e => e.category))];
    const siteCount = sitesData.length || 1;
    const workingDays = 26;
    const result = [];
    allCategories.forEach(cat => {
      const items = monthExpenses.filter(e => e.category === cat);
      const siteGroups = {};
      items.forEach(item => {
        const key = item.siteId || 'all';
        if (!siteGroups[key]) {
          siteGroups[key] = { siteId: item.siteId, siteName: item.siteName || 'All Sites', total: 0, count: 0, items: [] };
        }
        siteGroups[key].total += item.amount || 0;
        siteGroups[key].count += 1;
        siteGroups[key].items.push(item);
      });
      const total = items.reduce((sum, e) => sum + (e.amount || 0), 0);
      const perSite = siteCount > 0 ? total / siteCount : 0;
      const perDayPerSite = workingDays > 0 ? perSite / workingDays : 0;
      const siteNames = Object.values(siteGroups).filter(g => g.siteId).map(g => g.siteName).join(', ');
      const ids = items.map(i => i.id).filter(id => id);
      result.push({
        id: ids.length > 0 ? ids.join(',') : null, ids,
        category: cat, amount: total, siteCount, perSite, workingDays,
        perDayPerSite, count: items.length,
        color: expenseCategories.find(c => c.label === cat)?.color || '#6b7280',
        siteGroups: Object.values(siteGroups),
        siteNames: siteNames || 'All Sites', items
      });
    });
    return result.sort((a, b) => b.amount - a.amount);
  }, [monthlyOverheadData, selectedMonth, sitesData]);

  const filteredExpenses = useMemo(() => {
    const { start, end } = getDateRange;
    return expensesData.filter(expense => {
      if (overheadCategoriesList.includes(expense.category)) return false;
      // NEW — hide auto-generated children unless explicitly shown
      if (expense.isAutoGenerated && !filter.showAuto) return false;
      if (filter.site && expense.siteId !== filter.site) return false;
      if (filter.category && expense.category !== filter.category) return false;
      if (start && expense.date < start) return false;
      if (end && expense.date > end) return false;
      return true;
    }).sort((a, b) => b.date?.localeCompare(a.date) || 0);
  }, [expensesData, filter, getDateRange]);

  const totalExpenses = useMemo(() => filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0), [filteredExpenses]);

  // ============================================
  // PAGINATION
  // ============================================
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
      <div className="ex-pagination">
        <div className="ex-pagination-info">
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{count}</strong> {label}
        </div>
        <div className="ex-pagination-controls">
          <div className="ex-pagination-items">
            <span>Show:</span>
            <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }} className="ex-pagination-select">
              {[6, 9, 10, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="ex-pagination-buttons">
            <button className="ex-page-btn" onClick={() => setPage(1)} disabled={current === 1}><ChevronsLeft size={13} /></button>
            <button className="ex-page-btn" onClick={() => setPage(current - 1)} disabled={current === 1}><ChevronLeft size={13} /></button>
            {getPageNumbers(current, total).map(p => (
              <button key={p} className={`ex-page-btn ${p === current ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="ex-page-btn" onClick={() => setPage(current + 1)} disabled={current === total}><ChevronRight size={13} /></button>
            <button className="ex-page-btn" onClick={() => setPage(total)} disabled={current === total}><ChevronsRight size={13} /></button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => { setExpensePage(1); }, [filter, dateFilterType, expensePerPage, viewMode]);
  useEffect(() => { setOverheadPage(1); }, [selectedMonth, overheadPerPage, viewMode]);

  // ============================================
  // CHART DATA
  // ============================================
  const pieChartData = useMemo(() => {
    return monthlyOverheadBreakdown
      .filter(item => item.amount > 0)
      .map(item => ({ name: item.category, value: item.amount, color: item.color, count: item.count }));
  }, [monthlyOverheadBreakdown]);

  const monthlyTrendData = useMemo(() => {
    const months = [];
    const currentDate = new Date(selectedMonth);
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentDate);
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthExpenses = monthlyOverheadData.filter(e => e.month === monthKey);
      const total = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const count = monthExpenses.length;
      months.push({
        month: monthKey,
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        total, count
      });
    }
    return months;
  }, [monthlyOverheadData, selectedMonth]);

  const expenseCategoryData = useMemo(() => {
    const map = {};
    filteredExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + (e.amount || 0);
    });
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'];
    return Object.entries(map)
      .map(([name, value], i) => ({
        name: name.length > 14 ? name.slice(0, 14) + '…' : name,
        value, color: palette[i % palette.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredExpenses]);

  // ============================================
  // KPI
  // ============================================
  const kpiItems = [
    { id: 'overhead', icon: Wallet, label: 'Monthly Overhead',
      value: Utils.formatCurrencyShort(monthlyOverheadSummary.total),
      meta: `${monthlyOverheadSummary.count} entries`,
      color: '#f59e0b', accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)', trend: 'up' },
    { id: 'expenses', icon: Receipt, label: 'Regular Expenses',
      value: Utils.formatCurrencyShort(totalExpenses),
      meta: `${filteredExpenses.length} entries`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'perSite', icon: Building2, label: 'Per Site',
      value: Utils.formatCurrencyShort(monthlyOverheadSummary.perSite),
      meta: `${monthlyOverheadSummary.siteCount} sites`,
      color: '#3b82f6', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up' },
    { id: 'perDay', icon: Timer, label: 'Per Day/Site',
      value: Utils.formatCurrencyShort(monthlyOverheadSummary.perDayPerSite),
      meta: `${monthlyOverheadSummary.workingDays} working days`,
      color: '#8b5cf6', accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)', trend: 'up' }
  ];

  const cardDetails = {
    overhead: { title: 'Monthly Overhead', details: [
      { label: 'Total', value: Utils.formatCurrency(monthlyOverheadSummary.total) },
      { label: 'Entries', value: monthlyOverheadSummary.count },
      { label: 'Per Site', value: Utils.formatCurrency(monthlyOverheadSummary.perSite) },
      { label: 'Per Day/Site', value: Utils.formatCurrency(monthlyOverheadSummary.perDayPerSite) }
    ]},
    expenses: { title: 'Regular Expenses', details: [
      { label: 'Total', value: Utils.formatCurrency(totalExpenses) },
      { label: 'Entries', value: filteredExpenses.length },
      { label: 'Avg', value: filteredExpenses.length ? Utils.formatCurrency(totalExpenses / filteredExpenses.length) : '0' },
      { label: 'Date Range', value: `${getDateRange.start} → ${getDateRange.end}` }
    ]},
    perSite: { title: 'Per Site', details: [
      { label: 'Per Site', value: Utils.formatCurrency(monthlyOverheadSummary.perSite) },
      { label: 'Sites', value: monthlyOverheadSummary.siteCount },
      { label: 'Total', value: Utils.formatCurrency(monthlyOverheadSummary.total) },
      { label: 'Working Days', value: monthlyOverheadSummary.workingDays }
    ]},
    perDay: { title: 'Per Day/Site', details: [
      { label: 'Per Day/Site', value: Utils.formatCurrency(monthlyOverheadSummary.perDayPerSite) },
      { label: 'Working Days', value: monthlyOverheadSummary.workingDays },
      { label: 'Per Site', value: Utils.formatCurrency(monthlyOverheadSummary.perSite) },
      { label: 'Total', value: Utils.formatCurrency(monthlyOverheadSummary.total) }
    ]}
  };

  const handleCardHover = (id, e) => { setHoveredCard(id); setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 }); };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // HANDLERS
  // ============================================
  const handleMonthlyOHSubmit = async (e) => {
    e.preventDefault();
    if (!monthlyOHData.category) { alert('Please select a category'); return; }
    setLoading(true);
    const ohEntry = {
      month: monthlyOHData.month || selectedMonth,
      category: monthlyOHData.category,
      amount: parseFloat(monthlyOHData.amount) || 0,
      siteId: monthlyOHData.siteId || null,
      sitesCount: parseInt(monthlyOHData.sitesCount) || 1,
      workingDays: parseInt(monthlyOHData.workingDays) || 26,
      notes: monthlyOHData.notes || ''
    };
    try {
      if (editingOHId) {
        if (updateMonthlyOverhead) await updateMonthlyOverhead(editingOHId, ohEntry);
        setEditingOHId(null);
      } else if (addMonthlyOverhead) await addMonthlyOverhead(ohEntry);
      await refreshData();
      setMonthlyOHData({
        month: selectedMonth, category: '', amount: '', siteId: '',
        sitesCount: sitesData.length > 0 ? sitesData.length.toString() : '1',
        workingDays: '26', notes: ''
      });
      setShowMonthlyOHForm(false);
    } catch (error) {
      console.error('Failed to save overhead:', error);
      alert('Failed to save overhead. Please try again.');
    } finally { setLoading(false); }
  };

  const handleEditOverhead = (entry) => {
    setEditingOHId(entry.id);
    setMonthlyOHData({
      month: selectedMonth, category: entry.category,
      amount: entry.amount.toString(), siteId: entry.siteId || '',
      sitesCount: entry.sitesCount?.toString() || '1',
      workingDays: entry.workingDays?.toString() || '26',
      notes: entry.notes || ''
    });
    setShowMonthlyOHForm(true);
  };

  const handleDeleteOverhead = async (id) => {
    if (!id) { alert('Cannot delete this entry'); return; }
    if (!window.confirm('Delete this overhead entry?')) return;
    try {
      setLoading(true);
      if (deleteMonthlyOverhead) await deleteMonthlyOverhead(id);
      await refreshData();
    } catch (error) {
      console.error('Failed to delete overhead:', error);
      alert('Failed to delete overhead. Please try again.');
    } finally { setLoading(false); }
  };

  const handleDateFilterChange = (filterType) => {
    setDateFilterType(filterType);
    setShowDateFilterDropdown(false);
    if (filterType === 'custom') {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setCustomStartDate(firstDay.toISOString().split('T')[0]);
      setCustomEndDate(Utils.today());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category) { alert('Please select a category'); return; }
    if (formData.isRecurring && !formData.recurrenceType) {
      alert('Please select a recurrence type');
      return;
    }
    setLoading(true);
    const expense = {
      date: formData.date, siteId: formData.siteId || null,
      category: formData.category, description: formData.description,
      amount: parseFloat(formData.amount) || 0,
      quantity: parseFloat(formData.quantity) || 1,
      unit: formData.unit, isRecurring: formData.isRecurring,
      recurrenceType: formData.isRecurring ? formData.recurrenceType : null,
      // NEW — send start/end dates when recurring
      recurrenceStart: formData.isRecurring ? (formData.recurrenceStart || formData.date) : null,
      recurrenceEnd:   formData.isRecurring ? (formData.recurrenceEnd || null) : null,
      note: formData.note, month: selectedMonth
    };
    try {
      if (editingId) {
        await updateExpense(editingId, expense);
        setEditingId(null);
      } else await addExpense(expense);
      setFormData({
        date: Utils.today(), siteId: '', category: '', description: '',
        amount: '', quantity: '1', unit: '', isRecurring: false,
        recurrenceType: '', note: '', month: selectedMonth,
        recurrenceStart: Utils.today(),   // NEW
        recurrenceEnd: ''                 // NEW
      });
      await refreshData();
      setShowExpenseForm(false);
    } catch (error) {
      console.error('Failed to save expense:', error);
      alert('Failed to save expense. Please try again.');
    } finally { setLoading(false); }
  };

  const resetExpenseForm = () => {
    setFormData({
      date: Utils.today(), siteId: '', category: '', description: '',
      amount: '', quantity: '1', unit: '', isRecurring: false,
      recurrenceType: '', note: '', month: selectedMonth,
      recurrenceStart: Utils.today(),   // NEW
      recurrenceEnd: ''                 // NEW
    });
    setEditingId(null);
  };

  const openAddExpenseModal = () => { resetExpenseForm(); setShowExpenseForm(true); };
  const openEditExpenseModal = (expense) => {
    setEditingId(expense.id);
    setFormData({
      date: expense.date, siteId: expense.siteId || '',
      category: expense.category, description: expense.description || '',
      amount: expense.amount.toString(), quantity: expense.quantity?.toString() || '1',
      unit: expense.unit || '', isRecurring: expense.isRecurring || false,
      recurrenceType: expense.recurrenceType || '', note: expense.note || '',
      month: selectedMonth,
      recurrenceStart: expense.recurrenceStart || expense.date,   // NEW
      recurrenceEnd:   expense.recurrenceEnd   || ''              // NEW
    });
    setShowExpenseForm(true);
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      await refreshData();
      if (filteredExpenses.length === 1 && expensePage > 1) setExpensePage(expensePage - 1);
    } catch (error) {
      console.error('Failed to delete expense:', error);
      alert('Failed to delete expense. Please try again.');
    }
  };

  const getSiteName = (id) => {
    if (!id) return 'All Sites';
    return sitesData.find(s => s.id === id)?.name || 'Unknown Site';
  };

  // ============================================
  // OVERVIEW TAB
  // ============================================
  const renderOverviewTab = () => (
    <div className="ex-view">
      <div className="ex-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="ex-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="ex-kpi-accent" style={{ background: item.accent }} />
              <div className="ex-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="ex-kpi-content">
                <span className="ex-kpi-label">{item.label}</span>
                <span className="ex-kpi-value">{item.value}</span>
                <span className="ex-kpi-meta">{item.meta}</span>
              </div>
              <div className={`ex-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={15} />}
                {item.trend === 'down' && <TrendingDown size={15} />}
                {item.trend === 'flat' && <Minus size={15} />}
              </div>
            </div>
          );
        })}
      </div>

      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="ex-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="ex-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="ex-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="ex-tooltip-row">
                <span className="ex-tooltip-label">{d.label}</span>
                <span className="ex-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 1 — Pie + Trend */}
      <div className="ex-grid-1-1">
        <div className="ex-card">
          <div className="ex-card-header">
            <div className="ex-card-title">
              <span className="ex-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Overhead by Category</h4>
                <span>{selectedMonth}</span>
              </div>
            </div>
          </div>
          {pieChartData.length > 0 ? (
            <div className="ex-donut-wrap">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={pieChartData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                    {pieChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="ex-donut-legend">
                {pieChartData.slice(0, 6).map((d, i) => (
                  <div key={i} className="ex-donut-item">
                    <span className="ex-donut-dot" style={{ background: d.color }} />
                    <span className="ex-donut-name">{d.name}</span>
                    <span className="ex-donut-val">{Utils.formatCurrencyShort(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="ex-empty-mini">No overhead data</div>}
        </div>

        <div className="ex-card">
          <div className="ex-card-header">
            <div className="ex-card-title">
              <span className="ex-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <LineChartIcon size={16} />
              </span>
              <div>
                <h4>6-Month Overhead Trend</h4>
                <span>Total by month</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrendData}>
              <defs>
                <linearGradient id="exTrendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
              <Area type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2.5}
                fill="url(#exTrendGrad)" name="Total" />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5}
                name="Entries" dot={{ r: 3, strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2 — Overhead Breakdown Bars */}
      {monthlyOverheadBreakdown.length > 0 && (
        <div className="ex-card">
          <div className="ex-card-header">
            <div className="ex-card-title">
              <span className="ex-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <BarChart3 size={16} />
              </span>
              <div>
                <h4>Overhead Breakdown</h4>
                <span>Per category · amount &amp; per day/site</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(260, monthlyOverheadBreakdown.length * 40)}>
            <BarChart data={monthlyOverheadBreakdown} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <YAxis type="category" dataKey="category" stroke="#94a3b8" fontSize={11}
                tickLine={false} axisLine={false} width={130} />
              <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
                cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
              <Bar dataKey="amount" name="Total Amount" fill="#f59e0b" radius={[0, 8, 8, 0]} barSize={14} />
              <Bar dataKey="perDayPerSite" name="Per Day/Site" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Row 3 — Regular Expenses category */}
      {expenseCategoryData.length > 0 && (
        <div className="ex-card">
          <div className="ex-card-header">
            <div className="ex-card-title">
              <span className="ex-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <Receipt size={16} />
              </span>
              <div>
                <h4>Regular Expenses by Category</h4>
                <span>{filteredExpenses.length} entries · {Utils.formatCurrencyShort(totalExpenses)}</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={expenseCategoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
                cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                {expenseCategoryData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  // ============================================
  // OVERHEAD TAB
  // ============================================
  const renderOverheadTab = () => {
    const overheadEntries = monthlyOverheadData.filter(e => e.month === selectedMonth);
    const { total, page, items } = paginate(overheadEntries, overheadPage, overheadPerPage);
    if (page !== overheadPage) setOverheadPage(page);
    return (
      <div className="ex-view">
        <div className="ex-filters">
          <div className="ex-month-picker">
            <Calendar size={15} />
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
              className="ex-month-input" />
          </div>
          <span className="ex-result-count">{overheadEntries.length} entries</span>
          <div className="ex-info-badges">
            <span className="ex-info-badge">Working Days: {monthlyOverheadSummary.workingDays}</span>
            <span className="ex-info-badge">Sites: {sitesData.length}</span>
          </div>
          <button className="ex-btn ex-btn-amber" onClick={() => {
            setShowMonthlyOHForm(true); setEditingOHId(null);
            setMonthlyOHData({
              month: selectedMonth, category: '', amount: '', siteId: '',
              sitesCount: sitesData.length > 0 ? sitesData.length.toString() : '1',
              workingDays: '26', notes: ''
            });
          }}>
            <Plus size={13} /> Add Overhead
          </button>
        </div>

        <div className="ex-summary-grid">
          <div className="ex-summary-card">
            <span className="ex-summary-label">Total Overhead</span>
            <span className="ex-summary-value" style={{ color: '#b45309' }}>
              {Utils.formatCurrency(monthlyOverheadSummary.total)}
            </span>
          </div>
          <div className="ex-summary-card">
            <span className="ex-summary-label">Per Site</span>
            <span className="ex-summary-value" style={{ color: '#047857' }}>
              {Utils.formatCurrency(monthlyOverheadSummary.perSite)}
            </span>
          </div>
          <div className="ex-summary-card">
            <span className="ex-summary-label">Per Day / Site</span>
            <span className="ex-summary-value" style={{ color: '#1d4ed8' }}>
              {Utils.formatCurrency(monthlyOverheadSummary.perDayPerSite)}
            </span>
          </div>
          <div className="ex-summary-card">
            <span className="ex-summary-label">Active Sites</span>
            <span className="ex-summary-value">{monthlyOverheadSummary.siteCount}</span>
          </div>
        </div>

        {overheadEntries.length === 0 ? (
          <div className="ex-empty">
            <div className="ex-empty-icon"><Wallet size={40} /></div>
            <h3>No Overhead Entries</h3>
            <p>Add overhead for {selectedMonth} to start tracking.</p>
          </div>
        ) : (
          <>
            <div className="ex-table-wrap">
              <table className="ex-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Site</th>
                    <th className="right">Amount</th>
                    <th className="center">Sites</th>
                    <th className="right">Per Site</th>
                    <th className="right">Per Day/Site</th>
                    <th className="center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((entry, i) => {
                    const perSite = (entry.amount || 0) / (entry.sitesCount || 1);
                    const perDayPerSite = perSite / (entry.workingDays || 26);
                    const config = getCategoryConfig(entry.category);
                    const catColor = config?.color || '#6b7280';
                    return (
                      <tr key={entry.id || i} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                        <td>
                          <span className="ex-cat-cell">
                            <span className="ex-cat-icon"
                              style={{ background: `${catColor}1f`, color: catColor }}>
                              <CategoryIcon category={entry.category} size={12} />
                            </span>
                            <span>{entry.category}</span>
                          </span>
                        </td>
                        <td>{entry.siteId ? getSiteName(entry.siteId) : 'All Sites'}</td>
                        <td className="right ex-td-amber"><strong>{Utils.formatCurrency(entry.amount)}</strong></td>
                        <td className="center">{entry.sitesCount || 1}</td>
                        <td className="right ex-td-green">{Utils.formatCurrency(perSite)}</td>
                        <td className="right ex-td-blue">{Utils.formatCurrency(perDayPerSite)}</td>
                        <td className="center">
                          <div className="ex-action-btns">
                            <button className="ex-icon-btn ex-icon-edit" onClick={() => handleEditOverhead(entry)}>
                              <Edit size={13} />
                            </button>
                            <button className="ex-icon-btn ex-icon-danger" onClick={() => handleDeleteOverhead(entry.id)}>
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
            {renderPagination(overheadPage, total, overheadPerPage, setOverheadPerPage, setOverheadPage, overheadEntries.length, 'overheads')}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // EXPENSES TAB
  // ============================================
  const renderExpensesTab = () => {
    const { total, page, items } = paginate(filteredExpenses, expensePage, expensePerPage);
    if (page !== expensePage) setExpensePage(page);
    return (
      <div className="ex-view">
        <div className="ex-filters">
          <select value={filter.site} onChange={e => setFilter({ ...filter, site: e.target.value })} className="ex-select">
            <option value="">All Sites</option>
            {sitesData.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} className="ex-select">
            <option value="">All Categories</option>
            {expenseCategories.filter(c => !overheadCategoriesList.includes(c.label)).map(c =>
              <option key={c.id} value={c.label}>{c.label}</option>
            )}
          </select>
          <div className="ex-date-filter">
            <button className="ex-filter-btn" onClick={() => setShowDateFilterDropdown(!showDateFilterDropdown)}>
              <Filter size={13} />
              {dateFilterPresets.find(p => p.id === dateFilterType)?.label || 'Filter'}
              <ChevronDown size={12} />
            </button>
            {showDateFilterDropdown && (
              <div className="ex-filter-dropdown">
                {dateFilterPresets.map(preset => (
                  <button key={preset.id}
                    className={`ex-filter-option ${dateFilterType === preset.id ? 'active' : ''}`}
                    onClick={() => handleDateFilterChange(preset.id)}>
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {dateFilterType === 'custom' && (
            <div className="ex-custom-date">
              <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="ex-date-input" />
              <span>→</span>
              <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="ex-date-input" />
            </div>
          )}

          {/* NEW — toggle to show auto-generated rows */}
          <label className="ex-toggle-filter">
            <input type="checkbox"
              checked={!!filter.showAuto}
              onChange={e => setFilter({ ...filter, showAuto: e.target.checked })} />
            <span>Show auto-generated</span>
          </label>

          {(filter.site || filter.category || filter.showAuto) && (
            <button className="ex-clear-filters"
              onClick={() => setFilter({ site: '', category: '', dateFrom: '', dateTo: '', showAuto: false })}>
              <X size={13} /> Clear
            </button>
          )}
          <span className="ex-result-count">{filteredExpenses.length} entries</span>
          <button className="ex-btn ex-btn-primary" onClick={openAddExpenseModal}>
            <Plus size={13} /> New Expense
          </button>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="ex-empty">
            <div className="ex-empty-icon"><Receipt size={40} /></div>
            <h3>No Regular Expenses</h3>
            <p>Add your first expense using the "New Expense" button.</p>
          </div>
        ) : (
          <>
            <div className="ex-expenses-grid">
              {items.map((expense, i) => {
                const config = getCategoryConfig(expense.category);
                const catColor = config?.color || '#6b7280';
                return (
                  <div key={expense.id} className="ex-expense-card" style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
                    <div className="ex-expense-accent" style={{
                      background: expense.isRecurring
                        ? 'linear-gradient(90deg,#8b5cf6,#a78bfa)'
                        : expense.isAutoGenerated
                          ? 'linear-gradient(90deg,#3b82f6,#60a5fa)'
                          : 'linear-gradient(90deg,#10b981,#34d399)'
                    }} />
                    <div className="ex-expense-header">
                      <div className="ex-expense-date">
                        <Calendar size={11} /> {Utils.formatDate(expense.date)}
                      </div>
                      <div className="ex-expense-amount">
                        {Utils.formatCurrency(expense.amount)}
                      </div>
                    </div>
                    <div className="ex-expense-body">
                      <div className="ex-expense-category">
                        <span className="ex-expense-icon"
                          style={{ background: `${catColor}1f`, color: catColor }}>
                          <CategoryIcon category={expense.category} size={14} />
                        </span>
                        <span>{expense.category}</span>
                      </div>
                      <div className="ex-expense-site">
                        <Building2 size={11} /> {getSiteName(expense.siteId)}
                      </div>
                      {expense.description && (
                        <div className="ex-expense-desc">{expense.description}</div>
                      )}
                      <div className="ex-expense-meta">
                        {expense.quantity > 1 && <span className="ex-meta-chip">Qty: {expense.quantity}</span>}
                        {expense.unit && <span className="ex-meta-chip">{expense.unit}</span>}
                        {expense.isRecurring && (
                          <span className="ex-meta-chip ex-recurring">
                            <RefreshCcw size={10} /> {expense.recurrenceType}
                          </span>
                        )}
                        {/* NEW — AUTO badge for generated children */}
                        {expense.isAutoGenerated && (
                          <span className="ex-meta-chip ex-auto">
                            <Zap size={10} /> AUTO
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ex-expense-footer">
                      <div className="ex-action-btns">
                        {/* Generated children shouldn't be edited directly — hide edit */}
                        {!expense.isAutoGenerated && (
                          <button className="ex-icon-btn ex-icon-edit" onClick={() => openEditExpenseModal(expense)}>
                            <Edit size={13} />
                          </button>
                        )}
                        <button className="ex-icon-btn ex-icon-danger" onClick={() => setShowDeleteConfirm(expense.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {renderPagination(expensePage, total, expensePerPage, setExpensePerPage, setExpensePage, filteredExpenses.length, 'expenses')}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // EXPENSE FORM MODAL
  // ============================================
  const renderExpenseFormModal = () => (
    <ModalPortal>
      <div className="ex-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowExpenseForm(false); resetExpenseForm(); } }}>
        <div className="ex-modal" onClick={e => e.stopPropagation()}>
          <div className="ex-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <div className="ex-modal-header-left">
              <div className="ex-modal-icon">
                {editingId ? <Edit size={18} /> : <Plus size={18} />}
              </div>
              <div>
                <h3>{editingId ? 'Edit Expense' : 'New Expense'}</h3>
                <p className="ex-modal-sub">{editingId ? 'Update expense details' : 'Add a new expense'}</p>
              </div>
            </div>
            <button className="ex-modal-close" onClick={() => { setShowExpenseForm(false); resetExpenseForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="ex-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label>Date <span className="ex-required">*</span></label>
                  <input type="date" value={formData.date} required
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="ex-form-input" />
                </div>
                <div className="ex-form-group">
                  <label>Category <span className="ex-required">*</span></label>
                  <select value={formData.category} required
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="ex-form-select">
                    <option value="">Select Category</option>
                    {expenseCategories.filter(c => !overheadCategoriesList.includes(c.label)).map(c =>
                      <option key={c.id} value={c.label}>{c.label}</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label>Site</label>
                  <select value={formData.siteId}
                    onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                    className="ex-form-select">
                    <option value="">All Sites</option>
                    {sitesData.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="ex-form-group">
                  <label>Amount (BD) <span className="ex-required">*</span></label>
                  <input type="number" step="0.001" value={formData.amount} required
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.000" className="ex-form-input" />
                </div>
              </div>

              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label>Description</label>
                  <input type="text" value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Expense description" className="ex-form-input" />
                </div>
                <div className="ex-form-group">
                  <label>Quantity</label>
                  <input type="number" step="0.01" value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="1" className="ex-form-input" />
                </div>
              </div>

              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label>Unit</label>
                  <input type="text" value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g. kg, m2, hours" className="ex-form-input" />
                </div>
                <div className="ex-form-group">
                  <label>Note</label>
                  <input type="text" value={formData.note}
                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Additional notes" className="ex-form-input" />
                </div>
              </div>

              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label className="ex-checkbox-label">
                    <input type="checkbox" checked={formData.isRecurring}
                      onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })} />
                    <span>Recurring expense</span>
                  </label>
                </div>
              </div>

              {/* NEW — expanded recurrence block with start/end dates */}
              {formData.isRecurring && (
                <div className="ex-form-row">
                  <div className="ex-form-group">
                    <label>Recurrence <span className="ex-required">*</span></label>
                    <select value={formData.recurrenceType}
                      onChange={e => setFormData({ ...formData, recurrenceType: e.target.value })}
                      className="ex-form-select" required>
                      <option value="">Select type</option>
                      {recurrenceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="ex-form-group">
                    <label>Start Date</label>
                    <input type="date"
                      value={formData.recurrenceStart || formData.date}
                      onChange={e => setFormData({ ...formData, recurrenceStart: e.target.value })}
                      className="ex-form-input" />
                  </div>
                  <div className="ex-form-group">
                    <label>End Date <span className="ex-form-hint">(optional)</span></label>
                    <input type="date"
                      value={formData.recurrenceEnd || ''}
                      onChange={e => setFormData({ ...formData, recurrenceEnd: e.target.value })}
                      className="ex-form-input" />
                  </div>
                </div>
              )}

              <div className="ex-form-actions">
                <button type="submit" className="ex-btn ex-btn-primary" disabled={loading}>
                  <Save size={14} /> {loading ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                </button>
                <button type="button" className="ex-btn ex-btn-secondary"
                  onClick={() => { setShowExpenseForm(false); resetExpenseForm(); }}>
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
  // OVERHEAD FORM MODAL
  // ============================================
  const renderOverheadFormModal = () => (
    <ModalPortal>
      <div className="ex-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowMonthlyOHForm(false); setEditingOHId(null); } }}>
        <div className="ex-modal" onClick={e => e.stopPropagation()}>
          <div className="ex-modal-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <div className="ex-modal-header-left">
              <div className="ex-modal-icon">
                {editingOHId ? <Edit size={18} /> : <Plus size={18} />}
              </div>
              <div>
                <h3>{editingOHId ? 'Edit Overhead' : 'New Overhead'}</h3>
                <p className="ex-modal-sub">{editingOHId ? 'Update overhead entry' : `Add overhead for ${selectedMonth}`}</p>
              </div>
            </div>
            <button className="ex-modal-close" onClick={() => { setShowMonthlyOHForm(false); setEditingOHId(null); }}>
              <X size={18} />
            </button>
          </div>
          <div className="ex-modal-body">
            <form onSubmit={handleMonthlyOHSubmit}>
              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label>Category <span className="ex-required">*</span></label>
                  <select value={monthlyOHData.category} required
                    onChange={e => setMonthlyOHData({ ...monthlyOHData, category: e.target.value })}
                    className="ex-form-select">
                    <option value="">Select Category</option>
                    {overheadCategories.map(cat =>
                      <option key={cat.id} value={cat.label}>{cat.label}</option>
                    )}
                  </select>
                </div>
                <div className="ex-form-group">
                  <label>Amount (BD) <span className="ex-required">*</span></label>
                  <input type="number" step="0.001" value={monthlyOHData.amount} required
                    onChange={e => setMonthlyOHData({ ...monthlyOHData, amount: e.target.value })}
                    placeholder="0.000" className="ex-form-input" />
                </div>
              </div>

              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label>Apply to Site</label>
                  <select value={monthlyOHData.siteId}
                    onChange={e => {
                      const val = e.target.value;
                      setMonthlyOHData({
                        ...monthlyOHData, siteId: val,
                        sitesCount: val ? '1' : (sitesData.length > 0 ? sitesData.length.toString() : '1')
                      });
                    }}
                    className="ex-form-select">
                    <option value="">All Sites (Company-wide)</option>
                    {sitesData.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="ex-form-group">
                  <label>Sites Count</label>
                  <input type="number" value={monthlyOHData.sitesCount}
                    onChange={e => setMonthlyOHData({ ...monthlyOHData, sitesCount: e.target.value })}
                    className="ex-form-input" />
                </div>
              </div>

              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label>Working Days</label>
                  <input type="number" value={monthlyOHData.workingDays}
                    onChange={e => setMonthlyOHData({ ...monthlyOHData, workingDays: e.target.value })}
                    className="ex-form-input" />
                </div>
                <div className="ex-form-group">
                  <label>Notes</label>
                  <input type="text" value={monthlyOHData.notes}
                    onChange={e => setMonthlyOHData({ ...monthlyOHData, notes: e.target.value })}
                    placeholder="Additional notes" className="ex-form-input" />
                </div>
              </div>

              <div className="ex-form-actions">
                <button type="submit" className="ex-btn ex-btn-primary" disabled={loading}>
                  <Save size={14} /> {loading ? 'Saving...' : (editingOHId ? 'Update' : 'Add Overhead')}
                </button>
                <button type="button" className="ex-btn ex-btn-secondary"
                  onClick={() => { setShowMonthlyOHForm(false); setEditingOHId(null); }}>
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
  // DELETE CONFIRM MODAL
  // ============================================
  const renderDeleteConfirmModal = () => {
    if (!showDeleteConfirm) return null;
    return (
      <ModalPortal>
        <div className="ex-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(null); }}>
          <div className="ex-modal ex-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="ex-modal-header" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
              <div className="ex-modal-header-left">
                <div className="ex-modal-icon"><Trash2 size={18} /></div>
                <div>
                  <h3>Delete Expense</h3>
                  <p className="ex-modal-sub">This action cannot be undone</p>
                </div>
              </div>
              <button className="ex-modal-close" onClick={() => setShowDeleteConfirm(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="ex-modal-body">
              <div className="ex-delete-content">
                <div className="ex-delete-icon"><AlertCircle size={40} /></div>
                <p className="ex-delete-text">Are you sure you want to delete this expense?</p>
                <p className="ex-delete-subtext">This action cannot be undone.</p>
                <div className="ex-delete-actions">
                  <button className="ex-btn ex-btn-danger" onClick={() => {
                    handleDeleteExpense(showDeleteConfirm);
                    setShowDeleteConfirm(null);
                  }}>
                    <Trash2 size={14} /> Delete
                  </button>
                  <button className="ex-btn ex-btn-secondary" onClick={() => setShowDeleteConfirm(null)}>
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
  if (!data) {
    return (
      <div className="ex-root">
        <div className="ex-loading">
          <div className="ex-loading-spinner" />
          <span>Loading expenses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`ex-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="ex-ambient">
        <div className="ex-orb ex-orb-1" />
        <div className="ex-orb ex-orb-2" />
        <div className="ex-orb ex-orb-3" />
      </div>

      {/* Header */}
      <div className="ex-header">
        <div className="ex-header-left">
          <div className="ex-header-icon-wrapper">
            <DollarSign size={22} />
            <span className="ex-header-badge"><Sparkles size={10} /> EXPENSES</span>
          </div>
          <div>
            <h2>Expense &amp; Overhead Management</h2>
            <p className="ex-header-subtitle">
              {Utils.formatCurrencyShort(monthlyOverheadSummary.total)} overhead · {Utils.formatCurrencyShort(totalExpenses)} expenses · {sitesData.length} sites
            </p>
          </div>
        </div>
        <div className="ex-header-right">
          <button className="ex-btn ex-btn-ghost" onClick={refreshData}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="ex-btn ex-btn-primary" onClick={openAddExpenseModal}>
            <Plus size={14} /> New Expense
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="ex-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'overhead', label: 'Overhead', icon: Wallet, badge: monthlyOverheadSummary.count },
          { id: 'expenses', label: 'Expenses', icon: Receipt, badge: filteredExpenses.length }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`ex-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => setViewMode(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="ex-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {viewMode === 'overview' && renderOverviewTab()}
      {viewMode === 'overhead' && renderOverheadTab()}
      {viewMode === 'expenses' && renderExpensesTab()}

      {showExpenseForm && renderExpenseFormModal()}
      {showMonthlyOHForm && renderOverheadFormModal()}
      {renderDeleteConfirmModal()}
    </div>
  );
};

export default ExpensesManagerComponent;