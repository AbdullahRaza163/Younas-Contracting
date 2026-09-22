// src/components/AttendanceManager.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  RefreshCw, Users, UserCheck, Clock, Calendar, Users2, Building2,
  ChevronDown, ChevronUp, FileText, TrendingUp, TrendingDown,
  Search, Filter, Printer, ChevronRight, Eye, X, Download, User,
  Settings, Award, Briefcase, Phone, Mail, MapPin, CreditCard, Wallet,
  Receipt, AlertCircle, CheckCircle, LayoutDashboard, HardHat, Timer,
  Activity, Gauge, Sparkles, Crown, Star, ArrowUpRight, ArrowDownRight,
  Info, Zap, Shield, Plus, Edit, Trash2, Save, UserPlus, LogIn, LogOut,
  PlayCircle, StopCircle, CalendarDays, FileSpreadsheet, Package, Box,
  Layers, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon,
  ChevronLeft, ChevronsLeft, ChevronsRight, Flame, Target, Percent,
  Banknote, Minus, List, Sun, Moon, Sliders, RotateCcw, Coffee, Ban,
  ArrowUp, ArrowDown, Copy, GripVertical, GitBranch
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
import ApiService from '../services/ApiService';

import { CONFIG } from '../config/constants';

// ============================================
// DEBUG HELPERS
// ============================================
const DEBUG = true;
const dbg = (...args) => { if (DEBUG) console.log('%c[AM]', 'color:#8b5cf6;font-weight:bold', ...args); };
const dbgErr = (...args) => { if (DEBUG) console.error('%c[AM-ERR]', 'color:#dc2626;font-weight:bold', ...args); };
const dbgWarn = (...args) => { if (DEBUG) console.warn('%c[AM-WARN]', 'color:#f59e0b;font-weight:bold', ...args); };

// ============================================
// SELF-CONTAINED API HELPERS
// ============================================
const authHeaders = () => ({
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`
});

const apiGet = async (path) => {
  const res = await fetch(`${CONFIG.API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `GET ${path} failed (${res.status})`);
  }
  return res.json();
};

const apiSend = async (path, method, body) => {
  const res = await fetch(`${CONFIG.API_BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `${method} ${path} failed (${res.status})`);
  }
  return res.json();
};

const ShiftsApi = {
  list: (attendanceId) => apiGet(`/attendance/${attendanceId}/shifts`),
  replace: (attendanceId, shifts) => apiSend(`/attendance/${attendanceId}/shifts`, 'POST', { shifts }),
  update: (shiftId, payload) => apiSend(`/attendance/shifts/${shiftId}/update`, 'POST', payload),
  delete: (shiftId) => apiSend(`/attendance/shifts/${shiftId}/delete`, 'POST'),
};

const AttendanceApi = {
  update: (attendanceId, payload) => apiSend(`/attendance/${attendanceId}`, 'PUT', payload),
  editTimes: (attendanceId, payload) => apiSend(`/attendance/${attendanceId}/edit-times`, 'PUT', payload),
};

// ============================================
// DEFAULTS
// ============================================
const DEFAULT_SETTINGS = {
  shiftStartTime: '07:00',
  shiftEndTime: '17:00',
  shiftHours: 8,
  breakStartTime: '12:00',
  breakEndTime: '13:00',
  breakHours: 1,
  breakEnabled: true,
  overtimeRate: 1,
  overtimeEnabled: true,
  earlyInThreshold: 15,
  lateInThreshold: 15,
  earlyOutThreshold: 15,
  lateOutThreshold: 15,
  countEarlyIn: true,
  countLateIn: true,
  countEarlyOut: true,
  countLateOut: true,
};

// ============================================
// PORTAL
// ============================================
const ModalPortal = ({ children }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

// ============================================
// HELPERS — BD currency + time
// ============================================
const fmtBD = (v) => `${Number(v || 0).toFixed(3)} BD`;
const fmtBDShort = (v) => Number(v || 0).toFixed(3);

const minutesSinceMidnight = (dtLike) => {
  if (!dtLike) return null;
  const d = new Date(dtLike);
  if (isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
};

const hhmmToMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

const getClockInStatus = (checkedIn, cfg = DEFAULT_SETTINGS) => {
  if (!checkedIn) return null;
  const inMins = minutesSinceMidnight(checkedIn);
  const startMins = hhmmToMinutes(cfg.shiftStartTime || '07:00');
  if (inMins == null || startMins == null) return null;
  const diff = startMins - inMins;
  if (cfg.countEarlyIn && diff >= (cfg.earlyInThreshold ?? 15)) return 'early_in';
  if (cfg.countLateIn && diff <= -(cfg.lateInThreshold ?? 15)) return 'late_in';
  return 'on_time';
};

const getClockOutStatus = (checkedOut, cfg = DEFAULT_SETTINGS) => {
  if (!checkedOut) return null;
  const outMins = minutesSinceMidnight(checkedOut);
  const endMins = hhmmToMinutes(cfg.shiftEndTime || '17:00');
  if (outMins == null || endMins == null) return null;
  const diff = outMins - endMins;
  if (cfg.countLateOut && diff >= (cfg.lateOutThreshold ?? 15)) return 'late_out';
  if (cfg.countEarlyOut && diff <= -(cfg.earlyOutThreshold ?? 15)) return 'early_out';
  return 'on_time';
};

const isoToLocalHHMM = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const buildISO = (dateStr, hhmm) => {
  if (!dateStr || !hhmm) return null;
  const [hours, minutes] = hhmm.split(':').map(Number);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 || hours > 23 ||
    minutes < 0 || minutes > 59
  ) {
    return null;
  }
  const pad = (n) => String(n).padStart(2, '0');
  return `${dateStr}T${pad(hours)}:${pad(minutes)}:00`;
};

const normalizeDate = (raw) => {
  if (!raw) return '';
  if (typeof raw === 'string') return raw.includes('T') ? raw.slice(0, 10) : raw;
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch { return ''; }
};

// ============================================
// CORE: Compute hours for a SINGLE shift
// ============================================
const computeShiftHours = (shift, cfg = DEFAULT_SETTINGS) => {
  const zero = { hours: 0, overtime: 0, normal: 0, breakH: 0, overtimeEnabled: cfg.overtimeEnabled !== false, breakEnabled: cfg.breakEnabled !== false };
  if (!shift?.checkedIn || !shift?.checkedOut) return zero;

  const inMs = new Date(shift.checkedIn).getTime();
  const outMs = new Date(shift.checkedOut).getTime();
  if (isNaN(inMs) || isNaN(outMs) || outMs <= inMs) return zero;

  const rawHours = (outMs - inMs) / (1000 * 60 * 60);

  const breakEnabled = shift.breakEnabled !== undefined
    ? shift.breakEnabled !== false
    : cfg.breakEnabled !== false;

  const overtimeEnabled = shift.overtimeEnabled !== undefined
    ? shift.overtimeEnabled !== false
    : cfg.overtimeEnabled !== false;

  let breakHours = 0;
  if (breakEnabled) {
    const dateStr = normalizeDate(shift.date);
    const bStart = shift.breakStart || (cfg.breakStartTime && dateStr
      ? buildISO(dateStr, cfg.breakStartTime) : null);
    const bEnd = shift.breakEnd || (cfg.breakEndTime && dateStr
      ? buildISO(dateStr, cfg.breakEndTime) : null);
    if (bStart && bEnd) {
      const bsMs = new Date(bStart).getTime();
      const beMs = new Date(bEnd).getTime();
      if (!isNaN(bsMs) && !isNaN(beMs) && beMs > bsMs) {
        breakHours = (beMs - bsMs) / (1000 * 60 * 60);
      }
    } else {
      const cfgBreakHours = Number(cfg.breakHours) || 0;
      if (cfgBreakHours > 0) breakHours = cfgBreakHours;
    }
  }

  const paidHours = breakEnabled ? Math.max(0, rawHours - breakHours) : rawHours;
  const shiftHours = Number(cfg.shiftHours) || 8;

  let normal = paidHours;
  let overtime = 0;
  if (overtimeEnabled && paidHours > shiftHours) {
    normal = shiftHours;
    overtime = paidHours - shiftHours;
  }

  return {
    hours: paidHours,
    overtime,
    normal,
    breakH: breakHours,
    overtimeEnabled,
    breakEnabled,
  };
};

// ============================================
// AGGREGATE hours across shifts
// ============================================
const computeAggregateHours = (shifts, cfg = DEFAULT_SETTINGS) => {
  const list = Array.isArray(shifts) ? shifts : [];
  if (list.length === 0) {
    return {
      hoursWorked: 0, overtimeHours: 0, normalHours: 0, breakHours: 0,
      breakEnabled: cfg.breakEnabled !== false,
      overtimeEnabled: cfg.overtimeEnabled !== false,
      shiftCount: 0,
      perShift: [],
    };
  }

  let totalPaid = 0;
  let totalBreak = 0;
  let totalOvertime = 0;
  let totalNormal = 0;
  let anyOvertimeEnabled = false;
  let anyBreakEnabled = false;

  const perShift = list.map(sh => {
    const r = computeShiftHours(sh, cfg);
    totalPaid += r.hours;
    totalBreak += r.breakH;
    totalOvertime += r.overtime;
    totalNormal += r.normal;
    if (r.overtimeEnabled) anyOvertimeEnabled = true;
    if (r.breakEnabled) anyBreakEnabled = true;
    return { ...sh, computed: r };
  });

  return {
    hoursWorked: totalPaid,
    overtimeHours: totalOvertime,
    normalHours: totalNormal,
    breakHours: totalBreak,
    breakEnabled: anyBreakEnabled,
    overtimeEnabled: anyOvertimeEnabled,
    shiftCount: list.length,
    perShift,
  };
};

const computeHoursWithSettings = (record, cfg = DEFAULT_SETTINGS) => {
  if (!record) return computeAggregateHours([], cfg);
  if (Array.isArray(record.shifts) && record.shifts.length > 0) {
    return computeAggregateHours(record.shifts, cfg);
  }
  return computeAggregateHours([record], cfg);
};

const getClockInMinutes = (checkedIn, cfg = DEFAULT_SETTINGS) => {
  if (!checkedIn) return null;
  const inMins = minutesSinceMidnight(checkedIn);
  const startMins = hhmmToMinutes(cfg.shiftStartTime || '07:00');
  if (inMins == null || startMins == null) return null;
  return inMins - startMins;
};

const getClockOutMinutes = (checkedOut, cfg = DEFAULT_SETTINGS) => {
  if (!checkedOut) return null;
  const outMins = minutesSinceMidnight(checkedOut);
  const endMins = hhmmToMinutes(cfg.shiftEndTime || '17:00');
  if (outMins == null || endMins == null) return null;
  return outMins - endMins;
};

// ============================================
// ⭐ SINGLE SOURCE OF TRUTH — effective hourly rate
//
// Your Workers module has ONE rate field, and you intend it as
// an HOURLY rate. Backend stores it in `dailyRate` (legacy name).
// This helper:
//   1. Uses worker.hourlyRate if > 0 (future-proof)
//   2. Otherwise treats worker.dailyRate AS-IS (it IS the hourly rate)
//   3. Otherwise 0
//
// NO division by shiftHours — the value is already per-hour.
// ============================================
const resolveHourlyRate = (worker) => {
  if (!worker) return 0;
  const h = Number(worker.hourlyRate);
  if (h && h > 0) return h;
  const d = Number(worker.dailyRate);
  if (d && d > 0) return d;
  return 0;
};

// ============================================
// computeWage — uses resolveHourlyRate
// ============================================
const computeWage = (normalHours, overtimeHours, worker, cfg = DEFAULT_SETTINGS, record = null) => {
  const otRate = Number(cfg.overtimeRate) || 1.0;
  const hourlyRate = resolveHourlyRate(worker);

  const otEnabled = record?.overtimeEnabled !== undefined
    ? record.overtimeEnabled !== false
    : cfg.overtimeEnabled !== false;

  const safeNormalHours = Math.max(0, Number(normalHours) || 0);
  const rawOtHours = Math.max(0, Number(overtimeHours) || 0);
  const safeOtHours = otEnabled ? rawOtHours : 0;

  const normalPay = safeNormalHours * hourlyRate;
  const otPay = safeOtHours * hourlyRate * otRate;

  const total = normalPay + otPay;

  dbg('💰 computeWage', {
    worker: worker?.name,
    hourlyRate: hourlyRate.toFixed(4),
    normalHours: safeNormalHours.toFixed(3),
    otHours: safeOtHours.toFixed(3),
    otRate,
    otEnabled,
    normalPay: normalPay.toFixed(4),
    otPay: otPay.toFixed(4),
    total: total.toFixed(4),
  });

  return total;
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
    case 'thisWeek': {
      const first = new Date(today);
      const day = first.getDay();
      const diff = day === 0 ? 6 : day - 1;
      first.setDate(first.getDate() - diff);
      const last = new Date(first);
      last.setDate(last.getDate() + 6);
      return { from: fmt(first), to: fmt(last) };
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
// SHIFT UTILITIES
// ============================================
const newShiftDraft = (dateStr, cfg, seedSiteId = '') => ({
  _key: `s_${Math.random().toString(36).slice(2, 9)}`,
  id: null,
  siteId: seedSiteId || '',
  checkedIn: '',
  checkedOut: '',
  breakStart: '',
  breakEnd: '',
  notes: '',
  breakEnabled: cfg.breakEnabled !== false,
  overtimeEnabled: cfg.overtimeEnabled !== false,
  orderIndex: 0,
});

const normalizeShiftFromServer = (s, cfg) => ({
  _key: `s_${s.id || Math.random().toString(36).slice(2, 9)}`,
  id: s.id || null,
  siteId: s.siteId || s.site_id || '',
  checkedIn: isoToLocalHHMM(s.checkedIn || s.checked_in),
  checkedOut: isoToLocalHHMM(s.checkedOut || s.checked_out),
  breakStart: isoToLocalHHMM(s.breakStart || s.break_start),
  breakEnd: isoToLocalHHMM(s.breakEnd || s.break_end),
  notes: s.notes || '',
  breakEnabled: s.breakEnabled !== undefined ? s.breakEnabled !== false
    : (s.break_enabled !== undefined ? s.break_enabled !== false : cfg.breakEnabled !== false),
  overtimeEnabled: s.overtimeEnabled !== undefined ? s.overtimeEnabled !== false
    : (s.overtime_enabled !== undefined ? s.overtime_enabled !== false : cfg.overtimeEnabled !== false),
  orderIndex: s.orderIndex ?? s.order_index ?? 0,
});

const legacyRecordToShift = (record, cfg) => {
  const dateStr = normalizeDate(record.date);
  const sh = newShiftDraft(dateStr, cfg, record.siteId || '');
  sh.checkedIn = isoToLocalHHMM(record.checkedIn);
  sh.checkedOut = isoToLocalHHMM(record.checkedOut);
  sh.breakStart = isoToLocalHHMM(record.breakStart
    || (cfg.breakEnabled !== false && cfg.breakStartTime ? buildISO(dateStr, cfg.breakStartTime) : null));
  sh.breakEnd = isoToLocalHHMM(record.breakEnd
    || (cfg.breakEnabled !== false && cfg.breakEndTime ? buildISO(dateStr, cfg.breakEndTime) : null));
  sh.notes = record.notes || '';
  sh.breakEnabled = record.breakEnabled !== undefined
    ? record.breakEnabled !== false : cfg.breakEnabled !== false;
  sh.overtimeEnabled = record.overtimeEnabled !== undefined
    ? record.overtimeEnabled !== false : cfg.overtimeEnabled !== false;
  return sh;
};

// ============================================
// MAIN COMPONENT
// ============================================
const AttendanceManager = ({ data, clockInWorker, clockOutWorker, refreshData }) => {
  dbg('🎬 AttendanceManager render', {
    workers: data?.workers?.length,
    attendance: data?.attendance?.length,
    teams: data?.teams?.length,
    sites: data?.sites?.length,
  });

  const [selectedDate, setSelectedDate] = useState(Utils.today());
  const [loading, setLoading] = useState({});
  const [viewMode, setViewMode] = useState('overview');
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

  // Edit Attendance Modal (shift-aware)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [editShiftDrafts, setEditShiftDrafts] = useState([]);
  const [editMeta, setEditMeta] = useState({
    siteId: '', notes: '', present: true,
    breakEnabled: true, overtimeEnabled: true,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editShiftsLoading, setEditShiftsLoading] = useState(false);

  const [localAttendanceOverride, setLocalAttendanceOverride] = useState({});

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedReportWorkerId, setSelectedReportWorkerId] = useState('all');
  const [reportViewMode, setReportViewMode] = useState('attendance');
  const [expandedReportWorkers, setExpandedReportWorkers] = useState({});
  const [salaryReportData, setSalaryReportData] = useState(null);
  const [salaryReportLoading, setSalaryReportLoading] = useState(false);

  const [activeDateFilter, setActiveDateFilter] = useState('today');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

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
  // MERGED ATTENDANCE
  // ============================================
  const mergedAttendance = useMemo(() => {
    const server = data.attendance || [];
    if (Object.keys(localAttendanceOverride).length === 0) return server;
    return server.map(a => {
      const override = localAttendanceOverride[a.id];
      return override ? { ...a, ...override } : a;
    });
  }, [data.attendance, localAttendanceOverride]);

  // ============================================
  // LOAD SETTINGS
  // ============================================
  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const s = await ApiService.getAttendanceSettings();
      setSettings({ ...DEFAULT_SETTINGS, ...s });
      setSettingsForm({ ...DEFAULT_SETTINGS, ...s });
    } catch (err) {
      dbgErr('Failed to load attendance settings:', err);
      setSettings(DEFAULT_SETTINGS);
      setSettingsForm(DEFAULT_SETTINGS);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSaveSettings = async () => {
    setSettingsSaving(true); setError(''); setSuccess('');
    try {
      const res = await ApiService.updateAttendanceSettings(settingsForm);
      const merged = { ...DEFAULT_SETTINGS, ...(res.settings || settingsForm) };
      setSettings(merged);
      setSettingsForm(merged);
      setSuccess('Attendance settings saved');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleResetSettings = () => {
    setSettingsForm(settings);
    setSuccess('Form reset to saved values');
    setTimeout(() => setSuccess(''), 2500);
  };

  // ============================================
  // DATE FILTER
  // ============================================
  const handleDateFilterChange = useCallback((filterType) => {
    setActiveDateFilter(filterType);
    setShowCustomDate(filterType === 'custom');

    if (filterType !== 'custom') {
      const range = getDateFilterRange(filterType);
      setSelectedDate(range.from);
      setCustomDateFrom(range.from);
      setCustomDateTo(range.to);
    } else {
      if (!customDateFrom) setCustomDateFrom(selectedDate);
      if (!customDateTo) setCustomDateTo(selectedDate);
    }
  }, [customDateFrom, customDateTo, selectedDate]);

  const handleCustomDateApply = useCallback(() => {
    if (!customDateFrom || !customDateTo) return;
    if (customDateFrom > customDateTo) {
      setError('From date cannot be after To date');
      return;
    }
    setError('');
    setSelectedDate(customDateFrom);
  }, [customDateFrom, customDateTo]);

  const activeDateRange = useMemo(() => {
    if (activeDateFilter === 'custom') {
      return { from: customDateFrom || selectedDate, to: customDateTo || selectedDate };
    }
    return getDateFilterRange(activeDateFilter);
  }, [activeDateFilter, customDateFrom, customDateTo, selectedDate]);

  // ============================================
  // SALARY REPORT
  // ============================================
  const loadSalaryReport = useCallback(async () => {
    if (!selectedMonth) return;
    setSalaryReportLoading(true);
    setError('');
    try {
      const result = await apiGet(`/attendance/salary-report/${selectedMonth}`);
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
  const dateRangeAttendance = useMemo(() => {
    const range = activeDateRange;
    return mergedAttendance.filter(a => {
      if (!a.date) return false;
      return a.date >= range.from && a.date <= range.to;
    });
  }, [mergedAttendance, activeDateRange]);

  const todayAttendance = useMemo(() => {
    const range = activeDateRange;
    const isSingleDay = range.from === range.to;
    const cfg = settings || DEFAULT_SETTINGS;

    return (data.workers || []).map(worker => {
      const workerRecords = dateRangeAttendance.filter(a => a.workerId === worker.id);

      let record = null;
      let status = 'absent';
      let checkedInTime = null, checkedOutTime = null;
      let hoursWorked = 0, wageEarned = 0, overtimeHours = 0, normalHours = 0;
      let earlyIn = false, lateIn = false, lateOut = false, earlyOut = false;
      let lateInMinutes = 0, lateOutMinutes = 0;
      let breakStart = null, breakEnd = null, breakHours = 0;
      let breakEnabled = cfg.breakEnabled !== false;
      let overtimeEnabled = cfg.overtimeEnabled !== false;
      let siteIds = [];
      let shiftCount = 0;

      if (isSingleDay) {
        record = mergedAttendance.find(
          a => a.workerId === worker.id && a.date === range.from
        );
        if (record) {
          const shifts = Array.isArray(record.shifts) && record.shifts.length > 0
            ? record.shifts
            : [record];

          const completedShifts = shifts.filter(s => (s.checkedIn || s.checked_in) && (s.checkedOut || s.checked_out));
          const anyActive = shifts.some(s => (s.checkedIn || s.checked_in) && !(s.checkedOut || s.checked_out));

          shiftCount = shifts.length;
          siteIds = [...new Set(shifts.map(s => s.siteId || s.site_id).filter(Boolean))];

          const ins = shifts.map(s => s.checkedIn || s.checked_in).filter(Boolean).map(x => new Date(x).getTime());
          const outs = shifts.map(s => s.checkedOut || s.checked_out).filter(Boolean).map(x => new Date(x).getTime());
          checkedInTime = ins.length ? new Date(Math.min(...ins)).toISOString() : null;
          checkedOutTime = outs.length ? new Date(Math.max(...outs)).toISOString() : null;

          const agg = computeAggregateHours(shifts.map(s => ({
            checkedIn: s.checkedIn || s.checked_in,
            checkedOut: s.checkedOut || s.checked_out,
            breakStart: s.breakStart || s.break_start,
            breakEnd: s.breakEnd || s.break_end,
            date: record.date,
            breakEnabled: s.breakEnabled ?? s.break_enabled,
            overtimeEnabled: s.overtimeEnabled ?? s.overtime_enabled,
          })), cfg);

          hoursWorked = agg.hoursWorked;
          overtimeHours = agg.overtimeHours;
          normalHours = agg.normalHours;
          breakHours = agg.breakHours;
          breakEnabled = agg.breakEnabled;
          overtimeEnabled = agg.overtimeEnabled;

          wageEarned = computeWage(normalHours, overtimeHours, worker, cfg, {
            overtimeEnabled: agg.overtimeEnabled,
          });

          if (anyActive) status = 'working';
          else if (completedShifts.length > 0) status = 'completed';
          else if (record.present) status = 'pending';

          const inStatus = getClockInStatus(checkedInTime, cfg);
          if (inStatus === 'early_in') earlyIn = true;
          if (inStatus === 'late_in') {
            lateIn = true;
            lateInMinutes = Math.max(0, getClockInMinutes(checkedInTime, cfg) || 0);
          }
          const outStatus = getClockOutStatus(checkedOutTime, cfg);
          if (outStatus === 'late_out') {
            lateOut = true;
            lateOutMinutes = Math.max(0, getClockOutMinutes(checkedOutTime, cfg) || 0);
          }
          if (outStatus === 'early_out') earlyOut = true;

          if (shiftCount === 1) {
            const s0 = shifts[0];
            breakStart = s0.breakStart || s0.break_start || null;
            breakEnd = s0.breakEnd || s0.break_end || null;
          }
        }
      } else {
        const completed = workerRecords.filter(a =>
          (a.checkedIn || a.shifts?.some?.(s => s.checkedIn && s.checkedOut))
        );
        const active = workerRecords.find(a =>
          a.checkedIn && !a.checkedOut ||
          a.shifts?.some?.(s => s.checkedIn && !s.checkedOut)
        );

        workerRecords.forEach(a => {
          const shifts = Array.isArray(a.shifts) && a.shifts.length > 0 ? a.shifts : [a];
          const agg = computeAggregateHours(shifts.map(s => ({
            checkedIn: s.checkedIn || s.checked_in,
            checkedOut: s.checkedOut || s.checked_out,
            breakStart: s.breakStart || s.break_start,
            breakEnd: s.breakEnd || s.break_end,
            date: a.date,
            breakEnabled: s.breakEnabled ?? s.break_enabled,
            overtimeEnabled: s.overtimeEnabled ?? s.overtime_enabled,
          })), cfg);
          hoursWorked += agg.hoursWorked;
          overtimeHours += agg.overtimeHours;
          normalHours += agg.normalHours;
          breakHours += agg.breakHours;
          wageEarned += computeWage(agg.normalHours, agg.overtimeHours, worker, cfg, {
            overtimeEnabled: agg.overtimeEnabled,
          });
        });

        const presentCount = workerRecords.filter(a => a.present).length;
        if (active) {
          status = 'working';
          checkedInTime = active.checkedIn;
        } else if (presentCount > 0) {
          status = 'completed';
          record = completed[completed.length - 1] || workerRecords[workerRecords.length - 1];
          checkedOutTime = record?.checkedOut || null;
        } else {
          status = 'absent';
        }
      }

      const firstSiteId = siteIds[0] || record?.siteId || null;
      const siteName = firstSiteId ? (resolveSiteName(firstSiteId) || record?.siteName || null) : null;

      return {
        ...worker, record: record || null, status,
        checkedInTime, checkedOutTime,
        hoursWorked, wageEarned, overtimeHours, normalHours,
        earlyIn, lateIn, lateOut, earlyOut,
        lateInMinutes, lateOutMinutes,
        breakStart, breakEnd, breakHours,
        breakEnabled, overtimeEnabled,
        present: status !== 'absent',
        siteId: firstSiteId, siteName,
        siteIds,
        siteCount: siteIds.length,
        shiftCount,
        recordCount: workerRecords.length,
        isSingleDay
      };
    });
  }, [data.workers, mergedAttendance, dateRangeAttendance, activeDateRange, resolveSiteName, settings]);

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
    const earlyInCount = todayAttendance.filter(w => w.earlyIn).length;
    const lateInCount = todayAttendance.filter(w => w.lateIn).length;
    const lateOutCount = todayAttendance.filter(w => w.lateOut).length;
    const earlyOutCount = todayAttendance.filter(w => w.earlyOut).length;
    const totalOvertime = todayAttendance.reduce((sum, w) => sum + w.overtimeHours, 0);
    const multiSiteWorkers = todayAttendance.filter(w => w.siteCount > 1).length;
    return {
      present: present.length, working: working.length, completed: completed.length,
      absent: absent.length, totalHours, totalWages, totalWorkers, totalOvertime,
      attendanceRate: totalWorkers > 0 ? (present.length / totalWorkers) * 100 : 0,
      avgHours: present.length > 0 ? totalHours / present.length : 0,
      earlyInCount, lateInCount, lateOutCount, earlyOutCount,
      multiSiteWorkers,
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
      const ids = w.siteIds && w.siteIds.length > 0 ? w.siteIds : (w.siteId ? [w.siteId] : []);
      if (ids.length === 0) {
        map['Unassigned'] = (map['Unassigned'] || 0) + 1;
      } else {
        ids.forEach(id => {
          const name = resolveSiteName(id) || 'Unassigned';
          map[name] = (map[name] || 0) + 1;
        });
      }
    });
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    return Object.entries(map)
      .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [todayAttendance, resolveSiteName]);

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
      const monthAtt = mergedAttendance.filter(a => a.date && a.date.startsWith(key));
      const present = monthAtt.filter(a => a.present).length;
      const hours = monthAtt.reduce((s, a) => s + (a.totalHours || 0), 0);
      const wages = monthAtt.reduce((s, a) => s + (a.wageEarned || 0), 0);
      months.push({ label, present, hours, wages });
    }
    return months;
  }, [mergedAttendance]);

  // ============================================
  // KPI
  // ============================================
  const kpiItems = [
    {
      id: 'present', icon: UserCheck, label: 'Present', value: dayStats.present,
      meta: `${dayStats.attendanceRate.toFixed(0)}% attendance`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up'
    },
    {
      id: 'working', icon: Activity, label: 'Currently Working', value: dayStats.working,
      meta: `${dayStats.completed} completed`,
      color: '#3b82f6', accent: 'linear-gradient(90deg,#3b82f6,#60a5fa)', trend: 'up'
    },
    {
      id: 'hours', icon: Timer, label: 'Total Hours',
      value: `${dayStats.totalHours.toFixed(1)}h`,
      meta: `Avg ${dayStats.avgHours.toFixed(1)}h`,
      color: '#f59e0b', accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)', trend: 'up'
    },
    {
      id: 'overtime', icon: Flame, label: 'Overtime',
      value: `${dayStats.totalOvertime.toFixed(1)}h`,
      meta: settings.overtimeEnabled ? `${settings.overtimeRate}× rate` : 'OT disabled',
      color: '#8b5cf6', accent: 'linear-gradient(90deg,#8b5cf6,#a78bfa)', trend: 'up'
    },
    {
      id: 'wages', icon: Banknote, label: 'Total Wages',
      value: fmtBDShort(dayStats.totalWages),
      meta: `${dayStats.present} present · BD`,
      color: '#10b981', accent: 'linear-gradient(90deg,#10b981,#34d399)', trend: 'up'
    },
    {
      id: 'multiSite', icon: GitBranch, label: 'Multi-Site Workers',
      value: dayStats.multiSiteWorkers,
      meta: 'worked >1 site',
      color: '#0ea5e9', accent: 'linear-gradient(90deg,#0ea5e9,#38bdf8)', trend: 'flat'
    },
    {
      id: 'earlyIn', icon: ArrowDownRight, label: 'Early In',
      value: dayStats.earlyInCount,
      meta: 'before expected start',
      color: '#06b6d4', accent: 'linear-gradient(90deg,#06b6d4,#22d3ee)', trend: 'flat'
    },
    {
      id: 'lateIn', icon: ArrowUpRight, label: 'Late In',
      value: dayStats.lateInCount,
      meta: 'after expected start',
      color: '#f59e0b', accent: 'linear-gradient(90deg,#f59e0b,#fbbf24)', trend: 'flat'
    },
    {
      id: 'absent', icon: X, label: 'Absent',
      value: dayStats.absent,
      meta: `${((dayStats.absent / (dayStats.totalWorkers || 1)) * 100).toFixed(0)}% absent`,
      color: '#ef4444', accent: 'linear-gradient(90deg,#ef4444,#f87171)',
      trend: dayStats.absent > 0 ? 'down' : 'flat'
    },
  ];

  const cardDetails = {
    present: {
      title: 'Present', details: [
        { label: 'Present', value: dayStats.present },
        { label: 'Attendance Rate', value: `${dayStats.attendanceRate.toFixed(1)}%` },
        { label: 'Total Workers', value: dayStats.totalWorkers },
        { label: 'Absent', value: dayStats.absent }
      ]
    },
    working: {
      title: 'Currently Working', details: [
        { label: 'Working', value: dayStats.working },
        { label: 'Completed', value: dayStats.completed },
        { label: 'Present', value: dayStats.present },
        { label: 'Working Rate', value: dayStats.present > 0 ? `${((dayStats.working / dayStats.present) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    hours: {
      title: 'Total Hours', details: [
        { label: 'Total Hours', value: `${dayStats.totalHours.toFixed(1)}h` },
        { label: 'Avg Hours', value: `${dayStats.avgHours.toFixed(1)}h` },
        { label: 'Present', value: dayStats.present },
        { label: 'Working Now', value: dayStats.working }
      ]
    },
    overtime: {
      title: 'Overtime', details: [
        { label: 'Total OT Hours', value: `${dayStats.totalOvertime.toFixed(1)}h` },
        { label: 'OT Rate', value: `${settings.overtimeRate}×` },
        { label: 'Status', value: settings.overtimeEnabled ? 'Enabled' : 'Disabled' },
        { label: 'Shift Hours', value: `${settings.shiftHours}h` }
      ]
    },
    wages: {
      title: 'Total Wages (BD)', details: [
        { label: 'Total Wages', value: fmtBD(dayStats.totalWages) },
        { label: 'Avg Wage', value: dayStats.present > 0 ? fmtBD(dayStats.totalWages / dayStats.present) : '0.000 BD' },
        { label: 'Total Hours', value: `${dayStats.totalHours.toFixed(1)}h` },
        { label: 'Present', value: dayStats.present }
      ]
    },
    multiSite: {
      title: 'Multi-Site Workers', details: [
        { label: 'Workers on >1 site', value: dayStats.multiSiteWorkers },
        { label: 'Present', value: dayStats.present },
        { label: 'Total Workers', value: dayStats.totalWorkers },
        { label: 'Avg Sites/Worker', value: dayStats.present > 0 ? (todayAttendance.reduce((s, w) => s + (w.siteCount || 0), 0) / dayStats.present).toFixed(2) : '0' }
      ]
    },
    earlyIn: {
      title: 'Early In', details: [
        { label: 'Count', value: dayStats.earlyInCount },
        { label: 'Threshold', value: `>${settings.earlyInThreshold} min before start` },
        { label: 'Expected Start', value: settings.shiftStartTime },
        { label: 'Total Workers', value: dayStats.totalWorkers }
      ]
    },
    lateIn: {
      title: 'Late In', details: [
        { label: 'Count', value: dayStats.lateInCount },
        { label: 'Threshold', value: `>${settings.lateInThreshold} min after start` },
        { label: 'Expected Start', value: settings.shiftStartTime },
        { label: 'Total Workers', value: dayStats.totalWorkers }
      ]
    },
    absent: {
      title: 'Absent', details: [
        { label: 'Absent', value: dayStats.absent },
        { label: 'Total Workers', value: dayStats.totalWorkers },
        { label: 'Absent Rate', value: `${((dayStats.absent / (dayStats.totalWorkers || 1)) * 100).toFixed(1)}%` },
        { label: 'Present', value: dayStats.present }
      ]
    }
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
      const result = await ApiService.getTeamAttendance(selectedTeamId, selectedDate);
      const cfg = settings || DEFAULT_SETTINGS;
      if (result?.members) {
        result.members = result.members.map(m => {
          const inStatus = getClockInStatus(m.checkedIn, cfg);
          const outStatus = getClockOutStatus(m.checkedOut, cfg);
          const computed = computeHoursWithSettings({
            checkedIn: m.checkedIn,
            checkedOut: m.checkedOut,
            breakStart: m.attendance?.breakStart || m.breakStart,
            breakEnd: m.attendance?.breakEnd || m.breakEnd,
            date: selectedDate,
            breakEnabled: m.attendance?.breakEnabled,
            overtimeEnabled: m.attendance?.overtimeEnabled,
            shifts: m.attendance?.shifts,
          }, cfg);

          return {
            ...m,
            siteName: m.siteName || resolveSiteName(m.siteId) || resolveSiteName(m.attendance?.siteId) || null,
            siteId: m.siteId || m.attendance?.siteId || null,
            earlyIn: inStatus === 'early_in',
            lateIn: inStatus === 'late_in',
            lateOut: outStatus === 'late_out',
            earlyOut: outStatus === 'early_out',
            lateInMinutes: inStatus === 'late_in'
              ? Math.max(0, getClockInMinutes(m.checkedIn, cfg) || 0) : 0,
            lateOutMinutes: outStatus === 'late_out'
              ? Math.max(0, getClockOutMinutes(m.checkedOut, cfg) || 0) : 0,
            hoursWorked: computed.hoursWorked,
            overtimeHours: computed.overtimeHours,
            normalHours: computed.normalHours,
            breakHours: computed.breakHours,
            breakEnabled: computed.breakEnabled,
            overtimeEnabled: computed.overtimeEnabled,
            shiftCount: computed.shiftCount,
            wageEarned: computeWage(computed.normalHours, computed.overtimeHours, m.worker || {}, cfg, {
              overtimeEnabled: computed.overtimeEnabled,
            }),
          };
        });
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
  // EDIT ATTENDANCE MODAL — SHIFT AWARE
  // ============================================
  const openEditModal = async (record, worker) => {
    dbg('🔓 openEditModal', { recordId: record?.id, workerId: worker?.id, workerName: worker?.name });

    if (!record) {
      dbgWarn('⚠️ openEditModal: no record');
      setError('No attendance record to edit for this date. Check the worker in first.');
      return;
    }

    const cfg = settings || DEFAULT_SETTINGS;

    const breakEnabled = record.breakEnabled !== undefined
      ? record.breakEnabled !== false
      : cfg.breakEnabled !== false;
    const overtimeEnabled = record.overtimeEnabled !== undefined
      ? record.overtimeEnabled !== false
      : cfg.overtimeEnabled !== false;

    setEditRecord({ ...record, _worker: worker });
    setEditMeta({
      siteId: record.siteId || '',
      notes: record.notes || '',
      present: record.present !== false,
      breakEnabled,
      overtimeEnabled,
    });

    let drafts = [];
    const embedded = Array.isArray(record.shifts) ? record.shifts : null;

    if (embedded && embedded.length > 0) {
      drafts = embedded
        .slice()
        .sort((a, b) => (a.orderIndex ?? a.order_index ?? 0) - (b.orderIndex ?? b.order_index ?? 0))
        .map(s => normalizeShiftFromServer(s, cfg));
    } else {
      setEditShiftsLoading(true);
      try {
        const serverShifts = await ShiftsApi.list(record.id);
        if (Array.isArray(serverShifts) && serverShifts.length > 0) {
          drafts = serverShifts
            .slice()
            .sort((a, b) => (a.orderIndex ?? a.order_index ?? 0) - (b.orderIndex ?? b.order_index ?? 0))
            .map(s => normalizeShiftFromServer(s, cfg));
        }
      } catch (err) {
        dbgWarn('getShifts failed (probably no shifts yet):', err?.message);
      } finally {
        setEditShiftsLoading(false);
      }
    }

    if (drafts.length === 0) {
      drafts = [legacyRecordToShift(record, cfg)];
    }

    setEditShiftDrafts(drafts);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditRecord(null);
    setEditShiftDrafts([]);
  };

  const addShiftDraft = () => {
    const dateStr = normalizeDate(editRecord?.date);
    const cfg = settings || DEFAULT_SETTINGS;
    const last = editShiftDrafts[editShiftDrafts.length - 1];
    const seed = newShiftDraft(dateStr, cfg, last?.siteId || editMeta.siteId || '');
    if (last?.checkedOut) seed.checkedIn = last.checkedOut;
    setEditShiftDrafts(prev => [...prev, seed]);
  };

  const removeShiftDraft = (key) => {
    setEditShiftDrafts(prev => {
      if (prev.length === 1) {
        return [newShiftDraft(normalizeDate(editRecord?.date), settings || DEFAULT_SETTINGS)];
      }
      return prev.filter(s => s._key !== key);
    });
  };

  const updateShiftDraft = (key, patch) => {
    setEditShiftDrafts(prev => prev.map(s => s._key === key ? { ...s, ...patch } : s));
  };

  const duplicateShiftDraft = (key) => {
    setEditShiftDrafts(prev => {
      const idx = prev.findIndex(s => s._key === key);
      if (idx === -1) return prev;
      const src = prev[idx];
      const copy = {
        ...src,
        _key: `s_${Math.random().toString(36).slice(2, 9)}`,
        id: null,
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  const moveShiftDraft = (key, dir) => {
    setEditShiftDrafts(prev => {
      const idx = prev.findIndex(s => s._key === key);
      if (idx === -1) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  // ============================================
  // SAVE — self-contained ShiftsApi
  // ============================================
  const handleSaveEdit = async () => {
    console.log('═══════════════════════════════════════════');
    console.log('💾 handleSaveEdit START (multi-shift)');

    if (!editRecord) { console.warn('⚠️ no editRecord'); return; }

    setEditLoading(true); setError(''); setSuccess('');

    try {
      const dateStr = normalizeDate(editRecord.date);
      if (!dateStr) throw new Error('Attendance record has no valid date');

      const cleaned = [];
      for (let i = 0; i < editShiftDrafts.length; i++) {
        const s = editShiftDrafts[i];
        if (!s.checkedIn && !s.checkedOut) continue;
        if (!s.checkedIn || !s.checkedOut) {
          throw new Error(`Shift ${i + 1}: both check-in and check-out are required`);
        }
        const inISO = buildISO(dateStr, s.checkedIn);
        const outISO = buildISO(dateStr, s.checkedOut);
        if (new Date(outISO) <= new Date(inISO)) {
          throw new Error(`Shift ${i + 1}: check-out must be after check-in`);
        }
        if (s.breakEnabled && s.breakStart && s.breakEnd) {
          const bsISO = buildISO(dateStr, s.breakStart);
          const beISO = buildISO(dateStr, s.breakEnd);
          if (new Date(beISO) <= new Date(bsISO)) {
            throw new Error(`Shift ${i + 1}: break end must be after break start`);
          }
        }
        cleaned.push({
          orderIndex: cleaned.length,
          siteId: s.siteId || null,
          checkedIn: inISO,
          checkedOut: outISO,
          breakStart: s.breakEnabled && s.breakStart ? buildISO(dateStr, s.breakStart) : null,
          breakEnd: s.breakEnabled && s.breakEnd ? buildISO(dateStr, s.breakEnd) : null,
          breakEnabled: !!s.breakEnabled,
          overtimeEnabled: !!s.overtimeEnabled,
          notes: s.notes || '',
        });
      }

      if (cleaned.length === 0) {
        throw new Error('At least one complete shift is required');
      }

      console.log('📦 Replacing shifts:', cleaned);

      const shiftRes = await ShiftsApi.replace(editRecord.id, cleaned);
      console.log('✅ replaceShifts response:', shiftRes);

      const metaBody = {};
      const origSite = editRecord.siteId || '';
      const origNotes = editRecord.notes || '';
      const origPresent = editRecord.present !== false;

      const primarySiteFromShifts = cleaned[0]?.siteId || null;
      const desiredSite = editMeta.siteId || primarySiteFromShifts || '';
      if (desiredSite !== origSite) metaBody.siteId = desiredSite || null;
      if (editMeta.notes !== origNotes) metaBody.notes = editMeta.notes;
      if (editMeta.present !== origPresent) metaBody.present = editMeta.present;

      if (Object.keys(metaBody).length > 0) {
        console.log('🌐 PUT /attendance/' + editRecord.id, metaBody);
        try {
          await AttendanceApi.update(editRecord.id, metaBody);
        } catch (metaErr) {
          console.warn('⚠️ meta patch failed (continuing):', metaErr?.message);
        }
      }

      if (shiftRes?.record) {
        setLocalAttendanceOverride(prev => ({
          ...prev,
          [shiftRes.record.id]: shiftRes.record,
        }));
      }

      setSuccess(`Attendance updated (${cleaned.length} shift${cleaned.length > 1 ? 's' : ''})`);
      closeEditModal();

      try {
        if (viewMode === 'teams') await loadTeamAttendance();
        await refreshData();
      } catch (refreshErr) {
        console.warn('⚠️ refreshData failed:', refreshErr);
        setError('Saved successfully, but reload failed. Refresh the page (F5).');
        setTimeout(() => setSuccess(''), 4000);
        setTimeout(() => setError(''), 8000);
        return;
      }
      setTimeout(() => setSuccess(''), 4000);
      console.log('💾 handleSaveEdit END — success');
      console.log('═══════════════════════════════════════════');
    } catch (err) {
      console.error('❌ handleSaveEdit FAILED:', err);
      setError(err.message || 'Failed to update attendance');
      console.log('═══════════════════════════════════════════');
    } finally {
      setEditLoading(false);
    }
  };

  // ============================================
  // REPORT
  // ============================================
  const attendanceReport = useMemo(() => {
    if (!selectedMonth) return null;
    const cfg = settings || DEFAULT_SETTINGS;
    const report = {
      month: selectedMonth, totalWorkers: 0, totalPresent: 0, totalAbsent: 0,
      totalHours: 0, totalOvertime: 0, totalWages: 0, workers: []
    };
    let workers = data.workers || [];
    if (selectedReportWorkerId !== 'all') workers = workers.filter(w => w.id === selectedReportWorkerId);

    workers.forEach(worker => {
      const attendances = mergedAttendance.filter(
        a => a.workerId === worker.id && a.date && a.date.startsWith(selectedMonth)
      );

      let totalHours = 0, totalOvertime = 0, totalNormal = 0, totalBreak = 0, totalWages = 0;
      const enrichedAttendances = attendances.map(a => {
        const shifts = Array.isArray(a.shifts) && a.shifts.length > 0 ? a.shifts : [a];
        const agg = computeAggregateHours(shifts.map(s => ({
          checkedIn: s.checkedIn || s.checked_in,
          checkedOut: s.checkedOut || s.checked_out,
          breakStart: s.breakStart || s.break_start,
          breakEnd: s.breakEnd || s.break_end,
          date: a.date,
          breakEnabled: s.breakEnabled ?? s.break_enabled,
          overtimeEnabled: s.overtimeEnabled ?? s.overtime_enabled,
        })), cfg);
        const wage = computeWage(agg.normalHours, agg.overtimeHours, worker, cfg, {
          overtimeEnabled: agg.overtimeEnabled,
        });
        totalHours += agg.hoursWorked;
        totalOvertime += agg.overtimeHours;
        totalNormal += agg.normalHours;
        totalBreak += agg.breakHours;
        totalWages += wage;
        return {
          ...a,
          totalHours: agg.hoursWorked,
          overtimeHours: agg.overtimeHours,
          normalHours: agg.normalHours,
          breakHours: agg.breakHours,
          wageEarned: wage,
          shiftCount: agg.shiftCount,
        };
      });

      const presentDays = attendances.filter(a => a.present).length;
      const totalDays = new Date(
        parseInt(selectedMonth.split('-')[0]),
        parseInt(selectedMonth.split('-')[1]),
        0
      ).getDate();

      const workerReport = {
        worker, attendances: enrichedAttendances,
        totalDays, presentDays,
        absentDays: totalDays - presentDays,
        totalHours, totalOvertime, totalNormal, totalBreak, totalWages,
        attendanceRate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
        dailyAverage: presentDays > 0 ? totalHours / presentDays : 0
      };
      report.workers.push(workerReport);
      report.totalWorkers++; report.totalPresent += presentDays;
      report.totalAbsent += workerReport.absentDays;
      report.totalHours += totalHours; report.totalOvertime += totalOvertime;
      report.totalWages += totalWages;
    });
    return report;
  }, [data.workers, mergedAttendance, selectedMonth, selectedReportWorkerId, settings]);

  // ============================================
  // SALARY SLIP
  // ============================================
  const generateSalarySlipHTML = (workerData) => {
    const worker = workerData.worker || workerData;
    const cfg = settings || DEFAULT_SETTINGS;
    const otMultiplier = Number(cfg.overtimeRate) || 1.0;

    const workerName = worker.name || workerData.workerName || 'Unknown';
    const workerRole = worker.role || workerData.role || 'N/A';
    const workerCpr = worker.cpr || 'N/A';
    const rate = workerData.rate || resolveHourlyRate(worker) || 0;
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

    const deductionPct = Number(workerData.deductionPercentage || worker.deductionPercentage || 0);
    const deductionEnabled = workerData.deductionEnabled ?? worker.deductionEnabled ?? false;
    const percentageDeduction = Number(workerData.percentageDeduction || 0);

    const totalDeductions = workerData.totalDeductions ||
      (totalLoanDeduction + totalAdvanceDeduction + percentageDeduction);
    const netSalary = workerData.netSalary || (totalSalary - totalDeductions);
    const attendances = workerData.attendances || [];
    const monthName = Utils.getMonthName(selectedMonth);
    const year = selectedMonth.split('-')[0];
    const hasLoans = loanDeductions.length > 0 || totalLoanDeduction > 0;
    const hasAdvances = advanceDeductions.length > 0 || totalAdvanceDeduction > 0;
    const hasPercentageDeduction = deductionEnabled && deductionPct > 0;

    const primary = '#1a3c6e', secondary = '#c9a84c', light = '#e8edf3',
      muted = '#6a6a8a', border = '#d4d9e0', text = '#1a1a2e', danger = '#dc3545';

    let attendanceRows = '';
    if (attendances.length > 0) {
      attendanceRows = attendances.map(att => {
        const day = att.date ? new Date(att.date).getDate() : '?';
        const dateStr = att.date ? Utils.formatDate(att.date) : 'N/A';
        const normalHours = (att.totalHours || 0) - (att.overtimeHours || 0);
        const status = att.present ? 'Present' : 'Absent';
        const siteName = att.siteId ? (resolveSiteName(att.siteId) || '') : '';
        const shiftTag = att.shiftCount > 1 ? ` <span style="color:#8b5cf6;font-size:10px;">(${att.shiftCount} shifts)</span>` : '';
        return `<tr><td>${day}</td><td>${dateStr}${shiftTag}</td><td>${normalHours.toFixed(1)}h</td><td>${(att.overtimeHours || 0).toFixed(1)}h</td><td>${siteName}</td><td class="${att.present ? 'text-success' : 'text-danger'}">${status}</td></tr>`;
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
    .slip-totals{ margin:10px 0 10px auto!important; padding:12px 20px!important; background:${light}!important; max-width:420px!important; border:2px solid ${secondary}!important; border-radius:4px!important; }
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
            <div class="slip-info-item"><span class="label">Hourly Rate:</span><span class="value">${rate.toFixed(3)} BD</span></div>
            <div class="slip-info-item"><span class="label">Total Days:</span><span class="value">${totalDays}</span></div>
            <div class="slip-info-item"><span class="label">Present Days:</span><span class="value">${presentDays}</span></div>
          </div>
          <div class="slip-section-title">Earnings</div>
          <table class="slip-table">
            <thead><tr><th style="text-align:left;">Description</th><th>Hours</th><th>Rate</th><th>Amount (BD)</th></tr></thead>
            <tbody>
              <tr><td style="text-align:left;">Normal Hours</td><td>${basicHours.toFixed(1)}</td><td>${rate.toFixed(3)}</td><td class="text-success">${basicSalary.toFixed(3)}</td></tr>
              <tr><td style="text-align:left;">Overtime Hours (${otMultiplier}x)</td><td>${overtimeHours.toFixed(1)}</td><td>${(rate * otMultiplier).toFixed(3)}</td><td class="text-warning">${overtimeSalary.toFixed(3)}</td></tr>
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
          ${hasPercentageDeduction ? `
            <div class="slip-section-title" style="color:${danger}!important;">Percentage Deduction (${deductionPct.toFixed(2)}%)</div>
            <div class="slip-deductions-list">
              <div class="deduction-item">
                <span class="ref">Applied to gross salary</span>
                <span class="amount">${percentageDeduction.toFixed(3)} BD</span>
              </div>
            </div>
          ` : ''}
          ${hasLoans ? `<div class="slip-section-title" style="color:${danger}!important;">Loan Deductions</div><div class="slip-deductions-list">${loanDeductions.map(l => `<div class="deduction-item"><span class="ref">${l.loanNumber || l.reference || 'Loan'}</span><span class="amount">${(l.amount || 0).toFixed(3)} BD</span></div>`).join('')}${totalLoanDeduction > 0 ? `<div class="deduction-item" style="border-top:1px solid #fecaca!important;padding-top:4px!important;margin-top:4px!important;font-weight:700!important;"><span>Total Loan Deduction</span><span class="amount">${totalLoanDeduction.toFixed(3)} BD</span></div>` : ''}</div>` : ''}
          ${hasAdvances ? `<div class="slip-section-title" style="color:${danger}!important;">Advance Deductions</div><div class="slip-deductions-list">${advanceDeductions.map(a => `<div class="deduction-item"><span class="ref">${a.advanceNumber || a.reference || 'Advance'}</span><span class="amount">${(a.amount || 0).toFixed(3)} BD</span></div>`).join('')}${totalAdvanceDeduction > 0 ? `<div class="deduction-item" style="border-top:1px solid #fecaca!important;padding-top:4px!important;margin-top:4px!important;font-weight:700!important;"><span>Total Advance Deduction</span><span class="amount">${totalAdvanceDeduction.toFixed(3)} BD</span></div>` : ''}</div>` : ''}
          <div class="slip-totals">
            <div class="slip-total-row"><span class="lbl">Gross Salary:</span><span class="val">${totalSalary.toFixed(3)} BD</span></div>
            ${hasPercentageDeduction ? `<div class="slip-total-row deduction"><span class="lbl">Percentage Deduction (${deductionPct.toFixed(2)}%):</span><span class="val">- ${percentageDeduction.toFixed(3)} BD</span></div>` : ''}
            ${totalLoanDeduction > 0 ? `<div class="slip-total-row deduction"><span class="lbl">Loan Deduction:</span><span class="val">- ${totalLoanDeduction.toFixed(3)} BD</span></div>` : ''}
            ${totalAdvanceDeduction > 0 ? `<div class="slip-total-row deduction"><span class="lbl">Advance Deduction:</span><span class="val">- ${totalAdvanceDeduction.toFixed(3)} BD</span></div>` : ''}
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

  // ============================================
  // ATTENDANCE REPORT PRINT
  // ============================================
  const generateAttendanceReportHTML = (report) => {
    const monthName = Utils.getMonthName(selectedMonth);
    const year = selectedMonth.split('-')[0];
    const primary = '#1a3c6e', secondary = '#c9a84c', light = '#e8edf3',
      muted = '#6a6a8a', border = '#d4d9e0', text = '#1a1a2e';
    const rows = report.workers.map((w, idx) => `
      <tr><td>${idx + 1}</td><td style="text-align:left;">${w.worker.name}</td><td>${w.worker.role || 'N/A'}</td><td>${w.totalDays}</td><td class="text-success">${w.presentDays}</td><td class="text-danger">${w.absentDays}</td><td>${w.attendanceRate.toFixed(1)}%</td><td>${w.totalHours.toFixed(1)}h</td><td>${w.totalOvertime.toFixed(1)}h</td><td class="text-success">${fmtBD(w.totalWages)}</td></tr>
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
            <div class="rep-summary-card"><div class="rep-summary-label">Total Wages (BD)</div><div class="rep-summary-value">${fmtBD(report.totalWages)}</div></div>
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
    } catch (err) {
      setError('Clock in failed: ' + err.message);
      setLoading(prev => ({ ...prev, [workerId]: null }));
    }
  };
  const handleClockOut = async (workerId) => {
    setLoading(prev => ({ ...prev, [workerId]: 'clocking-out' }));
    try {
      await clockOutWorker(workerId, selectedDate);
      await new Promise(r => setTimeout(r, 500));
      await refreshData();
      setLoading(prev => ({ ...prev, [workerId]: null }));
    } catch (err) {
      setError('Clock out failed: ' + err.message);
      setLoading(prev => ({ ...prev, [workerId]: null }));
    }
  };
  const handleTeamCheckInAll = async (siteId) => {
    if (!selectedTeamId) return;
    setTeamActionLoading(true); setError(''); setSuccess('');
    try {
      await apiSend(`/attendance/team/${selectedTeamId}/checkin-all`, 'POST', { date: selectedDate, siteId });
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
      await apiSend(`/attendance/team/${selectedTeamId}/checkout-all`, 'POST', { date: selectedDate });
      setSuccess('Team checked out successfully');
      await loadTeamAttendance(); await refreshData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) { setError(err.message); }
    finally { setTeamActionLoading(false); }
  };
  const handleTeamWorkerCheckIn = async (workerId, siteId) => {
    setTeamActionLoading(true); setError(''); setSuccess('');
    try {
      await apiSend(`/attendance/checkin`, 'POST', { workerId, teamId: selectedTeamId, siteId, date: selectedDate });
      setSuccess('Worker checked in successfully');
      await loadTeamAttendance(); await refreshData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) { setError(err.message); }
    finally { setTeamActionLoading(false); }
  };
  const handleTeamWorkerCheckOut = async (attendanceId) => {
    setTeamActionLoading(true); setError(''); setSuccess('');
    try {
      await apiSend(`/attendance/${attendanceId}/checkout`, 'PUT');
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
  // PAGINATION
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
        <button className={`am-date-filter-btn ${activeDateFilter === 'today' ? 'active' : ''}`} onClick={() => handleDateFilterChange('today')}>
          <CalendarDays size={13} /> Today
        </button>
        <button className={`am-date-filter-btn ${activeDateFilter === 'yesterday' ? 'active' : ''}`} onClick={() => handleDateFilterChange('yesterday')}>
          <CalendarDays size={13} /> Yesterday
        </button>
        <button className={`am-date-filter-btn ${activeDateFilter === 'thisWeek' ? 'active' : ''}`} onClick={() => handleDateFilterChange('thisWeek')}>
          <CalendarDays size={13} /> This Week
        </button>
        <button className={`am-date-filter-btn ${activeDateFilter === 'thisMonth' ? 'active' : ''}`} onClick={() => handleDateFilterChange('thisMonth')}>
          <CalendarDays size={13} /> This Month
        </button>
        <button className={`am-date-filter-btn ${activeDateFilter === 'lastMonth' ? 'active' : ''}`} onClick={() => handleDateFilterChange('lastMonth')}>
          <CalendarDays size={13} /> Last Month
        </button>
        <button className={`am-date-filter-btn ${activeDateFilter === 'custom' ? 'active' : ''}`} onClick={() => handleDateFilterChange('custom')}>
          <Filter size={13} /> Custom
        </button>
      </div>

      {showCustomDate && (
        <div className="am-custom-date-row">
          <div className="am-custom-date-field">
            <label><CalendarDays size={12} /> From:</label>
            <input type="date" value={customDateFrom} onChange={(e) => setCustomDateFrom(e.target.value)} className="am-input am-input-sm" />
          </div>
          <div className="am-custom-date-field">
            <label><CalendarDays size={12} /> To:</label>
            <input type="date" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)} className="am-input am-input-sm" />
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
            ? `${Utils.formatDate(customDateFrom || '...')} → ${Utils.formatDate(customDateTo || '...')}`
            : `${Utils.formatDate(activeDateRange.from)} → ${Utils.formatDate(activeDateRange.to)}`}
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
        <div className="am-hover-tooltip" style={{ position: 'fixed', left: tooltipPosition.x, top: tooltipPosition.y, zIndex: 9999 }}>
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
              <span><i style={{ background: '#f59e0b' }} />Wages (BD)</span>
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
              <Area type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2.5} fill="url(#amPresentGrad)" name="Present" />
              <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2.5} name="Hours" dot={{ r: 3, strokeWidth: 2 }} />
              <Line type="monotone" dataKey="wages" stroke="#f59e0b" strokeWidth={2.5} name="Wages" dot={{ r: 3, strokeWidth: 2 }} />
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
                <h4>Status Distribution</h4>
                <span>For selected period</span>
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

      <div className="am-grid-1-1">
        <div className="am-card">
          <div className="am-card-header">
            <div className="am-card-title">
              <span className="am-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                <BarChart3 size={16} />
              </span>
              <div>
                <h4>Top Workers by Hours</h4>
                <span>Highest hours worked</span>
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
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={100} />
                <ReTooltip content={<ChartTooltip formatter={(v) => `${v.toFixed(2)}h`} />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
                <Bar dataKey="hours" name="Hours" fill="url(#amTopGrad)" radius={[0, 8, 8, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="am-empty-mini">No workers with hours in this period</div>}
        </div>

        <div className="am-card">
          <div className="am-card-header">
            <div className="am-card-title">
              <span className="am-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                <Building2 size={16} />
              </span>
              <div>
                <h4>Workers by Site</h4>
                <span>Distribution (multi-site counted per site)</span>
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
                      <div className="am-breakdown-fill" style={{ width: `${(d.value / max) * 100}%`, background: d.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="am-empty-mini">No data</div>}
        </div>
      </div>

      <div className="am-card">
        <div className="am-card-header">
          <div className="am-card-title">
            <span className="am-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
              <Layers size={16} />
            </span>
            <div>
              <h4>Workers by Role</h4>
              <span>Present workers by role</span>
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
    const isMultiDay = activeDateRange.from !== activeDateRange.to;
    const cfg = settings || DEFAULT_SETTINGS;

    return (
      <div className="am-view">
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12,
          padding: '8px 14px', background: 'rgba(59,130,246,0.06)',
          border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8,
          fontSize: 12, color: '#1e40af',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Clock size={12} /> Shift: <strong>{cfg.shiftStartTime} – {cfg.shiftEndTime}</strong> ({cfg.shiftHours}h)
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            color: cfg.breakEnabled ? '#1e40af' : '#b91c1c',
            textDecoration: cfg.breakEnabled ? 'none' : 'line-through',
          }}>
            <Coffee size={12} /> Break: <strong>{cfg.breakEnabled ? `${cfg.breakStartTime} – ${cfg.breakEndTime} (${cfg.breakHours}h)` : 'DISABLED'}</strong>
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            color: cfg.overtimeEnabled ? '#1e40af' : '#b91c1c',
            textDecoration: cfg.overtimeEnabled ? 'none' : 'line-through',
          }}>
            <Flame size={12} /> OT: <strong>{cfg.overtimeEnabled ? `${cfg.overtimeRate}× enabled` : 'DISABLED'}</strong>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Target size={12} /> Thresholds: <strong>{cfg.earlyInThreshold}/{cfg.lateInThreshold}/{cfg.earlyOutThreshold}/{cfg.lateOutThreshold}m</strong>
          </span>
          <span style={{ marginLeft: 'auto', opacity: 0.7 }}>Multi-site shifts supported · Edit to add</span>
        </div>

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
            {isMultiDay ? 'Range totals · ' : ''}Showing {filteredTodayAttendance.length} of {todayAttendance.length}
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
                const displayRate = resolveHourlyRate(worker);
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
                          {worker.siteCount > 1 && (
                            <span className="am-site-count-badge" title={`Worked at ${worker.siteCount} sites`}>
                              <GitBranch size={10} /> {worker.siteCount} sites
                            </span>
                          )}
                        </div>
                      )}

                      {(worker.earlyIn || worker.lateIn || worker.lateOut || worker.earlyOut) && (
                        <div className="am-attendance-flags">
                          {worker.earlyIn && (
                            <span className="am-flag early-in" title={`Threshold: ${cfg.earlyInThreshold} min before ${cfg.shiftStartTime}`}>
                              <ArrowDownRight size={10} /> Early In
                            </span>
                          )}
                          {worker.lateIn && (
                            <span className="am-flag late-in" title={`${worker.lateInMinutes} min after ${cfg.shiftStartTime}`}>
                              <ArrowUpRight size={10} /> Late In{worker.lateInMinutes > 0 ? ` +${worker.lateInMinutes}m` : ''}
                            </span>
                          )}
                          {worker.lateOut && (
                            <span className="am-flag late-out" title={`${worker.lateOutMinutes} min after ${cfg.shiftEndTime}`}>
                              <ArrowUpRight size={10} /> Late Out{worker.lateOutMinutes > 0 ? ` +${worker.lateOutMinutes}m` : ''}
                            </span>
                          )}
                          {worker.earlyOut && (
                            <span className="am-flag early-out" title={`Threshold: ${cfg.earlyOutThreshold} min before ${cfg.shiftEndTime}`}>
                              <Minus size={10} /> Early Out
                            </span>
                          )}
                        </div>
                      )}

                      <div className="am-worker-stats">
                        <div className="am-worker-stat">
                          <span className="am-worker-stat-label">Rate</span>
                          <span className="am-worker-stat-value">
                            {fmtBDShort(displayRate)}
                          </span>
                        </div>
                        <div className="am-worker-stat">
                          <span className="am-worker-stat-label">Hours</span>
                          <span className="am-worker-stat-value">{worker.hoursWorked.toFixed(1)}h</span>
                        </div>
                        <div className="am-worker-stat">
                          <span className="am-worker-stat-label">Wage (BD)</span>
                          <span className="am-worker-stat-value" style={{ color: worker.wageEarned > 0 ? '#047857' : undefined }}>
                            {fmtBDShort(worker.wageEarned)}
                          </span>
                        </div>
                      </div>

                      {(worker.checkedInTime || worker.checkedOutTime) && (
                        <div className="am-worker-times">
                          {worker.checkedInTime && <span><LogIn size={11} /> {Utils.formatTime(worker.checkedInTime)}</span>}
                          {worker.checkedOutTime && <span><LogOut size={11} /> {Utils.formatTime(worker.checkedOutTime)}</span>}
                          {worker.breakEnabled && worker.breakStart && worker.breakEnd && (
                            <span title={`Break: ${Utils.formatTime(worker.breakStart)} – ${Utils.formatTime(worker.breakEnd)}`}>
                              <Coffee size={11} /> Brk {worker.breakHours.toFixed(1)}h
                            </span>
                          )}
                          {!worker.breakEnabled && (
                            <span style={{ color: '#b91c1c' }} title="Break disabled">
                              <Ban size={11} /> No Brk
                            </span>
                          )}
                          {worker.overtimeEnabled && worker.overtimeHours > 0 && (
                            <span style={{ color: '#d97706' }} title="Overtime hours">
                              <Flame size={11} /> OT {worker.overtimeHours.toFixed(1)}h
                            </span>
                          )}
                          {!worker.overtimeEnabled && (
                            <span style={{ color: '#b91c1c' }} title="Overtime disabled">
                              <Ban size={11} /> No OT
                            </span>
                          )}
                          {worker.shiftCount > 1 && (
                            <span style={{ color: '#8b5cf6' }} title="Multiple shifts">
                              <GitBranch size={11} /> {worker.shiftCount} shifts
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="am-worker-footer">
                      {isLoading === 'clocking-in' && <span className="am-loading-text">Clocking In...</span>}
                      {isLoading === 'clocking-out' && <span className="am-loading-text">Clocking Out...</span>}
                      {!isLoading && (
                        <>
                          {worker.record && (
                            <button className="am-btn am-btn-edit" onClick={() => openEditModal(worker.record, worker)} title="Edit shifts">
                              <Edit size={13} /> Edit Shifts
                            </button>
                          )}
                          {worker.status === 'working' && (
                            <button className="am-btn am-btn-out" onClick={() => handleClockOut(worker.id)}>
                              <LogOut size={13} /> Clock Out
                            </button>
                          )}
                          {worker.status === 'completed' && (
                            <span className="am-done-text"><CheckCircle size={13} /> Completed</span>
                          )}
                          {(worker.status === 'absent' || worker.status === 'pending') && (
                            <button className="am-btn am-btn-in"
                              onClick={() => openSiteModal({ type: 'worker-clockin', workerId: worker.id })}>
                              <LogIn size={13} /> Clock In
                            </button>
                          )}
                        </>
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
    const cfg = settings || DEFAULT_SETTINGS;
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
              <span className="label"><Banknote size={13} /> Wages (BD)</span>
              <span className="value" style={{ color: '#047857' }}>{fmtBDShort(teamStats?.wages || 0)}</span>
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
                const displayRate = resolveHourlyRate(worker);
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
                        {member.overtimeHours > 0 && <span style={{ color: '#d97706' }}><Flame size={11} /> OT {member.overtimeHours.toFixed(1)}h</span>}
                        {member.wageEarned > 0 && <span style={{ color: '#047857' }}><Banknote size={11} /> {fmtBDShort(member.wageEarned)}</span>}
                        {member.earlyIn && <span className="am-flag early-in"><ArrowDownRight size={10} /> Early In</span>}
                        {member.lateIn && <span className="am-flag late-in"><ArrowUpRight size={10} /> Late In{member.lateInMinutes > 0 ? ` +${member.lateInMinutes}m` : ''}</span>}
                        {member.lateOut && <span className="am-flag late-out"><ArrowUpRight size={10} /> Late Out{member.lateOutMinutes > 0 ? ` +${member.lateOutMinutes}m` : ''}</span>}
                        {member.earlyOut && <span className="am-flag early-out"><Minus size={10} /> Early Out</span>}
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
                        {member.attendance && (
                          <button className="am-btn-icon am-btn-icon-edit"
                            onClick={() => openEditModal(member.attendance, worker)}
                            title="Edit shifts">
                            <Edit size={14} />
                          </button>
                        )}
                        <button className="am-btn-icon" onClick={() => toggleMemberExpand(memberId)}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="am-member-expanded">
                        <div className="am-expand-item"><User size={12} /><span><strong>ID:</strong> {worker.id}</span></div>
                        <div className="am-expand-item"><Briefcase size={12} /><span><strong>Role:</strong> {worker.role || 'N/A'}</span></div>
                        <div className="am-expand-item">
                          <Banknote size={12} />
                          <span><strong>Rate:</strong> {displayRate.toFixed(3)} BD/hr</span>
                        </div>
                        <div className="am-expand-item"><Phone size={12} /><span><strong>Phone:</strong> {worker.phone || 'N/A'}</span></div>
                        {member.siteName && <div className="am-expand-item"><Building2 size={12} /><span><strong>Site:</strong> {member.siteName}</span></div>}
                        {member.checkedIn && <div className="am-expand-item"><LogIn size={12} /><span><strong>In:</strong> {Utils.formatTime(member.checkedIn)}</span></div>}
                        {member.checkedOut && <div className="am-expand-item"><LogOut size={12} /><span><strong>Out:</strong> {Utils.formatTime(member.checkedOut)}</span></div>}
                        {member.breakEnabled && member.breakHours > 0 && <div className="am-expand-item"><Coffee size={12} /><span><strong>Break:</strong> {member.breakHours.toFixed(2)}h</span></div>}
                        {member.overtimeEnabled && member.overtimeHours > 0 && <div className="am-expand-item"><Flame size={12} /><span><strong>OT:</strong> {member.overtimeHours.toFixed(2)}h</span></div>}
                        {member.shiftCount > 1 && <div className="am-expand-item"><GitBranch size={12} /><span><strong>Shifts:</strong> {member.shiftCount} sites</span></div>}
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
    const cfg = settings || DEFAULT_SETTINGS;

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
            <Banknote size={14} /> Salary Report (BD)
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
                  <span className="label"><Flame size={13} /> OT Hours</span>
                  <span className="value" style={{ color: '#d97706' }}>{attendanceReport.totalOvertime.toFixed(1)}h</span>
                </div>
                <div className="am-report-summary-item">
                  <span className="label"><Banknote size={13} /> Wages (BD)</span>
                  <span className="value" style={{ color: '#047857' }}>{fmtBDShort(attendanceReport.totalWages)}</span>
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
                      <th className="right">Wages (BD)</th>
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
                        <td className="right am-td-green">{fmtBDShort(w.totalWages)}</td>
                        <td className="center">
                          <button className="am-btn-small" onClick={() => {
                            const hourlyRate = resolveHourlyRate(w.worker);
                            const basicHours = w.totalNormal || (w.totalHours - w.totalOvertime);
                            const basicSalary = basicHours * hourlyRate;
                            const overtimeSalary = cfg.overtimeEnabled
                              ? w.totalOvertime * hourlyRate * cfg.overtimeRate
                              : 0;
                            const totalSalary = basicSalary + overtimeSalary;

                            const pct = Number(w.worker.deductionPercentage || 0);
                            const enabled = !!w.worker.deductionEnabled;
                            const percentageDeduction = (enabled && pct > 0) ? (totalSalary * (pct / 100)) : 0;
                            const totalDeductions = percentageDeduction;
                            const netSalary = totalSalary - totalDeductions;

                            const salaryData = {
                              ...w,
                              basicHours,
                              basicSalary,
                              overtimeSalary,
                              totalSalary,
                              rate: hourlyRate,
                              loans: [], advances: [],
                              totalLoanDeduction: 0, totalAdvanceDeduction: 0,
                              deductionPercentage: pct,
                              deductionEnabled: enabled,
                              percentageDeduction,
                              totalDeductions,
                              netSalary,
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
                <span className="label"><Banknote size={13} /> Gross</span>
                <span className="value">{fmtBDShort(salaryReportData.summary?.totalGrossSalary || 0)}</span>
              </div>
              <div className="am-report-summary-item">
                <span className="label"><Percent size={13} /> % Deduct</span>
                <span className="value" style={{ color: '#7c3aed' }}>
                  {fmtBDShort(salaryReportData.summary?.totalPercentageDeduction || 0)}
                </span>
              </div>
              <div className="am-report-summary-item">
                <span className="label"><Shield size={13} /> Loan</span>
                <span className="value" style={{ color: '#b91c1c' }}>{fmtBDShort(salaryReportData.summary?.totalLoanDeduction || 0)}</span>
              </div>
              <div className="am-report-summary-item">
                <span className="label"><Wallet size={13} /> Advance</span>
                <span className="value" style={{ color: '#b45309' }}>{fmtBDShort(salaryReportData.summary?.totalAdvanceDeduction || 0)}</span>
              </div>
              <div className="am-report-summary-item">
                <span className="label"><CheckCircle size={13} /> Net (BD)</span>
                <span className="value" style={{ color: '#047857' }}>{fmtBDShort(salaryReportData.summary?.totalNetSalary || 0)}</span>
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
                    <th className="right">% Deduct</th>
                    <th className="right">Loan</th>
                    <th className="right">Advance</th>
                    <th className="right">Total Deduct</th>
                    <th className="right">Net (BD)</th>
                    <th className="center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((w, i) => {
                    const pctDeduction = w.deductions?.percentageDeduction || w.percentageDeduction || 0;
                    const pctEnabled = w.deductions?.deductionEnabled ?? w.deductionEnabled;
                    const pctValue = w.deductions?.deductionPercentage ?? w.deductionPercentage;
                    return (
                      <tr key={w.workerId || i} style={{ animationDelay: `${Math.min(i * 30, 400)}ms` }}>
                        <td><strong>{w.workerName}</strong></td>
                        <td>{w.role || 'N/A'}</td>
                        <td className="right">{w.attendance?.presentDays || 0}/{w.attendance?.totalDays || 0}</td>
                        <td className="right">{w.attendance?.normalHours?.toFixed(1) || '0.0'}h</td>
                        <td className="right">{w.attendance?.overtimeHours?.toFixed(1) || '0.0'}h</td>
                        <td className="right am-td-green">{fmtBDShort(w.salary?.grossSalary || 0)}</td>
                        <td className="right" style={{ color: pctEnabled && pctValue > 0 ? '#7c3aed' : '#94a3b8' }}>
                          {pctEnabled && pctValue > 0
                            ? <span className="am-pct-deduct" title={`${Number(pctValue).toFixed(2)}%`}>
                              {fmtBDShort(pctDeduction)}
                            </span>
                            : '—'}
                        </td>
                        <td className="right am-td-red">
                          {w.deductions?.totalLoanDeduction > 0 ? fmtBDShort(w.deductions.totalLoanDeduction) : '—'}
                        </td>
                        <td className="right am-td-amber">
                          {w.deductions?.totalAdvanceDeduction > 0 ? fmtBDShort(w.deductions.totalAdvanceDeduction) : '—'}
                        </td>
                        <td className="right am-td-red">{fmtBDShort(w.deductions?.totalDeductions || 0)}</td>
                        <td className="right am-td-green"><strong>{fmtBDShort(w.netSalary || 0)}</strong></td>
                        <td className="center">
                          <button className="am-btn-small" onClick={() => handlePrintSalarySlip(w)}>
                            <Printer size={12} /> Slip
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
  // SETTINGS TAB
  // ============================================
  const renderSettingsTab = () => {
    if (settingsLoading || !settingsForm) {
      return (
        <div className="am-loading">
          <div className="am-loading-spinner" />
          Loading settings...
        </div>
      );
    }

    const update = (patch) => setSettingsForm(prev => ({ ...prev, ...patch }));

    return (
      <div className="am-view">
        <div className="am-settings-grid">

          <div className="am-card am-settings-card">
            <div className="am-card-header">
              <div className="am-card-title">
                <span className="am-card-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                  <Clock size={16} />
                </span>
                <div>
                  <h4>Shift Window</h4>
                  <span>Expected daily work hours (applies to all shifts)</span>
                </div>
              </div>
            </div>
            <div className="am-settings-form">
              <div className="am-settings-field">
                <label>Shift Start Time</label>
                <input type="time" className="am-input"
                  value={settingsForm.shiftStartTime || '07:00'}
                  onChange={(e) => update({ shiftStartTime: e.target.value })} />
              </div>
              <div className="am-settings-field">
                <label>Shift End Time</label>
                <input type="time" className="am-input"
                  value={settingsForm.shiftEndTime || '17:00'}
                  onChange={(e) => update({ shiftEndTime: e.target.value })} />
              </div>
              <div className="am-settings-field">
                <label>Shift Hours / Day</label>
                <input type="number" step="0.25" min="0" className="am-input"
                  value={settingsForm.shiftHours}
                  onChange={(e) => update({ shiftHours: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
          </div>

          <div className="am-card am-settings-card">
            <div className="am-card-header">
              <div className="am-card-title">
                <span className="am-card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                  <Coffee size={16} />
                </span>
                <div>
                  <h4>Break Times</h4>
                  <span>Applied per shift (per site)</span>
                </div>
              </div>
              <button
                type="button"
                className={`am-toggle ${settingsForm.breakEnabled ? 'on' : 'off'}`}
                onClick={() => update({ breakEnabled: !settingsForm.breakEnabled })}
                title={settingsForm.breakEnabled ? 'Break time will be deducted' : 'Break time will NOT be deducted'}
              >
                {settingsForm.breakEnabled ? <><Coffee size={12} /> Enabled</> : <><Ban size={12} /> Disabled</>}
              </button>
            </div>
            <div className="am-settings-form">
              <div className="am-settings-field">
                <label>Break Start</label>
                <input type="time" className="am-input"
                  value={settingsForm.breakStartTime || '12:00'}
                  disabled={!settingsForm.breakEnabled}
                  onChange={(e) => update({ breakStartTime: e.target.value })} />
              </div>
              <div className="am-settings-field">
                <label>Break End</label>
                <input type="time" className="am-input"
                  value={settingsForm.breakEndTime || '13:00'}
                  disabled={!settingsForm.breakEnabled}
                  onChange={(e) => update({ breakEndTime: e.target.value })} />
              </div>
              <div className="am-settings-field">
                <label>Break Hours</label>
                <input type="number" step="0.25" min="0" className="am-input"
                  value={settingsForm.breakHours}
                  disabled={!settingsForm.breakEnabled}
                  onChange={(e) => update({ breakHours: parseFloat(e.target.value) || 0 })} />
              </div>
              {!settingsForm.breakEnabled && (
                <div className="am-settings-hint" style={{ gridColumn: '1 / -1', color: '#b91c1c' }}>
                  <AlertCircle size={13} />
                  <span>Break is disabled. Total hours = raw clock-in → clock-out time per shift.</span>
                </div>
              )}
            </div>
          </div>

          <div className="am-card am-settings-card">
            <div className="am-card-header">
              <div className="am-card-title">
                <span className="am-card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                  <Flame size={16} />
                </span>
                <div>
                  <h4>Overtime</h4>
                  <span>Extra hours pay rate (aggregated across shifts)</span>
                </div>
              </div>
              <button
                type="button"
                className={`am-toggle ${settingsForm.overtimeEnabled ? 'on' : 'off'}`}
                onClick={() => update({ overtimeEnabled: !settingsForm.overtimeEnabled })}
                title={settingsForm.overtimeEnabled ? 'OT will be paid at multiplier rate' : 'OT is disabled — all hours at normal rate'}
              >
                {settingsForm.overtimeEnabled ? <><Flame size={12} /> Enabled</> : <><Ban size={12} /> Disabled</>}
              </button>
            </div>
            <div className="am-settings-form">
              <div className="am-settings-field">
                <label>Overtime Rate (multiplier)</label>
                <input type="number" step="0.1" min="0" className="am-input"
                  value={settingsForm.overtimeRate}
                  disabled={!settingsForm.overtimeEnabled}
                  onChange={(e) => update({ overtimeRate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="am-settings-hint">
                <Info size={13} />
                <span>
                  {settingsForm.overtimeEnabled
                    ? `Paid hours beyond ${settingsForm.shiftHours}h (per shift) paid at ${settingsForm.overtimeRate}× hourly rate. Set 1 for no premium.`
                    : 'OT disabled — all paid hours count as normal hours.'}
                </span>
              </div>
            </div>
          </div>

          <div className="am-card am-settings-card am-settings-card-wide">
            <div className="am-card-header">
              <div className="am-card-title">
                <span className="am-card-icon" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                  <Target size={16} />
                </span>
                <div>
                  <h4>Early / Late Thresholds</h4>
                  <span>Minutes beyond shift that flag a record</span>
                </div>
              </div>
            </div>

            <div className="am-settings-form am-settings-form-4">
              <div className="am-settings-field">
                <label><ArrowDownRight size={12} /> Early In</label>
                <input type="number" min="0" className="am-input"
                  value={settingsForm.earlyInThreshold}
                  onChange={(e) => update({ earlyInThreshold: parseInt(e.target.value) || 0 })} />
                <span className="am-settings-unit">min</span>
              </div>
              <div className="am-settings-field">
                <label><ArrowUpRight size={12} /> Late In</label>
                <input type="number" min="0" className="am-input"
                  value={settingsForm.lateInThreshold}
                  onChange={(e) => update({ lateInThreshold: parseInt(e.target.value) || 0 })} />
                <span className="am-settings-unit">min</span>
              </div>
              <div className="am-settings-field">
                <label><Minus size={12} /> Early Out</label>
                <input type="number" min="0" className="am-input"
                  value={settingsForm.earlyOutThreshold}
                  onChange={(e) => update({ earlyOutThreshold: parseInt(e.target.value) || 0 })} />
                <span className="am-settings-unit">min</span>
              </div>
              <div className="am-settings-field">
                <label><ArrowUpRight size={12} /> Late Out</label>
                <input type="number" min="0" className="am-input"
                  value={settingsForm.lateOutThreshold}
                  onChange={(e) => update({ lateOutThreshold: parseInt(e.target.value) || 0 })} />
                <span className="am-settings-unit">min</span>
              </div>
            </div>

            <div className="am-settings-flags-row">
              {[
                { key: 'countEarlyIn', label: 'Count Early In' },
                { key: 'countLateIn', label: 'Count Late In' },
                { key: 'countEarlyOut', label: 'Count Early Out' },
                { key: 'countLateOut', label: 'Count Late Out' },
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  className={`am-flag-toggle ${settingsForm[f.key] ? 'on' : 'off'}`}
                  onClick={() => update({ [f.key]: !settingsForm[f.key] })}
                >
                  <span className="am-flag-toggle-dot" />
                  {f.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        <div className="am-settings-actions">
          <button className="am-btn am-btn-secondary" onClick={handleResetSettings} disabled={settingsSaving}>
            <RotateCcw size={14} /> Reset
          </button>
          <button className="am-btn am-btn-primary" onClick={handleSaveSettings} disabled={settingsSaving}>
            <Save size={14} /> {settingsSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
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
  // EDIT ATTENDANCE MODAL — SHIFT AWARE
  // ============================================
  const renderEditModal = () => {
    if (!showEditModal || !editRecord) return null;
    const worker = editRecord._worker || {};
    const rawDate = editRecord.date || '';
    const dateStr = normalizeDate(rawDate);
    const cfg = settings || DEFAULT_SETTINGS;

    const preview = (() => {
      const shiftsForCalc = editShiftDrafts.map(s => ({
        checkedIn: s.checkedIn ? buildISO(dateStr, s.checkedIn) : null,
        checkedOut: s.checkedOut ? buildISO(dateStr, s.checkedOut) : null,
        breakStart: s.breakEnabled && s.breakStart ? buildISO(dateStr, s.breakStart) : null,
        breakEnd: s.breakEnabled && s.breakEnd ? buildISO(dateStr, s.breakEnd) : null,
        date: dateStr,
        breakEnabled: s.breakEnabled,
        overtimeEnabled: s.overtimeEnabled,
      }));
      const agg = computeAggregateHours(shiftsForCalc, cfg);
      const wage = computeWage(agg.normalHours, agg.overtimeHours, worker, cfg, {
        overtimeEnabled: agg.overtimeEnabled,
      });
      return {
        hours: agg.hoursWorked,
        overtime: agg.overtimeHours,
        normal: agg.normalHours,
        breakH: agg.breakHours,
        wage,
        breakEnabled: agg.breakEnabled,
        overtimeEnabled: agg.overtimeEnabled,
        shiftCount: agg.shiftCount,
      };
    })();

    return (
      <ModalPortal>
        <div className="am-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeEditModal(); }}>
          <div className="am-modal-content am-edit-modal am-edit-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="am-modal-header" style={{ background: 'linear-gradient(135deg, #15dd9b, #10b981)' }}>
              <div className="am-modal-header-left">
                <div className="am-modal-icon"><GitBranch size={18} /></div>
                <div>
                  <h3>Edit Attendance Shifts</h3>
                  <p className="am-modal-sub">
                    {worker.name || 'Worker'} · {Utils.formatDate(dateStr)} · {preview.shiftCount} shift{preview.shiftCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button className="am-modal-close" onClick={closeEditModal}>
                <X size={18} />
              </button>
            </div>
            <div className="am-modal-body">
              {editShiftsLoading ? (
                <div className="am-loading"><div className="am-loading-spinner" /> Loading shifts...</div>
              ) : (
                <>
                  <div className="am-shifts-list">
                    <div className="am-shifts-list-head">
                      <span className="am-shifts-list-title">
                        <GitBranch size={14} /> Shifts ({editShiftDrafts.length})
                      </span>
                      <button className="am-btn am-btn-primary am-btn-sm" onClick={addShiftDraft}>
                        <Plus size={13} /> Add Shift
                      </button>
                    </div>

                    {editShiftDrafts.map((s, idx) => {
                      const siteName = resolveSiteName(s.siteId);
                      const shiftCalc = computeShiftHours({
                        checkedIn: s.checkedIn ? buildISO(dateStr, s.checkedIn) : null,
                        checkedOut: s.checkedOut ? buildISO(dateStr, s.checkedOut) : null,
                        breakStart: s.breakEnabled && s.breakStart ? buildISO(dateStr, s.breakStart) : null,
                        breakEnd: s.breakEnabled && s.breakEnd ? buildISO(dateStr, s.breakEnd) : null,
                        date: dateStr,
                        breakEnabled: s.breakEnabled,
                        overtimeEnabled: s.overtimeEnabled,
                      }, cfg);

                      return (
                        <div key={s._key} className="am-shift-card">
                          <div className="am-shift-card-head">
                            <div className="am-shift-index">
                              <span className="am-shift-badge">#{idx + 1}</span>
                              {siteName && (
                                <span className="am-shift-site-tag">
                                  <MapPin size={11} /> {siteName}
                                </span>
                              )}
                            </div>
                            <div className="am-shift-card-actions">
                              <button className="am-btn-icon" onClick={() => moveShiftDraft(s._key, -1)}
                                disabled={idx === 0} title="Move up">
                                <ArrowUp size={13} />
                              </button>
                              <button className="am-btn-icon" onClick={() => moveShiftDraft(s._key, 1)}
                                disabled={idx === editShiftDrafts.length - 1} title="Move down">
                                <ArrowDown size={13} />
                              </button>
                              <button className="am-btn-icon" onClick={() => duplicateShiftDraft(s._key)}
                                title="Duplicate">
                                <Copy size={13} />
                              </button>
                              <button className="am-btn-icon am-btn-icon-danger"
                                onClick={() => removeShiftDraft(s._key)}
                                title="Remove">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="am-shift-grid">
                            <div className="am-edit-field">
                              <label><Building2 size={12} /> Site</label>
                              <select value={s.siteId}
                                onChange={(e) => updateShiftDraft(s._key, { siteId: e.target.value })}
                                className="am-select">
                                <option value="">— No site —</option>
                                {sites.map(site => (
                                  <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="am-edit-field">
                              <label><LogIn size={12} /> Check-In</label>
                              <input type="time" value={s.checkedIn}
                                onChange={(e) => updateShiftDraft(s._key, { checkedIn: e.target.value })}
                                className="am-input" />
                            </div>
                            <div className="am-edit-field">
                              <label><LogOut size={12} /> Check-Out</label>
                              <input type="time" value={s.checkedOut}
                                onChange={(e) => updateShiftDraft(s._key, { checkedOut: e.target.value })}
                                className="am-input" />
                            </div>
                          </div>

                          <div className="am-shift-toggle-row">
                            <button
                              type="button"
                              className={`am-toggle am-toggle-sm ${s.breakEnabled ? 'on' : 'off'}`}
                              onClick={() => updateShiftDraft(s._key, { breakEnabled: !s.breakEnabled })}
                            >
                              {s.breakEnabled ? <><Coffee size={11} /> Break on</> : <><Ban size={11} /> Break off</>}
                            </button>
                            <button
                              type="button"
                              className={`am-toggle am-toggle-sm ${s.overtimeEnabled ? 'on' : 'off'}`}
                              onClick={() => updateShiftDraft(s._key, { overtimeEnabled: !s.overtimeEnabled })}
                            >
                              {s.overtimeEnabled ? <><Flame size={11} /> OT on</> : <><Ban size={11} /> OT off</>}
                            </button>
                            <span className="am-shift-hours-mini">
                              <Timer size={11} /> {shiftCalc.hours.toFixed(2)}h
                              {s.overtimeEnabled && shiftCalc.overtime > 0 && (
                                <> · <Flame size={10} style={{ verticalAlign: 'middle' }} /> {shiftCalc.overtime.toFixed(2)}h OT</>
                              )}
                            </span>
                          </div>

                          {s.breakEnabled && (
                            <div className="am-shift-break-row">
                              <div className="am-edit-field">
                                <label><Coffee size={12} /> Break start</label>
                                <input type="time" value={s.breakStart}
                                  onChange={(e) => updateShiftDraft(s._key, { breakStart: e.target.value })}
                                  className="am-input" />
                              </div>
                              <div className="am-edit-field">
                                <label><Coffee size={12} /> Break end</label>
                                <input type="time" value={s.breakEnd}
                                  onChange={(e) => updateShiftDraft(s._key, { breakEnd: e.target.value })}
                                  className="am-input" />
                              </div>
                            </div>
                          )}

                          <div className="am-edit-field am-edit-full">
                            <label><FileText size={12} /> Notes</label>
                            <input type="text" value={s.notes}
                              onChange={(e) => updateShiftDraft(s._key, { notes: e.target.value })}
                              className="am-input" placeholder="Optional shift notes" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="am-edit-preview">
                    <div className="am-edit-preview-item">
                      <span>Normal</span>
                      <strong>{preview.normal.toFixed(2)} h</strong>
                    </div>
                    <div className="am-edit-preview-item">
                      <span>Break</span>
                      <strong style={{ color: preview.breakEnabled ? undefined : '#94a3b8', textDecoration: preview.breakEnabled ? 'none' : 'line-through' }}>
                        {preview.breakH.toFixed(2)} h
                      </strong>
                    </div>
                    <div className="am-edit-preview-item">
                      <span>OT</span>
                      <strong style={{ color: preview.overtimeEnabled && preview.overtime > 0 ? '#d97706' : '#94a3b8', textDecoration: preview.overtimeEnabled ? 'none' : 'line-through' }}>
                        {preview.overtime.toFixed(2)} h
                      </strong>
                    </div>
                    <div className="am-edit-preview-item">
                      <span>Total</span>
                      <strong>{preview.hours.toFixed(2)} h</strong>
                    </div>
                    <div className="am-edit-preview-item">
                      <span>Wage (BD)</span>
                      <strong style={{ color: '#047857' }}>{fmtBD(preview.wage)}</strong>
                    </div>
                  </div>

                  <div className="am-shift-record-meta">
                    <div className="am-edit-field">
                      <label><CheckCircle size={12} /> Present</label>
                      <div className="am-toggle-wrap">
                        <button type="button"
                          className={`am-toggle ${editMeta.present ? 'on' : 'off'}`}
                          onClick={() => setEditMeta(prev => ({ ...prev, present: !prev.present }))}>
                          {editMeta.present ? 'Present' : 'Absent'}
                        </button>
                      </div>
                    </div>
                    <div className="am-edit-field am-edit-full">
                      <label><Building2 size={12} /> Primary Site (overrides shift default)</label>
                      <select value={editMeta.siteId}
                        onChange={(e) => setEditMeta(prev => ({ ...prev, siteId: e.target.value }))}
                        className="am-select">
                        <option value="">— Auto (from first shift) —</option>
                        {sites.map(site => (
                          <option key={site.id} value={site.id}>{site.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="am-edit-field am-edit-full">
                      <label><FileText size={12} /> Record Notes</label>
                      <textarea value={editMeta.notes}
                        onChange={(e) => setEditMeta(prev => ({ ...prev, notes: e.target.value }))}
                        className="am-input" rows={2} placeholder="Optional notes for the attendance record" />
                    </div>
                  </div>

                  <div style={{
                    fontSize: 11, color: '#6b7280', marginTop: 8,
                    padding: '6px 10px', background: 'rgba(139,92,246,0.06)',
                    borderRadius: 6, borderLeft: '3px solid #8b5cf6',
                  }}>
                    <Info size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Settings: shift {cfg.shiftStartTime}–{cfg.shiftEndTime} ({cfg.shiftHours}h),
                    break {cfg.breakEnabled ? `${cfg.breakStartTime}–${cfg.breakEndTime} (${cfg.breakHours}h)` : 'DISABLED'},
                    OT {cfg.overtimeEnabled ? `${cfg.overtimeRate}×` : 'DISABLED'}.
                    Total paid hours = sum of all shifts.
                  </div>

                  <div className="am-edit-actions">
                    <button className="am-btn am-btn-primary" onClick={handleSaveEdit} disabled={editLoading}>
                      {editLoading ? 'Saving...' : <><Save size={14} /> Save Shifts</>}
                    </button>
                    <button className="am-btn am-btn-secondary" onClick={closeEditModal} disabled={editLoading}>
                      Cancel
                    </button>
                  </div>
                </>
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
    const cfg = settings || DEFAULT_SETTINGS;
    const displayRate = resolveHourlyRate(worker);
    return (
      <div className="am-row-tooltip" style={{ position: 'fixed', left: workerTooltipPos.x, top: workerTooltipPos.y, zIndex: 9998 }}>
        <div className="am-row-tooltip-title"><User size={13} /> {worker.name}</div>
        <div className="am-row-tooltip-row"><Briefcase size={11} /><span>Role:</span><strong>{worker.role || 'N/A'}</strong></div>
        <div className="am-row-tooltip-row"><Building2 size={11} /><span>Site:</span><strong style={{ color: worker.siteName ? '#047857' : '#b91c1c' }}>{worker.siteName || 'Not assigned'}</strong></div>
        {worker.siteCount > 1 && (
          <div className="am-row-tooltip-row">
            <GitBranch size={11} /><span>Sites:</span>
            <strong style={{ color: '#8b5cf6' }}>
              {worker.siteIds.map(id => resolveSiteName(id)).filter(Boolean).join(' → ')}
            </strong>
          </div>
        )}
        <div className="am-row-tooltip-row"><Clock size={11} /><span>Status:</span><strong style={{ textTransform: 'capitalize' }}>{worker.status}</strong></div>
        <div className="am-row-tooltip-row">
          <Banknote size={11} /><span>Rate/hr:</span>
          <strong style={{ color: '#047857' }}>{displayRate.toFixed(3)} BD</strong>
        </div>
        {worker.checkedInTime && <div className="am-row-tooltip-row"><LogIn size={11} /><span>In:</span><strong>{Utils.formatTime(worker.checkedInTime)}</strong></div>}
        {worker.checkedOutTime && <div className="am-row-tooltip-row"><LogOut size={11} /><span>Out:</span><strong>{Utils.formatTime(worker.checkedOutTime)}</strong></div>}
        {worker.breakEnabled && worker.breakStart && worker.breakEnd && (
          <div className="am-row-tooltip-row">
            <Coffee size={11} /><span>Break:</span>
            <strong>{Utils.formatTime(worker.breakStart)} – {Utils.formatTime(worker.breakEnd)} ({worker.breakHours.toFixed(2)}h)</strong>
          </div>
        )}
        {!worker.breakEnabled && (
          <div className="am-row-tooltip-row">
            <Ban size={11} /><span>Break:</span><strong style={{ color: '#b91c1c' }}>Disabled</strong>
          </div>
        )}
        {worker.hoursWorked > 0 && <div className="am-row-tooltip-row"><Timer size={11} /><span>Hours:</span><strong>{worker.hoursWorked.toFixed(2)}h</strong></div>}
        {worker.overtimeEnabled && worker.overtimeHours > 0 && <div className="am-row-tooltip-row"><Flame size={11} /><span>OT:</span><strong style={{ color: '#d97706' }}>{worker.overtimeHours.toFixed(2)}h</strong></div>}
        {!worker.overtimeEnabled && (
          <div className="am-row-tooltip-row">
            <Ban size={11} /><span>OT:</span><strong style={{ color: '#b91c1c' }}>Disabled</strong>
          </div>
        )}
        {worker.wageEarned > 0 && <div className="am-row-tooltip-row"><Banknote size={11} /><span>Wage:</span><strong style={{ color: '#047857' }}>{fmtBD(worker.wageEarned)}</strong></div>}
        {worker.earlyIn && <div className="am-row-tooltip-row"><ArrowDownRight size={11} /><span>Flag:</span><strong style={{ color: '#0284c7' }}>Early In</strong></div>}
        {worker.lateIn && <div className="am-row-tooltip-row"><ArrowUpRight size={11} /><span>Flag:</span><strong style={{ color: '#d97706' }}>Late In +{worker.lateInMinutes}m</strong></div>}
        {worker.lateOut && <div className="am-row-tooltip-row"><ArrowUpRight size={11} /><span>Flag:</span><strong style={{ color: '#7c3aed' }}>Late Out +{worker.lateOutMinutes}m</strong></div>}
        {worker.earlyOut && <div className="am-row-tooltip-row"><Minus size={11} /><span>Flag:</span><strong style={{ color: '#dc2626' }}>Early Out</strong></div>}
        <div className="am-row-tooltip-row" style={{ opacity: 0.7, borderTop: '1px solid rgba(148,163,184,0.3)', marginTop: 4, paddingTop: 4 }}>
          <Info size={11} /><span>Settings:</span>
          <strong style={{ fontSize: 10 }}>
            {cfg.shiftStartTime}–{cfg.shiftEndTime} · {cfg.shiftHours}h ·
            Brk {cfg.breakEnabled ? `${cfg.breakHours}h` : 'off'} ·
            OT {cfg.overtimeEnabled ? `${cfg.overtimeRate}×` : 'off'}
          </strong>
        </div>
      </div>
    );
  };

  const renderMemberTooltip = () => {
    if (!hoveredMember) return null;
    const member = (teamAttendance?.members || []).find(m => (m.id || m.worker?.id) === hoveredMember);
    if (!member) return null;
    const worker = member.worker || {};
    const displayRate = resolveHourlyRate(worker);
    return (
      <div className="am-row-tooltip" style={{ position: 'fixed', left: memberTooltipPos.x, top: memberTooltipPos.y, zIndex: 9998 }}>
        <div className="am-row-tooltip-title"><User size={13} /> {worker.name}</div>
        <div className="am-row-tooltip-row"><Briefcase size={11} /><span>Role:</span><strong>{worker.role || 'N/A'}</strong></div>
        <div className="am-row-tooltip-row"><Building2 size={11} /><span>Site:</span><strong style={{ color: member.siteName ? '#047857' : '#b91c1c' }}>{member.siteName || 'Not assigned'}</strong></div>
        <div className="am-row-tooltip-row">
          <Banknote size={11} /><span>Rate/hr:</span>
          <strong style={{ color: '#047857' }}>{displayRate.toFixed(3)} BD</strong>
        </div>
        {member.checkedIn && <div className="am-row-tooltip-row"><LogIn size={11} /><span>In:</span><strong>{Utils.formatTime(member.checkedIn)}</strong></div>}
        {member.checkedOut && <div className="am-row-tooltip-row"><LogOut size={11} /><span>Out:</span><strong>{Utils.formatTime(member.checkedOut)}</strong></div>}
        {member.breakEnabled && member.breakHours > 0 && <div className="am-row-tooltip-row"><Coffee size={11} /><span>Break:</span><strong>{member.breakHours.toFixed(2)}h</strong></div>}
        {member.overtimeEnabled && member.overtimeHours > 0 && <div className="am-row-tooltip-row"><Flame size={11} /><span>OT:</span><strong>{member.overtimeHours.toFixed(2)}h</strong></div>}
        {member.earlyIn && <div className="am-row-tooltip-row"><ArrowDownRight size={11} /><span>Flag:</span><strong style={{ color: '#0284c7' }}>Early In</strong></div>}
        {member.lateIn && <div className="am-row-tooltip-row"><ArrowUpRight size={11} /><span>Flag:</span><strong style={{ color: '#d97706' }}>Late In{member.lateInMinutes > 0 ? ` +${member.lateInMinutes}m` : ''}</strong></div>}
        {member.lateOut && <div className="am-row-tooltip-row"><ArrowUpRight size={11} /><span>Flag:</span><strong style={{ color: '#7c3aed' }}>Late Out{member.lateOutMinutes > 0 ? ` +${member.lateOutMinutes}m` : ''}</strong></div>}
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

      <div className="am-header">
        <div className="am-header-left">
          <div className="am-header-icon">
            <Clock size={22} />
            <span className="am-header-badge"><Sparkles size={10} /> ATTENDANCE</span>
          </div>
          <div>
            <h2>Attendance &amp; Time Tracking</h2>
            <p className="am-header-subtitle">
              {dayStats.present} present · {dayStats.working} working · {dayStats.totalHours.toFixed(1)}h logged · {fmtBD(dayStats.totalWages)}
            </p>
          </div>
        </div>
        <div className="am-header-right">
          <button className="am-btn am-btn-ghost" onClick={() => refreshData()}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="am-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'workers', label: 'Workers', icon: Users, badge: dayStats.totalWorkers },
          { id: 'teams', label: 'Teams', icon: Users2 },
          { id: 'reports', label: 'Reports', icon: FileText },
          { id: 'settings', label: 'Settings', icon: Sliders },
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

      {viewMode !== 'settings' && renderDateFilterBar()}

      {viewMode === 'teams' && (
        <div className="am-date-bar">
          <label><CalendarDays size={14} /> Select Date:</label>
          <input type="date" value={selectedDate}
            onChange={e => { setSelectedDate(e.target.value); setActiveDateFilter('custom'); setCustomDateFrom(e.target.value); setCustomDateTo(e.target.value); }}
            className="am-input" />
        </div>
      )}

      {error && <div className="am-message error"><AlertCircle size={15} /> {error}</div>}
      {success && <div className="am-message success"><CheckCircle size={15} /> {success}</div>}

      {viewMode === 'overview' && renderOverviewTab()}
      {viewMode === 'workers' && renderWorkersTab()}
      {viewMode === 'teams' && renderTeamsTab()}
      {viewMode === 'reports' && renderReportsTab()}
      {viewMode === 'settings' && renderSettingsTab()}

      {renderSiteModal()}
      {renderEditModal()}
      {renderWorkerTooltip()}
      {renderMemberTooltip()}
    </div>
  );
};

export default AttendanceManager;