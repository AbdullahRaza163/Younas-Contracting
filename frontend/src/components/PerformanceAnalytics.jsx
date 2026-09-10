// src/components/PerformanceAnalytics.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  LineChart,
  Users,
  Building2,
  Award,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  X,
  DollarSign,
  Percent,
  Activity,
  Zap,
  Shield,
  Star,
  LayoutDashboard,
  FolderKanban,
  Wallet,
  CalendarDays,
  MessageSquare,
  Video,
  Link2,
  Unlink,
  PhoneCall,
  Mail as MailIcon,
  Gauge,
  Sparkles,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  HardHat,
  Briefcase,
  Timer,
  User,
  UserCheck,
  UserX,
  Plus,
  Edit,
  Trash2,
  Eye,
  Save,
  FileText,
  Settings,
  Award as AwardIcon,
  Target as TargetIcon
} from 'lucide-react';
import {
  LineChart as ReLineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import Utils from '../utils/Utils';
import './PerformanceAnalytics.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const PerformanceAnalytics = ({ data, refreshData }) => {
  // ============================================
  // STATE
  // ============================================
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [metrics, setMetrics] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [trends, setTrends] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [period, setPeriod] = useState('monthly');
  const [entityType, setEntityType] = useState('site');
  const [viewMode, setViewMode] = useState('overview');
  const [expandedItems, setExpandedItems] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'site',
    target: '',
    currentValue: '',
    unit: '%',
    period: 'monthly',
    description: '',
    notes: ''
  });

  // ============================================
  // LOAD FUNCTIONS
  // ============================================
  const loadMetrics = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/performance/metrics?period=${period}`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!response.ok) throw new Error('Failed to load metrics');
      const result = await response.json();
      setMetrics(result);
      return result;
    } catch (err) {
      console.error('Error loading metrics:', err);
      throw err;
    }
  }, [period]);

  const loadRankings = useCallback(async () => {
    try {
      setRankings([]);
      const response = await fetch(
        `${API_BASE_URL}/performance/rankings?entityType=${entityType}&period=${period}`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!response.ok) throw new Error('Failed to load rankings');
      const result = await response.json();
      if (result && Array.isArray(result) && result.length > 0) {
        setRankings(result);
      } else {
        setRankings([]);
      }
      return result;
    } catch (err) {
      console.error('Error loading rankings:', err);
      setRankings([]);
      throw err;
    }
  }, [entityType, period]);

  const loadTrends = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/performance/trends?metric=revenue&months=12`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!response.ok) throw new Error('Failed to load trends');
      const result = await response.json();
      if (result && result.length > 0) {
        setTrends(result);
      }
      return result;
    } catch (err) {
      console.error('Error loading trends:', err);
      throw err;
    }
  }, []);

  const loadKPIs = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/performance/kpis`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (!response.ok) throw new Error('Failed to load KPIs');
      const result = await response.json();
      if (result && result.length > 0) {
        setKpis(result);
      }
      return result;
    } catch (err) {
      console.error('Error loading KPIs:', err);
      throw err;
    }
  }, []);

  // ============================================
  // LOAD ALL DATA
  // ============================================
  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      await loadMetrics();
      await loadRankings();
      await Promise.all([
        loadTrends(),
        loadKPIs()
      ]);
    } catch (err) {
      setError('Failed to load data. Please refresh and try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [loadMetrics, loadRankings, loadTrends, loadKPIs]);

  useEffect(() => {
    setRankings([]);
    loadAllData();
  }, [period, entityType, loadAllData]);

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const cardDetails = {
    revenue: {
      title: 'Total Revenue',
      details: [
        { label: 'Total Revenue', value: Utils.formatCurrency(metrics?.financial?.totalRevenue || 0) },
        { label: 'Total Cost', value: Utils.formatCurrency(metrics?.financial?.totalCost || 0) },
        { label: 'Total Profit', value: Utils.formatCurrency(metrics?.financial?.totalProfit || 0) },
        { label: 'Profit Margin', value: `${(metrics?.financial?.profitMargin || 0).toFixed(1)}%` }
      ]
    },
    profit: {
      title: 'Total Profit',
      details: [
        { label: 'Total Profit', value: Utils.formatCurrency(metrics?.financial?.totalProfit || 0) },
        { label: 'Total Revenue', value: Utils.formatCurrency(metrics?.financial?.totalRevenue || 0) },
        { label: 'Total Cost', value: Utils.formatCurrency(metrics?.financial?.totalCost || 0) },
        { label: 'Avg Profit/Entry', value: Utils.formatCurrency(metrics?.financial?.avgProfitPerEntry || 0) }
      ]
    },
    margin: {
      title: 'Profit Margin',
      details: [
        { label: 'Profit Margin', value: `${(metrics?.financial?.profitMargin || 0).toFixed(1)}%` },
        { label: 'Total Revenue', value: Utils.formatCurrency(metrics?.financial?.totalRevenue || 0) },
        { label: 'Total Profit', value: Utils.formatCurrency(metrics?.financial?.totalProfit || 0) },
        { label: 'Target Margin', value: '25%' }
      ]
    },
    entries: {
      title: 'Total Entries',
      details: [
        { label: 'Total Entries', value: metrics?.productivity?.totalEntries || 0 },
        { label: 'Avg Daily Entries', value: (metrics?.productivity?.avgDailyEntries || 0).toFixed(1) },
        { label: 'Avg Revenue/Entry', value: Utils.formatCurrency(metrics?.productivity?.avgRevenuePerEntry || 0) },
        { label: 'Labour Cost', value: Utils.formatCurrency(metrics?.productivity?.labourCost || 0) }
      ]
    },
    quality: {
      title: 'Quality Pass Rate',
      details: [
        { label: 'Pass Rate', value: `${(metrics?.quality?.passRate || 0).toFixed(1)}%` },
        { label: 'Total Inspections', value: metrics?.quality?.totalInspections || 0 },
        { label: 'Passed', value: metrics?.quality?.passed || 0 },
        { label: 'Failed', value: metrics?.quality?.failed || 0 }
      ]
    },
    safety: {
      title: 'Safety Incidents',
      details: [
        { label: 'Total Incidents', value: metrics?.safety?.totalIncidents || 0 },
        { label: 'Resolved', value: metrics?.safety?.resolved || 0 },
        { label: 'Resolution Rate', value: `${(metrics?.safety?.resolutionRate || 0).toFixed(1)}%` },
        { label: 'Critical Incidents', value: metrics?.safety?.criticalIncidents || 0 }
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
  // HELPER FUNCTIONS
  // ============================================
  const getMetricColor = (value, target) => {
    if (!target) return '#f59e0b';
    const ratio = value / target;
    if (ratio >= 1) return '#22c55e';
    if (ratio >= 0.75) return '#f59e0b';
    return '#ef4444';
  };

  const formatValue = (value, unit = '') => {
    if (value === undefined || value === null) return '0';
    if (unit === '%') return `${value?.toFixed(1) || 0}%`;
    if (unit === 'BD') return Utils.formatCurrency(value || 0);
    return value?.toFixed(1) || 0;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return '#f59e0b';
    if (rank === 2) return '#94a3b8';
    if (rank === 3) return '#cd7f32';
    return '#8b949e';
  };

  // ============================================
  // HANDLE CRUD OPERATIONS
  // ============================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = editingId
        ? `${API_BASE_URL}/performance/kpis/${editingId}`
        : `${API_BASE_URL}/performance/kpis`;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save KPI');
      }

      const result = await response.json();
      setSuccess(editingId ? 'KPI updated successfully!' : 'KPI created successfully!');
      await loadKPIs();
      resetForm();
      setShowForm(false);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this KPI?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/performance/kpis/${id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to delete KPI');

      setSuccess('KPI deleted successfully!');
      await loadKPIs();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || '',
      type: item.type || 'site',
      target: item.target || '',
      currentValue: item.currentValue || '',
      unit: item.unit || '%',
      period: item.period || 'monthly',
      description: item.description || '',
      notes: item.notes || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'site',
      target: '',
      currentValue: '',
      unit: '%',
      period: 'monthly',
      description: '',
      notes: ''
    });
    setEditingId(null);
  };

  // ============================================
  // RENDER KPI CARDS
  // ============================================
  const renderKPICards = () => {
    if (!metrics) {
      return (
        <div className="empty-state-modern">
          <FileText size={48} />
          <h3>No Metrics Data</h3>
          <p>No metrics data available. Click Refresh to load data.</p>
        </div>
      );
    }

    const productivity = metrics.productivity || {};
    const financial = metrics.financial || {};
    const quality = metrics.quality || {};
    const safety = metrics.safety || {};

    const kpiConfigs = [
      {
        id: 'revenue',
        label: 'Total Revenue',
        value: financial.totalRevenue || 0,
        target: 100000,
        unit: 'BD',
        icon: DollarSign,
        color: '#22c55e',
        bg: 'rgba(34, 197, 94, 0.12)'
      },
      {
        id: 'profit',
        label: 'Total Profit',
        value: financial.totalProfit || 0,
        target: 25000,
        unit: 'BD',
        icon: TrendingUp,
        color: financial.totalProfit >= 0 ? '#22c55e' : '#ef4444',
        bg: financial.totalProfit >= 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)'
      },
      {
        id: 'margin',
        label: 'Profit Margin',
        value: financial.profitMargin || 0,
        target: 25,
        unit: '%',
        icon: Percent,
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.12)'
      },
      {
        id: 'entries',
        label: 'Total Entries',
        value: productivity.totalEntries || 0,
        target: 50,
        unit: '',
        icon: Activity,
        color: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.12)'
      },
      {
        id: 'quality',
        label: 'Quality Pass Rate',
        value: quality.passRate || 0,
        target: 95,
        unit: '%',
        icon: Shield,
        color: quality.passRate >= 90 ? '#22c55e' : '#ef4444',
        bg: quality.passRate >= 90 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)'
      },
      {
        id: 'safety',
        label: 'Safety Incidents',
        value: safety.totalIncidents || 0,
        target: 0,
        unit: '',
        icon: AlertCircle,
        color: safety.totalIncidents === 0 ? '#22c55e' : '#ef4444',
        bg: safety.totalIncidents === 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)'
      }
    ];

    return (
      <div className="stats-grid-modern">
        {kpiConfigs.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.id}
              className="stat-card-modern"
              onMouseEnter={(e) => handleCardHover(kpi.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="stat-icon-wrapper" style={{ background: kpi.bg, color: kpi.color }}>
                <Icon size={22} />
              </div>
              <div className="stat-content">
                <span className="stat-label">{kpi.label}</span>
                <span className="stat-value" style={{ color: kpi.color }}>
                  {formatValue(kpi.value, kpi.unit)}
                </span>
              </div>
              <div className="stat-trend">
                <TrendingUp size={16} />
              </div>
              {kpi.target > 0 && (
                <div className="stat-progress">
                  <div
                    className="stat-progress-bar"
                    style={{
                      width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%`,
                      background: getMetricColor(kpi.value, kpi.target)
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================
  // RENDER RANKINGS
  // ============================================
  const renderRankings = () => {
    if (!rankings || !rankings.length) {
      return (
        <div className="empty-state-modern">
          <Award size={48} />
          <h3>No Rankings Available</h3>
          <p>
            {entityType === 'site' && 'Add more site data to see performance rankings.'}
            {entityType === 'team' && 'Add more team data to see performance rankings.'}
            {entityType === 'worker' && 'Add more worker data to see performance rankings.'}
          </p>
        </div>
      );
    }

    const getRankIcon = (rank) => {
      if (rank === 1) return <Award size={16} color="#f59e0b" />;
      if (rank === 2) return <Award size={16} color="#94a3b8" />;
      if (rank === 3) return <Award size={16} color="#cd7f32" />;
      return <span className="rank-number">{rank}</span>;
    };

    const getScoreLabel = () => {
      if (entityType === 'site') return 'profit margin %';
      if (entityType === 'team') return 'profit margin %';
      return 'revenue';
    };

    return (
      <div className="rankings-container">
        <div className="table-header-modern">
          <div className="table-header-left">
            <h4>
              <Award size={18} />
              {entityType === 'site' && ' Top Performing Sites'}
              {entityType === 'team' && ' Top Performing Teams'}
              {entityType === 'worker' && ' Top Performing Workers'}
            </h4>
            <span className="table-count">{rankings.length} entries</span>
          </div>
          <div className="rankings-controls">
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setRankings([]);
              }}
              className="filter-select-modern"
            >
              <option value="site">Sites</option>
              <option value="team">Teams</option>
              <option value="worker">Workers</option>
            </select>
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setRankings([]);
              }}
              className="filter-select-modern"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div className="rankings-list">
          {rankings.map((item, index) => (
            <div key={item.id || index} className="ranking-item-modern">
              <div className="rank-position" style={{ color: getRankColor(item.rank) }}>
                {getRankIcon(item.rank)}
              </div>
              <div className="rank-info">
                <div className="rank-name">{item.name}</div>
                <div className="rank-meta">
                  {item.members !== undefined && item.members > 0 && (
                    <span><Users size={12} /> {item.members} members</span>
                  )}
                  {item.entries !== undefined && item.entries > 0 && (
                    <span><FileText size={12} /> {item.entries} entries</span>
                  )}
                  {item.revenue !== undefined && item.revenue > 0 && (
                    <span><DollarSign size={12} /> {Utils.formatCurrencyShort(item.revenue)}</span>
                  )}
                  {item.profit !== undefined && item.profit !== 0 && (
                    <span className={item.profit >= 0 ? 'text-success' : 'text-danger'}>
                      {item.profit >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Utils.formatCurrencyShort(item.profit)}
                    </span>
                  )}
                  {item.avgRevenuePerMember !== undefined && item.avgRevenuePerMember > 0 && (
                    <span><User size={12} /> Avg: {Utils.formatCurrencyShort(item.avgRevenuePerMember)}</span>
                  )}
                  {item.daysPresent !== undefined && item.daysPresent > 0 && (
                    <span><Calendar size={12} /> {item.daysPresent} days</span>
                  )}
                </div>
              </div>
              <div className="rank-score">
                <span className="score-value">{item.score?.toFixed(1) || 0}</span>
                <span className="score-label">{getScoreLabel()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER CHARTS
  // ============================================
  const renderCharts = () => {
    if (!metrics) {
      return (
        <div className="empty-state-modern">
          <BarChart3 size={48} />
          <h3>No Chart Data</h3>
          <p>No chart data available</p>
        </div>
      );
    }

    const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
    const productivity = metrics.productivity || {};
    const financial = metrics.financial || {};

    const revenueData = [
      { name: 'Revenue', value: financial.totalRevenue || 0 },
      { name: 'Cost', value: financial.totalCost || 0 },
      { name: 'Profit', value: financial.totalProfit || 0 }
    ];

    const productivityData = [
      { name: 'Entries', value: productivity.totalEntries || 0 },
      { name: 'Avg Revenue/Entry', value: productivity.avgRevenuePerEntry || 0 },
      { name: 'Labour Cost', value: productivity.labourCost || 0 }
    ];

    return (
      <div className="charts-container">
        <div className="chart-grid">
          <div className="chart-card-modern">
            <div className="chart-header-modern">
              <h4><PieChart size={16} /> Revenue Distribution</h4>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <RePieChart>
                <Pie
                  data={revenueData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {revenueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => Utils.formatCurrency(value)} />
              </RePieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card-modern">
            <div className="chart-header-modern">
              <h4><BarChart3 size={16} /> Productivity Metrics</h4>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis dataKey="name" stroke="#8a9bb5" fontSize={10} />
                <YAxis stroke="#8a9bb5" fontSize={10} />
                <Tooltip formatter={(value) => Utils.formatCurrencyShort(value)} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card-modern full-width">
            <div className="chart-header-modern">
              <h4><LineChart size={16} /> Performance Trends (12 Months)</h4>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <ReLineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis dataKey="period" stroke="#8a9bb5" fontSize={10} />
                <YAxis stroke="#8a9bb5" fontSize={10} />
                <Tooltip formatter={(value) => Utils.formatCurrencyShort(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.1}
                />
              </ReLineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card-modern">
            <div className="chart-header-modern">
              <h4><Shield size={16} /> Quality & Safety</h4>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={[
                { name: 'Pass Rate', value: metrics.quality?.passRate || 0 },
                { name: 'Resolution Rate', value: metrics.safety?.resolutionRate || 0 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis dataKey="name" stroke="#8a9bb5" fontSize={10} />
                <YAxis stroke="#8a9bb5" fontSize={10} domain={[0, 100]} />
                <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                <Bar dataKey="value" fill="#22c55e" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card-modern">
            <div className="chart-header-modern">
              <h4><Target size={16} /> Performance Radar</h4>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={[
                { metric: 'Revenue', value: (financial.totalRevenue || 0) / 1000 },
                { metric: 'Quality', value: metrics.quality?.passRate || 0 },
                { metric: 'Safety', value: 100 - (metrics.safety?.totalIncidents || 0) * 10 },
                { metric: 'Productivity', value: productivity.totalEntries || 0 },
                { metric: 'Profit', value: financial.totalProfit || 0 }
              ]}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="metric" stroke="#8a9bb5" fontSize={10} />
                <PolarRadiusAxis stroke="#8a9bb5" fontSize={10} />
                <Radar
                  name="Performance"
                  dataKey="value"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.3}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER METRICS DETAIL
  // ============================================
  const renderMetricsDetail = () => {
    if (!metrics) {
      return (
        <div className="empty-state-modern">
          <FileText size={48} />
          <h3>No Metrics Data</h3>
          <p>No metrics data available</p>
        </div>
      );
    }

    const sections = [
      {
        title: 'Productivity Metrics',
        icon: Activity,
        data: metrics.productivity,
        fields: [
          { key: 'totalEntries', label: 'Total Entries', format: 'number' },
          { key: 'avgDailyEntries', label: 'Avg Daily Entries', format: 'number' },
          { key: 'totalRevenue', label: 'Total Revenue', format: 'currency' },
          { key: 'avgRevenuePerEntry', label: 'Avg Revenue/Entry', format: 'currency' },
          { key: 'labourCost', label: 'Labour Cost', format: 'currency' },
          { key: 'labourToRevenueRatio', label: 'Labour to Revenue Ratio', format: 'percent' }
        ]
      },
      {
        title: 'Financial Metrics',
        icon: DollarSign,
        data: metrics.financial,
        fields: [
          { key: 'totalRevenue', label: 'Total Revenue', format: 'currency' },
          { key: 'totalCost', label: 'Total Cost', format: 'currency' },
          { key: 'totalProfit', label: 'Total Profit', format: 'currency' },
          { key: 'profitMargin', label: 'Profit Margin', format: 'percent' },
          { key: 'avgProfitPerEntry', label: 'Avg Profit/Entry', format: 'currency' }
        ]
      },
      {
        title: 'Quality Metrics',
        icon: Shield,
        data: metrics.quality,
        fields: [
          { key: 'totalInspections', label: 'Total Inspections', format: 'number' },
          { key: 'passed', label: 'Passed', format: 'number' },
          { key: 'failed', label: 'Failed', format: 'number' },
          { key: 'passRate', label: 'Pass Rate', format: 'percent' },
          { key: 'avgScore', label: 'Average Score', format: 'number' }
        ]
      },
      {
        title: 'Safety Metrics',
        icon: AlertCircle,
        data: metrics.safety,
        fields: [
          { key: 'totalIncidents', label: 'Total Incidents', format: 'number' },
          { key: 'resolved', label: 'Resolved', format: 'number' },
          { key: 'resolutionRate', label: 'Resolution Rate', format: 'percent' },
          { key: 'criticalIncidents', label: 'Critical Incidents', format: 'number' },
          { key: 'highIncidents', label: 'High Incidents', format: 'number' }
        ]
      }
    ];

    const formatFieldValue = (value, format) => {
      if (value === undefined || value === null) return 'N/A';
      if (format === 'currency') return Utils.formatCurrency(value);
      if (format === 'percent') return `${value.toFixed(1)}%`;
      return value.toFixed(1);
    };

    return (
      <div className="metrics-detail-grid">
        {sections.map((section, idx) => {
          const Icon = section.icon;
          return (
            <div key={idx} className="metrics-section-card">
              <div className="metrics-section-header">
                <Icon size={18} /> {section.title}
              </div>
              <div className="metrics-section-body">
                {section.fields.map(field => (
                  <div key={field.key} className="metric-row">
                    <span className="metric-label">{field.label}</span>
                    <span className="metric-value">
                      {formatFieldValue(section.data?.[field.key], field.format)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================
  // RENDER FORM MODAL - Updated with better popup
  // ============================================
  const renderFormModal = () => {
    return (
      <div className="modal-overlay-modern" onClick={() => { setShowForm(false); resetForm(); }}>
        <div className="modal-content-modern form-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header-modern">
            <div className="modal-header-left">
              {editingId ? <Edit size={22} color="#009846" /> : <Plus size={22} color="#009846" />}
              <h3>{editingId ? 'Edit KPI' : 'Create New KPI'}</h3>
            </div>
            <button className="modal-close-modern" onClick={() => { setShowForm(false); resetForm(); }}>
              <X size={22} />
            </button>
          </div>
          <div className="modal-body-modern">
            <form onSubmit={handleSubmit}>
              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>KPI Name <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Enter KPI name"
                    className="form-input"
                  />
                </div>
                <div className="form-group-modern">
                  <label>Type <span className="required">*</span></label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    required
                    className="form-select"
                  >
                    <option value="site">Site</option>
                    <option value="team">Team</option>
                    <option value="worker">Worker</option>
                    <option value="project">Project</option>
                  </select>
                </div>
              </div>

              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Target Value <span className="required">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.target}
                    onChange={e => setFormData({ ...formData, target: e.target.value })}
                    required
                    placeholder="Target value"
                    className="form-input"
                  />
                </div>
                <div className="form-group-modern">
                  <label>Current Value <span className="required">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.currentValue}
                    onChange={e => setFormData({ ...formData, currentValue: e.target.value })}
                    required
                    placeholder="Current value"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Unit</label>
                  <select
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="form-select"
                  >
                    <option value="%">%</option>
                    <option value="BD">BD</option>
                    <option value="USD">USD</option>
                    <option value="number">Number</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
                <div className="form-group-modern">
                  <label>Period</label>
                  <select
                    value={formData.period}
                    onChange={e => setFormData({ ...formData, period: e.target.value })}
                    className="form-select"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="form-group-modern">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="KPI description"
                  rows="2"
                  className="form-textarea"
                />
              </div>

              <div className="form-group-modern">
                <label>Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                  className="form-input"
                />
              </div>

              <div className="form-actions-modern">
                <button type="submit" className="btn-primary-modern" disabled={loading}>
                  <Save size={16} /> {loading ? 'Saving...' : (editingId ? 'Update KPI' : 'Create KPI')}
                </button>
                <button type="button" className="btn-secondary-modern" onClick={() => { setShowForm(false); resetForm(); }}>
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
  return (
    <div className="performance-analytics-modern">
      {/* Header */}
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <BarChart3 size={24} />
            <span className="header-badge">Analytics</span>
          </div>
          <div>
            <h2>Performance Analytics</h2>
            <p className="header-subtitle">Advanced analytics and KPI tracking for data-driven decisions</p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-print-modern" onClick={() => window.print()}>
            <Printer size={15} />
            <span>Print</span>
          </button>
          <button className="btn-refresh-modern" onClick={() => {
            setLoading(true);
            setRankings([]);
            loadAllData();
          }}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button className="btn-primary-modern" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={18} />
            <span>New KPI</span>
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="period-selector-modern">
        <div className="period-buttons">
          {['weekly', 'monthly', 'quarterly', 'yearly'].map(p => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => {
                setPeriod(p);
                setRankings([]);
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
        <div className="period-info">
          <span>Showing data for: <strong>{period.charAt(0).toUpperCase() + period.slice(1)}</strong></span>
        </div>
      </div>

      {/* Error/Success */}
      {error && <div className="error-message-modern"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="success-message-modern"><CheckCircle size={16} /> {success}</div>}

      {/* Tooltip */}
      {hoveredCard && cardDetails[hoveredCard] && (
        <div
          className="card-tooltip"
          style={{
            position: 'fixed',
            left: Math.min(tooltipPosition.x, window.innerWidth - 320),
            top: Math.min(tooltipPosition.y, window.innerHeight - 200),
            zIndex: 9999
          }}
        >
          <div className="tooltip-header">
            <strong>{cardDetails[hoveredCard].title}</strong>
          </div>
          <div className="tooltip-body">
            {cardDetails[hoveredCard].details.map((detail, idx) => (
              <div key={idx} className="tooltip-row">
                <span className="tooltip-label">{detail.label}</span>
                <span className="tooltip-value">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Tabs */}
      <div className="view-tabs-modern">
        <button
          className={`tab-btn ${viewMode === 'overview' ? 'active' : ''}`}
          onClick={() => setViewMode('overview')}
        >
          <LayoutDashboard size={16} /> Overview
        </button>
        <button
          className={`tab-btn ${viewMode === 'rankings' ? 'active' : ''}`}
          onClick={() => setViewMode('rankings')}
        >
          <Award size={16} /> Rankings
        </button>
        <button
          className={`tab-btn ${viewMode === 'charts' ? 'active' : ''}`}
          onClick={() => setViewMode('charts')}
        >
          <LineChart size={16} /> Charts
        </button>
        <button
          className={`tab-btn ${viewMode === 'metrics' ? 'active' : ''}`}
          onClick={() => setViewMode('metrics')}
        >
          <Target size={16} /> Detailed Metrics
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-state-modern">
          <div className="loading-spinner-modern"></div>
          <span>Loading analytics data...</span>
        </div>
      ) : (
        <>
          {viewMode === 'overview' && (
            <div className="overview-container">
              {renderKPICards()}
              <div className="overview-grid">
                {renderRankings()}
                <div className="charts-preview">
                  {renderCharts()}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'rankings' && (
            <div className="rankings-container-full">
              {renderRankings()}
            </div>
          )}

          {viewMode === 'charts' && (
            <div className="charts-container-full">
              {renderCharts()}
            </div>
          )}

          {viewMode === 'metrics' && (
            <div className="metrics-container-full">
              {renderMetricsDetail()}
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      {showForm && renderFormModal()}
    </div>
  );
};

export default PerformanceAnalytics;