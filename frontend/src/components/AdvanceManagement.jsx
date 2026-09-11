// src/components/AdvanceManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  X,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  Wallet,
  DollarSign,
  TrendingUp,
  FileText,
  Receipt,
  Settings,
  Zap,
  Users,
  CreditCard,
  Banknote,
  Percent,
  Tag,
  Clock,
  Shield,
  Award,
  Building2,
  Phone,
  Mail,
  MapPin,
  UserCheck,
  UserX,
  LayoutDashboard,
  Briefcase,
  Timer,
  Activity,
  Gauge,
  Sparkles,
  Crown,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  HardHat,
  Layers,
  Box,
  Package
} from 'lucide-react';
import Utils from '../utils/Utils';
import './AdvanceManagement.css';

import { CONFIG } from '../config/constants';
const API_BASE_URL = CONFIG.API_BASE || 'http://localhost:5000/api';

const AdvanceManagement = ({ data, refreshData }) => {
  // ============================================
  // STATE
  // ============================================
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('advances');
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showRepaymentForm, setShowRepaymentForm] = useState(false);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  
  // Selection states
  const [editingId, setEditingId] = useState(null);
  const [selectedAdvance, setSelectedAdvance] = useState(null);
  const [selectedAdvanceId, setSelectedAdvanceId] = useState('');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Data states
  const [advances, setAdvances] = useState([]);
  const [advanceTypes, setAdvanceTypes] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [summary, setSummary] = useState(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRepaymentsLoading, setIsRepaymentsLoading] = useState(false);
  const isDataLoaded = React.useRef(false);
  const isRepaymentsLoaded = React.useRef(false);

  // Form state
  const [formData, setFormData] = useState({
    employeeId: '',
    advanceTypeId: '',
    amount: '',
    advanceDate: Utils.today(),
    reason: '',
    notes: '',
    deductionMonth: '',
    approvedBy: ''
  });

  // Repayment form
  const [repaymentForm, setRepaymentForm] = useState({
    amount: '',
    paymentDate: Utils.today(),
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: ''
  });

  // Type form
  const [typeForm, setTypeForm] = useState({
    name: '',
    description: '',
    maxAmount: '',
    defaultTenure: 1
  });

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const cardDetails = {
    total: {
      title: 'Total Advances',
      details: [
        { label: 'Total Advances', value: summary?.totalAdvances || 0 },
        { label: 'Active', value: summary?.activeAdvances || 0 },
        { label: 'Completed', value: summary?.completedAdvances || 0 },
        { label: 'Total Amount', value: Utils.formatCurrency(summary?.totalAmount || 0) }
      ]
    },
    active: {
      title: 'Active Advances',
      details: [
        { label: 'Active Advances', value: summary?.activeAdvances || 0 },
        { label: 'Total Advances', value: summary?.totalAdvances || 0 },
        { label: 'Remaining Balance', value: Utils.formatCurrency(summary?.totalBalance || 0) },
        { label: 'Collection Rate', value: `${summary?.collectionRate?.toFixed(1) || 0}%` }
      ]
    },
    completed: {
      title: 'Completed Advances',
      details: [
        { label: 'Completed', value: summary?.completedAdvances || 0 },
        { label: 'Total Advances', value: summary?.totalAdvances || 0 },
        { label: 'Completion Rate', value: summary?.totalAdvances > 0 ? `${((summary.completedAdvances / summary.totalAdvances) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    amount: {
      title: 'Total Amount',
      details: [
        { label: 'Total Amount', value: Utils.formatCurrency(summary?.totalAmount || 0) },
        { label: 'Remaining Balance', value: Utils.formatCurrency(summary?.totalBalance || 0) },
        { label: 'Avg Advance', value: summary?.totalAdvances > 0 ? Utils.formatCurrency(summary.totalAmount / summary.totalAdvances) : '0.000' },
        { label: 'Collection Rate', value: `${summary?.collectionRate?.toFixed(1) || 0}%` }
      ]
    },
    balance: {
      title: 'Remaining Balance',
      details: [
        { label: 'Remaining Balance', value: Utils.formatCurrency(summary?.totalBalance || 0) },
        { label: 'Total Amount', value: Utils.formatCurrency(summary?.totalAmount || 0) },
        { label: 'Paid Amount', value: Utils.formatCurrency((summary?.totalAmount || 0) - (summary?.totalBalance || 0)) },
        { label: 'Active Advances', value: summary?.activeAdvances || 0 }
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

  // ============================================
  // HANDLE HOVER FOR TOOLTIPS
  // ============================================
  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({
      x: event.clientX + 15,
      y: event.clientY - 10
    });
  };

  const handleCardLeave = () => {
    setHoveredCard(null);
  };

  // ============================================
  // AUTO-PROCESS DEDUCTIONS
  // ============================================
  const autoProcessDeductions = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/advances/deductions/auto-process`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
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
    } catch (err) {
      console.log('Auto-deduction check:', err.message);
      return false;
    }
  }, []);

  // ============================================
  // LOAD DATA
  // ============================================
  const loadData = useCallback(async () => {
    if (isDataLoaded.current) return;
    
    setIsLoading(true);
    setError('');
    try {
      await autoProcessDeductions();

      const [advancesRes, typesRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE_URL}/advances`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/advances/types`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : []),
        fetch(`${API_BASE_URL}/advances/summary`, {
          headers: { 'Accept': 'application/json' }
        }).then(res => res.ok ? res.json() : {})
      ]);

      setAdvances(advancesRes);
      setAdvanceTypes(typesRes);
      setSummary(summaryRes);
      isDataLoaded.current = true;

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [autoProcessDeductions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // LOAD REPAYMENTS
  // ============================================
  const loadRepaymentsForAdvance = useCallback(async (advanceId) => {
    if (!advanceId) return;
    
    setIsRepaymentsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/advances/${advanceId}/repayments`, {
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const repaymentsData = await response.json();
        setRepayments(repaymentsData);
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
      const allRepayments = [];
      for (const advance of advances) {
        const response = await fetch(`${API_BASE_URL}/advances/${advance.id}/repayments`, {
          headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
          const repaymentsData = await response.json();
          allRepayments.push(...repaymentsData);
        }
      }
      setRepayments(allRepayments);
      isRepaymentsLoaded.current = true;
    } catch (err) {
      setError(err.message);
      setRepayments([]);
    } finally {
      setIsRepaymentsLoading(false);
    }
  }, [advances]);

  // ============================================
  // HELPER: Get Employee Salary
  // ============================================
  const getEmployeeSalary = (employeeId) => {
    const worker = data.workers?.find(w => w.id === employeeId);
    if (!worker) return 0;
    return worker.monthly_salary || worker.salary || (worker.daily_rate * 26) || 0;
  };

  // ============================================
  // ADVANCE CRUD OPERATIONS
  // ============================================
  const createAdvance = async (formData) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const amount = parseFloat(formData.amount) || 0;
      const deductionMonth = formData.deductionMonth || Utils.getCurrentMonthString();
      
      const dateParts = deductionMonth.split('-');
      let year = parseInt(dateParts[0]);
      let month = parseInt(dateParts[1]);
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      const endMonth = `${year}-${String(month).padStart(2, '0')}`;

      const payload = {
        ...formData,
        amount: amount,
        tenureMonths: 1,
        deductionStartMonth: deductionMonth,
        deductionEndMonth: endMonth
      };

      const response = await fetch(`${API_BASE_URL}/advances`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create advance');
      }

      const result = await response.json();
      
      setSuccess(`Advance ${result.advanceNumber} issued successfully!`);
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

  const deleteAdvance = async (id) => {
    if (!window.confirm('Delete this advance?')) return;
    
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/advances/${id}`, { method: 'DELETE' });
      setSuccess('Advance deleted successfully!');
      isDataLoaded.current = false;
      await loadData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // REPAYMENT OPERATIONS
  // ============================================
  const recordRepayment = async (advanceId, repaymentData) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/advances/${advanceId}/repayments`, {
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
      await loadRepaymentsForAdvance(advanceId);
      setShowRepaymentForm(false);
      resetRepaymentForm();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ADVANCE TYPE OPERATIONS
  // ============================================
  const createAdvanceType = async (typeData) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/advances/types`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(typeData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create advance type');
      }

      setSuccess('Advance type created successfully!');
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

  // ============================================
  // DEDUCTION OPERATIONS
  // ============================================
  const processDeductions = async (month) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/advances/deductions/auto-process`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ month })
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
  // RESET FUNCTIONS
  // ============================================
  const resetForm = () => {
    setFormData({
      employeeId: '',
      advanceTypeId: '',
      amount: '',
      advanceDate: Utils.today(),
      reason: '',
      notes: '',
      deductionMonth: '',
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
      defaultTenure: 1
    });
    setEditingId(null);
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  const getStatusBadge = (status) => {
    const config = {
      active: { color: '#22c55e', label: 'Active', icon: CheckCircle },
      completed: { color: '#3b82f6', label: 'Completed', icon: CheckCircle },
      cancelled: { color: '#6b7280', label: 'Cancelled', icon: X }
    };
    const c = config[status] || config.active;
    const Icon = c.icon;
    return (
      <span className={`advance-status-badge ${status}`}>
        <Icon size={12} />
        {c.label}
      </span>
    );
  };

  const getPaymentMethodBadge = (method) => {
    const config = {
      cash: { color: '#22c55e', label: 'Cash', icon: Banknote },
      bank_transfer: { color: '#3b82f6', label: 'Bank Transfer', icon: CreditCard },
      cheque: { color: '#f59e0b', label: 'Cheque', icon: FileText },
      salary_deduction: { color: '#8b5cf6', label: 'Salary Deduction', icon: Wallet }
    };
    const c = config[method] || config.cash;
    const Icon = c.icon;
    return (
      <span className={`payment-method ${method}`}>
        <Icon size={12} />
        {c.label}
      </span>
    );
  };

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // ============================================
  // FILTERED ADVANCES
  // ============================================
  const filteredAdvances = useMemo(() => {
    let filtered = advances;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.employeeName?.toLowerCase().includes(search) ||
        a.advanceNumber?.toLowerCase().includes(search) ||
        a.reason?.toLowerCase().includes(search)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }
    
    if (employeeFilter !== 'all') {
      filtered = filtered.filter(a => a.employeeId === employeeFilter);
    }
    
    return filtered;
  }, [advances, searchTerm, statusFilter, employeeFilter]);

  // ============================================
  // RENDER FUNCTIONS
  // ============================================
  const renderStats = () => {
    if (!summary) return null;

    const statItems = [
      { id: 'total', icon: FileText, label: 'Total Advances', value: summary.totalAdvances || 0, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
      { id: 'active', icon: CheckCircle, label: 'Active', value: summary.activeAdvances || 0, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
      { id: 'completed', icon: CheckCircle, label: 'Completed', value: summary.completedAdvances || 0, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
      { id: 'amount', icon: DollarSign, label: 'Total Amount', value: Utils.formatCurrencyShort(summary.totalAmount || 0), color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
      { id: 'balance', icon: Wallet, label: 'Remaining Balance', value: Utils.formatCurrencyShort(summary.totalBalance || 0), color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
      { id: 'rate', icon: TrendingUp, label: 'Collection Rate', value: `${summary.collectionRate?.toFixed(1) || 0}%`, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' }
    ];

    return (
      <div className="advance-stats-grid">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="advance-stat-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="advance-stat-icon" style={{ background: item.bg, color: item.color }}>
                <Icon size={22} />
              </div>
              <div className="advance-stat-content">
                <span className="advance-stat-label">{item.label}</span>
                <span className="advance-stat-value">{item.value}</span>
              </div>
              <div className="advance-stat-trend">
                <TrendingUp size={16} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAdvancesList = () => {
    return (
      <div className="advances-container">
        <div className="advances-toolbar">
          <div className="advances-actions">
            <button className="adv-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={16} /> New Advance
            </button>
            <button className="adv-btn-secondary" onClick={() => { resetTypeForm(); setShowTypeForm(true); }}>
              <Plus size={16} /> Advance Type
            </button>
            <button className="adv-btn-secondary" onClick={() => setShowDeductionModal(true)}>
              <Zap size={16} /> Process Deductions
            </button>
            <button className="btn-refresh-modern" onClick={() => {
              isDataLoaded.current = false;
              loadData();
            }}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          <div className="advances-filters">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search advances..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
              <option value="all">All Employees</option>
              {data.workers?.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="advances-grid">
          {filteredAdvances.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h3>No Advances Found</h3>
              <p>Issue a new advance to an employee to get started.</p>
            </div>
          ) : (
            filteredAdvances.map(advance => {
              const isExpanded = expandedItems[advance.id];
              const progress = advance.progress || 0;
              const employeeSalary = getEmployeeSalary(advance.employeeId);
              const netSalary = employeeSalary - (advance.monthlyDeduction || 0);
              
              return (
                <div key={advance.id} className="advance-card">
                  <div className="advance-card-header">
                    <div className="advance-info">
                      <div className="advance-number">{advance.advanceNumber}</div>
                      <div className="advance-employee">
                        <User size={14} /> {advance.employeeName}
                      </div>
                      <div className="advance-type">{advance.advanceTypeName}</div>
                      <span className="advance-badge">
                        <Wallet size={12} /> Salary Deduction
                      </span>
                    </div>
                    <div className="advance-badges">
                      {getStatusBadge(advance.status)}
                      <span className="advance-amount">{Utils.formatCurrency(advance.amount)}</span>
                    </div>
                  </div>

                  <div className="advance-card-body">
                    <div className="advance-details">
                      <div className="detail-item">
                        <span className="label">Balance:</span>
                        <span className="balance">{Utils.formatCurrency(advance.remainingBalance)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Paid:</span>
                        <span className="paid">{Utils.formatCurrency(advance.paidAmount)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Deduction:</span>
                        <span>{Utils.formatCurrency(advance.monthlyDeduction)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Salary:</span>
                        <span>{Utils.formatCurrency(employeeSalary)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Net Salary:</span>
                        <span className={netSalary < 0 ? 'text-danger' : 'text-success'}>
                          {Utils.formatCurrency(netSalary)}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Date:</span>
                        <span>{Utils.formatDate(advance.advanceDate)}</span>
                      </div>
                    </div>

                    <div className="advance-progress">
                      <div className="progress-header">
                        <span className="progress-label">Repayment Progress</span>
                        <span className="progress-value">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${Math.min(progress, 100)}%`,
                            background: progress >= 75 ? '#22c55e' : progress >= 50 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    </div>

                    {advance.reason && (
                      <div className="advance-reason">
                        <strong>Reason:</strong> {advance.reason}
                      </div>
                    )}
                  </div>

                  <div className="advance-card-footer">
                    <div className="advance-actions">
                      <button className="btn-icon" onClick={() => {
                        setSelectedAdvance(advance);
                        setShowDetailModal(true);
                      }}>
                        <Eye size={16} />
                      </button>
                      {advance.status === 'active' && (
                        <button className="btn-icon" onClick={() => {
                          setSelectedAdvance(advance);
                          resetRepaymentForm();
                          setShowRepaymentForm(true);
                        }}>
                          <Receipt size={16} /> Record Payment
                        </button>
                      )}
                      <button className="btn-icon" onClick={() => {
                        setSelectedAdvance(advance);
                        setSelectedAdvanceId(advance.id);
                        setViewMode('repayments');
                        loadRepaymentsForAdvance(advance.id);
                      }}>
                        <FileText size={16} /> History
                      </button>
                      <button className="btn-icon delete" onClick={() => deleteAdvance(advance.id)}>
                        <Trash2 size={16} />
                      </button>
                      <button className="btn-icon" onClick={() => toggleExpand(advance.id)}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="advance-expanded">
                      <div className="expanded-grid">
                        <div><strong>Employee:</strong> {advance.employeeName}</div>
                        <div><strong>Advance Type:</strong> {advance.advanceTypeName}</div>
                        <div><strong>Amount:</strong> {Utils.formatCurrency(advance.amount)}</div>
                        <div><strong>Monthly Salary:</strong> {Utils.formatCurrency(employeeSalary)}</div>
                        <div><strong>Deduction Amount:</strong> {Utils.formatCurrency(advance.monthlyDeduction)}</div>
                        <div><strong>Net Salary:</strong> {Utils.formatCurrency(netSalary)}</div>
                        <div><strong>Deduction Month:</strong> {advance.deductionStartMonth}</div>
                        <div><strong>Approved By:</strong> {advance.approvedBy || 'N/A'}</div>
                      </div>
                      {advance.notes && (
                        <div className="expanded-notes"><strong>Notes:</strong> {advance.notes}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderRepayments = () => {
    return (
      <div className="repayments-container">
        <div className="repayments-header">
          <h3><Receipt size={20} /> Repayment History</h3>
          <div className="repayments-controls">
            <select 
              value={selectedAdvanceId} 
              onChange={(e) => {
                setSelectedAdvanceId(e.target.value);
                const advance = advances.find(a => a.id === e.target.value);
                setSelectedAdvance(advance);
                if (e.target.value) {
                  loadRepaymentsForAdvance(e.target.value);
                } else {
                  loadAllRepayments();
                }
              }}
              className="advance-select"
            >
              <option value="">All Advances</option>
              {advances.map(advance => (
                <option key={advance.id} value={advance.id}>
                  {advance.advanceNumber} - {advance.employeeName}
                </option>
              ))}
            </select>
            <button 
              className="adv-btn-secondary" 
              onClick={() => {
                setViewMode('advances');
                setRepayments([]);
                isRepaymentsLoaded.current = false;
              }}
            >
              Back to Advances
            </button>
          </div>
        </div>

        <div className="repayments-table-container">
          {isRepaymentsLoading ? (
            <div className="loading-cell">Loading repayments...</div>
          ) : repayments.length === 0 ? (
            <div className="empty-state">
              <Receipt size={48} />
              <h3>No Repayments</h3>
              <p>No repayments recorded for the selected advance.</p>
            </div>
          ) : (
            <table className="repayments-table">
              <thead>
                <tr>
                  <th>Advance #</th>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {repayments.map(repayment => {
                  const advance = advances.find(a => a.id === repayment.advanceId);
                  return (
                    <tr key={repayment.id}>
                      <td>{advance?.advanceNumber || 'N/A'}</td>
                      <td>{advance?.employeeName || 'Unknown'}</td>
                      <td>{Utils.formatDate(repayment.paymentDate)}</td>
                      <td className="amount">{Utils.formatCurrency(repayment.amount)}</td>
                      <td>{getPaymentMethodBadge(repayment.paymentMethod)}</td>
                      <td>{repayment.referenceNumber || '-'}</td>
                      <td>{repayment.createdBy || 'System'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  const renderAdvanceTypes = () => {
    return (
      <div className="types-container">
        <div className="types-header">
          <h3><Tag size={20} /> Advance Types</h3>
          <button className="adv-btn-primary" onClick={() => { resetTypeForm(); setShowTypeForm(true); }}>
            <Plus size={16} /> Add Advance Type
          </button>
        </div>

        <div className="types-grid">
          {advanceTypes.length === 0 ? (
            <div className="empty-state">
              <Tag size={48} />
              <h3>No Advance Types</h3>
              <p>Add advance types to categorize advances.</p>
            </div>
          ) : (
            advanceTypes.map(type => (
              <div key={type.id} className="type-card">
                <div className="type-card-header">
                  <div className="type-name">{type.name}</div>
                  <span className={`type-status ${type.isActive ? 'active' : 'inactive'}`}>
                    {type.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="type-card-body">
                  {type.description && <div className="type-description">{type.description}</div>}
                  <div className="type-details">
                    <div className="detail-item">
                      <span className="label">Max Amount:</span>
                      <span>{Utils.formatCurrency(type.maxAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderFormModal = () => {
    const selectedEmployee = data.workers?.find(w => w.id === formData.employeeId);
    const employeeSalary = selectedEmployee ? getEmployeeSalary(selectedEmployee.id) : 0;
    const deductionAmount = parseFloat(formData.amount) || 0;
    const netSalary = employeeSalary - deductionAmount;
    const isExceedingSalary = deductionAmount > employeeSalary;

    return (
      <div className="adv-modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
        <div className="adv-modal-content adv-form-modal" onClick={e => e.stopPropagation()}>
          <div className="adv-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="adv-modal-header-left">
              <Plus size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>New Advance</h3>
            </div>
            <button className="adv-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="adv-modal-body">
            <form onSubmit={(e) => {
              e.preventDefault();
              createAdvance(formData);
            }}>
              <div className="adv-form-row">
                <div className="adv-form-group">
                  <label><User size={14} /> Employee <span className="adv-required">*</span></label>
                  <select
                    value={formData.employeeId}
                    onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                    required
                    className="adv-form-select"
                  >
                    <option value="">Select Employee</option>
                    {data.workers?.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} - {Utils.formatCurrency(getEmployeeSalary(w.id))}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="adv-form-group">
                  <label><Tag size={14} /> Advance Type <span className="adv-required">*</span></label>
                  <select
                    value={formData.advanceTypeId}
                    onChange={e => {
                      setFormData({ 
                        ...formData, 
                        advanceTypeId: e.target.value
                      });
                    }}
                    required
                    className="adv-form-select"
                  >
                    <option value="">Select Type</option>
                    {advanceTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="adv-form-row">
                <div className="adv-form-group">
                  <label><DollarSign size={14} /> Advance Amount <span className="adv-required">*</span></label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    required
                    placeholder="0.000"
                    max={employeeSalary}
                    className="adv-form-input"
                  />
                  {isExceedingSalary && formData.amount && (
                    <small className="adv-error-hint">
                      <AlertCircle size={12} /> Amount exceeds monthly salary!
                    </small>
                  )}
                </div>
                <div className="adv-form-group">
                  <label><Calendar size={14} /> Advance Date <span className="adv-required">*</span></label>
                  <input
                    type="date"
                    value={formData.advanceDate}
                    onChange={e => setFormData({ ...formData, advanceDate: e.target.value })}
                    required
                    className="adv-form-input"
                  />
                </div>
              </div>

              {formData.employeeId && (
                <div className="adv-salary-info">
                  <div className="adv-salary-row">
                    <span>Monthly Salary:</span>
                    <strong>{Utils.formatCurrency(employeeSalary)}</strong>
                  </div>
                  <div className="adv-salary-row">
                    <span>Advance Amount:</span>
                    <strong style={{ color: isExceedingSalary ? '#ef4444' : '#f59e0b' }}>
                      {Utils.formatCurrency(deductionAmount)}
                    </strong>
                  </div>
                  <div className="adv-salary-row">
                    <span>Net Salary After Deduction:</span>
                    <strong style={{ color: netSalary < 0 ? '#ef4444' : '#22c55e' }}>
                      {Utils.formatCurrency(netSalary)}
                    </strong>
                  </div>
                  {netSalary < 0 && (
                    <div className="adv-warning-message">
                      <AlertCircle size={16} /> Advance exceeds salary! Please reduce the amount.
                    </div>
                  )}
                </div>
              )}

              <div className="adv-form-group">
                <label><Calendar size={14} /> Deduction from Salary Month <span className="adv-required">*</span></label>
                <input
                  type="month"
                  value={formData.deductionMonth}
                  onChange={e => setFormData({ ...formData, deductionMonth: e.target.value })}
                  required
                  className="adv-form-input"
                />
                <small className="adv-hint">The advance amount will be deducted from this month's salary</small>
              </div>

              <div className="adv-form-group">
                <label><FileText size={14} /> Reason</label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Reason for advance"
                  className="adv-form-input"
                />
              </div>

              <div className="adv-form-group">
                <label><FileText size={14} /> Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows="2"
                  className="adv-form-textarea"
                />
              </div>

              <div className="adv-form-group">
                <label><UserCheck size={14} /> Approved By</label>
                <input
                  type="text"
                  value={formData.approvedBy}
                  onChange={e => setFormData({ ...formData, approvedBy: e.target.value })}
                  placeholder="Approver name"
                  className="adv-form-input"
                />
              </div>

              <div className="adv-form-actions">
                <button 
                  type="submit" 
                  className="adv-btn-primary" 
                  disabled={loading || (deductionAmount > employeeSalary && employeeSalary > 0)}
                >
                  <Save size={16} /> {loading ? 'Saving...' : 'Issue Advance'}
                </button>
                <button type="button" className="adv-btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderRepaymentFormModal = () => {
    if (!selectedAdvance) return null;

    return (
      <div className="adv-modal-overlay" onClick={() => { setShowRepaymentForm(false); resetRepaymentForm(); }}>
        <div className="adv-modal-content adv-form-modal" onClick={e => e.stopPropagation()}>
          <div className="adv-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="adv-modal-header-left">
              <Receipt size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Record Repayment</h3>
            </div>
            <button className="adv-modal-close" onClick={() => { setShowRepaymentForm(false); resetRepaymentForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="adv-modal-body">
            <div className="adv-repayment-info">
              <div className="adv-repayment-row">
                <span>Advance:</span>
                <strong>{selectedAdvance.advanceNumber}</strong>
              </div>
              <div className="adv-repayment-row">
                <span>Employee:</span>
                <strong>{selectedAdvance.employeeName}</strong>
              </div>
              <div className="adv-repayment-row">
                <span>Remaining Balance:</span>
                <strong style={{ color: '#f59e0b' }}>{Utils.formatCurrency(selectedAdvance.remainingBalance)}</strong>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              recordRepayment(selectedAdvance.id, repaymentForm);
            }}>
              <div className="adv-form-row">
                <div className="adv-form-group">
                  <label><DollarSign size={14} /> Payment Amount <span className="adv-required">*</span></label>
                  <input
                    type="number"
                    step="0.001"
                    value={repaymentForm.amount}
                    onChange={e => setRepaymentForm({ ...repaymentForm, amount: e.target.value })}
                    required
                    placeholder="0.000"
                    max={selectedAdvance.remainingBalance}
                    className="adv-form-input"
                  />
                  <small className="adv-hint">Max: {Utils.formatCurrency(selectedAdvance.remainingBalance)}</small>
                </div>
                <div className="adv-form-group">
                  <label><Calendar size={14} /> Payment Date <span className="adv-required">*</span></label>
                  <input
                    type="date"
                    value={repaymentForm.paymentDate}
                    onChange={e => setRepaymentForm({ ...repaymentForm, paymentDate: e.target.value })}
                    required
                    className="adv-form-input"
                  />
                </div>
              </div>

              <div className="adv-form-row">
                <div className="adv-form-group">
                  <label><CreditCard size={14} /> Payment Method</label>
                  <select
                    value={repaymentForm.paymentMethod}
                    onChange={e => setRepaymentForm({ ...repaymentForm, paymentMethod: e.target.value })}
                    className="adv-form-select"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="salary_deduction">Salary Deduction</option>
                  </select>
                </div>
                <div className="adv-form-group">
                  <label><FileText size={14} /> Reference Number</label>
                  <input
                    type="text"
                    value={repaymentForm.referenceNumber}
                    onChange={e => setRepaymentForm({ ...repaymentForm, referenceNumber: e.target.value })}
                    placeholder="Reference/Cheque #"
                    className="adv-form-input"
                  />
                </div>
              </div>

              <div className="adv-form-group">
                <label><FileText size={14} /> Notes</label>
                <input
                  type="text"
                  value={repaymentForm.notes}
                  onChange={e => setRepaymentForm({ ...repaymentForm, notes: e.target.value })}
                  placeholder="Additional notes"
                  className="adv-form-input"
                />
              </div>

              <div className="adv-form-actions">
                <button type="submit" className="adv-btn-primary" disabled={loading}>
                  <Save size={16} /> {loading ? 'Processing...' : 'Record Payment'}
                </button>
                <button type="button" className="adv-btn-secondary" onClick={() => { setShowRepaymentForm(false); resetRepaymentForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderTypeFormModal = () => {
    return (
      <div className="adv-modal-overlay" onClick={() => { setShowTypeForm(false); resetTypeForm(); }}>
        <div className="adv-modal-content adv-form-modal" onClick={e => e.stopPropagation()}>
          <div className="adv-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="adv-modal-header-left">
              <Tag size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>New Advance Type</h3>
            </div>
            <button className="adv-modal-close" onClick={() => { setShowTypeForm(false); resetTypeForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="adv-modal-body">
            <form onSubmit={(e) => {
              e.preventDefault();
              createAdvanceType(typeForm);
            }}>
              <div className="adv-form-group">
                <label>Name <span className="adv-required">*</span></label>
                <input
                  type="text"
                  value={typeForm.name}
                  onChange={e => setTypeForm({ ...typeForm, name: e.target.value })}
                  required
                  placeholder="Advance type name"
                  className="adv-form-input"
                />
              </div>

              <div className="adv-form-group">
                <label>Description</label>
                <textarea
                  value={typeForm.description}
                  onChange={e => setTypeForm({ ...typeForm, description: e.target.value })}
                  placeholder="Description"
                  rows="2"
                  className="adv-form-textarea"
                />
              </div>

              <div className="adv-form-row">
                <div className="adv-form-group">
                  <label><DollarSign size={14} /> Max Amount (BD)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={typeForm.maxAmount}
                    onChange={e => setTypeForm({ ...typeForm, maxAmount: e.target.value })}
                    placeholder="0.000"
                    className="adv-form-input"
                  />
                </div>
              </div>

              <div className="adv-form-actions">
                <button type="submit" className="adv-btn-primary" disabled={loading}>
                  <Save size={16} /> {loading ? 'Saving...' : 'Create'}
                </button>
                <button type="button" className="adv-btn-secondary" onClick={() => { setShowTypeForm(false); resetTypeForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderDeductionModal = () => {
    const [month, setMonth] = useState(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const activeAdvances = advances.filter(a => a.status === 'active');
    const totalDeduction = activeAdvances.reduce((sum, a) => sum + (a.monthlyDeduction || 0), 0);

    return (
      <div className="adv-modal-overlay" onClick={() => setShowDeductionModal(false)}>
        <div className="adv-modal-content adv-form-modal" onClick={e => e.stopPropagation()}>
          <div className="adv-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="adv-modal-header-left">
              <Zap size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Process Salary Deductions</h3>
            </div>
            <button className="adv-modal-close" onClick={() => setShowDeductionModal(false)}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="adv-modal-body">
            <div className="deduction-info">
              <p>Process salary deductions for all active advances.</p>
              
              <div className="adv-form-group">
                <label><Calendar size={14} /> Select Month <span className="adv-required">*</span></label>
                <input
                  type="month"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  required
                  className="adv-form-input"
                />
              </div>

              <div className="deduction-summary">
                <div className="summary-item">
                  <span>Active Advances:</span>
                  <strong>{activeAdvances.length}</strong>
                </div>
                <div className="summary-item">
                  <span>Total Monthly Deduction:</span>
                  <strong style={{ color: '#f59e0b' }}>{Utils.formatCurrency(totalDeduction)}</strong>
                </div>
              </div>

              {activeAdvances.length > 0 && (
                <div className="deduction-advances-list">
                  <h4>Advances to process:</h4>
                  {activeAdvances.map(advance => (
                    <div key={advance.id} className="deduction-advance-item">
                      <span>{advance.advanceNumber} - {advance.employeeName}</span>
                      <span>{Utils.formatCurrency(advance.monthlyDeduction)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="adv-form-actions">
              <button 
                className="adv-btn-primary" 
                onClick={() => processDeductions(month)}
                disabled={loading || !month || activeAdvances.length === 0}
              >
                <Zap size={16} /> {loading ? 'Processing...' : 'Process Deductions'}
              </button>
              <button className="adv-btn-secondary" onClick={() => setShowDeductionModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!selectedAdvance) return null;
    
    const employeeSalary = getEmployeeSalary(selectedAdvance.employeeId);
    const netSalary = employeeSalary - (selectedAdvance.monthlyDeduction || 0);

    return (
      <div className="adv-modal-overlay" onClick={() => setShowDetailModal(false)}>
        <div className="adv-modal-content adv-detail-modal" onClick={e => e.stopPropagation()}>
          <div className="adv-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="adv-modal-header-left">
              <FileText size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Advance Details</h3>
            </div>
            <button className="adv-modal-close" onClick={() => setShowDetailModal(false)}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="adv-modal-body">
            <div className="detail-grid">
              <div className="detail-section">
                <h4><User size={14} /> Basic Information</h4>
                <div className="detail-row">
                  <span className="label">Advance Number:</span>
                  <span className="value">{selectedAdvance.advanceNumber}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Employee:</span>
                  <span className="value">{selectedAdvance.employeeName}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Advance Type:</span>
                  <span className="value">{selectedAdvance.advanceTypeName}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Status:</span>
                  <span className="value">{getStatusBadge(selectedAdvance.status)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Amount:</span>
                  <span className="value amount">{Utils.formatCurrency(selectedAdvance.amount)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Date:</span>
                  <span className="value">{Utils.formatDate(selectedAdvance.advanceDate)}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4><Wallet size={14} /> Salary & Deduction Details</h4>
                <div className="detail-row">
                  <span className="label">Monthly Salary:</span>
                  <span className="value">{Utils.formatCurrency(employeeSalary)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Deduction Amount:</span>
                  <span className="value" style={{ color: '#f59e0b' }}>
                    {Utils.formatCurrency(selectedAdvance.monthlyDeduction)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Net Salary:</span>
                  <span className="value" style={{ color: netSalary >= 0 ? '#22c55e' : '#ef4444' }}>
                    {Utils.formatCurrency(netSalary)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Deduction Month:</span>
                  <span className="value">{selectedAdvance.deductionStartMonth}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Remaining Balance:</span>
                  <span className="value">{Utils.formatCurrency(selectedAdvance.remainingBalance)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Paid Amount:</span>
                  <span className="value">{Utils.formatCurrency(selectedAdvance.paidAmount)}</span>
                </div>
              </div>

              <div className="detail-section full-width">
                <h4><FileText size={14} /> Additional Information</h4>
                {selectedAdvance.reason && (
                  <div className="detail-row">
                    <span className="label">Reason:</span>
                    <span className="value">{selectedAdvance.reason}</span>
                  </div>
                )}
                {selectedAdvance.notes && (
                  <div className="detail-row">
                    <span className="label">Notes:</span>
                    <span className="value">{selectedAdvance.notes}</span>
                  </div>
                )}
                {selectedAdvance.approvedBy && (
                  <div className="detail-row">
                    <span className="label">Approved By:</span>
                    <span className="value">{selectedAdvance.approvedBy}</span>
                  </div>
                )}
                {selectedAdvance.approvedDate && (
                  <div className="detail-row">
                    <span className="label">Approved Date:</span>
                    <span className="value">{Utils.formatDate(selectedAdvance.approvedDate)}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">Created:</span>
                  <span className="value">{Utils.formatDateTime(selectedAdvance.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="advance-management-modern">
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <Wallet size={28} />
            <span className="header-badge">Advances</span>
          </div>
          <div>
            <h2>Employee Advance Management</h2>
            <p className="header-subtitle">Issue employee salary advances with automatic salary deduction</p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-refresh-modern" onClick={() => {
            isDataLoaded.current = false;
            loadData();
          }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {renderStats()}

      {hoveredCard && cardDetails[hoveredCard] && (
        <div
          className="adv-card-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 9999
          }}
        >
          <div className="adv-tooltip-header">
            <strong>{cardDetails[hoveredCard].title}</strong>
          </div>
          <div className="adv-tooltip-body">
            {cardDetails[hoveredCard].details.map((detail, idx) => (
              <div key={idx} className="adv-tooltip-row">
                <span className="adv-tooltip-label">{detail.label}</span>
                <span className="adv-tooltip-value">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="error-message-modern"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="success-message-modern"><CheckCircle size={16} /> {success}</div>}

      <div className="view-tabs-modern">
        <button
          className={`tab-btn ${viewMode === 'advances' ? 'active' : ''}`}
          onClick={() => {
            setViewMode('advances');
            setRepayments([]);
            isRepaymentsLoaded.current = false;
          }}
        >
          <FileText size={16} /> Advances
        </button>
        <button
          className={`tab-btn ${viewMode === 'repayments' ? 'active' : ''}`}
          onClick={() => {
            setViewMode('repayments');
            if (selectedAdvanceId) {
              loadRepaymentsForAdvance(selectedAdvanceId);
            } else {
              loadAllRepayments();
            }
          }}
        >
          <Receipt size={16} /> Repayments
        </button>
        <button
          className={`tab-btn ${viewMode === 'types' ? 'active' : ''}`}
          onClick={() => setViewMode('types')}
        >
          <Tag size={16} /> Advance Types
        </button>
      </div>

      {isLoading ? (
        <div className="loading-state-modern">
          <div className="loading-spinner-modern"></div>
          <span>Loading...</span>
        </div>
      ) : (
        <>
          {viewMode === 'advances' && renderAdvancesList()}
          {viewMode === 'repayments' && renderRepayments()}
          {viewMode === 'types' && renderAdvanceTypes()}
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