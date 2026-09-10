// src/components/ExpensesManagerComponent.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Edit,
  Trash2,
  DollarSign,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  PieChart as PieChartIcon,
  BarChart3,
  Plus,
  Save,
  X,
  Filter,
  ChevronDown,
  Info,
  Search,
  FileText,
  AlertCircle,
  CheckCircle,
  LayoutDashboard,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Star,
  Gauge,
  Timer,
  Activity,
  Zap,
  Shield,
  Crown,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import Utils from '../utils/Utils';
import './ExpensesManager.css';

const ExpensesManagerComponent = ({
  data,
  addExpense,
  updateExpense,
  deleteExpense,
  refreshData,
  addMonthlyOverhead,
  updateMonthlyOverhead,
  deleteMonthlyOverhead
}) => {
  // ============================================
  // STATE
  // ============================================
  const [editingId, setEditingId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [formData, setFormData] = useState({
    date: Utils.today(),
    siteId: '',
    category: '',
    description: '',
    amount: '',
    quantity: '1',
    unit: '',
    isRecurring: false,
    recurrenceType: '',
    note: '',
    month: selectedMonth
  });
  const [filter, setFilter] = useState({ site: '', category: '', dateFrom: '', dateTo: '' });
  const [activeChart, setActiveChart] = useState('pie');
  const [showMonthlyOHForm, setShowMonthlyOHForm] = useState(false);
  const [monthlyOHData, setMonthlyOHData] = useState({
    month: '',
    category: '',
    amount: '',
    siteId: '',
    sitesCount: '1',
    workingDays: '26',
    notes: ''
  });
  const [editingOHId, setEditingOHId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSiteTooltip, setShowSiteTooltip] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Date filter states
  const [dateFilterType, setDateFilterType] = useState('thisMonth');
  const [customStartDate, setCustomStartDate] = useState(Utils.today());
  const [customEndDate, setCustomEndDate] = useState(Utils.today());
  const [showDateFilterDropdown, setShowDateFilterDropdown] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ============================================
  // CONSTANTS
  // ============================================
  const overheadCategories = [
    { id: 'electricity', label: 'Electricity Bill', icon: '⚡' },
    { id: 'lmra', label: 'LMRA Fees', icon: '🏛️' },
    { id: 'gossi', label: 'Gossi Fees', icon: '🍽️' },
    { id: 'car_patrol', label: 'Car Patrol', icon: '🚗' },
    { id: 'office_rent', label: 'Office Rent', icon: '🏢' },
    { id: 'water', label: 'Water Bill', icon: '💧' },
    { id: 'internet', label: 'Internet Bill', icon: '🌐' },
    { id: 'cleaning', label: 'Cleaning Services', icon: '🧹' },
    { id: 'security', label: 'Security Services', icon: '🔒' },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
    { id: 'insurance', label: 'Insurance', icon: '🛡️' },
    { id: 'other', label: 'Other Overhead', icon: '📌' }
  ];

  const expenseCategories = [
    { id: 'electricity', label: 'Electricity Bill', icon: '⚡', color: '#f59e0b' },
    { id: 'lmra', label: 'LMRA Fees', icon: '🏛️', color: '#8b5cf6' },
    { id: 'gossi', label: 'Gossi Fees', icon: '🍽️', color: '#ec4899' },
    { id: 'car_patrol', label: 'Car Patrol', icon: '🚗', color: '#3b82f6' },
    { id: 'office_rent', label: 'Office Rent', icon: '🏢', color: '#14b8a6' },
    { id: 'water', label: 'Water Bill', icon: '💧', color: '#06b6d4' },
    { id: 'internet', label: 'Internet Bill', icon: '🌐', color: '#8b5cf6' },
    { id: 'cleaning', label: 'Cleaning Services', icon: '🧹', color: '#22c55e' },
    { id: 'security', label: 'Security Services', icon: '🔒', color: '#ef4444' },
    { id: 'material', label: 'Material', icon: '📦', color: '#22c55e' },
    { id: 'equipment', label: 'Equipment', icon: '🔧', color: '#f97316' },
    { id: 'transport', label: 'Transport', icon: '🚚', color: '#06b6d4' },
    { id: 'labour', label: 'Labour', icon: '👷', color: '#a855f7' },
    { id: 'maintenance', label: 'Maintenance', icon: '🛠️', color: '#ef4444' },
    { id: 'insurance', label: 'Insurance', icon: '🛡️', color: '#10b981' },
    { id: 'tax', label: 'Tax', icon: '📋', color: '#f43f5e' },
    { id: 'other', label: 'Other', icon: '📌', color: '#6b7280' }
  ];

  const recurrenceTypes = ['daily', 'weekly', 'monthly'];
  const CHART_COLORS = ['#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6', '#22c55e', '#f97316', '#06b6d4', '#a855f7', '#ef4444', '#10b981', '#f43f5e', '#6b7280'];
  const overheadCategoriesList = ['Electricity Bill', 'LMRA Fees', 'Gossi Fees', 'Car Patrol', 'Office Rent', 'Water Bill', 'Internet Bill', 'Cleaning Services', 'Security Services', 'Maintenance', 'Insurance', 'Other Overhead'];

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
  // MEMOIZED DATA
  // ============================================
  const getDateRange = useMemo(() => {
    const today = new Date();
    const todayStr = Utils.today();
    let start = new Date(today);
    let end = new Date(today);

    switch (dateFilterType) {
      case 'today':
        return { start: todayStr, end: todayStr };
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        const yStr = start.toISOString().split('T')[0];
        return { start: yStr, end: yStr };
      case 'thisWeek':
        start.setDate(start.getDate() - 7);
        return { start: start.toISOString().split('T')[0], end: todayStr };
      case 'thisMonth':
        start.setDate(1);
        return { start: start.toISOString().split('T')[0], end: todayStr };
      case 'lastMonth':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        };
      case 'thisYear':
        start.setMonth(0, 1);
        return { start: start.toISOString().split('T')[0], end: todayStr };
      case 'custom':
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: todayStr, end: todayStr };
    }
  }, [dateFilterType, customStartDate, customEndDate]);

  const monthlyOverheadData = useMemo(() => {
    return Array.isArray(data?.monthlyOverhead) ? data.monthlyOverhead : [];
  }, [data?.monthlyOverhead]);

  const expensesData = useMemo(() => {
    return Array.isArray(data?.expenses) ? data.expenses : [];
  }, [data?.expenses]);

  const sitesData = useMemo(() => {
    return Array.isArray(data?.sites) ? data.sites : [];
  }, [data?.sites]);

  const activeSiteNames = useMemo(() => {
    return sitesData.filter(s => s.active !== false).map(s => s.name).join(', ');
  }, [sitesData]);

  // ============================================
  // CALCULATIONS
  // ============================================
  const monthlyOverheadSummary = useMemo(() => {
    const monthExpenses = monthlyOverheadData.filter(e => e.month === selectedMonth);

    const grouped = {};
    monthExpenses.forEach(exp => {
      const key = exp.category + (exp.siteId ? `_${exp.siteId}` : '_all');
      if (!grouped[key]) {
        grouped[key] = {
          total: 0,
          count: 0,
          items: [],
          category: exp.category,
          siteId: exp.siteId,
          siteName: exp.siteName || 'All Sites'
        };
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

    return {
      total: totalAmount,
      siteCount,
      workingDays,
      perSite,
      perDayPerSite,
      grouped,
      count: monthExpenses.length
    };
  }, [monthlyOverheadData, selectedMonth, sitesData]);

  const monthlyOverheadBreakdown = useMemo(() => {
    const monthExpenses = monthlyOverheadData.filter(e => e.month === selectedMonth);

    if (monthExpenses.length === 0) {
      return [];
    }

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
          siteGroups[key] = {
            siteId: item.siteId,
            siteName: item.siteName || 'All Sites',
            total: 0,
            count: 0,
            items: []
          };
        }
        siteGroups[key].total += item.amount || 0;
        siteGroups[key].count += 1;
        siteGroups[key].items.push(item);
      });

      const total = items.reduce((sum, e) => sum + (e.amount || 0), 0);
      const perSite = siteCount > 0 ? total / siteCount : 0;
      const perDayPerSite = workingDays > 0 ? perSite / workingDays : 0;

      const siteNames = Object.values(siteGroups)
        .filter(g => g.siteId)
        .map(g => g.siteName)
        .join(', ');

      const ids = items.map(i => i.id).filter(id => id);

      result.push({
        id: ids.length > 0 ? ids.join(',') : null,
        ids: ids,
        category: cat,
        amount: total,
        siteCount,
        perSite,
        workingDays,
        perDayPerSite,
        count: items.length,
        color: expenseCategories.find(c => c.label === cat)?.color || '#6b7280',
        siteGroups: Object.values(siteGroups),
        siteNames: siteNames || 'All Sites',
        items: items
      });
    });

    result.sort((a, b) => b.amount - a.amount);
    return result;
  }, [monthlyOverheadData, selectedMonth, sitesData]);

  const regularExpenses = useMemo(() => {
    const { start, end } = getDateRange;

    return expensesData.filter(e => {
      if (overheadCategoriesList.includes(e.category)) return false;
      if (filter.site && e.siteId !== filter.site) return false;
      if (filter.category && e.category !== filter.category) return false;
      if (start && e.date < start) return false;
      if (end && e.date > end) return false;
      return true;
    }).sort((a, b) => b.date?.localeCompare(a.date) || 0);
  }, [expensesData, filter, getDateRange]);

  const pieChartData = useMemo(() => {
    return monthlyOverheadBreakdown
      .filter(item => item.amount > 0)
      .map(item => ({
        name: item.category,
        value: item.amount,
        color: item.color,
        count: item.count,
        id: item.id,
        siteNames: item.siteNames
      }));
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
        label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        total: total,
        count: count
      });
    }

    return months;
  }, [monthlyOverheadData, selectedMonth]);

  const filteredExpenses = useMemo(() => {
    const { start, end } = getDateRange;

    return expensesData.filter(expense => {
      if (overheadCategoriesList.includes(expense.category)) return false;
      if (filter.site && expense.siteId !== filter.site) return false;
      if (filter.category && expense.category !== filter.category) return false;
      if (start && expense.date < start) return false;
      if (end && expense.date > end) return false;
      return true;
    }).sort((a, b) => b.date?.localeCompare(a.date) || 0);
  }, [expensesData, filter, getDateRange]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [filteredExpenses]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredExpenses.slice(startIndex, endIndex);
  }, [filteredExpenses, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, dateFilterType]);

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
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const totalOverhead = monthlyOverheadSummary.total;
  const perSite = monthlyOverheadSummary.perSite;
  const perDayPerSite = monthlyOverheadSummary.perDayPerSite;
  const totalRegExpenses = totalExpenses;

  const cardDetails = {
    overhead: {
      title: 'Total Overhead',
      details: [
        { label: 'Total Overhead', value: Utils.formatCurrency(totalOverhead) },
        { label: 'Per Site', value: Utils.formatCurrency(perSite) },
        { label: 'Per Day/Site', value: Utils.formatCurrency(perDayPerSite) },
        { label: 'Active Sites', value: sitesData.length }
      ]
    },
    expenses: {
      title: 'Total Expenses',
      details: [
        { label: 'Total Expenses', value: Utils.formatCurrency(totalRegExpenses) },
        { label: 'Total Entries', value: filteredExpenses.length },
        { label: 'Date Range', value: `${getDateRange.start} - ${getDateRange.end}` },
        { label: 'Avg Expense', value: filteredExpenses.length > 0 ? Utils.formatCurrency(totalRegExpenses / filteredExpenses.length) : '0.000' }
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
  // HANDLERS
  // ============================================
  const handleMonthlyOHSubmit = async (e) => {
    e.preventDefault();
    if (!monthlyOHData.category) {
      alert('Please select a category');
      return;
    }

    setLoading(true);

    const siteId = monthlyOHData.siteId || null;
    const sitesCount = parseInt(monthlyOHData.sitesCount) || 1;
    const workingDays = parseInt(monthlyOHData.workingDays) || 26;

    const ohEntry = {
      month: monthlyOHData.month || selectedMonth,
      category: monthlyOHData.category,
      amount: parseFloat(monthlyOHData.amount) || 0,
      siteId: siteId,
      sitesCount: sitesCount,
      workingDays: workingDays,
      notes: monthlyOHData.notes || ''
    };

    try {
      if (editingOHId) {
        if (updateMonthlyOverhead) {
          await updateMonthlyOverhead(editingOHId, ohEntry);
        }
        setEditingOHId(null);
      } else {
        if (addMonthlyOverhead) {
          await addMonthlyOverhead(ohEntry);
        }
      }

      await refreshData();

      setMonthlyOHData({
        month: selectedMonth,
        category: '',
        amount: '',
        siteId: '',
        sitesCount: sitesData.length > 0 ? sitesData.length.toString() : '1',
        workingDays: '26',
        notes: ''
      });
      setShowMonthlyOHForm(false);
    } catch (error) {
      console.error('Failed to save overhead:', error);
      alert('Failed to save overhead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditOverhead = (entry) => {
    setEditingOHId(entry.id);
    setMonthlyOHData({
      month: selectedMonth,
      category: entry.category,
      amount: entry.amount.toString(),
      siteId: entry.siteId || '',
      sitesCount: entry.sitesCount?.toString() || '1',
      workingDays: entry.workingDays?.toString() || '26',
      notes: entry.notes || ''
    });
    setShowMonthlyOHForm(true);
  };

  const handleDeleteOverhead = async (id) => {
    if (!id) {
      alert('Cannot delete this entry');
      return;
    }

    if (!window.confirm('Delete this overhead entry?')) return;

    try {
      setLoading(true);
      if (deleteMonthlyOverhead) {
        await deleteMonthlyOverhead(id);
      }
      await refreshData();
    } catch (error) {
      console.error('Failed to delete overhead:', error);
      alert('Failed to delete overhead. Please try again.');
    } finally {
      setLoading(false);
    }
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
    if (!formData.category) {
      alert('Please select a category');
      return;
    }

    setLoading(true);

    const expense = {
      date: formData.date,
      siteId: formData.siteId || null,
      category: formData.category,
      description: formData.description,
      amount: parseFloat(formData.amount) || 0,
      quantity: parseFloat(formData.quantity) || 1,
      unit: formData.unit,
      isRecurring: formData.isRecurring,
      recurrenceType: formData.isRecurring ? formData.recurrenceType : null,
      note: formData.note,
      month: selectedMonth
    };

    try {
      if (editingId) {
        await updateExpense(editingId, expense);
        setEditingId(null);
      } else {
        await addExpense(expense);
      }

      setFormData({
        date: Utils.today(),
        siteId: '',
        category: '',
        description: '',
        amount: '',
        quantity: '1',
        unit: '',
        isRecurring: false,
        recurrenceType: '',
        note: '',
        month: selectedMonth
      });

      await refreshData();
    } catch (error) {
      console.error('Failed to save expense:', error);
      alert('Failed to save expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetExpenseForm = () => {
    setFormData({
      date: Utils.today(),
      siteId: '',
      category: '',
      description: '',
      amount: '',
      quantity: '1',
      unit: '',
      isRecurring: false,
      recurrenceType: '',
      note: '',
      month: selectedMonth
    });
    setEditingId(null);
  };

  const openAddExpenseModal = () => {
    resetExpenseForm();
    setShowExpenseForm(true);
  };

  const openEditExpenseModal = (expense) => {
    setEditingId(expense.id);
    setFormData({
      date: expense.date,
      siteId: expense.siteId || '',
      category: expense.category,
      description: expense.description || '',
      amount: expense.amount.toString(),
      quantity: expense.quantity?.toString() || '1',
      unit: expense.unit || '',
      isRecurring: expense.isRecurring || false,
      recurrenceType: expense.recurrenceType || '',
      note: expense.note || '',
      month: selectedMonth
    });
    setShowExpenseForm(true);
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      await refreshData();
      if (paginatedExpenses.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      console.error('Failed to delete expense:', error);
      alert('Failed to delete expense. Please try again.');
    }
  };

  const getSiteName = (id) => {
    if (!id) return 'All Sites';
    const site = sitesData.find(s => s.id === id);
    return site?.name || 'Unknown Site';
  };

  const getCategoryIcon = (category) => {
    const found = expenseCategories.find(c => c.label === category || c.id === category);
    return found?.icon || '📌';
  };

  const getCategoryColor = (category) => {
    const found = expenseCategories.find(c => c.label === category || c.id === category);
    return found?.color || '#6b7280';
  };

  // ============================================
  // MODAL STATES
  // ============================================
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // ============================================
  // RENDER FUNCTIONS
  // ============================================
  const renderExpenseFormModal = () => {
    return (
      <div className="ex-modal-overlay" onClick={() => { setShowExpenseForm(false); resetExpenseForm(); }}>
        <div className="ex-modal-content ex-expense-modal" onClick={e => e.stopPropagation()}>
          <div className="ex-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
            <div className="ex-modal-header-left">
              {editingId ? <Edit size={24} color="#ffffff" /> : <Plus size={24} color="#ffffff" />}
              <h3 style={{ color: '#ffffff' }}>{editingId ? 'Edit Expense' : 'New Expense'}</h3>
            </div>
            <button className="ex-modal-close" onClick={() => { setShowExpenseForm(false); resetExpenseForm(); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="ex-modal-body">
            <form onSubmit={handleSubmit}>
              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label><Calendar size={14} /> Date <span className="ex-required">*</span></label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="ex-form-input"
                  />
                </div>
                <div className="ex-form-group">
                  <label><Building2 size={14} /> Category <span className="ex-required">*</span></label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="ex-form-select"
                  >
                    <option value="">Select Category</option>
                    {expenseCategories
                      .filter(c => !overheadCategoriesList.includes(c.label))
                      .map(cat => (
                        <option key={cat.id} value={cat.label}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label><Building2 size={14} /> Site</label>
                  <select
                    value={formData.siteId}
                    onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                    className="ex-form-select"
                  >
                    <option value="">All Sites</option>
                    {sitesData.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                <div className="ex-form-group">
                  <label><DollarSign size={14} /> Amount (BD) <span className="ex-required">*</span></label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.000"
                    required
                    className="ex-form-input"
                  />
                </div>
              </div>

              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label><FileText size={14} /> Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Expense description"
                    className="ex-form-input"
                  />
                </div>
                <div className="ex-form-group">
                  <label><FileText size={14} /> Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="1"
                    className="ex-form-input"
                  />
                </div>
              </div>

              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label><FileText size={14} /> Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., kg, m2, hours"
                    className="ex-form-input"
                  />
                </div>
                <div className="ex-form-group">
                  <label><FileText size={14} /> Note</label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                    placeholder="Additional notes"
                    className="ex-form-input"
                  />
                </div>
              </div>

              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label>Recurring</label>
                  <div className="ex-checkbox-group">
                    <input
                      type="checkbox"
                      checked={formData.isRecurring}
                      onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                    />
                    <label>Is recurring</label>
                  </div>
                </div>
                {formData.isRecurring && (
                  <div className="ex-form-group">
                    <label>Recurrence Type</label>
                    <select
                      value={formData.recurrenceType}
                      onChange={e => setFormData({ ...formData, recurrenceType: e.target.value })}
                      className="ex-form-select"
                    >
                      <option value="">Select type</option>
                      {recurrenceTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="ex-form-actions">
                <button type="submit" className="ex-btn-primary" disabled={loading}>
                  <Save size={16} /> {editingId ? 'Update Expense' : 'Add Expense'}
                </button>
                <button type="button" className="ex-btn-secondary" onClick={() => { setShowExpenseForm(false); resetExpenseForm(); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteConfirmModal = () => {
    if (!showDeleteConfirm) return null;
    return (
      <div className="ex-modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
        <div className="ex-modal-content ex-delete-modal" onClick={e => e.stopPropagation()}>
          <div className="ex-modal-header" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
            <div className="ex-modal-header-left">
              <Trash2 size={24} color="#ffffff" />
              <h3 style={{ color: '#ffffff' }}>Delete Expense</h3>
            </div>
            <button className="ex-modal-close" onClick={() => setShowDeleteConfirm(null)}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="ex-modal-body">
            <div className="ex-delete-content">
              <AlertCircle size={48} color="#dc2626" />
              <p>Are you sure you want to delete this expense?</p>
              <p className="ex-delete-subtext">This action cannot be undone.</p>
              <div className="ex-delete-actions">
                <button className="ex-btn-danger" onClick={() => {
                  handleDeleteExpense(showDeleteConfirm);
                  setShowDeleteConfirm(null);
                }}>
                  <Trash2 size={16} /> Delete
                </button>
                <button className="ex-btn-secondary" onClick={() => setShowDeleteConfirm(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER OVERHEAD MODAL
  // ============================================
  const renderOverheadFormModal = () => {
    return (
      <div className="ex-modal-overlay" onClick={() => { setShowMonthlyOHForm(false); setEditingOHId(null); }}>
        <div className="ex-modal-content ex-overhead-modal" onClick={e => e.stopPropagation()}>
          <div className="ex-modal-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <div className="ex-modal-header-left">
              {editingOHId ? <Edit size={24} color="#ffffff" /> : <Plus size={24} color="#ffffff" />}
              <h3 style={{ color: '#ffffff' }}>{editingOHId ? 'Edit Overhead' : 'New Overhead'}</h3>
            </div>
            <button className="ex-modal-close" onClick={() => { setShowMonthlyOHForm(false); setEditingOHId(null); }}>
              <X size={24} color="#ffffff" />
            </button>
          </div>
          <div className="ex-modal-body">
            <form onSubmit={handleMonthlyOHSubmit}>
              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label>Category <span className="ex-required">*</span></label>
                  <select                    value={monthlyOHData.category}
                    onChange={e => setMonthlyOHData({ ...monthlyOHData, category: e.target.value })}
                    required
                    className="ex-form-select"
                  >
                    <option value="">Select Category</option>
                    {overheadCategories.map(cat => (
                      <option key={cat.id} value={cat.label}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="ex-form-group">
                  <label>Amount (BD) <span className="ex-required">*</span></label>
                  <input
                    type="number"
                    step="0.001"
                    value={monthlyOHData.amount}
                    onChange={e => setMonthlyOHData({ ...monthlyOHData, amount: e.target.value })}
                    placeholder="0.000"
                    required
                    className="ex-form-input"
                  />
                </div>
              </div>

              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label>Apply to Site</label>
                  <select
                    value={monthlyOHData.siteId}
                    onChange={e => {
                      const val = e.target.value;
                      setMonthlyOHData({
                        ...monthlyOHData,
                        siteId: val,
                        sitesCount: val ? '1' : (sitesData.length > 0 ? sitesData.length.toString() : '1')
                      });
                    }}
                    className="ex-form-select"
                  >
                    <option value="">All Sites (Company-wide)</option>
                    {sitesData.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
                <div className="ex-form-group">
                  <label>Sites Count</label>
                  <input
                    type="number"
                    value={monthlyOHData.sitesCount}
                    onChange={e => setMonthlyOHData({ ...monthlyOHData, sitesCount: e.target.value })}
                    placeholder={sitesData.length > 0 ? sitesData.length.toString() : '1'}
                    className="ex-form-input"
                  />
                </div>
              </div>

              <div className="ex-form-row">
                <div className="ex-form-group">
                  <label>Working Days</label>
                  <input
                    type="number"
                    value={monthlyOHData.workingDays}
                    onChange={e => setMonthlyOHData({ ...monthlyOHData, workingDays: e.target.value })}
                    placeholder="26"
                    className="ex-form-input"
                  />
                </div>
                <div className="ex-form-group">
                  <label>Notes</label>
                  <input
                    type="text"
                    value={monthlyOHData.notes}
                    onChange={e => setMonthlyOHData({ ...monthlyOHData, notes: e.target.value })}
                    placeholder="Additional notes"
                    className="ex-form-input"
                  />
                </div>
              </div>

              <div className="ex-form-actions">
                <button type="submit" className="ex-btn-primary" disabled={loading}>
                  <Save size={16} /> {editingOHId ? 'Update Overhead' : 'Add Overhead'}
                </button>
                <button type="button" className="ex-btn-secondary" onClick={() => { setShowMonthlyOHForm(false); setEditingOHId(null); }}>
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
  // MAIN RENDER
  // ============================================
  if (!data) {
    return <div className="ex-loading-screen">Loading expenses data...</div>;
  }

  return (
    <div className="ex-container">
      {/* Header */}
      <div className="ex-header">
        <div className="ex-header-left">
          <div className="ex-header-icon-wrapper">
            <DollarSign size={28} />
            <span className="ex-header-badge">Expenses</span>
          </div>
          <div>
            <h2>Expense & Overhead Management</h2>
            <p className="ex-header-subtitle">Track company expenses and monthly overhead</p>
          </div>
        </div>
        <div className="ex-header-right">
          <button className="ex-btn-refresh" onClick={refreshData}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="ex-btn-primary" onClick={openAddExpenseModal}>
            <Plus size={18} /> New Expense
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="ex-stats-grid">
        <div
          className="ex-stat-card"
          onMouseEnter={(e) => handleCardHover('overhead', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="ex-stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
            <Wallet size={22} />
          </div>
          <div className="ex-stat-content">
            <span className="ex-stat-label">Total Overhead</span>
            <span className="ex-stat-value">{Utils.formatCurrencyShort(totalOverhead)}</span>
          </div>
          <div className="ex-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div
          className="ex-stat-card"
          onMouseEnter={(e) => handleCardHover('expenses', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="ex-stat-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
            <Receipt size={22} />
          </div>
          <div className="ex-stat-content">
            <span className="ex-stat-label">Total Expenses</span>
            <span className="ex-stat-value">{Utils.formatCurrencyShort(totalRegExpenses)}</span>
          </div>
          <div className="ex-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div
          className="ex-stat-card"
          onMouseEnter={(e) => handleCardHover('sites', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="ex-stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Building2 size={22} />
          </div>
          <div className="ex-stat-content">
            <span className="ex-stat-label">Active Sites</span>
            <span className="ex-stat-value">{sitesData.length}</span>
          </div>
          <div className="ex-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>

        <div
          className="ex-stat-card"
          onMouseEnter={(e) => handleCardHover('entries', e)}
          onMouseLeave={handleCardLeave}
          onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
        >
          <div className="ex-stat-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6' }}>
            <FileText size={22} />
          </div>
          <div className="ex-stat-content">
            <span className="ex-stat-label">Total Entries</span>
            <span className="ex-stat-value">{filteredExpenses.length}</span>
          </div>
          <div className="ex-stat-trend">
            <TrendingUp size={16} />
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCard && cardDetails[hoveredCard] && (
        <div
          className="ex-card-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 9999
          }}
        >
          <div className="ex-tooltip-header">
            <strong>{cardDetails[hoveredCard].title}</strong>
          </div>
          <div className="ex-tooltip-body">
            {cardDetails[hoveredCard].details.map((detail, idx) => (
              <div key={idx} className="ex-tooltip-row">
                <span className="ex-tooltip-label">{detail.label}</span>
                <span className="ex-tooltip-value">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month Selector & Filters */}
      <div className="ex-controls-bar">
        <div className="ex-controls-left">
          <Calendar size={18} />
          <label>Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="ex-month-input"
          />
        </div>
        <div className="ex-controls-right">
          <div className="ex-date-filter">
            <button
              className="ex-filter-btn"
              onClick={() => setShowDateFilterDropdown(!showDateFilterDropdown)}
            >
              <Filter size={14} />
              {dateFilterPresets.find(p => p.id === dateFilterType)?.label || 'Filter'}
              <ChevronDown size={12} />
            </button>
            {showDateFilterDropdown && (
              <div className="ex-filter-dropdown">
                {dateFilterPresets.map(preset => (
                  <button
                    key={preset.id}
                    className={`ex-filter-option ${dateFilterType === preset.id ? 'active' : ''}`}
                    onClick={() => handleDateFilterChange(preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {dateFilterType === 'custom' && (
            <div className="ex-custom-date">
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="ex-date-input"
              />
              <span>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="ex-date-input"
              />
            </div>
          )}
          <button className="ex-btn-add-overhead" onClick={() => {
            setShowMonthlyOHForm(true);
            setEditingOHId(null);
            setMonthlyOHData({
              month: selectedMonth,
              category: '',
              amount: '',
              siteId: '',
              sitesCount: sitesData.length > 0 ? sitesData.length.toString() : '1',
              workingDays: '26',
              notes: ''
            });
          }}>
            <Plus size={14} /> Add Overhead
          </button>
          <span className="ex-info-badge">Working Days: {monthlyOverheadSummary.workingDays}</span>
          <span className="ex-info-badge">Sites: {sitesData.length}</span>
        </div>
      </div>

      {/* Overhead Form (inline or modal) */}
      {showMonthlyOHForm && renderOverheadFormModal()}

      {/* Monthly Overhead Summary */}
      <div className="ex-overhead-section">
        <div className="ex-section-header">
          <h3><Wallet size={18} /> Monthly Overhead Summary — {selectedMonth}</h3>
          <span className="ex-section-count">{monthlyOverheadSummary.count} entries</span>
        </div>

        <div className="ex-summary-grid">
          <div className="ex-summary-card">
            <span className="ex-summary-label">Total Overhead</span>
            <span className="ex-summary-value" style={{ color: '#f59e0b' }}>
              {Utils.formatCurrency(monthlyOverheadSummary.total)}
            </span>
          </div>
          <div className="ex-summary-card">
            <span className="ex-summary-label">Per Site</span>
            <span className="ex-summary-value" style={{ color: '#22c55e' }}>
              {Utils.formatCurrency(monthlyOverheadSummary.perSite)}
            </span>
          </div>
          <div className="ex-summary-card">
            <span className="ex-summary-label">Per Day / Site</span>
            <span className="ex-summary-value" style={{ color: '#3b82f6' }}>
              {Utils.formatCurrency(monthlyOverheadSummary.perDayPerSite)}
            </span>
          </div>
          <div className="ex-summary-card">
            <span className="ex-summary-label">Active Sites</span>
            <span className="ex-summary-value">{monthlyOverheadSummary.siteCount}</span>
          </div>
        </div>

        {/* Charts */}
        <div className="ex-charts-section">
          <div className="ex-chart-tabs">
            <button
              className={`ex-chart-tab ${activeChart === 'pie' ? 'active' : ''}`}
              onClick={() => setActiveChart('pie')}
            >
              <PieChartIcon size={14} /> Pie Chart
            </button>
            <button
              className={`ex-chart-tab ${activeChart === 'bar' ? 'active' : ''}`}
              onClick={() => setActiveChart('bar')}
            >
              <BarChart3 size={14} /> Category Breakdown
            </button>
            <button
              className={`ex-chart-tab ${activeChart === 'trend' ? 'active' : ''}`}
              onClick={() => setActiveChart('trend')}
            >
              <TrendingUp size={14} /> Monthly Trend
            </button>
          </div>

          <div className="ex-chart-container">
            {activeChart === 'pie' && pieChartData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}

            {activeChart === 'bar' && monthlyOverheadBreakdown.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyOverheadBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis type="number" stroke="#8b949e" />
                  <YAxis type="category" dataKey="category" stroke="#8b949e" width={120} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="amount" fill="#f59e0b" name="Amount (BD)" />
                  <Bar dataKey="perDayPerSite" fill="#3b82f6" name="Per Day/Site (BD)" />
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeChart === 'trend' && monthlyTrendData.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                  <XAxis dataKey="label" stroke="#8b949e" />
                  <YAxis stroke="#8b949e" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="total" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} name="Total Overhead" />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" name="Number of Entries" />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {activeChart === 'pie' && pieChartData.length === 0 && (
              <div className="ex-empty-state">
                <PieChartIcon size={48} />
                <h3>No Overhead Data</h3>
                <p>Add monthly overhead entries to see visualizations.</p>
              </div>
            )}
          </div>
        </div>

        {/* Overhead Table */}
        <div className="ex-table-container">
          <table className="ex-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Site</th>
                <th>Amount (BD)</th>
                <th>Sites</th>
                <th>Per Site</th>
                <th>Per Day/Site</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {monthlyOverheadData
                .filter(e => e.month === selectedMonth)
                .map((entry, index) => {
                  const perSite = (entry.amount || 0) / (entry.sitesCount || 1);
                  const perDayPerSite = perSite / (entry.workingDays || 26);
                  return (
                    <tr key={entry.id || index}>
                      <td>{getCategoryIcon(entry.category)} {entry.category}</td>
                      <td>{entry.siteId ? getSiteName(entry.siteId) : 'All Sites'}</td>
                      <td className="ex-amount">{Utils.formatCurrency(entry.amount)}</td>
                      <td className="ex-center">{entry.sitesCount || 1}</td>
                      <td className="ex-amount">{Utils.formatCurrency(perSite)}</td>
                      <td className="ex-amount">{Utils.formatCurrency(perDayPerSite)}</td>
                      <td className="ex-actions">
                        <button className="ex-btn-icon" onClick={() => handleEditOverhead(entry)}>
                          <Edit size={14} />
                        </button>
                        <button className="ex-btn-icon ex-btn-danger" onClick={() => handleDeleteOverhead(entry.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              {monthlyOverheadData.filter(e => e.month === selectedMonth).length === 0 && (
                <tr>
                  <td colSpan="7" className="ex-empty-cell">No overhead for this month</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regular Expenses List */}
      <div className="ex-expenses-section">
        <div className="ex-section-header">
          <h3><Receipt size={18} /> Regular Expenses</h3>
          <span className="ex-section-count">{filteredExpenses.length} entries</span>
        </div>

        {/* Filters */}
        <div className="ex-filters-bar">
          <select
            value={filter.site}
            onChange={e => setFilter({ ...filter, site: e.target.value })}
            className="ex-filter-select"
          >
            <option value="">All Sites</option>
            {sitesData.map(site => (
              <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
          <select
            value={filter.category}
            onChange={e => setFilter({ ...filter, category: e.target.value })}
            className="ex-filter-select"
          >
            <option value="">All Categories</option>
            {expenseCategories
              .filter(c => !overheadCategoriesList.includes(c.label))
              .map(cat => (
                <option key={cat.id} value={cat.label}>{cat.icon} {cat.label}</option>
              ))}
          </select>
          <button className="ex-btn-clear" onClick={() => setFilter({ site: '', category: '', dateFrom: '', dateTo: '' })}>
            <X size={14} /> Clear
          </button>
        </div>

        {/* Expense Cards */}
        <div className="ex-expenses-grid">
          {paginatedExpenses.map(expense => (
            <div key={expense.id} className="ex-expense-card">
              <div className="ex-expense-header">
                <div className="ex-expense-left">
                  <div className="ex-expense-date">
                    <Calendar size={14} />
                    {Utils.formatDate(expense.date)}
                  </div>
                  <div className="ex-expense-category">
                    {getCategoryIcon(expense.category)} {expense.category}
                  </div>
                </div>
                <div className="ex-expense-amount">
                  {Utils.formatCurrency(expense.amount)}
                </div>
              </div>
              <div className="ex-expense-body">
                <div className="ex-expense-site">
                  <Building2 size={14} />
                  {getSiteName(expense.siteId)}
                </div>
                {expense.description && (
                  <div className="ex-expense-desc">{expense.description}</div>
                )}
                <div className="ex-expense-meta">
                  {expense.quantity > 1 && <span>Qty: {expense.quantity}</span>}
                  {expense.unit && <span>Unit: {expense.unit}</span>}
                  {expense.isRecurring && <span className="ex-recurring">🔄 {expense.recurrenceType}</span>}
                </div>
              </div>
              <div className="ex-expense-actions">
                <button className="ex-btn-action ex-btn-edit" onClick={() => openEditExpenseModal(expense)}>
                  <Edit size={14} /> Edit
                </button>
                <button className="ex-btn-action ex-btn-delete" onClick={() => setShowDeleteConfirm(expense.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}

          {filteredExpenses.length === 0 && (
            <div className="ex-empty-state">
              <DollarSign size={48} />
              <h3>No Regular Expenses</h3>
              <p>Add your first expense using the "New Expense" button.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredExpenses.length > 0 && (
          <div className="ex-pagination">
            <div className="ex-pagination-info">
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} of {filteredExpenses.length}
            </div>
            <div className="ex-pagination-controls">
              <div className="ex-pagination-items">
                <span>Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="ex-pagination-select"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="ex-pagination-buttons">
                <button className="ex-page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}>
                  <ChevronsLeft size={16} />
                </button>
                <button className="ex-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                  <ChevronLeft size={16} />
                </button>
                {getPageNumbers().map(page => (
                  <button
                    key={page}
                    className={`ex-page-btn ${page === currentPage ? 'active' : ''}`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button className="ex-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                  <ChevronRight size={16} />
                </button>
                <button className="ex-page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>
                  <ChevronsRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showExpenseForm && renderExpenseFormModal()}
      {renderDeleteConfirmModal()}
    </div>
  );
};

export default ExpensesManagerComponent;