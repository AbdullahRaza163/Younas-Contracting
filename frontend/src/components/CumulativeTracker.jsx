// src/components/CumulativeTrackerComponent.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  XCircle,
  Plus,
  Save,
  X,
  CheckCircle,
  RefreshCw,
  Calculator,
  AlertCircle,
  Edit,
  Trash2,
  BarChart2,
  PieChart,
  Activity,
  DollarSign,
  Users,
  LineChart as LineChartIcon,
  AreaChart,
  Target,
  Zap,
  Award,
  Clock,
  LayoutDashboard,
  FileText,
  Tag,
  Info,
  BarChart3,
  Gauge
} from 'lucide-react';
import Utils from '../utils/Utils';
import ApiService from '../services/ApiService';
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
  Radar,
  ReferenceLine
} from 'recharts';
import './CumulativeTracker.css';

const CumulativeTrackerComponent = ({ data, refreshData }) => {
  // ============================================
  // STATE
  // ============================================
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [autoCalcLoading, setAutoCalcLoading] = useState(false);
  const [chartView, setChartView] = useState('cumulative');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Filter states
  const [filterType, setFilterType] = useState('month');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [monthRangeStart, setMonthRangeStart] = useState(selectedMonth);
  const [monthRangeEnd, setMonthRangeEnd] = useState(selectedMonth);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    revenue: '',
    labour: '',
    ohShare: '',
    net: '',
    notes: ''
  });

  // ============================================
  // MEMOIZED DATA
  // ============================================
  const cumulativeData = useMemo(() => {
    if (!data?.cumulativeTracker) return [];
    return data.cumulativeTracker;
  }, [data?.cumulativeTracker]);

  const monthlySummary = useMemo(() => {
    if (!data?.monthlySummary) return [];
    return data.monthlySummary;
  }, [data?.monthlySummary]);

  const entries = useMemo(() => {
    if (!data?.entries) return [];
    return data.entries;
  }, [data?.entries]);

  const monthlyOverhead = useMemo(() => {
    if (!data?.monthlyOverhead) return [];
    return data.monthlyOverhead;
  }, [data?.monthlyOverhead]);

  const sites = useMemo(() => {
    if (!data?.sites) return [];
    return data.sites;
  }, [data?.sites]);

  // ============================================
  // FILTERED DATA
  // ============================================
  const filteredData = useMemo(() => {
    let filtered = [...cumulativeData];

    if (filterType === 'month') {
      filtered = filtered.filter(item => {
        if (!item.date) return false;
        return item.date.substring(0, 7) === selectedMonth;
      });
    } else if (filterType === 'range') {
      filtered = filtered.filter(item => {
        if (!item.date) return false;
        const itemMonth = item.date.substring(0, 7);
        return itemMonth >= monthRangeStart && itemMonth <= monthRangeEnd;
      });
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const dateStr = item.date || '';
        const statusStr = item.status?.toLowerCase() || '';
        return dateStr.includes(term) || statusStr.includes(term);
      });
    }

    return filtered.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
  }, [cumulativeData, selectedMonth, filterType, monthRangeStart, monthRangeEnd, searchTerm]);

  // ============================================
  // TOTALS
  // ============================================
  const totals = useMemo(() => {
    const totalRevenue = filteredData.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const totalLabour = filteredData.reduce((sum, item) => sum + (item.labour || 0), 0);
    const totalOH = filteredData.reduce((sum, item) => sum + (item.ohShare || 0), 0);
    const totalNet = filteredData.reduce((sum, item) => sum + (item.net || 0), 0);
    const finalCumulative = filteredData.length > 0 ? filteredData[filteredData.length - 1].cumulative : 0;
    
    return {
      totalRevenue,
      totalLabour,
      totalOH,
      totalNet,
      finalCumulative,
      isProfit: finalCumulative >= 0,
      count: filteredData.length,
      avgNet: filteredData.length > 0 ? totalNet / filteredData.length : 0,
      maxRevenue: filteredData.length > 0 ? Math.max(...filteredData.map(d => d.revenue || 0)) : 0,
      minRevenue: filteredData.length > 0 ? Math.min(...filteredData.map(d => d.revenue || 0)) : 0,
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
        { label: 'Entries', value: totals.count },
        { label: 'Average Revenue', value: totals.count > 0 ? Utils.formatCurrency(totals.totalRevenue / totals.count) : '0.000' },
        { label: 'Max Revenue', value: Utils.formatCurrency(totals.maxRevenue) }
      ]
    },
    labour: {
      title: 'Total Labour',
      details: [
        { label: 'Total Labour', value: Utils.formatCurrency(totals.totalLabour) },
        { label: 'Entries', value: totals.count },
        { label: 'Average Labour', value: totals.count > 0 ? Utils.formatCurrency(totals.totalLabour / totals.count) : '0.000' },
        { label: 'Labour % of Revenue', value: totals.totalRevenue > 0 ? `${((totals.totalLabour / totals.totalRevenue) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    ohShare: {
      title: 'OH Share',
      details: [
        { label: 'Total OH Share', value: Utils.formatCurrency(totals.totalOH) },
        { label: 'Entries', value: totals.count },
        { label: 'Average OH', value: totals.count > 0 ? Utils.formatCurrency(totals.totalOH / totals.count) : '0.000' },
        { label: 'OH % of Revenue', value: totals.totalRevenue > 0 ? `${((totals.totalOH / totals.totalRevenue) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    net: {
      title: 'Net Profit',
      details: [
        { label: 'Net Profit', value: Utils.formatCurrency(totals.totalNet) },
        { label: 'Avg Net', value: totals.count > 0 ? Utils.formatCurrency(totals.totalNet / totals.count) : '0.000' },
        { label: 'Revenue', value: Utils.formatCurrency(totals.totalRevenue) },
        { label: 'Profit Margin', value: totals.totalRevenue > 0 ? `${((totals.totalNet / totals.totalRevenue) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    cumulative: {
      title: 'Cumulative Balance',
      details: [
        { label: 'Final Cumulative', value: Utils.formatCurrency(totals.finalCumulative) },
        { label: 'Total Net', value: Utils.formatCurrency(totals.totalNet) },
        { label: 'Total Revenue', value: Utils.formatCurrency(totals.totalRevenue) },
        { label: 'Status', value: totals.isProfit ? '✅ Profit' : '❌ Loss' }
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
    return filteredData.map(item => ({
      date: item.date ? Utils.formatDate(item.date) : '',
      revenue: item.revenue || 0,
      labour: item.labour || 0,
      net: item.net || 0,
      cumulative: item.cumulative || 0,
      ohShare: item.ohShare || 0,
      profitMargin: item.revenue > 0 ? ((item.net || 0) / (item.revenue || 1)) * 100 : 0
    }));
  }, [filteredData]);

  const summaryChartData = useMemo(() => {
    return monthlySummary
      .filter(item => {
        if (filterType === 'month') {
          return item.month === selectedMonth;
        } else if (filterType === 'range') {
          return item.month >= monthRangeStart && item.month <= monthRangeEnd;
        }
        return true;
      })
      .sort((a, b) => a.month?.localeCompare(b.month) || 0)
      .map(item => ({
        month: item.month,
        revenue: item.totalRevenue || 0,
        labour: item.totalLabour || 0,
        net: item.netProfit || item.net || 0,
        status: item.status || 'Loss',
        profitMargin: item.totalRevenue > 0 ? ((item.netProfit || 0) / (item.totalRevenue || 1)) * 100 : 0
      }));
  }, [monthlySummary, filterType, selectedMonth, monthRangeStart, monthRangeEnd]);

  const pieData = useMemo(() => {
    const latest = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
    if (!latest) return [];
    return [
      { name: 'Revenue', value: latest.revenue || 0 },
      { name: 'Labour', value: latest.labour || 0 },
      { name: 'Overhead Share', value: latest.ohShare || 0 },
      { name: 'Net Profit', value: Math.max(0, latest.net || 0) },
    ];
  }, [filteredData]);

  const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b'];

  // ============================================
  // NAVIGATION
  // ============================================
  const navigateMonth = useCallback((direction) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newMonth = month + direction;
    let newYear = year;
    
    if (newMonth > 12) {
      newMonth = 1;
      newYear = year + 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear = year - 1;
    }
    
    const newMonthStr = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    setSelectedMonth(newMonthStr);
  }, [selectedMonth]);

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
    const isProfit = status === '✅ Profit' || status === '✅ FAIDA' || status === 'Profit' || 
                     status?.includes('Profit') || status?.includes('Faida') || 
                     (typeof status === 'string' && status.includes('Faida'));
    return (
      <span className={`status-badge ${isProfit ? 'profit' : 'loss'}`}>
        {isProfit ? '✅ Profit' : '❌ Loss'}
      </span>
    );
  };

  // ============================================
  // API FUNCTIONS
  // ============================================
  const handleAutoCalculate = async () => {
    setAutoCalcLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await ApiService.calculateCumulative(selectedMonth);
      
      if (response.calculated === false) {
        setErrorMessage(`No entries found for ${getMonthLabel(selectedMonth)}. Please add entries first.`);
        setAutoCalcLoading(false);
        return;
      }

      if (refreshData) {
        await refreshData();
      }

      setSuccessMessage(`✅ Auto-calculated successfully! Created: ${response.created || 0}, Updated: ${response.updated || 0} entries for ${getMonthLabel(selectedMonth)}`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error auto-calculating:', error);
      setErrorMessage(error.message || 'Failed to auto-calculate. Please try again.');
    } finally {
      setAutoCalcLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

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

      if (refreshData) {
        await refreshData();
      }
      
      resetForm();
      setShowForm(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving tracker entry:', error);
      setErrorMessage(error.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      revenue: '',
      labour: '',
      ohShare: '',
      net: '',
      notes: ''
    });
    setEditingId(null);
    setErrorMessage('');
    setSuccessMessage('');
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
    setShowForm(true);
    setErrorMessage('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await ApiService.deleteCumulativeTracker(id);
      setSuccessMessage('Entry deleted successfully!');
      if (refreshData) {
        await refreshData();
      }
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting entry:', error);
      setErrorMessage('Failed to delete. Please try again.');
    }
  };

  // Auto-calculate net
  useEffect(() => {
    const revenue = parseFloat(formData.revenue) || 0;
    const labour = parseFloat(formData.labour) || 0;
    const ohShare = parseFloat(formData.ohShare) || 0;
    const net = revenue - labour - ohShare;
    setFormData(prev => ({
      ...prev,
      net: net.toFixed(3)
    }));
  }, [formData.revenue, formData.labour, formData.ohShare]);

  // ============================================
  // STATS ITEMS
  // ============================================
  const statItems = [
    { 
      id: 'revenue', 
      icon: DollarSign, 
      label: 'Revenue', 
      value: Utils.formatCurrencyShort(totals.totalRevenue),
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.12)',
      trend: totals.totalRevenue > 0 ? 'up' : 'neutral'
    },
    { 
      id: 'labour', 
      icon: Users, 
      label: 'Labour', 
      value: Utils.formatCurrencyShort(totals.totalLabour),
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      trend: totals.totalLabour > 0 ? 'down' : 'neutral'
    },
    { 
      id: 'ohShare', 
      icon: BarChart3, 
      label: 'OH Share', 
      value: Utils.formatCurrencyShort(totals.totalOH),
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      trend: 'neutral'
    },
    { 
      id: 'net', 
      icon: TrendingUp, 
      label: 'Net Profit', 
      value: Utils.formatCurrencyShort(totals.totalNet),
      color: totals.isProfit ? '#22c55e' : '#ef4444',
      bg: totals.isProfit ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
      trend: totals.isProfit ? 'up' : 'down'
    },
    { 
      id: 'cumulative', 
      icon: Target, 
      label: 'Cumulative', 
      value: Utils.formatCurrencyShort(totals.finalCumulative),
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      trend: totals.finalCumulative >= 0 ? 'up' : 'down'
    }
  ];

  // ============================================
  // CHART RENDER
  // ============================================
  const getChartTitle = () => {
    switch(chartView) {
      case 'cumulative': return '📈 Cumulative Trend';
      case 'revenue': return '💰 Revenue vs Labour';
      case 'profit': return '📊 Profit Analysis';
      case 'comparison': return '📉 Monthly Comparison';
      default: return '📈 Cumulative Trend';
    }
  };

  const renderChart = () => {
    switch(chartView) {
      case 'cumulative':
        return (
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="date" stroke="#8b949e" fontSize={10} />
            <YAxis stroke="#8b949e" fontSize={10} />
            <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px' }} />
            <Legend />
            <Area type="monotone" dataKey="cumulative" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} name="Cumulative" />
            <Bar dataKey="revenue" fill="#22c55e" name="Revenue" opacity={0.6} />
            <Bar dataKey="labour" fill="#ef4444" name="Labour" opacity={0.6} />
          </ComposedChart>
        );
      case 'revenue':
        return (
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="date" stroke="#8b949e" fontSize={10} />
            <YAxis stroke="#8b949e" fontSize={10} />
            <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px' }} />
            <Legend />
            <Bar dataKey="revenue" fill="#22c55e" name="Revenue" />
            <Bar dataKey="labour" fill="#ef4444" name="Labour" />
            <Bar dataKey="ohShare" fill="#3b82f6" name="OH Share" />
          </ComposedChart>
        );
      case 'profit':
        return (
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="date" stroke="#8b949e" fontSize={10} />
            <YAxis stroke="#8b949e" fontSize={10} />
            <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px' }} />
            <Legend />
            <Area type="monotone" dataKey="net" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Net Profit" />
            <ReferenceLine y={0} stroke="#8b949e" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="cumulative" stroke="#22c55e" name="Cumulative" strokeWidth={2} />
          </ComposedChart>
        );
      case 'comparison':
        return (
          <ComposedChart data={summaryChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
            <XAxis dataKey="month" stroke="#8b949e" fontSize={10} />
            <YAxis stroke="#8b949e" fontSize={10} />
            <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px' }} />
            <Legend />
            <Bar dataKey="revenue" fill="#22c55e" name="Revenue" opacity={0.7} />
            <Bar dataKey="labour" fill="#ef4444" name="Labour" opacity={0.7} />
            <Line type="monotone" dataKey="net" stroke="#f59e0b" name="Net" strokeWidth={2} />
          </ComposedChart>
        );
      default:
        return null;
    }
  };

  const monthEntriesCount = useMemo(() => {
    return entries.filter(entry => {
      if (!entry.date) return false;
      return entry.date.substring(0, 7) === selectedMonth;
    }).length;
  }, [entries, selectedMonth]);

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="cumulative-tracker-modern">
      {/* ==================== HEADER ==================== */}
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <Target size={28} />
            <span className="header-badge">Cumulative</span>
          </div>
          <div>
            <h2>Cumulative Tracker</h2>
            <p className="header-subtitle">Running balance and performance tracking</p>
          </div>
        </div>
        <div className="header-right">
          {filterType === 'month' && (
            <div className="month-navigation">
              <button className="month-nav-btn" onClick={() => navigateMonth(-1)}>
                <ChevronLeft size={18} />
              </button>
              <span className="month-label">{getMonthLabel(selectedMonth)}</span>
              <button className="month-nav-btn" onClick={() => navigateMonth(1)}>
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Chart View Selector */}
          <div className="chart-view-selector">
            <button
              className={`chart-view-btn ${chartView === 'cumulative' ? 'active' : ''}`}
              onClick={() => setChartView('cumulative')}
              title="Cumulative Trend"
            >
              <Activity size={16} />
            </button>
            <button
              className={`chart-view-btn ${chartView === 'revenue' ? 'active' : ''}`}
              onClick={() => setChartView('revenue')}
              title="Revenue vs Labour"
            >
              <DollarSign size={16} />
            </button>
            <button
              className={`chart-view-btn ${chartView === 'profit' ? 'active' : ''}`}
              onClick={() => setChartView('profit')}
              title="Profit Analysis"
            >
              <TrendingUp size={16} />
            </button>
            <button
              className={`chart-view-btn ${chartView === 'comparison' ? 'active' : ''}`}
              onClick={() => setChartView('comparison')}
              title="Monthly Comparison"
            >
              <BarChart2 size={16} />
            </button>
          </div>

          {/* Auto-Calculate Button */}
          <button
            className="btn-auto-calc"
            onClick={handleAutoCalculate}
            disabled={autoCalcLoading}
          >
            <Calculator size={18} /> 
            {autoCalcLoading ? 'Calculating...' : 'Auto-Calculate'}
          </button>

          <button
            className="btn-primary"
            onClick={() => { resetForm(); setShowForm(true); }}
          >
            <Plus size={18} /> Add Entry
          </button>

          <div className="filter-dropdown-container">
            <button className="filter-btn" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
              <Filter size={16} /> 
              {filterType === 'month' ? 'Monthly' : filterType === 'range' ? 'Range' : 'All'}
              <ChevronDown size={14} />
            </button>

            {showFilterDropdown && (
              <div className="dropdown-menu">
                <div className="filter-section">
                  <label>View Mode</label>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                    <option value="month">Monthly</option>
                    <option value="range">Date Range</option>
                    <option value="all">All Data</option>
                  </select>
                </div>

                {filterType === 'range' && (
                  <>
                    <div className="filter-section">
                      <label>Start Month</label>
                      <input type="month" value={monthRangeStart} onChange={(e) => setMonthRangeStart(e.target.value)} />
                    </div>
                    <div className="filter-section">
                      <label>End Month</label>
                      <input type="month" value={monthRangeEnd} onChange={(e) => setMonthRangeEnd(e.target.value)} />
                    </div>
                  </>
                )}

                <button className="apply-btn" onClick={() => setShowFilterDropdown(false)}>
                  Apply Filters
                </button>
              </div>
            )}
          </div>

          <button className="btn-refresh-modern" onClick={refreshData}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* ==================== INFO BANNER ==================== */}
      <div className="info-banner">
        <AlertCircle size={18} />
        <span>
          <strong>{monthEntriesCount}</strong> entries found for {getMonthLabel(selectedMonth)}. 
          Click <strong>"Auto-Calculate"</strong> to generate cumulative data from entries.
        </span>
      </div>

      {/* ==================== MESSAGES ==================== */}
      {successMessage && (
        <div className="success-message-modern">
          <CheckCircle size={16} /> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="error-message-modern">
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}

      {/* ==================== SEARCH BAR ==================== */}
      <div className="search-bar-modern">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search by date or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="clear-btn" onClick={() => setSearchTerm('')}>
            <XCircle size={18} />
          </button>
        )}
        <span className="result-count">{filteredData.length} entries</span>
      </div>

      {/* ==================== FORM MODAL ==================== */}
      {showForm && (
        <div className="cumulative-modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="cumulative-modal-content" onClick={e => e.stopPropagation()}>
            <div className="cumulative-modal-header" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <div className="cumulative-modal-header-left">
                {editingId ? <Edit size={24} color="#ffffff" /> : <Plus size={24} color="#ffffff" />}
                <h3 style={{ color: '#ffffff' }}>{editingId ? 'Edit Entry' : 'Add Entry'}</h3>
              </div>
              <button className="cumulative-modal-close" onClick={() => { setShowForm(false); resetForm(); }}>
                <X size={24} color="#ffffff" />
              </button>
            </div>
            <div className="cumulative-modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label><Calendar size={14} /> Date <span className="required">*</span></label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label><DollarSign size={14} /> Revenue (BD)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.revenue}
                      onChange={e => setFormData({ ...formData, revenue: e.target.value })}
                      placeholder="0.000"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label><Users size={14} /> Labour (BD)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.labour}
                      onChange={e => setFormData({ ...formData, labour: e.target.value })}
                      placeholder="0.000"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label><BarChart3 size={14} /> OH Share (BD)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={formData.ohShare}
                      onChange={e => setFormData({ ...formData, ohShare: e.target.value })}
                      placeholder="0.000"
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label><TrendingUp size={14} /> Net (Auto-calculated)</label>
                    <input
                      type="text"
                      value={formData.net}
                      disabled
                      className="form-input"
                      style={{ color: parseFloat(formData.net) >= 0 ? '#22c55e' : '#ef4444' }}
                    />
                  </div>
                  <div className="form-group">
                    <label><FileText size={14} /> Notes</label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notes..."
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={loading}>
                    <Save size={16} /> {loading ? 'Saving...' : (editingId ? 'Update' : 'Save')}
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>
                    Cancel
                  </button>
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
        <div
          className="cumulative-card-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            zIndex: 9999
          }}
        >
          <div className="cumulative-tooltip-header">
            <strong>{cardDetails[hoveredCard].title}</strong>
          </div>
          <div className="cumulative-tooltip-body">
            {cardDetails[hoveredCard].details.map((detail, idx) => (
              <div key={idx} className="cumulative-tooltip-row">
                <span className="cumulative-tooltip-label">{detail.label}</span>
                <span className="cumulative-tooltip-value">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== CHARTS ==================== */}
      {chartData.length > 0 && (
        <div className="charts-container">
          {/* Main Chart */}
          <div className="chart-card full-width">
            <div className="chart-header">
              <h3>{getChartTitle()}</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              {renderChart()}
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          {pieData.length > 0 && (
            <div className="chart-card">
              <div className="chart-header"><h3>🥧 Latest Distribution</h3></div>
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => Utils.formatCurrency(value)} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Statistics Summary */}
          <div className="chart-card">
            <div className="chart-header"><h3>📊 Statistics</h3></div>
            <div className="stats-mini-grid">
              <div className="stat-mini-item">
                <div className="stat-mini-label">Average Net</div>
                <div className={`stat-mini-value ${totals.avgNet >= 0 ? 'positive' : 'negative'}`}>
                  {Utils.formatCurrencyShort(totals.avgNet)}
                </div>
              </div>
              <div className="stat-mini-item">
                <div className="stat-mini-label">Max Revenue</div>
                <div className="stat-mini-value positive">
                  {Utils.formatCurrencyShort(totals.maxRevenue)}
                </div>
              </div>
              <div className="stat-mini-item">
                <div className="stat-mini-label">Min Revenue</div>
                <div className="stat-mini-value negative">
                  {Utils.formatCurrencyShort(totals.minRevenue)}
                </div>
              </div>
              <div className="stat-mini-item">
                <div className="stat-mini-label">Total Days</div>
                <div className="stat-mini-value warning">
                  {totals.count}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== TABLE ==================== */}
      <div className="table-container-modern">
        <div className="table-header-modern">
          <div className="table-title">
            <FileText size={18} />
            <h3>Tracker Entries</h3>
            <span className="table-count">{filteredData.length} entries</span>
          </div>
        </div>
        <div className="table-responsive-modern">
          <table className="cumulative-table">
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
                <tr className="empty-row">
                  <td colSpan="8">
                    <div className="empty-state">
                      <Target size={48} />
                      <h3>No Data Available</h3>
                      <p>
                        {monthEntriesCount > 0 
                          ? `Click "Auto-Calculate" to generate data from ${monthEntriesCount} entries.`
                          : `No entries found for ${getMonthLabel(selectedMonth)}. Please add entries first.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="date">{Utils.formatDate(item.date)}</td>
                    <td className="right revenue">{Utils.formatCurrencyShort(item.revenue)}</td>
                    <td className="right labour">{Utils.formatCurrencyShort(item.labour)}</td>
                    <td className="right oh">{Utils.formatCurrencyShort(item.ohShare)}</td>
                    <td className={`right ${(item.net || 0) >= 0 ? 'net-positive' : 'net-negative'}`}>
                      {Utils.formatCurrencyShort(item.net)}
                    </td>
                    <td className={`right ${(item.cumulative || 0) >= 0 ? 'cumulative-positive' : 'cumulative-negative'}`}>
                      {Utils.formatCurrencyShort(item.cumulative)}
                    </td>
                    <td className="center">{getStatusBadge(item.status)}</td>
                    <td className="center">
                      <div className="action-buttons">
                        <button className="btn-action" onClick={() => handleEdit(item)} title="Edit">
                          <Edit size={14} />
                        </button>
                        <button className="btn-action delete" onClick={() => handleDelete(item.id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
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

export default CumulativeTrackerComponent;