// src/components/DailyReportComponent.jsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Download, Printer, X, FileText, HardHat,
  Calendar, TrendingUp, TrendingDown,
  Users, Clock, BarChart3, LayoutDashboard,
  Building2, Award, AlertCircle, CheckCircle,
  Info, ArrowUpRight, ArrowDownRight,
  RefreshCw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Eye, EyeOff,
  Zap, Sparkles, Crown, Target, Gauge,
  Receipt, Send, Edit, Trash2, Plus,
  Percent as PercentIcon, PieChart as PieChartIcon,
  LineChart as LineChartIcon, Trophy, Wallet,
  Landmark, Scale, BadgeCheck, Minus, Calculator,
  Banknote, Package, Timer, Filter,
  ChevronDown, Activity, Layers
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  ComposedChart, Area, AreaChart, Line
} from 'recharts';
import Utils from '../utils/Utils';
import { CONFIG } from '../config/constants';
import './DailyReport.css';
import letterheadHeader from '../assets/letterhead-header.png';
import letterheadFooter from '../assets/letterhead-footer.png';
import background from '../assets/background.png';

// ============================================
// PORTAL
// ============================================
const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

// ============================================
// ⭐ ATTENDANCE HOURS HELPER — single source of truth
// Prefers backend-computed totalHours (respects break + OT settings).
// Falls back to raw clock diff only when totalHours is missing.
// ============================================
const getAttendanceHours = (record) => {
  if (!record) return 0;

  // Backend-computed totalHours (best source — respects breakEnabled/overtimeEnabled)
  if (typeof record.totalHours === 'number' && record.totalHours > 0) {
    return record.totalHours;
  }

  // Fallback: raw hours minus break (if break is enabled for this record)
  if (record.checkedIn && record.checkedOut) {
    const inMs = new Date(record.checkedIn).getTime();
    const outMs = new Date(record.checkedOut).getTime();
    if (isNaN(inMs) || isNaN(outMs) || outMs <= inMs) return 0;

    let hours = (outMs - inMs) / (1000 * 60 * 60);

    if (record.breakEnabled === true && record.breakStart && record.breakEnd) {
      const bs = new Date(record.breakStart).getTime();
      const be = new Date(record.breakEnd).getTime();
      if (!isNaN(bs) && !isNaN(be) && be > bs) {
        hours -= (be - bs) / (1000 * 60 * 60);
      }
    }

    return Math.max(0, hours);
  }

  return 0;
};

// ⭐ Wage helper — prefers backend wageEarned, falls back to hours × rate
const getAttendanceWage = (record, worker) => {
  if (!record) return 0;
  if (typeof record.wageEarned === 'number' && record.wageEarned > 0) {
    return record.wageEarned;
  }
  if (!worker) return 0;
  const hours = getAttendanceHours(record);
  return Utils.calculateDailyWage(hours, worker.dailyRate);
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
    <div className="dr-ring-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="rgba(148,163,184,0.18)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="dr-ring-center">
        <span className="dr-ring-value" style={{ color }}>{Math.round(pct * 100)}%</span>
        {label && <span className="dr-ring-label">{label}</span>}
        {sublabel && <span className="dr-ring-sublabel">{sublabel}</span>}
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
    <div className="dr-chart-tooltip">
      {label && <div className="dr-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="dr-chart-tooltip-row">
          <span className="dr-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="dr-chart-tooltip-name">{p.name}</span>
          <span className="dr-chart-tooltip-val">
            {formatter ? formatter(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const DR_COLORS = ['#009846', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

// ============================================
// MAIN COMPONENT
// ============================================
const DailyReportComponent = ({ data, selectedDate }) => {
  const [reportDate, setReportDate] = useState(selectedDate || Utils.today());
  const [dateRange, setDateRange] = useState({
    type: 'today',
    startDate: Utils.today(),
    endDate: Utils.today()
  });
  const [customStart, setCustomStart] = useState(Utils.today());
  const [customEnd, setCustomEnd] = useState(Utils.today());
  const [showCustomPanel, setShowCustomPanel] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [viewMode, setViewMode] = useState('overview');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  // ⭐ Expanded days + loss/profit day filter
  const [expandedDays, setExpandedDays] = useState({});
  const [dailySiteFilter, setDailySiteFilter] = useState('all');

  // Pagination
  const [dailyPage, setDailyPage] = useState(1);
  const [dailyPer, setDailyPer] = useState(10);
  const [sitePage, setSitePage] = useState(1);
  const [sitePer, setSitePer] = useState(10);
  const [workerPage, setWorkerPage] = useState(1);
  const [workerPer, setWorkerPer] = useState(10);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const toggleDayExpand = (date) =>
    setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));

  // ============================================
  // DATE RANGE CALCULATIONS
  // ============================================
  const getDateRange = useCallback((type, customStartArg, customEndArg) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const start = new Date();
    const end = new Date();

    switch (type) {
      case 'today':
        return { startDate: todayStr, endDate: todayStr };
      case 'yesterday': {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().split('T')[0];
        return { startDate: yStr, endDate: yStr };
      }
      case 'thisMonth':
        start.setDate(1);
        return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
      case 'lastMonth':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
      case 'last6Months':
        start.setMonth(start.getMonth() - 6);
        return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
      case 'thisYear':
        start.setMonth(0);
        start.setDate(1);
        return { startDate: start.toISOString().split('T')[0], endDate: todayStr };
      case 'lastYear':
        start.setFullYear(start.getFullYear() - 1);
        start.setMonth(0);
        start.setDate(1);
        end.setFullYear(end.getFullYear() - 1);
        end.setMonth(11);
        end.setDate(31);
        return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
      case 'custom':
        return {
          startDate: customStartArg || todayStr,
          endDate: customEndArg || todayStr
        };
      default:
        return { startDate: reportDate || todayStr, endDate: reportDate || todayStr };
    }
  }, [reportDate]);

  // ============================================
  // FILTERED DATA (with per-site breakdown per day)
  // ============================================
  const filteredData = useMemo(() => {
    const range = getDateRange(dateRange.type, dateRange.startDate, dateRange.endDate);
    const start = range.startDate;
    const end = range.endDate;

    const filteredEntries = data.entries.filter(e => e.date >= start && e.date <= end);
    const filteredAttendance = data.attendance.filter(a => a.date >= start && a.date <= end);

    const uniqueDates = [...new Set(filteredEntries.map(e => e.date))].sort();

    const dailyAggregates = uniqueDates.map(date => {
      const dayEntries = filteredEntries.filter(e => e.date === date);
      const dayAttendance = filteredAttendance.filter(a => a.date === date);

      const revenue = Utils.calculateTotal(dayEntries, 'kamai');
      const labour = Utils.calculateTotal(dayEntries, 'labour');
      const overhead = Utils.calculateTotal(dayEntries, 'overhead');
      const oneTime = Utils.calculateTotal(dayEntries, 'oneTime');
      const profit = revenue - labour - overhead - oneTime;

      const workersPresent = dayAttendance.filter(a => a.present).length;

      // ⭐ Use backend-computed totalHours (respects break/OT toggles)
      const totalHours = dayAttendance.reduce(
        (sum, a) => sum + getAttendanceHours(a),
        0
      );

      // ⭐ Group this day's entries by site
      const bySite = {};
      dayEntries.forEach(e => {
        const key = e.siteId || '__unassigned__';
        if (!bySite[key]) {
          bySite[key] = {
            siteId: e.siteId || null,
            siteName: e.siteName || null,
            revenue: 0,
            labour: 0,
            overhead: 0,
            oneTime: 0,
            profit: 0,
            entryCount: 0,
            workers: new Set(),
          };
        }
        const bucket = bySite[key];
        bucket.revenue += Number(e.kamai || 0);
        bucket.labour += Number(e.labour || 0);
        bucket.overhead += Number(e.overhead || 0);
        bucket.oneTime += Number(e.oneTime || 0);
        bucket.entryCount += 1;
        if (e.workerId) bucket.workers.add(e.workerId);
      });

      // Resolve site names + compute profit/loss status
      const daySites = Object.values(bySite).map(b => {
        const site = b.siteId ? (data.sites || []).find(s => s.id === b.siteId) : null;
        const siteName = b.siteName || site?.name || 'Unassigned';
        const siteProfit = b.revenue - b.labour - b.overhead - b.oneTime;
        return {
          siteId: b.siteId,
          siteName,
          revenue: b.revenue,
          labour: b.labour,
          overhead: b.overhead,
          oneTime: b.oneTime,
          profit: siteProfit,
          entryCount: b.entryCount,
          workerCount: b.workers.size,
          status: siteProfit > 0 ? 'profit' : siteProfit < 0 ? 'loss' : 'break_even',
        };
      }).sort((a, b) => b.profit - a.profit);

      return {
        date, revenue, labour, overhead, oneTime, profit,
        workersPresent, totalHours,
        entryCount: dayEntries.length,
        entries: dayEntries,
        attendance: dayAttendance,
        daySites,
        lossSiteCount: daySites.filter(s => s.status === 'loss').length,
        profitSiteCount: daySites.filter(s => s.status === 'profit').length,
      };
    });

    // ⭐ Totals — use backend-computed totalHours and wageEarned
    const totals = {
      revenue: Utils.calculateTotal(filteredEntries, 'kamai'),
      labour: Utils.calculateTotal(filteredEntries, 'labour'),
      overhead: Utils.calculateTotal(filteredEntries, 'overhead'),
      oneTime: Utils.calculateTotal(filteredEntries, 'oneTime'),
      profit: Utils.calculateTotal(filteredEntries, 'kamai') -
        Utils.calculateTotal(filteredEntries, 'labour') -
        Utils.calculateTotal(filteredEntries, 'overhead') -
        Utils.calculateTotal(filteredEntries, 'oneTime'),
      entryCount: filteredEntries.length,
      uniqueDates: uniqueDates.length,
      totalDays: uniqueDates.length,
      totalWorkers: filteredAttendance.filter(a => a.present).length,
      totalHours: filteredAttendance.reduce(
        (sum, a) => sum + getAttendanceHours(a),
        0
      )
    };

    const workerSummary = data.workers.map(worker => {
      const workerAttendance = filteredAttendance.filter(a => a.workerId === worker.id);

      // ⭐ Use backend-computed totalHours
      const totalHours = workerAttendance.reduce(
        (sum, a) => sum + getAttendanceHours(a),
        0
      );

      // ⭐ Use backend-computed wageEarned when present, else fallback to hours × dailyRate
      const totalWage = workerAttendance.reduce(
        (sum, a) => sum + getAttendanceWage(a, worker),
        0
      );

      const daysPresent = workerAttendance.filter(a => a.present).length;
      return { ...worker, totalHours, daysPresent, totalWage, attendance: workerAttendance };
    });

    const siteSummary = data.sites.map(site => {
      const siteEntries = filteredEntries.filter(e => e.siteId === site.id);
      const revenue = Utils.calculateTotal(siteEntries, 'kamai');
      const labour = Utils.calculateTotal(siteEntries, 'labour');
      const overhead = Utils.calculateTotal(siteEntries, 'overhead');
      const oneTime = Utils.calculateTotal(siteEntries, 'oneTime');
      const profit = revenue - labour - overhead - oneTime;
      return { ...site, revenue, labour, overhead, oneTime, profit, entryCount: siteEntries.length, entries: siteEntries };
    });

    return {
      startDate: start, endDate: end,
      dailyAggregates, totals, workerSummary, siteSummary,
      filteredEntries, filteredAttendance,
      dateRange: range
    };
  }, [data, dateRange, getDateRange, reportDate]);

  // ============================================
  // PAGINATION HELPERS
  // ============================================
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
      <div className="dr-pagination">
        <div className="dr-pagination-info">
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{count}</strong> {label}
        </div>
        <div className="dr-pagination-controls">
          <div className="dr-pagination-items">
            <span>Show:</span>
            <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }} className="dr-pagination-select">
              {[5, 10, 15, 20, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="dr-pagination-buttons">
            <button className="dr-page-btn" onClick={() => setPage(1)} disabled={current === 1}><ChevronsLeft size={13} /></button>
            <button className="dr-page-btn" onClick={() => setPage(current - 1)} disabled={current === 1}><ChevronLeft size={13} /></button>
            {getPageNumbers(current, total).map(p => (
              <button key={p} className={`dr-page-btn ${p === current ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="dr-page-btn" onClick={() => setPage(current + 1)} disabled={current === total}><ChevronRight size={13} /></button>
            <button className="dr-page-btn" onClick={() => setPage(total)} disabled={current === total}><ChevronsRight size={13} /></button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => { setDailyPage(1); }, [dailyPer, dateRange, viewMode, dailySiteFilter]);
  useEffect(() => { setSitePage(1); }, [sitePer, dateRange, viewMode]);
  useEffect(() => { setWorkerPage(1); }, [workerPer, dateRange, viewMode]);

  // ============================================
  // CARD DETAILS
  // ============================================
  const cardDetails = {
    revenue: {
      title: 'Total Revenue',
      details: [
        { label: 'Total Revenue', value: Utils.formatCurrency(filteredData.totals.revenue) },
        { label: 'Total Days', value: filteredData.totals.totalDays },
        { label: 'Avg per Day', value: filteredData.totals.totalDays > 0 ? Utils.formatCurrency(filteredData.totals.revenue / filteredData.totals.totalDays) : '0.000' },
        { label: 'Total Entries', value: filteredData.totals.entryCount }
      ]
    },
    profit: {
      title: 'Net Profit',
      details: [
        { label: 'Net Profit', value: Utils.formatCurrency(filteredData.totals.profit) },
        { label: 'Total Revenue', value: Utils.formatCurrency(filteredData.totals.revenue) },
        { label: 'Total Costs', value: Utils.formatCurrency(filteredData.totals.labour + filteredData.totals.overhead + filteredData.totals.oneTime) },
        { label: 'Profit Margin', value: filteredData.totals.revenue > 0 ? `${((filteredData.totals.profit / filteredData.totals.revenue) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    labour: {
      title: 'Labour Costs',
      details: [
        { label: 'Total Labour', value: Utils.formatCurrency(filteredData.totals.labour) },
        { label: 'Total Workers', value: data.workers?.length || 0 },
        { label: 'Total Hours', value: filteredData.totals.totalHours.toFixed(1) },
        { label: 'Avg per Day', value: filteredData.totals.totalDays > 0 ? Utils.formatCurrency(filteredData.totals.labour / filteredData.totals.totalDays) : '0.000' }
      ]
    },
    sites: {
      title: 'Site Performance',
      details: [
        { label: 'Total Sites', value: data.sites?.length || 0 },
        { label: 'Total Revenue', value: Utils.formatCurrency(filteredData.totals.revenue) },
        { label: 'Best Site', value: filteredData.siteSummary.length > 0 ? filteredData.siteSummary.reduce((a, b) => a.profit > b.profit ? a : b)?.name || 'N/A' : 'N/A' },
        { label: 'Total Entries', value: filteredData.totals.entryCount }
      ]
    }
  };

  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({ x: event.clientX + 15, y: event.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // DATE FILTER HANDLERS
  // ============================================
  const filterOptions = [
    { id: 'today', label: 'Today', icon: Calendar },
    { id: 'yesterday', label: 'Yesterday', icon: Clock },
    { id: 'thisMonth', label: 'This Month', icon: Calendar },
    { id: 'lastMonth', label: 'Last Month', icon: Calendar },
    { id: 'custom', label: 'Custom', icon: Filter }
  ];

  const handleFilterSelect = (type) => {
    if (type === 'custom') {
      setShowCustomPanel(!showCustomPanel);
      return;
    }
    setShowCustomPanel(false);
    const range = getDateRange(type);
    setDateRange({ type, startDate: range.startDate, endDate: range.endDate });
    setShowReport(true);
  };

  const applyCustomRange = () => {
    if (customStart && customEnd) {
      setDateRange({ type: 'custom', startDate: customStart, endDate: customEnd });
      setShowReport(true);
      setShowCustomPanel(false);
    }
  };

  // ============================================
  // CHART DATA
  // ============================================
  const costBreakdownData = useMemo(() => {
    const total = filteredData.totals.revenue || 1;
    return [
      { key: 'labour', label: 'Labour', value: filteredData.totals.labour, pct: (filteredData.totals.labour / total) * 100, color: '#ef4444' },
      { key: 'overhead', label: 'Overhead', value: filteredData.totals.overhead, pct: (filteredData.totals.overhead / total) * 100, color: '#f59e0b' },
      { key: 'oneTime', label: 'One-Time', value: filteredData.totals.oneTime, pct: (filteredData.totals.oneTime / total) * 100, color: '#8b5cf6' },
      { key: 'profit', label: 'Profit', value: Math.max(0, filteredData.totals.profit), pct: (Math.max(0, filteredData.totals.profit) / total) * 100, color: '#009846' }
    ];
  }, [filteredData]);

  const dailyChartData = useMemo(() => {
    return filteredData.dailyAggregates.map(d => ({
      label: d.date.slice(5),
      date: d.date,
      revenue: d.revenue,
      profit: d.profit,
      labour: d.labour
    }));
  }, [filteredData.dailyAggregates]);

  const topSitesData = useMemo(() => {
    return [...filteredData.siteSummary]
      .filter(s => s.entryCount > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8)
      .map(s => ({
        name: s.name.length > 14 ? s.name.slice(0, 14) + '…' : s.name,
        value: s.profit,
        revenue: s.revenue
      }));
  }, [filteredData.siteSummary]);

  const siteRevenueChartData = useMemo(() => {
    return [...filteredData.siteSummary]
      .filter(s => s.entryCount > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(s => ({
        name: s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name,
        revenue: s.revenue,
        profit: Math.max(0, s.profit),
        labour: s.labour
      }));
  }, [filteredData.siteSummary]);

  const topWorkersData = useMemo(() => {
    return [...filteredData.workerSummary]
      .filter(w => w.totalWage > 0)
      .sort((a, b) => b.totalWage - a.totalWage)
      .slice(0, 8)
      .map(w => ({
        name: w.name.length > 14 ? w.name.slice(0, 14) + '…' : w.name,
        value: w.totalWage,
        hours: w.totalHours,
        days: w.daysPresent
      }));
  }, [filteredData.workerSummary]);

  // ============================================
  // KPI ITEMS
  // ============================================
  const kpiItems = [
    {
      id: 'revenue', icon: Banknote, label: 'Total Revenue',
      value: Utils.formatCurrencyShort(filteredData.totals.revenue),
      meta: `${filteredData.totals.totalDays} days · ${filteredData.totals.entryCount} entries`,
      color: '#009846', accent: 'linear-gradient(90deg,#009846,#34d399)', trend: 'up'
    },
    {
      id: 'profit', icon: TrendingUp, label: 'Net Profit',
      value: Utils.formatCurrencyShort(filteredData.totals.profit),
      meta: filteredData.totals.revenue > 0 ? `${((filteredData.totals.profit / filteredData.totals.revenue) * 100).toFixed(1)}% margin` : '0%',
      color: filteredData.totals.profit >= 0 ? '#009846' : '#ef4444',
      accent: filteredData.totals.profit >= 0
        ? 'linear-gradient(90deg,#009846,#34d399)'
        : 'linear-gradient(90deg,#dc2626,#ef4444)',
      trend: filteredData.totals.profit >= 0 ? 'up' : 'down'
    },
    {
      id: 'labour', icon: Users, label: 'Labour Costs',
      value: Utils.formatCurrencyShort(filteredData.totals.labour),
      meta: `${filteredData.totals.totalHours.toFixed(1)}h worked`,
      color: '#ef4444', accent: 'linear-gradient(90deg,#ef4444,#f87171)', trend: 'neutral'
    },
    {
      id: 'sites', icon: Building2, label: 'Active Sites',
      value: data.sites?.length || 0,
      meta: `${filteredData.siteSummary.filter(s => s.entryCount > 0).length} with entries`,
      color: '#3b82f6', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'neutral'
    }
  ];

  // ============================================
  // EXPORT CSV
  // ============================================
  const exportDailyReport = () => {
    const rows = [
      ['HAJI YOUNAS CONTRACTING - DAILY REPORT'],
      [`Period: ${filteredData.startDate} to ${filteredData.endDate}`],
      ['Generated:', new Date().toLocaleString()],
      [],
      ['=== DAILY SUMMARY ==='],
      ['Date', 'Revenue', 'Labour', 'Overhead', 'One-Time', 'Profit', 'Workers', 'Hours']
    ];
    filteredData.dailyAggregates.forEach(day => {
      rows.push([
        day.date, day.revenue.toFixed(3), day.labour.toFixed(3), day.overhead.toFixed(3),
        day.oneTime.toFixed(3), day.profit.toFixed(3), day.workersPresent, day.totalHours.toFixed(1)
      ]);
    });
    rows.push([]);
    rows.push(['=== DAILY × SITE BREAKDOWN ===']);
    rows.push(['Date', 'Site', 'Entries', 'Workers', 'Revenue', 'Labour', 'Overhead', 'One-Time', 'Profit', 'Result']);
    filteredData.dailyAggregates.forEach(day => {
      day.daySites.forEach(s => {
        rows.push([
          day.date,
          s.siteName,
          s.entryCount,
          s.workerCount,
          s.revenue.toFixed(3),
          s.labour.toFixed(3),
          s.overhead.toFixed(3),
          s.oneTime.toFixed(3),
          s.profit.toFixed(3),
          s.status === 'loss' ? 'LOSS' : s.status === 'profit' ? 'PROFIT' : 'BREAK-EVEN'
        ]);
      });
    });
    rows.push([]);
    rows.push(['=== TOTALS ===']);
    rows.push(['Total Revenue', filteredData.totals.revenue.toFixed(3)]);
    rows.push(['Total Labour', filteredData.totals.labour.toFixed(3)]);
    rows.push(['Total Overhead', filteredData.totals.overhead.toFixed(3)]);
    rows.push(['Total One-Time', filteredData.totals.oneTime.toFixed(3)]);
    rows.push(['Net Profit', filteredData.totals.profit.toFixed(3)]);
    rows.push(['Total Entries', filteredData.totals.entryCount]);
    rows.push(['Total Days', filteredData.totals.totalDays]);

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_report_${filteredData.startDate}_to_${filteredData.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================
  // PRINT REPORT (with Site × Day breakdown)
  // ============================================
  const generateProfessionalReportHTML = () => {
    const companyName = CONFIG.COMPANY_NAME || 'Haji Younas Contracting';
    const primary = '#1a3c6e';
    const light = '#e8edf3';
    const muted = '#6a6a8a';
    const border = '#d4d9e0';
    const text = '#1a1a2e';

    const { dailyAggregates, totals, workerSummary, siteSummary } = filteredData;

    // Build the day-by-site section
    const daySiteSection = dailyAggregates
      .filter(d => d.daySites.length > 0)
      .map(day => `
        <div style="margin-top:14px;">
          <div style="background:${light}; padding:6px 12px; border-left:3px solid ${primary}; font-size:13px; font-weight:700; color:${primary}; margin-bottom:6px;">
            ${Utils.formatDate(day.date)} — ${day.daySites.length} site(s) · Total Profit: ${Utils.formatCurrencyShort(day.profit)}
          </div>
          <table class="report-table">
            <thead><tr>
              <th>Site</th>
              <th class="text-right">Entries</th>
              <th class="text-right">Workers</th>
              <th class="text-right">Revenue</th>
              <th class="text-right">Labour</th>
              <th class="text-right">Overhead</th>
              <th class="text-right">One-Time</th>
              <th class="text-right">Profit</th>
              <th class="text-center">Result</th>
            </tr></thead>
            <tbody>
              ${day.daySites.map(s => `<tr>
                <td>${s.siteName}</td>
                <td class="text-right">${s.entryCount}</td>
                <td class="text-right">${s.workerCount}</td>
                <td class="text-right positive">${Utils.formatCurrencyShort(s.revenue)}</td>
                <td class="text-right">${Utils.formatCurrencyShort(s.labour)}</td>
                <td class="text-right">${Utils.formatCurrencyShort(s.overhead)}</td>
                <td class="text-right">${Utils.formatCurrencyShort(s.oneTime)}</td>
                <td class="text-right ${s.profit >= 0 ? 'positive' : 'negative'}"><strong>${Utils.formatCurrencyShort(s.profit)}</strong></td>
                <td class="text-center ${s.profit >= 0 ? 'positive' : 'negative'}"><strong>${s.status === 'loss' ? 'LOSS' : s.status === 'profit' ? 'PROFIT' : 'B/E'}</strong></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Daily Work Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Arial, serif; background: #fff; color: ${text}; }
    .report-container { max-width: 1100px; margin: 0 auto; position: relative; }
    .report-background { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.05; z-index: 0; pointer-events: none; }
    .report-background img { width: 500px; }
    .report-content { position: relative; z-index: 1; }
    .header-img img, .footer-img img { width: 100%; display: block; }
    .report-body { padding: 20px 40px 30px; }
    .report-title { text-align: center; padding: 20px 0; border-bottom: 3px solid ${primary}; margin-bottom: 20px; }
    .report-title h1 { font-size: 28px; color: ${primary}; letter-spacing: 2px; }
    .report-title .sub { font-size: 14px; color: ${muted}; margin-top: 4px; }
    .report-meta { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid ${border}; margin-bottom: 20px; flex-wrap: wrap; gap: 8px; }
    .report-meta span { font-size: 13px; color: ${muted}; }
    .report-meta strong { color: ${primary}; }
    .section { margin-bottom: 28px; page-break-inside: avoid; }
    .section h2 { font-size: 18px; color: ${primary}; padding-bottom: 8px; border-bottom: 2px solid ${border}; margin-bottom: 14px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat-card { background: ${light}; padding: 14px 16px; border-radius: 6px; border: 1px solid ${border}; text-align: center; }
    .stat-card .label { font-size: 11px; color: ${muted}; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-card .value { font-size: 20px; font-weight: 700; color: ${primary}; margin-top: 4px; }
    .stat-card .value.positive { color: #009846; }
    .stat-card .value.negative { color: #ef4444; }
    .report-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .report-table thead { background: ${primary}; }
    .report-table th { color: #fff; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .report-table th.text-right { text-align: right; }
    .report-table th.text-center { text-align: center; }
    .report-table td { padding: 6px 12px; border-bottom: 1px solid ${border}; }
    .report-table td.text-right { text-align: right; }
    .report-table td.text-center { text-align: center; }
    .report-table td.amount { font-weight: 600; }
    .report-table td.positive { color: #009846; }
    .report-table td.negative { color: #ef4444; }
    .report-table tfoot { background: ${light}; font-weight: 700; }
    .report-table tfoot td { border-top: 2px solid ${primary}; padding: 8px 12px; }
    .report-table .no-data { text-align: center; padding: 30px; color: ${muted}; }
    @media print {
      @page { margin: 0; size: A4; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-background"><img src="${background}" /></div>
    <div class="report-content">
      <div class="header-img"><img src="${letterheadHeader}" /></div>
      <div class="report-body">
        <div class="report-title">
          <h1>DAILY WORK REPORT</h1>
          <div class="sub">${companyName} • Construction & Contracting</div>
        </div>
        <div class="report-meta">
          <span><strong>Period:</strong> ${filteredData.startDate} to ${filteredData.endDate}</span>
          <span><strong>Total Days:</strong> ${totals.totalDays}</span>
          <span><strong>Total Entries:</strong> ${totals.entryCount}</span>
          <span><strong>Generated:</strong> ${new Date().toLocaleString()}</span>
        </div>
        <div class="section">
          <h2>📊 Executive Summary</h2>
          <div class="stats-grid">
            <div class="stat-card"><div class="label">Total Revenue</div><div class="value positive">${Utils.formatCurrencyShort(totals.revenue)}</div></div>
            <div class="stat-card"><div class="label">Total Labour</div><div class="value">${Utils.formatCurrencyShort(totals.labour)}</div></div>
            <div class="stat-card"><div class="label">Total Overhead</div><div class="value">${Utils.formatCurrencyShort(totals.overhead)}</div></div>
            <div class="stat-card"><div class="label">Net Profit</div><div class="value ${totals.profit >= 0 ? 'positive' : 'negative'}">${Utils.formatCurrencyShort(totals.profit)}</div></div>
          </div>
        </div>
        <div class="section">
          <h2>📈 Daily Summary</h2>
          <table class="report-table">
            <thead><tr>
              <th>#</th><th>Date</th><th class="text-right">Entries</th>
              <th class="text-right">Revenue</th><th class="text-right">Labour</th>
              <th class="text-right">Overhead</th><th class="text-right">One-Time</th>
              <th class="text-right">Profit</th><th class="text-center">Workers</th><th class="text-right">Hours</th>
            </tr></thead>
            <tbody>
              ${dailyAggregates.length === 0 ? `<tr><td colspan="10" class="no-data">No data for this period</td></tr>` :
                dailyAggregates.map((day, i) => `<tr>
                  <td>${i + 1}</td>
                  <td>${Utils.formatDate(day.date)}</td>
                  <td class="text-right">${day.entryCount}</td>
                  <td class="text-right amount positive">${Utils.formatCurrencyShort(day.revenue)}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(day.labour)}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(day.overhead)}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(day.oneTime)}</td>
                  <td class="text-right amount ${day.profit >= 0 ? 'positive' : 'negative'}">${Utils.formatCurrencyShort(day.profit)}</td>
                  <td class="text-center">${day.workersPresent}</td>
                  <td class="text-right">${day.totalHours.toFixed(1)}h</td>
                </tr>`).join('')}
            </tbody>
            <tfoot><tr>
              <td colspan="2"><strong>TOTALS</strong></td>
              <td class="text-right"><strong>${totals.entryCount}</strong></td>
              <td class="text-right"><strong>${Utils.formatCurrencyShort(totals.revenue)}</strong></td>
              <td class="text-right"><strong>${Utils.formatCurrencyShort(totals.labour)}</strong></td>
              <td class="text-right"><strong>${Utils.formatCurrencyShort(totals.overhead)}</strong></td>
              <td class="text-right"><strong>${Utils.formatCurrencyShort(totals.oneTime)}</strong></td>
              <td class="text-right"><strong>${Utils.formatCurrencyShort(totals.profit)}</strong></td>
              <td colspan="2"></td>
            </tr></tfoot>
          </table>
        </div>
        <div class="section">
          <h2>🏗️ Daily × Site Breakdown (Profit / Loss per Site per Day)</h2>
          ${daySiteSection || '<div class="no-data">No site-by-day data for this period</div>'}
        </div>
        <div class="section">
          <h2>🏗️ Site Performance (Period Total)</h2>
          <table class="report-table">
            <thead><tr>
              <th>#</th><th>Site</th><th class="text-right">Entries</th>
              <th class="text-right">Revenue</th><th class="text-right">Labour</th>
              <th class="text-right">Overhead</th><th class="text-right">One-Time</th><th class="text-right">Profit</th>
            </tr></thead>
            <tbody>
              ${siteSummary.length === 0 ? `<tr><td colspan="8" class="no-data">No site data for this period</td></tr>` :
                siteSummary.map((site, i) => `<tr>
                  <td>${i + 1}</td>
                  <td>${site.name}</td>
                  <td class="text-right">${site.entryCount}</td>
                  <td class="text-right amount positive">${Utils.formatCurrencyShort(site.revenue)}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(site.labour)}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(site.overhead)}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(site.oneTime)}</td>
                  <td class="text-right amount ${site.profit >= 0 ? 'positive' : 'negative'}">${Utils.formatCurrencyShort(site.profit)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="section">
          <h2>👷 Worker Summary</h2>
          <table class="report-table">
            <thead><tr>
              <th>#</th><th>Worker</th><th>Role</th>
              <th class="text-right">Daily Rate</th><th class="text-right">Days Present</th>
              <th class="text-right">Total Hours</th><th class="text-right">Total Wage</th>
            </tr></thead>
            <tbody>
              ${workerSummary.length === 0 ? `<tr><td colspan="7" class="no-data">No worker data for this period</td></tr>` :
                workerSummary.map((w, i) => `<tr>
                  <td>${i + 1}</td>
                  <td>${w.name}</td>
                  <td>${w.role || '-'}</td>
                  <td class="text-right">${Utils.formatCurrency(w.dailyRate)}</td>
                  <td class="text-right">${w.daysPresent}</td>
                  <td class="text-right">${w.totalHours.toFixed(1)}h</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(w.totalWage)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="footer-img"><img src="${letterheadFooter}" /></div>
    </div>
  </div>
  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) { alert('Please allow popups to print the report'); return; }
    printWindow.document.write(generateProfessionalReportHTML());
    printWindow.document.close();
    printWindow.focus();
  };

  // ============================================
  // OVERVIEW TAB
  // ============================================
  const renderOverviewTab = () => (
    <div className="dr-view">
      <div className="dr-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="dr-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="dr-kpi-accent" style={{ background: item.accent }} />
              <div className="dr-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="dr-kpi-content">
                <span className="dr-kpi-label">{item.label}</span>
                <span className="dr-kpi-value">{item.value}</span>
                <span className="dr-kpi-meta">{item.meta}</span>
              </div>
              <div className={`dr-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={15} />}
                {item.trend === 'down' && <ArrowDownRight size={15} />}
                {item.trend === 'neutral' && <BarChart3 size={15} />}
              </div>
            </div>
          );
        })}
      </div>

      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="dr-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="dr-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="dr-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="dr-tooltip-row">
                <span className="dr-tooltip-label">{d.label}</span>
                <span className="dr-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dr-card">
        <div className="dr-card-header-top">
          <div className="dr-card-title">
            <span className="dr-card-icon" style={{ background: 'rgba(0,152,70,0.12)', color: '#009846' }}>
              <PercentIcon size={16} />
            </span>
            <div>
              <h4>Key Performance Rates</h4>
              <span>Live percentages for this period</span>
            </div>
          </div>
        </div>
        <div className="dr-rings-row">
          <RingGauge value={filteredData.totals.revenue > 0 ? (filteredData.totals.profit / filteredData.totals.revenue) * 100 : 0}
            max={100} size={140} stroke={11} color="#009846" label="PROFIT MARGIN" sublabel="of revenue" />
          <RingGauge value={filteredData.totals.revenue > 0 ? (filteredData.totals.labour / filteredData.totals.revenue) * 100 : 0}
            max={100} size={140} stroke={11} color="#ef4444" label="LABOUR" sublabel="of revenue" />
          <RingGauge value={filteredData.totals.revenue > 0 ? (filteredData.totals.overhead / filteredData.totals.revenue) * 100 : 0}
            max={100} size={140} stroke={11} color="#f59e0b" label="OVERHEAD" sublabel="of revenue" />
          <RingGauge value={filteredData.totals.revenue > 0 ? (filteredData.totals.oneTime / filteredData.totals.revenue) * 100 : 0}
            max={100} size={140} stroke={11} color="#8b5cf6" label="ONE-TIME" sublabel="of revenue" />
          <RingGauge value={filteredData.dailyAggregates.length > 0
            ? (filteredData.dailyAggregates.filter(d => d.profit > 0).length / filteredData.dailyAggregates.length) * 100
            : 0}
            max={100} size={140} stroke={11} color="#3b82f6" label="PROFITABLE" sublabel="days" />
        </div>
        <div className="dr-rings-legend">
          <span><i style={{ background: '#009846' }} />Profit Margin</span>
          <span><i style={{ background: '#ef4444' }} />Labour %</span>
          <span><i style={{ background: '#f59e0b' }} />Overhead %</span>
          <span><i style={{ background: '#8b5cf6' }} />One-Time %</span>
          <span><i style={{ background: '#3b82f6' }} />Profitable Days</span>
        </div>
      </div>

      <div className="dr-grid-1-1">
        <div className="dr-card">
          <div className="dr-card-header-top">
            <div className="dr-card-title">
              <span className="dr-card-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                <Scale size={16} />
              </span>
              <div>
                <h4>Cost Breakdown</h4>
                <span>Percentage of revenue</span>
              </div>
            </div>
          </div>
          <div className="dr-method-rings">
            {costBreakdownData.map((m, i) => (
              <div key={i} className="dr-method-item">
                <RingGauge value={m.pct} max={100} size={100} stroke={8} color={m.color} label={m.label} />
                <span className="dr-method-value">{Utils.formatCurrencyShort(m.value)}</span>
                <span className="dr-method-pct">{m.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dr-card">
          <div className="dr-card-header-top">
            <div className="dr-card-title">
              <span className="dr-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Sites by Profit</h4>
                <span>{filteredData.siteSummary.length} total sites</span>
              </div>
            </div>
          </div>
          {filteredData.siteSummary.length > 0 ? (
            <div className="dr-donut-wrap">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={filteredData.siteSummary.filter(s => s.entryCount > 0).map(s => ({
                      name: s.name, value: Math.abs(s.profit), profit: s.profit
                    }))}
                    dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                    {filteredData.siteSummary.filter(s => s.entryCount > 0).map((s, i) => (
                      <Cell key={i} fill={s.profit >= 0 ? DR_COLORS[i % DR_COLORS.length] : '#94a3b8'} />
                    ))}
                  </Pie>
                  <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="dr-donut-legend">
                {filteredData.siteSummary.filter(s => s.entryCount > 0).slice(0, 6).map((s, i) => (
                  <div key={i} className="dr-donut-item">
                    <span className="dr-donut-dot" style={{ background: s.profit >= 0 ? DR_COLORS[i % DR_COLORS.length] : '#94a3b8' }} />
                    <span className="dr-donut-name">{s.name}</span>
                    <span className="dr-donut-val" style={{ color: s.profit >= 0 ? '#047857' : '#b91c1c' }}>
                      {Utils.formatCurrencyShort(s.profit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="dr-empty-mini">No site data</div>}
        </div>
      </div>

      {dailyChartData.length > 0 && (
        <div className="dr-card">
          <div className="dr-card-header-top">
            <div className="dr-card-title">
              <span className="dr-card-icon" style={{ background: 'rgba(0,152,70,0.12)', color: '#009846' }}>
                <LineChartIcon size={16} />
              </span>
              <div>
                <h4>Daily Performance Trend</h4>
                <span>{dailyChartData.length} days</span>
              </div>
            </div>
            <div className="dr-legend">
              <span><i style={{ background: '#3b82f6' }} />Revenue</span>
              <span><i style={{ background: '#009846' }} />Profit</span>
              <span><i style={{ background: '#ef4444' }} />Labour</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={dailyChartData}>
              <defs>
                <linearGradient id="drRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}
                angle={-30} textAnchor="end" height={50} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5}
                fill="url(#drRevGrad)" name="Revenue" />
              <Line type="monotone" dataKey="profit" stroke="#009846" strokeWidth={2.5}
                dot={{ fill: '#009846', r: 3 }} name="Profit" />
              <Line type="monotone" dataKey="labour" stroke="#ef4444" strokeWidth={2.5}
                dot={{ fill: '#ef4444', r: 3 }} name="Labour" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="dr-grid-1-1">
        <div className="dr-card">
          <div className="dr-card-header-top">
            <div className="dr-card-title">
              <span className="dr-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Trophy size={16} />
              </span>
              <div>
                <h4>Top Sites by Profit</h4>
                <span>Highest performing sites</span>
              </div>
            </div>
          </div>
          {topSitesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topSitesData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <defs>
                  <linearGradient id="drTopGrad" x1="0" y1="0" x2="1" y2="0">
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
                <Bar dataKey="value" name="Profit" fill="url(#drTopGrad)" radius={[0, 8, 8, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="dr-empty-mini">No site data</div>}
        </div>

        <div className="dr-card">
          <div className="dr-card-header-top">
            <div className="dr-card-title">
              <span className="dr-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <BarChart3 size={16} />
              </span>
              <div>
                <h4>Site Revenue & Profit</h4>
                <span>Top 10 by revenue</span>
              </div>
            </div>
            <div className="dr-legend">
              <span><i style={{ background: '#3b82f6' }} />Revenue</span>
              <span><i style={{ background: '#009846' }} />Profit</span>
            </div>
          </div>
          {siteRevenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={siteRevenueChartData} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}
                  angle={-30} textAnchor="end" height={60} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
                <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={18} />
                <Bar dataKey="profit" name="Profit" fill="#009846" radius={[6, 6, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="dr-empty-mini">No site data</div>}
        </div>
      </div>

      {topWorkersData.length > 0 && (
        <div className="dr-card">
          <div className="dr-card-header-top">
            <div className="dr-card-title">
              <span className="dr-card-icon" style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4' }}>
                <Users size={16} />
              </span>
              <div>
                <h4>Top Workers by Wage</h4>
                <span>Highest earning workers this period</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topWorkersData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <defs>
                <linearGradient id="drWorkerGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11}
                tickLine={false} axisLine={false} width={120} />
              <ReTooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
                cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" name="Wage" fill="url(#drWorkerGrad)" radius={[0, 8, 8, 0]} barSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  // ============================================
  // DAILY TAB (with expandable site-by-site rows)
  // ============================================
  const renderDailyTab = () => {
    const daysToRender = filteredData.dailyAggregates
      .filter(day => {
        if (dailySiteFilter === 'loss') return day.lossSiteCount > 0;
        if (dailySiteFilter === 'profit') return day.profitSiteCount > 0;
        return true;
      })
      .sort((a, b) => dailySiteFilter === 'loss' ? a.profit - b.profit : 0);

    const pag = paginate(daysToRender, dailyPage, dailyPer);

    return (
      <div className="dr-view">
        {/* Filter bar */}
        <div className="dr-day-filter-bar">
          <span className="dr-day-filter-label">
            <Filter size={13} /> Show:
          </span>
          <button
            className={`dr-day-chip ${dailySiteFilter === 'all' ? 'active' : ''}`}
            onClick={() => { setDailySiteFilter('all'); setDailyPage(1); }}
          >
            All Days <span className="dr-chip-count">{filteredData.dailyAggregates.length}</span>
          </button>
          <button
            className={`dr-day-chip loss ${dailySiteFilter === 'loss' ? 'active' : ''}`}
            onClick={() => { setDailySiteFilter('loss'); setDailyPage(1); }}
          >
            <ArrowDownRight size={12} /> Days with Loss <span className="dr-chip-count">
              {filteredData.dailyAggregates.filter(d => d.lossSiteCount > 0).length}
            </span>
          </button>
          <button
            className={`dr-day-chip profit ${dailySiteFilter === 'profit' ? 'active' : ''}`}
            onClick={() => { setDailySiteFilter('profit'); setDailyPage(1); }}
          >
            <ArrowUpRight size={12} /> Days with Profit <span className="dr-chip-count">
              {filteredData.dailyAggregates.filter(d => d.profitSiteCount > 0).length}
            </span>
          </button>
        </div>

        <div className="dr-card">
          <div className="dr-card-header-top">
            <div className="dr-card-title">
              <span className="dr-card-icon" style={{ background: 'rgba(0,152,70,0.12)', color: '#009846' }}>
                <Calendar size={16} />
              </span>
              <div>
                <h4>Daily Breakdown</h4>
                <span>
                  {daysToRender.length} days · click a row to see site-by-site detail
                </span>
              </div>
            </div>
          </div>

          <div className="dr-table-wrap">
            <table className="dr-table dr-table-expandable">
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Date</th>
                  <th className="right">Sites</th>
                  <th className="right">Entries</th>
                  <th className="right">Revenue</th>
                  <th className="right">Labour</th>
                  <th className="right">Overhead</th>
                  <th className="right">One-Time</th>
                  <th className="right">Profit</th>
                  <th className="center">Status</th>
                </tr>
              </thead>
              <tbody>
                {pag.items.map((day, i) => {
                  const isExpanded = !!expandedDays[day.date];
                  const hasLoss = day.lossSiteCount > 0;
                  return (
                    <React.Fragment key={day.date}>
                      <tr
                        className={`dr-row-clickable ${isExpanded ? 'expanded' : ''}`}
                        style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}
                        onClick={() => toggleDayExpand(day.date)}
                      >
                        <td>
                          <span className={`dr-expand-caret ${isExpanded ? 'open' : ''}`}>
                            <ChevronRight size={14} />
                          </span>
                        </td>
                        <td>
                          <strong>{Utils.formatDate(day.date)}</strong>
                          <div className="dr-day-sub">
                            {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                        </td>
                        <td className="right">
                          <span className="dr-site-count-pill">
                            {day.daySites.length}
                            {hasLoss && <span className="dr-loss-dot" title={`${day.lossSiteCount} site(s) at a loss`} />}
                          </span>
                        </td>
                        <td className="right">{day.entryCount}</td>
                        <td className="right dr-td-green">{Utils.formatCurrencyShort(day.revenue)}</td>
                        <td className="right dr-td-red">{Utils.formatCurrencyShort(day.labour)}</td>
                        <td className="right dr-td-amber">{Utils.formatCurrencyShort(day.overhead)}</td>
                        <td className="right dr-td-purple">{Utils.formatCurrencyShort(day.oneTime)}</td>
                        <td className={`right ${day.profit >= 0 ? 'dr-td-green' : 'dr-td-red'}`}>
                          <strong>{Utils.formatCurrencyShort(day.profit)}</strong>
                        </td>
                        <td className="center">
                          {hasLoss ? (
                            <span className="dr-status-badge loss">
                              <ArrowDownRight size={11} /> {day.lossSiteCount} Loss
                            </span>
                          ) : day.profit >= 0 ? (
                            <span className="dr-status-badge profit">
                              <ArrowUpRight size={11} /> All Profit
                            </span>
                          ) : (
                            <span className="dr-status-badge neutral">
                              <Minus size={11} /> Break-even
                            </span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="dr-expanded-row">
                          <td colSpan="10">
                            <div className="dr-site-breakdown">
                              <div className="dr-site-breakdown-title">
                                <Building2 size={13} />
                                <span>Site breakdown for <strong>{Utils.formatDate(day.date)}</strong></span>
                                <span className="dr-site-breakdown-count">
                                  {day.daySites.length} {day.daySites.length === 1 ? 'site' : 'sites'}
                                </span>
                              </div>

                              {day.daySites.length === 0 ? (
                                <div className="dr-empty-mini">No site data for this day</div>
                              ) : (
                                <table className="dr-site-table">
                                  <thead>
                                    <tr>
                                      <th>Site</th>
                                      <th className="right">Entries</th>
                                      <th className="right">Workers</th>
                                      <th className="right">Revenue</th>
                                      <th className="right">Labour</th>
                                      <th className="right">Overhead</th>
                                      <th className="right">One-Time</th>
                                      <th className="right">Profit</th>
                                      <th className="center">Result</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {day.daySites.map((site, j) => (
                                      <tr key={j} className={`dr-site-row ${site.status}`}>
                                        <td>
                                          <div className="dr-site-name-cell">
                                            <span
                                              className={`dr-site-indicator ${site.status}`}
                                              title={
                                                site.status === 'profit' ? 'Profitable site'
                                                : site.status === 'loss' ? 'This site incurred a loss'
                                                : 'Break-even'
                                              }
                                            />
                                            <strong>{site.siteName}</strong>
                                          </div>
                                        </td>
                                        <td className="right">{site.entryCount}</td>
                                        <td className="right">{site.workerCount}</td>
                                        <td className="right dr-td-green">{Utils.formatCurrencyShort(site.revenue)}</td>
                                        <td className="right dr-td-red">{Utils.formatCurrencyShort(site.labour)}</td>
                                        <td className="right dr-td-amber">{Utils.formatCurrencyShort(site.overhead)}</td>
                                        <td className="right dr-td-purple">{Utils.formatCurrencyShort(site.oneTime)}</td>
                                        <td className={`right ${site.profit >= 0 ? 'dr-td-green' : 'dr-td-red'}`}>
                                          <strong>{Utils.formatCurrencyShort(site.profit)}</strong>
                                        </td>
                                        <td className="center">
                                          {site.status === 'profit' && (
                                            <span className="dr-site-status profit">
                                              <ArrowUpRight size={11} /> PROFIT
                                            </span>
                                          )}
                                          {site.status === 'loss' && (
                                            <span className="dr-site-status loss">
                                              <ArrowDownRight size={11} /> LOSS
                                            </span>
                                          )}
                                          {site.status === 'break_even' && (
                                            <span className="dr-site-status neutral">
                                              <Minus size={11} /> BREAK-EVEN
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {daysToRender.length === 0 && (
                  <tr>
                    <td colSpan="10" className="dr-no-data">
                      {dailySiteFilter === 'loss'
                        ? 'No loss-making days in this period'
                        : dailySiteFilter === 'profit'
                          ? 'No profit-making days in this period'
                          : 'No data for this period'}
                    </td>
                  </tr>
                )}
              </tbody>
              {daysToRender.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan="4"><strong>TOTALS</strong></td>
                    <td className="right dr-td-green"><strong>{Utils.formatCurrencyShort(filteredData.totals.revenue)}</strong></td>
                    <td className="right dr-td-red"><strong>{Utils.formatCurrencyShort(filteredData.totals.labour)}</strong></td>
                    <td className="right dr-td-amber"><strong>{Utils.formatCurrencyShort(filteredData.totals.overhead)}</strong></td>
                    <td className="right dr-td-purple"><strong>{Utils.formatCurrencyShort(filteredData.totals.oneTime)}</strong></td>
                    <td className={`right ${filteredData.totals.profit >= 0 ? 'dr-td-green' : 'dr-td-red'}`}>
                      <strong>{Utils.formatCurrencyShort(filteredData.totals.profit)}</strong>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {renderPagination(pag.page, pag.total, dailyPer, setDailyPer, setDailyPage, daysToRender.length, 'days')}
        </div>
      </div>
    );
  };

  // ============================================
  // SITES TAB
  // ============================================
  const renderSitesTab = () => {
    const pag = paginate(filteredData.siteSummary, sitePage, sitePer);
    return (
      <div className="dr-view">
        <div className="dr-card">
          <div className="dr-card-header-top">
            <div className="dr-card-title">
              <span className="dr-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <Building2 size={16} />
              </span>
              <div>
                <h4>Site Performance</h4>
                <span>{filteredData.siteSummary.length} sites</span>
              </div>
            </div>
          </div>

          <div className="dr-table-wrap">
            <table className="dr-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Site</th>
                  <th className="right">Entries</th>
                  <th className="right">Revenue</th>
                  <th className="right">Labour</th>
                  <th className="right">Overhead</th>
                  <th className="right">One-Time</th>
                  <th className="right">Profit</th>
                  <th className="right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {pag.items.map((site, i) => {
                  const realIndex = (pag.page - 1) * sitePer + i + 1;
                  const margin = site.revenue > 0 ? (site.profit / site.revenue) * 100 : 0;
                  return (
                    <tr key={i} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                      <td>{realIndex}</td>
                      <td><strong>{site.name}</strong></td>
                      <td className="right">{site.entryCount}</td>
                      <td className="right dr-td-green">{Utils.formatCurrencyShort(site.revenue)}</td>
                      <td className="right dr-td-red">{Utils.formatCurrencyShort(site.labour)}</td>
                      <td className="right dr-td-amber">{Utils.formatCurrencyShort(site.overhead)}</td>
                      <td className="right dr-td-purple">{Utils.formatCurrencyShort(site.oneTime)}</td>
                      <td className={`right ${site.profit >= 0 ? 'dr-td-green' : 'dr-td-red'}`}>
                        <strong>{Utils.formatCurrencyShort(site.profit)}</strong>
                      </td>
                      <td className="right">{margin.toFixed(1)}%</td>
                    </tr>
                  );
                })}
                {filteredData.siteSummary.length === 0 && (
                  <tr><td colSpan="9" className="dr-no-data">No site data for this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {renderPagination(pag.page, pag.total, sitePer, setSitePer, setSitePage, filteredData.siteSummary.length, 'sites')}
        </div>
      </div>
    );
  };

  // ============================================
  // WORKERS TAB
  // ============================================
  const renderWorkersTab = () => {
    const pag = paginate(filteredData.workerSummary, workerPage, workerPer);
    return (
      <div className="dr-view">
        <div className="dr-card">
          <div className="dr-card-header-top">
            <div className="dr-card-title">
              <span className="dr-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <Users size={16} />
              </span>
              <div>
                <h4>Worker Summary</h4>
                <span>{filteredData.workerSummary.length} workers</span>
              </div>
            </div>
          </div>

          <div className="dr-table-wrap">
            <table className="dr-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Worker</th>
                  <th>Role</th>
                  <th className="right">Daily Rate</th>
                  <th className="right">Days Present</th>
                  <th className="right">Total Hours</th>
                  <th className="right">Total Wage</th>
                </tr>
              </thead>
              <tbody>
                {pag.items.map((w, i) => {
                  const realIndex = (pag.page - 1) * workerPer + i + 1;
                  return (
                    <tr key={i} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                      <td>{realIndex}</td>
                      <td>
                        <div className="dr-worker-cell">
                          <div className="dr-worker-avatar" style={{ background: DR_COLORS[(realIndex - 1) % DR_COLORS.length] }}>
                            {w.name.charAt(0).toUpperCase()}
                          </div>
                          <strong>{w.name}</strong>
                        </div>
                      </td>
                      <td><span className="dr-role-badge">{w.role || 'General'}</span></td>
                      <td className="right">{Utils.formatCurrency(w.dailyRate)}</td>
                      <td className="right">{w.daysPresent}</td>
                      <td className="right">{w.totalHours.toFixed(1)}h</td>
                      <td className="right dr-td-green"><strong>{Utils.formatCurrency(w.totalWage)}</strong></td>
                    </tr>
                  );
                })}
                {filteredData.workerSummary.length === 0 && (
                  <tr><td colSpan="7" className="dr-no-data">No worker data for this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {renderPagination(pag.page, pag.total, workerPer, setWorkerPer, setWorkerPage, filteredData.workerSummary.length, 'workers')}
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className={`dr-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="dr-ambient">
        <div className="dr-orb dr-orb-1" />
        <div className="dr-orb dr-orb-2" />
        <div className="dr-orb dr-orb-3" />
      </div>

      {/* Header */}
      <div className="dr-header">
        <div className="dr-header-left">
          <div className="dr-header-icon">
            <FileText size={22} />
            <span className="dr-header-badge"><Sparkles size={10} /> REPORTS</span>
          </div>
          <div>
            <h2>Daily / Periodic Report</h2>
            <p className="dr-header-subtitle">
              {filteredData.totals.totalDays} days · {filteredData.totals.entryCount} entries · {Utils.formatCurrencyShort(filteredData.totals.revenue)} revenue · {Utils.formatCurrencyShort(filteredData.totals.profit)} profit
            </p>
          </div>
        </div>

        <div className="dr-header-right">
          <button className="dr-btn dr-btn-ghost" onClick={exportDailyReport}>
            <Download size={14} /> Export CSV
          </button>
          <button className="dr-btn dr-btn-primary" onClick={handlePrintReport}>
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </div>

      {/* Date Filter Strip */}
      <div className="dr-filter-strip">
        <div className="dr-filter-left">
          <span className="dr-filter-label">
            <Calendar size={13} /> Period:
          </span>
          {filterOptions.map(f => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                className={`dr-chip ${dateRange.type === f.id ? 'active' : ''}`}
                onClick={() => handleFilterSelect(f.id)}
              >
                <Icon size={12} />
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>

        <div className="dr-filter-right">
          {dateRange.type === 'custom' && (
            <span className="dr-range-display">
              {Utils.formatDate(dateRange.startDate)} → {Utils.formatDate(dateRange.endDate)}
            </span>
          )}
        </div>
      </div>

      {/* Custom Range Panel */}
      {showCustomPanel && (
        <div className="dr-custom-panel">
          <div className="dr-custom-panel-header">
            <Filter size={14} />
            <strong>Select Custom Date Range</strong>
          </div>
          <div className="dr-custom-panel-body">
            <div className="dr-custom-field">
              <label>From</label>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </div>
            <div className="dr-custom-field">
              <label>To</label>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
            <div className="dr-custom-panel-actions">
              <button className="dr-btn dr-btn-secondary" onClick={() => setShowCustomPanel(false)}>
                Cancel
              </button>
              <button className="dr-btn dr-btn-primary" onClick={applyCustomRange}>
                <CheckCircle size={14} /> Apply Range
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="dr-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'daily', label: 'Daily', icon: Calendar, badge: filteredData.dailyAggregates.length },
          { id: 'sites', label: 'Sites', icon: Building2, badge: filteredData.siteSummary.filter(s => s.entryCount > 0).length },
          { id: 'workers', label: 'Workers', icon: Users, badge: filteredData.workerSummary.filter(w => w.totalWage > 0).length }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`dr-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => setViewMode(t.id)}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && t.badge > 0 && <span className="dr-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {viewMode === 'overview' && renderOverviewTab()}
      {viewMode === 'daily' && renderDailyTab()}
      {viewMode === 'sites' && renderSitesTab()}
      {viewMode === 'workers' && renderWorkersTab()}
    </div>
  );
};

export default DailyReportComponent;