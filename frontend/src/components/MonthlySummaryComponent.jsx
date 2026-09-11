// src/components/MonthlySummaryComponent.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingUp, TrendingDown, Calendar, Filter, ChevronDown, 
  ChevronLeft, ChevronRight, Search, XCircle, Plus, Save, X,
  RefreshCw, AlertCircle, Edit, Trash2, DollarSign, 
  BarChart2, PieChart, Activity, Users, Building2,Truck,
  Download, Printer, Eye, EyeOff, Calculator,
  LayoutDashboard, FileText, Tag, Clock, Award, Crown,
  Sparkles, ArrowUpRight, ArrowDownRight, CheckCircle,
  Info, BarChart3, Gauge, Zap
} from 'lucide-react';
import Utils from '../utils/Utils';
import './MonthlySummaryComponent.css';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

import { CONFIG } from '../config/constants';
const API_BASE_URL = CONFIG.API_BASE || 'http://localhost:5000/api';

const MonthlySummaryComponent = ({ 
  data, 
  refreshData,
  onDataUpdate
}) => {
  // ============================================
  // STATE
  // ============================================
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedYear, setSelectedYear] = useState(() => {
    return new Date().getFullYear().toString();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return String(now.getMonth() + 1).padStart(2, '0');
  });
  const [chartView, setChartView] = useState('trend');
  const [localMonthlySummaries, setLocalMonthlySummaries] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Filter states
  const [filterType, setFilterType] = useState('year');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [yearRangeStart, setYearRangeStart] = useState(selectedYear);
  const [yearRangeEnd, setYearRangeEnd] = useState(selectedYear);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    month: '',
    totalRevenue: '',
    totalLabour: '',
    carPatrol: '',
    monthlyOh: '',
    oneTime: '',
    netProfit: '',
    status: 'FAIDA',
    notes: ''
  });

  // ============================================
  // MEMOIZED DATA
  // ============================================
  const monthlySummary = useMemo(() => {
    if (data?.monthlySummary && data.monthlySummary.length > 0) {
      return data.monthlySummary;
    }
    return localMonthlySummaries;
  }, [data?.monthlySummary, localMonthlySummaries]);

  const entries = useMemo(() => {
    if (!data?.entries) return [];
    return data.entries;
  }, [data?.entries]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    const fetchData = async () => {
      setIsInitialLoad(true);
      setApiError(null);
      
      if (data?.monthlySummary && data.monthlySummary.length > 0) {
        setLocalMonthlySummaries(data.monthlySummary);
        setIsInitialLoad(false);
        return;
      }
      
      await loadMonthlySummaries();
      setIsInitialLoad(false);
    };
    
    fetchData();
  }, [data?.monthlySummary]);

  // ============================================
  // LOAD MONTHLY SUMMARIES
  // ============================================
  const loadMonthlySummaries = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/monthly-summary/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {}
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      if (Array.isArray(result)) {
        setLocalMonthlySummaries(result);
        if (onDataUpdate) {
          onDataUpdate({ monthlySummary: result });
        }
        setApiError(null);
        return result;
      } else {
        setLocalMonthlySummaries([]);
        setApiError('Unexpected response format from server');
        return [];
      }
    } catch (error) {
      console.error('Error loading monthly summaries:', error);
      setApiError(error.message || 'Failed to load monthly summaries');
      setErrorMessage(`Failed to load monthly summaries: ${error.message}`);
      return [];
    }
  }, [onDataUpdate]);

  // ============================================
  // REFRESH SUMMARIES
  // ============================================
  const refreshSummaries = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    setApiError(null);
    
    try {
      if (refreshData) {
        await refreshData();
      }
      await loadMonthlySummaries();
      setSuccessMessage('✅ Data refreshed successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error refreshing summaries:', error);
      setErrorMessage(`Failed to refresh data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [refreshData, loadMonthlySummaries]);

  // ============================================
  // AVAILABLE YEARS & MONTHS
  // ============================================
  const availableYears = useMemo(() => {
    const years = new Set();
    monthlySummary.forEach(item => {
      if (item.month) {
        const year = item.month.substring(0, 4);
        years.add(year);
      }
    });
    return Array.from(years).sort();
  }, [monthlySummary]);

  const availableMonths = useMemo(() => {
    const months = new Set();
    monthlySummary.forEach(item => {
      if (item.month && item.month.startsWith(selectedYear)) {
        const month = item.month.substring(5, 7);
        months.add(month);
      }
    });
    return Array.from(months).sort();
  }, [monthlySummary, selectedYear]);

  // ============================================
  // FILTERED DATA
  // ============================================
  const filteredData = useMemo(() => {
    let filtered = [...monthlySummary];

    if (filterType === 'all') {
      filtered = filtered;
    } else if (filterType === 'year') {
      filtered = filtered.filter(item => {
        if (!item.month) return false;
        return item.month.substring(0, 4) === selectedYear;
      });
    } else if (filterType === 'month') {
      filtered = filtered.filter(item => {
        if (!item.month) return false;
        return item.month === `${selectedYear}-${selectedMonth}`;
      });
    } else if (filterType === 'range') {
      filtered = filtered.filter(item => {
        if (!item.month) return false;
        return item.month >= yearRangeStart && item.month <= yearRangeEnd;
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const monthStr = item.month || '';
        const statusStr = item.status?.toLowerCase() || '';
        const notesStr = item.notes?.toLowerCase() || '';
        return monthStr.includes(term) || 
               statusStr.includes(term) || 
               notesStr.includes(term);
      });
    }

    return filtered.sort((a, b) => {
      if (!a.month) return 1;
      if (!b.month) return -1;
      return a.month.localeCompare(b.month);
    });
  }, [monthlySummary, selectedYear, selectedMonth, filterType, yearRangeStart, yearRangeEnd, searchTerm]);

  // ============================================
  // TOTALS
  // ============================================
  const totals = useMemo(() => {
    const totalRevenue = filteredData.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
    const totalLabour = filteredData.reduce((sum, item) => sum + (item.totalLabour || 0), 0);
    const totalCarPatrol = filteredData.reduce((sum, item) => sum + (item.carPatrol || 0), 0);
    const totalMonthlyOH = filteredData.reduce((sum, item) => sum + (item.monthlyOh || 0), 0);
    const totalOneTime = filteredData.reduce((sum, item) => sum + (item.oneTime || 0), 0);
    const totalNet = filteredData.reduce((sum, item) => sum + (item.netProfit || 0), 0);
    const totalCosts = totalLabour + totalCarPatrol + totalMonthlyOH + totalOneTime;
    
    return {
      totalRevenue,
      totalLabour,
      totalCarPatrol,
      totalMonthlyOH,
      totalOneTime,
      totalNet,
      totalCosts,
      isProfit: totalNet >= 0,
      count: filteredData.length,
      avgNet: filteredData.length > 0 ? totalNet / filteredData.length : 0,
      profitMargin: totalRevenue > 0 ? (totalNet / totalRevenue) * 100 : 0,
      bestMonth: filteredData.length > 0 ? filteredData.reduce((a, b) => (a.netProfit || 0) > (b.netProfit || 0) ? a : b) : null,
      worstMonth: filteredData.length > 0 ? filteredData.reduce((a, b) => (a.netProfit || 0) < (b.netProfit || 0) ? a : b) : null,
    };
  }, [filteredData]);

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const cardDetails = {
    revenue: {
      title: 'Total Revenue',
      details: [
        { label: 'Total Revenue', value: Utils.formatCurrency(totals.totalRevenue) },
        { label: 'Months', value: totals.count },
        { label: 'Average Revenue', value: totals.count > 0 ? Utils.formatCurrency(totals.totalRevenue / totals.count) : '0.000' },
        { label: 'Best Month', value: totals.bestMonth ? Utils.formatCurrency(totals.bestMonth.totalRevenue) : '-' }
      ]
    },
    costs: {
      title: 'Total Costs',
      details: [
        { label: 'Total Costs', value: Utils.formatCurrency(totals.totalCosts) },
        { label: 'Labour', value: Utils.formatCurrency(totals.totalLabour) },
        { label: 'Car Patrol', value: Utils.formatCurrency(totals.totalCarPatrol) },
        { label: 'Monthly OH', value: Utils.formatCurrency(totals.totalMonthlyOH) },
        { label: 'One Time', value: Utils.formatCurrency(totals.totalOneTime) }
      ]
    },
    profit: {
      title: 'Net Profit',
      details: [
        { label: 'Net Profit', value: Utils.formatCurrency(totals.totalNet) },
        { label: 'Revenue', value: Utils.formatCurrency(totals.totalRevenue) },
        { label: 'Profit Margin', value: `${totals.profitMargin.toFixed(1)}%` },
        { label: 'Best Month', value: totals.bestMonth ? Utils.formatCurrency(totals.bestMonth.netProfit) : '-' }
      ]
    },
    months: {
      title: 'Months Summary',
      details: [
        { label: 'Total Months', value: totals.count },
        { label: 'Total Revenue', value: Utils.formatCurrency(totals.totalRevenue) },
        { label: 'Total Profit', value: Utils.formatCurrency(totals.totalNet) },
        { label: 'Avg Profit', value: totals.count > 0 ? Utils.formatCurrency(totals.totalNet / totals.count) : '0.000' }
      ]
    }
  };

  // ============================================
  // HANDLE CARD HOVER
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
  // CHART DATA
  // ============================================
  const chartData = useMemo(() => {
    return filteredData.map(item => {
      const monthParts = item.month?.split('-') || [];
      const monthName = monthParts.length === 2 
        ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(monthParts[1]) - 1] 
        : item.month || '';
      const year = monthParts.length === 2 ? monthParts[0] : '';
      return {
        month: monthName,
        year: year,
        fullMonth: item.month,
        revenue: item.totalRevenue || 0,
        labour: item.totalLabour || 0,
        carPatrol: item.carPatrol || 0,
        monthlyOh: item.monthlyOh || 0,
        oneTime: item.oneTime || 0,
        net: item.netProfit || 0,
        status: item.status || 'NUKSAN',
        profitMargin: item.totalRevenue > 0 ? ((item.netProfit || 0) / (item.totalRevenue || 1)) * 100 : 0
      };
    });
  }, [filteredData]);

  // ============================================
  // PIE CHART DATA
  // ============================================
  const pieData = useMemo(() => {
    const latest = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
    if (!latest) return [];
    return [
      { name: 'Revenue', value: latest.totalRevenue || 0 },
      { name: 'Labour', value: latest.totalLabour || 0 },
      { name: 'Car Patrol', value: latest.carPatrol || 0 },
      { name: 'Monthly OH', value: latest.monthlyOh || 0 },
      { name: 'One Time', value: latest.oneTime || 0 },
      { name: 'Net Profit', value: Math.max(0, latest.netProfit || 0) },
    ];
  }, [filteredData]);

  const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getMonthLabel = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const getStatusBadge = (status) => {
    const isProfit = status === 'FAIDA' || status === 'Profit' || status === '✅ FAIDA' || status?.includes('Faida');
    return (
      <span className={`status-badge ${isProfit ? 'profit' : 'loss'}`}>
        {isProfit ? '✅ Profit' : '❌ Loss'}
      </span>
    );
  };

  // ============================================
  // FORM HANDLERS
  // ============================================
  const resetForm = () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setFormData({
      month: currentMonth,
      totalRevenue: '',
      totalLabour: '',
      carPatrol: '',
      monthlyOh: '',
      oneTime: '',
      netProfit: '',
      status: 'FAIDA',
      notes: ''
    });
    setEditingId(null);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

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

      const url = editingId 
        ? `${API_BASE_URL}/monthly-summary/${editingId}/`
        : `${API_BASE_URL}/monthly-summary/`;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(summaryData)
      });

      if (!response.ok) {
        let errorMsg = `Failed to save summary: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMsg = errorData.error;
          }
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const result = await response.json();
      setSuccessMessage(editingId ? '✅ Monthly summary updated successfully!' : '✅ Monthly summary created successfully!');
      await refreshSummaries();
      resetForm();
      setShowForm(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving monthly summary:', error);
      setErrorMessage(error.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
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
    setShowForm(true);
    setErrorMessage('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this monthly summary?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/monthly-summary/${id}/`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete: ${response.status}`);
      }

      setSuccessMessage('✅ Monthly summary deleted successfully!');
      await refreshSummaries();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting monthly summary:', error);
      setErrorMessage('Failed to delete. Please try again.');
    }
  };

  // Auto-calculate net profit
  useEffect(() => {
    const revenue = parseFloat(formData.totalRevenue) || 0;
    const labour = parseFloat(formData.totalLabour) || 0;
    const carPatrol = parseFloat(formData.carPatrol) || 0;
    const monthlyOh = parseFloat(formData.monthlyOh) || 0;
    const oneTime = parseFloat(formData.oneTime) || 0;
    const net = revenue - labour - carPatrol - monthlyOh - oneTime;
    const status = net >= 0 ? 'FAIDA' : 'NUKSAN';
    setFormData(prev => ({
      ...prev,
      netProfit: net.toFixed(3),
      status: status
    }));
  }, [formData.totalRevenue, formData.totalLabour, formData.carPatrol, formData.monthlyOh, formData.oneTime]);

  // Auto-generate summary
  const handleAutoGenerate = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      const response = await fetch(`${API_BASE_URL}/monthly-summary/auto-update/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        let errorMsg = `Failed to auto-update: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMsg = errorData.error;
          }
        } catch (e) {}
        throw new Error(errorMsg);
      }
      
      const result = await response.json();
      
      if (result.data) {
        setSuccessMessage(`✅ Monthly summary updated for ${getMonthLabel(currentMonth)}!`);
        await refreshSummaries();
      } else {
        setErrorMessage('Failed to generate summary. Please check if there are entries for this month.');
      }
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error auto-generating summary:', error);
      setErrorMessage(error.message || 'Failed to auto-generate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAll = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/monthly-summary/calculate-all/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        let errorMsg = `Failed to calculate all: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMsg = errorData.error;
          }
        } catch (e) {}
        throw new Error(errorMsg);
      }
      
      const result = await response.json();
      await refreshSummaries();
      
      setSuccessMessage(`✅ Auto-generated successfully! Created/Updated ${result.success} summaries.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error auto-generating summaries:', error);
      setErrorMessage(error.message || 'Failed to auto-generate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTER HANDLERS
  // ============================================
  const handleFilterChange = (type) => {
    setFilterType(type);
    setShowFilterDropdown(false);
  };

  const handleCustomMonthChange = (e) => {
    const newMonth = e.target.value;
    setSelectedMonth(newMonth.substring(5, 7));
    setSelectedYear(newMonth.substring(0, 4));
    setShowFilterDropdown(false);
  };

  // ============================================
  // CHART RENDER
  // ============================================
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p className="chart-tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="chart-tooltip-item" style={{ color: entry.color }}>
              {entry.name}: {Utils.formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getChartTitle = () => {
    let title = '';
    switch(chartView) {
      case 'trend': title = '📈 Monthly Trend'; break;
      case 'comparison': title = '📊 Revenue vs Costs'; break;
      case 'distribution': title = '🥧 Cost Distribution'; break;
      default: title = '📈 Monthly Trend';
    }
    
    if (filterType === 'month') {
      title += ` - ${getMonthLabel(`${selectedYear}-${selectedMonth}`)}`;
    } else if (filterType === 'year') {
      title += ` - ${selectedYear}`;
    } else if (filterType === 'all') {
      title += ' - All Months';
    }
    
    return title;
  };

  const renderChart = () => {
    switch(chartView) {
      case 'trend':
        return (
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="month" stroke="#8b949e" fontSize={10} />
            <YAxis stroke="#8b949e" fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} name="Revenue" />
            <Area type="monotone" dataKey="net" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} name="Net Profit" />
            <Line type="monotone" dataKey="labour" stroke="#ef4444" name="Labour" strokeWidth={2} />
          </ComposedChart>
        );
      case 'comparison':
        return (
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="month" stroke="#8b949e" fontSize={10} />
            <YAxis stroke="#8b949e" fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
            <Bar dataKey="labour" fill="#ef4444" name="Labour" />
            <Bar dataKey="monthlyOh" fill="#3b82f6" name="Monthly OH" />
            <Bar dataKey="carPatrol" fill="#f59e0b" name="Car Patrol" />
            <Bar dataKey="oneTime" fill="#8b5cf6" name="One Time" />
          </ComposedChart>
        );
      case 'distribution':
        return (
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="month" stroke="#8b949e" fontSize={10} />
            <YAxis stroke="#8b949e" fontSize={10} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} name="Revenue" />
            <Area type="monotone" dataKey="labour" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="Labour" />
            <Area type="monotone" dataKey="monthlyOh" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Monthly OH" />
            <Area type="monotone" dataKey="net" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} name="Net Profit" />
          </ComposedChart>
        );
      default:
        return null;
    }
  };

  // ============================================
  // STATS ITEMS
  // ============================================
  const statItems = [
    { 
      id: 'revenue', 
      icon: DollarSign, 
      label: 'Total Revenue', 
      value: Utils.formatCurrencyShort(totals.totalRevenue),
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.12)',
      trend: totals.totalRevenue > 0 ? 'up' : 'neutral'
    },
    { 
      id: 'costs', 
      icon: BarChart3, 
      label: 'Total Costs', 
      value: Utils.formatCurrencyShort(totals.totalCosts),
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      trend: totals.totalCosts > 0 ? 'down' : 'neutral'
    },
    { 
      id: 'profit', 
      icon: TrendingUp, 
      label: 'Net Profit', 
      value: Utils.formatCurrencyShort(totals.totalNet),
      color: totals.isProfit ? '#22c55e' : '#ef4444',
      bg: totals.isProfit ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
      trend: totals.isProfit ? 'up' : 'down'
    },
    { 
      id: 'months', 
      icon: Calendar, 
      label: 'Months', 
      value: totals.count,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      trend: 'neutral'
    }
  ];

  // ============================================
  // MAIN RENDER
  // ============================================
  if (isInitialLoad) {
    return (
      <div className="monthly-summary-modern">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <span>Loading Monthly Summaries...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="monthly-summary-modern">
      {/* ==================== HEADER ==================== */}
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <LayoutDashboard size={28} />
            <span className="header-badge">Summary</span>
          </div>
          <div>
            <h2>Monthly Summary</h2>
            <p className="header-subtitle">
              {filterType === 'all' && `All months • ${monthlySummary.length} summaries`}
              {filterType === 'year' && `${selectedYear} • ${filteredData.length} months`}
              {filterType === 'month' && `${getMonthLabel(`${selectedYear}-${selectedMonth}`)} • ${filteredData.length} summaries`}
              {filterType === 'range' && `${yearRangeStart} to ${yearRangeEnd} • ${filteredData.length} months`}
              {apiError && ` ⚠️ API Error: ${apiError}`}
            </p>
          </div>
        </div>
        <div className="header-right">
          {/* Filter Dropdown */}
          <div className="filter-dropdown">
            <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className="filter-btn">
              <Filter size={16} /> 
              {filterType === 'all' && 'All Months'}
              {filterType === 'year' && `Year: ${selectedYear}`}
              {filterType === 'month' && `Month: ${getMonthLabel(`${selectedYear}-${selectedMonth}`)}`}
              {filterType === 'range' && 'Range'}
              <ChevronDown size={14} />
            </button>

            {showFilterDropdown && (
              <div className="dropdown-menu">
                <div className="filter-section">
                  <label>View Mode</label>
                  <div className="view-grid">
                    <button onClick={() => handleFilterChange('all')} className={`view-btn ${filterType === 'all' ? 'active' : ''}`}>All Months</button>
                    <button onClick={() => handleFilterChange('year')} className={`view-btn ${filterType === 'year' ? 'active' : ''}`}>Year</button>
                    <button onClick={() => handleFilterChange('month')} className={`view-btn ${filterType === 'month' ? 'active' : ''}`}>Specific Month</button>
                    <button onClick={() => handleFilterChange('range')} className={`view-btn ${filterType === 'range' ? 'active' : ''}`}>Date Range</button>
                  </div>
                </div>

                {(filterType === 'year' || filterType === 'month') && (
                  <div className="filter-section">
                    <label>Year</label>
                    <div className="year-nav">
                      <button onClick={() => {
                        const currentYear = parseInt(selectedYear);
                        if (availableYears.length > 0) {
                          const index = availableYears.indexOf(selectedYear);
                          if (index > 0) setSelectedYear(availableYears[index - 1]);
                        } else {
                          setSelectedYear((currentYear - 1).toString());
                        }
                      }}><ChevronLeft size={14} /></button>
                      <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                        {availableYears.length > 0 ? (
                          availableYears.map(year => <option key={year} value={year}>{year}</option>)
                        ) : (
                          <option value={selectedYear}>{selectedYear}</option>
                        )}
                      </select>
                      <button onClick={() => {
                        const currentYear = parseInt(selectedYear);
                        if (availableYears.length > 0) {
                          const index = availableYears.indexOf(selectedYear);
                          if (index < availableYears.length - 1) setSelectedYear(availableYears[index + 1]);
                        } else {
                          setSelectedYear((currentYear + 1).toString());
                        }
                      }}><ChevronRight size={14} /></button>
                    </div>
                  </div>
                )}

                {filterType === 'month' && (
                  <div className="filter-section">
                    <label>Month</label>
                    <div className="month-grid">
                      {['01','02','03','04','05','06','07','08','09','10','11','12'].map(month => {
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const hasData = availableMonths.includes(month);
                        return (
                          <button key={month} onClick={() => { setSelectedMonth(month); setShowFilterDropdown(false); }} 
                            className={`month-btn ${selectedMonth === month ? 'active' : ''}`} disabled={!hasData}>
                            {monthNames[parseInt(month)-1]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {filterType === 'range' && (
                  <>
                    <div className="filter-section">
                      <label>Start Month</label>
                      <input type="month" value={yearRangeStart} onChange={(e) => setYearRangeStart(e.target.value)} />
                    </div>
                    <div className="filter-section">
                      <label>End Month</label>
                      <input type="month" value={yearRangeEnd} onChange={(e) => setYearRangeEnd(e.target.value)} />
                    </div>
                  </>
                )}

                <button onClick={() => setShowFilterDropdown(false)} className="apply-btn">Apply Filters</button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <button onClick={handleAutoGenerate} disabled={loading} className="btn-generate">
            <Calculator size={16} /> {loading ? 'Generating...' : 'Generate Current'}
          </button>
          <button onClick={handleGenerateAll} disabled={loading} className="btn-generate-all">
            <RefreshCw size={16} /> {loading ? 'Generating...' : 'Generate All'}
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
            <Plus size={18} /> Add Summary
          </button>
          <button onClick={refreshSummaries} disabled={loading} className="btn-refresh-modern">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* ==================== MESSAGES ==================== */}
      {successMessage && <div className="success-message-modern"><CheckCircle size={16} /> {successMessage}</div>}
      {errorMessage && <div className="error-message-modern"><AlertCircle size={16} /> {errorMessage}</div>}

      {/* ==================== API ERROR BANNER ==================== */}
      {apiError && (
        <div className="api-error-banner">
          <AlertCircle size={20} className="error-icon" />
          <div className="error-content">
            <div className="error-title">⚠️ API Connection Error</div>
            <div className="error-detail">{apiError}</div>
            <div className="error-hint">💡 Make sure the backend server is running at <code>{API_BASE_URL}</code></div>
            <button onClick={() => { setApiError(null); loadMonthlySummaries(); }} className="retry-btn">Retry Connection</button>
          </div>
        </div>
      )}

      {/* ==================== SEARCH BAR ==================== */}
      <div className="search-bar-modern">
        <Search size={18} />
        <input type="text" placeholder="Search by month, status, or notes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        {searchTerm && <button onClick={() => setSearchTerm('')}><XCircle size={18} /></button>}
        <span className="result-count">{filteredData.length} months</span>
      </div>

      {/* ==================== FORM MODAL ==================== */}
      {showForm && (
        <div className="summary-modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="summary-modal-content" onClick={e => e.stopPropagation()}>
            <div className="summary-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
              <div className="summary-modal-header-left">
                {editingId ? <Edit size={24} color="#ffffff" /> : <Plus size={24} color="#ffffff" />}
                <h3 style={{ color: '#ffffff' }}>{editingId ? 'Edit Summary' : 'Add Monthly Summary'}</h3>
              </div>
              <button className="summary-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
                <X size={24} color="#ffffff" />
              </button>
            </div>
            <div className="summary-modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label><Calendar size={14} /> Month <span className="required">*</span></label>
                    <input type="month" value={formData.month} onChange={e => setFormData({ ...formData, month: e.target.value })} required className="form-input" />
                  </div>
                  <div className="form-group">
                    <label><DollarSign size={14} /> Total Revenue (BD)</label>
                    <input type="number" step="0.001" value={formData.totalRevenue} onChange={e => setFormData({ ...formData, totalRevenue: e.target.value })} placeholder="0.000" className="form-input" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label><Users size={14} /> Total Labour (BD)</label>
                    <input type="number" step="0.001" value={formData.totalLabour} onChange={e => setFormData({ ...formData, totalLabour: e.target.value })} placeholder="0.000" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label><Truck size={14} /> Car Patrol (BD)</label>
                    <input type="number" step="0.001" value={formData.carPatrol} onChange={e => setFormData({ ...formData, carPatrol: e.target.value })} placeholder="0.000" className="form-input" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label><Building2 size={14} /> Monthly OH (BD)</label>
                    <input type="number" step="0.001" value={formData.monthlyOh} onChange={e => setFormData({ ...formData, monthlyOh: e.target.value })} placeholder="0.000" className="form-input" />
                  </div>
                  <div className="form-group">
                    <label><Clock size={14} /> One Time (BD)</label>
                    <input type="number" step="0.001" value={formData.oneTime} onChange={e => setFormData({ ...formData, oneTime: e.target.value })} placeholder="0.000" className="form-input" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label><TrendingUp size={14} /> Net Profit (Auto-calculated)</label>
                    <input type="text" value={formData.netProfit} disabled className="form-input" style={{ color: parseFloat(formData.netProfit) >= 0 ? '#22c55e' : '#ef4444' }} />
                  </div>
                  <div className="form-group">
                    <label><Tag size={14} /> Status</label>
                    <input type="text" value={formData.status} disabled className="form-input" style={{ color: formData.status === 'FAIDA' ? '#22c55e' : '#ef4444' }} />
                  </div>
                </div>

                <div className="form-group">
                  <label><FileText size={14} /> Notes</label>
                  <input type="text" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Notes..." className="form-input" />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    <Save size={16} /> {loading ? 'Saving...' : (editingId ? 'Update' : 'Save')}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STATS CARDS ==================== */}
      <div className="stats-grid">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="stat-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="stat-icon" style={{ background: item.bg, color: item.color }}>
                <Icon size={22} />
              </div>
              <div className="stat-content">
                <span className="stat-label">{item.label}</span>
                <span className="stat-value">{item.value}</span>
              </div>
              <div className="stat-trend">
                {item.trend === 'up' && <TrendingUp size={16} color="#22c55e" />}
                {item.trend === 'down' && <TrendingDown size={16} color="#ef4444" />}
                {item.trend === 'neutral' && <BarChart3 size={16} color="#8a9bb5" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* ==================== TOOLTIP ==================== */}
      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="summary-card-tooltip" style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="summary-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="summary-tooltip-body">
            {cardDetails[hoveredCard].details.map((detail, idx) => (
              <div key={idx} className="summary-tooltip-row">
                <span className="summary-tooltip-label">{detail.label}</span>
                <span className="summary-tooltip-value">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== BEST/WORST MONTH CARDS ==================== */}
      {filteredData.length > 0 && (
        <div className="best-worst-grid">
          <div className="best-month-card">
            <div className="header"><TrendingUp size={18} className="icon" /><span className="label">Best Month</span></div>
            <div className="month-name">{totals.bestMonth ? getMonthLabel(totals.bestMonth.month) : '-'}</div>
            <div className="month-profit">{totals.bestMonth ? Utils.formatCurrencyShort(totals.bestMonth.netProfit) : '-'}</div>
          </div>
          <div className="worst-month-card">
            <div className="header"><TrendingDown size={18} className="icon" /><span className="label">Worst Month</span></div>
            <div className="month-name">{totals.worstMonth ? getMonthLabel(totals.worstMonth.month) : '-'}</div>
            <div className="month-profit">{totals.worstMonth ? Utils.formatCurrencyShort(totals.worstMonth.netProfit) : '-'}</div>
          </div>
        </div>
      )}

      {/* ==================== CHARTS ==================== */}
      {chartData.length > 0 && (
        <div className="charts-container">
          <div className="chart-card full-width">
            <div className="chart-header">
              <h3>{getChartTitle()}</h3>
              <div className="chart-actions">
                <button onClick={() => setChartView('trend')} className={`chart-btn ${chartView === 'trend' ? 'active' : ''}`}>Trend</button>
                <button onClick={() => setChartView('comparison')} className={`chart-btn ${chartView === 'comparison' ? 'active' : ''}`}>Comparison</button>
                <button onClick={() => setChartView('distribution')} className={`chart-btn ${chartView === 'distribution' ? 'active' : ''}`}>Distribution</button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>{renderChart()}</ResponsiveContainer>
          </div>

          {pieData.length > 0 && (
            <div className="chart-card">
              <div className="chart-header"><h3>🥧 Latest Month Cost Breakdown</h3></div>
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => Utils.formatCurrency(value)} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          )}

          {chartData.length > 0 && (
            <div className="chart-card">
              <div className="chart-header"><h3>📡 Performance Metrics</h3></div>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={[
                  { metric: 'Revenue', value: totals.totalRevenue / (totals.count || 1) },
                  { metric: 'Net Profit', value: Math.max(0, totals.totalNet / (totals.count || 1)) },
                  { metric: 'Labour', value: totals.totalLabour / (totals.count || 1) },
                  { metric: 'Car Patrol', value: totals.totalCarPatrol / (totals.count || 1) },
                  { metric: 'Monthly OH', value: totals.totalMonthlyOH / (totals.count || 1) },
                ]}>
                  <PolarGrid stroke="#30363d" />
                  <PolarAngleAxis dataKey="metric" stroke="#8b949e" fontSize={10} />
                  <PolarRadiusAxis stroke="#8b949e" fontSize={10} />
                  <Radar name="Monthly Average" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                  <Tooltip formatter={(value) => Utils.formatCurrency(value)} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ==================== TABLE ==================== */}
      <div className="table-container-modern">
        <div className="table-header-modern">
          <div className="table-title"><FileText size={18} /><h3>Summary Entries</h3><span className="table-count">{filteredData.length} months</span></div>
        </div>
        <div className="table-responsive-modern">
          <table className="summary-table">
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
              {filteredData.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan="9">
                    <div className="empty-state">
                      <FileText size={48} />
                      <h3>No Monthly Summary Data</h3>
                      <p>Click "Generate Current" or "Generate All" to create summaries from entries.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.id || index}>
                    <td>{getMonthLabel(item.month)}</td>
                    <td className="right revenue">{Utils.formatCurrencyShort(item.totalRevenue)}</td>
                    <td className="right labour">{Utils.formatCurrencyShort(item.totalLabour)}</td>
                    <td className="right car-patrol">{Utils.formatCurrencyShort(item.carPatrol)}</td>
                    <td className="right monthly-oh">{Utils.formatCurrencyShort(item.monthlyOh)}</td>
                    <td className="right one-time">{Utils.formatCurrencyShort(item.oneTime)}</td>
                    <td className={`right ${(item.netProfit || 0) >= 0 ? 'net-positive' : 'net-negative'}`}>
                      {Utils.formatCurrencyShort(item.netProfit)}
                    </td>
                    <td className="center">{getStatusBadge(item.status)}</td>
                    <td className="center">
                      <div className="action-buttons">
                        <button onClick={() => handleEdit(item)} className="btn-action" title="Edit"><Edit size={14} /></button>
                        <button onClick={() => handleDelete(item.id)} className="btn-action delete" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonthlySummaryComponent;