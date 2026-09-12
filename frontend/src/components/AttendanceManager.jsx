// src/components/AttendanceManager.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  RefreshCw, Users, UserCheck, Clock, Calendar, Users2, Building2,
  ChevronDown, ChevronUp, FileText, DollarSign, TrendingUp, TrendingDown,
  Search, Filter, Printer, ChevronRight, Eye, X, Download, User,
  Settings, Award, Briefcase, Phone, Mail, MapPin, CreditCard, Wallet,
  Receipt, AlertCircle, CheckCircle, LayoutDashboard, HardHat, Timer,
  Activity, Gauge, Sparkles, Crown, Star, ArrowUpRight, ArrowDownRight,
  Info, Zap, Shield, Plus, Edit, Trash2, Save, UserPlus, LogIn, LogOut,
  PlayCircle, StopCircle, CalendarDays, FileSpreadsheet, Package, Box,
  Layers, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon,
  ChevronLeft, ChevronsLeft, ChevronsRight, Flame, Target, Percent,
  CircleDollarSign, Minus, List
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
  LineChart, Line, Legend, ComposedChart
} from 'recharts';
import Utils from '../utils/Utils';
import './AttendanceManager.css';
import letterheadHeader from '../assets/letterhead-header.png';
import letterheadFooter from '../assets/letterhead-footer.png';
import background from '../assets/background.png';

import { CONFIG } from '../config/constants';
const API_BASE_URL = CONFIG.API_BASE || 'http://localhost:5000/api';

// ============================================
// PORTAL
// ============================================
const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

// ============================================
// CHART TOOLTIP
// ============================================
const ChartTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="am-chart-tooltip">
      {label && <div className="am-chart-tooltip-label">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="am-chart-tooltip-row">
          <span className="am-chart-tooltip-dot" style={{ background: p.color || p.fill || p.payload?.color }} />
          <span className="am-chart-tooltip-name">{p.name}</span>
          <span className="am-chart-tooltip-val">
            {formatter ? formatter(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// DATE FILTER HELPERS
// ============================================
const getDateFilterRange = (filterType) => {
  const today = new Date();
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  switch (filterType) {
    case 'today':
      return { from: fmt(today), to: fmt(today) };
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: fmt(y), to: fmt(y) };
    }
    case 'thisMonth': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: fmt(first), to: fmt(last) };
    }
    case 'lastMonth': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: fmt(first), to: fmt(last) };
    }
    default:
      return { from: fmt(today), to: fmt(today) };
  }
};

// ============================================
// MAIN COMPONENT
// ============================================
const AttendanceManager = ({ data, clockInWorker, clockOutWorker, refreshData }) => {
  const [selectedDate, setSelectedDate] = useState(Utils.today());
  const [loading, setLoading] = useState({});
  const [viewMode, setViewMode] = useState('overview'); // overview | workers | teams | reports
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamAttendance, setTeamAttendance] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamActionLoading, setTeamActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedMembers, setExpandedMembers] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const [hoveredWorker, setHoveredWorker] = useState(null);
  const [workerTooltipPos, setWorkerTooltipPos] = useState({ x: 0, y: 0 });
  const [hoveredMember, setHoveredMember] = useState(null);
  const [memberTooltipPos, setMemberTooltipPos] = useState({ x: 0, y: 0 });

  const [workerSearchTerm, setWorkerSearchTerm] = useState('');
  const [workerStatusFilter, setWorkerStatusFilter] = useState('all');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  const [showSiteModal, setShowSiteModal] = useState(false);
  const [siteModalContext, setSiteModalContext] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedReportWorkerId, setSelectedReportWorkerId] = useState('all');
  const [reportViewMode, setReportViewMode] = useState('attendance');
  const [expandedReportWorkers, setExpandedReportWorkers] = useState({});
  const [salaryReportData, setSalaryReportData] = useState(null);
  const [salaryReportLoading, setSalaryReportLoading] = useState(false);

  // ============================================
  // DATE FILTER STATE
  // ============================================
  const [activeDateFilter, setActiveDateFilter] = useState('today');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Pagination
  const [workerPage, setWorkerPage] = useState(1);
  const [workerPerPage, setWorkerPerPage] = useState(9);
  const [teamPage, setTeamPage] = useState(1);
  const [teamPerPage, setTeamPerPage] = useState(9);
  const [reportPage, setReportPage] = useState(1);
  const [reportPerPage, setReportPerPage] = useState(10);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const teams = useMemo(() => data.teams || [], [data.teams]);
  const sites = useMemo(() => data.sites || [], [data.sites]);

  const resolveSiteName = useCallback((siteId) => {
    if (!siteId) return null;
    const s = sites.find(x => x.id === siteId);
    return s?.name || null;
  }, [sites]);

  // ============================================
  // DATE FILTER HANDLERS
  // ============================================
  const handleDateFilterChange = useCallback((filterType) => {
    setActiveDateFilter(filterType);
    setShowCustomDate(filterType === 'custom');

    if (filterType !== 'custom') {
      const range = getDateFilterRange(filterType);
      setSelectedDate(range.from);
      setCustomDateFrom(range.from);
      setCustomDateTo(range.to);
    }
  }, []);

  const handleCustomDateApply = useCallback(() => {
    if (!customDateFrom || !customDateTo) return;
    if (customDateFrom > customDateTo) {
      setError('From date cannot be after To date');
      return;
    }
    setError('');
    setSelectedDate(customDateFrom);
  }, [customDateFrom, customDateTo]);

  // Get the active date range for filtering
  const activeDateRange = useMemo(() => {
    if (activeDateFilter === 'custom') {
      return { from: customDateFrom || selectedDate, to: customDateTo || selectedDate };
    }
    return getDateFilterRange(activeDateFilter);
  }, [activeDateFilter, customDateFrom, customDateTo, selectedDate]);

  // ============================================
  // LOAD SALARY REPORT
  // ============================================
  const loadSalaryReport = useCallback(async () => {
    if (!selectedMonth) return;
    setSalaryReportLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/salary-report/${selectedMonth}`, {
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load salary report');
      }
      const result = await response.json();
      setSalaryReportData(result);
    } catch (err) {
      setError(err.message);
      setSalaryReportData(null);
    } finally { setSalaryReportLoading(false); }
  }, [selectedMonth]);

  useEffect(() => {
    if (viewMode === 'reports' && reportViewMode === 'salary' && selectedMonth) {
      loadSalaryReport();
    }
  }, [viewMode, reportViewMode, selectedMonth, loadSalaryReport]);

  // ============================================
  // WORKER ATTENDANCE
  // ============================================
  const todayAttendance = useMemo(() => {
    return (data.workers || []).map(worker => {
      const record = (data.attendance || []).find(a => a.workerId === worker.id && a.date === selectedDate);
      let status = 'absent';
      let checkedInTime = null, checkedOutTime = null, hoursWorked = 0, wageEarned = 0;
      if (record) {
        checkedInTime = record.checkedIn || null;
        checkedOutTime = record.checkedOut || null;
        if (record.checkedIn && !record.checkedOut) status = 'working';
        else if (record.checkedIn && record.checkedOut) {
          status = 'completed';
          hoursWorked = Utils.calculateHoursWorked(record.checkedIn, record.checkedOut);
          wageEarned = Utils.calculateDailyWage(hoursWorked, worker.dailyRate);
        } else if (record.present) status = 'pending';
      }
      const siteId = record?.siteId || null;
      const siteName = siteId ? (resolveSiteName(siteId) || record?.siteName || null) : null;
      return {
        ...worker, record: record || null, status,
        checkedInTime, checkedOutTime, hoursWorked, wageEarned,
        present: record ? record.present : false, siteId, siteName
      };
    });
  }, [data.workers, data.attendance, selectedDate, resolveSiteName]);

  const filteredTodayAttendance = useMemo(() => {
    let list = todayAttendance;
    if (workerSearchTerm.trim()) {
      const q = workerSearchTerm.trim().toLowerCase();
      list = list.filter(w =>
        (w.name && w.name.toLowerCase().includes(q)) ||
        (w.role && w.role.toLowerCase().includes(q)) ||
        (w.siteName && w.siteName.toLowerCase().includes(q))
      );
    }
    if (workerStatusFilter !== 'all') list = list.filter(w => w.status === workerStatusFilter);
    return list;
  }, [todayAttendance, workerSearchTerm, workerStatusFilter]);

  // ============================================
  // TEAM
  // ============================================
  const filteredTeamMembers = useMemo(() => {
    const members = teamAttendance?.members || [];
    if (!memberSearchTerm.trim()) return members;
    const q = memberSearchTerm.trim().toLowerCase();
    return members.filter(m => {
      const w = m.worker || {};
      return (w.name && w.name.toLowerCase().includes(q)) ||
        (w.role && w.role.toLowerCase().includes(q)) ||
        (m.siteName && m.siteName.toLowerCase().includes(q));
    });
  }, [teamAttendance, memberSearchTerm]);

  // ============================================
  // STATS
  // ============================================
  const dayStats = useMemo(() => {
    const present = todayAttendance.filter(w => w.present);
    const working = todayAttendance.filter(w => w.status === 'working');
    const completed = todayAttendance.filter(w => w.status === 'completed');
    const absent = todayAttendance.filter(w => w.status === 'absent');
    const totalHours = todayAttendance.reduce((sum, w) => sum + w.hoursWorked, 0);
    const totalWages = todayAttendance.reduce((sum, w) => sum + w.wageEarned, 0);
    const totalWorkers = data.workers?.length || 0;
    return {
      present: present.length, working: working.length, completed: completed.length,
      absent: absent.length, totalHours, totalWages, totalWorkers,
      attendanceRate: totalWorkers > 0 ? (present.length / totalWorkers) * 100 : 0,
      avgHours: present.length > 0 ? totalHours / present.length : 0
    };
  }, [todayAttendance, data.workers]);

  // ============================================
  // CHART DATA
  // ============================================
  const statusChartData = useMemo(() => ([
    { name: 'Working', value: dayStats.working, color: '#3b82f6' },
    { name: 'Completed', value: dayStats.completed, color: '#10b981' },
    { name: 'Pending', value: todayAttendance.filter(w => w.status === 'pending').length, color: '#f59e0b' },
    { name: 'Absent', value: dayStats.absent, color: '#ef4444' }
  ].filter(d => d.value > 0)), [dayStats, todayAttendance]);

  const topWorkersChartData = useMemo(() => (
    [...todayAttendance]
      .filter(w => w.hoursWorked > 0)
      .sort((a, b) => b.hoursWorked - a.hoursWorked)
      .slice(0, 8)
      .map(w => ({
        name: w.name.length > 14 ? w.name.slice(0, 14) + '…' : w.name,
        hours: w.hoursWorked,
        wage: w.wageEarned
      }))
  ), [todayAttendance]);

  const siteBreakdown = useMemo(() => {
    const map = {};
    todayAttendance.filter(w => w.present).forEach(w => {
      const key = w.siteName || 'Unassigned';
      map[key] = (map[key] || 0) + 1;
    });
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    return Object.entries(map)
      .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [todayAttendance]);

  const roleBreakdown = useMemo(() => {
    const map = {};
    todayAttendance.filter(w => w.present).forEach(w => {
      const key = w.role || 'Unassigned';
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [todayAttendance]);

  const monthlyTrend = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short' });
      const monthAtt = (data.attendance || []).filter(a => a.date && a.date.startsWith(key));
      const present = monthAtt.filter(a => a.present).length;
      const hours = monthAtt.reduce((s, a) => s + (a.totalHours || 0), 0);
      const wages = monthAtt.reduce((s, a) => s + (a.wageEarned || 0), 0);
      months.push({ label, present, hours, wages });
    }
    return months;
  }, [data.attendance]);

  // ============================================
  // KPI
  // ============================================
  const kpiItems = [
    { id: 'present', icon: UserCheck, label: 'Present Today', value: dayStats.present,
      meta: `${dayStats.attendanceRate.toFixed(0)}% attendance`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'working', icon: Activity, label: 'Currently Working', value: dayStats.working,
      meta: `${dayStats.completed} completed`,
      color: '#3b82f6', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up' },
    { id: 'hours', icon: Timer, label: 'Total Hours',
      value: `${dayStats.totalHours.toFixed(1)}h`,
      meta: `Avg ${dayStats.avgHours.toFixed(1)}h`,
      color: '#f59e0b', accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)', trend: 'up' },
    { id: 'wages', icon: DollarSign, label: 'Total Wages',
      value: Utils.formatCurrencyShort(dayStats.totalWages),
      meta: `${dayStats.present} present`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up' },
    { id: 'absent', icon: X, label: 'Absent',
      value: dayStats.absent,
      meta: `${((dayStats.absent / (dayStats.totalWorkers || 1)) * 100).toFixed(0)}% absent`,
      color: '#ef4444', accent: 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: dayStats.absent > 0 ? 'down' : 'flat' },
    { id: 'total', icon: Users, label: 'Total Workers', value: dayStats.totalWorkers,
      meta: `${(data.teams || []).length} teams`,
      color: '#8b5cf6', accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)', trend: 'up' }
  ];

  const cardDetails = {
    present: { title: 'Present Today', details: [
      { label: 'Present', value: dayStats.present },
      { label: 'Attendance Rate', value: `${dayStats.attendanceRate.toFixed(1)}%` },
      { label: 'Total Workers', value: dayStats.totalWorkers },
      { label: 'Absent', value: dayStats.absent }
    ]},
    working: { title: 'Currently Working', details: [
      { label: 'Working', value: dayStats.working },
      { label: 'Completed', value: dayStats.completed },
      { label: 'Present', value: dayStats.present },
      { label: 'Working Rate', value: dayStats.present > 0 ? `${((dayStats.working / dayStats.present) * 100).toFixed(1)}%` : '0%' }
    ]},
    hours: { title: 'Total Hours', details: [
      { label: 'Total Hours', value: `${dayStats.totalHours.toFixed(1)}h` },
      { label: 'Avg Hours', value: `${dayStats.avgHours.toFixed(1)}h` },
      { label: 'Present', value: dayStats.present },
      { label: 'Working Now', value: dayStats.working }
    ]},
    wages: { title: 'Total Wages', details: [
      { label: 'Total Wages', value: Utils.formatCurrency(dayStats.totalWages) },
      { label: 'Avg Wage', value: dayStats.present > 0 ? Utils.formatCurrency(dayStats.totalWages / dayStats.present) : '0' },
      { label: 'Total Hours', value: `${dayStats.totalHours.toFixed(1)}h` },
      { label: 'Present', value: dayStats.present }
    ]},
    absent: { title: 'Absent', details: [
      { label: 'Absent', value: dayStats.absent },
      { label: 'Total Workers', value: dayStats.totalWorkers },
      { label: 'Absent Rate', value: `${((dayStats.absent / (dayStats.totalWorkers || 1)) * 100).toFixed(1)}%` },
      { label: 'Present', value: dayStats.present }
    ]},
    total: { title: 'Total Workers', details: [
      { label: 'Total', value: dayStats.totalWorkers },
      { label: 'Present', value: dayStats.present },
      { label: 'Absent', value: dayStats.absent },
      { label: 'Teams', value: (data.teams || []).length }
    ]}
  };

  const handleCardHover = (id, e) => {
    setHoveredCard(id);
    setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 });
  };
  const handleCardLeave = () => setHoveredCard(null);

  const handleWorkerEnter = (id, e) => { setHoveredWorker(id); setWorkerTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 }); };
  const handleWorkerMove = (e) => setWorkerTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
  const handleWorkerLeave = () => setHoveredWorker(null);
  const handleMemberEnter = (id, e) => { setHoveredMember(id); setMemberTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 }); };
  const handleMemberMove = (e) => setMemberTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
  const handleMemberLeave = () => setHoveredMember(null);

  // ============================================
  // TEAM LOAD
  // ============================================
  useEffect(() => {
    if (viewMode === 'teams' && selectedTeamId && selectedDate) loadTeamAttendance();
  }, [selectedTeamId, selectedDate, viewMode]);

  const loadTeamAttendance = async () => {
    if (!selectedTeamId) return;
    setTeamLoading(true); setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/team/${selectedTeamId}?date=${selectedDate}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to load team attendance');
      const result = await response.json();
      if (result?.members) {
        result.members = result.members.map(m => ({
          ...m,
          siteName: m.siteName || resolveSiteName(m.siteId) || resolveSiteName(m.attendance?.siteId) || null,
          siteId: m.siteId || m.attendance?.siteId || null
        }));
      }
      setTeamAttendance(result);
    } catch (err) { setError(err.message); setTeamAttendance(null); }
    finally { setTeamLoading(false); }
  };

  // ============================================
  // SITE MODAL
  // ============================================
  const openSiteModal = (context) => {
    if (!sites || sites.length === 0) { setError('No sites available. Please add a site first.'); return; }
    setSiteModalContext(context); setShowSiteModal(true);
  };
  const closeSiteModal = () => { setShowSiteModal(false); setSiteModalContext(null); };

  const handleSiteConfirm = async (siteId) => {
    const ctx = siteModalContext;
    closeSiteModal();
    if (!ctx) return;
    if (ctx.type === 'worker-clockin') await handleClockIn(ctx.workerId, siteId);
    else if (ctx.type === 'team-checkin') await handleTeamCheckInAll(siteId);
    else if (ctx.type === 'team-member-checkin') await handleTeamWorkerCheckIn(ctx.workerId, siteId);
  };

  // ============================================
  // REPORT
  // ============================================
  const attendanceReport = useMemo(() => {
    if (!selectedMonth) return null;
    const report = { month: selectedMonth, totalWorkers: 0, totalPresent: 0, totalAbsent: 0, totalHours: 0, totalOvertime: 0, totalWages: 0, workers: [] };
    let workers = data.workers || [];
    if (selectedReportWorkerId !== 'all') workers = workers.filter(w => w.id === selectedReportWorkerId);
    workers.forEach(worker => {
      const attendances = (data.attendance || []).filter(a => a.workerId === worker.id && a.date && a.date.startsWith(selectedMonth));
      const totalHours = attendances.reduce((s, a) => s + (a.totalHours || 0), 0);
      const totalOvertime = attendances.reduce((s, a) => s + (a.overtimeHours || 0), 0);
      const totalWages = attendances.reduce((s, a) => s + (a.wageEarned || 0), 0);
      const presentDays = attendances.filter(a => a.present).length;
      const totalDays = new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate();
      const workerReport = {
        worker, attendances, totalDays, presentDays, absentDays: totalDays - presentDays,
        totalHours, totalOvertime, totalWages,
        attendanceRate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
        dailyAverage: presentDays > 0 ? totalHours / presentDays : 0
      };
      report.workers.push(workerReport);
      report.totalWorkers++; report.totalPresent += presentDays;
      report.totalAbsent += workerReport.absentDays;
      report.totalHours += totalHours; report.totalOvertime += totalOvertime; report.totalWages += totalWages;
    });
    return report;
  }, [data.workers, data.attendance, selectedMonth, selectedReportWorkerId]);

  // ============================================
  // SALARY SLIP / REPORT (kept intact)
  // ============================================
  const generateSalarySlipHTML = (workerData) => {
    const worker = workerData.worker || workerData;
    const workerName = worker.name || workerData.workerName || 'Unknown';
    const workerRole = worker.role || workerData.role || 'N/A';
    const workerCpr = worker.cpr || 'N/A';
    const rate = workerData.rate || worker.hourlyRate || 0;
    const totalDays = workerData.totalDays || 0;
    const presentDays = workerData.presentDays || 0;
    const absentDays = workerData.absentDays || (totalDays - presentDays);
    const attendanceRate = workerData.attendanceRate || (totalDays > 0 ? (presentDays / totalDays) * 100 : 0);
    const totalHours = workerData.totalHours || 0;
    const overtimeHours = workerData.totalOvertime || 0;
    const basicHours = workerData.basicHours || (totalHours - overtimeHours);
    const basicSalary = workerData.basicSalary || 0;
    const overtimeSalary = workerData.overtimeSalary || 0;
    const totalSalary = workerData.totalSalary || 0;
    const loanDeductions = workerData.loans || [];
    const advanceDeductions = workerData.advances || [];
    const totalLoanDeduction = workerData.totalLoanDeduction || 0;
    const totalAdvanceDeduction = workerData.totalAdvanceDeduction || 0;
    const totalDeductions = workerData.totalDeductions || 0;
    const netSalary = workerData.netSalary || (totalSalary - totalDeductions);
    const attendances = workerData.attendances || [];
    const monthName = Utils.getMonthName(selectedMonth);
    const year = selectedMonth.split('-')[0];
    const hasLoans = loanDeductions.length > 0 || totalLoanDeduction > 0;
    const hasAdvances = advanceDeductions.length > 0 || totalAdvanceDeduction > 0;
    const primary = '#1a3c6e', secondary = '#c9a84c', light = '#e8edf3', muted = '#6a6a8a', border = '#d4d9e0', text = '#1a1a2e', danger = '#dc3545';

    let attendanceRows = '';
    if (attendances.length > 0) {
      attendanceRows = attendances.map(att => {
        const day = att.date ? new Date(att.date).getDate() : '?';
        const dateStr = att.date ? Utils.formatDate(att.date) : 'N/A';
        const normalHours = (att.totalHours || 0) - (att.overtimeHours || 0);
        const status = att.present ? 'Present' : 'Absent';
        const siteName = att.siteId ? (resolveSiteName(att.siteId) || '') : '';
        return `<tr><td>${day}</td><td>${dateStr}</td><td>${normalHours.toFixed(1)}h</td><td>${(att.overtimeHours || 0).toFixed(1)}h</td><td>${siteName}</td><td class="${att.present ? 'text-success' : 'text-danger'}">${status}</td></tr>`;
      }).join('');
    } else {
      attendanceRows = `<tr><td colspan="6" style="text-align:center;padding:10px;color:${muted};">Present: ${presentDays} | Absent: ${absentDays} | Rate: ${attendanceRate.toFixed(1)}%</td></tr>`;
    }

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Salary Slip - ${workerName}</title><style>
    * { margin:0!important; padding:0!important; box-sizing:border-box!important; }
    html,body { width:100%!important; height:100%!important; background:#fff!important; font-family:'Times New Roman',Arial,serif!important; color:${text}!important; }
    .slip-container{ width:100%!important; min-height:100vh!important; display:flex!important; flex-direction:column!important; position:relative!important; }
    .slip-background{ position:fixed!important; inset:0!important; display:flex!important; justify-content:center!important; align-items:center!important; opacity:0.08!important; z-index:0!important; }
    .slip-background img{ width:70%!important; max-width:600px!important; }
    .slip-content-wrapper{ position:relative!important; z-index:1!important; display:flex!important; flex-direction:column!important; min-height:100vh!important; width:100%!important; }
    .slip-header-img img,.slip-footer-img img{ width:100%!important; height:auto!important; display:block!important; }
    .slip-content-section{ flex:1!important; padding:8px 30px 12px 30px!important; }
    .slip-title{ text-align:center!important; font-size:20px!important; font-weight:700!important; color:${primary}!important; margin:6px 0!important; letter-spacing:2px!important; }
    .slip-divider{ border-top:2px solid ${primary}!important; margin:8px 0!important; }
    .slip-info-grid{ display:grid!important; grid-template-columns:1fr 1fr 1fr!important; gap:6px 20px!important; margin:10px 0!important; padding:12px 16px!important; background:${light}!important; border-radius:4px!important; }
    .slip-info-item{ display:flex!important; gap:6px!important; font-size:13px!important; }
    .slip-info-item .label{ color:${muted}!important; font-weight:600!important; min-width:90px!important; }
    .slip-info-item .value{ color:${text}!important; font-weight:500!important; }
    .slip-section-title{ font-size:14px!important; font-weight:700!important; color:${primary}!important; margin:10px 0 6px 0!important; padding-bottom:4px!important; border-bottom:1px solid ${border}!important; }
    .slip-table{ width:100%!important; border-collapse:collapse!important; margin:6px 0!important; font-size:12px!important; background:#fff!important; }
    .slip-table thead{ background:${primary}!important; }
    .slip-table th{ color:#fff!important; padding:6px 10px!important; text-align:center!important; font-size:11px!important; text-transform:uppercase!important; font-weight:700!important; }
    .slip-table td{ padding:5px 10px!important; border-bottom:1px solid ${border}!important; text-align:center!important; }
    .slip-table .text-success{ color:#22c55e!important; font-weight:600!important; }
    .slip-table .text-danger{ color:${danger}!important; font-weight:600!important; }
    .slip-table .text-warning{ color:#f59e0b!important; font-weight:600!important; }
    .slip-totals{ margin:10px 0 10px auto!important; padding:12px 20px!important; background:${light}!important; max-width:400px!important; border:2px solid ${secondary}!important; border-radius:4px!important; }
    .slip-total-row{ display:flex!important; justify-content:space-between!important; padding:3px 0!important; font-size:13px!important; }
    .slip-total-row .lbl{ color:${muted}!important; }
    .slip-total-row .val{ font-weight:600!important; }
    .slip-total-row.deduction .val,.slip-total-row.deduction .lbl{ color:${danger}!important; }
    .slip-grand{ border-top:2px solid ${secondary}!important; margin-top:6px!important; padding-top:8px!important; font-size:20px!important; font-weight:800!important; }
    .slip-grand .lbl,.slip-grand .val{ color:${primary}!important; }
    .slip-words{ font-size:11px!important; color:${muted}!important; font-style:italic!important; border-top:1px solid ${border}!important; margin-top:6px!important; padding-top:6px!important; text-align:center!important; }
    .slip-signature{ margin-top:16px!important; padding-top:12px!important; border-top:1px solid ${border}!important; display:flex!important; justify-content:space-between!important; }
    .slip-signature .sign-block{ text-align:center!important; }
    .slip-signature .sign-label{ font-size:11px!important; color:${muted}!important; text-transform:uppercase!important; }
    .slip-signature .sign-line{ margin-top:30px!important; border-top:1px solid ${border}!important; width:150px!important; }
    .slip-deductions-list{ margin:4px 0 8px 0!important; padding:8px 12px!important; background:#fef2f2!important; border:1px solid #fecaca!important; border-radius:4px!important; }
    .slip-deductions-list .deduction-item{ display:flex!important; justify-content:space-between!important; font-size:12px!important; padding:2px 0!important; }
    .slip-deductions-list .deduction-item .ref{ color:${muted}!important; }
    .slip-deductions-list .deduction-item .amount{ color:${danger}!important; font-weight:600!important; }
    @media print{ @page{ margin:0!important; size:A4!important; } html,body{ -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; } .slip-table thead,.slip-table th,.slip-totals,.slip-info-grid{ -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; } }
    </style></head><body>
    <div class="slip-container">
      <div class="slip-background"><img src='${background}' alt="bg" /></div>
      <div class="slip-content-wrapper">
        <div class="slip-header-img"><img src="${letterheadHeader}" alt="header" /></div>
        <div class="slip-content-section">
          <div class="slip-title">SALARY SLIP — ${monthName} ${year}</div>
          <div class="slip-divider"></div>
          <div class="slip-info-grid">
            <div class="slip-info-item"><span class="label">Employee:</span><span class="value">${workerName}</span></div>
            <div class="slip-info-item"><span class="label">Role:</span><span class="value">${workerRole}</span></div>
            <div class="slip-info-item"><span class="label">CPR:</span><span class="value">${workerCpr}</span></div>
            <div class="slip-info-item"><span class="label">Hourly Rate:</span><span class="value">${rate.toFixed(2)} BD</span></div>
            <div class="slip-info-item"><span class="label">Total Days:</span><span class="value">${totalDays}</span></div>
            <div class="slip-info-item"><span class="label">Present Days:</span><span class="value">${presentDays}</span></div>
          </div>
          <div class="slip-section-title">Attendance Summary</div>
          <table class="slip-table">
            <thead><tr><th style="text-align:left;">Description</th><th>Hours</th><th>Rate</th><th>Amount (BD)</th></tr></thead>
            <tbody>
              <tr><td style="text-align:left;">Normal Hours</td><td>${basicHours.toFixed(1)}</td><td>${rate.toFixed(2)}</td><td class="text-success">${basicSalary.toFixed(3)}</td></tr>
              <tr><td style="text-align:left;">Overtime Hours (1.5x)</td><td>${overtimeHours.toFixed(1)}</td><td>${(rate * 1.5).toFixed(2)}</td><td class="text-warning">${overtimeSalary.toFixed(3)}</td></tr>
              <tr style="font-weight:700;background:${primary}!important;color:#fff!important;"><td style="text-align:left;color:#fff!important;">Gross Salary</td><td colspan="2" style="color:#fff!important;">Total</td><td style="color:#fff!important;">${totalSalary.toFixed(3)}</td></tr>
            </tbody>
          </table>
          ${attendances && attendances.length > 0 ? `
            <div class="slip-section-title">Daily Attendance</div>
            <table class="slip-table">
              <thead><tr><th>Day</th><th>Date</th><th>Normal Hours</th><th>OT Hours</th><th>Site</th><th>Status</th></tr></thead>
              <tbody>${attendanceRows}</tbody>
            </table>
          ` : ''}
          ${hasLoans ? `<div class="slip-section-title" style="color:${danger}!important;">Loan Deductions</div><div class="slip-deductions-list">${loanDeductions.map(l => `<div class="deduction-item"><span class="ref">${l.loanNumber || l.reference || 'Loan'}</span><span class="amount">${(l.amount || 0).toFixed(3)} BD</span></div>`).join('')}${totalLoanDeduction > 0 ? `<div class="deduction-item" style="border-top:1px solid #fecaca!important;padding-top:4px!important;margin-top:4px!important;font-weight:700!important;"><span>Total Loan Deduction</span><span class="amount">${totalLoanDeduction.toFixed(3)} BD</span></div>` : ''}</div>` : ''}
          ${hasAdvances ? `<div class="slip-section-title" style="color:${danger}!important;">Advance Deductions</div><div class="slip-deductions-list">${advanceDeductions.map(a => `<div class="deduction-item"><span class="ref">${a.advanceNumber || a.reference || 'Advance'}</span><span class="amount">${(a.amount || 0).toFixed(3)} BD</span></div>`).join('')}${totalAdvanceDeduction > 0 ? `<div class="deduction-item" style="border-top:1px solid #fecaca!important;padding-top:4px!important;margin-top:4px!important;font-weight:700!important;"><span>Total Advance Deduction</span><span class="amount">${totalAdvanceDeduction.toFixed(3)} BD</span></div>` : ''}</div>` : ''}
          ${totalDeductions > 0 ? `<div class="slip-section-title" style="color:${danger}!important;">Total Deductions</div><div class="slip-deductions-list"><div class="deduction-item" style="font-weight:700!important;font-size:14px!important;"><span>Total Deductions</span><span class="amount">${totalDeductions.toFixed(3)} BD</span></div></div>` : ''}
          <div class="slip-totals">
            <div class="slip-total-row"><span class="lbl">Gross Salary:</span><span class="val">${totalSalary.toFixed(3)} BD</span></div>
            ${totalDeductions > 0 ? `<div class="slip-total-row deduction"><span class="lbl">Total Deductions:</span><span class="val">- ${totalDeductions.toFixed(3)} BD</span></div>` : ''}
            <div class="slip-total-row slip-grand"><span class="lbl">NET SALARY:</span><span class="val">${netSalary.toFixed(3)} BD</span></div>
            <div class="slip-words">${Utils.convertAmountToWords(netSalary)}</div>
          </div>
          <div class="slip-signature">
            <div class="sign-block"><div class="sign-label">Supervisor Sign</div><div class="sign-line"></div></div>
            <div class="sign-block"><div class="sign-label">Receiver Sign</div><div class="sign-line"></div></div>
          </div>
        </div>
        <div class="slip-footer-img"><img src="${letterheadFooter}" alt="footer" /></div>
      </div>
    </div>
    <script>window.onload=function(){setTimeout(function(){window.print();},500);};</script></body></html>`;
  };

  const handlePrintSalarySlip = (workerData) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) { alert('Please allow popups to print'); return; }
    printWindow.document.write(generateSalarySlipHTML(workerData));
    printWindow.document.close();
    printWindow.focus();
  };

  const generateAttendanceReportHTML = (report) => {
    const monthName = Utils.getMonthName(selectedMonth);
    const year = selectedMonth.split('-')[0];
    const primary = '#1a3c6e', secondary = '#c9a84c', light = '#e8edf3', muted = '#6a6a8a', border = '#d4d9e0', text = '#1a1a2e';
    const rows = report.workers.map((w, idx) => `
      <tr><td>${idx + 1}</td><td style="text-align:left;">${w.worker.name}</td><td>${w.worker.role || 'N/A'}</td><td>${w.totalDays}</td><td class="text-success">${w.presentDays}</td><td class="text-danger">${w.absentDays}</td><td>${w.attendanceRate.toFixed(1)}%</td><td>${w.totalHours.toFixed(1)}h</td><td>${w.totalOvertime.toFixed(1)}h</td><td class="text-success">${Utils.formatCurrency(w.totalWages)}</td></tr>
    `).join('');
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Attendance Report</title><style>
    *{margin:0!important;padding:0!important;box-sizing:border-box!important;}
    html,body{width:100%!important;background:#fff!important;font-family:'Times New Roman',Arial,serif!important;color:${text}!important;}
    .rep-container{min-height:100vh!important;display:flex!important;flex-direction:column!important;position:relative!important;}
    .rep-background{position:fixed!important;inset:0!important;display:flex!important;justify-content:center!important;align-items:center!important;opacity:0.08!important;z-index:0!important;}
    .rep-background img{width:70%!important;max-width:600px!important;}
    .rep-content-wrapper{position:relative!important;z-index:1!important;display:flex!important;flex-direction:column!important;min-height:100vh!important;}
    .rep-header-img img,.rep-footer-img img{width:100%!important;display:block!important;}
    .rep-content-section{flex:1!important;padding:8px 30px 12px 30px!important;}
    .rep-title{text-align:center!important;font-size:20px!important;font-weight:700!important;color:${primary}!important;margin:6px 0!important;letter-spacing:2px!important;}
    .rep-subtitle{text-align:center!important;font-size:14px!important;color:${muted}!important;margin-bottom:10px!important;}
    .rep-divider{border-top:2px solid ${primary}!important;margin:8px 0 12px 0!important;}
    .rep-summary-grid{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:10px!important;margin:10px 0 14px 0!important;}
    .rep-summary-card{padding:10px 14px!important;background:${light}!important;border-left:4px solid ${secondary}!important;border-radius:4px!important;}
    .rep-summary-label{font-size:11px!important;color:${muted}!important;text-transform:uppercase!important;font-weight:600!important;}
    .rep-summary-value{font-size:20px!important;font-weight:700!important;color:${primary}!important;margin-top:4px!important;}
    .rep-table{width:100%!important;border-collapse:collapse!important;margin:10px 0!important;font-size:12px!important;}
    .rep-table thead{background:${primary}!important;}
    .rep-table th{color:#fff!important;padding:8px 10px!important;text-align:center!important;font-size:11px!important;text-transform:uppercase!important;font-weight:700!important;}
    .rep-table td{padding:6px 10px!important;border-bottom:1px solid ${border}!important;text-align:center!important;}
    .rep-table tbody tr:nth-child(even){background:${light}!important;}
    .rep-table .text-success{color:#22c55e!important;font-weight:600!important;}
    .rep-table .text-danger{color:#dc3545!important;font-weight:600!important;}
    .rep-footer-img{margin-top:auto!important;}
    @media print{@page{margin:0!important;size:A4 landscape!important;}html,body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}
    </style></head><body>
    <div class="rep-container">
      <div class="rep-background"><img src='${background}' /></div>
      <div class="rep-content-wrapper">
        <div class="rep-header-img"><img src="${letterheadHeader}" /></div>
        <div class="rep-content-section">
          <div class="rep-title">ATTENDANCE REPORT</div>
          <div class="rep-subtitle">${monthName} ${year}</div>
          <div class="rep-divider"></div>
          <div class="rep-summary-grid">
            <div class="rep-summary-card"><div class="rep-summary-label">Total Workers</div><div class="rep-summary-value">${report.totalWorkers}</div></div>
            <div class="rep-summary-card"><div class="rep-summary-label">Total Present</div><div class="rep-summary-value">${report.totalPresent}</div></div>
            <div class="rep-summary-card"><div class="rep-summary-label">Total Hours</div><div class="rep-summary-value">${report.totalHours.toFixed(1)}h</div></div>
            <div class="rep-summary-card"><div class="rep-summary-label">Total Wages</div><div class="rep-summary-value">${Utils.formatCurrency(report.totalWages)}</div></div>
          </div>
          <table class="rep-table">
            <thead><tr><th>#</th><th style="text-align:left;">Worker</th><th>Role</th><th>Total Days</th><th>Present</th><th>Absent</th><th>Rate</th><th>Total Hours</th><th>OT Hours</th><th>Total Wages</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="10" style="text-align:center;padding:15px;">No data</td></tr>`}</tbody>
          </table>
        </div>
        <div class="rep-footer-img"><img src="${letterheadFooter}" /></div>
      </div>
    </div>
    <script>window.onload=function(){setTimeout(function(){window.print();},500);};</script></body></html>`;
  };

  const handlePrintAttendanceReport = (report) => {
    if (!report || report.workers.length === 0) { alert('No data to print'); return; }
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) { alert('Please allow popups to print'); return; }
    printWindow.document.write(generateAttendanceReportHTML(report));
    printWindow.document.close();
    printWindow.focus();
  };

  // ============================================
  // ACTIONS
  // ============================================
  const handleClockIn = async (workerId, siteId) => {
    setLoading(prev => ({ ...prev, [workerId]: 'clocking-in' }));
    try {
      await clockInWorker(workerId, selectedDate, siteId);
      await new Promise(r => setTimeout(r, 500));
      await refreshData();
      setLoading(prev => ({ ...prev, [workerId]: null }));
      setSuccess('Worker clocked in successfully');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) { alert('Failed: ' + err.message); setLoading(prev => ({ ...prev, [workerId]: null })); }
  };
  const handleClockOut = async (workerId) => {
    setLoading(prev => ({ ...prev, [workerId]: 'clocking-out' }));
    try {
      await clockOutWorker(workerId, selectedDate);
      await new Promise(r => setTimeout(r, 500));
      await refreshData();
      setLoading(prev => ({ ...prev, [workerId]: null }));
    } catch (err) { alert('Failed: ' + err.message); setLoading(prev => ({ ...prev, [workerId]: null })); }
  };
  const handleTeamCheckInAll = async (siteId) => {
    if (!selectedTeamId) return;
    setTeamActionLoading(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/team/${selectedTeamId}/checkin-all`, {
        method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, siteId })
      });
      if (!response.ok) throw new Error('Failed to check in team');
      setSuccess('Team checked in successfully');
      await loadTeamAttendance(); await refreshData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) { setError(err.message); }
    finally { setTeamActionLoading(false); }
  };
  const handleTeamCheckOutAll = async () => {
    if (!selectedTeamId) return;
    setTeamActionLoading(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/team/${selectedTeamId}/checkout-all`, {
        method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate })
      });
      if (!response.ok) throw new Error('Failed to check out team');
      setSuccess('Team checked out successfully');
      await loadTeamAttendance(); await refreshData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) { setError(err.message); }
    finally { setTeamActionLoading(false); }
  };
  const handleTeamWorkerCheckIn = async (workerId, siteId) => {
    setTeamActionLoading(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/checkin`, {
        method: 'POST', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId, teamId: selectedTeamId, siteId, date: selectedDate })
      });
      if (!response.ok) throw new Error('Failed to check in worker');
      setSuccess('Worker checked in successfully');
      await loadTeamAttendance(); await refreshData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) { setError(err.message); }
    finally { setTeamActionLoading(false); }
  };
  const handleTeamWorkerCheckOut = async (attendanceId) => {
    setTeamActionLoading(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/${attendanceId}/checkout`, {
        method: 'PUT', headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to check out worker');
      setSuccess('Worker checked out successfully');
      await loadTeamAttendance(); await refreshData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) { setError(err.message); }
    finally { setTeamActionLoading(false); }
  };

  const teamStats = teamAttendance ? {
    total: teamAttendance.stats?.total_members || 0,
    present: teamAttendance.stats?.present || 0,
    absent: teamAttendance.stats?.absent || 0,
    rate: teamAttendance.stats?.attendance_rate || 0,
    hours: teamAttendance.stats?.total_hours || 0,
    wages: teamAttendance.stats?.total_wages || 0
  } : null;

  const toggleMemberExpand = (id) => setExpandedMembers(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleReportExpand = (id) => setExpandedReportWorkers(prev => ({ ...prev, [id]: !prev[id] }));

  // ============================================
  // PAGINATION HELPERS
  // ============================================
  const paginate = (items, page, perPage) => {
    const total = Math.max(1, Math.ceil(items.length / perPage));
    const p = Math.max(1, Math.min(page, total));
    const start = (p - 1) * perPage;
    return { total, page: p, items: items.slice(start, start + perPage) };
  };
  const getPageNumbers = (current, total) => {
    const pages = []; const maxVisible = 5;
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const renderPaginationBar = (current, total, perPage, setPerPage, setPage, count) => {
    if (count === 0) return null;
    const startItem = (current - 1) * perPage + 1;
    const endItem = Math.min(current * perPage, count);
    return (
      <div className="am-pagination">
        <div className="am-pagination-info">
          Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of <strong>{count}</strong>
        </div>
        <div className="am-pagination-controls">
          <div className="am-pagination-items">
            <span>Show:</span>
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className="am-pagination-select">
              {[6, 9, 12, 18, 24, 48].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="am-pagination-buttons">
            <button className="am-page-btn" onClick={() => setPage(1)} disabled={current === 1}><ChevronsLeft size={13} /></button>
            <button className="am-page-btn" onClick={() => setPage(current - 1)} disabled={current === 1}><ChevronLeft size={13} /></button>
            {getPageNumbers(current, total).map(p => (
              <button key={p} className={`am-page-btn ${p === current ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="am-page-btn" onClick={() => setPage(current + 1)} disabled={current === total}><ChevronRight size={13} /></button>
            <button className="am-page-btn" onClick={() => setPage(total)} disabled={current === total}><ChevronsRight size={13} /></button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // DATE FILTER BAR
  // ============================================
  const renderDateFilterBar = () => (
    <div className="am-date-filter-bar">
      <div className="am-date-filter-buttons">
        <button
          className={`am-date-filter-btn ${activeDateFilter === 'today' ? 'active' : ''}`}
          onClick={() => handleDateFilterChange('today')}>
          <CalendarDays size={13} /> Today
        </button>
        <button
          className={`am-date-filter-btn ${activeDateFilter === 'yesterday' ? 'active' : ''}`}
          onClick={() => handleDateFilterChange('yesterday')}>
          <CalendarDays size={13} /> Yesterday
        </button>
        <button
          className={`am-date-filter-btn ${activeDateFilter === 'thisMonth' ? 'active' : ''}`}
          onClick={() => handleDateFilterChange('thisMonth')}>
          <CalendarDays size={13} /> This Month
        </button>
        <button
          className={`am-date-filter-btn ${activeDateFilter === 'lastMonth' ? 'active' : ''}`}
          onClick={() => handleDateFilterChange('lastMonth')}>
          <CalendarDays size={13} /> Last Month
        </button>
        <button
          className={`am-date-filter-btn ${activeDateFilter === 'custom' ? 'active' : ''}`}
          onClick={() => handleDateFilterChange('custom')}>
          <Filter size={13} /> Custom
        </button>
      </div>

      {showCustomDate && (
        <div className="am-custom-date-row">
          <div className="am-custom-date-field">
            <label><CalendarDays size={12} /> From:</label>
            <input
              type="date"
              value={customDateFrom}
              onChange={(e) => setCustomDateFrom(e.target.value)}
              className="am-input am-input-sm"
            />
          </div>
          <div className="am-custom-date-field">
            <label><CalendarDays size={12} /> To:</label>
            <input
              type="date"
              value={customDateTo}
              onChange={(e) => setCustomDateTo(e.target.value)}
              className="am-input am-input-sm"
            />
          </div>
          <button className="am-btn am-btn-primary am-btn-sm" onClick={handleCustomDateApply}>
            <CheckCircle size={12} /> Apply
          </button>
        </div>
      )}

      <div className="am-date-filter-info">
        <Calendar size={12} />
        <span>
          {activeDateFilter === 'custom'
            ? `${customDateFrom || '...'} → ${customDateTo || '...'}`
            : activeDateFilter === 'thisMonth'
              ? Utils.formatDate(activeDateRange.from) + ' → ' + Utils.formatDate(activeDateRange.to)
              : activeDateFilter === 'lastMonth'
                ? Utils.formatDate(activeDateRange.from) + ' → ' + Utils.formatDate(activeDateRange.to)
                : Utils.formatDate(selectedDate)
          }
        </span>
      </div>
    </div>
  );

  // ============================================
  // OVERVIEW TAB
  // ============================================
  const renderOverviewTab = () => (
    <div className="am-view">
      <div className="am-kpi-grid">
        {kpiItems.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="am-kpi-card"
              onMouseEnter={(e) => handleCardHover(item.id, e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}>
              <div className="am-kpi-accent" style={{ background: item.accent }} />
              <div className="am-kpi-icon" style={{ background: `${item.color}1f`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div className="am-kpi-content">
                <span className="am-kpi-label">{item.label}</span>
                <span className="am-kpi-value">{item.value}</span>
                <span className="am-kpi-meta">{item.meta}</span>
              </div>
              <div className={`am-kpi-trend ${item.trend}`}>
                {item.trend === 'up' && <TrendingUp size={15} />}
                {item.trend === 'down' && <TrendingDown size={15} />}
                {item.trend === 'flat' && <Minus size={15} />}
              </div>
            </div>
          );
        })}
      </div>

      {hoveredCard && cardDetails[hoveredCard] && (
        <div className="am-hover-tooltip"
          style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
          <div className="am-tooltip-header"><strong>{cardDetails[hoveredCard].title}</strong></div>
          <div className="am-tooltip-body">
            {cardDetails[hoveredCard].details.map((d, i) => (
              <div key={i} className="am-tooltip-row">
                <span className="am-tooltip-label">{d.label}</span>
                <span className="am-tooltip-value">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 1 — trend + donut */}
      <div className="am-grid-2-1">
        <div className="am-card">
          <div className="am-card-header">
            <div className="am-card-title">
              <span className="am-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <LineChartIcon size={16} />
              </span>
              <div>
                <h4>Attendance Trend</h4>
                <span>Last 12 months</span>
              </div>
            </div>
            <div className="am-legend">
              <span><i style={{ background: '#10b981' }} />Present</span>
              <span><i style={{ background: '#3b82f6' }} />Hours</span>
              <span><i style={{ background: '#f59e0b' }} />Wages</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyTrend}>
              <defs>
                <linearGradient id="amPresentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <ReTooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2.5}
                fill="url(#amPresentGrad)" name="Present" />
              <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2.5}
                name="Hours" dot={{ r: 3, strokeWidth: 2 }} />
              <Line type="monotone" dataKey="wages" stroke="#f59e0b" strokeWidth={2.5}
                name="Wages" dot={{ r: 3, strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="am-card">
          <div className="am-card-header">
            <div className="am-card-title">
              <span className="am-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                <PieChartIcon size={16} />
              </span>
              <div>
                <h4>Today's Status</h4>
                <span>Worker distribution</span>
              </div>
            </div>
          </div>
          <div className="am-donut-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius={52} outerRadius={85} paddingAngle={3} stroke="none">
                  {statusChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <ReTooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="am-donut-legend">
              {statusChartData.map((d, i) => (
                <div key={i} className="am-donut-item">
                  <span className="am-donut-dot" style={{ background: d.color }} />
                  <span className="am-donut-name">{d.name}</span>
                  <span className="am-donut-val">{d.value}</span>
                </div>
              ))}
              {statusChartData.length === 0 && <div className="am-empty-mini">No data</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 — Top workers + Site breakdown */}
      <div className="am-grid-1-1">
        <div className="am-card">
          <div className="am-card-header">
            <div className="am-card-title">
              <span className="am-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <BarChart3 size={16} />
              </span>
              <div>
                <h4>Top Workers by Hours</h4>
                <span>Today's highest hours worked</span>
              </div>
            </div>
          </div>
          {topWorkersChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topWorkersChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <defs>
                  <linearGradient id="amTopGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11}
                  tickLine={false} axisLine={false} width={100} />
                <ReTooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(2)}h`} />}
                  cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="hours" name="Hours" fill="url(#amTopGrad)" radius={[0, 8, 8, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="am-empty-mini">No workers with hours today</div>}
        </div>

        <div className="am-card">
          <div className="am-card-header">
            <div className="am-card-title">
              <span className="am-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <Building2 size={16} />
              </span>
              <div>
                <h4>Workers by Site</h4>
                <span>Today's distribution</span>
              </div>
            </div>
          </div>
          {siteBreakdown.length > 0 ? (
            <div className="am-breakdown">
              {siteBreakdown.map((d, i) => {
                const max = Math.max(...siteBreakdown.map(x => x.value), 1);
                return (
                  <div key={i} className="am-breakdown-row">
                    <div className="am-breakdown-head">
                      <span className="am-breakdown-dot" style={{ background: d.color }} />
                      <span className="am-breakdown-name">{d.name}</span>
                      <span className="am-breakdown-val">{d.value}</span>
                    </div>
                    <div className="am-breakdown-track">
                      <div className="am-breakdown-fill"
                        style={{ width: `${(d.value / max) * 100}%`, background: d.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="am-empty-mini">No data</div>}
        </div>
      </div>

      {/* Row 3 — Role distribution */}
      <div className="am-card">
        <div className="am-card-header">
          <div className="am-card-title">
            <span className="am-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
              <Layers size={16} />
            </span>
            <div>
              <h4>Workers by Role</h4>
              <span>Today's present workers by role</span>
            </div>
          </div>
        </div>
        {roleBreakdown.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={roleBreakdown}>
              <defs>
                <linearGradient id="amRoleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
              <Bar dataKey="value" name="Workers" fill="url(#amRoleGrad)" radius={[8, 8, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="am-empty-mini">No data</div>}
      </div>
    </div>
  );

  // ============================================
  // WORKERS TAB
  // ============================================
  const renderWorkersTab = () => {
    const { total, page, items } = paginate(filteredTodayAttendance, workerPage, workerPerPage);
    if (page !== workerPage) setWorkerPage(page);
    return (
      <div className="am-view">
        <div className="am-filters">
          <div className="am-search">
            <Search size={15} className="am-search-icon" />
            <input type="text" placeholder="Search workers by name, role, or site..."
              value={workerSearchTerm} onChange={(e) => setWorkerSearchTerm(e.target.value)} />
            {workerSearchTerm && (
              <button className="am-search-clear" onClick={() => setWorkerSearchTerm('')}>
                <X size={13} />
              </button>
            )}
          </div>
          <div className="am-filter-group">
            <select value={workerStatusFilter} onChange={(e) => setWorkerStatusFilter(e.target.value)} className="am-select">
              <option value="all">All Status</option>
              <option value="working">Working</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="absent">Absent</option>
            </select>
          </div>
          <span className="am-result-count">
            Showing {filteredTodayAttendance.length} of {todayAttendance.length}
          </span>
        </div>

        {filteredTodayAttendance.length === 0 ? (
          <div className="am-empty">
            <div className="am-empty-icon"><Users size={40} /></div>
            <h3>{workerSearchTerm || workerStatusFilter !== 'all' ? 'No matching workers' : 'No Workers'}</h3>
            <p>{workerSearchTerm || workerStatusFilter !== 'all' ? 'Try adjusting your search or filters.' : 'No workers added yet.'}</p>
          </div>
        ) : (
          <>
            <div className="am-workers-grid">
              {items.map(worker => {
                const isLoading = loading[worker.id];
                return (
                  <div key={worker.id} className="am-worker-card"
                    onMouseEnter={(e) => handleWorkerEnter(worker.id, e)}
                    onMouseMove={handleWorkerMove}
                    onMouseLeave={handleWorkerLeave}>
                    <div className={`am-worker-accent ${worker.status}`} />
                    <div className="am-worker-header">
                      <div className="am-worker-avatar" style={{
                        background: worker.status === 'working' ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)'
                          : worker.status === 'completed' ? 'linear-gradient(135deg,#10b981,#059669)'
                          : worker.status === 'pending' ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                          : 'linear-gradient(135deg,#94a3b8,#64748b)'
                      }}>
                        {worker.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="am-worker-info">
                        <div className="am-worker-name">{worker.name}</div>
                        <div className="am-worker-role">
                          <Briefcase size={11} /> {worker.role || 'Worker'}
                        </div>
                      </div>
                      <span className={`am-status ${worker.status}`}>
                        {worker.status === 'working' && <><PlayCircle size={10} /> Working</>}
                        {worker.status === 'completed' && <><CheckCircle size={10} /> Done</>}
                        {worker.status === 'pending' && <><Clock size={10} /> Pending</>}
                        {worker.status === 'absent' && <><X size={10} /> Absent</>}
                      </span>
                    </div>

                    <div className="am-worker-body">
                      {worker.siteName && (
                        <div className="am-worker-site">
                          <MapPin size={11} /> <span>{worker.siteName}</span>
                        </div>
                      )}
                      <div className="am-worker-stats">
                        <div className="am-worker-stat">
                          <span className="am-worker-stat-label">Rate</span>
                          <span className="am-worker-stat-value">{Utils.formatCurrencyShort(worker.dailyRate)}</span>
                        </div>
                        <div className="am-worker-stat">
                          <span className="am-worker-stat-label">Hours</span>
                          <span className="am-worker-stat-value">{worker.hoursWorked.toFixed(1)}h</span>
                        </div>
                        <div className="am-worker-stat">
                          <span className="am-worker-stat-label">Wage</span>
                          <span className="am-worker-stat-value" style={{ color: worker.wageEarned > 0 ? '#047857' : undefined }}>
                            {Utils.formatCurrencyShort(worker.wageEarned)}
                          </span>
                        </div>
                      </div>
                      {(worker.checkedInTime || worker.checkedOutTime) && (
                        <div className="am-worker-times">
                          {worker.checkedInTime && <span><LogIn size={11} /> {Utils.formatTime(worker.checkedInTime)}</span>}
                          {worker.checkedOutTime && <span><LogOut size={11} /> {Utils.formatTime(worker.checkedOutTime)}</span>}
                        </div>
                      )}
                    </div>

                    <div className="am-worker-footer">
                      {isLoading === 'clocking-in' && <span className="am-loading-text">Clocking In...</span>}
                      {isLoading === 'clocking-out' && <span className="am-loading-text">Clocking Out...</span>}
                      {!isLoading && worker.status === 'working' && (
                        <button className="am-btn am-btn-out" onClick={() => handleClockOut(worker.id)}>
                          <LogOut size={13} /> Clock Out
                        </button>
                      )}
                      {!isLoading && worker.status === 'completed' && (
                        <span className="am-done-text"><CheckCircle size={13} /> Completed</span>
                      )}
                      {!isLoading && (worker.status === 'absent' || worker.status === 'pending') && (
                        <button className="am-btn am-btn-in"
                          onClick={() => openSiteModal({ type: 'worker-clockin', workerId: worker.id })}>
                          <LogIn size={13} /> Clock In
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {renderPaginationBar(workerPage, total, workerPerPage, setWorkerPerPage, setWorkerPage, filteredTodayAttendance.length)}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // TEAMS TAB
  // ============================================
  const renderTeamsTab = () => {
    const { total, page, items } = paginate(filteredTeamMembers, teamPage, teamPerPage);
    if (page !== teamPage) setTeamPage(page);
    return (
      <div className="am-view">
        <div className="am-team-selector">
          <div className="am-control">
            <label><Building2 size={14} /> Select Team:</label>
            <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} className="am-select">
              <option value="">Select a team...</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name} ({team.members?.length || 0})</option>
              ))}
            </select>
          </div>
          {selectedTeamId && (
            <div className="am-team-actions">
              <button className="am-btn am-btn-in" onClick={() => openSiteModal({ type: 'team-checkin' })}
                disabled={teamActionLoading}>
                <LogIn size={13} /> Check In All
              </button>
              <button className="am-btn am-btn-out" onClick={handleTeamCheckOutAll}
                disabled={teamActionLoading}>
                <LogOut size={13} /> Check Out All
              </button>
            </div>
          )}
        </div>

        {teamAttendance && (
          <div className="am-team-summary">
            <div className="am-team-summary-item">
              <span className="label"><Users size={13} /> Members</span>
              <span className="value">{teamStats?.total || 0}</span>
            </div>
            <div className="am-team-summary-item">
              <span className="label"><CheckCircle size={13} /> Present</span>
              <span className="value" style={{ color: '#047857' }}>{teamStats?.present || 0}</span>
            </div>
            <div className="am-team-summary-item">
              <span className="label"><Gauge size={13} /> Rate</span>
              <span className="value">{teamStats?.rate?.toFixed(1) || 0}%</span>
            </div>
            <div className="am-team-summary-item">
              <span className="label"><Timer size={13} /> Hours</span>
              <span className="value">{teamStats?.hours?.toFixed(1) || 0}h</span>
            </div>
            <div className="am-team-summary-item">
              <span className="label"><DollarSign size={13} /> Wages</span>
              <span className="value" style={{ color: '#047857' }}>{Utils.formatCurrencyShort(teamStats?.wages || 0)}</span>
            </div>
          </div>
        )}

        {selectedTeamId && teamAttendance && (teamAttendance.members?.length || 0) > 0 && (
          <div className="am-search">
            <Search size={15} className="am-search-icon" />
            <input type="text" placeholder="Search members..." value={memberSearchTerm}
              onChange={(e) => setMemberSearchTerm(e.target.value)} />
            {memberSearchTerm && (
              <button className="am-search-clear" onClick={() => setMemberSearchTerm('')}>
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {teamLoading ? (
          <div className="am-loading"><div className="am-loading-spinner" /> Loading team attendance...</div>
        ) : !selectedTeamId ? (
          <div className="am-empty">
            <div className="am-empty-icon"><Building2 size={40} /></div>
            <h3>Select a Team</h3>
            <p>Please select a team to view attendance</p>
          </div>
        ) : !teamAttendance || teamAttendance.members?.length === 0 ? (
          <div className="am-empty">
            <div className="am-empty-icon"><Users size={40} /></div>
            <h3>No Members</h3>
            <p>No members in this team</p>
          </div>
        ) : filteredTeamMembers.length === 0 ? (
          <div className="am-empty">
            <div className="am-empty-icon"><Search size={40} /></div>
            <h3>No Matching Members</h3>
            <p>Try adjusting your search.</p>
          </div>
        ) : (
          <>
            <div className="am-members-list">
              {items.map(member => {
                const worker = member.worker || {};
                const isWorking = member.checkedIn && !member.checkedOut;
                const isCompleted = member.checkedIn && member.checkedOut;
                const isAbsent = !member.attendance;
                const isPending = member.attendance && !member.checkedIn;
                const memberId = member.id || worker.id;
                const isExpanded = expandedMembers[memberId];
                return (
                  <div key={worker.id} className="am-member-card"
                    onMouseEnter={(e) => handleMemberEnter(memberId, e)}
                    onMouseMove={handleMemberMove}
                    onMouseLeave={handleMemberLeave}>
                    <div className="am-member-head">
                      <div className="am-member-avatar">
                        {worker.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="am-member-info">
                        <div className="am-member-name">{worker.name}</div>
                        <div className="am-member-role"><Briefcase size={11} /> {worker.role || 'Worker'}</div>
                      </div>
                      <div className="am-member-status">
                        {isAbsent && <span className="am-status absent"><X size={10} /> Absent</span>}
                        {isWorking && <span className="am-status working"><PlayCircle size={10} /> Working</span>}
                        {isCompleted && <span className="am-status completed"><CheckCircle size={10} /> Done</span>}
                        {isPending && <span className="am-status pending"><Clock size={10} /> Pending</span>}
                      </div>
                      <div className="am-member-times">
                        {member.siteName && <span className="am-member-site"><MapPin size={11} /> {member.siteName}</span>}
                        {member.hoursWorked > 0 && <span><Timer size={11} /> {member.hoursWorked.toFixed(1)}h</span>}
                        {member.wageEarned > 0 && <span style={{ color: '#047857' }}><DollarSign size={11} /> {Utils.formatCurrencyShort(member.wageEarned)}</span>}
                      </div>
                      <div className="am-member-actions">
                        {isAbsent && (
                          <button className="am-btn am-btn-in"
                            onClick={() => openSiteModal({ type: 'team-member-checkin', workerId: worker.id })}
                            disabled={teamActionLoading}>
                            <LogIn size={12} /> Check In
                          </button>
                        )}
                        {isWorking && (
                          <button className="am-btn am-btn-out" onClick={() => handleTeamWorkerCheckOut(member.attendance.id)}
                            disabled={teamActionLoading}>
                            <LogOut size={12} /> Check Out
                          </button>
                        )}
                        {isCompleted && <span className="am-done-text"><CheckCircle size={12} /> Done</span>}
                        {isPending && <span className="am-pending-text"><Clock size={12} /> Pending</span>}
                        <button className="am-btn-icon" onClick={() => toggleMemberExpand(memberId)}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="am-member-expanded">
                        <div className="am-expand-item"><User size={12} /><span><strong>ID:</strong> {worker.id}</span></div>
                        <div className="am-expand-item"><Briefcase size={12} /><span><strong>Role:</strong> {worker.role || 'N/A'}</span></div>
                        <div className="am-expand-item"><DollarSign size={12} /><span><strong>Rate:</strong> {Utils.formatCurrency(worker.dailyRate)}</span></div>
                        <div className="am-expand-item"><Phone size={12} /><span><strong>Phone:</strong> {worker.phone || 'N/A'}</span></div>
                        {member.siteName && <div className="am-expand-item"><Building2 size={12} /><span><strong>Site:</strong> {member.siteName}</span></div>}
                        {member.checkedIn && <div className="am-expand-item"><LogIn size={12} /><span><strong>In:</strong> {Utils.formatTime(member.checkedIn)}</span></div>}
                        {member.checkedOut && <div className="am-expand-item"><LogOut size={12} /><span><strong>Out:</strong> {Utils.formatTime(member.checkedOut)}</span></div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {renderPaginationBar(teamPage, total, teamPerPage, setTeamPerPage, setTeamPage, filteredTeamMembers.length)}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // REPORTS TAB
  // ============================================
  const renderReportsTab = () => {
    const reportData = reportViewMode === 'attendance' ? attendanceReport : salaryReportData;
    const rows = reportData?.workers || [];
    const { total, page, items } = paginate(rows, reportPage, reportPerPage);
    if (page !== reportPage) setReportPage(page);

    return (
      <div className="am-view">
        <div className="am-report-controls">
          <div className="am-control">
            <label><CalendarDays size={14} /> Month:</label>
            <input type="month" value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); if (reportViewMode === 'salary') setTimeout(loadSalaryReport, 100); }}
              className="am-input" />
          </div>
          <div className="am-control">
            <label><Users size={14} /> Worker:</label>
            <select value={selectedReportWorkerId} onChange={(e) => setSelectedReportWorkerId(e.target.value)} className="am-select">
              <option value="all">All Workers</option>
              {(data.workers || []).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <button className="am-btn am-btn-secondary" onClick={() => {
            if (reportViewMode === 'salary') loadSalaryReport(); else refreshData();
          }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div className="am-report-tabs">
          <button className={`am-report-tab ${reportViewMode === 'attendance' ? 'active' : ''}`}
            onClick={() => { setReportViewMode('attendance'); setSalaryReportData(null); }}>
            <Clock size={14} /> Attendance Report
          </button>
          <button className={`am-report-tab ${reportViewMode === 'salary' ? 'active' : ''}`}
            onClick={() => { setReportViewMode('salary'); setTimeout(loadSalaryReport, 100); }}>
            <DollarSign size={14} /> Salary Report
          </button>
        </div>

        <div className="am-report-actions">
          <button className="am-btn am-btn-primary"
            onClick={() => reportViewMode === 'attendance' ? handlePrintAttendanceReport(attendanceReport) : window.print()}>
            <Printer size={13} /> Print Report
          </button>
        </div>

        {reportViewMode === 'attendance' ? (
          !attendanceReport || attendanceReport.workers.length === 0 ? (
            <div className="am-empty">
              <div className="am-empty-icon"><FileText size={40} /></div>
              <h3>No Data Found</h3>
              <p>No attendance records found for the selected month.</p>
            </div>
          ) : (
            <>
              <div className="am-report-summary">
                <div className="am-report-summary-item">
                  <span className="label"><Users size={13} /> Workers</span>
                  <span className="value">{attendanceReport.totalWorkers}</span>
                </div>
                <div className="am-report-summary-item">
                  <span className="label"><CheckCircle size={13} /> Present</span>
                  <span className="value" style={{ color: '#047857' }}>{attendanceReport.totalPresent}</span>
                </div>
                <div className="am-report-summary-item">
                  <span className="label"><X size={13} /> Absent</span>
                  <span className="value" style={{ color: '#b91c1c' }}>{attendanceReport.totalAbsent}</span>
                </div>
                <div className="am-report-summary-item">
                  <span className="label"><Timer size={13} /> Hours</span>
                  <span className="value">{attendanceReport.totalHours.toFixed(1)}h</span>
                </div>
                <div className="am-report-summary-item">
                  <span className="label"><DollarSign size={13} /> Wages</span>
                  <span className="value" style={{ color: '#047857' }}>{Utils.formatCurrencyShort(attendanceReport.totalWages)}</span>
                </div>
              </div>

              <div className="am-table-wrap">
                <table className="am-table">
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th className="right">Total Days</th>
                      <th className="right">Present</th>
                      <th className="right">Absent</th>
                      <th className="right">Rate</th>
                      <th className="right">Hours</th>
                      <th className="right">OT</th>
                      <th className="right">Wages</th>
                      <th className="center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((w, i) => (
                      <tr key={w.worker.id} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                        <td>
                          <button className="am-expand-btn" onClick={() => toggleReportExpand(w.worker.id)}>
                            {expandedReportWorkers[w.worker.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            {w.worker.name}
                          </button>
                        </td>
                        <td className="right">{w.totalDays}</td>
                        <td className="right am-td-green">{w.presentDays}</td>
                        <td className="right am-td-red">{w.absentDays}</td>
                        <td className="right">
                          <span className={`am-rate ${w.attendanceRate >= 80 ? 'good' : 'bad'}`}>
                            {w.attendanceRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="right">{w.totalHours.toFixed(1)}h</td>
                        <td className="right">{w.totalOvertime.toFixed(1)}h</td>
                        <td className="right am-td-green">{Utils.formatCurrencyShort(w.totalWages)}</td>
                        <td className="center">
                          <button className="am-btn-small" onClick={() => {
                            const salaryData = {
                              ...w,
                              basicHours: w.totalHours - w.totalOvertime,
                              basicSalary: (w.totalHours - w.totalOvertime) * (w.worker.hourlyRate || 0),
                              overtimeSalary: w.totalOvertime * (w.worker.hourlyRate || 0) * 1.5,
                              totalSalary: (w.totalHours - w.totalOvertime) * (w.worker.hourlyRate || 0) + w.totalOvertime * (w.worker.hourlyRate || 0) * 1.5,
                              rate: w.worker.hourlyRate || 0,
                              loans: [], advances: [],
                              totalLoanDeduction: 0, totalAdvanceDeduction: 0,
                              totalDeductions: w.worker.advancePayment || 0,
                              netSalary: ((w.totalHours - w.totalOvertime) * (w.worker.hourlyRate || 0) + w.totalOvertime * (w.worker.hourlyRate || 0) * 1.5) - (w.worker.advancePayment || 0)
                            };
                            handlePrintSalarySlip(salaryData);
                          }}>
                            <Printer size={12} /> Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {renderPaginationBar(reportPage, total, reportPerPage, setReportPerPage, setReportPage, rows.length)}
            </>
          )
        ) : salaryReportLoading ? (
          <div className="am-loading"><div className="am-loading-spinner" /> Loading salary report...</div>
        ) : !salaryReportData ? (
          <div className="am-empty">
            <div className="am-empty-icon"><FileText size={40} /></div>
            <h3>No Salary Data</h3>
            <p>No salary data found for the selected month.</p>
            <button className="am-btn am-btn-primary" onClick={loadSalaryReport}>
              <RefreshCw size={13} /> Load Report
            </button>
          </div>
        ) : (
          <>
            <div className="am-report-summary">
              <div className="am-report-summary-item">
                <span className="label"><Users size={13} /> Workers</span>
                <span className="value">{salaryReportData.summary?.totalWorkers || 0}</span>
              </div>
              <div className="am-report-summary-item">
                <span className="label"><DollarSign size={13} /> Gross</span>
                <span className="value">{Utils.formatCurrencyShort(salaryReportData.summary?.totalGrossSalary || 0)}</span>
              </div>
              <div className="am-report-summary-item">
                <span className="label"><Shield size={13} /> Loan</span>
                <span className="value" style={{ color: '#b91c1c' }}>{Utils.formatCurrencyShort(salaryReportData.summary?.totalLoanDeduction || 0)}</span>
              </div>
              <div className="am-report-summary-item">
                <span className="label"><Wallet size={13} /> Advance</span>
                <span className="value" style={{ color: '#b45309' }}>{Utils.formatCurrencyShort(salaryReportData.summary?.totalAdvanceDeduction || 0)}</span>
              </div>
              <div className="am-report-summary-item">
                <span className="label"><CheckCircle size={13} /> Net</span>
                <span className="value" style={{ color: '#047857' }}>{Utils.formatCurrencyShort(salaryReportData.summary?.totalNetSalary || 0)}</span>
              </div>
            </div>

            <div className="am-table-wrap">
              <table className="am-table">
                <thead>
                  <tr>
                    <th>Worker</th>
                    <th>Role</th>
                    <th className="right">Present</th>
                    <th className="right">Normal</th>
                    <th className="right">OT</th>
                    <th className="right">Gross</th>
                    <th className="right">Loan</th>
                    <th className="right">Advance</th>
                    <th className="right">Deductions</th>
                    <th className="right">Net</th>
                    <th className="center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((w, i) => (
                    <tr key={w.workerId || i} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                      <td><strong>{w.workerName}</strong></td>
                      <td>{w.role || 'N/A'}</td>
                      <td className="right">{w.attendance?.presentDays || 0}/{w.attendance?.totalDays || 0}</td>
                      <td className="right">{w.attendance?.normalHours?.toFixed(1) || '0.0'}h</td>
                      <td className="right">{w.attendance?.overtimeHours?.toFixed(1) || '0.0'}h</td>
                      <td className="right am-td-green">{Utils.formatCurrencyShort(w.salary?.grossSalary || 0)}</td>
                      <td className="right am-td-red">{w.deductions?.totalLoanDeduction > 0 ? Utils.formatCurrencyShort(w.deductions.totalLoanDeduction) : '—'}</td>
                      <td className="right am-td-amber">{w.deductions?.totalAdvanceDeduction > 0 ? Utils.formatCurrencyShort(w.deductions.totalAdvanceDeduction) : '—'}</td>
                      <td className="right am-td-red">{Utils.formatCurrencyShort(w.deductions?.totalDeductions || 0)}</td>
                      <td className="right am-td-green"><strong>{Utils.formatCurrencyShort(w.netSalary || 0)}</strong></td>
                      <td className="center">
                        <button className="am-btn-small" onClick={() => handlePrintSalarySlip(w)}>
                          <Printer size={12} /> Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPaginationBar(reportPage, total, reportPerPage, setReportPerPage, setReportPage, rows.length)}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // SITE MODAL
  // ============================================
  const renderSiteModal = () => {
    if (!showSiteModal) return null;
    const title = siteModalContext?.type === 'team-checkin' ? 'Select Site for Team Check-In'
      : siteModalContext?.type === 'team-member-checkin' ? 'Select Site for Worker Check-In'
      : 'Select Site for Clock-In';
    const subtitle = siteModalContext?.type === 'team-checkin'
      ? 'All team members will be checked in to the selected site.'
      : 'Attendance will be recorded against the selected site.';
    return (
      <ModalPortal>
        <div className="am-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeSiteModal(); }}>
          <div className="am-modal-content am-site-modal" onClick={e => e.stopPropagation()}>
            <div className="am-modal-header" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
              <div className="am-modal-header-left">
                <div className="am-modal-icon"><Building2 size={18} /></div>
                <div>
                  <h3>{title}</h3>
                  <p className="am-modal-sub">{subtitle}</p>
                </div>
              </div>
              <button className="am-modal-close" onClick={closeSiteModal}>
                <X size={18} />
              </button>
            </div>
            <div className="am-modal-body">
              {sites.length === 0 ? (
                <div className="am-empty-mini">No sites available. Please add a site first.</div>
              ) : (
                <div className="am-site-list">
                  {sites.map(site => (
                    <button key={site.id} className="am-site-item" onClick={() => handleSiteConfirm(site.id)}>
                      <div className="am-site-icon"><MapPin size={16} /></div>
                      <div className="am-site-info">
                        <div className="am-site-name">{site.name}</div>
                        {site.location && <div className="am-site-meta">{site.location}</div>}
                        {site.clientName && <div className="am-site-meta">Client: {site.clientName}</div>}
                      </div>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </ModalPortal>
    );
  };

  // ============================================
  // ROW TOOLTIPS
  // ============================================
  const renderWorkerTooltip = () => {
    if (!hoveredWorker) return null;
    const worker = todayAttendance.find(w => w.id === hoveredWorker);
    if (!worker) return null;
    return (
      <div className="am-row-tooltip" style={{ position: 'fixed', left: workerTooltipPos.x, top: workerTooltipPos.y, zIndex: 9998 }}>
        <div className="am-row-tooltip-title"><User size={13} /> {worker.name}</div>
        <div className="am-row-tooltip-row"><Briefcase size={11} /><span>Role:</span><strong>{worker.role || 'N/A'}</strong></div>
        <div className="am-row-tooltip-row"><Building2 size={11} /><span>Site:</span><strong style={{ color: worker.siteName ? '#047857' : '#b91c1c' }}>{worker.siteName || 'Not assigned'}</strong></div>
        <div className="am-row-tooltip-row"><Clock size={11} /><span>Status:</span><strong style={{ textTransform: 'capitalize' }}>{worker.status}</strong></div>
        {worker.checkedInTime && <div className="am-row-tooltip-row"><LogIn size={11} /><span>In:</span><strong>{Utils.formatTime(worker.checkedInTime)}</strong></div>}
        {worker.checkedOutTime && <div className="am-row-tooltip-row"><LogOut size={11} /><span>Out:</span><strong>{Utils.formatTime(worker.checkedOutTime)}</strong></div>}
        {worker.hoursWorked > 0 && <div className="am-row-tooltip-row"><Timer size={11} /><span>Hours:</span><strong>{worker.hoursWorked.toFixed(2)}h</strong></div>}
        {worker.wageEarned > 0 && <div className="am-row-tooltip-row"><DollarSign size={11} /><span>Wage:</span><strong style={{ color: '#047857' }}>{Utils.formatCurrency(worker.wageEarned)}</strong></div>}
      </div>
    );
  };
  const renderMemberTooltip = () => {
    if (!hoveredMember) return null;
    const member = (teamAttendance?.members || []).find(m => (m.id || m.worker?.id) === hoveredMember);
    if (!member) return null;
    const worker = member.worker || {};
    return (
      <div className="am-row-tooltip" style={{ position: 'fixed', left: memberTooltipPos.x, top: memberTooltipPos.y, zIndex: 9998 }}>
        <div className="am-row-tooltip-title"><User size={13} /> {worker.name}</div>
        <div className="am-row-tooltip-row"><Briefcase size={11} /><span>Role:</span><strong>{worker.role || 'N/A'}</strong></div>
        <div className="am-row-tooltip-row"><Building2 size={11} /><span>Site:</span><strong style={{ color: member.siteName ? '#047857' : '#b91c1c' }}>{member.siteName || 'Not assigned'}</strong></div>
        {member.checkedIn && <div className="am-row-tooltip-row"><LogIn size={11} /><span>In:</span><strong>{Utils.formatTime(member.checkedIn)}</strong></div>}
        {member.checkedOut && <div className="am-row-tooltip-row"><LogOut size={11} /><span>Out:</span><strong>{Utils.formatTime(member.checkedOut)}</strong></div>}
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className={`am-root ${mounted ? 'is-mounted' : ''}`}>
      <div className="am-ambient">
        <div className="am-orb am-orb-1" />
        <div className="am-orb am-orb-2" />
        <div className="am-orb am-orb-3" />
      </div>

      {/* Header */}
      <div className="am-header">
        <div className="am-header-left">
          <div className="am-header-icon">
            <Clock size={22} />
            <span className="am-header-badge"><Sparkles size={10} /> ATTENDANCE</span>
          </div>
          <div>
            <h2>Attendance &amp; Time Tracking</h2>
            <p className="am-header-subtitle">
              {dayStats.present} present · {dayStats.working} working · {dayStats.totalHours.toFixed(1)}h logged
            </p>
          </div>
        </div>
        <div className="am-header-right">
          <button className="am-btn am-btn-ghost" onClick={() => refreshData()}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="am-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'workers', label: 'Workers', icon: Users, badge: dayStats.totalWorkers },
          { id: 'teams', label: 'Teams', icon: Users2 },
          { id: 'reports', label: 'Reports', icon: FileText }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`am-tab ${viewMode === t.id ? 'active' : ''}`}
              onClick={() => { setViewMode(t.id); setError(''); setSuccess(''); if (t.id === 'teams' && teams.length > 0 && !selectedTeamId) setSelectedTeamId(teams[0].id); }}>
              <Icon size={15} />
              <span>{t.label}</span>
              {t.badge !== undefined && <span className="am-tab-badge">{t.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* Date filters (not in reports) */}
      {viewMode !== 'reports' && renderDateFilterBar()}

      {/* Date selector (not in reports or overview) */}
      {viewMode !== 'reports' && viewMode !== 'overview' && (
        <div className="am-date-bar">
          <label><CalendarDays size={14} /> Select Date:</label>
          <input type="date" value={selectedDate}
            onChange={e => { setSelectedDate(e.target.value); setActiveDateFilter('custom'); setTimeout(() => refreshData(), 100); }}
            className="am-input" />
        </div>
      )}

      {/* Messages */}
      {error && <div className="am-message error"><AlertCircle size={15} /> {error}</div>}
      {success && <div className="am-message success"><CheckCircle size={15} /> {success}</div>}

      {/* View */}
      {viewMode === 'overview' && renderOverviewTab()}
      {viewMode === 'workers' && renderWorkersTab()}
      {viewMode === 'teams' && renderTeamsTab()}
      {viewMode === 'reports' && renderReportsTab()}

      {/* Modals & tooltips */}
      {renderSiteModal()}
      {renderWorkerTooltip()}
      {renderMemberTooltip()}
    </div>
  );
};

export default AttendanceManager;