// src/components/LoanManagement.jsx
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
  Package,
  Landmark,
  PiggyBank,
  Calculator,
  ReceiptText,
  CircleDollarSign,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal
} from 'lucide-react';
import Utils from '../utils/Utils';
import './LoanManagement.css';

import { CONFIG } from '../config/constants';
const API_BASE_URL = CONFIG.API_BASE || 'http://localhost:5000/api';

const LoanManagement = ({ data, refreshData }) => {
  // ============================================
  // STATE
  // ============================================
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('loans');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showRepaymentForm, setShowRepaymentForm] = useState(false);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  
  // Selection states
  const [editingId, setEditingId] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Data states
  const [loans, setLoans] = useState([]);
  const [loanTypes, setLoanTypes] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [deductions, setDeductions] = useState([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRepaymentsLoading, setIsRepaymentsLoading] = useState(false);
  const isDataLoaded = React.useRef(false);
  const isRepaymentsLoaded = React.useRef(false);

  // Form state
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
    interestRate: '0',
    defaultTenure: '6'
  });

  // Deduction form
  const [deductionForm, setDeductionForm] = useState({
    month: '',
    amount: '',
    notes: ''
  });

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
        { label: 'Completion Rate', value: summary?.totalLoans > 0 ? `${((summary.completedLoans / summary.totalLoans) * 100).toFixed(1)}%` : '0%' }
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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, employeeFilter]);

  // ============================================
  // LOAD REPAYMENTS
  // ============================================
  const loadRepaymentsForLoan = useCallback(async (loanId) => {
    if (!loanId) return;
    
    setIsRepaymentsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/loans/${loanId}/repayments`, {
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
      for (const loan of loans) {
        const response = await fetch(`${API_BASE_URL}/loans/${loan.id}/repayments`, {
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
  }, [loans]);

  // ============================================
  // HELPER: Get Employee Salary
  // ============================================
  const getEmployeeSalary = (employeeId) => {
    const worker = data.workers?.find(w => w.id === employeeId);
    if (!worker) return 0;
    return worker.monthly_salary || worker.salary || (worker.daily_rate * 26) || 0;
  };

  // ============================================
  // LOAN CRUD OPERATIONS
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

  // ============================================
  // REPAYMENT OPERATIONS
  // ============================================
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

  // ============================================
  // LOAN TYPE OPERATIONS
  // ============================================
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

  // ============================================
  // DEDUCTION OPERATIONS
  // ============================================
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
  // RESET FUNCTIONS
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
  // UTILITY FUNCTIONS
  // ============================================
  const getStatusBadge = (status) => {
    const config = {
      active: { color: '#22c55e', label: 'Active', icon: CheckCircle },
      completed: { color: '#3b82f6', label: 'Completed', icon: CheckCircle },
      cancelled: { color: '#6b7280', label: 'Cancelled', icon: X },
      pending: { color: '#f59e0b', label: 'Pending', icon: Clock }
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <span className={`loan-status-badge ${status}`}>
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
  // PAGINATION HELPERS
  // ============================================
  const goToPage = (page) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // ============================================
  // FILTERED LOANS
  // ============================================
  const filteredLoans = useMemo(() => {
    let filtered = loans;
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(l =>
        l.employeeName?.toLowerCase().includes(search) ||
        l.loanNumber?.toLowerCase().includes(search) ||
        l.purpose?.toLowerCase().includes(search)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(l => l.status === statusFilter);
    }
    
    if (employeeFilter !== 'all') {
      filtered = filtered.filter(l => l.employeeId === employeeFilter);
    }
    
    return filtered;
  }, [loans, searchTerm, statusFilter, employeeFilter]);

  // ============================================
  // PAGINATED LOANS
  // ============================================
  const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
  const paginatedLoans = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLoans.slice(startIndex, endIndex);
  }, [filteredLoans, currentPage, itemsPerPage]);

  // ============================================
  // RENDER STATS
  // ============================================
  const renderStats = () => {
    if (!summary) return null;

    const statItems = [
      { id: 'total', icon: FileText, label: 'Total Loans', value: summary.totalLoans || 0, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
      { id: 'active', icon: CheckCircle, label: 'Active', value: summary.activeLoans || 0, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' },
      { id: 'completed', icon: CheckCircle, label: 'Completed', value: summary.completedLoans || 0, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
      { id: 'amount', icon: DollarSign, label: 'Total Amount', value: Utils.formatCurrencyShort(summary.totalAmount || 0), color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
      { id: 'balance', icon: Wallet, label: 'Remaining Balance', value: Utils.formatCurrencyShort(summary.totalBalance || 0), color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
      { id: 'rate', icon: TrendingUp, label: 'Collection Rate', value: `${summary.collectionRate?.toFixed(1) || 0}%`, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.12)' }
    ];

    return (
      <div className="loan-stats-grid">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="loan-stat-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="loan-stat-icon" style={{ background: item.bg, color: item.color }}>
                <Icon size={22} />
              </div>
              <div className="loan-stat-content">
                <span className="loan-stat-label">{item.label}</span>
                <span className="loan-stat-value">{item.value}</span>
              </div>
              <div className="loan-stat-trend">
                <TrendingUp size={16} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================
  // RENDER LOANS LIST (with Pagination)
  // ============================================
  const renderLoansList = () => {
    return (
      <div className="loans-container">
        <div className="loans-toolbar">
          <div className="loans-actions">
            <button className="loan-btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={16} /> New Loan
            </button>
            <button className="loan-btn-secondary" onClick={() => { resetTypeForm(); setShowTypeForm(true); }}>
              <Plus size={16} /> Loan Type
            </button>
            <button className="loan-btn-secondary" onClick={() => setShowDeductionModal(true)}>
              <Zap size={16} /> Process Deductions
            </button>
            <button className="btn-refresh-modern" onClick={() => {
              isDataLoaded.current = false;
              loadData();
            }}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>

          <div className="loans-filters">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search loans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className={statusFilter !== 'all' ? 'filter-active' : ''}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
            </select>
            <select 
              value={employeeFilter} 
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className={employeeFilter !== 'all' ? 'filter-active' : ''}
            >
              <option value="all">All Employees</option>
              {data.workers?.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="loans-grid">
          {paginatedLoans.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <h3>No Loans Found</h3>
              <p>Issue a new loan to an employee to get started.</p>
            </div>
          ) : (
            paginatedLoans.map(loan => {
              const isExpanded = expandedItems[loan.id];
              const progress = loan.progress || 0;
              const employeeSalary = getEmployeeSalary(loan.employeeId);
              
              return (
                <div key={loan.id} className="loan-card">
                  <div className="loan-card-header">
                    <div className="loan-info">
                      <div className="loan-number">{loan.loanNumber}</div>
                      <div className="loan-employee">
                        <User size={14} /> {loan.employeeName}
                      </div>
                      <div className="loan-type">{loan.loanTypeName}</div>
                      <span className="loan-badge">
                        <PiggyBank size={12} /> {loan.tenureMonths} months
                      </span>
                    </div>
                    <div className="loan-badges">
                      {getStatusBadge(loan.status)}
                      <span className="loan-amount">{Utils.formatCurrency(loan.amount)}</span>
                    </div>
                  </div>

                  <div className="loan-card-body">
                    <div className="loan-details">
                      <div className="detail-item">
                        <span className="label">Balance:</span>
                        <span className="balance">{Utils.formatCurrency(loan.remainingBalance)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Paid:</span>
                        <span className="paid">{Utils.formatCurrency(loan.paidAmount)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Installment:</span>
                        <span>{Utils.formatCurrency(loan.monthlyInstallment)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Interest:</span>
                        <span>{loan.interestRate || 0}%</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Tenure:</span>
                        <span>{loan.tenureMonths} months</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Date:</span>
                        <span>{Utils.formatDate(loan.loanDate)}</span>
                      </div>
                    </div>

                    <div className="loan-progress">
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

                    {loan.purpose && (
                      <div className="loan-purpose">
                        <strong>Purpose:</strong> {loan.purpose}
                      </div>
                    )}
                  </div>

                  <div className="loan-card-footer">
                    <div className="loan-actions">
                      <button 
                        className="btn-icon btn-view" 
                        onClick={() => {
                          setSelectedLoan(loan);
                          setShowDetailModal(true);
                        }}
                      >
                        <Eye size={14} /> View
                      </button>
                      
                      {loan.status === 'active' && (
                        <button 
                          className="btn-icon btn-payment" 
                          onClick={() => {
                            setSelectedLoan(loan);
                            resetRepaymentForm();
                            setShowRepaymentForm(true);
                          }}
                        >
                          <Receipt size={14} /> Payment
                        </button>
                      )}
                      
                      <button 
                        className="btn-icon btn-history" 
                        onClick={() => {
                          setSelectedLoan(loan);
                          setSelectedLoanId(loan.id);
                          setViewMode('repayments');
                          loadRepaymentsForLoan(loan.id);
                        }}
                      >
                        <FileText size={14} /> History
                      </button>
                      
                      <button 
                        className="btn-icon btn-delete" 
                        onClick={() => deleteLoan(loan.id)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                      
                      <button 
                        className={`btn-icon btn-expand ${isExpanded ? 'expanded' : ''}`} 
                        onClick={() => toggleExpand(loan.id)}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="loan-expanded">
                      <div className="expanded-grid">
                        <div><strong>Employee:</strong> {loan.employeeName}</div>
                        <div><strong>Loan Type:</strong> {loan.loanTypeName}</div>
                        <div><strong>Amount:</strong> {Utils.formatCurrency(loan.amount)}</div>
                        <div><strong>Interest Rate:</strong> {loan.interestRate || 0}%</div>
                        <div><strong>Tenure:</strong> {loan.tenureMonths} months</div>
                        <div><strong>Monthly Installment:</strong> {Utils.formatCurrency(loan.monthlyInstallment)}</div>
                        <div><strong>Approved By:</strong> {loan.approvedBy || 'N/A'}</div>
                        <div><strong>Approved Date:</strong> {loan.approvedDate ? Utils.formatDate(loan.approvedDate) : 'N/A'}</div>
                      </div>
                      {loan.notes && (
                        <div className="expanded-notes"><strong>Notes:</strong> {loan.notes}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {filteredLoans.length > 0 && (
          <div className="loan-pagination">
            <div className="loan-pagination-info">
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredLoans.length)} of {filteredLoans.length} loans
            </div>
            <div className="loan-pagination-controls">
              <div className="loan-pagination-items">
                <span>Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="loan-pagination-select"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="loan-pagination-buttons">
                <button 
                  className="loan-page-btn" 
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft size={16} />
                </button>
                <button 
                  className="loan-page-btn" 
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                
                {getPageNumbers().map(page => (
                  <button
                    key={page}
                    className={`loan-page-btn ${page === currentPage ? 'active' : ''}`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
                
                <button 
                  className="loan-page-btn" 
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
                <button 
                  className="loan-page-btn" 
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER REPAYMENTS (with Pagination)
  // ============================================
  const renderRepayments = () => {
    // Pagination for repayments
    const [repaymentPage, setRepaymentPage] = useState(1);
    const [repaymentItemsPerPage, setRepaymentItemsPerPage] = useState(10);
    
    const repaymentTotalPages = Math.ceil(repayments.length / repaymentItemsPerPage);
    const paginatedRepayments = useMemo(() => {
      const startIndex = (repaymentPage - 1) * repaymentItemsPerPage;
      const endIndex = startIndex + repaymentItemsPerPage;
      return repayments.slice(startIndex, endIndex);
    }, [repayments, repaymentPage, repaymentItemsPerPage]);

    useEffect(() => {
      setRepaymentPage(1);
    }, [selectedLoanId]);

    const getRepaymentPageNumbers = () => {
      const pages = [];
      const maxVisible = 5;
      let start = Math.max(1, repaymentPage - 2);
      let end = Math.min(repaymentTotalPages, start + maxVisible - 1);

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    };

    return (
      <div className="repayments-container">
        <div className="repayments-header">
          <h3><Receipt size={20} /> Repayment History</h3>
          <div className="repayments-controls">
            <select 
              value={selectedLoanId} 
              onChange={(e) => {
                setSelectedLoanId(e.target.value);
                const loan = loans.find(l => l.id === e.target.value);
                setSelectedLoan(loan);
                if (e.target.value) {
                  loadRepaymentsForLoan(e.target.value);
                } else {
                  loadAllRepayments();
                }
                setRepaymentPage(1);
              }}
              className="loan-select"
            >
              <option value="">All Loans</option>
              {loans.map(loan => (
                <option key={loan.id} value={loan.id}>
                  {loan.loanNumber} - {loan.employeeName}
                </option>
              ))}
            </select>
            <button 
              className="loan-btn-secondary" 
              onClick={() => {
                setViewMode('loans');
                setRepayments([]);
                isRepaymentsLoaded.current = false;
                setRepaymentPage(1);
              }}
            >
              Back to Loans
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
              <p>No repayments recorded for the selected loan.</p>
            </div>
          ) : (
            <>
              <table className="repayments-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Loan #</th>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRepayments.map((repayment, index) => {
                    const loan = loans.find(l => l.id === repayment.loanId);
                    const realIndex = (repaymentPage - 1) * repaymentItemsPerPage + index + 1;
                    return (
                      <tr key={repayment.id}>
                        <td>{realIndex}</td>
                        <td>{loan?.loanNumber || 'N/A'}</td>
                        <td>{loan?.employeeName || 'Unknown'}</td>
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

              {/* Repayment Pagination */}
              {repayments.length > repaymentItemsPerPage && (
                <div className="loan-pagination">
                  <div className="loan-pagination-info">
                    Showing {((repaymentPage - 1) * repaymentItemsPerPage) + 1} - {Math.min(repaymentPage * repaymentItemsPerPage, repayments.length)} of {repayments.length} repayments
                  </div>
                  <div className="loan-pagination-controls">
                    <div className="loan-pagination-items">
                      <span>Show:</span>
                      <select
                        value={repaymentItemsPerPage}
                        onChange={(e) => {
                          setRepaymentItemsPerPage(Number(e.target.value));
                          setRepaymentPage(1);
                        }}
                        className="loan-pagination-select"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                    <div className="loan-pagination-buttons">
                      <button 
                        className="loan-page-btn" 
                        onClick={() => setRepaymentPage(1)}
                        disabled={repaymentPage === 1}
                      >
                        <ChevronsLeft size={16} />
                      </button>
                      <button 
                        className="loan-page-btn" 
                        onClick={() => setRepaymentPage(repaymentPage - 1)}
                        disabled={repaymentPage === 1}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      
                      {getRepaymentPageNumbers().map(page => (
                        <button
                          key={page}
                          className={`loan-page-btn ${page === repaymentPage ? 'active' : ''}`}
                          onClick={() => setRepaymentPage(page)}
                        >
                          {page}
                        </button>
                      ))}
                      
                      <button 
                        className="loan-page-btn" 
                        onClick={() => setRepaymentPage(repaymentPage + 1)}
                        disabled={repaymentPage === repaymentTotalPages}
                      >
                        <ChevronRight size={16} />
                      </button>
                      <button 
                        className="loan-page-btn" 
                        onClick={() => setRepaymentPage(repaymentTotalPages)}
                        disabled={repaymentPage === repaymentTotalPages}
                      >
                        <ChevronsRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER LOAN TYPES
  // ============================================
  const renderLoanTypes = () => {
    return (
      <div className="types-container">
        <div className="types-header">
          <h3><Tag size={20} /> Loan Types</h3>
          <button className="loan-btn-primary" onClick={() => { resetTypeForm(); setShowTypeForm(true); }}>
            <Plus size={16} /> Add Loan Type
          </button>
        </div>

        <div className="types-grid">
          {loanTypes.length === 0 ? (
            <div className="empty-state">
              <Tag size={48} />
              <h3>No Loan Types</h3>
              <p>Add loan types to categorize loans.</p>
            </div>
          ) : (
            loanTypes.map(type => (
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
                    <div className="detail-item">
                      <span className="label">Interest Rate:</span>
                      <span>{type.interestRate || 0}%</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Default Tenure:</span>
                      <span>{type.defaultTenure || 6} months</span>
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

  // ============================================
  // RENDER FORM MODAL
  // ============================================
  const renderFormModal = () => {
    const selectedEmployee = data.workers?.find(w => w.id === formData.employeeId);
    const employeeSalary = selectedEmployee ? getEmployeeSalary(selectedEmployee.id) : 0;
    const amount = parseFloat(formData.amount) || 0;
    const tenure = parseInt(formData.tenureMonths) || 6;
    const interest = parseFloat(formData.interestRate) || 0;
    
    const monthlyInstallment = tenure > 0 ? (amount + (amount * interest / 100)) / tenure : 0;
    const isExceedingSalary = monthlyInstallment > employeeSalary;

    return (
      <div className="loan-modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
        <div className="loan-modal-content loan-form-modal" onClick={e => e.stopPropagation()}>
          <div className="loan-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="loan-modal-header-left">
              <Plus size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>New Loan</h3>
            </div>
            <button className="loan-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="loan-modal-body">
            <form onSubmit={(e) => {
              e.preventDefault();
              createLoan(formData);
            }}>
              <div className="loan-form-row">
                <div className="loan-form-group">
                  <label><User size={14} /> Employee <span className="loan-required">*</span></label>
                  <select
                    value={formData.employeeId}
                    onChange={e => setFormData({ ...formData, employeeId: e.target.value })}
                    required
                    className="loan-form-select"
                  >
                    <option value="">Select Employee</option>
                    {data.workers?.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.name} - {Utils.formatCurrency(getEmployeeSalary(w.id))}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="loan-form-group">
                  <label><Tag size={14} /> Loan Type <span className="loan-required">*</span></label>
                  <select
                    value={formData.loanTypeId}
                    onChange={e => {
                      const type = loanTypes.find(t => t.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        loanTypeId: e.target.value,
                        interestRate: type?.interestRate?.toString() || '0',
                        tenureMonths: type?.defaultTenure?.toString() || '6'
                      });
                    }}
                    required
                    className="loan-form-select"
                  >
                    <option value="">Select Type</option>
                    {loanTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="loan-form-row">
                <div className="loan-form-group">
                  <label><DollarSign size={14} /> Loan Amount <span className="loan-required">*</span></label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    required
                    placeholder="0.000"
                    max={employeeSalary * 2}
                    className="loan-form-input"
                  />
                </div>
                <div className="loan-form-group">
                  <label><Calendar size={14} /> Loan Date <span className="loan-required">*</span></label>
                  <input
                    type="date"
                    value={formData.loanDate}
                    onChange={e => setFormData({ ...formData, loanDate: e.target.value })}
                    required
                    className="loan-form-input"
                  />
                </div>
              </div>

              <div className="loan-form-row">
                <div className="loan-form-group">
                  <label><Timer size={14} /> Tenure (months) <span className="loan-required">*</span></label>
                  <input
                    type="number"
                    value={formData.tenureMonths}
                    onChange={e => setFormData({ ...formData, tenureMonths: e.target.value })}
                    required
                    placeholder="6"
                    className="loan-form-input"
                  />
                </div>
                <div className="loan-form-group">
                  <label><Percent size={14} /> Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.interestRate}
                    onChange={e => setFormData({ ...formData, interestRate: e.target.value })}
                    placeholder="0"
                    className="loan-form-input"
                  />
                </div>
              </div>

              {formData.employeeId && parseFloat(formData.amount) > 0 && (
                <div className="loan-salary-info">
                  <div className="loan-salary-row">
                    <span>Monthly Salary:</span>
                    <strong>{Utils.formatCurrency(employeeSalary)}</strong>
                  </div>
                  <div className="loan-salary-row">
                    <span>Monthly Installment:</span>
                    <strong style={{ color: isExceedingSalary ? '#ef4444' : '#f59e0b' }}>
                      {Utils.formatCurrency(monthlyInstallment)}
                    </strong>
                  </div>
                  <div className="loan-salary-row">
                    <span>Net Salary After Deduction:</span>
                    <strong style={{ color: employeeSalary - monthlyInstallment < 0 ? '#ef4444' : '#22c55e' }}>
                      {Utils.formatCurrency(employeeSalary - monthlyInstallment)}
                    </strong>
                  </div>
                  {isExceedingSalary && (
                    <div className="loan-warning-message">
                      <AlertCircle size={16} /> Installment exceeds monthly salary!
                    </div>
                  )}
                </div>
              )}

              <div className="loan-form-group">
                <label><FileText size={14} /> Purpose</label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={e => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Purpose of loan"
                  className="loan-form-input"
                />
              </div>

              <div className="loan-form-group">
                <label><FileText size={14} /> Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows="2"
                  className="loan-form-textarea"
                />
              </div>

              <div className="loan-form-group">
                <label><UserCheck size={14} /> Approved By</label>
                <input
                  type="text"
                  value={formData.approvedBy}
                  onChange={e => setFormData({ ...formData, approvedBy: e.target.value })}
                  placeholder="Approver name"
                  className="loan-form-input"
                />
              </div>

              <div className="loan-form-actions">
                <button 
                  type="submit" 
                  className="loan-btn-primary" 
                  disabled={loading || (employeeSalary - monthlyInstallment < 0 && employeeSalary > 0)}
                >
                  <Save size={16} /> {loading ? 'Saving...' : 'Issue Loan'}
                </button>
                <button type="button" className="loan-btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER REPAYMENT FORM MODAL
  // ============================================
  const renderRepaymentFormModal = () => {
    if (!selectedLoan) return null;

    return (
      <div className="loan-modal-overlay" onClick={() => { setShowRepaymentForm(false); resetRepaymentForm(); }}>
        <div className="loan-modal-content loan-form-modal" onClick={e => e.stopPropagation()}>
          <div className="loan-modal-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <div className="loan-modal-header-left">
              <Receipt size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Record Repayment</h3>
            </div>
            <button className="loan-modal-close" onClick={() => { setShowRepaymentForm(false); resetRepaymentForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="loan-modal-body">
            <div className="loan-repayment-info">
              <div className="loan-repayment-row">
                <span>Loan:</span>
                <strong>{selectedLoan.loanNumber}</strong>
              </div>
              <div className="loan-repayment-row">
                <span>Employee:</span>
                <strong>{selectedLoan.employeeName}</strong>
              </div>
              <div className="loan-repayment-row">
                <span>Remaining Balance:</span>
                <strong style={{ color: '#f59e0b' }}>{Utils.formatCurrency(selectedLoan.remainingBalance)}</strong>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              recordRepayment(selectedLoan.id, repaymentForm);
            }}>
              <div className="loan-form-row">
                <div className="loan-form-group">
                  <label><DollarSign size={14} /> Payment Amount <span className="loan-required">*</span></label>
                  <input
                    type="number"
                    step="0.001"
                    value={repaymentForm.amount}
                    onChange={e => setRepaymentForm({ ...repaymentForm, amount: e.target.value })}
                    required
                    placeholder="0.000"
                    max={selectedLoan.remainingBalance}
                    className="loan-form-input"
                  />
                  <small className="loan-hint">Max: {Utils.formatCurrency(selectedLoan.remainingBalance)}</small>
                </div>
                <div className="loan-form-group">
                  <label><Calendar size={14} /> Payment Date <span className="loan-required">*</span></label>
                  <input
                    type="date"
                    value={repaymentForm.paymentDate}
                    onChange={e => setRepaymentForm({ ...repaymentForm, paymentDate: e.target.value })}
                    required
                    className="loan-form-input"
                  />
                </div>
              </div>

              <div className="loan-form-row">
                <div className="loan-form-group">
                  <label><CreditCard size={14} /> Payment Method</label>
                  <select
                    value={repaymentForm.paymentMethod}
                    onChange={e => setRepaymentForm({ ...repaymentForm, paymentMethod: e.target.value })}
                    className="loan-form-select"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="salary_deduction">Salary Deduction</option>
                  </select>
                </div>
                <div className="loan-form-group">
                  <label><FileText size={14} /> Reference Number</label>
                  <input
                    type="text"
                    value={repaymentForm.referenceNumber}
                    onChange={e => setRepaymentForm({ ...repaymentForm, referenceNumber: e.target.value })}
                    placeholder="Reference/Cheque #"
                    className="loan-form-input"
                  />
                </div>
              </div>

              <div className="loan-form-group">
                <label><FileText size={14} /> Notes</label>
                <input
                  type="text"
                  value={repaymentForm.notes}
                  onChange={e => setRepaymentForm({ ...repaymentForm, notes: e.target.value })}
                  placeholder="Additional notes"
                  className="loan-form-input"
                />
              </div>

              <div className="loan-form-actions">
                <button type="submit" className="loan-btn-primary" disabled={loading}>
                  <Save size={16} /> {loading ? 'Processing...' : 'Record Payment'}
                </button>
                <button type="button" className="loan-btn-secondary" onClick={() => { setShowRepaymentForm(false); resetRepaymentForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER TYPE FORM MODAL
  // ============================================
  const renderTypeFormModal = () => {
    return (
      <div className="loan-modal-overlay" onClick={() => { setShowTypeForm(false); resetTypeForm(); }}>
        <div className="loan-modal-content loan-form-modal" onClick={e => e.stopPropagation()}>
          <div className="loan-modal-header" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
            <div className="loan-modal-header-left">
              <Tag size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>New Loan Type</h3>
            </div>
            <button className="loan-modal-close" onClick={() => { setShowTypeForm(false); resetTypeForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="loan-modal-body">
            <form onSubmit={(e) => {
              e.preventDefault();
              createLoanType(typeForm);
            }}>
              <div className="loan-form-group">
                <label>Name <span className="loan-required">*</span></label>
                <input
                  type="text"
                  value={typeForm.name}
                  onChange={e => setTypeForm({ ...typeForm, name: e.target.value })}
                  required
                  placeholder="Loan type name"
                  className="loan-form-input"
                />
              </div>

              <div className="loan-form-group">
                <label>Description</label>
                <textarea
                  value={typeForm.description}
                  onChange={e => setTypeForm({ ...typeForm, description: e.target.value })}
                  placeholder="Description"
                  rows="2"
                  className="loan-form-textarea"
                />
              </div>

              <div className="loan-form-row">
                <div className="loan-form-group">
                  <label><DollarSign size={14} /> Max Amount (BD)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={typeForm.maxAmount}
                    onChange={e => setTypeForm({ ...typeForm, maxAmount: e.target.value })}
                    placeholder="0.000"
                    className="loan-form-input"
                  />
                </div>
                <div className="loan-form-group">
                  <label><Percent size={14} /> Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={typeForm.interestRate}
                    onChange={e => setTypeForm({ ...typeForm, interestRate: e.target.value })}
                    placeholder="0"
                    className="loan-form-input"
                  />
                </div>
              </div>

              <div className="loan-form-group">
                <label><Timer size={14} /> Default Tenure (months)</label>
                <input
                  type="number"
                  value={typeForm.defaultTenure}
                  onChange={e => setTypeForm({ ...typeForm, defaultTenure: e.target.value })}
                  placeholder="6"
                  className="loan-form-input"
                />
              </div>

              <div className="loan-form-actions">
                <button type="submit" className="loan-btn-primary" disabled={loading}>
                  <Save size={16} /> {loading ? 'Saving...' : 'Create'}
                </button>
                <button type="button" className="loan-btn-secondary" onClick={() => { setShowTypeForm(false); resetTypeForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER DEDUCTION MODAL
  // ============================================
  const renderDeductionModal = () => {
    const [month, setMonth] = useState(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    const activeLoans = loans.filter(l => l.status === 'active');
    const totalDeduction = activeLoans.reduce((sum, l) => sum + (l.monthlyInstallment || 0), 0);

    return (
      <div className="loan-modal-overlay" onClick={() => setShowDeductionModal(false)}>
        <div className="loan-modal-content loan-form-modal" onClick={e => e.stopPropagation()}>
          <div className="loan-modal-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <div className="loan-modal-header-left">
              <Zap size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Process Salary Deductions</h3>
            </div>
            <button className="loan-modal-close" onClick={() => setShowDeductionModal(false)}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="loan-modal-body">
            <div className="deduction-info">
              <p>Process salary deductions for all active loans.</p>
              
              <div className="loan-form-group">
                <label><Calendar size={14} /> Select Month <span className="loan-required">*</span></label>
                <input
                  type="month"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  required
                  className="loan-form-input"
                />
              </div>

              <div className="deduction-summary">
                <div className="summary-item">
                  <span>Active Loans:</span>
                  <strong>{activeLoans.length}</strong>
                </div>
                <div className="summary-item">
                  <span>Total Monthly Deduction:</span>
                  <strong style={{ color: '#f59e0b' }}>{Utils.formatCurrency(totalDeduction)}</strong>
                </div>
              </div>

              {activeLoans.length > 0 && (
                <div className="deduction-loans-list">
                  <h4>Loans to process:</h4>
                  {activeLoans.map(loan => (
                    <div key={loan.id} className="deduction-loan-item">
                      <span>{loan.loanNumber} - {loan.employeeName}</span>
                      <span>{Utils.formatCurrency(loan.monthlyInstallment)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="loan-form-actions">
              <button 
                className="loan-btn-primary" 
                onClick={() => processDeductions(month)}
                disabled={loading || !month || activeLoans.length === 0}
              >
                <Zap size={16} /> {loading ? 'Processing...' : 'Process Deductions'}
              </button>
              <button className="loan-btn-secondary" onClick={() => setShowDeductionModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER DETAIL MODAL
  // ============================================
  const renderDetailModal = () => {
    if (!selectedLoan) return null;
    
    const employeeSalary = getEmployeeSalary(selectedLoan.employeeId);
    const monthlyInstallment = selectedLoan.monthlyInstallment || 0;

    return (
      <div className="loan-modal-overlay" onClick={() => setShowDetailModal(false)}>
        <div className="loan-modal-content loan-detail-modal" onClick={e => e.stopPropagation()}>
          <div className="loan-modal-header" style={{ background: 'linear-gradient(135deg, #1a2332, #2a3a4a)' }}>
            <div className="loan-modal-header-left">
              <FileText size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Loan Details</h3>
            </div>
            <button className="loan-modal-close" onClick={() => setShowDetailModal(false)}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="loan-modal-body">
            <div className="detail-grid">
              <div className="detail-section">
                <h4><User size={14} /> Basic Information</h4>
                <div className="detail-row">
                  <span className="label">Loan Number:</span>
                  <span className="value">{selectedLoan.loanNumber}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Employee:</span>
                  <span className="value">{selectedLoan.employeeName}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Loan Type:</span>
                  <span className="value">{selectedLoan.loanTypeName}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Status:</span>
                  <span className="value">{getStatusBadge(selectedLoan.status)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Amount:</span>
                  <span className="value amount">{Utils.formatCurrency(selectedLoan.amount)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Date:</span>
                  <span className="value">{Utils.formatDate(selectedLoan.loanDate)}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4><Calculator size={14} /> Loan Details</h4>
                <div className="detail-row">
                  <span className="label">Interest Rate:</span>
                  <span className="value">{selectedLoan.interestRate || 0}%</span>
                </div>
                <div className="detail-row">
                  <span className="label">Tenure:</span>
                  <span className="value">{selectedLoan.tenureMonths} months</span>
                </div>
                <div className="detail-row">
                  <span className="label">Monthly Installment:</span>
                  <span className="value" style={{ color: '#f59e0b' }}>
                    {Utils.formatCurrency(selectedLoan.monthlyInstallment)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Remaining Balance:</span>
                  <span className="value">{Utils.formatCurrency(selectedLoan.remainingBalance)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Paid Amount:</span>
                  <span className="value">{Utils.formatCurrency(selectedLoan.paidAmount)}</span>
                </div>
              </div>

              <div className="detail-section full-width">
                <h4><Wallet size={14} /> Salary & Deduction Details</h4>
                <div className="detail-row">
                  <span className="label">Monthly Salary:</span>
                  <span className="value">{Utils.formatCurrency(employeeSalary)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Installment:</span>
                  <span className="value" style={{ color: '#f59e0b' }}>
                    {Utils.formatCurrency(monthlyInstallment)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Net Salary:</span>
                  <span className="value" style={{ color: employeeSalary - monthlyInstallment < 0 ? '#ef4444' : '#22c55e' }}>
                    {Utils.formatCurrency(employeeSalary - monthlyInstallment)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Auto Deduction:</span>
                  <span className="value">
                    {selectedLoan.autoDeduct ? 
                      <CheckCircle size={14} color="#22c55e" /> : 
                      <X size={14} color="#6b7280" />
                    }
                  </span>
                </div>
              </div>

              <div className="detail-section full-width">
                <h4><FileText size={14} /> Additional Information</h4>
                {selectedLoan.purpose && (
                  <div className="detail-row">
                    <span className="label">Purpose:</span>
                    <span className="value">{selectedLoan.purpose}</span>
                  </div>
                )}
                {selectedLoan.notes && (
                  <div className="detail-row">
                    <span className="label">Notes:</span>
                    <span className="value">{selectedLoan.notes}</span>
                  </div>
                )}
                {selectedLoan.approvedBy && (
                  <div className="detail-row">
                    <span className="label">Approved By:</span>
                    <span className="value">{selectedLoan.approvedBy}</span>
                  </div>
                )}
                {selectedLoan.approvedDate && (
                  <div className="detail-row">
                    <span className="label">Approved Date:</span>
                    <span className="value">{Utils.formatDate(selectedLoan.approvedDate)}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">Created:</span>
                  <span className="value">{Utils.formatDateTime(selectedLoan.createdAt)}</span>
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
    <div className="loan-management-modern">
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <Landmark size={28} />
            <span className="header-badge">Loans</span>
          </div>
          <div>
            <h2>Loan Management</h2>
            <p className="header-subtitle">Manage employee loans with automatic salary deduction</p>
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
          className="loan-card-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 9999
          }}
        >
          <div className="loan-tooltip-header">
            <strong>{cardDetails[hoveredCard].title}</strong>
          </div>
          <div className="loan-tooltip-body">
            {cardDetails[hoveredCard].details.map((detail, idx) => (
              <div key={idx} className="loan-tooltip-row">
                <span className="loan-tooltip-label">{detail.label}</span>
                <span className="loan-tooltip-value">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="error-message-modern"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="success-message-modern"><CheckCircle size={16} /> {success}</div>}

      <div className="view-tabs-modern">
        <button
          className={`tab-btn ${viewMode === 'loans' ? 'active' : ''}`}
          onClick={() => {
            setViewMode('loans');
            setRepayments([]);
            isRepaymentsLoaded.current = false;
          }}
        >
          <FileText size={16} /> Loans
        </button>
        <button
          className={`tab-btn ${viewMode === 'repayments' ? 'active' : ''}`}
          onClick={() => {
            setViewMode('repayments');
            if (selectedLoanId) {
              loadRepaymentsForLoan(selectedLoanId);
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
          <Tag size={16} /> Loan Types
        </button>
      </div>

      {isLoading ? (
        <div className="loading-state-modern">
          <div className="loading-spinner-modern"></div>
          <span>Loading...</span>
        </div>
      ) : (
        <>
          {viewMode === 'loans' && renderLoansList()}
          {viewMode === 'repayments' && renderRepayments()}
          {viewMode === 'types' && renderLoanTypes()}
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