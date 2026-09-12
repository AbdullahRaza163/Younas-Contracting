// src/components/ReportsComponent.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  DollarSign, TrendingDown as TrendingDownIcon, TrendingUp as TrendingUpIcon,
  Users, Download, HardHat, PieChart as PieChartIcon, BarChart3, Calendar,
  Filter, ChevronDown, Eye, Printer, FileText, Building2, Clock, Award,
  Target, Shield, Zap, Sparkles, Crown, RefreshCw, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle, Info, ArrowUpRight, ArrowDownRight, X,
  LayoutDashboard, Search, ChevronsLeft, ChevronsRight, Percent as PercentIcon,
  LineChart as LineChartIcon, Trophy, Wallet, Landmark, Receipt,
  Activity, Gauge, Flame, CircleDollarSign, Calculator, BadgeCheck,
  Scale, Minus, Layers, Package, Timer
} from 'lucide-react';
import {
  Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ComposedChart, Area, BarChart, Bar,
  AreaChart, RadialBarChart, RadialBar
} from 'recharts';
import Utils from '../utils/Utils';
import { ExportUtils } from '../services/ExportUtils';
import './Reports.css';
import letterheadHeader from '../assets/letterhead-header.png';
import letterheadFooter from '../assets/letterhead-footer.png';
import background from '../assets/background.png';
import { CONFIG } from '../config/constants';

// ============================================
// PORTAL
// ============================================
const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

// ============================================
// COLORS
// ============================================
const COLORS = ['#009846', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
const CHART_COLORS = ['#009846', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

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
    <div className="report-ring-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="rgba(148,163,184,0.18)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div className="report-ring-center">
        <span className="report-ring-value" style={{ color }}>{Math.round(pct * 100)}%</span>
        {label && <span className="report-ring-label">{label}</span>}
        {sublabel && <span className="report-ring-sublabel">{sublabel}</span>}
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
    <div className="report-chart-tooltip">
      {label && <div className="report-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="report-chart-tooltip-row">
          <span className="report-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="report-chart-tooltip-name">{p.name}</span>
          <span className="report-chart-tooltip-val">
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
const ReportsComponent = ({ data }) => {
  const [exportType, setExportType] = useState('excel');
  const [timeRange, setTimeRange] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('combined');
  const [showExportModal, setShowExportModal] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);

  // Pagination for worker table
  const [workerPage, setWorkerPage] = useState(1);
  const [workerPer, setWorkerPer] = useState(10);
  // Pagination for site table
  const [sitePage, setSitePage] = useState(1);
  const [sitePer, setSitePer] = useState(10);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ============================================
  // FILTERED DATA
  // ============================================
  const filteredData = useMemo(() => {
    let filteredEntries = data.entries || [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (timeRange === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      filteredEntries = filteredEntries.filter(e => e.date >= weekAgo.toISOString().split('T')[0] && e.date <= today);
    } else if (timeRange === 'month') {
      const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
      filteredEntries = filteredEntries.filter(e => e.date >= monthAgo.toISOString().split('T')[0] && e.date <= today);
    } else if (timeRange === 'quarter') {
      const qAgo = new Date(now); qAgo.setMonth(qAgo.getMonth() - 3);
      filteredEntries = filteredEntries.filter(e => e.date >= qAgo.toISOString().split('T')[0] && e.date <= today);
    } else if (timeRange === 'year') {
      const yAgo = new Date(now); yAgo.setFullYear(yAgo.getFullYear() - 1);
      filteredEntries = filteredEntries.filter(e => e.date >= yAgo.toISOString().split('T')[0] && e.date <= today);
    }

    if (dateFrom) filteredEntries = filteredEntries.filter(e => e.date >= dateFrom);
    if (dateTo) filteredEntries = filteredEntries.filter(e => e.date <= dateTo);
    if (siteFilter !== 'all') filteredEntries = filteredEntries.filter(e => e.siteId === siteFilter);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filteredEntries = filteredEntries.filter(e => {
        const site = data.sites?.find(x => x.id === e.siteId);
        return (site?.name || '').toLowerCase().includes(s) || (e.description || '').toLowerCase().includes(s);
      });
    }
    return filteredEntries;
  }, [data.entries, data.sites, timeRange, dateFrom, dateTo, siteFilter, searchTerm]);

  // ============================================
  // CALCULATIONS
  // ============================================
  const totalKamai = Utils.calculateTotal(filteredData, 'kamai');
  const totalLabour = Utils.calculateTotal(filteredData, 'labour');
  const totalOH = Utils.calculateTotal(filteredData, 'overhead');
  const totalOT = Utils.calculateTotal(filteredData, 'oneTime');
  const netProfit = totalKamai - totalLabour - totalOH - totalOT;

  const workerSalaries = useMemo(() => data.workers.map(w => {
    const salary = Utils.calculateWorkerSalary(w, data.attendance);
    return { ...w, ...salary };
  }), [data.workers, data.attendance]);

  const totalWages = workerSalaries.reduce((sum, w) => sum + w.totalWage, 0);

  const siteProfitData = useMemo(() => data.sites.map(s => {
    const siteEntries = filteredData.filter(e => e.siteId === s.id);
    const revenue = Utils.calculateTotal(siteEntries, 'kamai');
    const labour = Utils.calculateTotal(siteEntries, 'labour');
    const overhead = Utils.calculateTotal(siteEntries, 'overhead');
    const oneTime = Utils.calculateTotal(siteEntries, 'oneTime');
    const profit = revenue - labour - overhead - oneTime;
    return { name: s.name, revenue, labour, overhead, oneTime, profit, entries: siteEntries.length };
  }), [data.sites, filteredData]);

  const dailyData = useMemo(() => {
    const acc = {};
    filteredData.forEach(e => {
      if (!acc[e.date]) acc[e.date] = { date: e.date, revenue: 0, profit: 0, labour: 0 };
      acc[e.date].revenue += e.kamai || 0;
      acc[e.date].profit += Utils.calculateEntryProfit(e);
      acc[e.date].labour += e.labour || 0;
    });
    return Object.values(acc).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  // ============================================
  // CARD DETAILS
  // ============================================
  const cardDetails = {
    revenue: {
      title: 'Total Revenue',
      details: [
        { label: 'Total Revenue', value: Utils.formatCurrency(totalKamai) },
        { label: 'Total Entries', value: filteredData.length },
        { label: 'Avg per Entry', value: filteredData.length > 0 ? Utils.formatCurrency(totalKamai / filteredData.length) : '0.000' },
        { label: 'Profit Margin', value: totalKamai > 0 ? `${((netProfit / totalKamai) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    profit: {
      title: 'Net Profit',
      details: [
        { label: 'Net Profit', value: Utils.formatCurrency(netProfit) },
        { label: 'Total Revenue', value: Utils.formatCurrency(totalKamai) },
        { label: 'Total Costs', value: Utils.formatCurrency(totalLabour + totalOH + totalOT) },
        { label: 'Profit Margin', value: totalKamai > 0 ? `${((netProfit / totalKamai) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    labour: {
      title: 'Labour Cost',
      details: [
        { label: 'Total Labour', value: Utils.formatCurrency(totalLabour) },
        { label: 'Total Workers', value: data.workers.length },
        { label: 'Avg per Worker', value: data.workers.length > 0 ? Utils.formatCurrency(totalLabour / data.workers.length) : '0.000' },
        { label: 'Labour % of Revenue', value: totalKamai > 0 ? `${((totalLabour / totalKamai) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    wages: {
      title: 'Total Wages',
      details: [
        { label: 'Total Wages', value: Utils.formatCurrency(totalWages) },
        { label: 'Total Workers', value: data.workers.length },
        { label: 'Avg per Worker', value: data.workers.length > 0 ? Utils.formatCurrency(totalWages / data.workers.length) : '0.000' },
        { label: 'Total Hours', value: workerSalaries.reduce((sum, w) => sum + (w.totalHours || 0), 0).toFixed(1) }
      ]
    }
  };

  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({ x: event.clientX + 15, y: event.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // ============================================
  // EXPORT
  // ============================================
  const handleExport = () => {
    if (exportType === 'excel') ExportUtils.exportToExcel(data);
    else ExportUtils.exportToCSV(data);
    setShowExportModal(false);
  };

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
      <div className="report-pagination">
        <div className="report-pagination-info">
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{count}</strong> {label}
        </div>
        <div className="report-pagination-controls">
          <div className="report-pagination-items">
            <span>Show:</span>
            <select value={per} onChange={(e) => { setPer(Number(e.target.value)); setPage(1); }} className="report-pagination-select">
              {[5, 10, 15, 20, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="report-pagination-buttons">
            <button className="report-page-btn" onClick={() => setPage(1)} disabled={current === 1}><ChevronsLeft size={13} /></button>
            <button className="report-page-btn" onClick={() => setPage(current - 1)} disabled={current === 1}><ChevronLeft size={13} /></button>
            {getPageNumbers(current, total).map(p => (
              <button key={p} className={`report-page-btn ${p === current ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="report-page-btn" onClick={() => setPage(current + 1)} disabled={current === total}><ChevronRight size={13} /></button>
            <button className="report-page-btn" onClick={() => setPage(total)} disabled={current === total}><ChevronsRight size={13} /></button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => { setWorkerPage(1); }, [workerPer, searchTerm, timeRange, siteFilter]);
  useEffect(() => { setSitePage(1); }, [sitePer, searchTerm, timeRange, siteFilter]);

  // ============================================
  // PRINT REPORT
  // ============================================
  const generateReportHTML = () => {
    const companyName = CONFIG?.COMPANY_NAME || 'Haji Younas Contracting';
    const primary = '#009846';
    const dark = '#007a38';
    const light = '#e8f5ee';
    const muted = '#5b7267';
    const border = '#d4e0d9';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Analytics Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Arial, serif; background: #ffffff; color: #0b1a12; }
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
    .section { margin-bottom: 28px; }
    .section h2 { font-size: 18px; color: ${primary}; padding-bottom: 8px; border-bottom: 2px solid ${border}; margin-bottom: 14px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .stat-card { background: ${light}; padding: 14px 16px; border-radius: 6px; border: 1px solid ${border}; text-align: center; }
    .stat-card .label { font-size: 11px; color: ${muted}; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-card .value { font-size: 20px; font-weight: 700; color: ${primary}; margin-top: 4px; }
    .stat-card .value.positive { color: #009846; }
    .stat-card .value.negative { color: #ef4444; }
    .report-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .report-table thead { background: ${primary}; }
    .report-table th { color: #ffffff; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .report-table th.text-right { text-align: right; }
    .report-table th.text-center { text-align: center; }
    .report-table td { padding: 6px 12px; border-bottom: 1px solid ${border}; }
    .report-table td.text-right { text-align: right; }
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
          <h1>ANALYTICS DASHBOARD REPORT</h1>
          <div class="sub">${companyName} • Performance Overview</div>
        </div>
        <div class="report-meta">
          <span><strong>Report Period:</strong> ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}</span>
          <span><strong>Generated:</strong> ${new Date().toLocaleString()}</span>
          <span><strong>Total Entries:</strong> ${filteredData.length}</span>
          <span><strong>Active Sites:</strong> ${data.sites.length}</span>
        </div>
        <div class="section">
          <h2>📊 Executive Summary</h2>
          <div class="stats-grid">
            <div class="stat-card"><div class="label">Total Revenue</div><div class="value positive">${Utils.formatCurrencyShort(totalKamai)}</div></div>
            <div class="stat-card"><div class="label">Net Profit</div><div class="value ${netProfit >= 0 ? 'positive' : 'negative'}">${Utils.formatCurrencyShort(netProfit)}</div></div>
            <div class="stat-card"><div class="label">Labour Cost</div><div class="value">${Utils.formatCurrencyShort(totalLabour)}</div></div>
            <div class="stat-card"><div class="label">Total Wages</div><div class="value">${Utils.formatCurrencyShort(totalWages)}</div></div>
          </div>
        </div>
        <div class="section">
          <h2>🏗️ Site Performance</h2>
          <table class="report-table">
            <thead><tr>
              <th>#</th><th>Site Name</th>
              <th class="text-right">Revenue</th>
              <th class="text-right">Labour</th>
              <th class="text-right">Overhead</th>
              <th class="text-right">One-Time</th>
              <th class="text-right">Profit</th>
            </tr></thead>
            <tbody>
              ${siteProfitData.length === 0 ? `<tr><td colspan="7" class="no-data">No site data available</td></tr>` :
                siteProfitData.map((s, i) => `<tr>
                  <td>${i + 1}</td>
                  <td>${s.name}</td>
                  <td class="text-right amount positive">${Utils.formatCurrencyShort(s.revenue)}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(s.labour)}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(s.overhead)}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(s.oneTime)}</td>
                  <td class="text-right amount ${s.profit >= 0 ? 'positive' : 'negative'}">${Utils.formatCurrencyShort(s.profit)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        <div class="section">
          <h2>👷 Worker Compensation Summary</h2>
          <table class="report-table">
            <thead><tr>
              <th>#</th><th>Worker</th><th>Role</th>
              <th class="text-right">Daily Rate</th>
              <th class="text-right">Hours</th>
              <th class="text-right">Days</th>
              <th class="text-right">Total Wage</th>
            </tr></thead>
            <tbody>
              ${workerSalaries.length === 0 ? `<tr><td colspan="7" class="no-data">No worker data available</td></tr>` :
                workerSalaries.map((w, i) => `<tr>
                  <td>${i + 1}</td>
                  <td>${w.name}</td>
                  <td>${w.role || 'General'}</td>
                  <td class="text-right">${Utils.formatCurrency(w.dailyRate)}</td>
                  <td class="text-right">${(w.totalHours || 0).toFixed(1)}h</td>
                  <td class="text-right">${w.daysPresent || 0}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(w.totalWage || 0)}</td>
                </tr>`).join('')}
            </tbody>
            <tfoot><tr>
              <td colspan="6" class="text-right"><strong>Total Wages</strong></td>
              <td class="text-right"><strong>${Utils.formatCurrencyShort(totalWages)}</strong></td>
            </tr></tfoot>
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
    printWindow.document.write(generateReportHTML());
    printWindow.document.close();
    printWindow.focus();
  };

  const clearFilters = () => {
    setTimeRange('all');
    setDateFrom('');
    setDateTo('');
    setSiteFilter('all');
    setSearchTerm('');
    setShowFilterDropdown(false);
  };

  const getAvatarColor = (index) => COLORS[index % COLORS.length];

  // ============================================
  // CHART DATA — Percentages
  // ============================================
  const costBreakdownData = useMemo(() => {
    const total = totalKamai || 1;
    return [
      { key: 'labour', label: 'Labour', value: totalLabour, pct: (totalLabour / total) * 100, color: '#ef4444' },
      { key: 'overhead', label: 'Overhead', value: totalOH, pct: (totalOH / total) * 100, color: '#f59e0b' },
      { key: 'oneTime', label: 'One-Time', value: totalOT, pct: (totalOT / total) * 100, color: '#8b5cf6' },
      { key: 'profit', label: 'Profit', value: Math.max(0, netProfit), pct: (Math.max(0, netProfit) / total) * 100, color: '#009846' }
    ];
  }, [totalKamai, totalLabour, totalOH, totalOT, netProfit]);

  const siteShareData = useMemo(() => {
    const total = siteProfitData.reduce((s, x) => s + Math.max(0, x.revenue), 0) || 1;
    return siteProfitData.map((s, i) => ({
      name: s.name,
      value: Math.max(0, s.revenue),
      pct: (Math.max(0, s.revenue) / total) * 100,
      color: COLORS[i % COLORS.length]
    }));
  }, [siteProfitData]);

  const statusChartData = useMemo(() => {
    const total = filteredData.length || 1;
    const profitEntries = filteredData.filter(e => Utils.calculateEntryProfit(e) > 0).length;
    const lossEntries = filteredData.filter(e => Utils.calculateEntryProfit(e) < 0).length;
    const breakEven = filteredData.length - profitEntries - lossEntries;
    return [
      { name: 'Profitable', value: profitEntries, color: '#009846' },
      { name: 'Loss', value: lossEntries, color: '#ef4444' },
      { name: 'Break Even', value: breakEven, color: '#94a3b8' }
    ].filter(d => d.value > 0);
  }, [filteredData]);

  // 12-month trend
  const monthlyTrendData = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      const monthEntries = (data.entries || []).filter(e => e.date && e.date.startsWith(key));
      const revenue = Utils.calculateTotal(monthEntries, 'kamai');
      const profit = monthEntries.reduce((s, e) => s + Utils.calculateEntryProfit(e), 0);
      const labour = Utils.calculateTotal(monthEntries, 'labour');
      months.push({ label, revenue, profit, labour });
    }
    return months;
  }, [data.entries]);

  // Top sites by profit
  const topSitesData = useMemo(() => {
    return [...siteProfitData]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8)
      .map(s => ({
        name: s.name.length > 14 ? s.name.slice(0, 14) + '…' : s.name,
        value: s.profit,
        revenue: s.revenue
      }));
  }, [siteProfitData]);

  // ============================================
  // KPI ITEMS
  // ============================================
  const kpiItems = [
    {
      id: 'revenue', icon: DollarSign, label: 'Total Revenue',
      value: Utils.formatCurrencyShort(totalKamai),
      meta: `${filteredData.length} entries`,
      color: '#3b82f6', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up'
    },
    {
      id: 'profit', icon: TrendingUpIcon, label: 'Net Profit',
      value: Utils.formatCurrencyShort(netProfit),
      meta: `${totalKamai > 0 ? ((netProfit / totalKamai) * 100).toFixed(1) : 0}% margin`,
      color: netProfit >= 0 ? '#009846' : '#ef4444',
      accent: netProfit >= 0 ? 'linear-gradient(90deg,#009846,#34d399)' : 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: netProfit >= 0 ? 'up' : 'down'
    },
    {
      id: 'labour', icon: TrendingDownIcon, label: 'Labour Cost',
      value: Utils.formatCurrencyShort(totalLabour),
      meta: `${totalKamai > 0 ? ((totalLabour / totalKamai) * 100).toFixed(1) : 0}% of revenue`,
      color: '#ef4444', accent: 'linear-gradient(90deg,#ef4444,#f87171)', trend: 'neutral'
    },
    {
      id: 'wages', icon: Users, label: 'Total Wages',
      value: Utils.formatCurrencyShort(totalWages),
      meta: `${data.workers.length} workers`,
      color: '#8b5cf6', accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)', trend: 'neutral'
    }
  ];

  // ============================================
  // RENDER — MAIN
  // ============================================
  const workerPag = paginate(workerSalaries, workerPage, workerPer);
  const sitePag = paginate(siteProfitData, sitePage, sitePer);

  return (
    <div className={`report-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="report-ambient">
        <div className="report-orb report-orb-1" />
        <div className="report-orb report-orb-2" />
        <div className="report-orb report-orb-3" />
      </div>

      {/* Header */}
      <div className="report-header">
        <div className="report-header-left">
          <div className="report-header-icon">
            <LayoutDashboard size={22} />
            <span className="report-header-badge"><Sparkles size={10} /> ANALYTICS</span>
          </div>
          <div>
            <h2>Analytics Dashboard</h2>
            <p className="report-header-subtitle">
              {filteredData.length} entries · {Utils.formatCurrencyShort(totalKamai)} revenue · {netProfit >= 0 ? '+' : ''}{Utils.formatCurrencyShort(netProfit)} profit
            </p>
          </div>
        </div>
        <div className="report-header-right">
          <div className="report-search">
            <Search size={15} className="report-search-icon" />
            <input type="text" placeholder="Search entries..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button className="report-search-clear" onClick={() => setSearchTerm('')}>
                <X size={13} />
              </button>
            )}
          </div>

          <div className="report-filter-container">
            <button className="report-btn report-btn-ghost" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
              <Filter size={14} />
              {timeRange !== 'all' ? timeRange.charAt(0).toUpperCase() + timeRange.slice(1) : 'Filter'}
              <ChevronDown size={13} />
            </button>

            {showFilterDropdown && (
              <div className="report-dropdown">
                <div className="report-filter-section">
                  <label>Time Range</label>
                  <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="report-select">
                    <option value="all">All Time</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year">This Year</option>
                  </select>
                </div>
                <div className="report-filter-section">
                  <label>Date Range</label>
                  <div className="report-date-range">
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <span>to</span>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </div>
                <div className="report-filter-section">
                  <label>Site</label>
                  <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="report-select">
                    <option value="all">All Sites</option>
                    {data.sites?.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}
                  </select>
                </div>
                <div className="report-filter-actions">
                  <button className="report-btn report-btn-primary" onClick={() => setShowFilterDropdown(false)}>Apply</button>
                  <button className="report-btn report-btn-secondary" onClick={clearFilters}>Clear All</button>
                </div>
              </div>
            )}
          </div>

          <button onClick={handlePrintReport} className="report-btn report-btn-ghost">
            <Printer size={14} /> Print
          </button>
          <button onClick={() => setShowExportModal(true)} className="report-btn report-btn-primary">
            <Download size={14} /> Export
          </button>
          <button className="report-btn report-btn-ghost" onClick={() => window.location.reload()}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="report-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="report-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="report-kpi-accent" style={{ background: item.accent }} />
              <div className="report-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="report-kpi-content">
                <span className="report-kpi-label">{item.label}</span>
                <span className="report-kpi-value">{item.value}</span>
                <span className="report-kpi-meta">{item.meta}</span>
              </div>
              <div className={`report-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUpIcon size={15} />}
                {item.trend === 'down' && <ArrowDownRight size={15} />}
                {item.trend === 'neutral' && <BarChart3 size={15} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="report-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="report-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="report-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="report-tooltip-row">
                <span className="report-tooltip-label">{d.label}</span>
                <span className="report-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 1 — Percentage Ring Gauges */}
      <div className="report-card">
        <div className="report-card-header">
          <div className="report-card-title">
            <span className="report-card-icon" style={{ background: 'rgba(0,152,70,0.12)', color: '#009846' }}>
              <PercentIcon size={16} />
            </span>
            <div>
              <h4>Key Performance Rates</h4>
              <span>Live percentages from current data</span>
            </div>
          </div>
        </div>
        <div className="report-rings-row">
          <RingGauge
            value={totalKamai > 0 ? (netProfit / totalKamai) * 100 : 0}
            max={100} size={140} stroke={11} color="#009846"
            label="PROFIT MARGIN" sublabel="of revenue" />
          <RingGauge
            value={totalKamai > 0 ? (totalLabour / totalKamai) * 100 : 0}
            max={100} size={140} stroke={11} color="#ef4444"
            label="LABOUR" sublabel="of revenue" />
          <RingGauge
            value={totalKamai > 0 ? (totalOH / totalKamai) * 100 : 0}
            max={100} size={140} stroke={11} color="#f59e0b"
            label="OVERHEAD" sublabel="of revenue" />
          <RingGauge
            value={totalKamai > 0 ? (totalOT / totalKamai) * 100 : 0}
            max={100} size={140} stroke={11} color="#8b5cf6"
            label="ONE-TIME" sublabel="of revenue" />
          <RingGauge
            value={filteredData.length > 0 ? (filteredData.filter(e => Utils.calculateEntryProfit(e) > 0).length / filteredData.length) * 100 : 0}
            max={100} size={140} stroke={11} color="#3b82f6"
            label="PROFITABLE" sublabel="entries" />
        </div>
        <div className="report-rings-legend">
          <span><i style={{ background: '#009846' }} />Profit Margin</span>
          <span><i style={{ background: '#ef4444' }} />Labour %</span>
          <span><i style={{ background: '#f59e0b' }} />Overhead %</span>
          <span><i style={{ background: '#8b5cf6' }} />One-Time %</span>
          <span><i style={{ background: '#3b82f6' }} />Profitable Entries</span>
        </div>
      </div>

      {/* Row 2 — Trend Chart */}
      <div className="report-card">
        <div className="report-card-header">
          <div className="report-card-title">
            <span className="report-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
              <LineChartIcon size={16} />
            </span>
            <div>
              <h4>Revenue & Profit Trends</h4>
              <span>{filteredData.length} entries · {dailyData.length} days</span>
            </div>
          </div>
          <div className="report-legend-toggle">
            <button className={`report-legend-btn ${selectedMetric === 'revenue' ? 'active' : ''}`}
              onClick={() => setSelectedMetric('revenue')}>Revenue</button>
            <button className={`report-legend-btn ${selectedMetric === 'profit' ? 'active' : ''}`}
              onClick={() => setSelectedMetric('profit')}>Profit</button>
            <button className={`report-legend-btn ${selectedMetric === 'combined' ? 'active' : ''}`}
              onClick={() => setSelectedMetric('combined')}>Combined</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={dailyData}>
            <defs>
              <linearGradient id="reportRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="reportProfitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#009846" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#009846" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
              tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
            <Tooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} iconType="circle" />
            {selectedMetric !== 'profit' && (
              <Area type="monotone" dataKey="revenue" name="Revenue"
                fill="url(#reportRevenueGrad)" stroke="#3b82f6" strokeWidth={2.5} />
            )}
            {selectedMetric !== 'revenue' && (
              <Area type="monotone" dataKey="profit" name="Profit"
                fill="url(#reportProfitGrad)" stroke="#009846" strokeWidth={2.5} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Row 3 — Cost Breakdown + Status Donut */}
      <div className="report-grid-1-1">
        <div className="report-card">
          <div className="report-card-header">
            <div className="report-card-title">
              <span className="report-card-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                <Scale size={16} />
              </span>
              <div>
                <h4>Cost Breakdown</h4>
                <span>Percentage of revenue</span>
              </div>
            </div>
          </div>
          <div className="report-method-rings">
            {costBreakdownData.map((m, i) => (
              <div key={i} className="report-method-item">
                <RingGauge value={m.pct} max={100} size={100} stroke={8} color={m.color} label={m.label} />
                <span className="report-method-value">{Utils.formatCurrencyShort(m.value)}</span>
                <span className="report-method-pct">{m.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-card">
          <div className="report-card-header">
            <div className="report-card-title">
              <span className="report-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Entry Status</h4>
                <span>{filteredData.length} total entries</span>
              </div>
            </div>
          </div>
          {statusChartData.length > 0 ? (
            <div className="report-donut-wrap">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={statusChartData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} stroke="none">
                    {statusChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="report-donut-legend">
                {statusChartData.map((d, i) => (
                  <div key={i} className="report-donut-item">
                    <span className="report-donut-dot" style={{ background: d.color }} />
                    <span className="report-donut-name">{d.name}</span>
                    <span className="report-donut-val">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div className="report-empty-mini">No entries</div>}
        </div>
      </div>

      {/* Row 4 — 12-Month Trend */}
      <div className="report-card">
        <div className="report-card-header">
          <div className="report-card-title">
            <span className="report-card-icon" style={{ background: 'rgba(0,152,70,0.12)', color: '#009846' }}>
              <Activity size={16} />
            </span>
            <div>
              <h4>12-Month Performance Trend</h4>
              <span>Revenue, Profit & Labour by month</span>
            </div>
          </div>
          <div className="report-legend">
            <span><i style={{ background: '#3b82f6' }} />Revenue</span>
            <span><i style={{ background: '#009846' }} />Profit</span>
            <span><i style={{ background: '#ef4444' }} />Labour</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={monthlyTrendData}>
            <defs>
              <linearGradient id="reportMonthRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
              tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
            <Tooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
            <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5}
              fill="url(#reportMonthRevGrad)" name="Revenue" />
            <Line type="monotone" dataKey="profit" stroke="#009846" strokeWidth={2.5}
              dot={{ fill: '#009846', r: 3 }} name="Profit" />
            <Line type="monotone" dataKey="labour" stroke="#ef4444" strokeWidth={2.5}
              dot={{ fill: '#ef4444', r: 3 }} name="Labour" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Row 5 — Site Distribution + Top Sites */}
      <div className="report-grid-1-1">
        <div className="report-card">
          <div className="report-card-header">
            <div className="report-card-title">
              <span className="report-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Revenue by Site</h4>
                <span>Distribution percentage</span>
              </div>
            </div>
          </div>
          {siteShareData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={siteShareData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} stroke="none">
                  {siteShareData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="report-empty-mini">No site data</div>}
          <div className="report-donut-legend" style={{ marginTop: 12 }}>
            {siteShareData.map((d, i) => (
              <div key={i} className="report-donut-item">
                <span className="report-donut-dot" style={{ background: d.color }} />
                <span className="report-donut-name">{d.name}</span>
                <span className="report-donut-val">{d.pct.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-card">
          <div className="report-card-header">
            <div className="report-card-title">
              <span className="report-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                <Trophy size={16} />
              </span>
              <div>
                <h4>Top Sites by Profit</h4>
                <span>Highest performing sites</span>
              </div>
            </div>
          </div>
          {topSitesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topSitesData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <defs>
                  <linearGradient id="reportTopSiteGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}
                  tickFormatter={(v) => Utils.formatCurrencyShort(v)} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11}
                  tickLine={false} axisLine={false} width={120} />
                <Tooltip content={<ChartTooltip formatter={(v) => Utils.formatCurrency(v)} />}
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="value" name="Profit" fill="url(#reportTopSiteGrad)" radius={[0, 8, 8, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="report-empty-mini">No site data</div>}
        </div>
      </div>

      {/* Row 6 — Site Performance Table */}
      <div className="report-card">
        <div className="report-card-header">
          <div className="report-card-title">
            <span className="report-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
              <Building2 size={16} />
            </span>
            <div>
              <h4>Site Performance</h4>
              <span>{siteProfitData.length} sites · detailed breakdown</span>
            </div>
          </div>
        </div>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Site Name</th>
                <th className="right">Entries</th>
                <th className="right">Revenue</th>
                <th className="right">Labour</th>
                <th className="right">Overhead</th>
                <th className="right">One-Time</th>
                <th className="right">Profit</th>
              </tr>
            </thead>
            <tbody>
              {sitePag.items.map((site, i) => {
                const realIndex = (sitePag.page - 1) * sitePer + i + 1;
                return (
                  <tr key={i} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                    <td>{realIndex}</td>
                    <td><strong>{site.name}</strong></td>
                    <td className="right">{site.entries}</td>
                    <td className="right report-td-green">{Utils.formatCurrencyShort(site.revenue)}</td>
                    <td className="right report-td-red">{Utils.formatCurrencyShort(site.labour)}</td>
                    <td className="right report-td-amber">{Utils.formatCurrencyShort(site.overhead)}</td>
                    <td className="right report-td-amber">{Utils.formatCurrencyShort(site.oneTime)}</td>
                    <td className={`right ${site.profit >= 0 ? 'report-td-green' : 'report-td-red'}`}>
                      <strong>{Utils.formatCurrencyShort(site.profit)}</strong>
                    </td>
                  </tr>
                );
              })}
              {siteProfitData.length === 0 && (
                <tr><td colSpan="8" className="report-no-data">No site data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {renderPagination(sitePag.page, sitePag.total, sitePer, setSitePer, setSitePage, siteProfitData.length, 'sites')}
      </div>

      {/* Row 7 — Worker Compensation */}
      <div className="report-card">
        <div className="report-card-header">
          <div className="report-card-title">
            <span className="report-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
              <HardHat size={16} />
            </span>
            <div>
              <h4>Worker Compensation</h4>
              <span>{workerSalaries.length} workers · total {Utils.formatCurrency(totalWages)}</span>
            </div>
          </div>
          <div className="report-legend">
            <span><strong style={{ color: '#009846' }}>{Utils.formatCurrency(totalWages)}</strong> total wages</span>
          </div>
        </div>
        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Worker</th>
                <th>Role</th>
                <th className="right">Daily Rate</th>
                <th className="right">Hours</th>
                <th className="right">Days</th>
                <th className="right">Total Wage</th>
              </tr>
            </thead>
            <tbody>
              {workerPag.items.map((w, i) => {
                const realIndex = (workerPag.page - 1) * workerPer + i + 1;
                return (
                  <tr key={i} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                    <td>{realIndex}</td>
                    <td>
                      <div className="report-worker-cell">
                        <div className="report-worker-avatar" style={{ background: getAvatarColor(realIndex - 1) }}>
                          {w.name.charAt(0).toUpperCase()}
                        </div>
                        <strong>{w.name}</strong>
                      </div>
                    </td>
                    <td><span className="report-role-badge">{w.role || 'General'}</span></td>
                    <td className="right">{Utils.formatCurrency(w.dailyRate)}</td>
                    <td className="right">{(w.totalHours || 0).toFixed(1)}h</td>
                    <td className="right">{w.daysPresent || 0}</td>
                    <td className="right report-td-green"><strong>{Utils.formatCurrency(w.totalWage || 0)}</strong></td>
                  </tr>
                );
              })}
              {workerSalaries.length === 0 && (
                <tr><td colSpan="7" className="report-no-data">No worker data available</td></tr>
              )}
            </tbody>
            {workerSalaries.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan="6" className="right"><strong>Total Wages</strong></td>
                  <td className="right report-td-green"><strong>{Utils.formatCurrency(totalWages)}</strong></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {renderPagination(workerPag.page, workerPag.total, workerPer, setWorkerPer, setWorkerPage, workerSalaries.length, 'workers')}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ModalPortal>
          <div className="report-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowExportModal(false); }}>
            <div className="report-modal" onClick={e => e.stopPropagation()}>
              <div className="report-modal-header" style={{ background: 'linear-gradient(135deg, #009846, #007a38)' }}>
                <div className="report-modal-header-left">
                  <div className="report-modal-icon"><Download size={18} /></div>
                  <div>
                    <h3>Export Report</h3>
                    <p className="report-modal-sub">Choose your export format</p>
                  </div>
                </div>
                <button className="report-modal-close" onClick={() => setShowExportModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="report-modal-body">
                <div className="report-export-options">
                  <button
                    className={`report-export-option ${exportType === 'excel' ? 'active' : ''}`}
                    onClick={() => setExportType('excel')}>
                    <FileText size={24} />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    className={`report-export-option ${exportType === 'csv' ? 'active' : ''}`}
                    onClick={() => setExportType('csv')}>
                    <FileText size={24} />
                    <span>CSV (.csv)</span>
                  </button>
                </div>
              </div>
              <div className="report-modal-actions">
                <button className="report-btn report-btn-secondary" onClick={() => setShowExportModal(false)}>
                  Cancel
                </button>
                <button className="report-btn report-btn-primary" onClick={handleExport}>
                  <Download size={14} /> Export {exportType.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

export default ReportsComponent;