// src/components/LoanManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, Search, Eye, Edit, Trash2, X, Save, RefreshCw, ChevronDown,
  ChevronUp, CheckCircle, AlertCircle, User, Calendar, Wallet,
   TrendingUp, FileText, Receipt, Settings, Zap, Users,
  CreditCard, Percent, Tag, Clock, Shield, Award, Building2,
  Phone, Mail, MapPin, UserCheck, UserX, LayoutDashboard, Briefcase,
  Timer, Activity, Gauge, Sparkles, Crown, Star, ArrowUpRight,
  ArrowDownRight, Info, HardHat, Layers, Box, Package, ChevronLeft,
  ChevronRight, ChevronsLeft, ChevronsRight, BarChart3, PieChart as PieChartIcon,
  LineChart as LineChartIcon, Flame, Target, Minus, Banknote,
  Trophy, Percent as PercentIcon, Landmark, PiggyBank, Calculator,
  ReceiptText, BadgeCheck, Scale, Hourglass, CalendarClock
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ComposedChart,
  Area, AreaChart, Line, RadialBarChart, RadialBar
} from 'recharts';
import Utils from '../utils/Utils';
import './LoanManagement.css';

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
const RingGauge = ({ value = 0, max = 100, size = 130, stroke = 10, color = '#009846', label, sublabel }) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const dash = circ * pct;
  const gap = circ - dash;
  return (
    <div className="loan-ring-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="rgba(148,163,184,0.18)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="loan-ring-center">
        <span className="loan-ring-value" style={{ color }}>{Math.round(pct * 100)}%</span>
        {label && <span className="loan-ring-label">{label}</span>}
        {sublabel && <span className="loan-ring-sublabel">{sublabel}</span>}
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
    <div className="loan-chart-tooltip">
      {label && <div className="loan-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="loan-chart-tooltip-row">
          <span className="loan-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="loan-chart-tooltip-name">{p.name}</span>
          <span className="loan-chart-tooltip-val">
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
const LoanManagement = ({ data, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('overview'); // overview | loans | repayments | types

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showRepaymentForm, setShowRepaymentForm] = useState(false);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);

  // Selection
  const [editingId, setEditingId] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedLoanId, setSelectedLoanId] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  // Data
  const [loans, setLoans] = useState([]);
  const [loanTypes, setLoanTypes] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [summary, setSummary] = useState(null);

  // Loading
  const [isLoading, setIsLoading] = useState(true);
  const [isRepaymentsLoading, setIsRepaymentsLoading] = useState(false);
  const isDataLoaded = React.useRef(false);
  const isRepaymentsLoaded = React.useRef(false);

  // Pagination — separate per list
  const [loanPage, setLoanPage] = useState(1);
  const [loanPer, setLoanPer] = useState(9);
  const [repPage, setRepPage] = useState(1);
  const [repPer, setRepPer] = useState(10);
  const [typePage, setTypePage] = useState(1);
  const [typePer, setTypePer] = useState(9);

  // Forms
  const [formData, setFormData] = useState({
    employeeId: '',
    loanTypeId: '',
    amount: '',
    loanDate: Utils.today(),
    tenureMonths: '6',
    interestRate: '0',
    purpose: '',
    notes: '',
    approvedBy: ''
  });

  const [repaymentForm, setRepaymentForm] = useState({
    amount: '',
    paymentDate: Utils.today(),
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: ''
  });

  const [typeForm, setTypeForm] = useState({
    name: '',
    description: '',
    maxAmount: '',
    interestRate: '0',
    defaultTenure: '6'
  });

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const cardDetails = {
    total: {
      title: 'Total Loans',
      details: [
        { label: 'Total Loans', value: summary?.totalLoans || 0 },
        { label: 'Active', value: summary?.activeLoans || 0 },
        { label: 'Completed', value: summary?.completedLoans || 0 },
        { label: 'Total Amount', value: Utils.formatCurrency(summary?.totalAmount || 0) }
      ]
    },
    active: {
      title: 'Active Loans',
      details: [
        { label: 'Active Loans', value: summary?.activeLoans || 0 },
        { label: 'Total Loans', value: summary?.totalLoans || 0 },
        { label: 'Remaining Balance', value: Utils.formatCurrency(summary?.totalBalance || 0) },
        { label: 'Collection Rate', value: `${summary?.collectionRate?.toFixed(1) || 0}%` }
      ]
    },
    completed: {
      title: 'Completed Loans',
      details: [
        { label: 'Completed', value: summary?.completedLoans || 0 },
        { label: 'Total Loans', value: summary?.totalLoans || 0 },
        { label: 'Completion Rate', value: summary?.totalLoans > 0 ? `${((summary.completedLoans / summary.totalLoans) * 100).toFixed(1)}%` : '0%' },
        { label: 'Collection Rate', value: `${summary?.collectionRate?.toFixed(1) || 0}%` }
      ]
    },
    amount: {
      title: 'Total Amount',
      details: [
        { label: 'Total Amount', value: Utils.formatCurrency(summary?.totalAmount || 0) },
        { label: 'Remaining Balance', value: Utils.formatCurrency(summary?.totalBalance || 0) },
        { label: 'Avg Loan', value: summary?.totalLoans > 0 ? Utils.formatCurrency(summary.totalAmount / summary.totalLoans) : '0.000' },
        { label: 'Collection Rate', value: `${summary?.collectionRate?.toFixed(1) || 0}%` }
      ]
    },
    balance: {
      title: 'Remaining Balance',
      details: [
        { label: 'Remaining Balance', value: Utils.formatCurrency(summary?.totalBalance || 0) },
        { label: 'Total Amount', value: Utils.formatCurrency(summary?.totalAmount || 0) },
        { label: 'Paid Amount', value: Utils.formatCurrency((summary?.totalAmount || 0) - (summary?.totalBalance || 0)) },
        { label: 'Active Loans', value: summary?.activeLoans || 0 }
      ]
    },
    rate: {
      title: 'Collection Rate',
      details: [
        { label: 'Collection Rate', value: `${summary?.collectionRate?.toFixed(1) || 0}%` },
        { label: 'Total Amount', value: Utils.formatCurrency(summary?.totalAmount || 0) },
        { label: 'Collected', value: Utils.formatCurrency((summary?.totalAmount || 0) - (summary?.totalBalance || 0)) },
        { label: 'Remaining', value: Utils.formatCurrency(summary?.totalBalance || 0) }
      ]
    }
  };

  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({ x: event.clientX + 15, y: event.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // LOAD DATA
  // ============================================
  const loadData = useCallback(async () => {
    if (isDataLoaded.current) return;
    setIsLoading(true);
    setError('');
    try {
      const [loansRes, typesRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/loans`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/loans/types`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/loans/summary`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : {})
      ]);

      setLoans(loansRes);
      setLoanTypes(typesRes);
      setSummary(summaryRes);
      isDataLoaded.current = true;
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadRepaymentsForLoan = useCallback(async (loanId) => {
    if (!loanId) return;
    setIsRepaymentsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/loans/${loanId}/repayments`, {
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        setRepayments(await response.json());
        isRepaymentsLoaded.current = true;
      } else {
        setRepayments([]);
      }
    } catch (err) {
      setError(err.message);
      setRepayments([]);
    } finally {
      setIsRepaymentsLoading(false);
    }
  }, []);

  const loadAllRepayments = useCallback(async () => {
    setIsRepaymentsLoading(true);
    try {
      const all = [];
      for (const loan of loans) {
        const r = await fetch(`${API_BASE_URL}/loans/${loan.id}/repayments`, {
          headers: { 'Accept': 'application/json' }
        });
        if (r.ok) all.push(...(await r.json()));
      }
      setRepayments(all);
      isRepaymentsLoaded.current = true;
    } catch (err) {
      setError(err.message);
      setRepayments([]);
    } finally {
      setIsRepaymentsLoading(false);
    }
  }, [loans]);

  const getEmployeeSalary = (employeeId) => {
    const worker = data.workers?.find(w => w.id === employeeId);
    if (!worker) return 0;
    return worker.monthly_salary || worker.salary || (worker.daily_rate * 26) || 0;
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const createLoan = async (formData) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/loans`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create loan');
      }
      const result = await response.json();
      setSuccess(`Loan ${result.loanNumber} created successfully!`);
      isDataLoaded.current = false;
      await loadData();
      setShowForm(false);
      resetForm();
      setTimeout(() => setSuccess(''), 5000);
      return result;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteLoan = async (id) => {
    if (!window.confirm('Delete this loan?')) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/loans/${id}`, { method: 'DELETE' });
      setSuccess('Loan deleted successfully!');
      isDataLoaded.current = false;
      await loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const recordRepayment = async (loanId, repaymentData) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/loans/${loanId}/repayments`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(repaymentData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record repayment');
      }
      setSuccess('Repayment recorded successfully!');
      isRepaymentsLoaded.current = false;
      await loadRepaymentsForLoan(loanId);
      setShowRepaymentForm(false);
      resetRepaymentForm();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createLoanType = async (typeData) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/loans/types`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(typeData)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create loan type');
      }
      setSuccess('Loan type created successfully!');
      isDataLoaded.current = false;
      await loadData();
      setShowTypeForm(false);
      resetTypeForm();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processDeductions = async (month) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/loans/deductions/process/${month}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process deductions');
      }
      const result = await response.json();
      setSuccess(`${result.message}`);
      isDataLoaded.current = false;
      await loadData();
      setShowDeductionModal(false);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RESET
  // ============================================
  const resetForm = () => {
    setFormData({
      employeeId: '',
      loanTypeId: '',
      amount: '',
      loanDate: Utils.today(),
      tenureMonths: '6',
      interestRate: '0',
      purpose: '',
      notes: '',
      approvedBy: ''
    });
    setEditingId(null);
  };

  const resetRepaymentForm = () => {
    setRepaymentForm({
      amount: '',
      paymentDate: Utils.today(),
      paymentMethod: 'cash',
      referenceNumber: '',
      notes: ''
    });
  };

  const resetTypeForm = () => {
    setTypeForm({
      name: '',
      description: '',
      maxAmount: '',
      interestRate: '0',
      defaultTenure: '6'
    });
    setEditingId(null);
  };

  // ============================================
  // BADGES
  // ============================================
  const getStatusBadge = (status) => {
    const config = {
      active: { label: 'Active', icon: CheckCircle },
      completed: { label: 'Completed', icon: CheckCircle },
      cancelled: { label: 'Cancelled', icon: X },
      pending: { label: 'Pending', icon: Clock }
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`loan-status ${status}`}>
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
      <span className={`loan-payment-method ${method}`}>
        <Icon size={11} /> {c.label}
      </span>
    );
  };

  const toggleExpand = (id) => setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));

  // ============================================
  // FILTER + PAGINATION
  // ============================================
  const filteredLoans = useMemo(() => {
    let filtered = loans;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(l =>
        l.employeeName?.toLowerCase().includes(s) ||
        l.loanNumber?.toLowerCase().includes(s) ||
        l.purpose?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== 'all') filtered = filtered.filter(l => l.status === statusFilter);
    if (employeeFilter !== 'all') filtered = filtered.filter(l => l.employeeId === employeeFilter);
    return filtered;
  }, [loans, searchTerm, statusFilter, employeeFilter]);

  const paginate = (list, page, per) => {
    const total = Math.max(1, Math.ceil(list.length / per));
    const p = Math.max(1, Math.min(page, total));
    const start = (p - 1) * per;
    return { total, page: p, items: list.slice(start, start + per) };
  };

  const getPageNumbers = (current, total) => {
    const pages = [];
    const max = 5;
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
      <div className="loan-pagination">
        <div className="loan-pagination-info">
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{count}</strong> {label}
        </div>
        <div className="loan-pagination-controls">
          <div className="loan-pagination-items">
            <span>Show:</span>
            <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }} className="loan-pagination-select">
              {[6, 9, 10, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="loan-pagination-buttons">
            <button className="loan-page-btn" onClick={() => setPage(1)} disabled={current === 1}><ChevronsLeft size={13} /></button>
            <button className="loan-page-btn" onClick={() => setPage(current - 1)} disabled={current === 1}><ChevronLeft size={13} /></button>
            {getPageNumbers(current, total).map(p => (
              <button key={p} className={`loan-page-btn ${p === current ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="loan-page-btn" onClick={() => setPage(current + 1)} disabled={current === total}><ChevronRight size={13} /></button>
            <button className="loan-page-btn" onClick={() => setPage(total)} disabled={current === total}><ChevronsRight size={13} /></button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => { setLoanPage(1); }, [searchTerm, statusFilter, employeeFilter, loanPer, viewMode]);
  useEffect(() => { setRepPage(1); }, [repPer, viewMode]);
  useEffect(() => { setTypePage(1); }, [typePer, viewMode]);

  // ============================================
  // CHART DATA
  // ============================================
  const statusChartData = useMemo(() => {
    const active = loans.filter(l => l.status === 'active').length;
    const completed = loans.filter(l => l.status === 'completed').length;
    const cancelled = loans.filter(l => l.status === 'cancelled').length;
    const pending = loans.filter(l => l.status === 'pending').length;
    return [
      { name: 'Active', value: active, color: '#009846' },
      { name: 'Completed', value: completed, color: '#3b82f6' },
      { name: 'Cancelled', value: cancelled, color: '#94a3b8' },
      { name: 'Pending', value: pending, color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [loans]);

  const monthlyTrendData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      const monthLoans = loans.filter(l => l.loanDate && l.loanDate.startsWith(key));
      const issued = monthLoans.reduce((s, l) => s + (l.amount || 0), 0);
      const paid = monthLoans.reduce((s, l) => s + (l.paidAmount || 0), 0);
      months.push({ label, issued, paid, count: monthLoans.length });
    }
    return months;
  }, [loans]);

  const topEmployeesData = useMemo(() => {
    const map = {};
    loans.forEach(l => {
      const key = l.employeeName || 'Unknown';
      if (!map[key]) map[key] = { name: key, total: 0, count: 0 };
      map[key].total += (l.amount || 0);
      map[key].count += 1;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map(e => ({
        name: e.name.length > 14 ? e.name.slice(0, 14) + '…' : e.name,
        value: e.total,
        count: e.count
      }));
  }, [loans]);

  const paymentMethodData = useMemo(() => {
    const map = { cash: 0, bank_transfer: 0, cheque: 0, salary_deduction: 0 };
    repayments.forEach(r => {
      if (map[r.paymentMethod] !== undefined) map[r.paymentMethod] += (r.amount || 0);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return [
      { key: 'cash', label: 'Cash', value: map.cash, pct: (map.cash / total) * 100, color: '#009846' },
      { key: 'bank_transfer', label: 'Bank', value: map.bank_transfer, pct: (map.bank_transfer / total) * 100, color: '#3b82f6' },
      { key: 'cheque', label: 'Cheque', value: map.cheque, pct: (map.cheque / total) * 100, color: '#8b5cf6' },
      { key: 'salary_deduction', label: 'Salary', value: map.salary_deduction, pct: (map.salary_deduction / total) * 100, color: '#f59e0b' }
    ];
  }, [repayments]);

  // Loan Type Distribution Chart Data
  const loanTypeDistribution = useMemo(() => {
    const map = {};
    loans.forEach(l => {
      const key = l.loanTypeName || 'Other';
      if (!map[key]) map[key] = { name: key, value: 0, count: 0 };
      map[key].value += (l.amount || 0);
      map[key].count += 1;
    });
    const colors = ['#009846', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
    return Object.values(map).map((item, i) => ({
      ...item,
      color: colors[i % colors.length]
    }));
  }, [loans]);

  // Tenure Distribution
  const tenureDistribution = useMemo(() => {
    const map = {};
    loans.forEach(l => {
      const tenure = l.tenureMonths || 6;
      const key = `${tenure} months`;
      if (!map[key]) map[key] = { name: key, value: 0, count: 0 };
      map[key].value += (l.amount || 0);
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [loans]);

  // ============================================
  // KPI ITEMS
  // ============================================
  const kpiItems = [
    {
      id: 'total', icon: FileText, label: 'Total Loans',
      value: summary?.totalLoans || 0,
      meta: `${summary?.activeLoans || 0} active`,
      color: '#3b82f6', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up'
    },
    {
      id: 'active', icon: CheckCircle, label: 'Active Loans',
      value: summary?.activeLoans || 0,
      meta: `${summary?.totalLoans ? ((summary.activeLoans / summary.totalLoans) * 100).toFixed(0) : 0}% of total`,
      color: '#009846', accent: 'linear-gradient(90deg,#009846,#34d399)', trend: 'up'
    },
    {
      id: 'completed', icon: BadgeCheck, label: 'Completed',
      value: summary?.completedLoans || 0,
      meta: `${summary?.totalLoans ? ((summary.completedLoans / summary.totalLoans) * 100).toFixed(0) : 0}% completion`,
      color: '#8b5cf6', accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)', trend: 'up'
    },
    {
      id: 'amount', icon: Banknote, label: 'Total Amount',
      value: Utils.formatCurrencyShort(summary?.totalAmount || 0),
      meta: `${summary?.totalLoans || 0} loans`,
      color: '#f59e0b', accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)', trend: 'up'
    },
    {
      id: 'balance', icon: Wallet, label: 'Remaining Balance',
      value: Utils.formatCurrencyShort(summary?.totalBalance || 0),
      meta: `Paid: ${Utils.formatCurrencyShort((summary?.totalAmount || 0) - (summary?.totalBalance || 0))}`,
      color: '#ef4444', accent: 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: (summary?.totalBalance || 0) > 0 ? 'down' : 'flat'
    },
    {
      id: 'rate', icon: TrendingUp, label: 'Collection Rate',
      value: `${summary?.collectionRate?.toFixed(1) || 0}%`,
      meta: `Collected: ${Utils.formatCurrencyShort((summary?.totalAmount || 0) - (summary?.totalBalance || 0))}`,
      color: '#009846', accent: 'linear-gradient(90deg,#009846,#34d399)', trend: 'up'
    }
  ];

  // ============================================
  // OVERVIEW TAB
  // ============================================
  const renderOverviewTab = () => (
    <div className="loan-view">
      {/* KPI Cards */}
      <div className="loan-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="loan-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="loan-kpi-accent" style={{ background: item.accent }} />
              <div className="loan-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="loan-kpi-content">
                <span className="loan-kpi-label">{item.label}</span>
                <span className="loan-kpi-value">{item.value}</span>
                <span className="loan-kpi-meta">{item.meta}</span>
              </div>
              <div className={`loan-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={15} />}
                {item.trend === 'down' && <ArrowDownRight size={15} />}
                {item.trend === 'flat' && <Minus size={15} />}
              </div>
            </div>
          );
        })}
      </div>

      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="loan-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="loan-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="loan-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="loan-tooltip-row">
                <span className="loan-tooltip-label">{d.label}</span>
                <span className="loan-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 1 — Percentage Ring Gauges */}
      <div className="loan-card">
        <div className="loan-card-header">
          <div className="loan-card-title">
            <span className="loan-card-icon" style={{ background: 'rgba(0,152,70,0.12)', color: '#009846' }}>
              <PercentIcon size={16} />
            </span>
            <div>
              <h4>Key Performance Rates</h4>
              <span>Live percentages from current loan data</span>
            </div>
          </div>
        </div>
        <div className="loan-rings-row">
          <RingGauge
            value={summary?.collectionRate || 0} max={100} size={140} stroke={11}
            color="#009846" label="COLLECTION" sublabel="of total amount" />
          <RingGauge
            value={summary?.totalLoans ? ((summary.completedLoans || 0) / summary.totalLoans) * 100 : 0}
            max={100} size={140} stroke={11} color="#3b82f6" label="COMPLETION" sublabel="loans completed" />
          <RingGauge
            value={summary?.totalLoans ? ((summary.activeLoans || 0) / summary.totalLoans) * 100 : 0}
            max={100} size={140} stroke={11} color="#8b5cf6" label="ACTIVE" sublabel="loans active" />
          <RingGauge
            value={summary?.totalAmount ? (((summary.totalAmount - (summary.totalBalance || 0)) / summary.totalAmount) * 100) : 0}
            max={100} size={140} stroke={11} color="#f59e0b" label="PAID" sublabel="amount paid" />
          <RingGauge
            value={summary?.totalAmount ? ((summary.totalBalance || 0) / summary.totalAmount) * 100 : 0}
            max={100} size={140} stroke={11} color="#ef4444" label="OUTSTANDING" sublabel="remaining balance" />
        </div>
        <div className="loan-rings-legend">
          <span><i style={{ background: '#009846' }} />Collection Rate</span>
          <span><i style={{ background: '#3b82f6' }} />Completion Rate</span>
          <span><i style={{ background: '#8b5cf6' }} />Active Rate</span>
          <span><i style={{ background: '#f59e0b' }} />Paid Amount</span>
          <span><i style={{ background: '#ef4444' }} />Outstanding</span>
        </div>
      </div>

      {/* Row 2 — Status Donut + Payment Method Rings */}
      <div className="loan-grid-1-1">
        <div className="loan-card">
          <div className="loan-card-header">
            <div className="loan-card-title">
              <span className="loan-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Loans by Status</h4>
                <span>{loans.length} total loans</span>
              </div>
            </div>
          </div>
          {statusChartData.length > 0 ? (
            <div className="loan-donut-wrap">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={statusChartData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                    {statusChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <ReTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="loan-donut-legend">
                {statusChartData.map((d, i) => (
                  <div key={i} className="loan-donut-item">
                    <span className="loan-donut-dot" style={{ background: d.color }} />
                    <span className="loan-donut-name">{d.name}</span>
                    <span className="loan-donut-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="loan-empty-mini">No loans yet</div>}
        </div>

        <div className="loan-card">
          <div className="loan-card-header">
            <div className="loan-card-title">
              <span className="loan-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <CreditCard size={16} />
              </span>
              <div>
                <h4>Repayments by Method</h4>
                <span>Distribution percentage</span>
              </div>
            </div>
          </div>
          <div className="loan-method-rings">
            {paymentMethodData.map((m, i) => (
              <div key={i} className="loan-method-item">
                <RingGauge value={m.pct} max={100} size={100} stroke={8} color={m.color} label={m.label} />
                <span className="loan-method-value">{Utils.formatCurrencyShort(m.value)}</span>
                <span className="loan-method-pct">{m.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 — 12-Month Trend */}
      <div className="loan-card">
        <div className="loan-card-header">
          <div className="loan-card-title">
            <span className="loan-card-icon" style={{ background: 'rgba(0,152,70,0.12)', color: '#009846' }}>
              <LineChartIcon size={16} />
            </span>
            <div>
              <h4>12-Month Loan Trend</h4>
              <span>Issued vs Paid by month</span>
            </div>
          </div>
          <div className="loan-legend">
            <span><i style={{ background: '#3b82f6' }} />Issued</span>
            <span><i style={{ background: '#009846' }} />Paid</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={monthlyTrendData}>
            <defs>
              <linearGradient id="loanIssuedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="loanPaidGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#009846" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#009846" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
              tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
            <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
            <Area type="monotone" dataKey="issued" stroke="#3b82f6" strokeWidth={2.5}
              fill="url(#loanIssuedGrad)" name="Issued" />
            <Area type="monotone" dataKey="paid" stroke="#009846" strokeWidth={2.5}
              fill="url(#loanPaidGrad)" name="Paid" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Row 4 — Loan Type Distribution + Tenure Distribution */}
      <div className="loan-grid-1-1">
        <div className="loan-card">
          <div className="loan-card-header">
            <div className="loan-card-title">
              <span className="loan-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Tag size={16} />
              </span>
              <div>
                <h4>Loans by Type</h4>
                <span>Distribution by loan type</span>
              </div>
            </div>
          </div>
          {loanTypeDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={loanTypeDistribution} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} stroke="none">
                  {loanTypeDistribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="loan-empty-mini">No data available</div>}
          <div className="loan-donut-legend" style={{ marginTop: 12 }}>
            {loanTypeDistribution.map((d, i) => (
              <div key={i} className="loan-donut-item">
                <span className="loan-donut-dot" style={{ background: d.color }} />
                <span className="loan-donut-name">{d.name}</span>
                <span className="loan-donut-val">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="loan-card">
          <div className="loan-card-header">
            <div className="loan-card-title">
              <span className="loan-card-icon" style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4' }}>
                <Hourglass size={16} />
              </span>
              <div>
                <h4>Loans by Tenure</h4>
                <span>Distribution by loan duration</span>
              </div>
            </div>
          </div>
          {tenureDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={tenureDistribution} layout="vertical" margin={{ left: 10, right: 20 }}>
                <defs>
                  <linearGradient id="loanTenureGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11}
                  tickLine={false} axisLine={false} width={80} />
                <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" name="Amount" fill="url(#loanTenureGrad)" radius={[0, 8, 8, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="loan-empty-mini">No data available</div>}
        </div>
      </div>

      {/* Row 5 — Top Employees */}
      {topEmployeesData.length > 0 && (
        <div className="loan-card">
          <div className="loan-card-header">
            <div className="loan-card-title">
              <span className="loan-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Trophy size={16} />
              </span>
              <div>
                <h4>Top Employees by Loan Amount</h4>
                <span>Highest total loan amounts</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topEmployeesData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <defs>
                <linearGradient id="loanTopGrad" x1="0" y1="0" x2="1" y2="0">
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
              <Bar dataKey="value" name="Amount" fill="url(#loanTopGrad)" radius={[0, 8, 8, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  // ============================================
  // LOANS TAB
  // ============================================
  const renderLoansTab = () => {
    const { total, page, items } = paginate(filteredLoans, loanPage, loanPer);
    if (page !== loanPage) setLoanPage(page);
    return (
      <div className="loan-view">
        <div className="loan-filters">
          <div className="loan-search">
            <Search size={15} className="loan-search-icon" />
            <input type="text" placeholder="Search by employee, loan #, or purpose..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button className="loan-search-clear" onClick={() => setSearchTerm('')}>
                <X size={13} />
              </button>
            )}
          </div>
          <div className="loan-filter-group">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="loan-select">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
            </select>
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="loan-select">
              <option value="all">All Employees</option>
              {data.workers?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <span className="loan-result-count">
            {filteredLoans.length} of {loans.length}
          </span>
          <button className="loan-btn loan-btn-secondary"
            onClick={() => { resetTypeForm(); setShowTypeForm(true); }}>
            <Tag size={13} /> Loan Type
          </button>
          <button className="loan-btn loan-btn-amber" onClick={() => setShowDeductionModal(true)}>
            <Zap size={13} /> Process Deductions
          </button>
          <button className="loan-btn loan-btn-primary"
            onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={13} /> New Loan
          </button>
        </div>

        {filteredLoans.length === 0 ? (
          <div className="loan-empty">
            <div className="loan-empty-icon"><FileText size={40} /></div>
            <h3>No Loans Found</h3>
            <p>Issue a new loan to an employee to get started.</p>
            <button className="loan-btn loan-btn-primary"
              onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={14} /> Issue Loan
            </button>
          </div>
        ) : (
          <>
            <div className="loan-cards-grid">
              {items.map((loan, index) => {
                const isExpanded = expandedItems[loan.id];
                const progress = loan.progress || 0;
                const employeeSalary = getEmployeeSalary(loan.employeeId);
                const netSalary = employeeSalary - (loan.monthlyInstallment || 0);
                return (
                  <div key={loan.id} className="loan-card-item"
                    style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
                    <div className="loan-card-accent" style={{
                      background: loan.status === 'active'
                        ? 'linear-gradient(90deg,#009846,#34d399)'
                        : loan.status === 'completed'
                        ? 'linear-gradient(90deg,#3b82f6,#60a5fa)'
                        : loan.status === 'cancelled'
                        ? 'linear-gradient(90deg,#94a3b8,#cbd5e1)'
                        : 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                    }} />

                    <div className="loan-card-head">
                      <div className="loan-head-left">
                        <div className="loan-number">
                          <Landmark size={11} />
                          {loan.loanNumber}
                        </div>
                        <div className="loan-employee">
                          <User size={12} /> {loan.employeeName}
                        </div>
                        <div className="loan-type-tag">{loan.loanTypeName}</div>
                      </div>
                      <div className="loan-head-right">
                        {getStatusBadge(loan.status)}
                        <div className="loan-amount">
                          {Utils.formatCurrency(loan.amount)}
                        </div>
                      </div>
                    </div>

                    <div className="loan-body">
                      <div className="loan-detail-grid">
                        <div className="loan-detail">
                          <span className="loan-detail-label">Balance</span>
                          <span className="loan-detail-value loan-td-amber">
                            {Utils.formatCurrencyShort(loan.remainingBalance)}
                          </span>
                        </div>
                        <div className="loan-detail">
                          <span className="loan-detail-label">Paid</span>
                          <span className="loan-detail-value loan-td-green">
                            {Utils.formatCurrencyShort(loan.paidAmount)}
                          </span>
                        </div>
                        <div className="loan-detail">
                          <span className="loan-detail-label">Installment</span>
                          <span className="loan-detail-value">
                            {Utils.formatCurrencyShort(loan.monthlyInstallment)}
                          </span>
                        </div>
                        <div className="loan-detail">
                          <span className="loan-detail-label">Net Salary</span>
                          <span className={`loan-detail-value ${netSalary < 0 ? 'loan-td-red' : 'loan-td-green'}`}>
                            {Utils.formatCurrencyShort(netSalary)}
                          </span>
                        </div>
                      </div>

                      <div className="loan-progress-section">
                        <div className="loan-progress-header">
                          <span className="loan-progress-label">Repayment</span>
                          <span className="loan-progress-value">{progress.toFixed(1)}%</span>
                        </div>
                        <div className="loan-progress-bar">
                          <div className="loan-progress-fill"
                            style={{
                              width: `${Math.min(progress, 100)}%`,
                              background: progress >= 75 ? 'linear-gradient(90deg,#009846,#34d399)'
                                : progress >= 50 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                                : 'linear-gradient(90deg,#ef4444,#f87171)'
                            }} />
                        </div>
                      </div>

                      {loan.purpose && (
                        <div className="loan-reason">
                          <FileText size={11} /> {loan.purpose}
                        </div>
                      )}
                    </div>

                    <div className="loan-card-foot">
                      <div className="loan-actions">
                        <button className="loan-icon-btn" title="View"
                          onClick={() => { setSelectedLoan(loan); setShowDetailModal(true); }}>
                          <Eye size={13} />
                        </button>
                        {loan.status === 'active' && (
                          <button className="loan-icon-btn loan-icon-record" title="Record Payment"
                            onClick={() => { setSelectedLoan(loan); resetRepaymentForm(); setShowRepaymentForm(true); }}>
                            <Receipt size={13} />
                          </button>
                        )}
                        <button className="loan-icon-btn loan-icon-history" title="History"
                          onClick={() => {
                            setSelectedLoan(loan); setSelectedLoanId(loan.id);
                            setViewMode('repayments'); loadRepaymentsForLoan(loan.id);
                          }}>
                          <FileText size={13} />
                        </button>
                        <button className="loan-icon-btn loan-icon-danger" title="Delete"
                          onClick={() => deleteLoan(loan.id)}>
                          <Trash2 size={13} />
                        </button>
                        <button className="loan-icon-btn loan-icon-expand"
                          onClick={() => toggleExpand(loan.id)}>
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="loan-expanded">
                        <div className="loan-expanded-grid">
                          <div><strong>Employee:</strong> {loan.employeeName}</div>
                          <div><strong>Loan Type:</strong> {loan.loanTypeName}</div>
                          <div><strong>Amount:</strong> {Utils.formatCurrency(loan.amount)}</div>
                          <div><strong>Monthly Salary:</strong> {Utils.formatCurrency(employeeSalary)}</div>
                          <div><strong>Interest Rate:</strong> {loan.interestRate || 0}%</div>
                          <div><strong>Tenure:</strong> {loan.tenureMonths} months</div>
                          <div><strong>Monthly Installment:</strong> {Utils.formatCurrency(loan.monthlyInstallment)}</div>
                          <div><strong>Approved By:</strong> {loan.approvedBy || 'N/A'}</div>
                          <div><strong>Approved Date:</strong> {loan.approvedDate ? Utils.formatDate(loan.approvedDate) : 'N/A'}</div>
                          <div><strong>Created:</strong> {loan.createdAt ? Utils.formatDate(loan.createdAt) : '—'}</div>
                        </div>
                        {loan.notes && (
                          <div className="loan-expanded-notes">
                            <strong>Notes:</strong> {loan.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {renderPagination(loanPage, total, loanPer, setLoanPer, setLoanPage, filteredLoans.length, 'loans')}
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
      <div className="loan-view">
        <div className="loan-filters">
          <select value={selectedLoanId}
            onChange={(e) => {
              setSelectedLoanId(e.target.value);
              const loan = loans.find(l => l.id === e.target.value);
              setSelectedLoan(loan);
              if (e.target.value) loadRepaymentsForLoan(e.target.value);
              else loadAllRepayments();
            }}
            className="loan-select">
            <option value="">All Loans</option>
            {loans.map(l => (
              <option key={l.id} value={l.id}>
                {l.loanNumber} — {l.employeeName}
              </option>
            ))}
          </select>
          <span className="loan-result-count">{repayments.length} repayments</span>
          <button className="loan-btn loan-btn-ghost"
            onClick={() => { setViewMode('loans'); setRepayments([]); isRepaymentsLoaded.current = false; }}>
            <ChevronLeft size={13} /> Back to Loans
          </button>
        </div>

        {isRepaymentsLoading ? (
          <div className="loan-loading">
            <div className="loan-loading-spinner" />
            <span>Loading repayments...</span>
          </div>
        ) : repayments.length === 0 ? (
          <div className="loan-empty">
            <div className="loan-empty-icon"><Receipt size={40} /></div>
            <h3>No Repayments</h3>
            <p>No repayments recorded for the selected loan.</p>
          </div>
        ) : (
          <>
            <div className="loan-table-wrap">
              <table className="loan-table">
                <thead>
                  <tr>
                    <th>Loan #</th>
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
                    const loan = loans.find(l => l.id === repayment.loanId);
                    return (
                      <tr key={repayment.id} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                        <td><strong>{loan?.loanNumber || 'N/A'}</strong></td>
                        <td>{loan?.employeeName || 'Unknown'}</td>
                        <td>{Utils.formatDate(repayment.paymentDate)}</td>
                        <td className="right loan-td-green">
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
    const { total, page, items } = paginate(loanTypes, typePage, typePer);
    if (page !== typePage) setTypePage(page);
    return (
      <div className="loan-view">
        <div className="loan-filters">
          <span className="loan-result-count" style={{ marginLeft: 0 }}>
            {loanTypes.length} types
          </span>
          <button className="loan-btn loan-btn-primary" style={{ marginLeft: 'auto' }}
            onClick={() => { resetTypeForm(); setShowTypeForm(true); }}>
            <Plus size={13} /> Add Loan Type
          </button>
        </div>

        {loanTypes.length === 0 ? (
          <div className="loan-empty">
            <div className="loan-empty-icon"><Tag size={40} /></div>
            <h3>No Loan Types</h3>
            <p>Add loan types to categorize loans.</p>
          </div>
        ) : (
          <>
            <div className="loan-types-grid">
              {items.map((type, i) => (
                <div key={type.id} className="loan-type-card" style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
                  <div className="loan-type-head">
                    <div className="loan-type-icon"><Tag size={16} /></div>
                    <div className="loan-type-name">{type.name}</div>
                    <span className={`loan-type-status ${type.isActive ? 'active' : 'inactive'}`}>
                      {type.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="loan-type-body">
                    {type.description && <div className="loan-type-desc">{type.description}</div>}
                    <div className="loan-type-meta">
                      <span className="loan-detail-label">Max Amount</span>
                      <span className="loan-detail-value">{Utils.formatCurrency(type.maxAmount)}</span>
                    </div>
                    <div className="loan-type-meta">
                      <span className="loan-detail-label">Interest Rate</span>
                      <span className="loan-detail-value">{type.interestRate || 0}%</span>
                    </div>
                    <div className="loan-type-meta">
                      <span className="loan-detail-label">Default Tenure</span>
                      <span className="loan-detail-value">{type.defaultTenure || 6} months</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {renderPagination(typePage, total, typePer, setTypePer, setTypePage, loanTypes.length, 'types')}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // MODALS
  // ============================================
  const renderFormModal = () => {
    const selectedEmployee = data.workers?.find(w => w.id === formData.employeeId);
    const employeeSalary = selectedEmployee ? getEmployeeSalary(selectedEmployee.id) : 0;
    const amount = parseFloat(formData.amount) || 0;
    const tenure = parseInt(formData.tenureMonths) || 6;
    const interest = parseFloat(formData.interestRate) || 0;
    const monthlyInstallment = tenure > 0 ? (amount + (amount * interest / 100)) / tenure : 0;
    const netSalary = employeeSalary - monthlyInstallment;
    const isExceedingSalary = monthlyInstallment > employeeSalary;

    return (
      <ModalPortal>
        <div className="loan-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); resetForm(); } }}>
          <div className="loan-modal" onClick={e => e.stopPropagation()}>
            <div className="loan-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
              <div className="loan-modal-header-left">
                <div className="loan-modal-icon"><Landmark size={18} /></div>
                <div>
                  <h3>New Loan</h3>
                  <p className="loan-modal-sub">Issue a loan with salary deduction</p>
                </div>
              </div>
              <button className="loan-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
                <X size={18} />
              </button>
            </div>
            <div className="loan-modal-body">
              <form onSubmit={(e) => { e.preventDefault(); createLoan(formData); }}>
                <div className="loan-form-row">
                  <div className="loan-form-group">
                    <label><User size={12} /> Employee <span className="loan-required">*</span></label>
                    <select value={formData.employeeId} required
                      onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                      className="loan-form-select">
                      <option value="">Select Employee</option>
                      {data.workers?.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} — {Utils.formatCurrency(getEmployeeSalary(w.id))}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="loan-form-group">
                    <label><Tag size={12} /> Loan Type <span className="loan-required">*</span></label>
                    <select value={formData.loanTypeId} required
                      onChange={e => {
                        const type = loanTypes.find(t => t.id === e.target.value);
                        setFormData({
                          ...formData,
                          loanTypeId: e.target.value,
                          interestRate: type?.interestRate?.toString() || '0',
                          tenureMonths: type?.defaultTenure?.toString() || '6'
                        });
                      }}
                      className="loan-form-select">
                      <option value="">Select Type</option>
                      {loanTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="loan-form-row">
                  <div className="loan-form-group">
                    <label><Banknote size={12} /> Loan Amount (BD) <span className="loan-required">*</span></label>
                    <input type="number" step="0.001" value={formData.amount} required
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.000" max={employeeSalary * 2}
                      className="loan-form-input" />
                  </div>
                  <div className="loan-form-group">
                    <label><Calendar size={12} /> Loan Date <span className="loan-required">*</span></label>
                    <input type="date" value={formData.loanDate} required
                      onChange={e => setFormData({ ...formData, loanDate: e.target.value })}
                      className="loan-form-input" />
                  </div>
                </div>

                <div className="loan-form-row">
                  <div className="loan-form-group">
                    <label><Timer size={12} /> Tenure (months) <span className="loan-required">*</span></label>
                    <input type="number" value={formData.tenureMonths} required
                      onChange={e => setFormData({ ...formData, tenureMonths: e.target.value })}
                      placeholder="6" className="loan-form-input" />
                  </div>
                  <div className="loan-form-group">
                    <label><Percent size={12} /> Interest Rate (%)</label>
                    <input type="number" step="0.01" value={formData.interestRate}
                      onChange={e => setFormData({ ...formData, interestRate: e.target.value })}
                      placeholder="0" className="loan-form-input" />
                  </div>
                </div>

                {formData.employeeId && amount > 0 && (
                  <div className="loan-salary-info">
                    <div className="loan-salary-row">
                      <span>Monthly Salary</span>
                      <strong>{Utils.formatCurrency(employeeSalary)}</strong>
                    </div>
                    <div className="loan-salary-row">
                      <span>Monthly Installment</span>
                      <strong style={{ color: isExceedingSalary ? '#ef4444' : '#b45309' }}>
                        {Utils.formatCurrency(monthlyInstallment)}
                      </strong>
                    </div>
                    <div className="loan-salary-row">
                      <span>Net Salary After Deduction</span>
                      <strong style={{ color: netSalary < 0 ? '#ef4444' : '#047857' }}>
                        {Utils.formatCurrency(netSalary)}
                      </strong>
                    </div>
                    {isExceedingSalary && (
                      <div className="loan-warning-msg">
                        <AlertCircle size={14} /> Installment exceeds monthly salary! Please reduce the amount.
                      </div>
                    )}
                  </div>
                )}

                <div className="loan-form-group">
                  <label><FileText size={12} /> Purpose</label>
                  <input type="text" value={formData.purpose}
                    onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="Purpose of loan" className="loan-form-input" />
                </div>

                <div className="loan-form-group">
                  <label><FileText size={12} /> Notes</label>
                  <textarea value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes" rows="2" className="loan-form-textarea" />
                </div>

                <div className="loan-form-group">
                  <label><UserCheck size={12} /> Approved By</label>
                  <input type="text" value={formData.approvedBy}
                    onChange={e => setFormData({ ...formData, approvedBy: e.target.value })}
                    placeholder="Approver name" className="loan-form-input" />
                </div>

                <div className="loan-form-actions">
                  <button type="submit" className="loan-btn loan-btn-primary"
                    disabled={loading || (monthlyInstallment > employeeSalary && employeeSalary > 0)}>
                    <Save size={14} /> {loading ? 'Saving...' : 'Issue Loan'}
                  </button>
                  <button type="button" className="loan-btn loan-btn-secondary"
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
    if (!selectedLoan) return null;
    return (
      <ModalPortal>
        <div className="loan-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowRepaymentForm(false); resetRepaymentForm(); } }}>
          <div className="loan-modal" onClick={e => e.stopPropagation()}>
            <div className="loan-modal-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <div className="loan-modal-header-left">
                <div className="loan-modal-icon"><Receipt size={18} /></div>
                <div>
                  <h3>Record Repayment</h3>
                  <p className="loan-modal-sub">{selectedLoan.loanNumber}</p>
                </div>
              </div>
              <button className="loan-modal-close" onClick={() => { setShowRepaymentForm(false); resetRepaymentForm(); }}>
                <X size={18} />
              </button>
            </div>
            <div className="loan-modal-body">
              <div className="loan-repayment-info">
                <div className="loan-repayment-row"><span>Loan</span><strong>{selectedLoan.loanNumber}</strong></div>
                <div className="loan-repayment-row"><span>Employee</span><strong>{selectedLoan.employeeName}</strong></div>
                <div className="loan-repayment-row">
                  <span>Remaining Balance</span>
                  <strong style={{ color: '#b45309' }}>{Utils.formatCurrency(selectedLoan.remainingBalance)}</strong>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); recordRepayment(selectedLoan.id, repaymentForm); }}>
                <div className="loan-form-row">
                  <div className="loan-form-group">
                    <label>Payment Amount <span className="loan-required">*</span></label>
                    <input type="number" step="0.001" value={repaymentForm.amount} required
                      onChange={e => setRepaymentForm({ ...repaymentForm, amount: e.target.value })}
                      placeholder="0.000" max={selectedLoan.remainingBalance}
                      className="loan-form-input" />
                    <small className="loan-hint">Max: {Utils.formatCurrency(selectedLoan.remainingBalance)}</small>
                  </div>
                  <div className="loan-form-group">
                    <label>Payment Date <span className="loan-required">*</span></label>
                    <input type="date" value={repaymentForm.paymentDate} required
                      onChange={e => setRepaymentForm({ ...repaymentForm, paymentDate: e.target.value })}
                      className="loan-form-input" />
                  </div>
                </div>

                <div className="loan-form-row">
                  <div className="loan-form-group">
                    <label>Payment Method</label>
                    <select value={repaymentForm.paymentMethod}
                      onChange={e => setRepaymentForm({ ...repaymentForm, paymentMethod: e.target.value })}
                      className="loan-form-select">
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="salary_deduction">Salary Deduction</option>
                    </select>
                  </div>
                  <div className="loan-form-group">
                    <label>Reference Number</label>
                    <input type="text" value={repaymentForm.referenceNumber}
                      onChange={e => setRepaymentForm({ ...repaymentForm, referenceNumber: e.target.value })}
                      placeholder="Reference / Cheque #" className="loan-form-input" />
                  </div>
                </div>

                <div className="loan-form-group">
                  <label>Notes</label>
                  <input type="text" value={repaymentForm.notes}
                    onChange={e => setRepaymentForm({ ...repaymentForm, notes: e.target.value })}
                    placeholder="Additional notes" className="loan-form-input" />
                </div>

                <div className="loan-form-actions">
                  <button type="submit" className="loan-btn loan-btn-primary" disabled={loading}>
                    <Save size={14} /> {loading ? 'Processing...' : 'Record Payment'}
                  </button>
                  <button type="button" className="loan-btn loan-btn-secondary"
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
      <div className="loan-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowTypeForm(false); resetTypeForm(); } }}>
        <div className="loan-modal" onClick={e => e.stopPropagation()}>
          <div className="loan-modal-header" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            <div className="loan-modal-header-left">
              <div className="loan-modal-icon"><Tag size={18} /></div>
              <div>
                <h3>New Loan Type</h3>
                <p className="loan-modal-sub">Create a category for loans</p>
              </div>
            </div>
            <button className="loan-modal-close" onClick={() => { setShowTypeForm(false); resetTypeForm(); }}>
              <X size={18} />
            </button>
          </div>
          <div className="loan-modal-body">
            <form onSubmit={(e) => { e.preventDefault(); createLoanType(typeForm); }}>
              <div className="loan-form-group">
                <label>Name <span className="loan-required">*</span></label>
                <input type="text" value={typeForm.name} required
                  onChange={e => setTypeForm({ ...typeForm, name: e.target.value })}
                  placeholder="Loan type name" className="loan-form-input" />
              </div>
              <div className="loan-form-group">
                <label>Description</label>
                <textarea value={typeForm.description}
                  onChange={e => setTypeForm({ ...typeForm, description: e.target.value })}
                  placeholder="Description" rows="2" className="loan-form-textarea" />
              </div>
              <div className="loan-form-row">
                <div className="loan-form-group">
                  <label><Banknote size={12} /> Max Amount (BD)</label>
                  <input type="number" step="0.001" value={typeForm.maxAmount}
                    onChange={e => setTypeForm({ ...typeForm, maxAmount: e.target.value })}
                    placeholder="0.000" className="loan-form-input" />
                </div>
                <div className="loan-form-group">
                  <label><Percent size={12} /> Interest Rate (%)</label>
                  <input type="number" step="0.01" value={typeForm.interestRate}
                    onChange={e => setTypeForm({ ...typeForm, interestRate: e.target.value })}
                    placeholder="0" className="loan-form-input" />
                </div>
              </div>
              <div className="loan-form-group">
                <label><Timer size={12} /> Default Tenure (months)</label>
                <input type="number" value={typeForm.defaultTenure}
                  onChange={e => setTypeForm({ ...typeForm, defaultTenure: e.target.value })}
                  placeholder="6" className="loan-form-input" />
              </div>
              <div className="loan-form-actions">
                <button type="submit" className="loan-btn loan-btn-primary" disabled={loading}>
                  <Save size={14} /> {loading ? 'Saving...' : 'Create'}
                </button>
                <button type="button" className="loan-btn loan-btn-secondary"
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
    const activeLoans = loans.filter(l => l.status === 'active');
    const totalDeduction = activeLoans.reduce((s, l) => s + (l.monthlyInstallment || 0), 0);

    return (
      <ModalPortal>
        <div className="loan-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDeductionModal(false); }}>
          <div className="loan-modal" onClick={e => e.stopPropagation()}>
            <div className="loan-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
              <div className="loan-modal-header-left">
                <div className="loan-modal-icon"><Zap size={18} /></div>
                <div>
                  <h3>Process Salary Deductions</h3>
                  <p className="loan-modal-sub">Auto-deduct from active loans</p>
                </div>
              </div>
              <button className="loan-modal-close" onClick={() => setShowDeductionModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="loan-modal-body">
              <div className="loan-form-group">
                <label><Calendar size={12} /> Select Month <span className="loan-required">*</span></label>
                <input type="month" value={month}
                  onChange={e => setMonth(e.target.value)} required
                  className="loan-form-input" />
              </div>

              <div className="loan-deduction-summary">
                <div className="loan-deduction-row">
                  <span>Active Loans</span>
                  <strong>{activeLoans.length}</strong>
                </div>
                <div className="loan-deduction-row">
                  <span>Total Monthly Deduction</span>
                  <strong style={{ color: '#b45309' }}>{Utils.formatCurrency(totalDeduction)}</strong>
                </div>
              </div>

              {activeLoans.length > 0 && (
                <div className="loan-deduction-list">
                  <h4>Loans to process:</h4>
                  {activeLoans.slice(0, 10).map(l => (
                    <div key={l.id} className="loan-deduction-item">
                      <span>{l.loanNumber} — {l.employeeName}</span>
                      <span>{Utils.formatCurrency(l.monthlyInstallment)}</span>
                    </div>
                  ))}
                  {activeLoans.length > 10 && <div className="loan-empty-mini">+{activeLoans.length - 10} more…</div>}
                </div>
              )}

              <div className="loan-form-actions">
                <button className="loan-btn loan-btn-primary"
                  onClick={() => processDeductions(month)}
                  disabled={loading || !month || activeLoans.length === 0}>
                  <Zap size={14} /> {loading ? 'Processing...' : 'Process Deductions'}
                </button>
                <button className="loan-btn loan-btn-secondary" onClick={() => setShowDeductionModal(false)}>
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
    if (!selectedLoan) return null;
    const employeeSalary = getEmployeeSalary(selectedLoan.employeeId);
    const monthlyInstallment = selectedLoan.monthlyInstallment || 0;
    const netSalary = employeeSalary - monthlyInstallment;

    return (
      <ModalPortal>
        <div className="loan-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDetailModal(false); }}>
          <div className="loan-modal loan-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="loan-modal-header" style={{ background: 'linear-gradient(135deg, #0b1a12, #1f3a2c)' }}>
              <div className="loan-modal-header-left">
                <div className="loan-modal-icon"><FileText size={18} /></div>
                <div>
                  <h3>{selectedLoan.loanNumber}</h3>
                  <p className="loan-modal-sub">{selectedLoan.employeeName}</p>
                </div>
              </div>
              <button className="loan-modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="loan-modal-body">
              <div className="loan-detail-grid-lg">
                <div className="loan-detail-section">
                  <h4>Basic Information</h4>
                  <div className="loan-detail-row"><span>Loan #</span><strong>{selectedLoan.loanNumber}</strong></div>
                  <div className="loan-detail-row"><span>Employee</span><strong>{selectedLoan.employeeName}</strong></div>
                  <div className="loan-detail-row"><span>Type</span><strong>{selectedLoan.loanTypeName}</strong></div>
                  <div className="loan-detail-row"><span>Status</span>{getStatusBadge(selectedLoan.status)}</div>
                  <div className="loan-detail-row"><span>Amount</span><strong>{Utils.formatCurrency(selectedLoan.amount)}</strong></div>
                  <div className="loan-detail-row"><span>Date</span><strong>{Utils.formatDate(selectedLoan.loanDate)}</strong></div>
                </div>

                <div className="loan-detail-section">
                  <h4>Loan Details</h4>
                  <div className="loan-detail-row"><span>Interest Rate</span><strong>{selectedLoan.interestRate || 0}%</strong></div>
                  <div className="loan-detail-row"><span>Tenure</span><strong>{selectedLoan.tenureMonths} months</strong></div>
                  <div className="loan-detail-row"><span>Monthly Installment</span><strong style={{ color: '#b45309' }}>{Utils.formatCurrency(monthlyInstallment)}</strong></div>
                  <div className="loan-detail-row"><span>Remaining Balance</span><strong>{Utils.formatCurrency(selectedLoan.remainingBalance)}</strong></div>
                  <div className="loan-detail-row"><span>Paid Amount</span><strong>{Utils.formatCurrency(selectedLoan.paidAmount)}</strong></div>
                  <div className="loan-detail-row"><span>Auto Deduction</span><strong>{selectedLoan.autoDeduct ? 'Yes' : 'No'}</strong></div>
                </div>

                <div className="loan-detail-section full-width">
                  <h4>Salary & Deduction</h4>
                  <div className="loan-detail-row"><span>Monthly Salary</span><strong>{Utils.formatCurrency(employeeSalary)}</strong></div>
                  <div className="loan-detail-row"><span>Installment</span><strong style={{ color: '#b45309' }}>{Utils.formatCurrency(monthlyInstallment)}</strong></div>
                  <div className="loan-detail-row"><span>Net Salary</span><strong style={{ color: netSalary >= 0 ? '#047857' : '#b91c1c' }}>{Utils.formatCurrency(netSalary)}</strong></div>
                </div>

                <div className="loan-detail-section full-width">
                  <h4>Additional Info</h4>
                  {selectedLoan.purpose && <div className="loan-detail-row"><span>Purpose</span><strong>{selectedLoan.purpose}</strong></div>}
                  {selectedLoan.notes && <div className="loan-detail-row"><span>Notes</span><strong>{selectedLoan.notes}</strong></div>}
                  {selectedLoan.approvedBy && <div className="loan-detail-row"><span>Approved By</span><strong>{selectedLoan.approvedBy}</strong></div>}
                  {selectedLoan.approvedDate && <div className="loan-detail-row"><span>Approved Date</span><strong>{Utils.formatDate(selectedLoan.approvedDate)}</strong></div>}
                  <div className="loan-detail-row"><span>Created</span><strong>{selectedLoan.createdAt ? Utils.formatDateTime(selectedLoan.createdAt) : '—'}</strong></div>
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
    <div className={`loan-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="loan-ambient">
        <div className="loan-orb loan-orb-1" />
        <div className="loan-orb loan-orb-2" />
        <div className="loan-orb loan-orb-3" />
      </div>

      {/* Header */}
      <div className="loan-header">
        <div className="loan-header-left">
          <div className="loan-header-icon">
            <Landmark size={22} />
            <span className="loan-header-badge"><Sparkles size={10} /> LOANS</span>
          </div>
          <div>
            <h2>Loan Management</h2>
            <p className="loan-header-subtitle">
              {summary?.totalLoans || 0} loans · {Utils.formatCurrencyShort(summary?.totalAmount || 0)} issued · {summary?.collectionRate?.toFixed(0) || 0}% collected
            </p>
          </div>
        </div>
        <div className="loan-header-right">
          <button className="loan-btn loan-btn-ghost"
            onClick={() => { isDataLoaded.current = false; loadData(); }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="loan-btn loan-btn-primary"
            onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> New Loan
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="loan-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'loans', label: 'Loans', icon: FileText, badge: filteredLoans.length },
          { id: 'repayments', label: 'Repayments', icon: Receipt, badge: repayments.length },
          { id: 'types', label: 'Loan Types', icon: Tag, badge: loanTypes.length }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`loan-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => {
                setViewMode(t.id);
                if (t.id === 'repayments' && !isRepaymentsLoaded.current) {
                  if (selectedLoanId) loadRepaymentsForLoan(selectedLoanId);
                  else loadAllRepayments();
                }
              }}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && <span className="loan-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {error && <div className="loan-message error"><AlertCircle size={15} /> {error}</div>}
      {success && <div className="loan-message success"><CheckCircle size={15} /> {success}</div>}

      {isLoading ? (
        <div className="loan-loading">
          <div className="loan-loading-spinner" />
          <span>Loading loans...</span>
        </div>
      ) : (
        <>
          {viewMode === 'overview' && renderOverviewTab()}
          {viewMode === 'loans' && renderLoansTab()}
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

export default LoanManagement;