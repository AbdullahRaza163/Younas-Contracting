// src/components/BudgetForecasting.jsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle, Calendar,
  Download, X, Save, RefreshCw, Filter, Search, Target, Activity, Zap,
  AlertTriangle, Wallet, Rocket, TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon, LayoutDashboard, FolderKanban,
  Building2, Award as AwardIcon, ArrowUpRight, ArrowDownRight, Clock,
  Plus, Edit, Trash2, Eye, Printer, BarChart3, PieChart, LineChart,
  Gauge, Sparkles, Crown, Star, Info, ArrowUp, ArrowDown, Minus,
  CircleDollarSign, Percent, Layers, Briefcase, ChevronRight
} from 'lucide-react';
import Utils from '../utils/Utils';
import './BudgetForecasting.css';
import {
  LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Area, ComposedChart, Bar, AreaChart,
  RadialBarChart, RadialBar, PolarAngleAxis, Cell, PieChart as RePieChart,
  Pie, ReferenceLine
} from 'recharts';

import { CONFIG } from '../config/constants';
const API_BASE_URL = CONFIG.API_BASE || 'http://localhost:5000/api';

// ============================================
// CUSTOM TOOLTIP
// ============================================
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bf-tooltip">
      <div className="bf-tooltip-label">{label}</div>
      <div className="bf-tooltip-body">
        {payload.map((p, i) => (
          <div key={i} className="bf-tooltip-row">
            <span className="bf-tooltip-dot" style={{ background: p.color || p.fill }} />
            <span className="bf-tooltip-name">{p.name}</span>
            <span className="bf-tooltip-value">{Utils.formatCurrency(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// ANIMATED KPI CARD
// ============================================
const KPICard = ({ icon: Icon, label, value, sub, accent, trend, onHover, onLeave, onMove }) => (
  <div
    className="bf-kpi-card"
    style={{ '--kpi-accent': accent }}
    onMouseEnter={onHover}
    onMouseLeave={onLeave}
    onMouseMove={onMove}
  >
    <div className="bf-kpi-glow" />
    <div className="bf-kpi-top">
      <div className="bf-kpi-icon">
        <Icon size={20} />
      </div>
      {trend && (
        <div className={`bf-kpi-trend ${trend.direction}`}>
          {trend.direction === 'up' && <ArrowUpRight size={14} />}
          {trend.direction === 'down' && <ArrowDownRight size={14} />}
          {trend.direction === 'flat' && <Minus size={14} />}
          <span>{trend.value}</span>
        </div>
      )}
    </div>
    <div className="bf-kpi-content">
      <span className="bf-kpi-label">{label}</span>
      <span className="bf-kpi-value">{value}</span>
      {sub && <span className="bf-kpi-sub">{sub}</span>}
    </div>
  </div>
);

// ============================================
// SECTION TITLE
// ============================================
const SectionTitle = ({ icon: Icon, title, subtitle, action }) => (
  <div className="bf-section-title">
    <div className="bf-section-title-left">
      {Icon && (
        <span className="bf-section-icon">
          <Icon size={16} />
        </span>
      )}
      <div>
        <h4>{title}</h4>
        {subtitle && <span>{subtitle}</span>}
      </div>
    </div>
    {action}
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================
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

  const [formData, setFormData] = useState({
    projectId: '', budget: '', startDate: '', endDate: '', category: '', notes: ''
  });

  const [whatIfScenario, setWhatIfScenario] = useState({
    costChange: 0, revenueChange: 0, timelineChange: 0
  });

  const projects = useMemo(() => data.projects || [], [data.projects]);
  const entries = useMemo(() => data.entries || [], [data.entries]);

  // ============================================
  // COMPUTED
  // ============================================
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
        actualCost, actualRevenue, budget,
        progress: Math.min(progress, 100),
        rawProgress: progress,
        variance, profit, profitMargin,
        entriesCount: projectEntries.length,
        health: progress > 100 ? 'over_budget'
          : progress > 90 ? 'at_risk'
          : progress > 75 ? 'warning' : 'on_track'
      };
    });
  }, [projects, entries]);

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
        shortLabel: Utils.getShortMonthName(monthKey),
        revenue: total, cost: cost, profit: total - cost, entries: me.length
      });
    }
    return months;
  }, [entries]);

  const cashFlowData = useMemo(() => {
    if (!entries.length) return [];
    const sorted = [...entries].filter(e => e.date).sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = 0, cumulativeCost = 0;
    return sorted.map(entry => {
      const revenue = entry.kamai || 0;
      const cost = (entry.labour || 0) + (entry.materialCost || 0) + (entry.equipmentCost || 0) +
                    (entry.transportCost || 0) + (entry.otherExpense || 0);
      cumulative += revenue;
      cumulativeCost += cost;
      return {
        date: entry.date, revenue, cost,
        cumulativeRevenue: cumulative,
        cumulativeCost: cumulativeCost,
        cashFlow: cumulative - cumulativeCost,
        profit: revenue - cost
      };
    });
  }, [entries]);

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
        shortLabel: Utils.getShortMonthName(monthKey),
        revenue: projectedRevenue,
        cost: projectedCost,
        profit: projectedRevenue - projectedCost,
        isForecast: true
      });
    }
    return { avgRevenue, avgCost, avgProfit, growthRate, forecast };
  }, [monthlyBudgetData]);

  const budgetAlerts = useMemo(() => {
    const alerts = [];
    projectBudgetData.forEach(project => {
      if (project.rawProgress > 100) {
        alerts.push({
          type: 'critical',
          message: `${project.name} is over budget by ${Utils.formatCurrencyShort(project.variance)}`,
          project: project.name
        });
      } else if (project.rawProgress > 90) {
        alerts.push({
          type: 'warning',
          message: `${project.name} is nearing budget limit (${project.rawProgress.toFixed(1)}%)`,
          project: project.name
        });
      }
    });
    return alerts;
  }, [projectBudgetData]);

  const totals = useMemo(() => ({
    budget: projectBudgetData.reduce((s, p) => s + p.budget, 0),
    cost: projectBudgetData.reduce((s, p) => s + p.actualCost, 0),
    revenue: projectBudgetData.reduce((s, p) => s + p.actualRevenue, 0),
    profit: projectBudgetData.reduce((s, p) => s + p.profit, 0),
  }), [projectBudgetData]);

  const handleWhatIfAnalysis = useCallback(() => {
    if (!selectedProject) return null;
    const project = projectBudgetData.find(p => p.id === selectedProject);
    if (!project) return null;
    const { costChange, revenueChange } = whatIfScenario;
    const newCost = project.actualCost * (1 + costChange / 100);
    const newRevenue = project.actualRevenue * (1 + revenueChange / 100);
    const newProfit = newRevenue - newCost;
    const newMargin = newRevenue > 0 ? (newProfit / newRevenue) * 100 : 0;
    return {
      currentCost: project.actualCost, newCost,
      currentRevenue: project.actualRevenue, newRevenue,
      currentProfit: project.profit, newProfit,
      currentMargin: project.profitMargin, newMargin,
      impact: newProfit - project.profit
    };
  }, [selectedProject, projectBudgetData, whatIfScenario]);

  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({ x: event.clientX + 15, y: event.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

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

  const getStatusColor = (status) => ({
    on_track: '#10b981', warning: '#f59e0b',
    at_risk: '#f97316', over_budget: '#ef4444'
  }[status] || '#10b981');

  const getStatusLabel = (status) => ({
    on_track: 'On Track', warning: 'Warning',
    at_risk: 'At Risk', over_budget: 'Over Budget'
  }[status] || 'On Track');

  const getStatusIcon = (status) => ({
    on_track: CheckCircle, warning: AlertTriangle,
    at_risk: AlertCircle, over_budget: AlertCircle
  }[status] || CheckCircle);

  const cardDetails = {
    budget: {
      title: 'Total Budget',
      details: [
        { label: 'Total Budget', value: Utils.formatCurrency(totals.budget) },
        { label: 'Total Cost', value: Utils.formatCurrency(totals.cost) },
        { label: 'Projects', value: projectBudgetData.length },
        { label: 'Utilization', value: `${((totals.cost / (totals.budget || 1)) * 100).toFixed(1)}%` }
      ]
    },
    revenue: {
      title: 'Total Revenue',
      details: [
        { label: 'Revenue', value: Utils.formatCurrency(totals.revenue) },
        { label: 'Profit', value: Utils.formatCurrency(totals.profit) },
        { label: 'Avg Margin', value: `${(totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0).toFixed(1)}%` },
        { label: 'Entries', value: entries.length }
      ]
    },
    cost: {
      title: 'Total Cost',
      details: [
        { label: 'Total Cost', value: Utils.formatCurrency(totals.cost) },
        { label: 'Labour', value: Utils.formatCurrency(entries.reduce((s, e) => s + (e.labour || 0), 0)) },
        { label: 'Material', value: Utils.formatCurrency(entries.reduce((s, e) => s + (e.materialCost || 0), 0)) },
        { label: 'Equipment', value: Utils.formatCurrency(entries.reduce((s, e) => s + (e.equipmentCost || 0), 0)) }
      ]
    },
    profit: {
      title: 'Total Profit',
      details: [
        { label: 'Profit', value: Utils.formatCurrency(totals.profit) },
        { label: 'Revenue', value: Utils.formatCurrency(totals.revenue) },
        { label: 'Cost', value: Utils.formatCurrency(totals.cost) },
        { label: 'Margin', value: `${(totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0).toFixed(1)}%` }
      ]
    }
  };

  // ============================================
  // PIE DATA for Overview
  // ============================================
  const pieData = useMemo(() => [
    { name: 'Labour', value: entries.reduce((s, e) => s + (e.labour || 0), 0), color: '#009846' },
    { name: 'Material', value: entries.reduce((s, e) => s + (e.materialCost || 0), 0), color: '#3b82f6' },
    { name: 'Equipment', value: entries.reduce((s, e) => s + (e.equipmentCost || 0), 0), color: '#f59e0b' },
    { name: 'Transport', value: entries.reduce((s, e) => s + (e.transportCost || 0), 0), color: '#8b5cf6' },
    { name: 'Other', value: entries.reduce((s, e) => s + (e.otherExpense || 0), 0), color: '#ef4444' }
  ].filter(d => d.value > 0), [entries]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="bf-root">
      {/* Ambient background */}
      <div className="bf-ambient">
        <div className="bf-orb bf-orb-1" />
        <div className="bf-orb bf-orb-2" />
        <div className="bf-orb bf-orb-3" />
      </div>

      {/* HEADER */}
      <div className="bf-header">
        <div className="bf-header-left">
          <div className="bf-header-icon">
            <CircleDollarSign size={24} />
            <span className="bf-header-badge">
              <Sparkles size={10} /> BUDGET
            </span>
          </div>
          <div>
            <h2>Budget & Forecasting</h2>
            <p className="bf-header-subtitle">
              Forward-looking financial planning · {projects.length} projects · {entries.length} entries
            </p>
          </div>
        </div>
        <div className="bf-header-right">
          <button className="bf-btn bf-btn-ghost" onClick={exportReport}>
            <Download size={15} /> Export
          </button>
          <button className="bf-btn bf-btn-ghost" onClick={() => refreshData()}>
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* ALERTS */}
      {budgetAlerts.length > 0 && (
        <div className="bf-alerts">
          {budgetAlerts.map((alert, i) => (
            <div key={i} className={`bf-alert ${alert.type}`}>
              <span className="bf-alert-icon">
                {alert.type === 'critical' ? <AlertCircle size={16} /> : <AlertTriangle size={16} />}
              </span>
              <span className="bf-alert-text">{alert.message}</span>
              <ChevronRight size={14} className="bf-alert-arrow" />
            </div>
          ))}
        </div>
      )}

      {/* TABS */}
      <div className="bf-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'budget', label: 'Budget vs Actual', icon: Target },
          { id: 'forecast', label: 'Forecasting', icon: TrendingUpIcon },
          { id: 'cashflow', label: 'Cash Flow', icon: Activity },
          { id: 'whatif', label: 'What-If', icon: Zap }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`bf-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => setViewMode(t.id)}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* MESSAGES */}
      {error && (
        <div className="bf-message error">
          <AlertCircle size={15} /> {error}
        </div>
      )}
      {success && (
        <div className="bf-message success">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* ============================================
          OVERVIEW
          ============================================ */}
      {viewMode === 'overview' && (
        <div className="bf-view">
          {/* KPI GRID */}
          <div className="bf-kpi-grid">
            <KPICard
              icon={DollarSign} label="Total Budget"
              value={Utils.formatCurrencyShort(totals.budget)}
              sub={`${projectBudgetData.length} projects`}
              accent="#3b82f6"
              trend={{ direction: 'flat', value: 'Planned' }}
              onHover={(e) => handleCardHover('budget', e)}
              onLeave={handleCardLeave}
              onMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            />
            <KPICard
              icon={TrendingUpIcon} label="Total Revenue"
              value={Utils.formatCurrencyShort(totals.revenue)}
              sub={`${entries.length} entries`}
              accent="#10b981"
              trend={{ direction: 'up', value: 'Earned' }}
              onHover={(e) => handleCardHover('revenue', e)}
              onLeave={handleCardLeave}
              onMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            />
            <KPICard
              icon={Wallet} label="Total Cost"
              value={Utils.formatCurrencyShort(totals.cost)}
              sub={`${((totals.cost / (totals.budget || 1)) * 100).toFixed(0)}% of budget`}
              accent="#ef4444"
              trend={{ direction: 'down', value: 'Spent' }}
              onHover={(e) => handleCardHover('cost', e)}
              onLeave={handleCardLeave}
              onMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            />
            <KPICard
              icon={Activity} label="Total Profit"
              value={Utils.formatCurrencyShort(totals.profit)}
              sub={`${(totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0).toFixed(1)}% margin`}
              accent={totals.profit >= 0 ? '#10b981' : '#ef4444'}
              trend={{
                direction: totals.profit >= 0 ? 'up' : 'down',
                value: totals.profit >= 0 ? 'Profit' : 'Loss'
              }}
              onHover={(e) => handleCardHover('profit', e)}
              onLeave={handleCardLeave}
              onMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            />
          </div>

          {/* TOOLTIP */}
          {hoveredCard && cardDetails[hoveredCard] && (
            <div className="bf-hover-tooltip"
              style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
              <div className="bf-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
              <div className="bf-tooltip-body">
                {cardDetails[hoveredCard].details.map((d, i) => (
                  <div key={i} className="bf-tooltip-row">
                    <span className="bf-tooltip-label">{d.label}</span>
                    <span className="bf-tooltip-value">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CHART ROW 1: Budget vs Actual + Cost Breakdown Pie */}
          <div className="bf-grid-2-1">
            <div className="bf-card">
              <SectionTitle
                icon={BarChart3}
                title="Budget vs Actual by Project"
                subtitle="Compare planned vs spent vs earned"
                action={
                  <div className="bf-legend">
                    <span><i style={{ background: '#3b82f6' }} />Budget</span>
                    <span><i style={{ background: '#ef4444' }} />Cost</span>
                    <span><i style={{ background: '#10b981' }} />Revenue</span>
                  </div>
                }
              />
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={projectBudgetData}>
                  <defs>
                    <linearGradient id="bfBudget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="bfCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="bfRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                    tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="budget" fill="url(#bfBudget)" name="Budget" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="actualCost" fill="url(#bfCost)" name="Actual Cost" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="actualRevenue" fill="url(#bfRevenue)" name="Revenue" radius={[6, 6, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="bf-card">
              <SectionTitle
                icon={PieChart}
                title="Cost Breakdown"
                subtitle="Distribution by category"
              />
              <div className="bf-pie-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <RePieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </RePieChart>
                </ResponsiveContainer>
                <div className="bf-pie-legend">
                  {pieData.map((d, i) => (
                    <div key={i} className="bf-pie-legend-item">
                      <span className="bf-pie-dot" style={{ background: d.color }} />
                      <span className="bf-pie-name">{d.name}</span>
                      <span className="bf-pie-val">{Utils.formatCurrencyShort(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CHART ROW 2: Monthly Trend */}
          <div className="bf-card">
            <SectionTitle
              icon={LineChart}
              title="Monthly Revenue & Cost Trend"
              subtitle="12-month performance overview"
              action={
                <div className="bf-legend">
                  <span><i style={{ background: '#10b981' }} />Revenue</span>
                  <span><i style={{ background: '#ef4444' }} />Cost</span>
                  <span><i style={{ background: '#f59e0b' }} />Profit</span>
                </div>
              }
            />
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={monthlyBudgetData}>
                <defs>
                  <linearGradient id="bfRevArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bfCostArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bfProfitArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5}
                  fill="url(#bfRevArea)" name="Revenue" />
                <Area type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2.5}
                  fill="url(#bfCostArea)" name="Cost" />
                <Area type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={2.5}
                  fill="url(#bfProfitArea)" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* PROJECTS TABLE */}
          <div className="bf-card">
            <SectionTitle
              icon={FolderKanban}
              title="Project Budget Summary"
              subtitle={`${projectBudgetData.length} projects`}
            />
            <div className="bf-table-wrap">
              <table className="bf-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Budget</th>
                    <th>Cost</th>
                    <th>Revenue</th>
                    <th>Profit</th>
                    <th>Progress</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projectBudgetData.map((project, i) => {
                    const StatusIcon = getStatusIcon(project.health);
                    return (
                      <tr key={project.id} style={{ animationDelay: `${i * 40}ms` }}>
                        <td>
                          <div className="bf-cell-project">
                            <span className="bf-cell-icon">
                              <Building2 size={14} />
                            </span>
                            <span>{project.name}</span>
                          </div>
                        </td>
                        <td>{Utils.formatCurrencyShort(project.budget)}</td>
                        <td className="bf-td-red">{Utils.formatCurrencyShort(project.actualCost)}</td>
                        <td className="bf-td-green">{Utils.formatCurrencyShort(project.actualRevenue)}</td>
                        <td className={project.profit >= 0 ? 'bf-td-green' : 'bf-td-red'}>
                          {Utils.formatCurrencyShort(project.profit)}
                        </td>
                        <td>
                          <div className="bf-mini-progress-wrap">
                            <div className="bf-mini-progress">
                              <div className="bf-mini-progress-fill"
                                style={{
                                  width: `${Math.min(project.rawProgress, 100)}%`,
                                  background: project.rawProgress > 90 ? '#ef4444'
                                    : project.rawProgress > 75 ? '#f59e0b' : '#10b981'
                                }} />
                            </div>
                            <span className="bf-mini-progress-label">{project.rawProgress.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`bf-status ${project.health}`}>
                            <StatusIcon size={11} />
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
          BUDGET VS ACTUAL
          ============================================ */}
      {viewMode === 'budget' && (
        <div className="bf-view">
          <div className="bf-filter-bar">
            <div className="bf-search">
              <Search size={16} className="bf-search-icon" />
              <input
                type="text"
                placeholder="Filter by project name..."
                value={selectedProject && typeof selectedProject === 'string' ? selectedProject : ''}
                onChange={(e) => setSelectedProject(e.target.value)}
              />
              {selectedProject && (
                <button className="bf-search-clear" onClick={() => setSelectedProject(null)}>
                  <X size={14} />
                </button>
              )}
            </div>
            <select
              value={projectBudgetData.find(p => p.id === selectedProject) ? selectedProject : ''}
              onChange={(e) => setSelectedProject(e.target.value || null)}
              className="bf-select"
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="bf-budget-grid">
            {projectBudgetData
              .filter(p => !selectedProject || p.id === selectedProject ||
                p.name?.toLowerCase().includes(String(selectedProject).toLowerCase()))
              .map((project, i) => {
                const StatusIcon = getStatusIcon(project.health);
                const color = getStatusColor(project.health);
                return (
                  <div key={project.id} className="bf-budget-card"
                    style={{ '--card-accent': color, animationDelay: `${i * 60}ms` }}>
                    <div className="bf-budget-card-accent" />
                    <div className="bf-budget-card-head">
                      <div className="bf-budget-card-title">
                        <div className="bf-budget-card-icon" style={{ background: `${color}18`, color }}>
                          <FolderKanban size={18} />
                        </div>
                        <div>
                          <h4>{project.name}</h4>
                          <span className="bf-code">
                            {project.code || `PRJ-${String(project.id).padStart(4, '0')}`}
                          </span>
                        </div>
                      </div>
                      <span className={`bf-status ${project.health}`}>
                        <StatusIcon size={11} />
                        {getStatusLabel(project.health)}
                      </span>
                    </div>

                    <div className="bf-budget-metrics">
                      <div className="bf-budget-metric">
                        <span className="bf-bm-label">Budget</span>
                        <span className="bf-bm-value">{Utils.formatCurrencyShort(project.budget)}</span>
                      </div>
                      <div className="bf-budget-metric">
                        <span className="bf-bm-label">Cost</span>
                        <span className="bf-bm-value bf-td-red">{Utils.formatCurrencyShort(project.actualCost)}</span>
                      </div>
                      <div className="bf-budget-metric">
                        <span className="bf-bm-label">Variance</span>
                        <span className={`bf-bm-value ${project.variance >= 0 ? 'bf-td-green' : 'bf-td-red'}`}>
                          {Utils.formatCurrencyShort(project.variance)}
                        </span>
                      </div>
                      <div className="bf-budget-metric">
                        <span className="bf-bm-label">Progress</span>
                        <span className="bf-bm-value">{project.rawProgress.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="bf-progress-track">
                      <div className="bf-progress-fill"
                        style={{
                          width: `${Math.min(project.rawProgress, 100)}%`,
                          background: `linear-gradient(90deg, ${color}, ${color}cc)`
                        }} />
                    </div>

                    <div className="bf-budget-footer">
                      <div className="bf-bf-item">
                        <span>Revenue</span>
                        <strong className="bf-td-green">{Utils.formatCurrencyShort(project.actualRevenue)}</strong>
                      </div>
                      <div className="bf-bf-item">
                        <span>Profit</span>
                        <strong className={project.profit >= 0 ? 'bf-td-green' : 'bf-td-red'}>
                          {Utils.formatCurrencyShort(project.profit)}
                        </strong>
                      </div>
                      <div className="bf-bf-item">
                        <span>Margin</span>
                        <strong className={project.profitMargin >= 0 ? 'bf-td-green' : 'bf-td-red'}>
                          {project.profitMargin.toFixed(1)}%
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ============================================
          FORECASTING
          ============================================ */}
      {viewMode === 'forecast' && forecastData && (
        <div className="bf-view">
          <div className="bf-kpi-grid">
            <KPICard icon={DollarSign} label="Avg Monthly Revenue"
              value={Utils.formatCurrencyShort(forecastData.avgRevenue)}
              sub="Last 6 months" accent="#3b82f6"
              trend={{ direction: 'up', value: 'Trending' }} />
            <KPICard icon={Wallet} label="Avg Monthly Cost"
              value={Utils.formatCurrencyShort(forecastData.avgCost)}
              sub="Last 6 months" accent="#ef4444"
              trend={{ direction: 'down', value: 'Spent' }} />
            <KPICard icon={TrendingUp} label="Avg Monthly Profit"
              value={Utils.formatCurrencyShort(forecastData.avgProfit)}
              sub={forecastData.avgRevenue > 0 ? `${(forecastData.avgProfit / forecastData.avgRevenue * 100).toFixed(1)}% margin` : '0% margin'}
              accent="#10b981"
              trend={{ direction: forecastData.avgProfit >= 0 ? 'up' : 'down', value: forecastData.avgProfit >= 0 ? 'Profit' : 'Loss' }} />
            <KPICard icon={Rocket} label="Growth Rate"
              value={`${forecastData.growthRate >= 0 ? '+' : ''}${forecastData.growthRate.toFixed(1)}%`}
              sub="6-month trend"
              accent={forecastData.growthRate >= 0 ? '#10b981' : '#ef4444'}
              trend={{ direction: forecastData.growthRate >= 0 ? 'up' : 'down', value: 'Growth' }} />
          </div>

          <div className="bf-card">
            <SectionTitle
              icon={TrendingUpIcon}
              title="6-Month Revenue & Cost Forecast"
              subtitle="Projected performance based on 6-month trend"
              action={
                <div className="bf-legend">
                  <span><i style={{ background: '#10b981' }} />Revenue</span>
                  <span><i style={{ background: '#ef4444' }} />Cost</span>
                  <span><i style={{ background: '#f59e0b' }} />Profit</span>
                  <span><i style={{ background: '#94a3b8', borderStyle: 'dashed' }} />Forecast</span>
                </div>
              }
            />
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={[...monthlyBudgetData.slice(-6), ...forecastData.forecast]}>
                <defs>
                  <linearGradient id="bfFRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bfFCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bfFProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x={monthlyBudgetData.slice(-6)[monthlyBudgetData.slice(-6).length - 1]?.shortLabel}
                  stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Forecast →', fill: '#64748b', fontSize: 11, position: 'insideTopRight' }} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5}
                  fill="url(#bfFRev)" name="Revenue" />
                <Area type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2.5}
                  fill="url(#bfFCost)" name="Cost" />
                <Area type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={2.5}
                  fill="url(#bfFProfit)" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bf-card">
            <SectionTitle
              icon={Calendar}
              title="Projected Monthly Breakdown"
              subtitle="6 months ahead"
            />
            <div className="bf-table-wrap">
              <table className="bf-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Revenue</th>
                    <th>Cost</th>
                    <th>Profit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastData.forecast.map((item, i) => (
                    <tr key={item.month} style={{ animationDelay: `${i * 40}ms` }}>
                      <td>
                        <div className="bf-cell-project">
                          <span className="bf-cell-icon"><Calendar size={14} /></span>
                          <span>{item.label}</span>
                        </div>
                      </td>
                      <td className="bf-td-green">{Utils.formatCurrency(item.revenue)}</td>
                      <td className="bf-td-red">{Utils.formatCurrency(item.cost)}</td>
                      <td className={item.profit >= 0 ? 'bf-td-green' : 'bf-td-red'}>
                        {Utils.formatCurrency(item.profit)}
                      </td>
                      <td>
                        <span className={`bf-status ${item.profit >= 0 ? 'on_track' : 'over_budget'}`}>
                          {item.profit >= 0 ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
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
          CASH FLOW
          ============================================ */}
      {viewMode === 'cashflow' && (
        <div className="bf-view">
          <div className="bf-kpi-grid">
            <KPICard icon={Activity} label="Current Cash Flow"
              value={cashFlowData.length ? Utils.formatCurrencyShort(cashFlowData[cashFlowData.length - 1].cashFlow) : '0'}
              sub="Net position"
              accent={cashFlowData.length && cashFlowData[cashFlowData.length - 1].cashFlow >= 0 ? '#10b981' : '#ef4444'}
              trend={{
                direction: cashFlowData.length && cashFlowData[cashFlowData.length - 1].cashFlow >= 0 ? 'up' : 'down',
                value: 'Live'
              }} />
            <KPICard icon={TrendingUpIcon} label="Total Revenue"
              value={Utils.formatCurrencyShort(cashFlowData.reduce((s, d) => s + d.revenue, 0))}
              sub={`${entries.length} entries`} accent="#10b981"
              trend={{ direction: 'up', value: 'Earned' }} />
            <KPICard icon={TrendingDown} label="Total Cost"
              value={Utils.formatCurrencyShort(cashFlowData.reduce((s, d) => s + d.cost, 0))}
              sub="All time" accent="#ef4444"
              trend={{ direction: 'down', value: 'Spent' }} />
            <KPICard icon={AwardIcon} label="Net Profit"
              value={Utils.formatCurrencyShort(cashFlowData.reduce((s, d) => s + d.profit, 0))}
              sub="All time"
              accent={cashFlowData.reduce((s, d) => s + d.profit, 0) >= 0 ? '#10b981' : '#ef4444'}
              trend={{
                direction: cashFlowData.reduce((s, d) => s + d.profit, 0) >= 0 ? 'up' : 'down',
                value: 'Result'
              }} />
          </div>

          <div className="bf-card">
            <SectionTitle
              icon={Activity}
              title="Cumulative Cash Flow Over Time"
              subtitle="Revenue, cost, and net position"
              action={
                <div className="bf-legend">
                  <span><i style={{ background: '#10b981' }} />Revenue</span>
                  <span><i style={{ background: '#ef4444' }} />Cost</span>
                  <span><i style={{ background: '#f59e0b' }} />Cash Flow</span>
                </div>
              }
            />
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={cashFlowData}>
                <defs>
                  <linearGradient id="bfCFRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bfCFCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => {
                    if (!v) return '';
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="cumulativeRevenue" stroke="#10b981" strokeWidth={2.5}
                  fill="url(#bfCFRev)" name="Cumulative Revenue" />
                <Area type="monotone" dataKey="cumulativeCost" stroke="#ef4444" strokeWidth={2.5}
                  fill="url(#bfCFCost)" name="Cumulative Cost" />
                <Line type="monotone" dataKey="cashFlow" stroke="#f59e0b" strokeWidth={3}
                  name="Cash Flow" dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bf-card">
            <SectionTitle
              icon={Clock}
              title="Cash Flow Details"
              subtitle="Last 20 entries"
            />
            <div className="bf-table-wrap">
              <table className="bf-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Revenue</th>
                    <th>Cost</th>
                    <th>Profit</th>
                    <th>Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlowData.slice(-20).map((item, i) => (
                    <tr key={i} style={{ animationDelay: `${i * 30}ms` }}>
                      <td><span className="bf-rank">{i + 1}</span></td>
                      <td>
                        <div className="bf-cell-project">
                          <span className="bf-cell-icon"><Calendar size={13} /></span>
                          <span>{Utils.formatDate(item.date)}</span>
                        </div>
                      </td>
                      <td className="bf-td-green">{Utils.formatCurrency(item.revenue)}</td>
                      <td className="bf-td-red">{Utils.formatCurrency(item.cost)}</td>
                      <td className={item.profit >= 0 ? 'bf-td-green' : 'bf-td-red'}>
                        {Utils.formatCurrency(item.profit)}
                      </td>
                      <td className={item.cashFlow >= 0 ? 'bf-td-green' : 'bf-td-red'}>
                        {Utils.formatCurrency(item.cashFlow)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bf-table-totals">
              <div className="bf-total-item">
                <span>Total Revenue</span>
                <strong className="bf-td-green">
                  {Utils.formatCurrency(cashFlowData.reduce((s, d) => s + d.revenue, 0))}
                </strong>
              </div>
              <div className="bf-total-item">
                <span>Total Cost</span>
                <strong className="bf-td-red">
                  {Utils.formatCurrency(cashFlowData.reduce((s, d) => s + d.cost, 0))}
                </strong>
              </div>
              <div className="bf-total-item">
                <span>Net Profit</span>
                <strong className={cashFlowData.reduce((s, d) => s + d.profit, 0) >= 0 ? 'bf-td-green' : 'bf-td-red'}>
                  {Utils.formatCurrency(cashFlowData.reduce((s, d) => s + d.profit, 0))}
                </strong>
              </div>
              <div className="bf-total-item bf-total-final">
                <span>Final Cash Flow</span>
                <strong className={cashFlowData.length && cashFlowData[cashFlowData.length - 1].cashFlow >= 0 ? 'bf-td-green' : 'bf-td-red'}>
                  {cashFlowData.length ? Utils.formatCurrency(cashFlowData[cashFlowData.length - 1].cashFlow) : '0'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          WHAT-IF
          ============================================ */}
      {viewMode === 'whatif' && (
        <div className="bf-view">
          <div className="bf-card bf-whatif-controls">
            <SectionTitle
              icon={Zap}
              title="What-If Analysis Studio"
              subtitle="Adjust parameters to model financial outcomes"
            />
            <div className="bf-whatif-grid">
              <div className="bf-control">
                <label>Select Project</label>
                <select
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(e.target.value || null)}
                  className="bf-select bf-select-lg"
                >
                  <option value="">Choose a project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="bf-control">
                <label>
                  <span>Cost Change</span>
                  <span className={`bf-control-value ${whatIfScenario.costChange > 0 ? 'neg' : whatIfScenario.costChange < 0 ? 'pos' : ''}`}>
                    {whatIfScenario.costChange > 0 ? '+' : ''}{whatIfScenario.costChange}%
                  </span>
                </label>
                <input
                  type="range" min="-50" max="50"
                  value={whatIfScenario.costChange}
                  onChange={(e) => setWhatIfScenario({ ...whatIfScenario, costChange: parseFloat(e.target.value) })}
                  className="bf-range"
                />
                <div className="bf-range-ticks"><span>-50%</span><span>0</span><span>+50%</span></div>
              </div>

              <div className="bf-control">
                <label>
                  <span>Revenue Change</span>
                  <span className={`bf-control-value ${whatIfScenario.revenueChange > 0 ? 'pos' : whatIfScenario.revenueChange < 0 ? 'neg' : ''}`}>
                    {whatIfScenario.revenueChange > 0 ? '+' : ''}{whatIfScenario.revenueChange}%
                  </span>
                </label>
                <input
                  type="range" min="-50" max="50"
                  value={whatIfScenario.revenueChange}
                  onChange={(e) => setWhatIfScenario({ ...whatIfScenario, revenueChange: parseFloat(e.target.value) })}
                  className="bf-range"
                />
                <div className="bf-range-ticks"><span>-50%</span><span>0</span><span>+50%</span></div>
              </div>
            </div>
          </div>

          {selectedProject ? (() => {
            const result = handleWhatIfAnalysis();
            if (!result) return null;
            return (
              <div className="bf-whatif-results">
                <div className="bf-kpi-grid bf-kpi-grid-3">
                  <KPICard icon={Activity} label="Current Profit"
                    value={Utils.formatCurrencyShort(result.currentProfit)}
                    sub={`Margin: ${result.currentMargin.toFixed(1)}%`}
                    accent="#3b82f6"
                    trend={{ direction: 'flat', value: 'Baseline' }} />
                  <KPICard icon={Sparkles} label="Projected Profit"
                    value={Utils.formatCurrencyShort(result.newProfit)}
                    sub={`Margin: ${result.newMargin.toFixed(1)}%`}
                    accent={result.newProfit >= 0 ? '#10b981' : '#ef4444'}
                    trend={{ direction: result.newProfit >= result.currentProfit ? 'up' : 'down', value: 'Simulated' }} />
                  <KPICard icon={result.impact >= 0 ? TrendingUpIcon : TrendingDown} label="Impact"
                    value={`${result.impact >= 0 ? '+' : ''}${Utils.formatCurrencyShort(result.impact)}`}
                    sub={result.impact >= 0 ? 'Improvement' : 'Decline'}
                    accent={result.impact >= 0 ? '#10b981' : '#ef4444'}
                    trend={{ direction: result.impact >= 0 ? 'up' : 'down', value: 'Delta' }} />
                </div>

                <div className="bf-card">
                  <SectionTitle icon={BarChart3} title="Scenario Comparison" subtitle="Current vs Projected" />
                  <div className="bf-comparison-grid">
                    {[
                      { label: 'Revenue', current: result.currentRevenue, projected: result.newRevenue, color: '#10b981' },
                      { label: 'Cost', current: result.currentCost, projected: result.newCost, color: '#ef4444' },
                      { label: 'Profit', current: result.currentProfit, projected: result.newProfit, color: '#3b82f6' }
                    ].map((row, i) => {
                      const max = Math.max(Math.abs(row.current), Math.abs(row.projected), 1);
                      return (
                        <div key={i} className="bf-comparison">
                          <div className="bf-comparison-head">
                            <span>{row.label}</span>
                            <span className={`bf-comparison-delta ${row.projected >= row.current ? 'pos' : 'neg'}`}>
                              {row.projected >= row.current ? '+' : ''}
                              {Utils.formatCurrencyShort(row.projected - row.current)}
                            </span>
                          </div>
                          <div className="bf-comparison-bar">
                            <span className="bf-cb-label">Current</span>
                            <div className="bf-cb-track">
                              <div className="bf-cb-fill"
                                style={{ width: `${(Math.abs(row.current) / max) * 100}%`, background: row.color, opacity: 0.6 }} />
                            </div>
                            <span className="bf-cb-value">{Utils.formatCurrencyShort(row.current)}</span>
                          </div>
                          <div className="bf-comparison-bar">
                            <span className="bf-cb-label">Projected</span>
                            <div className="bf-cb-track">
                              <div className="bf-cb-fill"
                                style={{ width: `${(Math.abs(row.projected) / max) * 100}%`, background: row.color }} />
                            </div>
                            <span className="bf-cb-value">{Utils.formatCurrencyShort(row.projected)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="bf-empty">
              <div className="bf-empty-icon"><Zap size={40} /></div>
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