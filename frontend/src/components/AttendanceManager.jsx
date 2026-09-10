// src/components/AttendanceManager.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Users,
  UserCheck,
  Clock,
  Calendar,
  Users2,
  Building2,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Printer,
  ChevronRight,
  Eye,
  X,
  Download,
  User,
  Settings,
  Award,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Wallet,
  Receipt,
  AlertCircle,
  CheckCircle,
  LayoutDashboard,
  HardHat,
  Timer,
  Activity,
  Gauge,
  Sparkles,
  Crown,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Zap,
  Shield,
  Plus,
  Edit,
  Trash2,
  Save,
  UserPlus,
  LogIn,
  LogOut,
  PlayCircle,
  StopCircle,
  CalendarDays,
  FileSpreadsheet,
  Package,
  Box,
  Layers
} from 'lucide-react';
import Utils from '../utils/Utils';
import './AttendanceManager.css';
import letterheadHeader from '../assets/letterhead-header.png';
import letterheadFooter from '../assets/letterhead-footer.png';
import background from '../assets/background.png';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AttendanceManager = ({ data, clockInWorker, clockOutWorker, refreshData }) => {
  // ============================================
  // STATE
  // ============================================
  const [selectedDate, setSelectedDate] = useState(Utils.today());
  const [loading, setLoading] = useState({});
  const [viewMode, setViewMode] = useState('workers');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamAttendance, setTeamAttendance] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamActionLoading, setTeamActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedMembers, setExpandedMembers] = useState({});
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Hover state for worker/team rows (to show site tooltip)
  const [hoveredWorker, setHoveredWorker] = useState(null);
  const [workerTooltipPos, setWorkerTooltipPos] = useState({ x: 0, y: 0 });
  const [hoveredMember, setHoveredMember] = useState(null);
  const [memberTooltipPos, setMemberTooltipPos] = useState({ x: 0, y: 0 });

  // Search/filter state for workers and team members
  const [workerSearchTerm, setWorkerSearchTerm] = useState('');
  const [workerStatusFilter, setWorkerStatusFilter] = useState('all');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');

  // ===== SITE SELECTION MODAL STATE =====
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [siteModalContext, setSiteModalContext] = useState(null);

  // Reports state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedWorkerId, setSelectedWorkerId] = useState('all');
  const [selectedReportWorkerId, setSelectedReportWorkerId] = useState('all');
  const [reportViewMode, setReportViewMode] = useState('attendance');
  const [expandedReportWorkers, setExpandedReportWorkers] = useState({});
  const [viewingSalarySlip, setViewingSalarySlip] = useState(null);
  const [salarySlipWorker, setSalarySlipWorker] = useState(null);

  // Salary report data from API
  const [salaryReportData, setSalaryReportData] = useState(null);
  const [salaryReportLoading, setSalaryReportLoading] = useState(false);

  // ============================================
  // GET AVAILABLE TEAMS
  // ============================================
  const teams = useMemo(() => {
    return data.teams || [];
  }, [data.teams]);

  // ============================================
  // GET AVAILABLE SITES
  // ============================================
  const sites = useMemo(() => {
    return data.sites || [];
  }, [data.sites]);

  // Helper: resolve site name from a siteId using data.sites
  const resolveSiteName = useCallback((siteId) => {
    if (!siteId) return null;
    const s = sites.find(x => x.id === siteId);
    return s?.name || null;
  }, [sites]);

  // ============================================
  // LOAD SALARY REPORT
  // ============================================
  const loadSalaryReport = useCallback(async () => {
    if (!selectedMonth) return;

    setSalaryReportLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/attendance/salary-report/${selectedMonth}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load salary report');
      }

      const result = await response.json();
      setSalaryReportData(result);
    } catch (err) {
      setError(err.message);
      setSalaryReportData(null);
    } finally {
      setSalaryReportLoading(false);
    }
  }, [selectedMonth]);

  // Load salary report when month changes in reports view
  useEffect(() => {
    if (viewMode === 'reports' && reportViewMode === 'salary' && selectedMonth) {
      loadSalaryReport();
    }
  }, [viewMode, reportViewMode, selectedMonth, loadSalaryReport]);

  // ============================================
  // GET UNIQUE MONTHS
  // ============================================
  const availableMonths = useMemo(() => {
    const months = new Set();
    data.attendance?.forEach(att => {
      if (att.date) {
        const month = att.date.substring(0, 7);
        months.add(month);
      }
    });
    if (months.size === 0) {
      const now = new Date();
      months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }
    return Array.from(months).sort();
  }, [data.attendance]);

  // ============================================
  // WORKER ATTENDANCE VIEW
  // ============================================
  const todayAttendance = useMemo(() => {
    return data.workers.map(worker => {
      const record = data.attendance.find(a => a.workerId === worker.id && a.date === selectedDate);
      let status = 'absent';
      let checkedInTime = null;
      let checkedOutTime = null;
      let hoursWorked = 0;
      let wageEarned = 0;

      if (record) {
        checkedInTime = record.checkedIn || null;
        checkedOutTime = record.checkedOut || null;

        if (record.checkedIn && !record.checkedOut) {
          status = 'working';
        } else if (record.checkedIn && record.checkedOut) {
          status = 'completed';
          hoursWorked = Utils.calculateHoursWorked(record.checkedIn, record.checkedOut);
          wageEarned = Utils.calculateDailyWage(hoursWorked, worker.dailyRate);
        } else if (record.present) {
          status = 'pending';
        }
      }

      const siteId = record?.siteId || null;
      const siteName = siteId ? (resolveSiteName(siteId) || record?.siteName || null) : null;

      return {
        ...worker,
        record: record || null,
        status,
        checkedInTime,
        checkedOutTime,
        hoursWorked,
        wageEarned,
        present: record ? record.present : false,
        siteId,
        siteName
      };
    });
  }, [data.workers, data.attendance, selectedDate, resolveSiteName]);

  // ============================================
  // FILTERED WORKER LIST (search + status)
  // ============================================
  const filteredTodayAttendance = useMemo(() => {
    let list = todayAttendance;

    if (workerSearchTerm.trim()) {
      const q = workerSearchTerm.trim().toLowerCase();
      list = list.filter(w =>
        (w.name && w.name.toLowerCase().includes(q)) ||
        (w.role && w.role.toLowerCase().includes(q)) ||
        (w.siteName && w.siteName.toLowerCase().includes(q)) ||
        (w.id && w.id.toLowerCase().includes(q))
      );
    }

    if (workerStatusFilter !== 'all') {
      list = list.filter(w => w.status === workerStatusFilter);
    }

    return list;
  }, [todayAttendance, workerSearchTerm, workerStatusFilter]);

  // ============================================
  // FILTERED TEAM MEMBERS (search)
  // ============================================
  const filteredTeamMembers = useMemo(() => {
    const members = teamAttendance?.members || [];
    if (!memberSearchTerm.trim()) return members;
    const q = memberSearchTerm.trim().toLowerCase();
    return members.filter(m => {
      const w = m.worker || {};
      return (
        (w.name && w.name.toLowerCase().includes(q)) ||
        (w.role && w.role.toLowerCase().includes(q)) ||
        (m.siteName && m.siteName.toLowerCase().includes(q)) ||
        (w.id && w.id.toLowerCase().includes(q))
      );
    });
  }, [teamAttendance, memberSearchTerm]);

  // ============================================
  // DAY STATS - DEFINED BEFORE cardDetails
  // ============================================
  const dayStats = useMemo(() => {
    const present = todayAttendance.filter(w => w.present);
    const working = todayAttendance.filter(w => w.status === 'working');
    const totalHours = todayAttendance.reduce((sum, w) => sum + w.hoursWorked, 0);
    const totalWages = todayAttendance.reduce((sum, w) => sum + w.wageEarned, 0);
    return { present: present.length, working: working.length, totalHours, totalWages };
  }, [todayAttendance]);

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const cardDetails = {
    present: {
      title: 'Present Today',
      details: [
        { label: 'Present Today', value: dayStats.present },
        { label: 'Currently Working', value: dayStats.working },
        { label: 'Total Workers', value: data.workers?.length || 0 },
        { label: 'Attendance Rate', value: data.workers?.length > 0 ? `${((dayStats.present / data.workers.length) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    working: {
      title: 'Currently Working',
      details: [
        { label: 'Currently Working', value: dayStats.working },
        { label: 'Completed Today', value: dayStats.present - dayStats.working },
        { label: 'Total Present', value: dayStats.present },
        { label: 'Working Rate', value: dayStats.present > 0 ? `${((dayStats.working / dayStats.present) * 100).toFixed(1)}%` : '0%' }
      ]
    },
    hours: {
      title: 'Total Hours',
      details: [
        { label: 'Total Hours', value: `${dayStats.totalHours.toFixed(1)}h` },
        { label: 'Total Workers', value: data.workers?.length || 0 },
        { label: 'Avg Hours/Worker', value: data.workers?.length > 0 ? `${(dayStats.totalHours / data.workers.length).toFixed(1)}h` : '0h' },
        { label: 'Active Workers', value: dayStats.working }
      ]
    },
    wages: {
      title: 'Total Wages',
      details: [
        { label: 'Total Wages', value: Utils.formatCurrency(dayStats.totalWages) },
        { label: 'Total Hours', value: `${dayStats.totalHours.toFixed(1)}h` },
        { label: 'Avg Hourly Rate', value: dayStats.totalHours > 0 ? Utils.formatCurrency(dayStats.totalWages / dayStats.totalHours) : '0.000' },
        { label: 'Present Workers', value: dayStats.present }
      ]
    }
  };

  // ============================================
  // HANDLE HOVER FOR STAT CARDS
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
  // HANDLE HOVER FOR WORKER ROWS
  // ============================================
  const handleWorkerEnter = (workerId, event) => {
    setHoveredWorker(workerId);
    setWorkerTooltipPos({ x: event.clientX + 15, y: event.clientY + 15 });
  };
  const handleWorkerMove = (event) => {
    setWorkerTooltipPos({ x: event.clientX + 15, y: event.clientY + 15 });
  };
  const handleWorkerLeave = () => {
    setHoveredWorker(null);
  };

  // ============================================
  // HANDLE HOVER FOR TEAM MEMBER ROWS
  // ============================================
  const handleMemberEnter = (memberId, event) => {
    setHoveredMember(memberId);
    setMemberTooltipPos({ x: event.clientX + 15, y: event.clientY + 15 });
  };
  const handleMemberMove = (event) => {
    setMemberTooltipPos({ x: event.clientX + 15, y: event.clientY + 15 });
  };
  const handleMemberLeave = () => {
    setHoveredMember(null);
  };

  // ============================================
  // TEAM ATTENDANCE VIEW
  // ============================================
  useEffect(() => {
    if (viewMode === 'teams' && selectedTeamId && selectedDate) {
      loadTeamAttendance();
    }
  }, [selectedTeamId, selectedDate, viewMode]);

  const loadTeamAttendance = async () => {
    if (!selectedTeamId) return;

    setTeamLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/attendance/team/${selectedTeamId}?date=${selectedDate}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load team attendance');
      }

      const result = await response.json();
      // Enrich each member with siteName from local sites list if missing
      if (result?.members) {
        result.members = result.members.map(m => ({
          ...m,
          siteName: m.siteName || resolveSiteName(m.siteId) || resolveSiteName(m.attendance?.siteId) || null,
          siteId: m.siteId || m.attendance?.siteId || null,
        }));
      }
      setTeamAttendance(result);
    } catch (err) {
      setError(err.message);
      setTeamAttendance(null);
    } finally {
      setTeamLoading(false);
    }
  };

  // ============================================
  // SITE SELECTION MODAL HANDLERS
  // ============================================
  const openSiteModal = (context) => {
    if (!sites || sites.length === 0) {
      setError('No sites available. Please add a site first.');
      return;
    }
    setSiteModalContext(context);
    setShowSiteModal(true);
  };

  const closeSiteModal = () => {
    setShowSiteModal(false);
    setSiteModalContext(null);
  };

  const handleSiteConfirm = async (siteId) => {
    const ctx = siteModalContext;
    closeSiteModal();
    if (!ctx) return;

    if (ctx.type === 'worker-clockin') {
      await handleClockIn(ctx.workerId, siteId);
    } else if (ctx.type === 'team-checkin') {
      await handleTeamCheckInAll(siteId);
    } else if (ctx.type === 'team-member-checkin') {
      await handleTeamWorkerCheckIn(ctx.workerId, siteId);
    }
  };

  // ============================================
  // ATTENDANCE REPORT
  // ============================================
  const attendanceReport = useMemo(() => {
    if (!selectedMonth) return null;

    const report = {
      month: selectedMonth,
      totalWorkers: 0,
      totalPresent: 0,
      totalAbsent: 0,
      totalHours: 0,
      totalOvertime: 0,
      totalWages: 0,
      workers: []
    };

    let workers = data.workers || [];
    if (selectedReportWorkerId !== 'all') {
      workers = workers.filter(w => w.id === selectedReportWorkerId);
    }

    workers.forEach(worker => {
      const attendances = data.attendance?.filter(a =>
        a.workerId === worker.id &&
        a.date &&
        a.date.startsWith(selectedMonth)
      ) || [];

      const totalHours = attendances.reduce((sum, a) => sum + (a.totalHours || 0), 0);
      const totalOvertime = attendances.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
      const totalWages = attendances.reduce((sum, a) => sum + (a.wageEarned || 0), 0);
      const presentDays = attendances.filter(a => a.present).length;
      const totalDays = new Date(
        parseInt(selectedMonth.split('-')[0]),
        parseInt(selectedMonth.split('-')[1]),
        0
      ).getDate();

      const workerReport = {
        worker,
        attendances,
        totalDays,
        presentDays,
        absentDays: totalDays - presentDays,
        totalHours,
        totalOvertime,
        totalWages,
        attendanceRate: totalDays > 0 ? (presentDays / totalDays) * 100 : 0,
        dailyAverage: presentDays > 0 ? totalHours / presentDays : 0
      };

      report.workers.push(workerReport);
      report.totalWorkers++;
      report.totalPresent += presentDays;
      report.totalAbsent += workerReport.absentDays;
      report.totalHours += totalHours;
      report.totalOvertime += totalOvertime;
      report.totalWages += totalWages;
    });

    return report;
  }, [data.workers, data.attendance, selectedMonth, selectedReportWorkerId]);

  // ============================================
  // GENERATE SALARY SLIP HTML (WITH LETTERHEAD)
  // ============================================
  const generateSalarySlipHTML = (workerData) => {
    const companyName = data.companyName || 'Haji Younas Contracting';
    const companyAddress = data.companyAddress || 'Flat/Shop 21, Bldg A0365, Road 55, Block 210, Muharraq';
    const companyPhone = data.companyPhone || '+973 37099957';
    const companyEmail = data.companyEmail || 'hajiyounas.contracting@gmail.com';
    const companyCr = data.companyCr || '141997-1';

    const worker = workerData.worker || workerData;
    const workerName = worker.name || workerData.workerName || 'Unknown';
    const workerRole = worker.role || workerData.role || 'N/A';
    const workerCpr = worker.cpr || 'N/A';

    const rate = workerData.rate || worker.hourlyRate || 0;

    const totalDays = workerData.totalDays || 0;
    const presentDays = workerData.presentDays || workerData.attendance?.presentDays || 0;
    const absentDays = workerData.absentDays || (totalDays - presentDays) || 0;
    const attendanceRate = workerData.attendanceRate || (totalDays > 0 ? (presentDays / totalDays) * 100 : 0);

    const totalHours = workerData.totalHours || workerData.attendance?.totalHours || 0;
    const overtimeHours = workerData.totalOvertime || workerData.attendance?.overtimeHours || 0;
    const basicHours = workerData.basicHours || (totalHours - overtimeHours) || 0;

    const basicSalary = workerData.basicSalary || workerData.salary?.basicSalary || 0;
    const overtimeSalary = workerData.overtimeSalary || workerData.salary?.overtimeSalary || 0;
    const totalSalary = workerData.totalSalary || workerData.salary?.grossSalary || 0;

    const loanDeductions = workerData.loans || workerData.deductions?.loans || [];
    const advanceDeductions = workerData.advances || workerData.deductions?.advances || [];
    const totalLoanDeduction = workerData.totalLoanDeduction || workerData.deductions?.totalLoanDeduction || 0;
    const totalAdvanceDeduction = workerData.totalAdvanceDeduction || workerData.deductions?.totalAdvanceDeduction || 0;
    const totalDeductions = workerData.totalDeductions || workerData.deductions?.totalDeductions || 0;

    const netSalary = workerData.netSalary || (totalSalary - totalDeductions) || 0;

    const attendances = workerData.attendances || workerData.attendance?.attendances || [];

    const monthName = Utils.getMonthName(selectedMonth);
    const year = selectedMonth.split('-')[0];

    const hasLoans = loanDeductions.length > 0 || totalLoanDeduction > 0;
    const hasAdvances = advanceDeductions.length > 0 || totalAdvanceDeduction > 0;

    const primary = '#1a3c6e';
    const secondary = '#c9a84c';
    const light = '#e8edf3';
    const muted = '#6a6a8a';
    const border = '#d4d9e0';
    const text = '#1a1a2e';
    const danger = '#dc3545';

    let attendanceRows = '';
    if (attendances && attendances.length > 0) {
      attendanceRows = attendances.map(att => {
        const day = att.date ? new Date(att.date).getDate() : '?';
        const dateStr = att.date ? Utils.formatDate(att.date) : 'N/A';
        const normalHours = (att.totalHours || 0) - (att.overtimeHours || 0);
        const status = att.present ? 'Present' : 'Absent';
        const siteName = att.siteId ? (resolveSiteName(att.siteId) || '') : '';
        return `<tr><td>${day}</td><td>${dateStr}</td><td>${normalHours.toFixed(1)}h</td><td>${(att.overtimeHours || 0).toFixed(1)}h</td><td>${siteName}</td><td class="${att.present ? 'text-success' : 'text-danger'}">${status}</td></tr>`;
      }).join('');
    } else {
      attendanceRows = `
        <tr>
          <td colspan="6" style="text-align:center; padding:10px; color:${muted};">
            Present: ${presentDays} days | Absent: ${absentDays} days | Rate: ${attendanceRate.toFixed(1)}%
          </td>
        </tr>
      `;
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Salary Slip - ${workerName}</title>
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
    .slip-container {
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
    .slip-background {
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
    .slip-background img {
      width: 70% !important;
      max-width: 600px !important;
      height: auto !important;
      display: block !important;
    }
    .slip-content-wrapper {
      position: relative !important;
      z-index: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      min-height: 100vh !important;
      width: 100% !important;
    }
    .slip-header-section { flex-shrink: 0 !important; width: 100% !important; background: #ffffff !important; }
    .slip-header-img { width: 100% !important; max-width: 100% !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    .slip-header-img img { width: 100% !important; height: auto !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    .slip-content-section { flex: 1 !important; width: 100% !important; padding: 8px 30px 12px 30px !important; background: transparent !important; }
    .slip-title { text-align: center !important; font-size: 20px !important; font-weight: 700 !important; color: ${primary} !important; margin: 6px 0 !important; letter-spacing: 2px !important; }
    .slip-divider { border-top: 2px solid ${primary} !important; margin: 8px 0 !important; }
    .slip-info-grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr 1fr !important;
      gap: 6px 20px !important;
      margin: 10px 0 !important;
      padding: 12px 16px !important;
      background: ${light} !important;
      border-radius: 4px !important;
    }
    .slip-info-item { display: flex !important; gap: 6px !important; font-size: 13px !important; }
    .slip-info-item .label { color: ${muted} !important; font-weight: 600 !important; min-width: 90px !important; }
    .slip-info-item .value { color: ${text} !important; font-weight: 500 !important; }
    .slip-section-title {
      font-size: 14px !important;
      font-weight: 700 !important;
      color: ${primary} !important;
      margin: 10px 0 6px 0 !important;
      padding-bottom: 4px !important;
      border-bottom: 1px solid ${border} !important;
    }
    .slip-table { width: 100% !important; border-collapse: collapse !important; margin: 6px 0 !important; font-size: 12px !important; background: #ffffff !important; }
    .slip-table thead { background: ${primary} !important; }
    .slip-table th {
      color: #ffffff !important;
      padding: 6px 10px !important;
      text-align: center !important;
      font-size: 11px !important;
      text-transform: uppercase !important;
      font-weight: 700 !important;
      letter-spacing: 0.5px !important;
    }
    .slip-table th.text-left { text-align: left !important; }
    .slip-table td { padding: 5px 10px !important; border-bottom: 1px solid ${border} !important; text-align: center !important; }
    .slip-table td.text-left { text-align: left !important; }
    .slip-table tbody tr:nth-child(even) { background: ${light} !important; }
    .slip-table .text-success { color: #22c55e !important; font-weight: 600 !important; }
    .slip-table .text-danger { color: ${danger} !important; font-weight: 600 !important; }
    .slip-table .text-warning { color: #f59e0b !important; font-weight: 600 !important; }
    .slip-totals {
      margin: 10px 0 10px auto !important;
      padding: 12px 20px !important;
      background: ${light} !important;
      max-width: 400px !important;
      border: 2px solid ${secondary} !important;
      border-radius: 4px !important;
    }
    .slip-total-row { display: flex !important; justify-content: space-between !important; padding: 3px 0 !important; font-size: 13px !important; }
    .slip-total-row .lbl { color: ${muted} !important; }
    .slip-total-row .val { font-weight: 600 !important; }
    .slip-total-row.deduction .val { color: ${danger} !important; }
    .slip-total-row.deduction .lbl { color: ${danger} !important; }
    .slip-grand { border-top: 2px solid ${secondary} !important; margin-top: 6px !important; padding-top: 8px !important; font-size: 20px !important; font-weight: 800 !important; }
    .slip-grand .lbl { color: ${primary} !important; }
    .slip-grand .val { color: ${primary} !important; }
    .slip-words { font-size: 11px !important; color: ${muted} !important; font-style: italic !important; border-top: 1px solid ${border} !important; margin-top: 6px !important; padding-top: 6px !important; text-align: center !important; }
    .slip-signature { margin-top: 16px !important; padding-top: 12px !important; border-top: 1px solid ${border} !important; display: flex !important; justify-content: space-between !important; }
    .slip-signature .sign-block { text-align: center !important; }
    .slip-signature .sign-label { font-size: 11px !important; color: ${muted} !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; }
    .slip-signature .sign-line { margin-top: 30px !important; border-top: 1px solid ${border} !important; width: 150px !important; margin-left: auto !important; margin-right: auto !important; }
    .slip-deductions-list {
      margin: 4px 0 8px 0 !important;
      padding: 8px 12px !important;
      background: #fef2f2 !important;
      border: 1px solid #fecaca !important;
      border-radius: 4px !important;
    }
    .slip-deductions-list .deduction-item { display: flex !important; justify-content: space-between !important; font-size: 12px !important; padding: 2px 0 !important; }
    .slip-deductions-list .deduction-item .ref { color: ${muted} !important; }
    .slip-deductions-list .deduction-item .amount { color: ${danger} !important; font-weight: 600 !important; }
    .slip-footer-section { flex-shrink: 0 !important; width: 100% !important; margin-top: auto !important; background: #ffffff !important; }
    .slip-footer-img { width: 100% !important; max-width: 100% !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    .slip-footer-img img { width: 100% !important; height: auto !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    @media print {
      @page { margin: 0 !important; padding: 0 !important; size: A4 !important; }
      html, body {
        margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important;
        -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
      }
      .slip-container { min-height: 100vh !important; width: 100% !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .slip-background { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; opacity: 0.08 !important; position: fixed !important; }
      .slip-table thead { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${primary} !important; }
      .slip-table th { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color: #ffffff !important; background: ${primary} !important; }
      .slip-table tbody tr:nth-child(even) { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${light} !important; }
      .slip-totals { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${light} !important; }
      .slip-info-grid { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${light} !important; }
      .slip-footer-section { margin-top: auto !important; }
    }
    @media screen {
      .slip-container { max-width: 100% !important; margin: 0 auto !important; box-shadow: 0 4px 30px rgba(0,0,0,0.12) !important; border: 1px solid ${border} !important; }
    }
    @media screen and (max-width: 768px) {
      .slip-content-section { padding: 6px 12px 10px 12px !important; }
      .slip-info-grid { grid-template-columns: 1fr !important; padding: 8px 12px !important; }
      .slip-totals { max-width: 100% !important; margin-left: 0 !important; padding: 10px 14px !important; }
      .slip-table { font-size: 10px !important; }
      .slip-table th, .slip-table td { padding: 3px 6px !important; }
      .slip-grand { font-size: 16px !important; }
      .slip-signature { flex-direction: column !important; gap: 16px !important; }
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <div class="slip-background"><img src='${background}' alt="Background" /></div>
    <div class="slip-content-wrapper">
      <div class="slip-header-section">
        <div class="slip-header-img"><img src="${letterheadHeader}" alt="Letterhead" /></div>
      </div>
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
          <thead>
            <tr>
              <th class="text-left">Description</th>
              <th>Hours</th>
              <th>Rate</th>
              <th>Amount (BD)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="text-left">Normal Hours</td>
              <td>${basicHours.toFixed(1)}</td>
              <td>${rate.toFixed(2)}</td>
              <td class="text-success">${basicSalary.toFixed(3)}</td>
            </tr>
            <tr>
              <td class="text-left">Overtime Hours (1.5x)</td>
              <td>${overtimeHours.toFixed(1)}</td>
              <td>${(rate * 1.5).toFixed(2)}</td>
              <td class="text-warning">${overtimeSalary.toFixed(3)}</td>
            </tr>
            <tr style="font-weight:700; background:${primary} !important; color:#fff !important;">
              <td class="text-left" style="color:#fff !important;">Gross Salary</td>
              <td colspan="2" style="color:#fff !important;">Total</td>
              <td style="color:#fff !important;">${totalSalary.toFixed(3)}</td>
            </tr>
          </tbody>
        </table>

        ${attendances && attendances.length > 0 ? `
          <div class="slip-section-title">Daily Attendance</div>
          <table class="slip-table">
            <thead>
              <tr>
                <th>Day</th>
                <th>Date</th>
                <th>Normal Hours</th>
                <th>OT Hours</th>
                <th>Site</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${attendanceRows}
            </tbody>
          </table>
        ` : ''}

        ${hasLoans ? `
          <div class="slip-section-title" style="color:${danger} !important;">Loan Deductions</div>
          <div class="slip-deductions-list">
            ${loanDeductions.map(loan => `
              <div class="deduction-item">
                <span class="ref">${loan.loanNumber || loan.reference || 'Loan'}</span>
                <span class="amount">${(loan.amount || 0).toFixed(3)} BD</span>
              </div>
            `).join('')}
            ${totalLoanDeduction > 0 ? `
              <div class="deduction-item" style="border-top:1px solid #fecaca !important; padding-top:4px !important; margin-top:4px !important; font-weight:700 !important;">
                <span>Total Loan Deduction</span>
                <span class="amount">${totalLoanDeduction.toFixed(3)} BD</span>
              </div>
            ` : ''}
          </div>
        ` : ''}

        ${hasAdvances ? `
          <div class="slip-section-title" style="color:${danger} !important;">Advance Deductions</div>
          <div class="slip-deductions-list">
            ${advanceDeductions.map(advance => `
              <div class="deduction-item">
                <span class="ref">${advance.advanceNumber || advance.reference || 'Advance'}</span>
                <span class="amount">${(advance.amount || 0).toFixed(3)} BD</span>
              </div>
            `).join('')}
            ${totalAdvanceDeduction > 0 ? `
              <div class="deduction-item" style="border-top:1px solid #fecaca !important; padding-top:4px !important; margin-top:4px !important; font-weight:700 !important;">
                <span>Total Advance Deduction</span>
                <span class="amount">${totalAdvanceDeduction.toFixed(3)} BD</span>
              </div>
            ` : ''}
          </div>
        ` : ''}

        ${totalDeductions > 0 ? `
          <div class="slip-section-title" style="color:${danger} !important;">Total Deductions</div>
          <div class="slip-deductions-list">
            <div class="deduction-item" style="font-weight:700 !important; font-size:14px !important;">
              <span>Total Deductions</span>
              <span class="amount">${totalDeductions.toFixed(3)} BD</span>
            </div>
          </div>
        ` : ''}

        <div class="slip-totals">
          <div class="slip-total-row"><span class="lbl">Gross Salary:</span><span class="val">${totalSalary.toFixed(3)} BD</span></div>
          ${totalDeductions > 0 ? `
            <div class="slip-total-row deduction"><span class="lbl">Total Deductions:</span><span class="val">- ${totalDeductions.toFixed(3)} BD</span></div>
          ` : ''}
          <div class="slip-total-row slip-grand"><span class="lbl">NET SALARY:</span><span class="val">${netSalary.toFixed(3)} BD</span></div>
          <div class="slip-words">${Utils.convertAmountToWords(netSalary)}</div>
        </div>

        <div class="slip-signature">
          <div class="sign-block"><div class="sign-label">Supervisor Sign</div><div class="sign-line"></div></div>
          <div class="sign-block"><div class="sign-label">Receiver Sign</div><div class="sign-line"></div></div>
        </div>
      </div>
      <div class="slip-footer-section">
        <div class="slip-footer-img"><img src="${letterheadFooter}" alt="Footer" /></div>
      </div>
    </div>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };<\/script>
</body>
</html>
    `;
  };

  // ============================================
  // PRINT SALARY SLIP
  // ============================================
  const handlePrintSalarySlip = (workerData) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }
    const printHTML = generateSalarySlipHTML(workerData);
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
  };

  // ============================================
  // GENERATE ATTENDANCE REPORT HTML (WITH LETTERHEAD)
  // ============================================
  const generateAttendanceReportHTML = (report) => {
    const companyName = data.companyName || 'Haji Younas Contracting';
    const companyAddress = data.companyAddress || 'Flat/Shop 21, Bldg A0365, Road 55, Block 210, Muharraq';
    const companyPhone = data.companyPhone || '+973 37099957';
    const companyEmail = data.companyEmail || 'hajiyounas.contracting@gmail.com';
    const companyCr = data.companyCr || '141997-1';

    const monthName = Utils.getMonthName(selectedMonth);
    const year = selectedMonth.split('-')[0];

    const primary = '#1a3c6e';
    const secondary = '#c9a84c';
    const light = '#e8edf3';
    const muted = '#6a6a8a';
    const border = '#d4d9e0';
    const text = '#1a1a2e';

    const rows = report.workers.map((w, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td style="text-align:left;">${w.worker.name}</td>
        <td>${w.worker.role || 'N/A'}</td>
        <td>${w.totalDays}</td>
        <td class="text-success">${w.presentDays}</td>
        <td class="text-danger">${w.absentDays}</td>
        <td>${w.attendanceRate.toFixed(1)}%</td>
        <td>${w.totalHours.toFixed(1)}h</td>
        <td>${w.totalOvertime.toFixed(1)}h</td>
        <td class="text-success">${Utils.formatCurrency(w.totalWages)}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Attendance Report - ${monthName} ${year}</title>
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
    .rep-container {
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
    .rep-background {
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
    .rep-background img { width: 70% !important; max-width: 600px !important; height: auto !important; display: block !important; }
    .rep-content-wrapper {
      position: relative !important;
      z-index: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      min-height: 100vh !important;
      width: 100% !important;
    }
    .rep-header-section { flex-shrink: 0 !important; width: 100% !important; background: #ffffff !important; }
    .rep-header-img { width: 100% !important; max-width: 100% !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    .rep-header-img img { width: 100% !important; height: auto !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    .rep-content-section { flex: 1 !important; width: 100% !important; padding: 8px 30px 12px 30px !important; background: transparent !important; }
    .rep-title { text-align: center !important; font-size: 20px !important; font-weight: 700 !important; color: ${primary} !important; margin: 6px 0 !important; letter-spacing: 2px !important; }
    .rep-subtitle { text-align: center !important; font-size: 14px !important; color: ${muted} !important; margin-bottom: 10px !important; }
    .rep-divider { border-top: 2px solid ${primary} !important; margin: 8px 0 12px 0 !important; }
    .rep-summary-grid {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 10px !important;
      margin: 10px 0 14px 0 !important;
    }
    .rep-summary-card {
      padding: 10px 14px !important;
      background: ${light} !important;
      border-left: 4px solid ${secondary} !important;
      border-radius: 4px !important;
    }
    .rep-summary-label { font-size: 11px !important; color: ${muted} !important; text-transform: uppercase !important; font-weight: 600 !important; letter-spacing: 0.5px !important; }
    .rep-summary-value { font-size: 20px !important; font-weight: 700 !important; color: ${primary} !important; margin-top: 4px !important; }
    .rep-table { width: 100% !important; border-collapse: collapse !important; margin: 10px 0 !important; font-size: 12px !important; background: #ffffff !important; }
    .rep-table thead { background: ${primary} !important; }
    .rep-table th {
      color: #ffffff !important;
      padding: 8px 10px !important;
      text-align: center !important;
      font-size: 11px !important;
      text-transform: uppercase !important;
      font-weight: 700 !important;
      letter-spacing: 0.5px !important;
    }
    .rep-table td { padding: 6px 10px !important; border-bottom: 1px solid ${border} !important; text-align: center !important; }
    .rep-table tbody tr:nth-child(even) { background: ${light} !important; }
    .rep-table .text-success { color: #22c55e !important; font-weight: 600 !important; }
    .rep-table .text-danger { color: #dc3545 !important; font-weight: 600 !important; }
    .rep-signature { margin-top: 24px !important; padding-top: 12px !important; border-top: 1px solid ${border} !important; display: flex !important; justify-content: space-between !important; }
    .rep-signature .sign-block { text-align: center !important; }
    .rep-signature .sign-label { font-size: 11px !important; color: ${muted} !important; text-transform: uppercase !important; letter-spacing: 0.5px !important; }
    .rep-signature .sign-line { margin-top: 30px !important; border-top: 1px solid ${border} !important; width: 150px !important; margin-left: auto !important; margin-right: auto !important; }
    .rep-footer-section { flex-shrink: 0 !important; width: 100% !important; margin-top: auto !important; background: #ffffff !important; }
    .rep-footer-img { width: 100% !important; max-width: 100% !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    .rep-footer-img img { width: 100% !important; height: auto !important; display: block !important; margin: 0 !important; padding: 0 !important; }
    @media print {
      @page { margin: 0 !important; padding: 0 !important; size: A4 landscape !important; }
      html, body {
        margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important;
        -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
      }
      .rep-container { min-height: 100vh !important; width: 100% !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .rep-background { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; opacity: 0.08 !important; position: fixed !important; }
      .rep-table thead { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${primary} !important; }
      .rep-table th { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${primary} !important; color: #ffffff !important; }
      .rep-table tbody tr:nth-child(even) { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${light} !important; }
      .rep-summary-card { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: ${light} !important; }
      .rep-footer-section { margin-top: auto !important; }
    }
    @media screen {
      .rep-container { max-width: 100% !important; margin: 0 auto !important; box-shadow: 0 4px 30px rgba(0,0,0,0.12) !important; border: 1px solid ${border} !important; }
    }
  </style>
</head>
<body>
  <div class="rep-container">
    <div class="rep-background"><img src='${background}' alt="Background" /></div>
    <div class="rep-content-wrapper">
      <div class="rep-header-section">
        <div class="rep-header-img"><img src="${letterheadHeader}" alt="Letterhead" /></div>
      </div>
      <div class="rep-content-section">
        <div class="rep-title">ATTENDANCE REPORT</div>
        <div class="rep-subtitle">${monthName} ${year}${selectedReportWorkerId !== 'all' ? ' — Individual Worker' : ' — All Workers'}</div>
        <div class="rep-divider"></div>

        <div class="rep-summary-grid">
          <div class="rep-summary-card">
            <div class="rep-summary-label">Total Workers</div>
            <div class="rep-summary-value">${report.totalWorkers}</div>
          </div>
          <div class="rep-summary-card">
            <div class="rep-summary-label">Total Present</div>
            <div class="rep-summary-value">${report.totalPresent}</div>
          </div>
          <div class="rep-summary-card">
            <div class="rep-summary-label">Total Hours</div>
            <div class="rep-summary-value">${report.totalHours.toFixed(1)}h</div>
          </div>
          <div class="rep-summary-card">
            <div class="rep-summary-label">Total Wages</div>
            <div class="rep-summary-value">${Utils.formatCurrency(report.totalWages)}</div>
          </div>
        </div>

        <table class="rep-table">
          <thead>
            <tr>
              <th>#</th>
              <th style="text-align:left;">Worker</th>
              <th>Role</th>
              <th>Total Days</th>
              <th>Present</th>
              <th>Absent</th>
              <th>Rate</th>
              <th>Total Hours</th>
              <th>OT Hours</th>
              <th>Total Wages</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="10" style="text-align:center;padding:15px;color:${muted};">No data available</td></tr>`}
          </tbody>
        </table>

        <div class="rep-signature">
          <div class="sign-block"><div class="sign-label">Prepared By</div><div class="sign-line"></div></div>
          <div class="sign-block"><div class="sign-label">Approved By</div><div class="sign-line"></div></div>
        </div>
      </div>
      <div class="rep-footer-section">
        <div class="rep-footer-img"><img src="${letterheadFooter}" alt="Footer" /></div>
      </div>
    </div>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };<\/script>
</body>
</html>
    `;
  };

  const handlePrintAttendanceReport = (report) => {
    if (!report || report.workers.length === 0) {
      alert('No data to print');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }
    const printHTML = generateAttendanceReportHTML(report);
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
  };

  // ============================================
  // ATTENDANCE ACTIONS
  // ============================================
  const handleClockIn = async (workerId, siteId) => {
    setLoading(prev => ({ ...prev, [workerId]: 'clocking-in' }));
    try {
      await clockInWorker(workerId, selectedDate, siteId);
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshData();
      setLoading(prev => ({ ...prev, [workerId]: null }));
      setSuccess('Worker clocked in successfully');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      alert('Failed to clock in: ' + err.message);
      setLoading(prev => ({ ...prev, [workerId]: null }));
    }
  };

  const handleClockOut = async (workerId) => {
    setLoading(prev => ({ ...prev, [workerId]: 'clocking-out' }));
    try {
      await clockOutWorker(workerId, selectedDate);
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshData();
      setLoading(prev => ({ ...prev, [workerId]: null }));
    } catch (err) {
      alert('Failed to clock out: ' + err.message);
      setLoading(prev => ({ ...prev, [workerId]: null }));
    }
  };

  const handleTeamCheckInAll = async (siteId) => {
    if (!selectedTeamId) return;
    setTeamActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/team/${selectedTeamId}/checkin-all`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, siteId: siteId })
      });
      if (!response.ok) throw new Error('Failed to check in team');
      const result = await response.json();
      setSuccess(`Team checked in successfully`);
      await loadTeamAttendance();
      await refreshData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setTeamActionLoading(false);
    }
  };

  const handleTeamCheckOutAll = async () => {
    if (!selectedTeamId) return;
    setTeamActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/team/${selectedTeamId}/checkout-all`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate })
      });
      if (!response.ok) throw new Error('Failed to check out team');
      const result = await response.json();
      setSuccess(`Team checked out successfully`);
      await loadTeamAttendance();
      await refreshData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setTeamActionLoading(false);
    }
  };

  const handleTeamWorkerCheckIn = async (workerId, siteId) => {
    setTeamActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/checkin`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: workerId, teamId: selectedTeamId, siteId: siteId, date: selectedDate })
      });
      if (!response.ok) throw new Error('Failed to check in worker');
      setSuccess(`Worker checked in successfully`);
      await loadTeamAttendance();
      await refreshData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setTeamActionLoading(false);
    }
  };

  const handleTeamWorkerCheckOut = async (attendanceId) => {
    setTeamActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/${attendanceId}/checkout`, {
        method: 'PUT',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to check out worker');
      setSuccess(`Worker checked out successfully`);
      await loadTeamAttendance();
      await refreshData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setTeamActionLoading(false);
    }
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================
  const getTeamStats = () => {
    if (!teamAttendance) return null;
    return {
      total: teamAttendance.stats?.total_members || 0,
      present: teamAttendance.stats?.present || 0,
      absent: teamAttendance.stats?.absent || 0,
      rate: teamAttendance.stats?.attendance_rate || 0,
      hours: teamAttendance.stats?.total_hours || 0,
      wages: teamAttendance.stats?.total_wages || 0
    };
  };

  const teamStats = getTeamStats();
  const toggleMemberExpand = (memberId) => {
    setExpandedMembers(prev => ({ ...prev, [memberId]: !prev[memberId] }));
  };
  const toggleReportExpand = (workerId) => {
    setExpandedReportWorkers(prev => ({ ...prev, [workerId]: !prev[workerId] }));
  };

  // ============================================
  // RENDER SITE SELECTION MODAL
  // ============================================
  const renderSiteModal = () => {
    if (!showSiteModal) return null;

    const title = siteModalContext?.type === 'team-checkin'
      ? 'Select Site for Team Check-In'
      : siteModalContext?.type === 'team-member-checkin'
        ? 'Select Site for Worker Check-In'
        : 'Select Site for Clock-In';

    const subtitle = siteModalContext?.type === 'team-checkin'
      ? 'All team members will be checked in to the selected site.'
      : 'Attendance will be recorded against the selected site.';

    return (
      <div
        className="site-modal-overlay"
        onClick={closeSiteModal}
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}
      >
        <div
          className="site-modal"
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: '12px',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '85vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}
        >
          <div style={{
            padding: '18px 22px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #1a3c6e, #2a5a9e)',
            color: '#fff',
            borderRadius: '12px 12px 0 0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building2 size={22} />
              <h3 style={{ margin: 0, fontSize: '17px' }}>{title}</h3>
            </div>
            <button
              onClick={closeSiteModal}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex'
              }}
            >
              <X size={22} />
            </button>
          </div>

          <div style={{ padding: '18px 22px' }}>
            <p style={{ color: '#6a6a8a', fontSize: '13px', marginBottom: '16px' }}>
              {subtitle}
            </p>

            {sites.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                color: '#6a6a8a',
                background: '#f9fafb',
                borderRadius: '8px'
              }}>
                <Building2 size={36} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p>No sites available. Please add a site first.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sites.map(site => (
                  <button
                    key={site.id}
                    onClick={() => handleSiteConfirm(site.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      width: '100%'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#eef2ff';
                      e.currentTarget.style.borderColor = '#1a3c6e';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'rgba(26, 60, 110, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1a3c6e',
                      flexShrink: 0
                    }}>
                      <MapPin size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#1a1a2e', fontSize: '14px' }}>
                        {site.name}
                      </div>
                      {site.location && (
                        <div style={{ fontSize: '12px', color: '#6a6a8a', marginTop: '2px' }}>
                          {site.location}
                        </div>
                      )}
                      {site.clientName && (
                        <div style={{ fontSize: '12px', color: '#6a6a8a', marginTop: '2px' }}>
                          Client: {site.clientName}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={18} color="#6a6a8a" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER WORKER HOVER TOOLTIP (shows site)
  // ============================================
  const renderWorkerTooltip = () => {
    if (!hoveredWorker) return null;
    const worker = todayAttendance.find(w => w.id === hoveredWorker);
    if (!worker) return null;

    return (
      <div
        className="row-tooltip"
        style={{
          position: 'fixed',
          left: workerTooltipPos.x,
          top: workerTooltipPos.y,
          zIndex: 9998,
          pointerEvents: 'none',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          padding: '12px 14px',
          minWidth: '230px',
          maxWidth: '320px',
          fontFamily: 'inherit'
        }}
      >
        <div style={{ fontWeight: 700, color: '#1a3c6e', marginBottom: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <User size={14} /> {worker.name}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6a6a8a' }}>
            <Briefcase size={12} /> <span>Role:</span> <strong style={{ color: '#1a1a2e' }}>{worker.role || 'N/A'}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6a6a8a' }}>
            <Building2 size={12} /> <span>Site:</span>
            <strong style={{ color: worker.siteName ? '#1a3c6e' : '#dc3545' }}>
              {worker.siteName || 'Not assigned'}
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6a6a8a' }}>
            <Clock size={12} /> <span>Status:</span>
            <strong style={{ color: '#1a1a2e', textTransform: 'capitalize' }}>{worker.status}</strong>
          </div>
          {worker.checkedInTime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6a6a8a' }}>
              <LogIn size={12} /> <span>In:</span>
              <strong style={{ color: '#1a1a2e' }}>{Utils.formatTime(worker.checkedInTime)}</strong>
            </div>
          )}
          {worker.checkedOutTime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6a6a8a' }}>
              <LogOut size={12} /> <span>Out:</span>
              <strong style={{ color: '#1a1a2e' }}>{Utils.formatTime(worker.checkedOutTime)}</strong>
            </div>
          )}
          {worker.hoursWorked > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6a6a8a' }}>
              <Timer size={12} /> <span>Hours:</span>
              <strong style={{ color: '#1a1a2e' }}>{worker.hoursWorked.toFixed(2)}h</strong>
            </div>
          )}
          {worker.wageEarned > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6a6a8a' }}>
              <DollarSign size={12} /> <span>Wage:</span>
              <strong style={{ color: '#22c55e' }}>{Utils.formatCurrency(worker.wageEarned)}</strong>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER MEMBER HOVER TOOLTIP (shows site)
  // ============================================
  const renderMemberTooltip = () => {
    if (!hoveredMember) return null;
    const member = (teamAttendance?.members || []).find(m => (m.id || m.worker?.id) === hoveredMember);
    if (!member) return null;
    const worker = member.worker || {};

    return (
      <div
        className="row-tooltip"
        style={{
          position: 'fixed',
          left: memberTooltipPos.x,
          top: memberTooltipPos.y,
          zIndex: 9998,
          pointerEvents: 'none',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          padding: '12px 14px',
          minWidth: '230px',
          maxWidth: '320px',
          fontFamily: 'inherit'
        }}
      >
        <div style={{ fontWeight: 700, color: '#1a3c6e', marginBottom: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <User size={14} /> {worker.name || 'Worker'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6a6a8a' }}>
            <Briefcase size={12} /> <span>Role:</span> <strong style={{ color: '#1a1a2e' }}>{worker.role || 'N/A'}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6a6a8a' }}>
            <Building2 size={12} /> <span>Site:</span>
            <strong style={{ color: member.siteName ? '#1a3c6e' : '#dc3545' }}>
              {member.siteName || 'Not assigned'}
            </strong>
          </div>
          {member.checkedIn && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6a6a8a' }}>
              <LogIn size={12} /> <span>In:</span>
              <strong style={{ color: '#1a1a2e' }}>{Utils.formatTime(member.checkedIn)}</strong>
            </div>
          )}
          {member.checkedOut && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6a6a8a' }}>
              <LogOut size={12} /> <span>Out:</span>
              <strong style={{ color: '#1a1a2e' }}>{Utils.formatTime(member.checkedOut)}</strong>
            </div>
          )}
          {member.hoursWorked > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6a6a8a' }}>
              <Timer size={12} /> <span>Hours:</span>
              <strong style={{ color: '#1a1a2e' }}>{member.hoursWorked.toFixed(2)}h</strong>
            </div>
          )}
          {member.wageEarned > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6a6a8a' }}>
              <DollarSign size={12} /> <span>Wage:</span>
              <strong style={{ color: '#22c55e' }}>{Utils.formatCurrency(member.wageEarned)}</strong>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER WORKER LIST
  // ============================================
  const renderWorkerList = () => {
    return (
      <div className="attendance-list-modern">
        {filteredTodayAttendance.map(worker => {
          const isLoading = loading[worker.id];
          return (
            <div
              key={worker.id}
              className="attendance-item-modern"
              onMouseEnter={(e) => handleWorkerEnter(worker.id, e)}
              onMouseMove={handleWorkerMove}
              onMouseLeave={handleWorkerLeave}
            >
              <div className="attendance-worker-info">
                <div className="worker-name">{worker.name}</div>
                <div className="worker-role">{worker.role || 'No role'}</div>
                <div className="worker-rate">{Utils.formatCurrency(worker.dailyRate)}/day</div>
              </div>
              <div className="attendance-status">
                {worker.status === 'working' && <span className="status-working"><PlayCircle size={14} /> Working</span>}
                {worker.status === 'completed' && <span className="status-completed"><CheckCircle size={14} /> Completed</span>}
                {worker.status === 'pending' && <span className="status-pending"><Clock size={14} /> Pending</span>}
                {worker.status === 'absent' && <span className="status-absent"><X size={14} /> Absent</span>}
              </div>
              <div className="attendance-time">
                {worker.checkedInTime && <div><Clock size={14} /> In: {Utils.formatTime(worker.checkedInTime)}</div>}
                {worker.checkedOutTime && <div><Clock size={14} /> Out: {Utils.formatTime(worker.checkedOutTime)}</div>}
                {worker.siteName && (
                  <div className="site-tag" title={worker.siteName}>
                    <MapPin size={14} /> {worker.siteName}
                  </div>
                )}
                {worker.hoursWorked > 0 && (
                  <div className="hours-wage"><Timer size={14} /> {worker.hoursWorked.toFixed(1)} hrs | {Utils.formatCurrency(worker.wageEarned)}</div>
                )}
              </div>
              <div className="attendance-actions">
                {isLoading === 'clocking-in' && <span className="loading-text">Clocking In...</span>}
                {isLoading === 'clocking-out' && <span className="loading-text">Clocking Out...</span>}
                {!isLoading && worker.status === 'working' && (
                  <button className="btn-clock-out" onClick={() => handleClockOut(worker.id)}>
                    <LogOut size={14} /> Clock Out
                  </button>
                )}
                {!isLoading && worker.status === 'completed' && (
                  <span className="completed-text"><CheckCircle size={14} /> Done</span>
                )}
                {!isLoading && (worker.status === 'absent' || worker.status === 'pending') && (
                  <button
                    className="btn-clock-in"
                    onClick={() => openSiteModal({ type: 'worker-clockin', workerId: worker.id })}
                  >
                    <LogIn size={14} /> Clock In
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredTodayAttendance.length === 0 && todayAttendance.length > 0 && (
          <div className="empty-state-modern">
            <Search size={48} />
            <h3>No Matching Workers</h3>
            <p>Try adjusting your search or filter.</p>
          </div>
        )}
        {todayAttendance.length === 0 && (
          <div className="empty-state-modern">
            <Users size={48} />
            <h3>No Workers</h3>
            <p>No workers added yet. Add workers in the Workers tab.</p>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER TEAM LIST
  // ============================================
  const renderTeamList = () => {
    return (
      <div className="team-attendance-container">
        <div className="team-selector-modern">
          <div className="control-group">
            <label><Building2 size={16} /> Select Team:</label>
            <select value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)} className="team-select">
              <option value="">Select a team...</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name} ({team.members?.length || 0} members)</option>
              ))}
            </select>
          </div>
          {selectedTeamId && (
            <div className="team-quick-actions">
              <button
                className="btn-checkin-all"
                onClick={() => openSiteModal({ type: 'team-checkin' })}
                disabled={teamActionLoading || !selectedTeamId}
              >
                <LogIn size={16} /> Check In All
              </button>
              <button className="btn-checkout-all" onClick={handleTeamCheckOutAll} disabled={teamActionLoading || !selectedTeamId}>
                <LogOut size={16} /> Check Out All
              </button>
            </div>
          )}
        </div>

        {teamAttendance && (
          <div className="attendance-summary-modern">
            <div className="summary-card-modern">
              <div className="summary-label"><Users size={16} /> Total Members</div>
              <div className="summary-value">{teamStats?.total || 0}</div>
            </div>
            <div className="summary-card-modern">
              <div className="summary-label"><CheckCircle size={16} /> Present Today</div>
              <div className="summary-value">{teamStats?.present || 0}</div>
            </div>
            <div className="summary-card-modern">
              <div className="summary-label"><Gauge size={16} /> Attendance Rate</div>
              <div className="summary-value">{teamStats?.rate?.toFixed(1) || 0}%</div>
            </div>
            <div className="summary-card-modern">
              <div className="summary-label"><Timer size={16} /> Total Hours</div>
              <div className="summary-value">{teamStats?.hours?.toFixed(1) || 0}h</div>
            </div>
            <div className="summary-card-modern">
              <div className="summary-label"><DollarSign size={16} /> Total Wages</div>
              <div className="summary-value">{Utils.formatCurrency(teamStats?.wages || 0)}</div>
            </div>
          </div>
        )}

        <div className="team-members-list-modern">
          <h3><Users size={18} /> Team Members</h3>

          {/* Search box for team members */}
          {selectedTeamId && teamAttendance && teamAttendance.members?.length > 0 && (
            <div className="worker-search-bar">
              <div className="search-input-wrapper">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  placeholder="Search members by name, role, or site..."
                  className="search-input"
                />
                {memberSearchTerm && (
                  <button className="search-clear" onClick={() => setMemberSearchTerm('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {teamLoading ? (
            <div className="loading-state">Loading team attendance...</div>
          ) : !selectedTeamId ? (
            <div className="empty-state-modern">
              <Building2 size={48} />
              <h3>Select a Team</h3>
              <p>Please select a team to view attendance</p>
            </div>
          ) : !teamAttendance || teamAttendance.members?.length === 0 ? (
            <div className="empty-state-modern">
              <Users size={48} />
              <h3>No Members</h3>
              <p>No members in this team</p>
            </div>
          ) : filteredTeamMembers.length === 0 ? (
            <div className="empty-state-modern">
              <Search size={48} />
              <h3>No Matching Members</h3>
              <p>Try adjusting your search.</p>
            </div>
          ) : (
            filteredTeamMembers.map((member) => {
              const worker = member.worker;
              const isWorking = member.checkedIn && !member.checkedOut;
              const isCompleted = member.checkedIn && member.checkedOut;
              const isAbsent = !member.attendance;
              const isPending = member.attendance && !member.checkedIn;
              const memberId = member.id || worker.id;
              const isExpanded = expandedMembers[memberId];

              return (
                <div
                  key={worker.id}
                  className="team-member-card-modern"
                  onMouseEnter={(e) => handleMemberEnter(memberId, e)}
                  onMouseMove={handleMemberMove}
                  onMouseLeave={handleMemberLeave}
                >
                  <div className="team-member-header">
                    <div className="member-info">
                      <div className="member-avatar">
                        <span>{worker.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="member-name">{worker.name}</div>
                        <div className="member-role"><Briefcase size={12} /> {worker.role || 'Worker'}</div>
                      </div>
                    </div>
                    <div className="member-status">
                      {isAbsent && <span className="status-absent"><X size={14} /> Absent</span>}
                      {isWorking && <span className="status-working"><PlayCircle size={14} /> Working</span>}
                      {isCompleted && <span className="status-completed"><CheckCircle size={14} /> Completed</span>}
                      {isPending && <span className="status-pending"><Clock size={14} /> Pending</span>}
                    </div>
                    <div className="member-hours">
                      {member.siteName && (
                        <div className="site-tag" title={member.siteName}>
                          <MapPin size={14} /> {member.siteName}
                        </div>
                      )}
                      {member.hoursWorked > 0 && (
                        <><div><Timer size={14} /> {member.hoursWorked.toFixed(1)} hrs</div><div className="member-wage"><DollarSign size={14} /> {Utils.formatCurrency(member.wageEarned)}</div></>
                      )}
                      {member.checkedIn && !member.checkedOut && (
                        <div className="member-checkin-time"><Clock size={14} /> In: {Utils.formatTime(member.checkedIn)}</div>
                      )}
                      {member.checkedIn && member.checkedOut && (
                        <div className="member-times"><Clock size={14} /> In: {Utils.formatTime(member.checkedIn)}</div>
                      )}
                    </div>
                    <div className="member-actions">
                      {isAbsent && (
                        <button
                          className="btn-clock-in-small"
                          onClick={() => openSiteModal({ type: 'team-member-checkin', workerId: worker.id })}
                          disabled={teamActionLoading}
                        >
                          <LogIn size={14} /> Check In
                        </button>
                      )}
                      {isWorking && (
                        <button className="btn-clock-out-small" onClick={() => handleTeamWorkerCheckOut(member.attendance.id)} disabled={teamActionLoading}>
                          <LogOut size={14} /> Check Out
                        </button>
                      )}
                      {isCompleted && <span className="completed-badge"><CheckCircle size={14} /> Done</span>}
                      {isPending && <span className="pending-badge"><Clock size={14} /> Pending</span>}
                    </div>
                    <button className="expand-toggle-btn" onClick={() => toggleMemberExpand(memberId)}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="member-details-expanded">
                      <div className="detail-row"><div className="detail-label"><User size={14} /> Worker ID:</div><div className="detail-value">{worker.id}</div></div>
                      <div className="detail-row"><div className="detail-label"><Briefcase size={14} /> Role:</div><div className="detail-value">{worker.role || 'N/A'}</div></div>
                      <div className="detail-row"><div className="detail-label"><DollarSign size={14} /> Daily Rate:</div><div className="detail-value">{Utils.formatCurrency(worker.dailyRate)}</div></div>
                      <div className="detail-row"><div className="detail-label"><Phone size={14} /> Phone:</div><div className="detail-value">{worker.phone || 'N/A'}</div></div>
                      {member.siteName && <div className="detail-row"><div className="detail-label"><Building2 size={14} /> Site:</div><div className="detail-value">{member.siteName}</div></div>}
                      {member.checkedIn && <div className="detail-row"><div className="detail-label"><LogIn size={14} /> Checked In:</div><div className="detail-value">{Utils.formatTime(member.checkedIn)}</div></div>}
                      {member.checkedOut && <div className="detail-row"><div className="detail-label"><LogOut size={14} /> Checked Out:</div><div className="detail-value">{Utils.formatTime(member.checkedOut)}</div></div>}
                      {member.hoursWorked > 0 && <div className="detail-row"><div className="detail-label"><Timer size={14} /> Total Hours:</div><div className="detail-value">{member.hoursWorked.toFixed(2)} hrs</div></div>}
                      {member.wageEarned > 0 && <div className="detail-row"><div className="detail-label"><DollarSign size={14} /> Wage Earned:</div><div className="detail-value">{Utils.formatCurrency(member.wageEarned)}</div></div>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER SALARY REPORT
  // ============================================
  const renderSalaryReport = () => {
    if (salaryReportLoading) {
      return <div className="loading-state">Loading salary report...</div>;
    }

    if (!salaryReportData) {
      return (
        <div className="empty-state-modern">
          <FileText size={48} />
          <h3>No Salary Data</h3>
          <p>No salary data found for the selected month.</p>
          <button className="btn-primary" onClick={loadSalaryReport}>
            <RefreshCw size={16} /> Load Report
          </button>
        </div>
      );
    }

    const summary = salaryReportData.summary || {};
    const workers = salaryReportData.workers || [];

    return (
      <div className="salary-report-container">
        <div className="report-header">
          <h3><DollarSign size={18} /> Salary Report - {salaryReportData.monthName} {salaryReportData.year}</h3>
          <div className="report-actions">
            <button className="btn-export" onClick={() => window.print()}>
              <Printer size={16} /> Print All
            </button>
          </div>
        </div>

        <div className="salary-summary-grid">
          <div className="summary-card-modern">
            <div className="summary-label"><Users size={16} /> Total Workers</div>
            <div className="summary-value">{summary.totalWorkers || 0}</div>
          </div>
          <div className="summary-card-modern">
            <div className="summary-label"><DollarSign size={16} /> Gross Salary</div>
            <div className="summary-value">{Utils.formatCurrency(summary.totalGrossSalary || 0)}</div>
          </div>
          <div className="summary-card-modern" style={{ borderColor: '#ef4444' }}>
            <div className="summary-label" style={{ color: '#ef4444' }}><Shield size={16} /> Loan Deductions</div>
            <div className="summary-value" style={{ color: '#ef4444' }}>{Utils.formatCurrency(summary.totalLoanDeduction || 0)}</div>
          </div>
          <div className="summary-card-modern" style={{ borderColor: '#f59e0b' }}>
            <div className="summary-label" style={{ color: '#f59e0b' }}><Wallet size={16} /> Advance Deductions</div>
            <div className="summary-value" style={{ color: '#f59e0b' }}>{Utils.formatCurrency(summary.totalAdvanceDeduction || 0)}</div>
          </div>
          <div className="summary-card-modern" style={{ borderColor: '#22c55e' }}>
            <div className="summary-label" style={{ color: '#22c55e' }}><CheckCircle size={16} /> Net Salary</div>
            <div className="summary-value" style={{ color: '#22c55e' }}>{Utils.formatCurrency(summary.totalNetSalary || 0)}</div>
          </div>
        </div>

        <div className="report-table-container">
          <table className="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Worker</th>
                <th>Role</th>
                <th>Present Days</th>
                <th>Normal Hours</th>
                <th>OT Hours</th>
                <th>Gross Salary</th>
                <th>Loan Ded.</th>
                <th>Advance Ded.</th>
                <th>Total Ded.</th>
                <th>Net Salary</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w, index) => {
                const hasLoan = (w.deductions?.totalLoanDeduction || 0) > 0;
                const hasAdvance = (w.deductions?.totalAdvanceDeduction || 0) > 0;

                return (
                  <tr key={w.workerId || index} className={index % 2 === 0 ? 'even' : 'odd'}>
                    <td>{index + 1}</td>
                    <td><strong>{w.workerName}</strong></td>
                    <td>{w.role || 'N/A'}</td>
                    <td>{w.attendance?.presentDays || 0}/{w.attendance?.totalDays || 0}</td>
                    <td>{w.attendance?.normalHours?.toFixed(1) || '0.0'}h</td>
                    <td>{w.attendance?.overtimeHours?.toFixed(1) || '0.0'}h</td>
                    <td className="text-success">{Utils.formatCurrency(w.salary?.grossSalary || 0)}</td>
                    <td className={hasLoan ? 'text-danger' : ''}>
                      {hasLoan ? Utils.formatCurrency(w.deductions?.totalLoanDeduction || 0) : '-'}
                    </td>
                    <td className={hasAdvance ? 'text-warning' : ''}>
                      {hasAdvance ? Utils.formatCurrency(w.deductions?.totalAdvanceDeduction || 0) : '-'}
                    </td>
                    <td className="text-danger">{Utils.formatCurrency(w.deductions?.totalDeductions || 0)}</td>
                    <td className="text-success font-bold">{Utils.formatCurrency(w.netSalary || 0)}</td>
                    <td>
                      <button
                        className="btn-small-modern"
                        onClick={() => handlePrintSalarySlip(w)}
                        title="Print Salary Slip"
                      >
                        <Printer size={14} /> Slip
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {workers.length === 0 && (
          <div className="empty-state-modern">
            <FileText size={48} />
            <h3>No Workers Found</h3>
            <p>No salary data available for this month.</p>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER REPORTS VIEW
  // ============================================
  const renderReports = () => {
    const reportData = reportViewMode === 'attendance' ? attendanceReport : salaryReportData;

    return (
      <div className="reports-container-modern">
        <div className="report-controls-modern">
          <div className="control-group">
            <label><CalendarDays size={16} /> Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                if (reportViewMode === 'salary') {
                  setTimeout(loadSalaryReport, 100);
                }
              }}
              className="month-input"
            />
          </div>
          <div className="control-group">
            <label><Users size={16} /> Worker:</label>
            <select
              value={selectedReportWorkerId}
              onChange={(e) => setSelectedReportWorkerId(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Workers</option>
              {data.workers?.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <button className="btn-refresh-modern" onClick={() => {
            if (reportViewMode === 'salary') {
              loadSalaryReport();
            } else {
              refreshData();
            }
          }}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        <div className="report-view-toggle">
          <button
            className={`toggle-btn ${reportViewMode === 'attendance' ? 'active' : ''}`}
            onClick={() => {
              setReportViewMode('attendance');
              setSalaryReportData(null);
            }}
          >
            <Clock size={16} /> Attendance Report
          </button>
          <button
            className={`toggle-btn ${reportViewMode === 'salary' ? 'active' : ''}`}
            onClick={() => {
              setReportViewMode('salary');
              setTimeout(loadSalaryReport, 100);
            }}
          >
            <DollarSign size={16} /> Salary Report
          </button>
        </div>

        <div className="export-actions">
          <button
            className="btn-export"
            onClick={() => {
              if (reportViewMode === 'attendance') {
                handlePrintAttendanceReport(attendanceReport);
              } else {
                window.print();
              }
            }}
          >
            <Printer size={16} /> Print Report
          </button>
        </div>

        {reportViewMode === 'attendance' ? (
          !attendanceReport || attendanceReport.workers?.length === 0 ? (
            <div className="empty-state-modern">
              <FileText size={48} />
              <h3>No Data Found</h3>
              <p>No attendance records found for the selected month.</p>
            </div>
          ) : (
            <>
              <div className="report-summary-modern">
                <div className="summary-card-modern">
                  <div className="summary-label"><Users size={16} /> Total Workers</div>
                  <div className="summary-value">{attendanceReport.totalWorkers}</div>
                </div>
                <div className="summary-card-modern">
                  <div className="summary-label"><CheckCircle size={16} /> Total Present</div>
                  <div className="summary-value">{attendanceReport.totalPresent}</div>
                </div>
                <div className="summary-card-modern">
                  <div className="summary-label"><Timer size={16} /> Total Hours</div>
                  <div className="summary-value">{attendanceReport.totalHours.toFixed(1)}h</div>
                </div>
                <div className="summary-card-modern">
                  <div className="summary-label"><DollarSign size={16} /> Total Wages</div>
                  <div className="summary-value">{Utils.formatCurrency(attendanceReport.totalWages)}</div>
                </div>
              </div>

              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Total Days</th>
                      <th>Present</th>
                      <th>Absent</th>
                      <th>Attendance Rate</th>
                      <th>Total Hours</th>
                      <th>OT Hours</th>
                      <th>Total Wages</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceReport.workers.map((w, index) => (
                      <tr key={w.worker.id} className={index % 2 === 0 ? 'even' : 'odd'}>
                        <td>
                          <button className="expand-btn" onClick={() => toggleReportExpand(w.worker.id)}>
                            {expandedReportWorkers[w.worker.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            {w.worker.name}
                          </button>
                        </td>
                        <td>{w.totalDays}</td>
                        <td className="text-success">{w.presentDays}</td>
                        <td className="text-danger">{w.absentDays}</td>
                        <td>
                          <span className={`rate-badge ${w.attendanceRate >= 80 ? 'good' : 'bad'}`}>
                            {w.attendanceRate.toFixed(1)}%
                          </span>
                        </td>
                        <td>{w.totalHours.toFixed(1)}h</td>
                        <td>{w.totalOvertime.toFixed(1)}h</td>
                        <td>{Utils.formatCurrency(w.totalWages)}</td>
                        <td>
                          <button className="btn-small-modern" onClick={() => {
                            const salaryData = {
                              ...w,
                              basicHours: w.totalHours - w.totalOvertime,
                              basicSalary: (w.totalHours - w.totalOvertime) * (w.worker.hourlyRate || 0),
                              overtimeSalary: w.totalOvertime * (w.worker.hourlyRate || 0) * 1.5,
                              totalSalary: (w.totalHours - w.totalOvertime) * (w.worker.hourlyRate || 0) + w.totalOvertime * (w.worker.hourlyRate || 0) * 1.5,
                              advance: w.worker.advancePayment || 0,
                              netSalary: ((w.totalHours - w.totalOvertime) * (w.worker.hourlyRate || 0) + w.totalOvertime * (w.worker.hourlyRate || 0) * 1.5) - (w.worker.advancePayment || 0),
                              rate: w.worker.hourlyRate || 0,
                              loans: [],
                              advances: [],
                              totalLoanDeduction: 0,
                              totalAdvanceDeduction: 0,
                              totalDeductions: w.worker.advancePayment || 0
                            };
                            handlePrintSalarySlip(salaryData);
                          }}>
                            <Printer size={14} /> Slip
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )
        ) : (
          renderSalaryReport()
        )}
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="attendance-manager-modern">
      {/* Header */}
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <Clock size={28} />
            <span className="header-badge">Attendance</span>
          </div>
          <div>
            <h2>Attendance & Time Tracking</h2>
            <p className="header-subtitle">Track worker attendance and manage clock-in/out</p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-refresh-modern" onClick={() => refreshData()}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="view-tabs-modern">
        <button
          className={`tab-btn ${viewMode === 'workers' ? 'active' : ''}`}
          onClick={() => { setViewMode('workers'); setError(''); setSuccess(''); }}
        >
          <Users size={16} />
          Workers
        </button>
        <button
          className={`tab-btn ${viewMode === 'teams' ? 'active' : ''}`}
          onClick={() => { setViewMode('teams'); setError(''); setSuccess(''); if (teams.length > 0 && !selectedTeamId) setSelectedTeamId(teams[0].id); }}
        >
          <Users2 size={16} />
          Teams
        </button>
        <button
          className={`tab-btn ${viewMode === 'reports' ? 'active' : ''}`}
          onClick={() => { setViewMode('reports'); setError(''); setSuccess(''); }}
        >
          <FileText size={16} />
          Reports
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && <div className="error-message-modern"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="success-message-modern"><CheckCircle size={16} /> {success}</div>}

      {/* Date Selector */}
      {viewMode !== 'reports' && (
        <div className="attendance-date-selector-modern">
          <label><CalendarDays size={16} /> Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => { setSelectedDate(e.target.value); setTimeout(() => refreshData(), 100); }}
          />
        </div>
      )}

      {/* Workers View */}
      {viewMode === 'workers' && (
        <>
          <div className="stats-grid-modern">
            <div
              className="stat-card-modern"
              onMouseEnter={(e) => handleCardHover('present', e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="stat-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
                <UserCheck size={22} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Present Today</span>
                <span className="stat-value">{dayStats.present}</span>
              </div>
              <div className="stat-trend">
                <TrendingUp size={16} />
              </div>
            </div>

            <div
              className="stat-card-modern"
              onMouseEnter={(e) => handleCardHover('working', e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                <Activity size={22} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Currently Working</span>
                <span className="stat-value">{dayStats.working}</span>
              </div>
              <div className="stat-trend">
                <TrendingUp size={16} />
              </div>
            </div>

            <div
              className="stat-card-modern"
              onMouseEnter={(e) => handleCardHover('hours', e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b' }}>
                <Timer size={22} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Hours</span>
                <span className="stat-value">{dayStats.totalHours.toFixed(1)}h</span>
              </div>
              <div className="stat-trend">
                <TrendingUp size={16} />
              </div>
            </div>

            <div
              className="stat-card-modern"
              onMouseEnter={(e) => handleCardHover('wages', e)}
              onMouseLeave={handleCardLeave}
              onMouseMove={(e) => setTooltipPosition({ x: e.clientX + 15, y: e.clientY - 10 })}
            >
              <div className="stat-icon-wrapper" style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e' }}>
                <DollarSign size={22} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Total Wages</span>
                <span className="stat-value">{Utils.formatCurrencyShort(dayStats.totalWages)}</span>
              </div>
              <div className="stat-trend">
                <TrendingUp size={16} />
              </div>
            </div>
          </div>

          {/* Stat card tooltip */}
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

          {/* Worker search + status filter */}
          <div className="worker-filter-bar">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                value={workerSearchTerm}
                onChange={(e) => setWorkerSearchTerm(e.target.value)}
                placeholder="Search workers by name, role, or site..."
                className="search-input"
              />
              {workerSearchTerm && (
                <button className="search-clear" onClick={() => setWorkerSearchTerm('')}>
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="filter-select-wrapper">
              <Filter size={16} className="filter-icon" />
              <select
                value={workerStatusFilter}
                onChange={(e) => setWorkerStatusFilter(e.target.value)}
                className="status-filter-select"
              >
                <option value="all">All Status</option>
                <option value="working">Working</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="absent">Absent</option>
              </select>
            </div>
          </div>

          {renderWorkerList()}
        </>
      )}

      {/* Teams View */}
      {viewMode === 'teams' && renderTeamList()}

      {/* Reports View */}
      {viewMode === 'reports' && renderReports()}

      {/* Site Selection Modal */}
      {renderSiteModal()}

      {/* Row hover tooltips */}
      {renderWorkerTooltip()}
      {renderMemberTooltip()}
    </div>
  );
};

export default AttendanceManager;