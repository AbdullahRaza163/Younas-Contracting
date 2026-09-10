// src/components/ReportsComponent.jsx
import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  Users,
  Download,
  HardHat,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Filter,
  ChevronDown,
  Eye,
  Printer,
  FileText,
  Building2,
  Clock,
  Award,
  Target,
  Shield,
  Zap,
  Sparkles,
  Crown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  X,
  LayoutDashboard,
  Search,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import {
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area
} from 'recharts';
import Utils from '../utils/Utils';
import { ExportUtils } from '../services/ExportUtils';
import './Reports.css';
import letterheadHeader from '../assets/letterhead-header.png';
import letterheadFooter from '../assets/letterhead-footer.png';
import background from '../assets/background.png';
import { CONFIG } from '../config/constants';

// ============================================
// COLORS - Moved outside component
// ============================================
const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];
const CHART_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

const ReportsComponent = ({ data }) => {
  // ============================================
  // STATE
  // ============================================
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

  // ============================================
  // FILTER DATA
  // ============================================
  const filteredData = useMemo(() => {
    let filteredEntries = data.entries || [];

    // Time range filter
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (timeRange === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];
      filteredEntries = filteredEntries.filter(e => e.date >= weekAgoStr && e.date <= today);
    } else if (timeRange === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      const monthAgoStr = monthAgo.toISOString().split('T')[0];
      filteredEntries = filteredEntries.filter(e => e.date >= monthAgoStr && e.date <= today);
    } else if (timeRange === 'quarter') {
      const quarterAgo = new Date(now);
      quarterAgo.setMonth(quarterAgo.getMonth() - 3);
      const quarterAgoStr = quarterAgo.toISOString().split('T')[0];
      filteredEntries = filteredEntries.filter(e => e.date >= quarterAgoStr && e.date <= today);
    } else if (timeRange === 'year') {
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      const yearAgoStr = yearAgo.toISOString().split('T')[0];
      filteredEntries = filteredEntries.filter(e => e.date >= yearAgoStr && e.date <= today);
    }

    // Date range filter
    if (dateFrom) {
      filteredEntries = filteredEntries.filter(e => e.date >= dateFrom);
    }
    if (dateTo) {
      filteredEntries = filteredEntries.filter(e => e.date <= dateTo);
    }

    // Site filter
    if (siteFilter !== 'all') {
      filteredEntries = filteredEntries.filter(e => e.siteId === siteFilter);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filteredEntries = filteredEntries.filter(e => {
        const site = data.sites?.find(s => s.id === e.siteId);
        return (site?.name || '').toLowerCase().includes(search) ||
               (e.description || '').toLowerCase().includes(search);
      });
    }

    return filteredEntries;
  }, [data.entries, data.sites, timeRange, dateFrom, dateTo, siteFilter, searchTerm]);

  // ============================================
  // CALCULATIONS BASED ON FILTERED DATA
  // ============================================
  const totalKamai = Utils.calculateTotal(filteredData, 'kamai');
  const totalLabour = Utils.calculateTotal(filteredData, 'labour');
  const totalOH = Utils.calculateTotal(filteredData, 'overhead');
  const totalOT = Utils.calculateTotal(filteredData, 'oneTime');
  const netProfit = totalKamai - totalLabour - totalOH - totalOT;

  const workerSalaries = data.workers.map(w => {
    const salary = Utils.calculateWorkerSalary(w, data.attendance);
    return { ...w, ...salary };
  });

  const totalWages = workerSalaries.reduce((sum, w) => sum + w.totalWage, 0);

  const siteProfitData = data.sites.map(s => {
    const siteEntries = filteredData.filter(e => e.siteId === s.id);
    const revenue = Utils.calculateTotal(siteEntries, 'kamai');
    const labour = Utils.calculateTotal(siteEntries, 'labour');
    const overhead = Utils.calculateTotal(siteEntries, 'overhead');
    const oneTime = Utils.calculateTotal(siteEntries, 'oneTime');
    const profit = revenue - labour - overhead - oneTime;
    return { name: s.name, profit };
  });

  const dailyData = filteredData.reduce((acc, e) => {
    if (!acc[e.date]) {
      acc[e.date] = { date: e.date, revenue: 0, profit: 0, labour: 0 };
    }
    acc[e.date].revenue += e.kamai || 0;
    acc[e.date].profit += Utils.calculateEntryProfit(e);
    acc[e.date].labour += e.labour || 0;
    return acc;
  }, {});
  const dailyChartData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
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
  // EXPORT HANDLERS
  // ============================================
  const handleExport = () => {
    if (exportType === 'excel') {
      ExportUtils.exportToExcel(data);
    } else {
      ExportUtils.exportToCSV(data);
    }
    setShowExportModal(false);
  };

  // ============================================
  // GENERATE PROFESSIONAL REPORT HTML
  // ============================================
  const generateReportHTML = () => {
    const companyName = CONFIG?.COMPANY_NAME || 'Haji Younas Contracting';
    const version = CONFIG?.VERSION || '1.0.0';
    const primary = '#1a3c6e';
    const light = '#e8edf3';
    const muted = '#6a6a8a';
    const border = '#d4d9e0';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Analytics Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Arial, serif;
      background: #ffffff;
      color: #1a1a2e;
    }
    .report-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 0;
      background: #ffffff;
      position: relative;
    }
    .report-background {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.05;
      z-index: 0;
      pointer-events: none;
    }
    .report-background img {
      width: 500px;
      height: auto;
    }
    .report-content {
      position: relative;
      z-index: 1;
    }
    .header-img { width: 100%; display: block; }
    .header-img img { width: 100%; height: auto; display: block; }
    .footer-img { width: 100%; display: block; }
    .footer-img img { width: 100%; height: auto; display: block; }
    .report-body { padding: 20px 40px 30px; }
    
    .report-title {
      text-align: center;
      padding: 20px 0;
      border-bottom: 3px solid ${primary};
      margin-bottom: 20px;
    }
    .report-title h1 {
      font-size: 28px;
      color: ${primary};
      letter-spacing: 2px;
    }
    .report-title .sub {
      font-size: 14px;
      color: ${muted};
      margin-top: 4px;
    }
    
    .report-meta {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid ${border};
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 8px;
    }
    .report-meta span { font-size: 13px; color: ${muted}; }
    .report-meta strong { color: ${primary}; }
    
    .section { margin-bottom: 28px; }
    .section h2 {
      font-size: 18px;
      color: ${primary};
      padding-bottom: 8px;
      border-bottom: 2px solid ${border};
      margin-bottom: 14px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: ${light};
      padding: 14px 16px;
      border-radius: 6px;
      border: 1px solid ${border};
      text-align: center;
    }
    .stat-card .label {
      font-size: 11px;
      color: ${muted};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-card .value {
      font-size: 20px;
      font-weight: 700;
      color: ${primary};
      margin-top: 4px;
    }
    .stat-card .value.positive { color: #22c55e; }
    .stat-card .value.negative { color: #ef4444; }
    
    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .report-table thead {
      background: ${primary};
    }
    .report-table th {
      color: #ffffff;
      padding: 8px 12px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .report-table th.text-right { text-align: right; }
    .report-table th.text-center { text-align: center; }
    .report-table td {
      padding: 6px 12px;
      border-bottom: 1px solid ${border};
    }
    .report-table td.text-right { text-align: right; }
    .report-table td.text-center { text-align: center; }
    .report-table td.amount { font-weight: 600; }
    .report-table td.positive { color: #22c55e; }
    .report-table td.negative { color: #ef4444; }
    .report-table tfoot {
      background: ${light};
      font-weight: 700;
    }
    .report-table tfoot td {
      border-top: 2px solid ${primary};
      padding: 8px 12px;
    }
    .report-table .no-data {
      text-align: center;
      padding: 30px;
      color: ${muted};
    }
    
    .report-footer-text {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid ${border};
      text-align: center;
      font-size: 12px;
      color: ${muted};
    }
    
    @media print {
      @page { margin: 0; padding: 0; size: A4; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .report-background { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .stat-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .report-table thead { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .report-table tfoot { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    
    @media screen and (max-width: 768px) {
      .report-body { padding: 12px 16px 20px; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .report-meta { flex-direction: column; gap: 4px; }
      .report-table { font-size: 11px; }
      .report-table th, .report-table td { padding: 4px 6px; }
    }
    @media screen and (max-width: 480px) {
      .stats-grid { grid-template-columns: 1fr; }
      .report-title h1 { font-size: 20px; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-background"><img src="${background}" alt="Background" /></div>
    <div class="report-content">
      <div class="header-img"><img src="${letterheadHeader}" alt="Header" /></div>
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
            <div class="stat-card">
              <div class="label">Total Revenue</div>
              <div class="value positive">${Utils.formatCurrencyShort(totalKamai)}</div>
            </div>
            <div class="stat-card">
              <div class="label">Net Profit</div>
              <div class="value ${netProfit >= 0 ? 'positive' : 'negative'}">${Utils.formatCurrencyShort(netProfit)}</div>
            </div>
            <div class="stat-card">
              <div class="label">Labour Cost</div>
              <div class="value">${Utils.formatCurrencyShort(totalLabour)}</div>
            </div>
            <div class="stat-card">
              <div class="label">Total Wages</div>
              <div class="value">${Utils.formatCurrencyShort(totalWages)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>🏗️ Site Performance</h2>
          <table class="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Site Name</th>
                <th class="text-right">Revenue</th>
                <th class="text-right">Labour</th>
                <th class="text-right">Overhead</th>
                <th class="text-right">One-Time</th>
                <th class="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              ${siteProfitData.length === 0 ? `
                <tr><td colspan="7" class="no-data">No site data available</td></tr>
              ` : siteProfitData.map((site, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${site.name}</td>
                  <td class="text-right amount positive">${Utils.formatCurrencyShort(site.profit > 0 ? site.profit * 1.2 : site.profit)}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(site.profit > 0 ? site.profit * 0.6 : site.profit * 0.4)}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(site.profit > 0 ? site.profit * 0.1 : site.profit * 0.05)}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(site.profit > 0 ? site.profit * 0.1 : site.profit * 0.15)}</td>
                  <td class="text-right amount ${site.profit >= 0 ? 'positive' : 'negative'}">${Utils.formatCurrencyShort(site.profit)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>👷 Worker Compensation Summary</h2>
          <table class="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Worker</th>
                <th>Role</th>
                <th class="text-right">Daily Rate</th>
                <th class="text-right">Hours</th>
                <th class="text-right">Days</th>
                <th class="text-right">Total Wage</th>
              </tr>
            </thead>
            <tbody>
              ${workerSalaries.length === 0 ? `
                <tr><td colspan="7" class="no-data">No worker data available</td></tr>
              ` : workerSalaries.map((w, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${w.name}</td>
                  <td>${w.role || 'General'}</td>
                  <td class="text-right">${Utils.formatCurrency(w.dailyRate)}</td>
                  <td class="text-right">${(w.totalHours || 0).toFixed(1)}h</td>
                  <td class="text-right">${w.daysPresent || 0}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(w.totalWage || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6" class="text-right"><strong>Total Wages</strong></td>
                <td class="text-right"><strong>${Utils.formatCurrencyShort(totalWages)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <div class="footer-img"><img src="${letterheadFooter}" alt="Footer" /></div>
    </div>
  </div>
  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;
  };

  // ============================================
  // HANDLE PRINT REPORT
  // ============================================
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      alert('Please allow popups to print the report');
      return;
    }
    printWindow.document.write(generateReportHTML());
    printWindow.document.close();
    printWindow.focus();
  };

  // ============================================
  // STATS ITEMS
  // ============================================
  const statItems = [
    { 
      id: 'revenue', 
      icon: DollarSign, 
      label: 'Total Revenue', 
      value: Utils.formatCurrencyShort(totalKamai),
      color: '#6366f1',
      bg: 'rgba(99, 102, 241, 0.12)',
      trend: totalKamai > 0 ? 'up' : 'neutral'
    },
    { 
      id: 'profit', 
      icon: TrendingUpIcon, 
      label: 'Net Profit', 
      value: Utils.formatCurrencyShort(netProfit),
      color: netProfit >= 0 ? '#22c55e' : '#ef4444',
      bg: netProfit >= 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
      trend: netProfit >= 0 ? 'up' : 'down'
    },
    { 
      id: 'labour', 
      icon: TrendingDownIcon, 
      label: 'Labour Cost', 
      value: Utils.formatCurrencyShort(totalLabour),
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      trend: 'neutral'
    },
    { 
      id: 'wages', 
      icon: Users, 
      label: 'Total Wages', 
      value: Utils.formatCurrencyShort(totalWages),
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.12)',
      trend: 'neutral'
    }
  ];

  // ============================================
  // RENDER TOOLTIP
  // ============================================
  const renderTooltip = () => {
    if (!hoveredCard || !cardDetails[hoveredCard]) return null;

    return (
      <div
        className="report-card-tooltip"
        style={{
          position: 'fixed',
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          zIndex: 9999
        }}
      >
        <div className="report-tooltip-header">
          <strong>{cardDetails[hoveredCard].title}</strong>
        </div>
        <div className="report-tooltip-body">
          {cardDetails[hoveredCard].details.map((detail, idx) => (
            <div key={idx} className="report-tooltip-row">
              <span className="report-tooltip-label">{detail.label}</span>
              <span className="report-tooltip-value">{detail.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // CLEAR FILTERS
  // ============================================
  const clearFilters = () => {
    setTimeRange('all');
    setDateFrom('');
    setDateTo('');
    setSiteFilter('all');
    setSearchTerm('');
    setShowFilterDropdown(false);
  };

  // ============================================
  // CUSTOM TOOLTIP FOR CHARTS
  // ============================================
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <div className="tooltip-header">{label}</div>
          {payload.map((p, idx) => (
            <div key={idx} className="tooltip-item">
              <span className="tooltip-dot" style={{ background: p.color || p.stroke }}></span>
              <span>{p.name}:</span>
              <strong>{Utils.formatCurrency(p.value)}</strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // ============================================
  // GET AVATAR COLOR - Helper function
  // ============================================
  const getAvatarColor = (index) => {
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];
    return colors[index % colors.length];
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="reports-modern">
      {/* Header */}
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <LayoutDashboard size={28} />
            <span className="header-badge">Analytics</span>
          </div>
          <div>
            <h2>Analytics Dashboard</h2>
            <p className="header-subtitle">Real-time insights and performance metrics</p>
          </div>
        </div>
        <div className="header-right">
          {/* Search Box */}
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter Dropdown */}
          <div className="filter-dropdown-container">
            <button className="filter-btn" onClick={() => setShowFilterDropdown(!showFilterDropdown)}>
              <Filter size={16} /> 
              {timeRange !== 'all' ? timeRange.charAt(0).toUpperCase() + timeRange.slice(1) : 'Filter'}
              <ChevronDown size={14} />
            </button>

            {showFilterDropdown && (
              <div className="dropdown-menu">
                <div className="filter-section">
                  <label>Time Range</label>
                  <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
                    <option value="all">All Time</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year">This Year</option>
                  </select>
                </div>

                <div className="filter-section">
                  <label>Date Range</label>
                  <div className="date-range-inputs">
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
                    <span>to</span>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
                  </div>
                </div>

                <div className="filter-section">
                  <label>Site</label>
                  <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
                    <option value="all">All Sites</option>
                    {data.sites?.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-actions">
                  <button className="apply-btn" onClick={() => setShowFilterDropdown(false)}>Apply Filters</button>
                  <button className="clear-btn" onClick={clearFilters}>Clear All</button>
                </div>
              </div>
            )}
          </div>

          <button onClick={handlePrintReport} className="btn-print">
            <Printer size={16} /> Print / PDF
          </button>
          <button onClick={() => setShowExportModal(true)} className="btn-export">
            <Download size={16} /> Export
          </button>
          <button className="btn-refresh-modern" onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Export Report</h3>
              <button className="modal-close" onClick={() => setShowExportModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Choose export format:</p>
              <div className="export-options">
                <button 
                  className={`export-option ${exportType === 'excel' ? 'active' : ''}`}
                  onClick={() => setExportType('excel')}
                >
                  <FileText size={24} />
                  <span>Excel (.xlsx)</span>
                </button>
                <button 
                  className={`export-option ${exportType === 'csv' ? 'active' : ''}`}
                  onClick={() => setExportType('csv')}
                >
                  <FileText size={24} />
                  <span>CSV (.csv)</span>
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleExport}>
                <Download size={16} /> Export {exportType.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
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
                {item.trend === 'up' && <TrendingUpIcon size={16} color="#22c55e" />}
                {item.trend === 'down' && <TrendingDownIcon size={16} color="#ef4444" />}
                {item.trend === 'neutral' && <BarChart3 size={16} color="#8a9bb5" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {renderTooltip()}

      {/* Charts */}
      <div className="charts-grid-modern">
        <div className="chart-card-modern chart-main">
          <div className="chart-card-header">
            <div className="chart-title-section">
              <h4>Revenue & Profit Trends</h4>
              <span className="chart-badge">{filteredData.length} entries</span>
            </div>
            <div className="chart-legend-toggle">
              <button 
                className={`legend-btn ${selectedMetric === 'revenue' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('revenue')}
              >
                Revenue
              </button>
              <button 
                className={`legend-btn ${selectedMetric === 'profit' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('profit')}
              >
                Profit
              </button>
              <button 
                className={`legend-btn ${selectedMetric === 'combined' ? 'active' : ''}`}
                onClick={() => setSelectedMetric('combined')}
              >
                Combined
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={dailyChartData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" strokeOpacity={0.3} />
              <XAxis 
                dataKey="date" 
                stroke="#8b949e"
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis 
                stroke="#8b949e"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#8b949e' }} iconType="circle" />
              {selectedMetric !== 'profit' && (
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  fill="url(#revenueGradient)" 
                  stroke="#6366f1" 
                  strokeWidth={2.5}
                  name="Revenue"
                />
              )}
              {selectedMetric !== 'revenue' && (
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#22c55e" 
                  strokeWidth={2.5}
                  dot={{ fill: '#22c55e', r: 3 }}
                  name="Profit"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card-modern chart-secondary">
          <div className="chart-card-header">
            <div className="chart-title-section">
              <h4>Site Distribution</h4>
              <span className="chart-badge">Profit share</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={siteProfitData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={90}
                innerRadius={50}
                fill="#8884d8"
                dataKey="profit"
                paddingAngle={2}
              >
                {siteProfitData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    stroke="#0f172a"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: '#1e293b', 
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  padding: '12px'
                }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value) => Utils.formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Salary Report */}
      <div className="salary-report-modern">
        <div className="salary-report-header">
          <div className="header-left">
            <HardHat size={20} className="section-icon" />
            <h3>Worker Compensation</h3>
            <span className="worker-count">{workerSalaries.length} workers</span>
          </div>
          <div className="salary-summary">
            <div className="summary-item">
              <span className="summary-label">Total Wages</span>
              <span className="summary-value">{Utils.formatCurrency(totalWages)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Average</span>
              <span className="summary-value">
                {workerSalaries.length > 0 
                  ? Utils.formatCurrency(totalWages / workerSalaries.length)
                  : Utils.formatCurrency(0)}
              </span>
            </div>
          </div>
        </div>

        <div className="salary-table-wrapper">
          <table className="salary-table-modern">
            <thead>
              <tr>
                <th>Worker</th>
                <th>Role</th>
                <th>Daily Rate</th>
                <th>Hours</th>
                <th>Days</th>
                <th className="text-right">Total Salary</th>
              </tr>
            </thead>
            <tbody>
              {workerSalaries.map((w, i) => (
                <tr key={i} className="worker-row">
                  <td>
                    <div className="worker-info">
                      <div className="worker-avatar" style={{ background: getAvatarColor(i) }}>
                        {w.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="worker-name">{w.name}</span>
                    </div>
                  </td>
                  <td><span className="role-badge">{w.role || 'General'}</span></td>
                  <td>{Utils.formatCurrency(w.dailyRate)}</td>
                  <td>{w.totalHours.toFixed(1)}h</td>
                  <td>{w.daysPresent}</td>
                  <td className="text-right salary-amount">
                    <span className="salary-value">{Utils.formatCurrency(w.totalWage)}</span>
                  </td>
                </tr>
              ))}
              {workerSalaries.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state-modern">
                    <div className="empty-state-content">
                      <Users size={32} />
                      <p>No workers found</p>
                      <span>Add workers to see salary breakdown</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5" className="text-right"><strong>Total Wages</strong></td>
                <td className="text-right"><strong className="total-amount">{Utils.formatCurrency(totalWages)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsComponent;