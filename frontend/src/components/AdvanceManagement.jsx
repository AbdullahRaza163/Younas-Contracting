// src/components/AdvanceManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Search, Eye, Edit, Trash2, X, Save, RefreshCw, ChevronDown,
  ChevronUp, CheckCircle, AlertCircle, User, Calendar, Wallet,
  DollarSign, TrendingUp, FileText, Receipt, Settings, Zap, Users,
  CreditCard, Banknote, Percent, Tag, Clock, Shield, Award, Building2,
  Phone, Mail, MapPin, UserCheck, UserX, LayoutDashboard, Briefcase,
  Timer, Activity, Gauge, Sparkles, Crown, Star, ArrowUpRight,
  ArrowDownRight, Info, HardHat, Layers, Box, Package, ChevronLeft,
  ChevronRight, ChevronsLeft, ChevronsRight, BarChart3, PieChart as PieChartIcon,
  LineChart as LineChartIcon, Flame, Target, Minus, CircleDollarSign,
  Trophy, Percent as PercentIcon
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ComposedChart,
  Area, AreaChart, Line
} from 'recharts';
import Utils from '../utils/Utils';
import './AdvanceManagement.css';

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
// RING PERCENTAGE GAUGE
// ============================================
const RingGauge = ({ value = 0, max = 100, size = 130, stroke = 10, color = '#10b981', label }) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = circ * pct;
  const gap = circ - dash;
  return (
    <div className="adv-ring-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="rgba(148,163,184,0.18)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="adv-ring-center">
        <span className="adv-ring-value" style={{ color }}>{Math.round(pct * 100)}%</span>
        {label && <span className="adv-ring-label">{label}</span>}
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
    <div className="adv-chart-tooltip">
      {label && <div className="adv-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="adv-chart-tooltip-row">
          <span className="adv-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="adv-chart-tooltip-name">{p.name}</span>
          <span className="adv-chart-tooltip-val">
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
const AdvanceManagement = ({ data, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('overview'); // overview | advances | repayments | types

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showRepaymentForm, setShowRepaymentForm] = useState(false);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);

  // Selection
  const [editingId, setEditingId] = useState(null);
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [selectedAdvanceId, setSelectedAdvanceId] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  // Data
  const [advances, setAdvances] = useState([]);
  const [advanceTypes, setAdvanceTypes] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [summary, setSummary] = useState(null);

  // Loading
  const [isLoading, setIsLoading] = useState(true);
  const [isRepaymentsLoading, setIsRepaymentsLoading] = useState(false);
  const isDataLoaded = React.useRef(false);
  const isRepaymentsLoaded = React.useRef(false);

  // Pagination — separate per list
  const [advPage, setAdvPage] = useState(1);
  const [advPer, setAdvPer] = useState(9);
  const [repPage, setRepPage] = useState(1);
  const [repPer, setRepPer] = useState(10);
  const [typePage, setTypePage] = useState(1);
  const [typePer, setTypePer] = useState(9);

  // Forms
  const [formData, setFormData] = useState({
    employeeId: '', advanceTypeId: '', amount: '', advanceDate: Utils.today(),
    reason: '', notes: '', deductionMonth: '', approvedBy: ''
  });
  const [repaymentForm, setRepaymentForm] = useState({
    amount: '', paymentDate: Utils.today(), paymentMethod: 'cash',
    referenceNumber: '', notes: ''
  });
  const [typeForm, setTypeForm] = useState({
    name: '', description: '', maxAmount: '', defaultTenure: 1
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ============================================
  // CARD DETAILS
  // ============================================
  const cardDetails = {
    total: { title: 'Total Advances', details: [
      { label: 'Total', value: summary?.totalAdvances || 0 },
      { label: 'Active', value: summary?.activeAdvances || 0 },
      { label: 'Completed', value: summary?.completedAdvances || 0 },
      { label: 'Total Amount', value: Utils.formatCurrency(summary?.totalAmount || 0) }
    ]},
    active: { title: 'Active Advances', details: [
      { label: 'Active', value: summary?.activeAdvances || 0 },
      { label: 'Total', value: summary?.totalAdvances || 0 },
      { label: 'Remaining Balance', value: Utils.formatCurrency(summary?.totalBalance || 0) },
      { label: 'Collection Rate', value: `${summary?.collectionRate?.toFixed(1) || 0}%` }
    ]},
    completed: { title: 'Completed Advances', details: [
      { label: 'Completed', value: summary?.completedAdvances || 0 },
      { label: 'Total', value: summary?.totalAdvances || 0 },
      { label: 'Completion Rate', value: summary?.totalAdvances > 0 ? `${((summary.completedAdvances / summary.totalAdvances) * 100).toFixed(1)}%` : '0%' },
      { label: 'Rate', value: `${summary?.collectionRate?.toFixed(1) || 0}%` }
    ]},
    amount: { title: 'Total Amount', details: [
      { label: 'Total', value: Utils.formatCurrency(summary?.totalAmount || 0) },
      { label: 'Balance', value: Utils.formatCurrency(summary?.totalBalance || 0) },
      { label: 'Avg', value: summary?.totalAdvances > 0 ? Utils.formatCurrency(summary.totalAmount / summary.totalAdvances) : '0' },
      { label: 'Collection', value: `${summary?.collectionRate?.toFixed(1) || 0}%` }
    ]},
    balance: { title: 'Remaining Balance', details: [
      { label: 'Balance', value: Utils.formatCurrency(summary?.totalBalance || 0) },
      { label: 'Total', value: Utils.formatCurrency(summary?.totalAmount || 0) },
      { label: 'Paid', value: Utils.formatCurrency((summary?.totalAmount || 0) - (summary?.totalBalance || 0)) },
      { label: 'Active', value: summary?.activeAdvances || 0 }
    ]},
    rate: { title: 'Collection Rate', details: [
      { label: 'Rate', value: `${summary?.collectionRate?.toFixed(1) || 0}%` },
      { label: 'Total', value: Utils.formatCurrency(summary?.totalAmount || 0) },
      { label: 'Collected', value: Utils.formatCurrency((summary?.totalAmount || 0) - (summary?.totalBalance || 0)) },
      { label: 'Remaining', value: Utils.formatCurrency(summary?.totalBalance || 0) }
    ]}
  };

  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({ x: event.clientX + 15, y: event.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // AUTO-PROCESS DEDUCTIONS
  // ============================================
  const autoProcessDeductions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/advances/deductions/auto-process`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const result = await response.json();
        if (result.processed > 0) {
          setSuccess(`Auto-processed ${result.processed} advance deductions for ${result.totalAmount} BD`);
          setTimeout(() => setSuccess(''), 5000);
          return true;
        }
      }
      return false;
    } catch (err) { return false; }
  }, []);

  // ============================================
  // LOAD
  // ============================================
  const loadData = useCallback(async () => {
    if (isDataLoaded.current) return;
    setIsLoading(true); setError('');
    try {
      await autoProcessDeductions();
      const [advancesRes, typesRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/advances`, { headers: { 'Accept': 'application/json' } }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE_URL}/advances/types`, { headers: { 'Accept': 'application/json' } }).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE_URL}/advances/summary`, { headers: { 'Accept': 'application/json' } }).then(r => r.ok ? r.json() : {})
      ]);
      setAdvances(advancesRes);
      setAdvanceTypes(typesRes);
      setSummary(summaryRes);
      isDataLoaded.current = true;
    } catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
  }, [autoProcessDeductions]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadRepaymentsForAdvance = useCallback(async (advanceId) => {
    if (!advanceId) return;
    setIsRepaymentsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/advances/${advanceId}/repayments`, {
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        setRepayments(await response.json());
        isRepaymentsLoaded.current = true;
      } else setRepayments([]);
    } catch (err) { setError(err.message); setRepayments([]); }
    finally { setIsRepaymentsLoading(false); }
  }, []);

  const loadAllRepayments = useCallback(async () => {
    setIsRepaymentsLoading(true);
    try {
      const all = [];
      for (const advance of advances) {
        const r = await fetch(`${API_BASE_URL}/advances/${advance.id}/repayments`, {
          headers: { 'Accept': 'application/json' }
        });
        if (r.ok) all.push(...(await r.json()));
      }
      setRepayments(all);
      isRepaymentsLoaded.current = true;
    } catch (err) { setError(err.message); setRepayments([]); }
    finally { setIsRepaymentsLoading(false); }
  }, [advances]);

  const getEmployeeSalary = (employeeId) => {
    const worker = data.workers?.find(w => w.id === employeeId);
    if (!worker) return 0;
    return worker.monthly_salary || worker.salary || (worker.daily_rate * 26) || 0;
  };

  // ============================================
  // CRUD
  // ============================================
  const createAdvance = async (formData) => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const amount = parseFloat(formData.amount) || 0;
      const deductionMonth = formData.deductionMonth || Utils.getCurrentMonthString();
      const dateParts = deductionMonth.split('-');
      let year = parseInt(dateParts[0]);
      let month = parseInt(dateParts[1]);
      month += 1;
      if (month > 12) { month = 1; year += 1; }
      const endMonth = `${year}-${String(month).padStart(2, '0')}`;
      const payload = {
        ...formData, amount,
        tenureMonths: 1,
        deductionStartMonth: deductionMonth,
        deductionEndMonth: endMonth
      };
      const response = await fetch(`${API_BASE_URL}/advances`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create advance');
      }
      const result = await response.json();
      setSuccess(`Advance ${result.advanceNumber} issued successfully!`);
      isDataLoaded.current = false;
      await loadData();
      setShowForm(false); resetForm();
      setTimeout(() => setSuccess(''), 5000);
      return result;
    } catch (err) { setError(err.message); return null; }
    finally { setLoading(false); }
  };

  const deleteAdvance = async (id) => {
    if (!window.confirm('Delete this advance?')) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/advances/${id}`, { method: 'DELETE' });
      setSuccess('Advance deleted successfully!');
      isDataLoaded.current = false;
      await loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const recordRepayment = async (advanceId, repaymentData) => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/advances/${advanceId}/repayments`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(repaymentData)
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to record repayment');
      }
      setSuccess('Repayment recorded successfully!');
      isRepaymentsLoaded.current = false;
      await loadRepaymentsForAdvance(advanceId);
      setShowRepaymentForm(false); resetRepaymentForm();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const createAdvanceType = async (typeData) => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/advances/types`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(typeData)
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create advance type');
      }
      setSuccess('Advance type created successfully!');
      isDataLoaded.current = false;
      await loadData();
      setShowTypeForm(false); resetTypeForm();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const processDeductions = async (month) => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/advances/deductions/auto-process`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ month })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to process deductions');
      }
      const result = await response.json();
      setSuccess(result.message);
      isDataLoaded.current = false;
      await loadData();
      setShowDeductionModal(false);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '', advanceTypeId: '', amount: '', advanceDate: Utils.today(),
      reason: '', notes: '', deductionMonth: '', approvedBy: ''
    });
    setEditingId(null);
  };
  const resetRepaymentForm = () => setRepaymentForm({
    amount: '', paymentDate: Utils.today(), paymentMethod: 'cash',
    referenceNumber: '', notes: ''
  });
  const resetTypeForm = () => {
    setTypeForm({ name: '', description: '', maxAmount: '', defaultTenure: 1 });
    setEditingId(null);
  };

  // ============================================
  // BADGES
  // ============================================
  const getStatusBadge = (status) => {
    const config = {
      active: { label: 'Active', icon: CheckCircle },
      completed: { label: 'Completed', icon: CheckCircle },
      cancelled: { label: 'Cancelled', icon: X }
    };
    const c = config[status] || config.active;
    const Icon = c.icon;
    return (
      <span className={`adv-status ${status}`}>
        <Icon size={11} /> {c.label}
      </span>
    );
  };

  const getPaymentMethodBadge = (method) => {
    const config = {
      cash: { label: 'Cash', icon: Banknote },
      bank_transfer: { label: 'Bank Transfer', icon: CreditCard },
      cheque: { label: 'Cheque', icon: FileText },
      salary_deduction: { label: 'Salary Deduction', icon: Wallet }
    };
    const c = config[method] || config.cash;
    const Icon = c.icon;
    return (
      <span className={`adv-payment-method ${method}`}>
        <Icon size={11} /> {c.label}
      </span>
    );
  };

  const toggleExpand = (id) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  // ============================================
  // FILTER + PAGINATION
  // ============================================
  const filteredAdvances = useMemo(() => {
    let filtered = advances;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.employeeName?.toLowerCase().includes(s) ||
        a.advanceNumber?.toLowerCase().includes(s) ||
        a.reason?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter(a => a.status === statusFilter);
    if (employeeFilter !== 'all') filtered = filtered.filter(a => a.employeeId === employeeFilter);
    return filtered;
  }, [advances, searchTerm, statusFilter, employeeFilter]);

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
      <div className="adv-pagination">
        <div className="adv-pagination-info">
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{count}</strong> {label}
        </div>
        <div className="adv-pagination-controls">
          <div className="adv-pagination-items">
            <span>Show:</span>
            <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }} className="adv-pagination-select">
              {[6, 9, 10, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="adv-pagination-buttons">
            <button className="adv-page-btn" onClick={() => setPage(1)} disabled={current === 1}><ChevronsLeft size={13} /></button>
            <button className="adv-page-btn" onClick={() => setPage(current - 1)} disabled={current === 1}><ChevronLeft size={13} /></button>
            {getPageNumbers(current, total).map(p => (
              <button key={p} className={`adv-page-btn ${p === current ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="adv-page-btn" onClick={() => setPage(current + 1)} disabled={current === total}><ChevronRight size={13} /></button>
            <button className="adv-page-btn" onClick={() => setPage(total)} disabled={current === total}><ChevronsRight size={13} /></button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => { setAdvPage(1); }, [searchTerm, statusFilter, employeeFilter, advPer, viewMode]);
  useEffect(() => { setRepPage(1); }, [repPer, viewMode]);
  useEffect(() => { setTypePage(1); }, [typePer, viewMode]);

  // ============================================
  // CHART DATA
  // ============================================
  const statusChartData = useMemo(() => {
    const active = advances.filter(a => a.status === 'active').length;
    const completed = advances.filter(a => a.status === 'completed').length;
    const cancelled = advances.filter(a => a.status === 'cancelled').length;
    return [
      { name: 'Active', value: active, color: '#10b981' },
      { name: 'Completed', value: completed, color: '#3b82f6' },
      { name: 'Cancelled', value: cancelled, color: '#94a3b8' }
    ].filter(d => d.value > 0);
  }, [advances]);

  const monthlyTrendData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      const monthAdvances = advances.filter(a => a.advanceDate && a.advanceDate.startsWith(key));
      const issued = monthAdvances.reduce((s, a) => s + (a.amount || 0), 0);
      const paid = monthAdvances.reduce((s, a) => s + (a.paidAmount || 0), 0);
      months.push({ label, issued, paid, count: monthAdvances.length });
    }
    return months;
  }, [advances]);

  const topEmployeesData = useMemo(() => {
    const map = {};
    advances.forEach(a => {
      const key = a.employeeName || 'Unknown';
      if (!map[key]) map[key] = { name: key, total: 0, count: 0 };
      map[key].total += (a.amount || 0);
      map[key].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map(e => ({
        name: e.name.length > 14 ? e.name.slice(0, 14) + '…' : e.name,
        value: e.total, count: e.count
      }));
  }, [advances]);

  // Percentage-based cards for the ring gauges
  const paymentMethodData = useMemo(() => {
    const map = { cash: 0, bank_transfer: 0, cheque: 0, salary_deduction: 0 };
    repayments.forEach(r => {
      if (map[r.paymentMethod] !== undefined) map[r.paymentMethod] += (r.amount || 0);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return [
      { key: 'cash', label: 'Cash', value: map.cash, pct: (map.cash / total) * 100, color: '#10b981' },
      { key: 'bank_transfer', label: 'Bank', value: map.bank_transfer, pct: (map.bank_transfer / total) * 100, color: '#3b82f6' },
      { key: 'cheque', label: 'Cheque', value: map.cheque, pct: (map.cheque / total) * 100, color: '#8b5cf6' },
      { key: 'salary_deduction', label: 'Salary', value: map.salary_deduction, pct: (map.salary_deduction / total) * 100, color: '#f59e0b' }
    ];
  }, [repayments]);

  // ============================================
  // STATS
  // ============================================
  const kpiItems = [
    { id: 'total', icon: FileText, label: 'Total Advances',
      value: summary?.totalAdvances || 0,
      meta: `${summary?.activeAdvances || 0} active`,
      color: '#3b82f6', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up' },
    { id: 'active', icon: CheckCircle, label: 'Active',
      value: summary?.activeAdvances || 0,
      meta: `${summary?.totalAdvances ? ((summary.activeAdvances / summary.totalAdvances) * 100).toFixed(0) : 0}% of total`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'amount', icon: DollarSign, label: 'Total Amount',
      value: Utils.formatCurrencyShort(summary?.totalAmount || 0),
      meta: `${summary?.totalAdvances || 0} advances`,
      color: '#8b5cf6', accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)', trend: 'up' },
    { id: 'balance', icon: Wallet, label: 'Remaining Balance',
      value: Utils.formatCurrencyShort(summary?.totalBalance || 0),
      meta: `Paid: ${Utils.formatCurrencyShort((summary?.totalAmount || 0) - (summary?.totalBalance || 0))}`,
      color: '#ef4444', accent: 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: (summary?.totalBalance || 0) > 0 ? 'down' : 'flat' }
  ];

  // ============================================
  // OVERVIEW TAB
  // ============================================
  const renderOverviewTab = () => (
    <div className="adv-view">
      <div className="adv-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="adv-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="adv-kpi-accent" style={{ background: item.accent }} />
              <div className="adv-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="adv-kpi-content">
                <span className="adv-kpi-label">{item.label}</span>
                <span className="adv-kpi-value">{item.value}</span>
                <span className="adv-kpi-meta">{item.meta}</span>
              </div>
              <div className={`adv-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={15} />}
                {item.trend === 'down' && <TrendingUp size={15} />}
                {item.trend === 'flat' && <Minus size={15} />}
              </div>
            </div>
          );
        })}
      </div>

      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="adv-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="adv-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="adv-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="adv-tooltip-row">
                <span className="adv-tooltip-label">{d.label}</span>
                <span className="adv-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 1 — Ring percentage gauges (like the reference image) */}
      <div className="adv-card">
        <div className="adv-card-header">
          <div className="adv-card-title">
            <span className="adv-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
              <PercentIcon size={16} />
            </span>
            <div>
              <h4>Key Performance Rates</h4>
              <span>Live percentages from current data</span>
            </div>
          </div>
        </div>
        <div className="adv-rings-row">
          <RingGauge
            value={summary?.collectionRate || 0} max={100} size={140} stroke={11}
            color="#10b981" label="COLLECTION" />
          <RingGauge
            value={summary?.totalAdvances ? ((summary.completedAdvances || 0) / summary.totalAdvances) * 100 : 0}
            max={100} size={140} stroke={11} color="#3b82f6" label="COMPLETION" />
          <RingGauge
            value={summary?.totalAdvances ? ((summary.activeAdvances || 0) / summary.totalAdvances) * 100 : 0}
            max={100} size={140} stroke={11} color="#8b5cf6" label="ACTIVE" />
          <RingGauge
            value={summary?.totalAmount ? (((summary.totalAmount - (summary.totalBalance || 0)) / summary.totalAmount) * 100) : 0}
            max={100} size={140} stroke={11} color="#f59e0b" label="PAID" />
          <RingGauge
            value={summary?.totalAmount ? ((summary.totalBalance || 0) / summary.totalAmount) * 100 : 0}
            max={100} size={140} stroke={11} color="#ef4444" label="OUTSTANDING" />
        </div>
        <div className="adv-rings-legend">
          <span><i style={{ background: '#10b981' }} />Collection Rate</span>
          <span><i style={{ background: '#3b82f6' }} />Completion Rate</span>
          <span><i style={{ background: '#8b5cf6' }} />Active Rate</span>
          <span><i style={{ background: '#f59e0b' }} />Paid Amount</span>
          <span><i style={{ background: '#ef4444' }} />Outstanding</span>
        </div>
      </div>

      {/* Row 2 — Status donut + Payment method rings */}
      <div className="adv-grid-1-1">
        <div className="adv-card">
          <div className="adv-card-header">
            <div className="adv-card-title">
              <span className="adv-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Advances by Status</h4>
                <span>{advances.length} total</span>
              </div>
            </div>
          </div>
          {statusChartData.length > 0 ? (
            <div className="adv-donut-wrap">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={statusChartData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                    {statusChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="adv-donut-legend">
                {statusChartData.map((d, i) => (
                  <div key={i} className="adv-donut-item">
                    <span className="adv-donut-dot" style={{ background: d.color }} />
                    <span className="adv-donut-name">{d.name}</span>
                    <span className="adv-donut-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="adv-empty-mini">No advances yet</div>}
        </div>

        <div className="adv-card">
          <div className="adv-card-header">
            <div className="adv-card-title">
              <span className="adv-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <CreditCard size={16} />
              </span>
              <div>
                <h4>Repayments by Method</h4>
                <span>Distribution percentage</span>
              </div>
            </div>
          </div>
          <div className="adv-method-rings">
            {paymentMethodData.map((m, i) => (
              <div key={i} className="adv-method-item">
                <RingGauge value={m.pct} max={100} size={100} stroke={8} color={m.color} label={m.label} />
                <span className="adv-method-value">{Utils.formatCurrencyShort(m.value)}</span>
                <span className="adv-method-pct">{m.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 — 12-month trend */}
      <div className="adv-card">
        <div className="adv-card-header">
          <div className="adv-card-title">
            <span className="adv-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
              <LineChartIcon size={16} />
            </span>
            <div>
              <h4>12-Month Advance Trend</h4>
              <span>Issued vs Paid by month</span>
            </div>
          </div>
          <div className="adv-legend">
            <span><i style={{ background: '#3b82f6' }} />Issued</span>
            <span><i style={{ background: '#10b981' }} />Paid</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={monthlyTrendData}>
            <defs>
              <linearGradient id="advIssuedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="advPaidGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
              tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
            <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
            <Area type="monotone" dataKey="issued" stroke="#3b82f6" strokeWidth={2.5}
              fill="url(#advIssuedGrad)" name="Issued" />
            <Area type="monotone" dataKey="paid" stroke="#10b981" strokeWidth={2.5}
              fill="url(#advPaidGrad)" name="Paid" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Row 4 — Top employees bar */}
      {topEmployeesData.length > 0 && (
        <div className="adv-card">
          <div className="adv-card-header">
            <div className="adv-card-title">
              <span className="adv-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Trophy size={16} />
              </span>
              <div>
                <h4>Top Employees by Advance Amount</h4>
                <span>Highest total advances</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topEmployeesData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <defs>
                <linearGradient id="advTopGrad" x1="0" y1="0" x2="1" y2="0">
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
              <Bar dataKey="value" name="Amount" fill="url(#advTopGrad)" radius={[0, 8, 8, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  // ============================================
  // ADVANCES TAB
  // ============================================
  const renderAdvancesTab = () => {
    const { total, page, items } = paginate(filteredAdvances, advPage, advPer);
    if (page !== advPage) setAdvPage(page);
    return (
      <div className="adv-view">
        <div className="adv-filters">
          <div className="adv-search">
            <Search size={15} className="adv-search-icon" />
            <input type="text" placeholder="Search by employee, advance #, or reason..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button className="adv-search-clear" onClick={() => setSearchTerm('')}>
                <X size={13} />
              </button>
            )}
          </div>
          <div className="adv-filter-group">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="adv-select">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="adv-select">
              <option value="all">All Employees</option>
              {data.workers?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <span className="adv-result-count">
            {filteredAdvances.length} of {advances.length}
          </span>
          <button className="adv-btn adv-btn-secondary"
            onClick={() => { resetTypeForm(); setShowTypeForm(true); }}>
            <Tag size={13} /> Advance Type
          </button>
          <button className="adv-btn adv-btn-amber" onClick={() => setShowDeductionModal(true)}>
            <Zap size={13} /> Process Deductions
          </button>
          <button className="adv-btn adv-btn-primary"
            onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={13} /> New Advance
          </button>
        </div>

        {filteredAdvances.length === 0 ? (
          <div className="adv-empty">
            <div className="adv-empty-icon"><FileText size={40} /></div>
            <h3>No Advances Found</h3>
            <p>Issue a new advance to an employee to get started.</p>
            <button className="adv-btn adv-btn-primary"
              onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={14} /> Issue Advance
            </button>
          </div>
        ) : (
          <>
            <div className="adv-cards-grid">
              {items.map((advance, index) => {
                const isExpanded = expandedItems[advance.id];
                const progress = advance.progress || 0;
                const employeeSalary = getEmployeeSalary(advance.employeeId);
                const netSalary = employeeSalary - (advance.monthlyDeduction || 0);
                return (
                  <div key={advance.id} className="adv-card-item"
                    style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
                    <div className="adv-card-accent" style={{
                      background: advance.status === 'active'
                        ? 'linear-gradient(90deg,#10b981,#34d399)'
                        : advance.status === 'completed'
                        ? 'linear-gradient(90deg,#3b82f6,#60a5fa)'
                        : 'linear-gradient(90deg,#94a3b8,#cbd5e1)'
                    }} />

                    <div className="adv-card-head">
                      <div className="adv-head-left">
                        <div className="adv-number">
                          <Wallet size={11} />
                          {advance.advanceNumber}
                        </div>
                        <div className="adv-employee">
                          <User size={12} /> {advance.employeeName}
                        </div>
                        <div className="adv-type-tag">{advance.advanceTypeName}</div>
                      </div>
                      <div className="adv-head-right">
                        {getStatusBadge(advance.status)}
                        <div className="adv-amount">
                          {Utils.formatCurrency(advance.amount)}
                        </div>
                      </div>
                    </div>

                    <div className="adv-body">
                      <div className="adv-detail-grid">
                        <div className="adv-detail">
                          <span className="adv-detail-label">Balance</span>
                          <span className="adv-detail-value adv-td-amber">
                            {Utils.formatCurrencyShort(advance.remainingBalance)}
                          </span>
                        </div>
                        <div className="adv-detail">
                          <span className="adv-detail-label">Paid</span>
                          <span className="adv-detail-value adv-td-green">
                            {Utils.formatCurrencyShort(advance.paidAmount)}
                          </span>
                        </div>
                        <div className="adv-detail">
                          <span className="adv-detail-label">Deduction</span>
                          <span className="adv-detail-value">
                            {Utils.formatCurrencyShort(advance.monthlyDeduction)}
                          </span>
                        </div>
                        <div className="adv-detail">
                          <span className="adv-detail-label">Net Salary</span>
                          <span className={`adv-detail-value ${netSalary < 0 ? 'adv-td-red' : 'adv-td-green'}`}>
                            {Utils.formatCurrencyShort(netSalary)}
                          </span>
                        </div>
                      </div>

                      <div className="adv-progress-section">
                        <div className="adv-progress-header">
                          <span className="adv-progress-label">Repayment</span>
                          <span className="adv-progress-value">{progress.toFixed(1)}%</span>
                        </div>
                        <div className="adv-progress-bar">
                          <div className="adv-progress-fill"
                            style={{
                              width: `${Math.min(progress, 100)}%`,
                              background: progress >= 75 ? 'linear-gradient(90deg,#10b981,#34d399)'
                                : progress >= 50 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                                : 'linear-gradient(90deg,#ef4444,#f87171)'
                            }} />
                        </div>
                      </div>

                      {advance.reason && (
                        <div className="adv-reason">
                          <FileText size={11} /> {advance.reason}
                        </div>
                      )}
                    </div>

                    <div className="adv-card-foot">
                      <div className="adv-actions">
                        <button className="adv-icon-btn" title="View"
                          onClick={() => { setSelectedAdvance(advance); setShowDetailModal(true); }}>
                          <Eye size={13} />
                        </button>
                        {advance.status === 'active' && (
                          <button className="adv-icon-btn adv-icon-record" title="Record Payment"
                            onClick={() => { setSelectedAdvance(advance); resetRepaymentForm(); setShowRepaymentForm(true); }}>
                            <Receipt size={13} />
                          </button>
                        )}
                        <button className="adv-icon-btn adv-icon-history" title="History"
                          onClick={() => {
                            setSelectedAdvance(advance); setSelectedAdvanceId(advance.id);
                            setViewMode('repayments'); loadRepaymentsForAdvance(advance.id);
                          }}>
                          <FileText size={13} />
                        </button>
                        <button className="adv-icon-btn adv-icon-danger" title="Delete"
                          onClick={() => deleteAdvance(advance.id)}>
                          <Trash2 size={13} />
                        </button>
                        <button className="adv-icon-btn adv-icon-expand"
                          onClick={() => toggleExpand(advance.id)}>
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="adv-expanded">
                        <div className="adv-expanded-grid">
                          <div><strong>Employee:</strong> {advance.employeeName}</div>
                          <div><strong>Advance Type:</strong> {advance.advanceTypeName}</div>
                          <div><strong>Amount:</strong> {Utils.formatCurrency(advance.amount)}</div>
                          <div><strong>Monthly Salary:</strong> {Utils.formatCurrency(employeeSalary)}</div>
                          <div><strong>Deduction:</strong> {Utils.formatCurrency(advance.monthlyDeduction)}</div>
                          <div><strong>Deduction Month:</strong> {advance.deductionStartMonth || '—'}</div>
                          <div><strong>Approved By:</strong> {advance.approvedBy || 'N/A'}</div>
                          <div><strong>Created:</strong> {advance.createdAt ? Utils.formatDate(advance.createdAt) : '—'}</div>
                        </div>
                        {advance.notes && (
                          <div className="adv-expanded-notes">
                            <strong>Notes:</strong> {advance.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {renderPagination(advPage, total, advPer, setAdvPer, setAdvPage, filteredAdvances.length, 'advances')}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // REPAYMENTS TAB
  // ============================================
  const renderRepaymentsTab = () => {
    const { total, page, items } = paginate(repayments, repPage, repPer);
    if (page !== repPage) setRepPage(page);
    return (
      <div className="adv-view">
        <div className="adv-filters">
          <select value={selectedAdvanceId}
            onChange={(e) => {
              setSelectedAdvanceId(e.target.value);
              const adv = advances.find(a => a.id === e.target.value);
              setSelectedAdvance(adv);
              if (e.target.value) loadRepaymentsForAdvance(e.target.value);
              else loadAllRepayments();
            }}
            className="adv-select">
            <option value="">All Advances</option>
            {advances.map(a => (
              <option key={a.id} value={a.id}>
                {a.advanceNumber} — {a.employeeName}
              </option>
            ))}
          </select>
          <span className="adv-result-count">{repayments.length} repayments</span>
          <button className="adv-btn adv-btn-ghost"
            onClick={() => { setViewMode('advances'); setRepayments([]); isRepaymentsLoaded.current = false; }}>
            <ChevronLeft size={13} /> Back to Advances
          </button>
        </div>

        {isRepaymentsLoading ? (
          <div className="adv-loading">
            <div className="adv-loading-spinner" />
            <span>Loading repayments...</span>
          </div>
        ) : repayments.length === 0 ? (
          <div className="adv-empty">
            <div className="adv-empty-icon"><Receipt size={40} /></div>
            <h3>No Repayments</h3>
            <p>No repayments recorded for the selected advance.</p>
          </div>
        ) : (
          <>
            <div className="adv-table-wrap">
              <table className="adv-table">
                <thead>
                  <tr>
                    <th>Advance #</th>
                    <th>Employee</th>
                    <th>Date</th>
                    <th className="right">Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((repayment, i) => {
                    const adv = advances.find(a => a.id === repayment.advanceId);
                    return (
                      <tr key={repayment.id} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                        <td><strong>{adv?.advanceNumber || 'N/A'}</strong></td>
                        <td>{adv?.employeeName || 'Unknown'}</td>
                        <td>{Utils.formatDate(repayment.paymentDate)}</td>
                        <td className="right adv-td-green">
                          <strong>{Utils.formatCurrency(repayment.amount)}</strong>
                        </td>
                        <td>{getPaymentMethodBadge(repayment.paymentMethod)}</td>
                        <td>{repayment.referenceNumber || '—'}</td>
                        <td>{repayment.createdBy || 'System'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {renderPagination(repPage, total, repPer, setRepPer, setRepPage, repayments.length, 'repayments')}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // TYPES TAB
  // ============================================
  const renderTypesTab = () => {
    const { total, page, items } = paginate(advanceTypes, typePage, typePer);
    if (page !== typePage) setTypePage(page);
    return (
      <div className="adv-view">
        <div className="adv-filters">
          <span className="adv-result-count" style={{ marginLeft: 0 }}>
            {advanceTypes.length} types
          </span>
          <button className="adv-btn adv-btn-primary" style={{ marginLeft: 'auto' }}
            onClick={() => { resetTypeForm(); setShowTypeForm(true); }}>
            <Plus size={13} /> Add Advance Type
          </button>
        </div>

        {advanceTypes.length === 0 ? (
          <div className="adv-empty">
            <div className="adv-empty-icon"><Tag size={40} /></div>
            <h3>No Advance Types</h3>
            <p>Add advance types to categorize advances.</p>
          </div>
        ) : (
          <>
            <div className="adv-types-grid">
              {items.map((type, i) => (
                <div key={type.id} className="adv-type-card" style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
                  <div className="adv-type-head">
                    <div className="adv-type-icon"><Tag size={16} /></div>
                    <div className="adv-type-name">{type.name}</div>
                    <span className={`adv-type-status ${type.isActive ? 'active' : 'inactive'}`}>
                      {type.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="adv-type-body">
                    {type.description && <div className="adv-type-desc">{type.description}</div>}
                    {type.maxAmount > 0 && (
                      <div className="adv-type-meta">
                        <span className="adv-detail-label">Max Amount</span>
                        <span className="adv-detail-value">{Utils.formatCurrency(type.maxAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {renderPagination(typePage, total, typePer, setTypePer, setTypePage, advanceTypes.length, 'types')}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // MODALS (portal-based)
  // ============================================
  const renderFormModal = () => {
    const selectedEmployee = data.workers?.find(w => w.id === formData.employeeId);
    const employeeSalary = selectedEmployee ? getEmployeeSalary(selectedEmployee.id) : 0;
    const deductionAmount = parseFloat(formData.amount) || 0;
    const netSalary = employeeSalary - deductionAmount;
    const isExceedingSalary = deductionAmount > employeeSalary;

    return (
      <ModalPortal>
        <div className="adv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
          <div className="adv-modal" onClick={e => e.stopPropagation()}>
            <div className="adv-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <div className="adv-modal-header-left">
                <div className="adv-modal-icon"><Plus size={18} /></div>
                <div>
                  <h3>New Advance</h3>
                  <p className="adv-modal-sub">Issue a salary advance</p>
                </div>
              </div>
              <button className="adv-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
                <X size={18} />
              </button>
            </div>
            <div className="adv-modal-body">
              <form onSubmit={(e) => { e.preventDefault(); createAdvance(formData); }}>
                <div className="adv-form-row">
                  <div className="adv-form-group">
                    <label>Employee <span className="adv-required">*</span></label>
                    <select value={formData.employeeId} required
                      onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                      className="adv-form-select">
                      <option value="">Select Employee</option>
                      {data.workers?.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} — {Utils.formatCurrency(getEmployeeSalary(w.id))}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="adv-form-group">
                    <label>Advance Type <span className="adv-required">*</span></label>
                    <select value={formData.advanceTypeId} required
                      onChange={e => setFormData({ ...formData, advanceTypeId: e.target.value })}
                      className="adv-form-select">
                      <option value="">Select Type</option>
                      {advanceTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="adv-form-row">
                  <div className="adv-form-group">
                    <label>Amount (BD) <span className="adv-required">*</span></label>
                    <input type="number" step="0.001" value={formData.amount} required
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.000" max={employeeSalary}
                      className="adv-form-input" />
                    {isExceedingSalary && formData.amount && (
                      <small className="adv-error-hint">
                        <AlertCircle size={11} /> Exceeds monthly salary!
                      </small>
                    )}
                  </div>
                  <div className="adv-form-group">
                    <label>Advance Date <span className="adv-required">*</span></label>
                    <input type="date" value={formData.advanceDate} required
                      onChange={e => setFormData({ ...formData, advanceDate: e.target.value })}
                      className="adv-form-input" />
                  </div>
                </div>

                {formData.employeeId && (
                  <div className="adv-salary-info">
                    <div className="adv-salary-row">
                      <span>Monthly Salary</span>
                      <strong>{Utils.formatCurrency(employeeSalary)}</strong>
                    </div>
                    <div className="adv-salary-row">
                      <span>Advance Amount</span>
                      <strong style={{ color: isExceedingSalary ? '#ef4444' : '#b45309' }}>
                        {Utils.formatCurrency(deductionAmount)}
                      </strong>
                    </div>
                    <div className="adv-salary-row">
                      <span>Net Salary After Deduction</span>
                      <strong style={{ color: netSalary < 0 ? '#ef4444' : '#047857' }}>
                        {Utils.formatCurrency(netSalary)}
                      </strong>
                    </div>
                    {netSalary < 0 && (
                      <div className="adv-warning-msg">
                        <AlertCircle size={14} /> Advance exceeds salary! Please reduce the amount.
                      </div>
                    )}
                  </div>
                )}

                <div className="adv-form-group">
                  <label>Deduction from Salary Month <span className="adv-required">*</span></label>
                  <input type="month" value={formData.deductionMonth} required
                    onChange={e => setFormData({ ...formData, deductionMonth: e.target.value })}
                    className="adv-form-input" />
                  <small className="adv-hint">Advance will be deducted from this month's salary</small>
                </div>

                <div className="adv-form-group">
                  <label>Reason</label>
                  <input type="text" value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Reason for advance" className="adv-form-input" />
                </div>

                <div className="adv-form-group">
                  <label>Notes</label>
                  <textarea value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes" rows="2" className="adv-form-textarea" />
                </div>

                <div className="adv-form-group">
                  <label>Approved By</label>
                  <input type="text" value={formData.approvedBy}
                    onChange={e => setFormData({ ...formData, approvedBy: e.target.value })}
                    placeholder="Approver name" className="adv-form-input" />
                </div>

                <div className="adv-form-actions">
                  <button type="submit" className="adv-btn adv-btn-primary"
                    disabled={loading || (deductionAmount > employeeSalary && employeeSalary > 0)}>
                    <Save size={14} /> {loading ? 'Saving...' : 'Issue Advance'}
                  </button>
                  <button type="button" className="adv-btn adv-btn-secondary"
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
  };

  const renderRepaymentFormModal = () => {
    if (!selectedAdvance) return null;
    return (
      <ModalPortal>
        <div className="adv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowRepaymentForm(false); resetRepaymentForm(); } }}>
          <div className="adv-modal" onClick={e => e.stopPropagation()}>
            <div className="adv-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <div className="adv-modal-header-left">
                <div className="adv-modal-icon"><Receipt size={18} /></div>
                <div>
                  <h3>Record Repayment</h3>
                  <p className="adv-modal-sub">{selectedAdvance.advanceNumber}</p>
                </div>
              </div>
              <button className="adv-modal-close" onClick={() => { setShowRepaymentForm(false); resetRepaymentForm(); }}>
                <X size={18} />
              </button>
            </div>
            <div className="adv-modal-body">
              <div className="adv-repayment-info">
                <div className="adv-repayment-row"><span>Advance</span><strong>{selectedAdvance.advanceNumber}</strong></div>
                <div className="adv-repayment-row"><span>Employee</span><strong>{selectedAdvance.employeeName}</strong></div>
                <div className="adv-repayment-row">
                  <span>Remaining Balance</span>
                  <strong style={{ color: '#b45309' }}>{Utils.formatCurrency(selectedAdvance.remainingBalance)}</strong>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); recordRepayment(selectedAdvance.id, repaymentForm); }}>
                <div className="adv-form-row">
                  <div className="adv-form-group">
                    <label>Payment Amount <span className="adv-required">*</span></label>
                    <input type="number" step="0.001" value={repaymentForm.amount} required
                      onChange={e => setRepaymentForm({ ...repaymentForm, amount: e.target.value })}
                      placeholder="0.000" max={selectedAdvance.remainingBalance}
                      className="adv-form-input" />
                    <small className="adv-hint">Max: {Utils.formatCurrency(selectedAdvance.remainingBalance)}</small>
                  </div>
                  <div className="adv-form-group">
                    <label>Payment Date <span className="adv-required">*</span></label>
                    <input type="date" value={repaymentForm.paymentDate} required
                      onChange={e => setRepaymentForm({ ...repaymentForm, paymentDate: e.target.value })}
                      className="adv-form-input" />
                  </div>
                </div>

                <div className="adv-form-row">
                  <div className="adv-form-group">
                    <label>Payment Method</label>
                    <select value={repaymentForm.paymentMethod}
                      onChange={e => setRepaymentForm({ ...repaymentForm, paymentMethod: e.target.value })}
                      className="adv-form-select">
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="salary_deduction">Salary Deduction</option>
                    </select>
                  </div>
                  <div className="adv-form-group">
                    <label>Reference Number</label>
                    <input type="text" value={repaymentForm.referenceNumber}
                      onChange={e => setRepaymentForm({ ...repaymentForm, referenceNumber: e.target.value })}
                      placeholder="Reference / Cheque #" className="adv-form-input" />
                  </div>
                </div>

                <div className="adv-form-group">
                  <label>Notes</label>
                  <input type="text" value={repaymentForm.notes}
                    onChange={e => setRepaymentForm({ ...repaymentForm, notes: e.target.value })}
                    placeholder="Additional notes" className="adv-form-input" />
                </div>

                <div className="adv-form-actions">
                  <button type="submit" className="adv-btn adv-btn-primary" disabled={loading}>
                    <Save size={14} /> {loading ? 'Processing...' : 'Record Payment'}
                  </button>
                  <button type="button" className="adv-btn adv-btn-secondary"
                    onClick={() => { setShowRepaymentForm(false); resetRepaymentForm(); }}>
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

  const renderTypeFormModal = () => (
    <ModalPortal>
      <div className="adv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowTypeForm(false); resetTypeForm(); } }}>
        <div className="adv-modal" onClick={e => e.stopPropagation()}>
          <div className="adv-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <div className="adv-modal-header-left">
              <div className="adv-modal-icon"><Tag size={18} /></div>
              <div>
                <h3>New Advance Type</h3>
                <p className="adv-modal-sub">Create a category for advances</p>
              </div>
            </div>
            <button className="adv-modal-close" onClick={() => { setShowTypeForm(false); resetTypeForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="adv-modal-body">
            <form onSubmit={(e) => { e.preventDefault(); createAdvanceType(typeForm); }}>
              <div className="adv-form-group">
                <label>Name <span className="adv-required">*</span></label>
                <input type="text" value={typeForm.name} required
                  onChange={e => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="Advance type name" className="adv-form-input" />
              </div>
              <div className="adv-form-group">
                <label>Description</label>
                <textarea value={typeForm.description}
                  onChange={e => setTypeForm({ ...typeForm, description: e.target.value })}
                  placeholder="Description" rows="2" className="adv-form-textarea" />
              </div>
              <div className="adv-form-group">
                <label>Max Amount (BD)</label>
                <input type="number" step="0.001" value={typeForm.maxAmount}
                  onChange={e => setTypeForm({ ...typeForm, maxAmount: e.target.value })}
                  placeholder="0.000" className="adv-form-input" />
              </div>
              <div className="adv-form-actions">
                <button type="submit" className="adv-btn adv-btn-primary" disabled={loading}>
                  <Save size={14} /> {loading ? 'Saving...' : 'Create'}
                </button>
                <button type="button" className="adv-btn adv-btn-secondary"
                  onClick={() => { setShowTypeForm(false); resetTypeForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );

  const renderDeductionModal = () => {
    const [month, setMonth] = useState(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const active = advances.filter(a => a.status === 'active');
    const totalDeduction = active.reduce((s, a) => s + (a.monthlyDeduction || 0), 0);

    return (
      <ModalPortal>
        <div className="adv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDeductionModal(false); }}>
          <div className="adv-modal" onClick={e => e.stopPropagation()}>
            <div className="adv-modal-header" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <div className="adv-modal-header-left">
                <div className="adv-modal-icon"><Zap size={18} /></div>
                <div>
                  <h3>Process Salary Deductions</h3>
                  <p className="adv-modal-sub">Auto-deduct from active advances</p>
                </div>
              </div>
              <button className="adv-modal-close" onClick={() => setShowDeductionModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="adv-modal-body">
              <div className="adv-form-group">
                <label>Select Month <span className="adv-required">*</span></label>
                <input type="month" value={month}
                  onChange={e => setMonth(e.target.value)} required
                  className="adv-form-input" />
              </div>

              <div className="adv-deduction-summary">
                <div className="adv-deduction-row">
                  <span>Active Advances</span>
                  <strong>{active.length}</strong>
                </div>
                <div className="adv-deduction-row">
                  <span>Total Monthly Deduction</span>
                  <strong style={{ color: '#b45309' }}>{Utils.formatCurrency(totalDeduction)}</strong>
                </div>
              </div>

              {active.length > 0 && (
                <div className="adv-deduction-list">
                  <h4>Advances to process:</h4>
                  {active.slice(0, 10).map(a => (
                    <div key={a.id} className="adv-deduction-item">
                      <span>{a.advanceNumber} — {a.employeeName}</span>
                      <span>{Utils.formatCurrency(a.monthlyDeduction)}</span>
                    </div>
                  ))}
                  {active.length > 10 && <div className="adv-empty-mini">+{active.length - 10} more…</div>}
                </div>
              )}

              <div className="adv-form-actions">
                <button className="adv-btn adv-btn-primary"
                  onClick={() => processDeductions(month)}
                  disabled={loading || !month || active.length === 0}>
                  <Zap size={14} /> {loading ? 'Processing...' : 'Process Deductions'}
                </button>
                <button className="adv-btn adv-btn-secondary" onClick={() => setShowDeductionModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  };

  const renderDetailModal = () => {
    if (!selectedAdvance) return null;
    const employeeSalary = getEmployeeSalary(selectedAdvance.employeeId);
    const netSalary = employeeSalary - (selectedAdvance.monthlyDeduction || 0);
    return (
      <ModalPortal>
        <div className="adv-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDetailModal(false); }}>
          <div className="adv-modal adv-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="adv-modal-header" style={{ background: 'linear-gradient(135deg, #0b1a12, #1f3a2c)' }}>
              <div className="adv-modal-header-left">
                <div className="adv-modal-icon"><FileText size={18} /></div>
                <div>
                  <h3>{selectedAdvance.advanceNumber}</h3>
                  <p className="adv-modal-sub">{selectedAdvance.employeeName}</p>
                </div>
              </div>
              <button className="adv-modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="adv-modal-body">
              <div className="adv-detail-grid-lg">
                <div className="adv-detail-section">
                  <h4>Basic Information</h4>
                  <div className="adv-detail-row"><span>Advance #</span><strong>{selectedAdvance.advanceNumber}</strong></div>
                  <div className="adv-detail-row"><span>Employee</span><strong>{selectedAdvance.employeeName}</strong></div>
                  <div className="adv-detail-row"><span>Type</span><strong>{selectedAdvance.advanceTypeName}</strong></div>
                  <div className="adv-detail-row"><span>Status</span>{getStatusBadge(selectedAdvance.status)}</div>
                  <div className="adv-detail-row"><span>Amount</span><strong>{Utils.formatCurrency(selectedAdvance.amount)}</strong></div>
                  <div className="adv-detail-row"><span>Date</span><strong>{Utils.formatDate(selectedAdvance.advanceDate)}</strong></div>
                </div>

                <div className="adv-detail-section">
                  <h4>Salary & Deduction</h4>
                  <div className="adv-detail-row"><span>Monthly Salary</span><strong>{Utils.formatCurrency(employeeSalary)}</strong></div>
                  <div className="adv-detail-row"><span>Deduction</span><strong style={{ color: '#b45309' }}>{Utils.formatCurrency(selectedAdvance.monthlyDeduction)}</strong></div>
                  <div className="adv-detail-row"><span>Net Salary</span><strong style={{ color: netSalary >= 0 ? '#047857' : '#b91c1c' }}>{Utils.formatCurrency(netSalary)}</strong></div>
                  <div className="adv-detail-row"><span>Deduction Month</span><strong>{selectedAdvance.deductionStartMonth || '—'}</strong></div>
                  <div className="adv-detail-row"><span>Balance</span><strong>{Utils.formatCurrency(selectedAdvance.remainingBalance)}</strong></div>
                  <div className="adv-detail-row"><span>Paid</span><strong>{Utils.formatCurrency(selectedAdvance.paidAmount)}</strong></div>
                </div>

                <div className="adv-detail-section full-width">
                  <h4>Additional Info</h4>
                  {selectedAdvance.reason && <div className="adv-detail-row"><span>Reason</span><strong>{selectedAdvance.reason}</strong></div>}
                  {selectedAdvance.notes && <div className="adv-detail-row"><span>Notes</span><strong>{selectedAdvance.notes}</strong></div>}
                  {selectedAdvance.approvedBy && <div className="adv-detail-row"><span>Approved By</span><strong>{selectedAdvance.approvedBy}</strong></div>}
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
    <div className={`adv-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="adv-ambient">
        <div className="adv-orb adv-orb-1" />
        <div className="adv-orb adv-orb-2" />
        <div className="adv-orb adv-orb-3" />
      </div>

      {/* Header */}
      <div className="adv-header">
        <div className="adv-header-left">
          <div className="adv-header-icon">
            <Wallet size={22} />
            <span className="adv-header-badge"><Sparkles size={10} /> ADVANCES</span>
          </div>
          <div>
            <h2>Employee Advance Management</h2>
            <p className="adv-header-subtitle">
              {summary?.totalAdvances || 0} advances · {Utils.formatCurrencyShort(summary?.totalAmount || 0)} issued · {summary?.collectionRate?.toFixed(0) || 0}% collected
            </p>
          </div>
        </div>
        <div className="adv-header-right">
          <button className="adv-btn adv-btn-ghost"
            onClick={() => { isDataLoaded.current = false; loadData(); }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="adv-btn adv-btn-primary"
            onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> New Advance
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="adv-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'advances', label: 'Advances', icon: FileText, badge: filteredAdvances.length },
          { id: 'repayments', label: 'Repayments', icon: Receipt, badge: repayments.length },
          { id: 'types', label: 'Advance Types', icon: Tag, badge: advanceTypes.length }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`adv-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => {
                setViewMode(t.id);
                if (t.id === 'repayments' && !isRepaymentsLoaded.current) {
                  if (selectedAdvanceId) loadRepaymentsForAdvance(selectedAdvanceId);
                  else loadAllRepayments();
                }
              }}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && <span className="adv-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {error && <div className="adv-message error"><AlertCircle size={15} /> {error}</div>}
      {success && <div className="adv-message success"><CheckCircle size={15} /> {success}</div>}

      {isLoading ? (
        <div className="adv-loading">
          <div className="adv-loading-spinner" />
          <span>Loading advances...</span>
        </div>
      ) : (
        <>
          {viewMode === 'overview' && renderOverviewTab()}
          {viewMode === 'advances' && renderAdvancesTab()}
          {viewMode === 'repayments' && renderRepaymentsTab()}
          {viewMode === 'types' && renderTypesTab()}
        </>
      )}

      {showForm && renderFormModal()}
      {showRepaymentForm && renderRepaymentFormModal()}
      {showTypeForm && renderTypeFormModal()}
      {showDeductionModal && renderDeductionModal()}
      {showDetailModal && renderDetailModal()}
    </div>
  );
};

export default AdvanceManagement;