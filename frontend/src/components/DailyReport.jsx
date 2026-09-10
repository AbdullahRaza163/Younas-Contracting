// src/components/DailyReportComponent.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { 
  Download, Printer, X, FileText, HardHat, 
  Calendar, TrendingUp, TrendingDown, DollarSign,
  Users, Clock, BarChart3, LayoutDashboard,
  Building2, Award, AlertCircle, CheckCircle,
  Info, ArrowUpRight, ArrowDownRight,
  RefreshCw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Eye, EyeOff,
  Zap, Sparkles, Crown, Target, Gauge,
  Receipt, Send, Edit, Trash2, Plus
} from 'lucide-react';
import Utils from '../utils/Utils';
import { CONFIG } from '../config/constants';
import './DailyReport.css';
import letterheadHeader from '../assets/letterhead-header.png';
import letterheadFooter from '../assets/letterhead-footer.png';
import background from '../assets/background.png';

const DailyReportComponent = ({ data, selectedDate }) => {
  // ============================================
  // STATE
  // ============================================
  const [reportDate, setReportDate] = useState(selectedDate || Utils.today());
  const [dateRange, setDateRange] = useState({
    type: 'single',
    startDate: Utils.today(),
    endDate: Utils.today()
  });
  const [showReport, setShowReport] = useState(false);
  const [viewMode, setViewMode] = useState('daily');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // ============================================
  // DATE RANGE CALCULATIONS
  // ============================================
  const getDateRange = useCallback((type, customStart, customEnd) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const start = new Date();
    const end = new Date();

    switch(type) {
      case 'today':
        return { startDate: todayStr, endDate: todayStr };
      case 'thisMonth':
        start.setDate(1);
        return { 
          startDate: start.toISOString().split('T')[0], 
          endDate: todayStr 
        };
      case 'lastMonth':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        return { 
          startDate: start.toISOString().split('T')[0], 
          endDate: end.toISOString().split('T')[0] 
        };
      case 'last6Months':
        start.setMonth(start.getMonth() - 6);
        return { 
          startDate: start.toISOString().split('T')[0], 
          endDate: todayStr 
        };
      case 'thisYear':
        start.setMonth(0);
        start.setDate(1);
        return { 
          startDate: start.toISOString().split('T')[0], 
          endDate: todayStr 
        };
      case 'lastYear':
        start.setFullYear(start.getFullYear() - 1);
        start.setMonth(0);
        start.setDate(1);
        end.setFullYear(end.getFullYear() - 1);
        end.setMonth(11);
        end.setDate(31);
        return { 
          startDate: start.toISOString().split('T')[0], 
          endDate: end.toISOString().split('T')[0] 
        };
      case 'custom':
        return { 
          startDate: customStart || todayStr, 
          endDate: customEnd || todayStr 
        };
      default:
        return { 
          startDate: reportDate || todayStr, 
          endDate: reportDate || todayStr 
        };
    }
  }, [reportDate]);

  // ============================================
  // FILTERED DATA
  // ============================================
  const filteredData = useMemo(() => {
    const range = getDateRange(dateRange.type, dateRange.startDate, dateRange.endDate);
    const start = range.startDate;
    const end = range.endDate;

    const filteredEntries = data.entries.filter(e => {
      return e.date >= start && e.date <= end;
    });

    const filteredAttendance = data.attendance.filter(a => {
      return a.date >= start && a.date <= end;
    });

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
      const totalHours = dayAttendance.reduce((sum, a) => {
        if (a.checkedIn && a.checkedOut) {
          return sum + Utils.calculateHoursWorked(a.checkedIn, a.checkedOut);
        }
        return sum;
      }, 0);

      return {
        date,
        revenue,
        labour,
        overhead,
        oneTime,
        profit,
        workersPresent,
        totalHours,
        entryCount: dayEntries.length,
        entries: dayEntries,
        attendance: dayAttendance
      };
    });

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
      totalDays: uniqueDates.length
    };

    const workerSummary = data.workers.map(worker => {
      const workerAttendance = filteredAttendance.filter(a => a.workerId === worker.id);
      const totalHours = workerAttendance.reduce((sum, a) => {
        if (a.checkedIn && a.checkedOut) {
          return sum + Utils.calculateHoursWorked(a.checkedIn, a.checkedOut);
        }
        return sum;
      }, 0);
      const daysPresent = workerAttendance.filter(a => a.present).length;
      const totalWage = Utils.calculateDailyWage(totalHours, worker.dailyRate);

      return {
        ...worker,
        totalHours,
        daysPresent,
        totalWage,
        attendance: workerAttendance
      };
    });

    const siteSummary = data.sites.map(site => {
      const siteEntries = filteredEntries.filter(e => e.siteId === site.id);
      const revenue = Utils.calculateTotal(siteEntries, 'kamai');
      const labour = Utils.calculateTotal(siteEntries, 'labour');
      const overhead = Utils.calculateTotal(siteEntries, 'overhead');
      const oneTime = Utils.calculateTotal(siteEntries, 'oneTime');
      const profit = revenue - labour - overhead - oneTime;

      return {
        ...site,
        revenue,
        labour,
        overhead,
        oneTime,
        profit,
        entryCount: siteEntries.length,
        entries: siteEntries
      };
    });

    return {
      startDate: start,
      endDate: end,
      dailyAggregates,
      totals,
      workerSummary,
      siteSummary,
      filteredEntries,
      filteredAttendance,
      dateRange: range
    };
  }, [data, dateRange, getDateRange, reportDate]);

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
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
        { label: 'Total Hours', value: filteredData.workerSummary.reduce((sum, w) => sum + w.totalHours, 0).toFixed(1) },
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

  // Date range presets
  const datePresets = [
    { id: 'today', label: 'Today' },
    { id: 'thisMonth', label: 'This Month' },
    { id: 'lastMonth', label: 'Last Month' },
    { id: 'last6Months', label: 'Last 6 Months' },
    { id: 'thisYear', label: 'This Year' },
    { id: 'lastYear', label: 'Last Year' }
  ];

  const handleDateRangeChange = (type) => {
    const range = getDateRange(type);
    setDateRange({
      type,
      startDate: range.startDate,
      endDate: range.endDate
    });
    setShowReport(true);
  };

  const handleCustomDateRange = () => {
    if (dateRange.startDate && dateRange.endDate) {
      setDateRange({
        type: 'custom',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      setShowReport(true);
    }
  };

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
        day.date,
        day.revenue.toFixed(3),
        day.labour.toFixed(3),
        day.overhead.toFixed(3),
        day.oneTime.toFixed(3),
        day.profit.toFixed(3),
        day.workersPresent,
        day.totalHours.toFixed(1)
      ]);
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
  // GENERATE PROFESSIONAL REPORT HTML (for PDF/Print)
  // ============================================
  const generateProfessionalReportHTML = () => {
    const companyName = CONFIG.COMPANY_NAME || 'Haji Younas Contracting';
    const companyPhone = data.companyPhone || '+973 37099957';
    const companyEmail = data.companyEmail || 'hajiyounas.contracting@gmail.com';
    const companyAddress = data.companyAddress || 'Flat/Shop 21, Bldg A0365, Road 55, Block 210, Muharraq';
    const companyCr = data.companyCr || '141997-1';

    const { dailyAggregates, totals, workerSummary, siteSummary } = filteredData;

    const primary = '#1a3c6e';
    const secondary = '#c9a84c';
    const light = '#e8edf3';
    const muted = '#6a6a8a';
    const border = '#d4d9e0';
    const text = '#1a1a2e';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Daily Work Report</title>
  <style>
    * { margin: 0 !important; padding: 0 !important; border: 0 !important; box-sizing: border-box !important; }
    html, body {
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      font-family: 'Times New Roman', Arial, serif !important;
      color: ${text} !important;
    }
    .report-container {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      display: flex !important;
      flex-direction: column !important;
      min-height: 100vh !important;
      position: relative !important;
    }
    .report-background {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: 0 !important;
      pointer-events: none !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      opacity: 0.08 !important;
    }
    .report-background img {
      width: 70% !important;
      max-width: 600px !important;
      height: auto !important;
      display: block !important;
    }
    .report-content-wrapper {
      position: relative !important;
      z-index: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      min-height: 100vh !important;
      width: 100% !important;
    }
    .report-header-section { flex-shrink: 0 !important; width: 100% !important; background: #ffffff !important; }
    .report-header-img { width: 100% !important; max-width: 100% !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    .report-header-img img { width: 100% !important; height: auto !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    .report-content-section { flex: 1 !important; width: 100% !important; padding: 12px 30px 16px 30px !important; background: transparent !important; }
    .report-title-block {
      text-align: center !important;
      padding: 10px 0 !important;
      border-bottom: 3px solid ${primary} !important;
      margin-bottom: 16px !important;
    }
    .report-title-block h1 {
      font-size: 24px !important;
      font-weight: 800 !important;
      color: ${primary} !important;
      letter-spacing: 2px !important;
      margin: 0 !important;
    }
    .report-title-block .sub-title {
      font-size: 14px !important;
      color: ${muted} !important;
      margin-top: 4px !important;
    }
    .report-meta {
      display: flex !important;
      justify-content: space-between !important;
      margin-bottom: 16px !important;
      padding: 8px 0 !important;
      border-bottom: 1px solid ${border} !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
    }
    .report-meta .meta-item {
      font-size: 13px !important;
      color: ${muted} !important;
    }
    .report-meta .meta-item strong {
      color: ${primary} !important;
    }
    .report-section {
      margin-bottom: 24px !important;
    }
    .report-section h2 {
      font-size: 16px !important;
      font-weight: 700 !important;
      color: ${primary} !important;
      padding-bottom: 6px !important;
      border-bottom: 2px solid ${border} !important;
      margin-bottom: 12px !important;
    }
    .summary-grid {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 10px !important;
      margin-bottom: 16px !important;
    }
    .summary-card {
      background: ${light} !important;
      padding: 12px 14px !important;
      border-radius: 6px !important;
      border: 1px solid ${border} !important;
      text-align: center !important;
    }
    .summary-card .label {
      font-size: 11px !important;
      color: ${muted} !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    .summary-card .value {
      font-size: 18px !important;
      font-weight: 700 !important;
      color: ${primary} !important;
      margin-top: 2px !important;
    }
    .summary-card .value.positive { color: #22c55e !important; }
    .summary-card .value.negative { color: #ef4444 !important; }
    
    .report-table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 12px !important;
    }
    .report-table thead {
      background: ${primary} !important;
    }
    .report-table th {
      color: #ffffff !important;
      padding: 6px 10px !important;
      text-align: left !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    .report-table th.text-right { text-align: right !important; }
    .report-table th.text-center { text-align: center !important; }
    .report-table td {
      padding: 6px 10px !important;
      border-bottom: 1px solid ${border} !important;
      text-align: left !important;
    }
    .report-table td.text-right { text-align: right !important; }
    .report-table td.text-center { text-align: center !important; }
    .report-table td.amount { font-weight: 600 !important; }
    .report-table td.amount.positive { color: #22c55e !important; }
    .report-table td.amount.negative { color: #ef4444 !important; }
    .report-table tbody tr:last-child td { border-bottom: none !important; }
    .report-table tfoot {
      background: ${light} !important;
      font-weight: 700 !important;
    }
    .report-table tfoot td {
      border-top: 2px solid ${primary} !important;
      padding: 8px 10px !important;
    }
    .report-table .no-data {
      text-align: center !important;
      padding: 20px !important;
      color: ${muted} !important;
    }
    .report-footer-section { flex-shrink: 0 !important; width: 100% !important; margin-top: auto !important; background: #ffffff !important; }
    .report-footer-img { width: 100% !important; max-width: 100% !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    .report-footer-img img { width: 100% !important; height: auto !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    
    @media print {
      @page { margin: 0 !important; padding: 0 !important; size: A4 !important; }
      html, body {
        margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important;
        -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
      }
      .report-container { min-height: 100vh !important; width: 100% !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .report-background { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; opacity: 0.08 !important; position: fixed !important; }
      .report-table thead { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${primary} !important; }
      .report-table th { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${primary} !important; color: #ffffff !important; }
      .summary-card { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${light} !important; }
      .report-table tfoot { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${light} !important; }
      .report-header-img img, .report-footer-img img { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    @media screen {
      .report-container { max-width: 100% !important; margin: 0 auto !important; box-shadow: 0 4px 30px rgba(0,0,0,0.12) !important; border: 1px solid ${border} !important; }
    }
    @media screen and (max-width: 768px) {
      .report-content-section { padding: 8px 14px 12px 14px !important; }
      .summary-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .report-meta { flex-direction: column !important; gap: 4px !important; }
      .report-table { font-size: 11px !important; }
      .report-table th, .report-table td { padding: 4px 6px !important; }
    }
    @media screen and (max-width: 480px) {
      .report-content-section { padding: 6px 8px 10px 8px !important; }
      .summary-grid { grid-template-columns: 1fr !important; }
      .report-table { font-size: 9px !important; }
      .report-table th, .report-table td { padding: 3px 4px !important; }
      .report-title-block h1 { font-size: 18px !important; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-background"><img src='${background}' alt="Background" /></div>
    <div class="report-content-wrapper">
      <div class="report-header-section">
        <div class="report-header-img"><img src="${letterheadHeader}" alt="Letterhead" /></div>
      </div>
      <div class="report-content-section">
        <div class="report-title-block">
          <h1>DAILY WORK REPORT</h1>
          <div class="sub-title">${companyName} • Construction & Contracting</div>
        </div>
        <div class="report-meta">
          <span class="meta-item"><strong>Period:</strong> ${filteredData.startDate} to ${filteredData.endDate}</span>
          <span class="meta-item"><strong>Total Days:</strong> ${filteredData.totals.totalDays}</span>
          <span class="meta-item"><strong>Total Entries:</strong> ${filteredData.totals.entryCount}</span>
          <span class="meta-item"><strong>Generated:</strong> ${new Date().toLocaleString()}</span>
        </div>

        <!-- Executive Summary -->
        <div class="report-section">
          <h2>📊 Executive Summary</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">Total Revenue</div>
              <div class="value positive">${Utils.formatCurrencyShort(filteredData.totals.revenue)}</div>
            </div>
            <div class="summary-card">
              <div class="label">Total Labour</div>
              <div class="value">${Utils.formatCurrencyShort(filteredData.totals.labour)}</div>
            </div>
            <div class="summary-card">
              <div class="label">Total Overhead</div>
              <div class="value">${Utils.formatCurrencyShort(filteredData.totals.overhead)}</div>
            </div>
            <div class="summary-card">
              <div class="label">Net Profit</div>
              <div class="value ${filteredData.totals.profit >= 0 ? 'positive' : 'negative'}">${Utils.formatCurrencyShort(filteredData.totals.profit)}</div>
            </div>
          </div>
        </div>

        <!-- Daily Breakdown -->
        <div class="report-section">
          <h2>📈 Daily Breakdown</h2>
          <table class="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th class="text-right">Entries</th>
                <th class="text-right">Revenue</th>
                <th class="text-right">Labour</th>
                <th class="text-right">Overhead</th>
                <th class="text-right">One-Time</th>
                <th class="text-right">Profit</th>
                <th class="text-center">Workers</th>
                <th class="text-right">Hours</th>
              </tr>
            </thead>
            <tbody>
              ${dailyAggregates.length === 0 ? `
                <tr><td colspan="10" class="no-data">No data for this period</td></tr>
              ` : dailyAggregates.map((day, i) => `
                <tr>
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
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2"><strong>TOTALS</strong></td>
                <td class="text-right"><strong>${filteredData.totals.entryCount}</strong></td>
                <td class="text-right amount positive"><strong>${Utils.formatCurrencyShort(filteredData.totals.revenue)}</strong></td>
                <td class="text-right amount"><strong>${Utils.formatCurrencyShort(filteredData.totals.labour)}</strong></td>
                <td class="text-right amount"><strong>${Utils.formatCurrencyShort(filteredData.totals.overhead)}</strong></td>
                <td class="text-right amount"><strong>${Utils.formatCurrencyShort(filteredData.totals.oneTime)}</strong></td>
                <td class="text-right amount ${filteredData.totals.profit >= 0 ? 'positive' : 'negative'}"><strong>${Utils.formatCurrencyShort(filteredData.totals.profit)}</strong></td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Site Performance -->
        <div class="report-section">
          <h2>🏗️ Site Performance</h2>
          <table class="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Site</th>
                <th class="text-right">Entries</th>
                <th class="text-right">Revenue</th>
                <th class="text-right">Labour</th>
                <th class="text-right">Overhead</th>
                <th class="text-right">One-Time</th>
                <th class="text-right">Profit</th>
              </tr>
            </thead>
            <tbody>
              ${siteSummary.length === 0 ? `
                <tr><td colspan="8" class="no-data">No site data for this period</td></tr>
              ` : siteSummary.map((site, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${site.name}</td>
                  <td class="text-right">${site.entryCount}</td>
                  <td class="text-right amount positive">${Utils.formatCurrencyShort(site.revenue)}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(site.labour)}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(site.overhead)}</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(site.oneTime)}</td>
                  <td class="text-right amount ${site.profit >= 0 ? 'positive' : 'negative'}">${Utils.formatCurrencyShort(site.profit)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Worker Summary -->
        <div class="report-section">
          <h2>👷 Worker Summary</h2>
          <table class="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Worker</th>
                <th>Role</th>
                <th class="text-right">Daily Rate</th>
                <th class="text-right">Days Present</th>
                <th class="text-right">Total Hours</th>
                <th class="text-right">Total Wage</th>
              </tr>
            </thead>
            <tbody>
              ${workerSummary.length === 0 ? `
                <tr><td colspan="7" class="no-data">No worker data for this period</td></tr>
              ` : workerSummary.map((w, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${w.name}</td>
                  <td>${w.role || '-'}</td>
                  <td class="text-right">${Utils.formatCurrency(w.dailyRate)}</td>
                  <td class="text-right">${w.daysPresent}</td>
                  <td class="text-right">${w.totalHours.toFixed(1)}h</td>
                  <td class="text-right amount">${Utils.formatCurrencyShort(w.totalWage)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="report-footer-section">
        <div class="report-footer-img"><img src="${letterheadFooter}" alt="Footer" /></div>
      </div>
    </div>
  </div>
  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>
    `;
  };

  // ============================================
  // PRINT PROFESSIONAL REPORT
  // ============================================
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }
    const printHTML = generateProfessionalReportHTML();
    printWindow.document.write(printHTML);
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
      value: Utils.formatCurrencyShort(filteredData.totals.revenue),
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.12)',
      trend: filteredData.totals.revenue > 0 ? 'up' : 'neutral'
    },
    { 
      id: 'profit', 
      icon: TrendingUp, 
      label: 'Net Profit', 
      value: Utils.formatCurrencyShort(filteredData.totals.profit),
      color: filteredData.totals.profit >= 0 ? '#22c55e' : '#ef4444',
      bg: filteredData.totals.profit >= 0 ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
      trend: filteredData.totals.profit >= 0 ? 'up' : 'down'
    },
    { 
      id: 'labour', 
      icon: Users, 
      label: 'Labour Costs', 
      value: Utils.formatCurrencyShort(filteredData.totals.labour),
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      trend: 'neutral'
    },
    { 
      id: 'sites', 
      icon: Building2, 
      label: 'Active Sites', 
      value: data.sites?.length || 0,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
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
  // RENDER STATS
  // ============================================
  const renderStats = () => {
    return (
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
    );
  };

  // ============================================
  // RENDER SCREEN REPORT (Simple Preview)
  // ============================================
  const renderScreenReport = () => {
    return (
      <div className="report-content" id="report-content">
        {/* Header */}
        <div className="report-header">
          <div className="report-logo">
            <HardHat size={40} />
            <div>
              <h1>{CONFIG.COMPANY_NAME}</h1>
              <p>Construction & Contracting</p>
            </div>
          </div>
          <div className="report-title">
            <h2>DAILY WORK REPORT</h2>
            <p>Period: {filteredData.startDate} to {filteredData.endDate}</p>
            <p>Generated: {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="report-section">
          <h3>📊 Executive Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="label">Period</span>
              <span className="value">
                {dateRange.type === 'single' 
                  ? Utils.formatDate(reportDate)
                  : `${Utils.formatDate(filteredData.startDate)} - ${Utils.formatDate(filteredData.endDate)}`
                }
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Total Days</span>
              <span className="value">{filteredData.totals.totalDays}</span>
            </div>
            <div className="summary-item">
              <span className="label">Total Entries</span>
              <span className="value">{filteredData.totals.entryCount}</span>
            </div>
            <div className="summary-item">
              <span className="label">Total Revenue</span>
              <span className="value">{Utils.formatCurrency(filteredData.totals.revenue)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Total Labour</span>
              <span className="value">{Utils.formatCurrency(filteredData.totals.labour)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Total Overhead</span>
              <span className="value">{Utils.formatCurrency(filteredData.totals.overhead)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Total One-Time</span>
              <span className="value">{Utils.formatCurrency(filteredData.totals.oneTime)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Net Profit</span>
              <span className={`value ${filteredData.totals.profit >= 0 ? 'positive' : 'negative'}`}>
                {Utils.formatCurrency(filteredData.totals.profit)}
              </span>
            </div>
          </div>
        </div>

        {/* Daily Breakdown */}
        <div className="report-section">
          <h3>📈 Daily Breakdown</h3>
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Entries</th>
                  <th>Revenue</th>
                  <th>Labour</th>
                  <th>Overhead</th>
                  <th>One-Time</th>
                  <th>Profit</th>
                  <th>Workers</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.dailyAggregates.map((day, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{Utils.formatDate(day.date)}</td>
                    <td>{day.entryCount}</td>
                    <td className="amount">{Utils.formatCurrency(day.revenue)}</td>
                    <td className="amount">{Utils.formatCurrency(day.labour)}</td>
                    <td className="amount">{Utils.formatCurrency(day.overhead)}</td>
                    <td className="amount">{Utils.formatCurrency(day.oneTime)}</td>
                    <td className={`amount ${day.profit >= 0 ? 'positive' : 'negative'}`}>
                      {Utils.formatCurrency(day.profit)}
                    </td>
                    <td>{day.workersPresent}</td>
                    <td>{day.totalHours.toFixed(1)}h</td>
                  </tr>
                ))}
                {filteredData.dailyAggregates.length === 0 && (
                  <tr>
                    <td colSpan="10" className="no-data">No data for this period</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2"><strong>TOTALS</strong></td>
                  <td><strong>{filteredData.totals.entryCount}</strong></td>
                  <td className="amount"><strong>{Utils.formatCurrency(filteredData.totals.revenue)}</strong></td>
                  <td className="amount"><strong>{Utils.formatCurrency(filteredData.totals.labour)}</strong></td>
                  <td className="amount"><strong>{Utils.formatCurrency(filteredData.totals.overhead)}</strong></td>
                  <td className="amount"><strong>{Utils.formatCurrency(filteredData.totals.oneTime)}</strong></td>
                  <td className={`amount ${filteredData.totals.profit >= 0 ? 'positive' : 'negative'}`}>
                    <strong>{Utils.formatCurrency(filteredData.totals.profit)}</strong>
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Site Performance */}
        <div className="report-section">
          <h3>🏗️ Site Performance</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Site</th>
                <th>Entries</th>
                <th>Revenue</th>
                <th>Labour</th>
                <th>Overhead</th>
                <th>One-Time</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.siteSummary.map((site, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{site.name}</td>
                  <td>{site.entryCount}</td>
                  <td className="amount">{Utils.formatCurrency(site.revenue)}</td>
                  <td className="amount">{Utils.formatCurrency(site.labour)}</td>
                  <td className="amount">{Utils.formatCurrency(site.overhead)}</td>
                  <td className="amount">{Utils.formatCurrency(site.oneTime)}</td>
                  <td className={`amount ${site.profit >= 0 ? 'positive' : 'negative'}`}>
                    {Utils.formatCurrency(site.profit)}
                  </td>
                </tr>
              ))}
              {filteredData.siteSummary.length === 0 && (
                <tr>
                  <td colSpan="8" className="no-data">No site data for this period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Worker Summary */}
        <div className="report-section">
          <h3>👷 Worker Summary</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Worker</th>
                <th>Role</th>
                <th>Daily Rate</th>
                <th>Days Present</th>
                <th>Total Hours</th>
                <th>Total Wage</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.workerSummary.map((w, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{w.name}</td>
                  <td>{w.role || '-'}</td>
                  <td>{Utils.formatCurrency(w.dailyRate)}</td>
                  <td>{w.daysPresent}</td>
                  <td>{w.totalHours.toFixed(1)}h</td>
                  <td className="amount">{Utils.formatCurrency(w.totalWage)}</td>
                </tr>
              ))}
              {filteredData.workerSummary.length === 0 && (
                <tr>
                  <td colSpan="7" className="no-data">No worker data for this period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Report Footer */}
        <div className="report-footer">
          <p>Report generated by Haji Younas Contracting Management System</p>
          <p>Version {CONFIG.VERSION} | {new Date().toLocaleString()}</p>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  if (!showReport) {
    return (
      <div className="daily-report-modern">
        {/* Header */}
        <div className="dashboard-header-modern">
          <div className="header-left">
            <div className="header-icon-wrapper">
              <FileText size={28} />
              <span className="header-badge">Reports</span>
            </div>
            <div>
              <h2>Daily/Periodic Report</h2>
              <p className="header-subtitle">Generate comprehensive reports for any date range</p>
            </div>
          </div>
          <div className="header-right">
            <button className="btn-refresh-modern" onClick={() => window.location.reload()}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* Report Controls */}
        <div className="report-controls">
          {/* Date Range Presets */}
          <div className="date-range-presets">
            <label>📅 Quick Select:</label>
            <div className="preset-buttons">
              {datePresets.map(preset => (
                <button
                  key={preset.id}
                  className={`preset-btn ${dateRange.type === preset.id ? 'active' : ''}`}
                  onClick={() => handleDateRangeChange(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="custom-date-range">
            <label>📆 Custom Range:</label>
            <div className="custom-range-inputs">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
              <span>to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
              <button 
                className="btn-primary"
                onClick={handleCustomDateRange}
              >
                Apply Range
              </button>
            </div>
          </div>

          {/* Single Date Selector */}
          <div className="single-date-selector">
            <label>📅 Single Date:</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
            <button
              className="btn-primary"
              onClick={() => {
                setDateRange({ type: 'single', startDate: reportDate, endDate: reportDate });
                setShowReport(true);
              }}
            >
              <FileText size={16} /> Generate Report
            </button>
          </div>
        </div>

        {/* Preview Stats */}
        {renderStats()}
        {renderTooltip()}

        <div className="report-preview">
          <div className="preview-stats">
            <div className="preview-stat">
              <span className="label">Selected Range:</span>
              <span className="value">
                {dateRange.type === 'single' 
                  ? Utils.formatDate(reportDate)
                  : `${Utils.formatDate(dateRange.startDate)} - ${Utils.formatDate(dateRange.endDate)}`
                }
              </span>
            </div>
            <div className="preview-stat">
              <span className="label">Total Entries:</span>
              <span className="value">{filteredData.totals.entryCount}</span>
            </div>
            <div className="preview-stat">
              <span className="label">Total Revenue:</span>
              <span className="value">{Utils.formatCurrency(filteredData.totals.revenue)}</span>
            </div>
            <div className="preview-stat">
              <span className="label">Net Profit:</span>
              <span className={`value ${filteredData.totals.profit >= 0 ? 'positive' : 'negative'}`}>
                {Utils.formatCurrency(filteredData.totals.profit)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-report-modern">
      {/* Report Controls */}
      <div className="report-controls">
        <div className="report-info">
          <h3>
            📊 Report: {dateRange.type === 'single' 
              ? Utils.formatDate(reportDate)
              : `${Utils.formatDate(filteredData.startDate)} - ${Utils.formatDate(filteredData.endDate)}`
            }
          </h3>
          <span className="report-days">{filteredData.totals.totalDays} days</span>
        </div>
        <div className="report-actions">
          <button className="btn-primary" onClick={exportDailyReport}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn-primary" onClick={handlePrintReport}>
            <Printer size={16} /> Print / PDF
          </button>
          <button className="btn-secondary" onClick={() => setShowReport(false)}>
            <X size={16} /> Close
          </button>
        </div>
      </div>

      {/* Screen Report (Simple Preview) */}
      {renderScreenReport()}
    </div>
  );
};

export default DailyReportComponent;