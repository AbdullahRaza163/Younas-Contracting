// src/components/BudgetForecasting.jsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Calendar,
  Download,
  X,
  Save,
  RefreshCw,
  Filter,
  Search,
  Target,
  Activity,
  Zap,
  AlertTriangle,
  Wallet,
  Rocket,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  LayoutDashboard,
  FolderKanban,
  Building2,
  Award as AwardIcon,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Plus,
  Edit,
  Trash2,
  Eye,
  Printer,
  BarChart3,
  PieChart,
  LineChart,
  Gauge,
  Sparkles,
  Crown,
  Star,
  Info
} from 'lucide-react';
import Utils from '../utils/Utils';
import './BudgetForecasting.css';
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Bar
} from 'recharts';

import { CONFIG } from '../config/constants';
const API_BASE_URL = CONFIG.API_BASE || 'http://localhost:5000/api';

const BudgetForecasting = ({ data, refreshData }) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [viewMode, setViewMode] = useState('overview');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Form state
  const [formData, setFormData] = useState({
    projectId: '',
    budget: '',
    startDate: '',
    endDate: '',
    category: '',
    notes: ''
  });

  // State for what-if analysis
  const [whatIfScenario, setWhatIfScenario] = useState({
    costChange: 0,
    revenueChange: 0,
    timelineChange: 0
  });

  // Get projects for dropdown
  const projects = useMemo(() => {
    return data.projects || [];
  }, [data.projects]);

  // Get entries for calculations
  const entries = useMemo(() => {
    return data.entries || [];
  }, [data.entries]);

  // Calculate project budget vs actual
  const projectBudgetData = useMemo(() => {
    if (!projects.length) return [];

    return projects.map(project => {
      const projectEntries = entries.filter(e => e.projectId === project.id);
      const actualCost = projectEntries.reduce((sum, e) => 
        sum + (e.labour || 0) + (e.materialCost || 0) + (e.equipmentCost || 0) + 
        (e.transportCost || 0) + (e.otherExpense || 0), 0
      );
      const actualRevenue = projectEntries.reduce((sum, e) => sum + (e.kamai || 0), 0);
      const budget = project.budget || 0;
      const progress = budget > 0 ? (actualCost / budget) * 100 : 0;
      const variance = budget - actualCost;
      const profit = actualRevenue - actualCost;
      const profitMargin = actualRevenue > 0 ? (profit / actualRevenue) * 100 : 0;

      return {
        ...project,
        actualCost,
        actualRevenue,
        budget,
        progress: Math.min(progress, 100),
        variance,
        profit,
        profitMargin,
        entriesCount: projectEntries.length,
        health: progress > 100 ? 'over_budget' : progress > 90 ? 'at_risk' : progress > 75 ? 'warning' : 'on_track'
      };
    });
  }, [projects, entries]);

  // Calculate monthly budget tracking
  const monthlyBudgetData = useMemo(() => {
    if (!entries.length) return [];

    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const me = entries.filter(e => e.date && e.date.startsWith(monthKey));
      const total = me.reduce((sum, e) => sum + (e.kamai || 0), 0);
      const cost = me.reduce((sum, e) => 
        sum + (e.labour || 0) + (e.materialCost || 0) + (e.equipmentCost || 0) + 
        (e.transportCost || 0) + (e.otherExpense || 0), 0
      );
      months.push({
        month: monthKey,
        label: Utils.getShortMonthName(monthKey) + ' ' + d.getFullYear(),
        revenue: total,
        cost: cost,
        profit: total - cost,
        entries: me.length
      });
    }

    return months;
  }, [entries]);

  // Calculate cash flow projection
  const cashFlowData = useMemo(() => {
    if (!entries.length) return [];

    const sorted = [...entries].filter(e => e.date).sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = 0;
    let cumulativeCost = 0;

    return sorted.map(entry => {
      const revenue = entry.kamai || 0;
      const cost = (entry.labour || 0) + (entry.materialCost || 0) + (entry.equipmentCost || 0) + 
                    (entry.transportCost || 0) + (entry.otherExpense || 0);
      cumulative += revenue;
      cumulativeCost += cost;
      return {
        date: entry.date,
        revenue: revenue,
        cost: cost,
        cumulativeRevenue: cumulative,
        cumulativeCost: cumulativeCost,
        cashFlow: cumulative - cumulativeCost,
        profit: revenue - cost
      };
    });
  }, [entries]);

  // Calculate forecast based on historical data
  const forecastData = useMemo(() => {
    if (monthlyBudgetData.length < 3) return null;

    const last6 = monthlyBudgetData.slice(-6);
    const totalRevenue = last6.reduce((sum, m) => sum + m.revenue, 0);
    const totalCost = last6.reduce((sum, m) => sum + m.cost, 0);
    const avgRevenue = totalRevenue / last6.length;
    const avgCost = totalCost / last6.length;
    const avgProfit = avgRevenue - avgCost;
    const growthRate = last6.length > 1 ? 
      ((last6[last6.length - 1].revenue - last6[0].revenue) / (last6[0].revenue || 1)) * 100 : 0;

    const forecast = [];
    const lastMonth = new Date();
    for (let i = 1; i <= 6; i++) {
      const d = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const projectedRevenue = avgRevenue * (1 + (growthRate / 100) * i);
      const projectedCost = avgCost * (1 + (growthRate / 100) * i);
      forecast.push({
        month: monthKey,
        label: Utils.getShortMonthName(monthKey) + ' ' + d.getFullYear(),
        revenue: projectedRevenue,
        cost: projectedCost,
        profit: projectedRevenue - projectedCost,
        isForecast: true
      });
    }

    return {
      avgRevenue,
      avgCost,
      avgProfit,
      growthRate,
      forecast
    };
  }, [monthlyBudgetData]);

  // Get budget alerts
  const budgetAlerts = useMemo(() => {
    const alerts = [];
    projectBudgetData.forEach(project => {
      if (project.progress > 100) {
        alerts.push({
          type: 'critical',
          message: `${project.name} is over budget by ${Utils.formatCurrencyShort(project.variance)}`,
          project: project.name
        });
      } else if (project.progress > 90) {
        alerts.push({
          type: 'warning',
          message: `${project.name} is nearing budget limit (${project.progress.toFixed(1)}%)`,
          project: project.name
        });
      }
    });
    return alerts;
  }, [projectBudgetData]);

  // Handle what-if analysis
  const handleWhatIfAnalysis = useCallback(() => {
    if (!selectedProject) {
      setError('Please select a project for analysis');
      return null;
    }

    const project = projectBudgetData.find(p => p.id === selectedProject);
    if (!project) return null;

    const { costChange, revenueChange } = whatIfScenario;
    const newCost = project.actualCost * (1 + costChange / 100);
    const newRevenue = project.actualRevenue * (1 + revenueChange / 100);
    const newProfit = newRevenue - newCost;
    const newMargin = newRevenue > 0 ? (newProfit / newRevenue) * 100 : 0;

    return {
      currentCost: project.actualCost,
      newCost,
      currentRevenue: project.actualRevenue,
      newRevenue,
      currentProfit: project.profit,
      newProfit,
      currentMargin: project.profitMargin,
      newMargin,
      impact: newProfit - project.profit
    };
  }, [selectedProject, projectBudgetData, whatIfScenario]);

  // Handle hover for tooltips
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

  // Export report
  const exportReport = () => {
    const reportData = {
      date: new Date().toISOString(),
      projects: projectBudgetData,
      monthlyData: monthlyBudgetData,
      forecast: forecastData,
      alerts: budgetAlerts
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget_forecast_report_${Utils.today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess('Report exported successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      on_track: '#22c55e',
      warning: '#f59e0b',
      at_risk: '#f97316',
      over_budget: '#ef4444'
    };
    return colors[status] || '#22c55e';
  };

  const getStatusLabel = (status) => {
    const labels = {
      on_track: 'On Track',
      warning: 'Warning',
      at_risk: 'At Risk',
      over_budget: 'Over Budget'
    };
    return labels[status] || 'On Track';
  };

  const getStatusIcon = (status) => {
    const icons = {
      on_track: CheckCircle,
      warning: AlertTriangle,
      at_risk: AlertCircle,
      over_budget: AlertCircle
    };
    return icons[status] || CheckCircle;
  };

  // Card details for tooltips
  const cardDetails = {
    budget: {
      title: 'Total Budget',
      details: [
        { label: 'Total Budget', value: Utils.formatCurrency(projectBudgetData.reduce((sum, p) => sum + p.budget, 0)) },
        { label: 'Total Actual Cost', value: Utils.formatCurrency(projectBudgetData.reduce((sum, p) => sum + p.actualCost, 0)) },
        { label: 'Projects', value: projectBudgetData.length },
        { label: 'Budget Utilization', value: `${((projectBudgetData.reduce((sum, p) => sum + p.actualCost, 0) / (projectBudgetData.reduce((sum, p) => sum + p.budget, 0) || 1)) * 100).toFixed(1)}%` }
      ]
    },
    revenue: {
      title: 'Total Revenue',
      details: [
        { label: 'Total Revenue', value: Utils.formatCurrency(projectBudgetData.reduce((sum, p) => sum + p.actualRevenue, 0)) },
        { label: 'Total Profit', value: Utils.formatCurrency(projectBudgetData.reduce((sum, p) => sum + p.profit, 0)) },
        { label: 'Avg Profit Margin', value: `${(projectBudgetData.reduce((sum, p) => sum + p.profitMargin, 0) / (projectBudgetData.length || 1)).toFixed(1)}%` },
        { label: 'Total Entries', value: projectBudgetData.reduce((sum, p) => sum + p.entriesCount, 0) }
      ]
    },
    cost: {
      title: 'Total Cost',
      details: [
        { label: 'Total Cost', value: Utils.formatCurrency(projectBudgetData.reduce((sum, p) => sum + p.actualCost, 0)) },
        { label: 'Labour Cost', value: Utils.formatCurrency(entries.reduce((sum, e) => sum + (e.labour || 0), 0)) },
        { label: 'Material Cost', value: Utils.formatCurrency(entries.reduce((sum, e) => sum + (e.materialCost || 0), 0)) },
        { label: 'Equipment Cost', value: Utils.formatCurrency(entries.reduce((sum, e) => sum + (e.equipmentCost || 0), 0)) }
      ]
    },
    profit: {
      title: 'Total Profit',
      details: [
        { label: 'Total Profit', value: Utils.formatCurrency(projectBudgetData.reduce((sum, p) => sum + p.profit, 0)) },
        { label: 'Total Revenue', value: Utils.formatCurrency(projectBudgetData.reduce((sum, p) => sum + p.actualRevenue, 0)) },
        { label: 'Total Cost', value: Utils.formatCurrency(projectBudgetData.reduce((sum, p) => sum + p.actualCost, 0)) },
        { label: 'Overall Margin', value: `${((projectBudgetData.reduce((sum, p) => sum + p.profit, 0) / (projectBudgetData.reduce((sum, p) => sum + p.actualRevenue, 0) || 1)) * 100).toFixed(1)}%` }
      ]
    }
  };

  return (
    <div className="budget-forecasting-modern">
      {/* Header */}
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <DollarSign size={28} />
            <span className="header-badge">Budget</span>
          </div>
          <div>
            <h2>Budget & Forecasting</h2>
            <p className="header-subtitle">Forward-looking financial planning and analysis</p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-export-modern" onClick={exportReport}>
            <Download size={16} />
            Export
          </button>
          <button className="btn-refresh-modern" onClick={() => refreshData()}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <div className="alerts-container-modern">
          {budgetAlerts.map((alert, index) => (
            <div key={index} className={`alert-item-modern ${alert.type}`}>
              {alert.type === 'critical' ? <AlertCircle size={18} /> : <AlertTriangle size={18} />}
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="view-tabs-modern">
        <button
          className={`tab-btn ${viewMode === 'overview' ? 'active' : ''}`}
          onClick={() => setViewMode('overview')}
        >
          <LayoutDashboard size={16} />
          Overview
        </button>
        <button
          className={`tab-btn ${viewMode === 'budget' ? 'active' : ''}`}
          onClick={() => setViewMode('budget')}
        >
          <Target size={16} />
          Budget vs Actual
        </button>
        <button
          className={`tab-btn ${viewMode === 'forecast' ? 'active' : ''}`}
          onClick={() => setViewMode('forecast')}
        >
          <TrendingUpIcon size={16} />
          Forecasting
        </button>
        <button
          className={`tab-btn ${viewMode === 'cashflow' ? 'active' : ''}`}
          onClick={() => setViewMode('cashflow')}
        >
          <Activity size={16} />
          Cash Flow
        </button>
        <button
          className={`tab-btn ${viewMode === 'whatif' ? 'active' : ''}`}
          onClick={() => setViewMode('whatif')}
        >
          <Zap size={16} />
          What-If
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && <div className="error-message-modern"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="success-message-modern"><CheckCircle size={16} /> {success}</div>}

      {/* ============================================
          OVERVIEW VIEW
          ============================================ */}
      {viewMode === 'overview' && (
        <div className="overview-container">
          {/* Summary Cards with Tooltips */}
          <div className="stats-grid-modern">
            <div 
              className="bstat-card-modern budget"
              onMouseEnter={(e) => handleCardHover('budget', e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                <DollarSign size={22} />
              </div>
              <div className="bstat-content">
                <span className="stat-label">Total Budget</span>
                <span className="stat-value">{Utils.formatCurrencyShort(projectBudgetData.reduce((sum, p) => sum + p.budget, 0))}</span>
              </div>
              <div className="stat-trend">
                <TrendingUp size={16} />
              </div>
            </div>

            <div 
              className="bstat-card-modern revenue"
              onMouseEnter={(e) => handleCardHover('revenue', e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="stat-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
                <TrendingUpIcon size={22} />
              </div>
              <div className="bstat-content">
                <span className="stat-label">Total Revenue</span>
                <span className="stat-value">{Utils.formatCurrencyShort(projectBudgetData.reduce((sum, p) => sum + p.actualRevenue, 0))}</span>
              </div>
              <div className="stat-trend">
                <TrendingUp size={16} />
              </div>
            </div>

            <div 
              className="bstat-card-modern cost"
              onMouseEnter={(e) => handleCardHover('cost', e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="stat-icon-wrapper" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                <Wallet size={22} />
              </div>
              <div className="bstat-content">
                <span className="stat-label">Total Cost</span>
                <span className="stat-value">{Utils.formatCurrencyShort(projectBudgetData.reduce((sum, p) => sum + p.actualCost, 0))}</span>
              </div>
              <div className="stat-trend">
                <TrendingDown size={16} />
              </div>
            </div>

            <div 
              className="bstat-card-modern profit"
              onMouseEnter={(e) => handleCardHover('profit', e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <Activity size={22} />
              </div>
              <div className="bstat-content">
                <span className="stat-label">Total Profit</span>
                <span className={`stat-value ${projectBudgetData.reduce((sum, p) => sum + p.profit, 0) >= 0 ? 'profit' : 'loss'}`}>
                  {Utils.formatCurrencyShort(projectBudgetData.reduce((sum, p) => sum + p.profit, 0))}
                </span>
              </div>
              <div className="stat-trend">
                {projectBudgetData.reduce((sum, p) => sum + p.profit, 0) >= 0 ? 
                  <TrendingUp size={16} style={{ color: '#22c55e' }} /> : 
                  <TrendingDown size={16} style={{ color: '#ef4444' }} />
                }
              </div>
            </div>
          </div>

          {/* Tooltip */}
          {hoveredCard && cardDetails[hoveredCard] && (
            <div 
              className="card-tooltip"
              style={{
                position: 'fixed',
                left: tooltipPosition.x,
                top: tooltipPosition.y,
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

          {/* Budget vs Actual Chart */}
          <div className="chart-card-modern">
            <div className="chart-header-modern">
              <div className="chart-header-left">
                <h4>Budget vs Actual by Project</h4>
                <span className="chart-subtitle">Compare planned budget against actual costs and revenue</span>
              </div>
              <div className="chart-legend-custom">
                <span className="legend-item budget"><span className="dot" style={{ background: '#3b82f6' }}></span> Budget</span>
                <span className="legend-item cost"><span className="dot" style={{ background: '#ef4444' }}></span> Actual Cost</span>
                <span className="legend-item revenue"><span className="dot" style={{ background: '#22c55e' }}></span> Revenue</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={projectBudgetData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis dataKey="name" stroke="#8a9bb5" fontSize={11} />
                <YAxis stroke="#8a9bb5" fontSize={11} />
                <Tooltip 
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  labelStyle={{ color: '#1a2332' }}
                  formatter={(value) => Utils.formatCurrencyShort(value)}
                />
                <Legend />
                <Bar dataKey="budget" fill="#3b82f6" name="Budget" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actualCost" fill="#ef4444" name="Actual Cost" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actualRevenue" fill="#22c55e" name="Actual Revenue" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Trend */}
          <div className="chart-card-modern">
            <div className="chart-header-modern">
              <div className="chart-header-left">
                <h4>Monthly Revenue & Cost Trend</h4>
                <span className="chart-subtitle">12-month financial performance overview</span>
              </div>
              <div className="chart-legend-custom">
                <span className="legend-item revenue"><span className="dot" style={{ background: '#22c55e' }}></span> Revenue</span>
                <span className="legend-item cost"><span className="dot" style={{ background: '#ef4444' }}></span> Cost</span>
                <span className="legend-item profit"><span className="dot" style={{ background: '#f59e0b' }}></span> Profit</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ReLineChart data={monthlyBudgetData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis dataKey="label" stroke="#8a9bb5" fontSize={11} />
                <YAxis stroke="#8a9bb5" fontSize={11} />
                <Tooltip 
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  labelStyle={{ color: '#1a2332' }}
                  formatter={(value) => Utils.formatCurrencyShort(value)}
                />
                <Legend />
                <Area type="monotone" dataKey="revenue" fill="#22c55e" stroke="#22c55e" fillOpacity={0.1} name="Revenue" />
                <Area type="monotone" dataKey="cost" fill="#ef4444" stroke="#ef4444" fillOpacity={0.1} name="Cost" />
                <Line type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={2.5} name="Profit" dot={{ r: 4 }} />
              </ReLineChart>
            </ResponsiveContainer>
          </div>

          {/* Projects Overview Table */}
          <div className="table-card-modern">
            <div className="table-header-modern">
              <h4>Project Budget Summary</h4>
              <span className="table-count">{projectBudgetData.length} Projects</span>
            </div>
            <div className="table-responsive">
              <table className="budget-table-modern">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Budget</th>
                    <th>Actual Cost</th>
                    <th>Revenue</th>
                    <th>Profit</th>
                    <th>Progress</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projectBudgetData.map((project, index) => {
                    const StatusIcon = getStatusIcon(project.health);
                    return (
                      <tr key={project.id} className="animate-row" style={{ animationDelay: `${index * 50}ms` }}>
                        <td>
                          <div className="project-cell">
                            <Building2 size={14} className="project-icon" />
                            <span>{project.name}</span>
                          </div>
                        </td>
                        <td>{Utils.formatCurrencyShort(project.budget)}</td>
                        <td>{Utils.formatCurrencyShort(project.actualCost)}</td>
                        <td>{Utils.formatCurrencyShort(project.actualRevenue)}</td>
                        <td className={project.profit >= 0 ? 'profit' : 'loss'}>
                          {Utils.formatCurrencyShort(project.profit)}
                        </td>
                        <td>
                          <div className="progress-cell">
                            <div className="mini-progress">
                              <div 
                                className="mini-progress-fill" 
                                style={{ 
                                  width: `${Math.min(project.progress, 100)}%`, 
                                  background: project.progress > 90 ? '#ef4444' : project.progress > 75 ? '#f59e0b' : '#22c55e' 
                                }} 
                              />
                            </div>
                            <span>{project.progress.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge-modern ${project.health}`} style={{ color: getStatusColor(project.health) }}>
                            <StatusIcon size={12} />
                            {getStatusLabel(project.health)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          BUDGET VS ACTUAL VIEW
          ============================================ */}
      {viewMode === 'budget' && (
        <div className="budget-container">
          {/* Filter Section */}
          <div className="filter-section-modern">
            <div className="search-box-modern">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search projects..."
                value={selectedProject || ''}
                onChange={(e) => setSelectedProject(e.target.value)}
              />
              {selectedProject && (
                <button className="clear-search" onClick={() => setSelectedProject(null)}>
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="filter-group-modern">
              <select
                value={selectedProject || ''}
                onChange={(e) => setSelectedProject(e.target.value || null)}
                className="filter-select-modern"
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="budget-cards-grid">
            {projectBudgetData.filter(p => !selectedProject || p.id === selectedProject).map((project, index) => {
              const StatusIcon = getStatusIcon(project.health);
              return (
                <div key={project.id} className="budget-card-modern" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="budget-card-header">
                    <div className="budget-card-title">
                      <div className="project-icon-wrapper" style={{ background: `linear-gradient(135deg, ${getStatusColor(project.health)}33, ${getStatusColor(project.health)}11)` }}>
                        <FolderKanban size={18} style={{ color: getStatusColor(project.health) }} />
                      </div>
                      <div>
                        <h4>{project.name}</h4>
                        <span className="project-code">{project.code || `PRJ-${String(project.id).padStart(4, '0')}`}</span>
                      </div>
                    </div>
                    <span className={`status-badge-modern ${project.health}`} style={{ color: getStatusColor(project.health) }}>
                      <StatusIcon size={12} />
                      {getStatusLabel(project.health)}
                    </span>
                  </div>

                  <div className="budget-metrics-grid">
                    <div className="metric-item">
                      <span className="metric-label">Budget</span>
                      <span className="metric-value">{Utils.formatCurrency(project.budget)}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Actual Cost</span>
                      <span className="metric-value" style={{ color: '#ef4444' }}>{Utils.formatCurrency(project.actualCost)}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Variance</span>
                      <span className="metric-value" style={{ color: project.variance >= 0 ? '#22c55e' : '#ef4444' }}>
                        {Utils.formatCurrency(project.variance)}
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Progress</span>
                      <span className="metric-value">{project.progress.toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="budget-progress-modern">
                    <div className="progress-track">
                      <div 
                        className="progress-fill-budget" 
                        style={{ 
                          width: `${Math.min(project.progress, 100)}%`,
                          background: project.progress > 90 ? 'linear-gradient(90deg, #f97316, #ef4444)' : 
                                     project.progress > 75 ? 'linear-gradient(90deg, #f59e0b, #f97316)' : 
                                     'linear-gradient(90deg, #22c55e, #16a34a)'
                        }} 
                      />
                    </div>
                    <div className="progress-labels">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <div className="budget-details-grid">
                    <div className="detail-item-modern">
                      <span className="detail-label">Revenue</span>
                      <span className="detail-value">{Utils.formatCurrency(project.actualRevenue)}</span>
                    </div>
                    <div className="detail-item-modern">
                      <span className="detail-label">Profit</span>
                      <span className={`detail-value ${project.profit >= 0 ? 'profit' : 'loss'}`}>
                        {Utils.formatCurrency(project.profit)}
                      </span>
                    </div>
                    <div className="detail-item-modern">
                      <span className="detail-label">Margin</span>
                      <span className={`detail-value ${project.profitMargin >= 0 ? 'profit' : 'loss'}`}>
                        {project.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                    <div className="detail-item-modern">
                      <span className="detail-label">Entries</span>
                      <span className="detail-value">{project.entriesCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================
          FORECASTING VIEW
          ============================================ */}
      {viewMode === 'forecast' && forecastData && (
        <div className="forecast-container">
          <div className="forecast-summary-grid">
            <div className="forecast-card-modern">
              <div className="forecast-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                <DollarSign size={20} />
              </div>
              <div>
                <span className="forecast-label">Avg Monthly Revenue</span>
                <span className="forecast-value">{Utils.formatCurrency(forecastData.avgRevenue)}</span>
              </div>
            </div>
            <div className="forecast-card-modern">
              <div className="forecast-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                <Wallet size={20} />
              </div>
              <div>
                <span className="forecast-label">Avg Monthly Cost</span>
                <span className="forecast-value" style={{ color: '#ef4444' }}>{Utils.formatCurrency(forecastData.avgCost)}</span>
              </div>
            </div>
            <div className="forecast-card-modern">
              <div className="forecast-icon" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <span className="forecast-label">Avg Monthly Profit</span>
                <span className="forecast-value" style={{ color: '#22c55e' }}>{Utils.formatCurrency(forecastData.avgProfit)}</span>
              </div>
            </div>
            <div className="forecast-card-modern">
              <div className="forecast-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <Rocket size={20} />
              </div>
              <div>
                <span className="forecast-label">Growth Rate</span>
                <span className={`forecast-value ${forecastData.growthRate >= 0 ? 'positive' : 'negative'}`}>
                  {forecastData.growthRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="chart-card-modern">
            <div className="chart-header-modern">
              <div className="chart-header-left">
                <h4>6-Month Revenue & Cost Forecast</h4>
                <span className="chart-subtitle">Projected financial performance with trend analysis</span>
              </div>
              <div className="chart-legend-custom">
                <span className="legend-item revenue"><span className="dot" style={{ background: '#22c55e' }}></span> Revenue</span>
                <span className="legend-item cost"><span className="dot" style={{ background: '#ef4444' }}></span> Cost</span>
                <span className="legend-item profit"><span className="dot" style={{ background: '#f59e0b' }}></span> Profit</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ReLineChart data={[...monthlyBudgetData.slice(-6), ...forecastData.forecast]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis dataKey="label" stroke="#8a9bb5" fontSize={11} />
                <YAxis stroke="#8a9bb5" fontSize={11} />
                <Tooltip 
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  labelStyle={{ color: '#1a2332' }}
                  formatter={(value) => Utils.formatCurrencyShort(value)}
                />
                <Legend />
                <Area type="monotone" dataKey="revenue" fill="#22c55e" stroke="#22c55e" fillOpacity={0.1} name="Revenue" />
                <Area type="monotone" dataKey="cost" fill="#ef4444" stroke="#ef4444" fillOpacity={0.1} name="Cost" />
                <Line type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={2.5} name="Profit" dot={{ r: 4 }} />
              </ReLineChart>
            </ResponsiveContainer>
          </div>

          <div className="table-card-modern">
            <div className="table-header-modern">
              <h4>Projected Monthly Breakdown</h4>
              <span className="table-count">6 Months Forecast</span>
            </div>
            <div className="table-responsive">
              <table className="forecast-table-modern">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Projected Revenue</th>
                    <th>Projected Cost</th>
                    <th>Projected Profit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastData.forecast.map((item, index) => (
                    <tr key={item.month} className="animate-row" style={{ animationDelay: `${index * 50}ms` }}>
                      <td>
                        <div className="month-cell">
                          <Calendar size={14} />
                          <span>{item.label}</span>
                        </div>
                      </td>
                      <td>{Utils.formatCurrency(item.revenue)}</td>
                      <td>{Utils.formatCurrency(item.cost)}</td>
                      <td className={item.profit >= 0 ? 'profit' : 'loss'}>
                        {Utils.formatCurrency(item.profit)}
                      </td>
                      <td>
                        <span className={`forecast-status-modern ${item.profit >= 0 ? 'positive' : 'negative'}`}>
                          {item.profit >= 0 ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                          {item.profit >= 0 ? 'Profit' : 'Loss'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          CASH FLOW VIEW - FIXED WITH ALL THREE LINES
          ============================================ */}
      {viewMode === 'cashflow' && (
        <div className="cashflow-container">
          <div className="cashflow-summary-grid">
            <div className="cashflow-card-modern">
              <div className="cashflow-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <Activity size={20} />
              </div>
              <div>
                <span className="cashflow-label">Current Cash Flow</span>
                <span className={`cashflow-value ${cashFlowData.length > 0 && cashFlowData[cashFlowData.length - 1].cashFlow >= 0 ? 'positive' : 'negative'}`}>
                  {cashFlowData.length > 0 ? Utils.formatCurrency(cashFlowData[cashFlowData.length - 1].cashFlow) : '0.000'}
                </span>
              </div>
            </div>
            <div className="cashflow-card-modern">
              <div className="cashflow-icon" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <span className="cashflow-label">Total Revenue</span>
                <span className="cashflow-value positive">
                  {Utils.formatCurrency(cashFlowData.reduce((sum, d) => sum + d.revenue, 0))}
                </span>
              </div>
            </div>
            <div className="cashflow-card-modern">
              <div className="cashflow-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                <TrendingDown size={20} />
              </div>
              <div>
                <span className="cashflow-label">Total Cost</span>
                <span className="cashflow-value negative">
                  {Utils.formatCurrency(cashFlowData.reduce((sum, d) => sum + d.cost, 0))}
                </span>
              </div>
            </div>
            <div className="cashflow-card-modern">
              <div className="cashflow-icon" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
                <AwardIcon size={20} />
              </div>
              <div>
                <span className="cashflow-label">Net Profit</span>
                <span className={`cashflow-value ${cashFlowData.reduce((sum, d) => sum + d.profit, 0) >= 0 ? 'positive' : 'negative'}`}>
                  {Utils.formatCurrency(cashFlowData.reduce((sum, d) => sum + d.profit, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* FIXED: Chart showing all three lines */}
          <div className="chart-card-modern">
            <div className="chart-header-modern">
              <div className="chart-header-left">
                <h4>Cumulative Cash Flow Over Time</h4>
                <span className="chart-subtitle">Track your cumulative revenue, costs, and cash position</span>
              </div>
              <div className="chart-legend-custom">
                <span className="legend-item revenue"><span className="dot" style={{ background: '#22c55e' }}></span> Cum. Revenue</span>
                <span className="legend-item cost"><span className="dot" style={{ background: '#ef4444' }}></span> Cum. Cost</span>
                <span className="legend-item cashflow"><span className="dot" style={{ background: '#f59e0b' }}></span> Cash Flow</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ReLineChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis 
                  dataKey="date" 
                  stroke="#8a9bb5" 
                  fontSize={11}
                  tickFormatter={(value) => {
                    if (!value) return '';
                    const date = new Date(value);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis 
                  stroke="#8a9bb5" 
                  fontSize={11}
                  tickFormatter={(value) => Utils.formatCurrencyShort(value)}
                />
                <Tooltip 
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                  labelStyle={{ color: '#1a2332', fontWeight: 600 }}
                  formatter={(value, name) => {
                    const labels = {
                      cumulativeRevenue: 'Cum. Revenue',
                      cumulativeCost: 'Cum. Cost',
                      cashFlow: 'Cash Flow'
                    };
                    return [Utils.formatCurrency(value), labels[name] || name];
                  }}
                />
                <Legend />
                {/* Cumulative Revenue - Area with transparency */}
                <Area 
                  type="monotone" 
                  dataKey="cumulativeRevenue" 
                  stroke="#22c55e" 
                  fill="#22c55e" 
                  fillOpacity={0.15} 
                  name="Cumulative Revenue"
                  strokeWidth={2}
                />
                {/* Cumulative Cost - Area with transparency */}
                <Area 
                  type="monotone" 
                  dataKey="cumulativeCost" 
                  stroke="#ef4444" 
                  fill="#ef4444" 
                  fillOpacity={0.15} 
                  name="Cumulative Cost"
                  strokeWidth={2}
                />
                {/* Cash Flow - Thick Line with dots */}
                <Line 
                  type="monotone" 
                  dataKey="cashFlow" 
                  stroke="#f59e0b" 
                  strokeWidth={3} 
                  name="Cash Flow" 
                  dot={{ r: 4, strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </ReLineChart>
            </ResponsiveContainer>
          </div>

          {/* Modern Cash Flow Table */}
          <div className="cashflow-table-container">
            <div className="cashflow-table-header">
              <h3>
                <Activity size={18} />
                Cash Flow Details
              </h3>
              <span className="table-badge">
                <Clock size={14} />
                Last 20 Entries
              </span>
            </div>
            <div className="table-responsive">
              <table className="cashflow-table-modern">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Revenue</th>
                    <th>Cost</th>
                    <th>Profit</th>
                    <th>Cumulative Cash Flow</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlowData.slice(-20).map((item, index) => {
                    const isProfit = item.profit >= 0;
                    const isCumulativePositive = item.cashFlow >= 0;
                    const isBigTransaction = Math.abs(item.revenue) > 10000;
                    
                    return (
                      <tr 
                        key={index} 
                        className={`animate-row ${isBigTransaction ? 'highlight-big' : ''}`}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <td>
                          <span className="rank-number">{index + 1}</span>
                        </td>
                        <td>
                          <div className="date-cell">
                            <span className="date-icon">
                              <Calendar size={14} />
                            </span>
                            <span className="date-text">
                              <span className="date-day">{Utils.formatDate(item.date)}</span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="amount-cell revenue">
                            {Utils.formatCurrency(item.revenue)}
                          </span>
                        </td>
                        <td>
                          <span className="amount-cell cost">
                            {Utils.formatCurrency(item.cost)}
                          </span>
                        </td>
                        <td>
                          <span className={`profit-cell ${isProfit ? 'positive' : 'negative'}`}>
                            {Utils.formatCurrency(item.profit)}
                            <span className="profit-badge">
                              {isProfit ? 'Profit' : 'Loss'}
                            </span>
                          </span>
                        </td>
                        <td>
                          <span className={`cumulative-cell ${isCumulativePositive ? 'positive' : 'negative'}`}>
                            <span className="currency-symbol">BD</span>
                            {Utils.formatCurrency(item.cashFlow)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="cashflow-table-footer">
              <div className="total-row">
                <div className="total-item">
                  <span className="label">Total Revenue:</span>
                  <span className="value positive">
                    {Utils.formatCurrency(cashFlowData.reduce((sum, d) => sum + d.revenue, 0))}
                  </span>
                </div>
                <div className="total-item">
                  <span className="label">Total Cost:</span>
                  <span className="value negative">
                    {Utils.formatCurrency(cashFlowData.reduce((sum, d) => sum + d.cost, 0))}
                  </span>
                </div>
                <div className="total-item">
                  <span className="label">Net Profit:</span>
                  <span className={`value ${cashFlowData.reduce((sum, d) => sum + d.profit, 0) >= 0 ? 'positive' : 'negative'}`}>
                    {Utils.formatCurrency(cashFlowData.reduce((sum, d) => sum + d.profit, 0))}
                  </span>
                </div>
              </div>
              <div className="total-item">
                <span className="label">Final Cash Flow:</span>
                <span className={`value ${cashFlowData.length > 0 && cashFlowData[cashFlowData.length - 1].cashFlow >= 0 ? 'positive' : 'negative'}`}>
                  {cashFlowData.length > 0 ? Utils.formatCurrency(cashFlowData[cashFlowData.length - 1].cashFlow) : '0.000'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          WHAT-IF ANALYSIS VIEW
          ============================================ */}
      {viewMode === 'whatif' && (
        <div className="whatif-container-modern">
          <div className="whatif-controls-modern">
            <div className="whatif-header">
              <div className="whatif-title">
                <Zap size={20} />
                <h3>What-If Analysis</h3>
              </div>
              <p className="whatif-subtitle">Adjust parameters to see how changes impact your project's financials</p>
            </div>

            <div className="whatif-controls-grid">
              <div className="control-group-modern">
                <label>Select Project</label>
                <select
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(e.target.value || null)}
                  className="filter-select-modern"
                >
                  <option value="">Select a project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="control-group-modern">
                <label>Cost Change</label>
                <div className="range-control">
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={whatIfScenario.costChange}
                    onChange={(e) => setWhatIfScenario({ ...whatIfScenario, costChange: parseFloat(e.target.value) })}
                    className="range-input-modern"
                    style={{ background: `linear-gradient(to right, #ef4444 ${((whatIfScenario.costChange + 50) / 100) * 100}%, #22c55e ${((whatIfScenario.costChange + 50) / 100) * 100}%)` }}
                  />
                  <span className={`range-value ${whatIfScenario.costChange > 0 ? 'positive' : whatIfScenario.costChange < 0 ? 'negative' : ''}`}>
                    {whatIfScenario.costChange > 0 ? '+' : ''}{whatIfScenario.costChange}%
                  </span>
                </div>
              </div>

              <div className="control-group-modern">
                <label>Revenue Change</label>
                <div className="range-control">
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    value={whatIfScenario.revenueChange}
                    onChange={(e) => setWhatIfScenario({ ...whatIfScenario, revenueChange: parseFloat(e.target.value) })}
                    className="range-input-modern"
                    style={{ background: `linear-gradient(to right, #ef4444 ${((whatIfScenario.revenueChange + 50) / 100) * 100}%, #22c55e ${((whatIfScenario.revenueChange + 50) / 100) * 100}%)` }}
                  />
                  <span className={`range-value ${whatIfScenario.revenueChange > 0 ? 'positive' : whatIfScenario.revenueChange < 0 ? 'negative' : ''}`}>
                    {whatIfScenario.revenueChange > 0 ? '+' : ''}{whatIfScenario.revenueChange}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {selectedProject ? (
            <div className="whatif-results-modern">
              {(() => {
                const result = handleWhatIfAnalysis();
                if (!result) return null;

                return (
                  <>
                    <div className="whatif-summary-grid">
                      <div className="whatif-result-card highlight">
                        <span className="result-label">Current Profit</span>
                        <span className="result-value">{Utils.formatCurrency(result.currentProfit)}</span>
                        <span className="result-sub">Margin: {result.currentMargin.toFixed(1)}%</span>
                      </div>
                      <div className="whatif-result-card highlight">
                        <span className="result-label">Projected Profit</span>
                        <span className={`result-value ${result.newProfit >= 0 ? 'positive' : 'negative'}`}>
                          {Utils.formatCurrency(result.newProfit)}
                        </span>
                        <span className={`result-sub ${result.newMargin >= 0 ? 'positive' : 'negative'}`}>
                          Margin: {result.newMargin.toFixed(1)}%
                        </span>
                      </div>
                      <div className="whatif-result-card highlight">
                        <span className="result-label">Impact</span>
                        <span className={`result-value ${result.impact >= 0 ? 'positive' : 'negative'}`}>
                          {result.impact >= 0 ? '+' : ''}{Utils.formatCurrency(result.impact)}
                        </span>
                        <span className="result-sub">
                          {result.impact >= 0 ? '📈 Improvement' : '📉 Decline'}
                        </span>
                      </div>
                    </div>

                    <div className="whatif-comparison-modern">
                      <h4>Scenario Comparison</h4>
                      <div className="comparison-grid">
                        <div className="comparison-item-modern">
                          <span className="comparison-label">Revenue</span>
                          <div className="comparison-bars">
                            <div className="bar-container">
                              <span className="bar-label">Current</span>
                              <div className="bar-track">
                                <div 
                                  className="bar-fill" 
                                  style={{ 
                                    width: `${(result.currentRevenue / Math.max(result.currentRevenue, result.newRevenue)) * 100}%`, 
                                    background: '#3b82f6' 
                                  }} 
                                />
                              </div>
                              <span className="bar-value">{Utils.formatCurrencyShort(result.currentRevenue)}</span>
                            </div>
                            <div className="bar-container">
                              <span className="bar-label">Projected</span>
                              <div className="bar-track">
                                <div 
                                  className="bar-fill" 
                                  style={{ 
                                    width: `${(result.newRevenue / Math.max(result.currentRevenue, result.newRevenue)) * 100}%`, 
                                    background: '#22c55e' 
                                  }} 
                                />
                              </div>
                              <span className="bar-value">{Utils.formatCurrencyShort(result.newRevenue)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="comparison-item-modern">
                          <span className="comparison-label">Cost</span>
                          <div className="comparison-bars">
                            <div className="bar-container">
                              <span className="bar-label">Current</span>
                              <div className="bar-track">
                                <div 
                                  className="bar-fill" 
                                  style={{ 
                                    width: `${(result.currentCost / Math.max(result.currentCost, result.newCost)) * 100}%`, 
                                    background: '#ef4444' 
                                  }} 
                                />
                              </div>
                              <span className="bar-value">{Utils.formatCurrencyShort(result.currentCost)}</span>
                            </div>
                            <div className="bar-container">
                              <span className="bar-label">Projected</span>
                              <div className="bar-track">
                                <div 
                                  className="bar-fill" 
                                  style={{ 
                                    width: `${(result.newCost / Math.max(result.currentCost, result.newCost)) * 100}%`, 
                                    background: '#f97316' 
                                  }} 
                                />
                              </div>
                              <span className="bar-value">{Utils.formatCurrencyShort(result.newCost)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="comparison-item-modern">
                          <span className="comparison-label">Profit</span>
                          <div className="comparison-bars">
                            <div className="bar-container">
                              <span className="bar-label">Current</span>
                              <div className="bar-track">
                                <div 
                                  className="bar-fill" 
                                  style={{ 
                                    width: `${(result.currentProfit / Math.max(result.currentProfit, result.newProfit)) * 100}%`, 
                                    background: result.currentProfit >= 0 ? '#22c55e' : '#ef4444' 
                                  }} 
                                />
                              </div>
                              <span className={`bar-value ${result.currentProfit >= 0 ? 'positive' : 'negative'}`}>
                                {Utils.formatCurrencyShort(result.currentProfit)}
                              </span>
                            </div>
                            <div className="bar-container">
                              <span className="bar-label">Projected</span>
                              <div className="bar-track">
                                <div 
                                  className="bar-fill" 
                                  style={{ 
                                    width: `${(result.newProfit / Math.max(result.currentProfit, result.newProfit)) * 100}%`, 
                                    background: result.newProfit >= 0 ? '#22c55e' : '#ef4444' 
                                  }} 
                                />
                              </div>
                              <span className={`bar-value ${result.newProfit >= 0 ? 'positive' : 'negative'}`}>
                                {Utils.formatCurrencyShort(result.newProfit)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="whatif-empty">
              <div className="empty-icon-wrapper">
                <Zap size={48} />
              </div>
              <h3>Select a Project</h3>
              <p>Choose a project above to start your what-if analysis</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BudgetForecasting;