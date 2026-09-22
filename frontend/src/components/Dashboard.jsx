// src/components/DashboardComponent.jsx
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Download,
  TrendingDown,
  Filter,
  RefreshCw,
  Wallet,
  Printer,
  X,
  Sparkles,
  Activity,
  Zap,
  Target,
  Award,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Layers,
  Gauge,
  Flame,
  Crown,
  Rocket,
  LineChart as LineChartIcon
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
  ResponsiveContainer,
  ComposedChart,
  Area
} from 'recharts';
import * as XLSX from 'xlsx';
import Utils from '../utils/Utils';
import { CONFIG } from '../config/constants';
import './Dashboard.css';
import letterheadHeader from '../assets/letterhead-header.png';
import letterheadFooter from '../assets/letterhead-footer.png';
import background from '../assets/background.png';

// ============================================
// DATE NORMALIZER
// ============================================
const normDate = (d) => {
  if (!d) return '';
  if (typeof d === 'string') return d.length > 10 ? d.slice(0, 10) : d;
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch { return ''; }
};

// ============================================
// ANIMATED NUMBER
// ============================================
const AnimatedNumber = ({ value, decimals = 0, prefix = '', suffix = '', duration = 700 }) => {
  const [display, setDisplay] = useState(value || 0);
  const prevRef = useRef(value || 0);
  const frameRef = useRef(null);

  useEffect(() => {
    const start = prevRef.current || 0;
    const end = Number(value) || 0;
    const diff = end - start;
    const startTime = performance.now();

    if (diff === 0) {
      setDisplay(end);
      return;
    }

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + diff * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => frameRef.current && cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  const formatted = Number(display).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return <>{prefix}{formatted}{suffix}</>;
};

// ============================================
// ⭐ NON-LABOUR EXPENSES — the 6 categories that come from entries
// ============================================
const getNonLabourExpenses = (entry) => {
  if (!entry) return 0;
  return (
    (Number(entry.overhead) || 0) +
    (Number(entry.oneTime) || 0) +
    (Number(entry.materialCost) || 0) +
    (Number(entry.equipmentCost) || 0) +
    (Number(entry.transportCost) || 0) +
    (Number(entry.otherExpense) || 0)
  );
};

// Legacy helper kept for backward compatibility
const getAllExpenses = (entry) => {
  if (!entry) return 0;
  return (
    (Number(entry.labour) || 0) +
    (Number(entry.overhead) || 0) +
    (Number(entry.oneTime) || 0) +
    (Number(entry.materialCost) || 0) +
    (Number(entry.equipmentCost) || 0) +
    (Number(entry.transportCost) || 0) +
    (Number(entry.otherExpense) || 0)
  );
};

// ============================================
// ⭐ ATTENDANCE HOURS — single source of truth
// ============================================
const getAttendanceHours = (record) => {
  if (!record) return 0;

  if (typeof record.totalHours === 'number' && record.totalHours > 0) {
    return record.totalHours;
  }

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

// ============================================
// ⭐ RESOLVE HOURLY RATE
// Prefer worker.hourlyRate, else dailyRate / 8
// ============================================
const resolveHourlyRate = (worker) => {
  if (!worker) return 0;
  const h = Number(worker.hourlyRate);
  if (h && h > 0) return h;
  const d = Number(worker.dailyRate);
  if (d && d > 0) return d / 8;
  return 0;
};

// ============================================
// ⭐ COMPUTE ATTENDANCE WAGE (parent record)
// ============================================
const computeAttendanceWage = (record, worker) => {
  if (!record || !worker) return 0;

  const hourlyRate = resolveHourlyRate(worker);
  if (!hourlyRate) return 0;

  const normalHours = Number(record.normalHours);
  const overtimeHours = Number(record.overtimeHours);

  const fallbackHours = getAttendanceHours(record);

  const nHours = Number.isFinite(normalHours) && normalHours >= 0 ? normalHours : fallbackHours;
  const oHours = Number.isFinite(overtimeHours) && overtimeHours > 0 ? overtimeHours : 0;

  const otEnabled = record.overtimeEnabled !== false;
  const otRate = 1.0;

  const normalPay = nHours * hourlyRate;
  const otPay = otEnabled ? oHours * hourlyRate * otRate : 0;

  return normalPay + otPay;
};

// ============================================
// ⭐ COMPUTE SHIFT WAGE (single shift)
// Used for multi-site days to split wages per site
// ============================================
const computeShiftWage = (shift, worker) => {
  if (!shift || !worker) return 0;

  const hourlyRate = resolveHourlyRate(worker);
  if (!hourlyRate) return 0;

  const ci = shift.checkedIn || shift.checked_in;
  const co = shift.checkedOut || shift.checked_out;
  if (!ci || !co) return 0;

  const inMs = new Date(ci).getTime();
  const outMs = new Date(co).getTime();
  if (isNaN(inMs) || isNaN(outMs) || outMs <= inMs) return 0;

  let hours = (outMs - inMs) / (1000 * 60 * 60);

  const breakOn = shift.breakEnabled !== undefined
    ? shift.breakEnabled !== false
    : true;

  if (breakOn) {
    const bs = shift.breakStart || shift.break_start;
    const be = shift.breakEnd || shift.break_end;
    if (bs && be) {
      const bsMs = new Date(bs).getTime();
      const beMs = new Date(be).getTime();
      if (!isNaN(bsMs) && !isNaN(beMs) && beMs > bsMs) {
        hours -= (beMs - bsMs) / (1000 * 60 * 60);
      }
    }
  }
  hours = Math.max(0, hours);

  const shiftHours = 8;
  const otEnabled = shift.overtimeEnabled !== false;
  const otRate = 1.0;

  const normalHours = Math.min(hours, shiftHours);
  const otHours = Math.max(0, hours - shiftHours);

  return normalHours * hourlyRate + (otEnabled ? otHours * hourlyRate * otRate : 0);
};

// ============================================
// MAIN COMPONENT
// ============================================
const DashboardComponent = ({ data }) => {
  const [period, setPeriod] = useState('today');
  const [customStart, setCustomStart] = useState(Utils.today());
  const [customEnd, setCustomEnd] = useState(Utils.today());
  const [selectedSite, setSelectedSite] = useState('all');
  const [selectedWorker, setSelectedWorker] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const sitesMap = useMemo(() => {
    const m = {};
    (data.sites || []).forEach(s => { m[s.id] = s; });
    return m;
  }, [data.sites]);

  const workersMap = useMemo(() => {
    const m = {};
    (data.workers || []).forEach(w => { m[w.id] = w; });
    return m;
  }, [data.workers]);

  const sites = useMemo(() => {
    return [{ id: 'all', name: 'All Sites' }, ...(data.sites || [])];
  }, [data.sites]);

  const workers = useMemo(() => {
    return [{ id: 'all', name: 'All Workers' }, ...(data.workers || [])];
  }, [data.workers]);

  const getDateRange = useCallback(() => {
    const today = new Date();
    const todayStr = Utils.today();
    let start = new Date(today);
    let end = new Date(today);

    switch (period) {
      case 'today':
        return { start: todayStr, end: todayStr };
      case 'yesterday': {
        start.setDate(start.getDate() - 1);
        const yStr = start.toISOString().split('T')[0];
        return { start: yStr, end: yStr };
      }
      case 'week':
        start.setDate(start.getDate() - 7);
        return { start: start.toISOString().split('T')[0], end: todayStr };
      case 'month':
        start.setDate(1);
        return { start: start.toISOString().split('T')[0], end: todayStr };
      case 'lastMonth': {
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        };
      }
      case 'year':
        start.setMonth(0, 1);
        return { start: start.toISOString().split('T')[0], end: todayStr };
      case 'lastYear': {
        start.setFullYear(start.getFullYear() - 1);
        start.setMonth(0, 1);
        end.setFullYear(end.getFullYear() - 1);
        end.setMonth(11, 31);
        return {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        };
      }
      case 'custom':
        return { start: customStart, end: customEnd };
      default:
        return { start: todayStr, end: todayStr };
    }
  }, [period, customStart, customEnd]);

  const stats = useMemo(() => {
    const range = getDateRange();
    const start = normDate(range.start);
    const end = normDate(range.end);

    let filteredEntries = (data.entries || []).filter(e => {
      const d = normDate(e.date);
      return d >= start && d <= end;
    });
    let filteredAttendance = (data.attendance || []).filter(a => {
      const d = normDate(a.date);
      return d >= start && d <= end;
    });

    if (selectedSite !== 'all') {
      filteredEntries = filteredEntries.filter(e => e.siteId === selectedSite);
      filteredAttendance = filteredAttendance.filter(a => a.siteId === selectedSite);
    }
    if (selectedWorker !== 'all') {
      filteredAttendance = filteredAttendance.filter(a => a.workerId === selectedWorker);
    }

    // ==== Workers present ====
    const totalWorkers = (data.workers || []).length;
    const presentWorkerIds = new Set(filteredAttendance.filter(a => a.present).map(a => a.workerId));
    const workersPresent = presentWorkerIds.size;

    // ⭐ Total hours
    const totalHours = filteredAttendance.reduce(
      (sum, a) => sum + getAttendanceHours(a),
      0
    );

    // ⭐ Total wages (parent record)
    const totalWages = filteredAttendance.reduce((sum, a) => {
      const worker = workersMap[a.workerId];
      if (!worker) return sum;
      return sum + computeAttendanceWage(a, worker);
    }, 0);

    // ⭐ WAGES SPLIT BY SITE — multi-shift aware
    const wagesBySite = {};
    filteredAttendance.forEach(a => {
      const worker = workersMap[a.workerId];
      if (!worker) return;

      const shifts = Array.isArray(a.shifts) ? a.shifts : [];

      if (shifts.length > 0) {
        // Multi-shift day — allocate each shift's wage to its own site
        shifts.forEach(sh => {
          const sid = sh.siteId || sh.site_id || a.siteId;
          if (!sid) return;
          const wage = computeShiftWage(sh, worker);
          wagesBySite[sid] = (wagesBySite[sid] || 0) + wage;
        });
      } else {
        // Legacy single-session
        const sid = a.siteId;
        if (!sid) return;
        const wage = computeAttendanceWage(a, worker);
        wagesBySite[sid] = (wagesBySite[sid] || 0) + wage;
      }
    });

    // ==== Revenue & expense categories from entries ====
    const totalRevenue = Utils.calculateTotal(filteredEntries, 'kamai');
    const totalLabour = totalWages;
    const totalOverhead = Utils.calculateTotal(filteredEntries, 'overhead');
    const totalOneTime = Utils.calculateTotal(filteredEntries, 'oneTime');
    const totalMaterial = Utils.calculateTotal(filteredEntries, 'materialCost');
    const totalEquipment = Utils.calculateTotal(filteredEntries, 'equipmentCost');
    const totalTransport = Utils.calculateTotal(filteredEntries, 'transportCost');
    const totalOther = Utils.calculateTotal(filteredEntries, 'otherExpense');

    const totalExpenses =
      totalWages +
      totalOverhead + totalOneTime +
      totalMaterial + totalEquipment + totalTransport + totalOther;

    const totalProfit = totalRevenue - totalExpenses;

    // ==== Daily chart data ====
    const dailyData = filteredEntries.reduce((acc, e) => {
      const dateKey = normDate(e.date);
      if (!dateKey) return acc;
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey, revenue: 0, expenses: 0, wages: 0,
          overhead: 0, oneTime: 0, material: 0, equipment: 0,
          transport: 0, other: 0, profit: 0, sites: new Set()
        };
      }
      acc[dateKey].revenue += Number(e.kamai) || 0;
      acc[dateKey].overhead += Number(e.overhead) || 0;
      acc[dateKey].oneTime += Number(e.oneTime) || 0;
      acc[dateKey].material += Number(e.materialCost) || 0;
      acc[dateKey].equipment += Number(e.equipmentCost) || 0;
      acc[dateKey].transport += Number(e.transportCost) || 0;
      acc[dateKey].other += Number(e.otherExpense) || 0;
      if (e.siteId) acc[dateKey].sites.add(e.siteId);
      return acc;
    }, {});

    filteredAttendance.forEach(a => {
      const dateKey = normDate(a.date);
      if (!dateKey) return;
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey, revenue: 0, expenses: 0, wages: 0,
          overhead: 0, oneTime: 0, material: 0, equipment: 0,
          transport: 0, other: 0, profit: 0, sites: new Set()
        };
      }
      const worker = workersMap[a.workerId];
      if (worker) {
        dailyData[dateKey].wages += computeAttendanceWage(a, worker);
      }
    });

    Object.values(dailyData).forEach(d => {
      d.expenses = d.wages + d.overhead + d.oneTime + d.material + d.equipment + d.transport + d.other;
      d.profit = d.revenue - d.expenses;
    });

    const chartData = Object.values(dailyData).map(d => ({
      ...d,
      siteCount: d.sites.size,
      sites: Array.from(d.sites)
    })).sort((a, b) => a.date.localeCompare(b.date));

    // ==== ⭐ Site performance with correct per-site labour ====
    const sitePerformanceBase = (data.sites || []).map(site => {
      const siteEntries = filteredEntries.filter(e => e.siteId === site.id);
      const revenue = Utils.calculateTotal(siteEntries, 'kamai');

      // ⭐ Labour comes from wagesBySite (multi-shift aware)
      const labour = wagesBySite[site.id] || 0;

      const overhead = Utils.calculateTotal(siteEntries, 'overhead');
      const oneTime = Utils.calculateTotal(siteEntries, 'oneTime');
      const material = Utils.calculateTotal(siteEntries, 'materialCost');
      const equipment = Utils.calculateTotal(siteEntries, 'equipmentCost');
      const transport = Utils.calculateTotal(siteEntries, 'transportCost');
      const other = Utils.calculateTotal(siteEntries, 'otherExpense');

      const expenses = labour + overhead + oneTime + material + equipment + transport + other;
      const profit = revenue - expenses;

      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      // ⭐ Present workers for this site — check both siteId AND shifts
      const siteWorkerIds = new Set();
      filteredAttendance.forEach(a => {
        if (!a.present) return;
        // Direct siteId match
        if (a.siteId === site.id) {
          siteWorkerIds.add(a.workerId);
          return;
        }
        // Multi-shift match
        const shifts = Array.isArray(a.shifts) ? a.shifts : [];
        if (shifts.some(sh => (sh.siteId || sh.site_id) === site.id)) {
          siteWorkerIds.add(a.workerId);
        }
      });

      return {
        id: site.id,
        name: site.name,
        revenue,
        labour,
        overhead,
        oneTime,
        material,
        equipment,
        transport,
        other,
        expenses,
        profit,
        entryCount: siteEntries.length,
        presentWorkers: siteWorkerIds.size,
        profitMargin,
        isUnassigned: false
      };
    });

    // Unassigned entries (no siteId)
    const unassignedEntries = filteredEntries.filter(e => !e.siteId);
    let unassignedSite = null;
    if (unassignedEntries.length > 0) {
      const uRev = Utils.calculateTotal(unassignedEntries, 'kamai');
      const unassignedAttendance = filteredAttendance.filter(a => !a.siteId);
      const uLab = unassignedAttendance.reduce((sum, a) => {
        const worker = workersMap[a.workerId];
        if (!worker) return sum;
        return sum + computeAttendanceWage(a, worker);
      }, 0);
      const uOh  = Utils.calculateTotal(unassignedEntries, 'overhead');
      const uOt  = Utils.calculateTotal(unassignedEntries, 'oneTime');
      const uMat = Utils.calculateTotal(unassignedEntries, 'materialCost');
      const uEqp = Utils.calculateTotal(unassignedEntries, 'equipmentCost');
      const uTrn = Utils.calculateTotal(unassignedEntries, 'transportCost');
      const uOth = Utils.calculateTotal(unassignedEntries, 'otherExpense');
      const uExp = uLab + uOh + uOt + uMat + uEqp + uTrn + uOth;
      const uProfit = uRev - uExp;

      unassignedSite = {
        id: '__unassigned__',
        name: 'Unassigned (No Site)',
        revenue: uRev,
        labour: uLab,
        overhead: uOh,
        oneTime: uOt,
        material: uMat,
        equipment: uEqp,
        transport: uTrn,
        other: uOth,
        expenses: uExp,
        profit: uProfit,
        entryCount: unassignedEntries.length,
        presentWorkers: 0,
        profitMargin: uRev > 0 ? (uProfit / uRev) * 100 : 0,
        isUnassigned: true
      };
    }

    const sitePerformance = [...sitePerformanceBase, ...(unassignedSite ? [unassignedSite] : [])]
      .sort((a, b) => b.revenue - a.revenue || b.profit - a.profit);

    // ==== Expense breakdown ====
    const expenseBreakdown = [
      { name: 'Labour', value: totalWages },
      { name: 'Overhead', value: totalOverhead },
      { name: 'One-Time', value: totalOneTime },
      { name: 'Material', value: totalMaterial },
      { name: 'Equipment', value: totalEquipment },
      { name: 'Transport', value: totalTransport },
      { name: 'Other', value: totalOther }
    ].filter(e => e.value > 0);

    const COLORS = ['#0ea5e9', '#f43f5e', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899', '#6366f1'];

    // ==== Month over month ====
    const monthComparison = (() => {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const getMonthData = (month, year) => {
        const mEntries = (data.entries || []).filter(e => {
          const d = new Date(e.date);
          return d.getMonth() === month && d.getFullYear() === year;
        });
        const mAttendance = (data.attendance || []).filter(a => {
          const d = new Date(a.date);
          return d.getMonth() === month && d.getFullYear() === year;
        });

        const revenue = mEntries.reduce((s, e) => s + (Number(e.kamai) || 0), 0);
        const wages = mAttendance.reduce((s, a) => {
          const worker = workersMap[a.workerId];
          if (!worker) return s;
          return s + computeAttendanceWage(a, worker);
        }, 0);
        const nonLabourExpenses = mEntries.reduce((s, e) => s + getNonLabourExpenses(e), 0);
        const expenses = wages + nonLabourExpenses;
        const profit = revenue - expenses;
        return { revenue, expenses, profit, count: mEntries.length };
      };

      const current = getMonthData(currentMonth, currentYear);
      const previous = getMonthData(currentMonth - 1, currentYear);
      const profitChange = previous.profit !== 0
        ? ((current.profit - previous.profit) / Math.abs(previous.profit)) * 100
        : 0;

      return { current, previous, profitChange, isUp: current.profit >= previous.profit };
    })();

    const selectedWorkerDetails = selectedWorker !== 'all'
      ? (data.workers || []).find(w => w.id === selectedWorker) : null;
    const selectedSiteDetails = selectedSite !== 'all'
      ? (data.sites || []).find(s => s.id === selectedSite) : null;

    const chartDataForReport = chartData.map(d => ({
      ...d,
      siteNames: d.sites.map(id => sitesMap[id]?.name).filter(Boolean)
    }));

    const topSite = sitePerformance[0] || null;

    return {
      period, startDate: start, endDate: end,
      totalRevenue,
      totalLabour, totalOverhead, totalOneTime,
      totalMaterial, totalEquipment, totalTransport, totalOther,
      totalExpenses, totalProfit,
      totalWorkers, workersPresent, totalHours, totalWages,
      entryCount: filteredEntries.length,
      attendanceCount: filteredAttendance.length,
      chartData, chartDataForReport, sitePerformance, expenseBreakdown, COLORS,
      monthComparison,
      hasData: filteredEntries.length > 0 || filteredAttendance.length > 0,
      isProfit: totalProfit >= 0,
      selectedWorkerDetails, selectedSiteDetails,
      topSite
    };
  }, [data, period, customStart, customEnd, selectedSite, selectedWorker, getDateRange, sitesMap, workersMap]);

  const handleCardHover = (cardId, event) => {
    setHoveredCard(cardId);
    setTooltipPosition({ x: event.clientX + 15, y: event.clientY - 10 });
  };

  const handleCardLeave = () => setHoveredCard(null);

  const exportDashboardReport = () => {
    const wb = XLSX.utils.book_new();
    const summaryData = [
      [`${CONFIG.COMPANY_NAME} - DASHBOARD REPORT`],
      [`Period: ${stats.startDate} to ${stats.endDate}`],
      ['Generated:', new Date().toLocaleString()],
      [],
      ['=== FINANCIAL SUMMARY ==='],
      ['Metric', 'Amount (BD)'],
      ['Total Revenue', stats.totalRevenue],
      ['Labour (Wages)', stats.totalLabour],
      ['Total Overhead', stats.totalOverhead],
      ['Total One-Time', stats.totalOneTime],
      ['Total Material', stats.totalMaterial],
      ['Total Equipment', stats.totalEquipment],
      ['Total Transport', stats.totalTransport],
      ['Total Other', stats.totalOther],
      ['Total Expenses', stats.totalExpenses],
      ['Net Profit', stats.totalProfit],
      ['Total Entries', stats.entryCount],
      ['Workers Present', stats.workersPresent],
      ['Total Hours', stats.totalHours],
      ['Total Wages', stats.totalWages]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      stats.sitePerformance.map(s => ({
        Site: s.name,
        Revenue: s.revenue,
        'Labour (Wages)': s.labour,
        Overhead: s.overhead,
        'One-Time': s.oneTime,
        Material: s.material,
        Equipment: s.equipment,
        Transport: s.transport,
        Other: s.other,
        'Total Expenses': s.expenses,
        Profit: s.profit,
        Margin: s.profitMargin,
        Entries: s.entryCount,
        'Workers Present': s.presentWorkers
      }))
    ), 'Sites');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      stats.chartDataForReport.map(d => ({
        Date: d.date,
        Revenue: d.revenue,
        'Labour (Wages)': d.wages,
        Overhead: d.overhead,
        'One-Time': d.oneTime,
        Material: d.material,
        Equipment: d.equipment,
        Transport: d.transport,
        Other: d.other,
        'Total Expenses': d.expenses,
        Profit: d.profit,
        Sites: (d.siteNames || []).join(', ')
      }))
    ), 'Daily');

    XLSX.writeFile(wb, `dashboard_${stats.startDate}_to_${stats.endDate}.xlsx`);
  };

  const clearFilters = () => {
    setSelectedSite('all');
    setSelectedWorker('all');
  };

  const hasActiveFilters = selectedSite !== 'all' || selectedWorker !== 'all';

  const periodButtons = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'lastMonth', label: 'Last Month' },
    { id: 'year', label: 'Year' },
    { id: 'lastYear', label: 'Last Year' },
    { id: 'custom', label: 'Custom' }
  ];

  const cardDetails = {
    revenue: {
      title: 'Total Revenue',
      details: [
        { label: 'Total Revenue', value: Utils.formatCurrency(stats.totalRevenue) },
        { label: 'Entries Count', value: stats.entryCount },
        { label: 'Period', value: `${stats.startDate} to ${stats.endDate}` }
      ]
    },
    profit: {
      title: 'Net Profit',
      details: [
        { label: 'Net Profit', value: Utils.formatCurrency(stats.totalProfit) },
        { label: 'Revenue', value: Utils.formatCurrency(stats.totalRevenue) },
        { label: 'Labour (Wages)', value: Utils.formatCurrency(stats.totalLabour) },
        { label: 'Other Expenses', value: Utils.formatCurrency(stats.totalExpenses - stats.totalLabour) },
        { label: 'Total Expenses', value: Utils.formatCurrency(stats.totalExpenses) },
        { label: 'Profit Margin', value: stats.totalRevenue > 0 ? ((stats.totalProfit / stats.totalRevenue) * 100).toFixed(2) + '%' : '0%' }
      ]
    },
    workers: {
      title: 'Active Workers',
      details: [
        { label: 'Present', value: stats.workersPresent },
        { label: 'Total Workers', value: stats.totalWorkers },
        { label: 'Attendance Rate', value: stats.totalWorkers > 0 ? ((stats.workersPresent / stats.totalWorkers) * 100).toFixed(1) + '%' : '0%' },
        { label: 'Hours Worked', value: stats.totalHours.toFixed(1) + 'h' }
      ]
    },
    hours: {
      title: 'Total Hours',
      details: [
        { label: 'Total Hours', value: stats.totalHours.toFixed(1) + 'h' },
        { label: 'Active Workers', value: stats.workersPresent },
        { label: 'Avg Hours/Worker', value: stats.workersPresent > 0 ? (stats.totalHours / stats.workersPresent).toFixed(1) + 'h' : '0h' }
      ]
    },
    entries: {
      title: 'Total Entries',
      details: [
        { label: 'Total Entries', value: stats.entryCount },
        { label: 'Attendance Records', value: stats.attendanceCount },
        { label: 'Active Sites', value: stats.sitePerformance.filter(s => s.entryCount > 0).length }
      ]
    },
    wages: {
      title: 'Total Wages',
      details: [
        { label: 'Total Wages', value: Utils.formatCurrency(stats.totalWages) },
        { label: 'Active Workers', value: stats.workersPresent },
        { label: 'Avg Wage/Worker', value: stats.workersPresent > 0 ? Utils.formatCurrency(stats.totalWages / stats.workersPresent) : Utils.formatCurrency(0) }
      ]
    }
  };

  const generateReportHTML = () => {
    const primary = '#1a3c6e';
    const secondary = '#c9a84c';
    const light = '#e8edf3';
    const muted = '#6a6a8a';
    const border = '#d4d9e0';
    const text = '#1a1a2e';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dashboard Report</title>
  <style>
    * { margin: 0 !important; padding: 0 !important; border: 0 !important; box-sizing: border-box !important; }
    html, body { width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; background: #ffffff !important; font-family: 'Times New Roman', Arial, serif !important; color: ${text} !important; }
    .report-container { width: 100% !important; margin: 0 !important; padding: 0 !important; display: flex !important; flex-direction: column !important; min-height: 100vh !important; position: relative !important; }
    .report-background { position: fixed !important; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; display: flex; justify-content: center; align-items: center; opacity: 0.06 !important; }
    .report-background img { width: 70% !important; max-width: 600px !important; }
    .report-content-wrapper { position: relative !important; z-index: 1 !important; display: flex !important; flex-direction: column !important; min-height: 100vh !important; width: 100% !important; }
    .report-header-img img, .report-footer-img img { width: 100% !important; height: auto !important; display: block !important; }
    .report-content { flex: 1 !important; padding: 20px 40px 30px 40px !important; }
    .report-title { text-align: center !important; font-size: 20px !important; font-weight: 800 !important; color: ${primary} !important; letter-spacing: 2px !important; padding: 10px 0 !important; border-bottom: 3px solid ${secondary} !important; text-transform: uppercase !important; margin-bottom: 10px !important; }
    .report-period { text-align: center !important; font-size: 14px !important; color: ${muted} !important; margin-bottom: 16px !important; }
    .report-section { margin: 16px 0 !important; }
    .report-section-title { font-size: 14px !important; font-weight: 700 !important; color: ${primary} !important; padding: 6px 12px !important; background: ${light} !important; border-left: 4px solid ${secondary} !important; text-transform: uppercase !important; margin-bottom: 10px !important; }
    .stats-grid { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 12px !important; margin-bottom: 16px !important; }
    .stat-box { padding: 12px 16px !important; border: 1px solid ${border} !important; border-radius: 4px !important; background: #fafafa !important; }
    .stat-box .label { font-size: 11px !important; color: ${muted} !important; text-transform: uppercase !important; font-weight: 600 !important; }
    .stat-box .value { font-size: 18px !important; font-weight: 700 !important; color: ${primary} !important; margin-top: 4px !important; }
    .stat-box .value.positive { color: #009846 !important; }
    .stat-box .value.negative { color: #dc2626 !important; }
    .report-table { width: 100% !important; border-collapse: collapse !important; margin: 10px 0 !important; font-size: 12px !important; }
    .report-table thead { background: ${primary} !important; }
    .report-table th { color: #fff !important; padding: 6px 10px !important; text-align: center !important; font-size: 10px !important; text-transform: uppercase !important; font-weight: 700 !important; }
    .report-table td { padding: 5px 10px !important; border-bottom: 1px solid ${border} !important; text-align: center !important; }
    .report-table td:first-child { text-align: left !important; font-weight: 600 !important; }
    .report-table .positive { color: #009846 !important; }
    .report-table .negative { color: #dc2626 !important; }
    .report-summary { margin: 16px 0 !important; padding: 12px 20px !important; background: ${light} !important; border: 2px solid ${secondary} !important; display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
    .report-summary .row { display: flex !important; justify-content: space-between !important; padding: 4px 0 !important; font-size: 13px !important; }
    .report-summary .row .lbl { color: ${muted} !important; }
    .report-summary .row .val { font-weight: 600 !important; }
    .report-summary .grand-total { border-top: 2px solid ${secondary} !important; padding-top: 8px !important; margin-top: 4px !important; grid-column: 1 / -1 !important; }
    .report-summary .grand-total .lbl, .report-summary .grand-total .val { font-size: 18px !important; font-weight: 800 !important; color: ${primary} !important; }
    @media print {
      @page { margin: 0 !important; size: A4 !important; }
      html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .report-table thead, .report-table th, .stat-box, .report-summary { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    @media screen { .report-container { max-width: 100% !important; margin: 0 auto !important; box-shadow: 0 4px 30px rgba(0,0,0,0.12) !important; border: 1px solid ${border} !important; } }
    @media screen and (max-width: 768px) { .report-content { padding: 12px 16px !important; } .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } .report-summary { grid-template-columns: 1fr !important; } }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-background"><img src='${background}' alt="Background" /></div>
    <div class="report-content-wrapper">
      <div class="report-header-img"><img src="${letterheadHeader}" alt="Letterhead" /></div>
      <div class="report-content">
        <div class="report-title">Dashboard Report</div>
        <div class="report-period">
          Period: ${stats.startDate} to ${stats.endDate} | Generated: ${new Date().toLocaleString()}
          ${selectedSite !== 'all' ? ` | Site: ${stats.selectedSiteDetails?.name || ''}` : ''}
          ${selectedWorker !== 'all' ? ` | Worker: ${stats.selectedWorkerDetails?.name || ''}` : ''}
        </div>

        <div class="report-section">
          <div class="report-section-title">Financial Summary</div>
          <div class="stats-grid">
            <div class="stat-box"><div class="label">Total Revenue</div><div class="value positive">${Utils.formatCurrency(stats.totalRevenue)}</div></div>
            <div class="stat-box"><div class="label">Net Profit</div><div class="value ${stats.isProfit ? 'positive' : 'negative'}">${Utils.formatCurrency(stats.totalProfit)}</div></div>
            <div class="stat-box"><div class="label">Total Entries</div><div class="value">${stats.entryCount}</div></div>
            <div class="stat-box"><div class="label">Workers Present</div><div class="value">${stats.workersPresent} / ${stats.totalWorkers}</div></div>
            <div class="stat-box"><div class="label">Total Hours</div><div class="value">${stats.totalHours.toFixed(1)}h</div></div>
            <div class="stat-box"><div class="label">Total Wages</div><div class="value">${Utils.formatCurrency(stats.totalWages)}</div></div>
          </div>
        </div>

        <div class="report-section">
          <div class="report-section-title">Expense Breakdown</div>
          <div class="report-summary">
            <div class="row"><span class="lbl">Labour (Wages)</span><span class="val">${Utils.formatCurrency(stats.totalLabour)}</span></div>
            <div class="row"><span class="lbl">Overhead</span><span class="val">${Utils.formatCurrency(stats.totalOverhead)}</span></div>
            <div class="row"><span class="lbl">One-Time</span><span class="val">${Utils.formatCurrency(stats.totalOneTime)}</span></div>
            <div class="row"><span class="lbl">Material</span><span class="val">${Utils.formatCurrency(stats.totalMaterial)}</span></div>
            <div class="row"><span class="lbl">Equipment</span><span class="val">${Utils.formatCurrency(stats.totalEquipment)}</span></div>
            <div class="row"><span class="lbl">Transport</span><span class="val">${Utils.formatCurrency(stats.totalTransport)}</span></div>
            <div class="row"><span class="lbl">Other</span><span class="val">${Utils.formatCurrency(stats.totalOther)}</span></div>
            <div class="row grand-total"><span class="lbl">Total Expenses</span><span class="val">${Utils.formatCurrency(stats.totalExpenses)}</span></div>
          </div>
        </div>

        ${stats.sitePerformance.length > 0 ? `
          <div class="report-section">
            <div class="report-section-title">Site Performance</div>
            <table class="report-table">
              <thead><tr><th>#</th><th>Site</th><th>Revenue</th><th>Labour</th><th>Expenses</th><th>Profit</th><th>Margin</th><th>Present</th></tr></thead>
              <tbody>
                ${stats.sitePerformance.slice(0, 10).map((site, i) => `
                  <tr>
                    <td>${i + 1}</td><td>${site.name}</td>
                    <td>${Utils.formatCurrencyShort(site.revenue)}</td>
                    <td>${Utils.formatCurrencyShort(site.labour)}</td>
                    <td>${Utils.formatCurrencyShort(site.expenses)}</td>
                    <td class="${site.profit >= 0 ? 'positive' : 'negative'}">${Utils.formatCurrencyShort(site.profit)}</td>
                    <td>${site.profitMargin.toFixed(1)}%</td>
                    <td>${site.presentWorkers}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="report-section">
          <div class="report-section-title">Month-over-Month</div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:16px;padding:12px;background:${light};border-radius:4px;">
            <div style="text-align:center;">
              <div style="font-size:11px;color:${muted};text-transform:uppercase;">This Month</div>
              <div style="font-size:20px;font-weight:700;color:${primary};margin:4px 0;">${Utils.formatCurrency(stats.monthComparison.current.profit)}</div>
              <div style="font-size:12px;color:${muted};">Revenue: ${Utils.formatCurrency(stats.monthComparison.current.revenue)}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
              <div style="padding:4px 14px;border-radius:20px;background:${stats.monthComparison.isUp ? 'rgba(0,152,70,0.1)' : 'rgba(220,38,38,0.1)'};color:${stats.monthComparison.isUp ? '#009846' : '#dc2626'};font-weight:700;font-size:14px;">
                ${stats.monthComparison.isUp ? '↑' : '↓'} ${Math.abs(stats.monthComparison.profitChange).toFixed(1)}%
              </div>
              <div style="font-size:11px;color:${muted};margin-top:4px;">vs last month</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:11px;color:${muted};text-transform:uppercase;">Last Month</div>
              <div style="font-size:20px;font-weight:700;color:${primary};margin:4px 0;">${Utils.formatCurrency(stats.monthComparison.previous.profit)}</div>
              <div style="font-size:12px;color:${muted};">Revenue: ${Utils.formatCurrency(stats.monthComparison.previous.revenue)}</div>
            </div>
          </div>
        </div>

        ${stats.chartDataForReport.length > 0 ? `
          <div class="report-section">
            <div class="report-section-title">Daily Breakdown</div>
            <table class="report-table">
              <thead><tr><th>Date</th><th>Revenue</th><th>Labour</th><th>Expenses</th><th>Profit</th><th>Site(s)</th></tr></thead>
              <tbody>
                ${stats.chartDataForReport.slice(-10).reverse().map(d => `
                  <tr>
                    <td>${d.date}</td>
                    <td>${Utils.formatCurrencyShort(d.revenue)}</td>
                    <td>${Utils.formatCurrencyShort(d.wages)}</td>
                    <td>${Utils.formatCurrencyShort(d.expenses)}</td>
                    <td class="${d.profit >= 0 ? 'positive' : 'negative'}">${Utils.formatCurrencyShort(d.profit)}</td>
                    <td style="font-size:10px;color:${muted};">${(d.siteNames || []).join(', ') || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
      <div class="report-footer-img"><img src="${letterheadFooter}" alt="Footer" /></div>
    </div>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };<\/script>
</body>
</html>
    `;
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) { alert('Please allow popups to print'); return; }
    printWindow.document.write(generateReportHTML());
    printWindow.document.close();
    printWindow.focus();
  };

  const momUp = stats.monthComparison.isUp;

  return (
    <div className={`db-dashboard ${mounted ? 'is-mounted' : ''}`}>
      <div className="db-ambient">
        <div className="db-ambient-orb db-ambient-1" />
        <div className="db-ambient-orb db-ambient-2" />
        <div className="db-ambient-orb db-ambient-3" />
      </div>

      <div className="db-header">
        <div className="db-header-left">
          <div className="db-header-icon">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="db-title">Dashboard</h1>
            <p className="db-subtitle">
              {stats.startDate === stats.endDate ? stats.startDate : `${stats.startDate} → ${stats.endDate}`}
            </p>
          </div>
        </div>
        <div className="db-header-right">
          <button className="db-btn db-btn-ghost" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={15} />
            Filters
            {hasActiveFilters && <span className="db-btn-dot" />}
          </button>
          <button className="db-btn db-btn-ghost" onClick={() => window.location.reload()}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="db-btn db-btn-ghost" onClick={handlePrintReport}>
            <Printer size={15} /> Print
          </button>
          <button className="db-btn db-btn-primary" onClick={exportDashboardReport}>
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="db-filters">
          <div className="db-filter">
            <label>Site</label>
            <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)}>
              {sites.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div className="db-filter">
            <label>Worker</label>
            <select value={selectedWorker} onChange={(e) => setSelectedWorker(e.target.value)}>
              {workers.map(w => (<option key={w.id} value={w.id}>{w.name}</option>))}
            </select>
          </div>
          {hasActiveFilters && (
            <button className="db-btn db-btn-ghost db-filter-clear" onClick={clearFilters}>
              <X size={14} /> Clear
            </button>
          )}
        </div>
      )}

      <div className="db-periods">
        <div className="db-periods-scroll">
          {periodButtons.map(p => (
            <button
              key={p.id}
              className={`db-period-pill ${period === p.id ? 'active' : ''}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="db-custom-range">
            <Calendar size={14} />
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            <ArrowRight size={14} />
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
        )}
      </div>

      {!stats.hasData ? (
        <div className="db-empty">
          <div className="db-empty-icon">
            <Building2 size={48} />
          </div>
          <h3>No data for this period</h3>
          <p>Try a different date range or clear your filters.</p>
          <div className="db-empty-actions">
            <button className="db-btn db-btn-ghost" onClick={() => setPeriod('today')}>
              <RefreshCw size={14} /> Back to today
            </button>
            <button className="db-btn db-btn-ghost" onClick={() => setPeriod('month')}>
              <Calendar size={14} /> This month
            </button>
            {hasActiveFilters && (
              <button className="db-btn db-btn-primary" onClick={clearFilters}>
                <X size={14} /> Clear filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="db-kpi-grid">
            <div
              className="db-kpi db-kpi-revenue"
              onMouseEnter={(e) => handleCardHover('revenue', e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="db-kpi-glow" />
              <div className="db-kpi-top">
                <span className="db-kpi-label">Revenue</span>
                <span className="db-kpi-icon"><DollarSign size={18} /></span>
              </div>
              <div className="db-kpi-value">
                <AnimatedNumber value={stats.totalRevenue} decimals={3} />
              </div>
              <div className="db-kpi-meta">
                <Activity size={11} /> {stats.entryCount} entries
              </div>
            </div>

            <div
              className={`db-kpi db-kpi-profit ${stats.isProfit ? 'is-positive' : 'is-negative'}`}
              onMouseEnter={(e) => handleCardHover('profit', e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="db-kpi-glow" />
              <div className="db-kpi-top">
                <span className="db-kpi-label">Net Profit</span>
                <span className="db-kpi-icon">
                  {stats.isProfit ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                </span>
              </div>
              <div className="db-kpi-value">
                <AnimatedNumber value={stats.totalProfit} decimals={3} />
              </div>
              <div className="db-kpi-meta">
                <Gauge size={11} />
                {stats.totalRevenue > 0 ? `${((stats.totalProfit / stats.totalRevenue) * 100).toFixed(1)}% margin` : 'No revenue'}
              </div>
            </div>

            <div
              className="db-kpi db-kpi-workers"
              onMouseEnter={(e) => handleCardHover('workers', e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="db-kpi-glow" />
              <div className="db-kpi-top">
                <span className="db-kpi-label">Active Workers</span>
                <span className="db-kpi-icon"><Users size={18} /></span>
              </div>
              <div className="db-kpi-value">
                <AnimatedNumber value={stats.workersPresent} />
                <span className="db-kpi-value-sub">/ {stats.totalWorkers}</span>
              </div>
              <div className="db-kpi-progress">
                <div
                  className="db-kpi-progress-fill"
                  style={{ width: stats.totalWorkers > 0 ? `${(stats.workersPresent / stats.totalWorkers) * 100}%` : '0%' }}
                />
              </div>
            </div>

            <div
              className="db-kpi db-kpi-hours"
              onMouseEnter={(e) => handleCardHover('hours', e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="db-kpi-glow" />
              <div className="db-kpi-top">
                <span className="db-kpi-label">Total Hours</span>
                <span className="db-kpi-icon"><Clock size={18} /></span>
              </div>
              <div className="db-kpi-value">
                <AnimatedNumber value={stats.totalHours} decimals={1} />
                <span className="db-kpi-value-sub">h</span>
              </div>
              <div className="db-kpi-meta">
                <Activity size={11} />
                {stats.workersPresent > 0 ? `${(stats.totalHours / stats.workersPresent).toFixed(1)}h avg/worker` : 'No hours'}
              </div>
            </div>

            <div
              className="db-kpi db-kpi-wages"
              onMouseEnter={(e) => handleCardHover('wages', e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="db-kpi-glow" />
              <div className="db-kpi-top">
                <span className="db-kpi-label">Total Wages</span>
                <span className="db-kpi-icon"><Wallet size={18} /></span>
              </div>
              <div className="db-kpi-value">
                <AnimatedNumber value={stats.totalWages} decimals={3} />
              </div>
              <div className="db-kpi-meta">
                <Activity size={11} />
                {stats.workersPresent > 0 ? `${Utils.formatCurrency(stats.totalWages / stats.workersPresent)} avg/worker` : 'No wages'}
              </div>
            </div>

            <div
              className="db-kpi db-kpi-entries"
              onMouseEnter={(e) => handleCardHover('entries', e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="db-kpi-glow" />
              <div className="db-kpi-top">
                <span className="db-kpi-label">Entries</span>
                <span className="db-kpi-icon"><FileText size={18} /></span>
              </div>
              <div className="db-kpi-value">
                <AnimatedNumber value={stats.entryCount} />
              </div>
              <div className="db-kpi-meta">
                <Activity size={11} /> {stats.attendanceCount} attendance records
              </div>
            </div>
          </div>

          {hoveredCard && cardDetails[hoveredCard] && (
            <div
              className="db-tooltip"
              style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}
            >
              <div className="db-tooltip-header">{cardDetails[hoveredCard].title}</div>
              <div className="db-tooltip-body">
                {cardDetails[hoveredCard].details.map((d, i) => (
                  <div key={i} className="db-tooltip-row">
                    <span className="db-tooltip-label">{d.label}</span>
                    <span className="db-tooltip-value">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="db-mom">
            <div className="db-mom-cell">
              <span className="db-mom-label"><Calendar size={11} /> This month</span>
              <span className="db-mom-value">
                <AnimatedNumber value={stats.monthComparison.current.profit} decimals={3} />
              </span>
              <span className="db-mom-sub">Revenue {Utils.formatCurrency(stats.monthComparison.current.revenue)}</span>
            </div>
            <div className="db-mom-mid">
              <div className={`db-mom-badge ${momUp ? 'is-positive' : 'is-negative'}`}>
                {momUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {Math.abs(stats.monthComparison.profitChange).toFixed(1)}%
              </div>
              <span className="db-mom-vs">vs last month</span>
            </div>
            <div className="db-mom-cell">
              <span className="db-mom-label"><Calendar size={11} /> Last month</span>
              <span className="db-mom-value">
                <AnimatedNumber value={stats.monthComparison.previous.profit} decimals={3} />
              </span>
              <span className="db-mom-sub">Revenue {Utils.formatCurrency(stats.monthComparison.previous.revenue)}</span>
            </div>
          </div>

          <div className="db-charts">
            <div className="db-chart-card db-chart-main">
              <div className="db-chart-header">
                <div>
                  <h3><LineChartIcon size={16} /> Financial Overview</h3>
                  <span>Revenue, expense & profit trends</span>
                </div>
                <div className="db-chart-legend">
                  <span><i style={{ background: '#009846' }} /> Revenue</span>
                  <span><i style={{ background: '#f59e0b' }} /> Profit</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#009846" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#009846" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#fff', border: '1px solid #e5e7eb',
                      borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      fontSize: 12
                    }}
                    formatter={(value) => Utils.formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#009846" strokeWidth={2.5} fill="url(#revGrad)" name="Revenue" />
                  <Line type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} name="Profit" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="db-chart-card">
              <div className="db-chart-header">
                <div>
                  <h3><PieChartIcon size={16} /> Expense Split</h3>
                  <span>By category</span>
                </div>
              </div>
              {stats.expenseBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats.expenseBreakdown}
                      cx="50%" cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {stats.expenseBreakdown.map((entry, i) => (
                        <Cell key={i} fill={stats.COLORS[i % stats.COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#fff', border: '1px solid #e5e7eb',
                        borderRadius: '10px', fontSize: 12
                      }}
                      formatter={(value) => Utils.formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="db-chart-empty">
                  <PieChartIcon size={28} />
                  <span>No expenses</span>
                </div>
              )}
            </div>
          </div>

          <div className="db-sites">
            <div className="db-sites-header">
              <div>
                <h3><Building2 size={16} /> Site Performance</h3>
                <span>Revenue & profit by site</span>
              </div>
              <span className="db-sites-count">{stats.sitePerformance.length} sites</span>
            </div>
            <div className="db-sites-list">
              {stats.sitePerformance.slice(0, 6).map((site, i) => {
                const revPct = stats.totalRevenue > 0 ? (site.revenue / stats.totalRevenue) * 100 : 0;
                return (
                  <div
                    key={site.id}
                    className={`db-site-row ${site.isUnassigned ? 'is-unassigned' : ''}`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="db-site-rank">
                      {i === 0 ? <Crown size={14} /> : i + 1}
                    </div>
                    <div className="db-site-info">
                      <div className="db-site-name">
                        <Building2 size={14} />
                        {site.name}
                      </div>
                      <div className="db-site-meta">
                        <span>{site.entryCount} entries</span>
                        <span className={site.profit >= 0 ? 'is-positive' : 'is-negative'}>
                          {site.profitMargin.toFixed(1)}% margin
                        </span>
                        {site.presentWorkers > 0 && <span>{site.presentWorkers} present</span>}
                      </div>
                    </div>
                    <div className="db-site-values">
                      <span className="db-site-revenue">{Utils.formatCurrency(site.revenue)}</span>
                      <span className={`db-site-profit ${site.profit >= 0 ? 'is-positive' : 'is-negative'}`}>
                        {Utils.formatCurrency(site.profit)}
                      </span>
                    </div>
                    <div className="db-site-bar">
                      <div
                        className={`db-site-bar-fill ${site.profit >= 0 ? 'is-positive' : 'is-negative'}`}
                        style={{ width: `${Math.min(revPct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.sitePerformance.length === 0 && (
                <div className="db-sites-empty">
                  <Building2 size={28} />
                  <span>No site activity</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardComponent;