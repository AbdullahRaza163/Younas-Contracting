import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Building2,
  HardHat,
  Clock,
  Printer,
  X,
  Package,

  Save,
  
  ClipboardList,
  
 
  Bot,
  Settings as SettingsIcon,
  TrendingDownIcon,
  TrendingUp,
  DollarSign,
  UserCheck,
  BarChart3,
  
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  Edit,
  Trash2,
  Download,
  Upload,
  Users,
  FileText,
  TrendingUp as TrendingUpIcon
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
import * as XLSX from 'xlsx';
import './App.css';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================
const CONFIG = {
  API_BASE: process.env.REACT_APP_API_URL || '/api',
  CURRENCY: 'BD',
  COMPANY_NAME: 'Haji Younas Contracting',
  VERSION: '2.0.0'
};

// ============================================
// API SERVICE
// ============================================
class ApiService {
  static async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  static async getSites() { return this.request('/sites'); }
  static async createSite(site) { return this.request('/sites', { method: 'POST', body: JSON.stringify(site) }); }
  static async updateSite(id, site) { return this.request(`/sites/${id}`, { method: 'PUT', body: JSON.stringify(site) }); }
  static async deleteSite(id) { return this.request(`/sites/${id}`, { method: 'DELETE' }); }

  static async getWorkers() { return this.request('/workers'); }
  static async createWorker(worker) { return this.request('/workers', { method: 'POST', body: JSON.stringify(worker) }); }
  static async updateWorker(id, worker) { return this.request(`/workers/${id}`, { method: 'PUT', body: JSON.stringify(worker) }); }
  static async deleteWorker(id) { return this.request(`/workers/${id}`, { method: 'DELETE' }); }

  static async getEntries(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/entries?${params}`);
  }
  static async createEntry(entry) { return this.request('/entries', { method: 'POST', body: JSON.stringify(entry) }); }
  static async updateEntry(id, entry) { return this.request(`/entries/${id}`, { method: 'PUT', body: JSON.stringify(entry) }); }
  static async deleteEntry(id) { return this.request(`/entries/${id}`, { method: 'DELETE' }); }

  static async getAttendance(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/attendance?${params}`);
  }
  static async createAttendance(attendance) {
    return this.request('/attendance', { method: 'POST', body: JSON.stringify(attendance) });
  }

  static async getSettings() { return this.request('/settings'); }
  static async updateSettings(settings) { return this.request('/settings', { method: 'POST', body: JSON.stringify(settings) }); }

  static async chat(message, context) {
    return this.request('/chat', { method: 'POST', body: JSON.stringify({ message, context }) });
  }

  static async healthCheck() { return this.request('/health'); }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
const Utils = {
  today: () => new Date().toISOString().split('T')[0],
  formatDate: (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  },
  formatCurrency: (amount) => `${Number(amount || 0).toFixed(3)} ${CONFIG.CURRENCY}`,
  formatTime: (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  },
  calculateHoursWorked: (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100;
  },
  calculateDailyWage: (hoursWorked, dailyRate) => {
    const hourlyRate = dailyRate / 8;
    return hoursWorked * hourlyRate;
  },
  getDaysInMonth: (date = new Date()) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  },
  calculateDailyOH: (monthlyOH, date = new Date()) => {
    const days = Utils.getDaysInMonth(date);
    return monthlyOH / days;
  },
  calculateEntryProfit: (entry) => {
    return (entry.kamai || 0) - (entry.labour || 0) - (entry.overhead || 0) - (entry.oneTime || 0);
  },
  calculateTotal: (entries, field) => {
    return entries.reduce((sum, e) => sum + (Number(e[field]) || 0), 0);
  },
  calculateSiteProfit: (entries, siteId) => {
    const siteEntries = entries.filter(e => e.siteId === siteId);
    const kamai = Utils.calculateTotal(siteEntries, 'kamai');
    const labour = Utils.calculateTotal(siteEntries, 'labour');
    const overhead = Utils.calculateTotal(siteEntries, 'overhead');
    const oneTime = Utils.calculateTotal(siteEntries, 'oneTime');
    return kamai - labour - overhead - oneTime;
  },
  getWorkerAttendance: (attendance, workerId, date) => {
    return attendance.find(a => a.workerId === workerId && a.date === date) || null;
  },
  calculateWorkerSalary: (worker, attendanceRecords) => {
    const workerAttendance = attendanceRecords.filter(a => a.workerId === worker.id);
    const totalHours = workerAttendance.reduce((sum, a) => {
      if (a.checkedIn && a.checkedOut) {
        return sum + Utils.calculateHoursWorked(a.checkedIn, a.checkedOut);
      }
      return sum;
    }, 0);
    const totalWage = Utils.calculateDailyWage(totalHours, worker.dailyRate);
    return { totalHours, totalWage, daysPresent: workerAttendance.filter(a => a.present).length };
  }
};

// ============================================
// CUSTOM HOOKS
// ============================================
const useData = () => {
  const [data, setData] = useState({
    sites: [],
    workers: [],
    entries: [],
    attendance: [],
    materials: [], // New: Materials inventory
    bom: [], // New: Bills of Materials
    monthlyOverhead: 194,
    settings: { currency: 'BD', language: 'urdu' }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sites, workers, entries, attendance, settings] = await Promise.all([
        ApiService.getSites(),
        ApiService.getWorkers(),
        ApiService.getEntries(),
        ApiService.getAttendance(),
        ApiService.getSettings()
      ]);

      const newData = {
        sites: sites || [],
        workers: workers || [],
        entries: entries || [],
        attendance: attendance || [],
        monthlyOverhead: settings.monthly_overhead || 194,
        settings: settings || { currency: 'BD', language: 'urdu' }
      };

      setData(newData);
      try {
        localStorage.setItem('haji_younas_backup', JSON.stringify(newData));
      } catch (e) { }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data from server. Make sure Flask is running.');
      try {
        const backup = localStorage.getItem('haji_younas_backup');
        if (backup) {
          const parsed = JSON.parse(backup);
          setData(parsed);
        }
      } catch (e) { }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refreshData = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const clockInWorker = useCallback(async (workerId, date) => {
    try {
      const now = new Date().toISOString();
      const attendanceData = { workerId, date, checkedIn: now, checkedOut: null, present: true };
      const result = await ApiService.createAttendance(attendanceData);
      setData(prev => {
        const existing = prev.attendance.find(a => a.workerId === workerId && a.date === date);
        if (existing) {
          return {
            ...prev,
            attendance: prev.attendance.map(a =>
              a.workerId === workerId && a.date === date ? result : a
            )
          };
        } else {
          return { ...prev, attendance: [...prev.attendance, result] };
        }
      });
      return result;
    } catch (err) {
      console.error('Failed to clock in:', err);
      throw err;
    }
  }, []);

  const clockOutWorker = useCallback(async (workerId, date) => {
    try {
      const now = new Date().toISOString();
      const existing = data.attendance.find(a => a.workerId === workerId && a.date === date);
      if (!existing) throw new Error('Worker not checked in');
      if (existing.checkedOut) throw new Error('Worker already clocked out');

      const attendanceData = {
        workerId,
        date,
        checkedIn: existing.checkedIn,
        checkedOut: now,
        present: true
      };
      const result = await ApiService.createAttendance(attendanceData);
      setData(prev => ({
        ...prev,
        attendance: prev.attendance.map(a =>
          a.workerId === workerId && a.date === date ? result : a
        )
      }));
      return result;
    } catch (err) {
      console.error('Failed to clock out:', err);
      throw err;
    }
  }, [data.attendance]);

  const addEntry = useCallback(async (entry) => {
    try {
      const newEntry = await ApiService.createEntry(entry);
      setData(prev => ({ ...prev, entries: [newEntry, ...prev.entries] }));
      return newEntry;
    } catch (err) {
      console.error('Failed to add entry:', err);
      throw err;
    }
  }, []);

  const updateEntry = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateEntry(id, updates);
      setData(prev => ({
        ...prev,
        entries: prev.entries.map(e => e.id === id ? updated : e)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update entry:', err);
      throw err;
    }
  }, []);

  const deleteEntry = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await ApiService.deleteEntry(id);
      setData(prev => ({ ...prev, entries: prev.entries.filter(e => e.id !== id) }));
    } catch (err) {
      console.error('Failed to delete entry:', err);
      throw err;
    }
  }, []);

  const addSite = useCallback(async (site) => {
    try {
      const newSite = await ApiService.createSite(site);
      setData(prev => ({ ...prev, sites: [...prev.sites, newSite] }));
      return newSite;
    } catch (err) {
      console.error('Failed to add site:', err);
      throw err;
    }
  }, []);

  const updateSite = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateSite(id, updates);
      setData(prev => ({
        ...prev,
        sites: prev.sites.map(s => s.id === id ? updated : s)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update site:', err);
      throw err;
    }
  }, []);

  const deleteSite = useCallback(async (id) => {
    if (!window.confirm('Delete this site? All associated entries will be removed.')) return;
    try {
      await ApiService.deleteSite(id);
      setData(prev => ({
        ...prev,
        sites: prev.sites.filter(s => s.id !== id),
        entries: prev.entries.filter(e => e.siteId !== id)
      }));
    } catch (err) {
      console.error('Failed to delete site:', err);
      throw err;
    }
  }, []);

  const addWorker = useCallback(async (worker) => {
    try {
      const newWorker = await ApiService.createWorker(worker);
      setData(prev => ({ ...prev, workers: [...prev.workers, newWorker] }));
      return newWorker;
    } catch (err) {
      console.error('Failed to add worker:', err);
      throw err;
    }
  }, []);

  const updateWorker = useCallback(async (id, updates) => {
    try {
      const updated = await ApiService.updateWorker(id, updates);
      setData(prev => ({
        ...prev,
        workers: prev.workers.map(w => w.id === id ? updated : w)
      }));
      return updated;
    } catch (err) {
      console.error('Failed to update worker:', err);
      throw err;
    }
  }, []);

  const deleteWorker = useCallback(async (id) => {
    if (!window.confirm('Delete this worker? All attendance records will be removed.')) return;
    try {
      await ApiService.deleteWorker(id);
      setData(prev => ({
        ...prev,
        workers: prev.workers.filter(w => w.id !== id),
        attendance: prev.attendance.filter(a => a.workerId !== id)
      }));
    } catch (err) {
      console.error('Failed to delete worker:', err);
      throw err;
    }
  }, []);

  const updateData = useCallback((newData) => {
    setData(prev => ({ ...prev, ...newData }));
  }, []);

  return {
    data,
    loading,
    error,
    loadData,
    refreshData,
    updateData,
    addEntry,
    updateEntry,
    deleteEntry,
    addSite,
    updateSite,
    deleteSite,
    addWorker,
    updateWorker,
    deleteWorker,
    clockInWorker,
    clockOutWorker
  };
};

const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (message, context) => {
    setLoading(true);
    setError(null);
    try {
      const response = await ApiService.chat(message, context);
      return response.reply;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendMessage, loading, error };
};
// ============================================
// DAILY WORK REPORT - ERP STYLE
// ============================================
const DailyReportComponent = ({ data, selectedDate }) => {
  const [reportDate, setReportDate] = useState(selectedDate || Utils.today());
  const [showReport, setShowReport] = useState(false);

  // Get data for the selected date
  const dailyData = useMemo(() => {
    const date = reportDate;
    const dayEntries = data.entries.filter(e => e.date === date);
    const dayAttendance = data.attendance.filter(a => a.date === date);

    // Worker details with hours
    const workerDetails = data.workers.map(worker => {
      const attendance = dayAttendance.find(a => a.workerId === worker.id);
      let hours = 0;
      let wage = 0;
      let checkIn = null;
      let checkOut = null;
      let status = 'Absent';

      if (attendance) {
        checkIn = attendance.checkedIn;
        checkOut = attendance.checkedOut;
        status = attendance.present ? 'Present' : 'Absent';

        if (attendance.checkedIn && attendance.checkedOut) {
          hours = Utils.calculateHoursWorked(attendance.checkedIn, attendance.checkedOut);
          wage = Utils.calculateDailyWage(hours, worker.dailyRate);
        } else if (attendance.checkedIn && !attendance.checkedOut) {
          status = 'Working';
          const now = new Date().toISOString();
          hours = Utils.calculateHoursWorked(attendance.checkedIn, now);
          wage = Utils.calculateDailyWage(hours, worker.dailyRate);
        }
      }

      return {
        ...worker,
        checkIn,
        checkOut,
        hours,
        wage,
        status,
        attendance: attendance || null
      };
    });

    // Site performance
    const sitePerformance = data.sites.map(site => {
      const siteEntries = dayEntries.filter(e => e.siteId === site.id);
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

    // Summary
    const totalRevenue = Utils.calculateTotal(dayEntries, 'kamai');
    const totalLabour = Utils.calculateTotal(dayEntries, 'labour');
    const totalOverhead = Utils.calculateTotal(dayEntries, 'overhead');
    const totalOneTime = Utils.calculateTotal(dayEntries, 'oneTime');
    const totalProfit = totalRevenue - totalLabour - totalOverhead - totalOneTime;
    const workersPresent = workerDetails.filter(w => w.status === 'Present' || w.status === 'Working').length;
    const totalHours = workerDetails.reduce((sum, w) => sum + w.hours, 0);
    const totalWages = workerDetails.reduce((sum, w) => sum + w.wage, 0);

    return {
      date,
      dayEntries,
      dayAttendance,
      workerDetails,
      sitePerformance,
      totalRevenue,
      totalLabour,
      totalOverhead,
      totalOneTime,
      totalProfit,
      workersPresent,
      totalHours,
      totalWages,
      entryCount: dayEntries.length
    };
  }, [data, reportDate]);

  const handlePrint = () => {
    window.print();
  };

  // const handleExportPDF = () => {
  //   // For PDF, we'll use the print functionality with PDF printer
  //   window.print();
  // };

  if (!showReport) {
    return (
      <div className="daily-report-modern">
        <h2>Daily Work Report</h2>
        <div className="report-controls">
          <div className="date-selector">
            <label>Select Date:</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </div>
          <button
            className="btn-primary-modern"
            onClick={() => setShowReport(true)}
          >
            <FileText size={16} /> Generate Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="daily-report-modern">
      <div className="report-controls">
        <div className="date-selector">
          <label>Select Date:</label>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
          />
        </div>
        <div className="report-actions">
          <button className="btn-primary-modern" onClick={handlePrint}>
            <Printer size={16} /> Print / PDF
          </button>
          <button className="btn-secondary-modern" onClick={() => setShowReport(false)}>
            <X size={16} /> Close
          </button>
        </div>
      </div>

      {/* ============================================
          REPORT CONTENT - PRINTABLE
          ============================================ */}
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
            <p>Date: {Utils.formatDate(reportDate)}</p>
            <p>Generated: {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="report-section">
          <h3>Executive Summary</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="label">Total Revenue</span>
              <span className="value">{Utils.formatCurrency(dailyData.totalRevenue)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Total Labour Cost</span>
              <span className="value">{Utils.formatCurrency(dailyData.totalLabour)}</span>
            </div>
            <div className="summary-item">
              <span className="label">Net Profit</span>
              <span className={`value ${dailyData.totalProfit >= 0 ? 'positive' : 'negative'}`}>
                {Utils.formatCurrency(dailyData.totalProfit)}
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Workers Present</span>
              <span className="value">{dailyData.workersPresent} / {data.workers.length}</span>
            </div>
            <div className="summary-item">
              <span className="label">Total Hours Worked</span>
              <span className="value">{dailyData.totalHours.toFixed(1)}h</span>
            </div>
            <div className="summary-item">
              <span className="label">Total Wages</span>
              <span className="value">{Utils.formatCurrency(dailyData.totalWages)}</span>
            </div>
          </div>
        </div>

        {/* Worker Attendance & Hours */}
        <div className="report-section">
          <h3>Worker Attendance & Hours</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Worker</th>
                <th>Role</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Hours</th>
                <th>Wage (BD)</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.workerDetails.map((w, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{w.name}</td>
                  <td>{w.role || '-'}</td>
                  <td>
                    <span className={`status-badge ${w.status.toLowerCase()}`}>
                      {w.status}
                    </span>
                  </td>
                  <td>{w.checkIn ? Utils.formatTime(w.checkIn) : '-'}</td>
                  <td>{w.checkOut ? Utils.formatTime(w.checkOut) : '-'}</td>
                  <td>{w.hours.toFixed(1)}</td>
                  <td className="amount">{Utils.formatCurrency(w.wage)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="6"><strong>Totals</strong></td>
                <td><strong>{dailyData.totalHours.toFixed(1)}h</strong></td>
                <td><strong>{Utils.formatCurrency(dailyData.totalWages)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Overtime Report */}
        <div className="report-section">
          <h3>Overtime Report</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Worker</th>
                <th>Regular Hours</th>
                <th>Overtime Hours</th>
                <th>Overtime Rate</th>
                <th>Overtime Pay (BD)</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.workerDetails
                .filter(w => w.hours > 8)
                .map((w, i) => {
                  const overtimeHours = w.hours - 8;
                  const hourlyRate = w.dailyRate / 8;
                  const overtimePay = overtimeHours * hourlyRate * 1.5;
                  return (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{w.name}</td>
                      <td>8.0</td>
                      <td className="overtime">{overtimeHours.toFixed(1)}</td>
                      <td>{Utils.formatCurrency(hourlyRate * 1.5)}/h</td>
                      <td className="amount">{Utils.formatCurrency(overtimePay)}</td>
                    </tr>
                  );
                })}
              {dailyData.workerDetails.filter(w => w.hours > 8).length === 0 && (
                <tr>
                  <td colSpan="6" className="no-data">No overtime recorded today</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5"><strong>Total Overtime Pay</strong></td>
                <td>
                  <strong>
                    {Utils.formatCurrency(
                      dailyData.workerDetails
                        .filter(w => w.hours > 8)
                        .reduce((sum, w) => {
                          const overtimeHours = w.hours - 8;
                          const hourlyRate = w.dailyRate / 8;
                          return sum + (overtimeHours * hourlyRate * 1.5);
                        }, 0)
                    )}
                  </strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Site Performance */}
        <div className="report-section">
          <h3>Site Performance</h3>
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
              {dailyData.sitePerformance.map((site, i) => (
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
              {dailyData.sitePerformance.length === 0 && (
                <tr>
                  <td colSpan="8" className="no-data">No site activity today</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="3"><strong>Totals</strong></td>
                <td className="amount"><strong>{Utils.formatCurrency(dailyData.totalRevenue)}</strong></td>
                <td className="amount"><strong>{Utils.formatCurrency(dailyData.totalLabour)}</strong></td>
                <td className="amount"><strong>{Utils.formatCurrency(dailyData.totalOverhead)}</strong></td>
                <td className="amount"><strong>{Utils.formatCurrency(dailyData.totalOneTime)}</strong></td>
                <td className={`amount ${dailyData.totalProfit >= 0 ? 'positive' : 'negative'}`}>
                  <strong>{Utils.formatCurrency(dailyData.totalProfit)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Detailed Entries */}
        <div className="report-section">
          <h3>Detailed Entries</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Site</th>
                <th>Revenue</th>
                <th>Labour</th>
                <th>Overhead</th>
                <th>One-Time</th>
                <th>Profit</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.dayEntries.map((entry, i) => {
                const site = data.sites.find(s => s.id === entry.siteId);
                const profit = Utils.calculateEntryProfit(entry);
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{site?.name || 'Unknown'}</td>
                    <td className="amount">{Utils.formatCurrency(entry.kamai)}</td>
                    <td className="amount">{Utils.formatCurrency(entry.labour)}</td>
                    <td className="amount">{Utils.formatCurrency(entry.overhead)}</td>
                    <td className="amount">{Utils.formatCurrency(entry.oneTime)}</td>
                    <td className={`amount ${profit >= 0 ? 'positive' : 'negative'}`}>
                      {Utils.formatCurrency(profit)}
                    </td>
                    <td>{entry.note || '-'}</td>
                  </tr>
                );
              })}
              {dailyData.dayEntries.length === 0 && (
                <tr>
                  <td colSpan="8" className="no-data">No entries recorded today</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="report-footer">
          <p>Report generated by Haji Younas Contracting Management System</p>
          <p>Version {CONFIG.VERSION} | {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================
// BOM & MATERIAL PREDICTION
// ============================================
const BOMComponent = ({ data, updateData }) => {
  const [activeTab, setActiveTab] = useState('materials'); // materials, bom, prediction
  const [materialForm, setMaterialForm] = useState({
    name: '',
    category: 'Construction',
    unit: 'kg',
    unitPrice: '',
    quantity: '',
    supplier: '',
    reorderLevel: ''
  });
  const [bomForm, setBomForm] = useState({
    projectName: '',
    siteId: '',
    materials: [],
    estimatedHours: '',
    labourCost: '',
    overheadPercentage: '10'
  });
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [predictionParams, setPredictionParams] = useState({
    projectType: 'residential',
    area: '',
    floors: '1',
    materialType: 'all'
  });
  const [predictionResult, setPredictionResult] = useState(null);

  // Material Categories
  const categories = [
    'Construction', 'Steel', 'Cement', 'Sand', 'Gravel', 'Wood',
    'Electrical', 'Plumbing', 'Finishing', 'Painting', 'Glass', 'Insulation'
  ];

  const units = ['kg', 'ton', 'm3', 'm2', 'liters', 'pieces', 'rolls', 'sheets'];

  // Add/Update Material
  const handleMaterialSubmit = (e) => {
    e.preventDefault();
    if (!materialForm.name) return;

    const material = {
      id: editingMaterial || Date.now().toString(),
      ...materialForm,
      unitPrice: parseFloat(materialForm.unitPrice) || 0,
      quantity: parseFloat(materialForm.quantity) || 0,
      reorderLevel: parseFloat(materialForm.reorderLevel) || 0,
      createdAt: new Date().toISOString()
    };

    let updatedMaterials;
    if (editingMaterial) {
      updatedMaterials = data.materials.map(m =>
        m.id === editingMaterial ? material : m
      );
    } else {
      updatedMaterials = [...(data.materials || []), material];
    }

    updateData({ materials: updatedMaterials });
    setMaterialForm({ name: '', category: 'Construction', unit: 'kg', unitPrice: '', quantity: '', supplier: '', reorderLevel: '' });
    setEditingMaterial(null);
  };

  // Delete Material
  const deleteMaterial = (id) => {
    if (window.confirm('Delete this material?')) {
      updateData({ materials: data.materials.filter(m => m.id !== id) });
    }
  };

  // Add Material to BOM
  const addMaterialToBOM = (material) => {
    setBomForm(prev => ({
      ...prev,
      materials: [...prev.materials, {
        materialId: material.id,
        name: material.name,
        unit: material.unit,
        unitPrice: material.unitPrice,
        quantity: 1,
        totalCost: material.unitPrice
      }]
    }));
  };

  // Remove Material from BOM
  const removeFromBOM = (index) => {
    setBomForm(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== index)
    }));
  };

  // Update BOM Material Quantity
  const updateBOMQuantity = (index, quantity) => {
    setBomForm(prev => {
      const updated = [...prev.materials];
      updated[index].quantity = parseFloat(quantity) || 0;
      updated[index].totalCost = updated[index].unitPrice * updated[index].quantity;
      return { ...prev, materials: updated };
    });
  };

  // Save BOM
  const saveBOM = (e) => {
    e.preventDefault();
    if (!bomForm.projectName) return;

    const totalMaterialCost = bomForm.materials.reduce((sum, m) => sum + m.totalCost, 0);
    const labourCost = parseFloat(bomForm.labourCost) || 0;
    const overhead = (totalMaterialCost + labourCost) * (parseFloat(bomForm.overheadPercentage) / 100);
    const totalCost = totalMaterialCost + labourCost + overhead;

    const bom = {
      id: Date.now().toString(),
      ...bomForm,
      totalMaterialCost,
      labourCost,
      overhead,
      totalCost,
      createdAt: new Date().toISOString()
    };

    updateData({ bom: [...(data.bom || []), bom] });
    setBomForm({
      projectName: '',
      siteId: '',
      materials: [],
      estimatedHours: '',
      labourCost: '',
      overheadPercentage: '10'
    });
  };

  // Material Prediction Engine
  const generatePrediction = () => {
    // Simple prediction based on area, project type, and historical data
    const { projectType, area, floors, materialType } = predictionParams;
    const areaNum = parseFloat(area) || 0;
    const floorsNum = parseInt(floors) || 1;

    // Base material quantities per m2 by project type
    const materialRates = {
      residential: {
        cement: 0.15, // tons per m2
        steel: 0.08, // tons per m2
        sand: 0.12, // m3 per m2
        gravel: 0.10, // m3 per m2
        wood: 0.05, // m3 per m2
        bricks: 50 // pieces per m2
      },
      commercial: {
        cement: 0.20,
        steel: 0.12,
        sand: 0.15,
        gravel: 0.12,
        wood: 0.03,
        bricks: 40
      },
      industrial: {
        cement: 0.25,
        steel: 0.18,
        sand: 0.10,
        gravel: 0.15,
        wood: 0.02,
        bricks: 30
      }
    };

    const rates = materialRates[projectType] || materialRates.residential;
    const totalArea = areaNum * floorsNum;

    // Calculate quantities
    const prediction = {
      projectType,
      totalArea,
      floors: floorsNum,
      materials: {
        cement: { quantity: rates.cement * totalArea, unit: 'tons' },
        steel: { quantity: rates.steel * totalArea, unit: 'tons' },
        sand: { quantity: rates.sand * totalArea, unit: 'm3' },
        gravel: { quantity: rates.gravel * totalArea, unit: 'm3' },
        wood: { quantity: rates.wood * totalArea, unit: 'm3' },
        bricks: { quantity: Math.round(rates.bricks * totalArea), unit: 'pieces' }
      },
      estimatedCost: 0,
      laborHours: totalArea * 2.5, // 2.5 hours per m2
      timeline: Math.ceil(totalArea / 100) // days
    };

    // Calculate estimated cost using current material prices
    const materials = data.materials || [];
    let totalCost = 0;
    Object.keys(prediction.materials).forEach(key => {
      const material = materials.find(m =>
        m.category.toLowerCase() === key ||
        m.name.toLowerCase().includes(key)
      );
      if (material) {
        const cost = prediction.materials[key].quantity * material.unitPrice;
        prediction.materials[key].cost = cost;
        totalCost += cost;
      } else {
        // Estimate using average price if material not in inventory
        const avgPrice = 50; // Default average price
        prediction.materials[key].cost = prediction.materials[key].quantity * avgPrice;
        totalCost += prediction.materials[key].quantity * avgPrice;
        prediction.materials[key].estimatedPrice = true;
      }
    });

    prediction.estimatedCost = totalCost;

    // Filter by material type if specified
    if (materialType !== 'all') {
      const filtered = {};
      Object.keys(prediction.materials).forEach(key => {
        if (key === materialType || key.includes(materialType)) {
          filtered[key] = prediction.materials[key];
        }
      });
      prediction.materials = filtered;
    }

    setPredictionResult(prediction);
  };

  return (
    <div className="bom-modern">
      <h2>Bill of Materials & Prediction</h2>

      {/* Tabs */}
      <div className="bom-tabs">
        <button
          className={`bom-tab ${activeTab === 'materials' ? 'active' : ''}`}
          onClick={() => setActiveTab('materials')}
        >
          <Package size={18} /> Materials
        </button>
        <button
          className={`bom-tab ${activeTab === 'bom' ? 'active' : ''}`}
          onClick={() => setActiveTab('bom')}
        >
          <ClipboardList size={18} /> BOM
        </button>
        <button
          className={`bom-tab ${activeTab === 'prediction' ? 'active' : ''}`}
          onClick={() => setActiveTab('prediction')}
        >
          <TrendingUpIcon size={18} /> Prediction
        </button>
      </div>

      {/* ============================================
          MATERIALS TAB
          ============================================ */}
      {activeTab === 'materials' && (
        <div className="materials-section">
          <div className="material-form">
            <h3>{editingMaterial ? 'Edit Material' : 'Add Material'}</h3>
            <form onSubmit={handleMaterialSubmit}>
              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Material Name *</label>
                  <input
                    type="text"
                    value={materialForm.name}
                    onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })}
                    placeholder="Enter material name"
                    required
                  />
                </div>
                <div className="form-group-modern">
                  <label>Category</label>
                  <select
                    value={materialForm.category}
                    onChange={e => setMaterialForm({ ...materialForm, category: e.target.value })}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Unit</label>
                  <select
                    value={materialForm.unit}
                    onChange={e => setMaterialForm({ ...materialForm, unit: e.target.value })}
                  >
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group-modern">
                  <label>Unit Price (BD)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={materialForm.unitPrice}
                    onChange={e => setMaterialForm({ ...materialForm, unitPrice: e.target.value })}
                    placeholder="0.000"
                  />
                </div>
              </div>
              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Current Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={materialForm.quantity}
                    onChange={e => setMaterialForm({ ...materialForm, quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="form-group-modern">
                  <label>Reorder Level</label>
                  <input
                    type="number"
                    step="0.01"
                    value={materialForm.reorderLevel}
                    onChange={e => setMaterialForm({ ...materialForm, reorderLevel: e.target.value })}
                    placeholder="Reorder at"
                  />
                </div>
              </div>
              <div className="form-group-modern">
                <label>Supplier</label>
                <input
                  type="text"
                  value={materialForm.supplier}
                  onChange={e => setMaterialForm({ ...materialForm, supplier: e.target.value })}
                  placeholder="Supplier name"
                />
              </div>
              <button type="submit" className="btn-primary-modern">
                {editingMaterial ? 'Update' : 'Add'} Material
              </button>
              {editingMaterial && (
                <button type="button" className="btn-secondary-modern" onClick={() => {
                  setEditingMaterial(null);
                  setMaterialForm({ name: '', category: 'Construction', unit: 'kg', unitPrice: '', quantity: '', supplier: '', reorderLevel: '' });
                }}>
                  Cancel
                </button>
              )}
            </form>
          </div>

          <div className="materials-list">
            <h3>Material Inventory</h3>
            <div className="materials-grid">
              {(data.materials || []).map(material => (
                <div key={material.id} className="material-card">
                  <div className="material-card-header">
                    <div className="material-name">{material.name}</div>
                    <div className="material-category">{material.category}</div>
                  </div>
                  <div className="material-details">
                    <div className="material-detail">
                      <span className="label">Qty:</span>
                      <span className="value">{material.quantity} {material.unit}</span>
                    </div>
                    <div className="material-detail">
                      <span className="label">Price:</span>
                      <span className="value">{Utils.formatCurrency(material.unitPrice)}</span>
                    </div>
                    {material.supplier && (
                      <div className="material-detail">
                        <span className="label">Supplier:</span>
                        <span className="value">{material.supplier}</span>
                      </div>
                    )}
                    {material.reorderLevel > 0 && material.quantity <= material.reorderLevel && (
                      <div className="material-low-stock">⚠️ Low Stock - Reorder!</div>
                    )}
                  </div>
                  <div className="material-actions">
                    <button className="btn-small-modern" onClick={() => {
                      setEditingMaterial(material.id);
                      setMaterialForm(material);
                    }}>
                      <Edit size={14} /> Edit
                    </button>
                    <button className="btn-small-modern" onClick={() => addMaterialToBOM(material)}>
                      <PlusCircle size={14} /> Add to BOM
                    </button>
                    <button className="btn-small-modern danger" onClick={() => deleteMaterial(material.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              ))}
              {(data.materials || []).length === 0 && (
                <div className="empty-state-modern">No materials added yet</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          BOM TAB
          ============================================ */}
      {activeTab === 'bom' && (
        <div className="bom-section">
          <div className="bom-form">
            <h3>Create Bill of Materials</h3>
            <form onSubmit={saveBOM}>
              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Project Name *</label>
                  <input
                    type="text"
                    value={bomForm.projectName}
                    onChange={e => setBomForm({ ...bomForm, projectName: e.target.value })}
                    placeholder="Enter project name"
                    required
                  />
                </div>
                <div className="form-group-modern">
                  <label>Site</label>
                  <select
                    value={bomForm.siteId}
                    onChange={e => setBomForm({ ...bomForm, siteId: e.target.value })}
                  >
                    <option value="">Select Site</option>
                    {data.sites.map(site => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bom-materials-list">
                <h4>Materials</h4>
                {bomForm.materials.map((mat, index) => (
                  <div key={index} className="bom-material-item">
                    <div className="bom-material-info">
                      <span className="material-name">{mat.name}</span>
                      <span className="material-unit">{mat.unit}</span>
                    </div>
                    <div className="bom-material-controls">
                      <input
                        type="number"
                        step="0.01"
                        value={mat.quantity}
                        onChange={e => updateBOMQuantity(index, e.target.value)}
                        style={{ width: '80px' }}
                      />
                      <span className="material-cost">{Utils.formatCurrency(mat.totalCost)}</span>
                      <button className="btn-small-modern danger" onClick={() => removeFromBOM(index)}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {bomForm.materials.length === 0 && (
                  <div className="empty-state-modern">No materials added. Add from Materials tab.</div>
                )}
              </div>

              <div className="form-row-modern">
                <div className="form-group-modern">
                  <label>Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={bomForm.estimatedHours}
                    onChange={e => setBomForm({ ...bomForm, estimatedHours: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="form-group-modern">
                  <label>Labour Cost (BD)</label>
                  <input
                    type="number"
                    step="0.001"
                    value={bomForm.labourCost}
                    onChange={e => setBomForm({ ...bomForm, labourCost: e.target.value })}
                    placeholder="0.000"
                  />
                </div>
              </div>
              <div className="form-group-modern">
                <label>Overhead Percentage (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={bomForm.overheadPercentage}
                  onChange={e => setBomForm({ ...bomForm, overheadPercentage: e.target.value })}
                  placeholder="10"
                />
              </div>

              {bomForm.materials.length > 0 && (
                <div className="bom-summary">
                  <div className="bom-summary-item">
                    <span>Material Cost:</span>
                    <span>{Utils.formatCurrency(bomForm.materials.reduce((sum, m) => sum + m.totalCost, 0))}</span>
                  </div>
                  <div className="bom-summary-item">
                    <span>Labour Cost:</span>
                    <span>{Utils.formatCurrency(parseFloat(bomForm.labourCost) || 0)}</span>
                  </div>
                  <div className="bom-summary-item">
                    <span>Overhead ({bomForm.overheadPercentage}%):</span>
                    <span>{Utils.formatCurrency(
                      (bomForm.materials.reduce((sum, m) => sum + m.totalCost, 0) + (parseFloat(bomForm.labourCost) || 0)) *
                      (parseFloat(bomForm.overheadPercentage) / 100)
                    )}</span>
                  </div>
                  <div className="bom-summary-item total">
                    <span><strong>Total Cost:</strong></span>
                    <span><strong>{Utils.formatCurrency(
                      bomForm.materials.reduce((sum, m) => sum + m.totalCost, 0) +
                      (parseFloat(bomForm.labourCost) || 0) +
                      (bomForm.materials.reduce((sum, m) => sum + m.totalCost, 0) + (parseFloat(bomForm.labourCost) || 0)) *
                      (parseFloat(bomForm.overheadPercentage) / 100)
                    )}</strong></span>
                  </div>
                </div>
              )}

              <button type="submit" className="btn-primary-modern">
                <Save size={16} /> Save BOM
              </button>
            </form>
          </div>

          {/* Saved BOMs */}
          <div className="saved-boms">
            <h3>Saved BOMs</h3>
            {(data.bom || []).map(bom => (
              <div key={bom.id} className="bom-card">
                <div className="bom-card-header">
                  <div className="bom-project-name">{bom.projectName}</div>
                  <div className="bom-date">{Utils.formatDate(bom.createdAt)}</div>
                </div>
                <div className="bom-card-details">
                  <div className="bom-detail">
                    <span>Materials:</span>
                    <span>{bom.materials.length} items</span>
                  </div>
                  <div className="bom-detail">
                    <span>Total Cost:</span>
                    <span className="bom-total">{Utils.formatCurrency(bom.totalCost)}</span>
                  </div>
                </div>
              </div>
            ))}
            {(data.bom || []).length === 0 && (
              <div className="empty-state-modern">No BOMs saved yet</div>
            )}
          </div>
        </div>
      )}

      {/* ============================================
          PREDICTION TAB
          ============================================ */}
      {activeTab === 'prediction' && (
        <div className="prediction-section">
          <h3>Material Prediction Engine</h3>
          <div className="prediction-form">
            <div className="form-row-modern">
              <div className="form-group-modern">
                <label>Project Type</label>
                <select
                  value={predictionParams.projectType}
                  onChange={e => setPredictionParams({ ...predictionParams, projectType: e.target.value })}
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                </select>
              </div>
              <div className="form-group-modern">
                <label>Area (m²)</label>
                <input
                  type="number"
                  value={predictionParams.area}
                  onChange={e => setPredictionParams({ ...predictionParams, area: e.target.value })}
                  placeholder="Enter area in m²"
                />
              </div>
            </div>
            <div className="form-row-modern">
              <div className="form-group-modern">
                <label>Floors</label>
                <input
                  type="number"
                  value={predictionParams.floors}
                  onChange={e => setPredictionParams({ ...predictionParams, floors: e.target.value })}
                  placeholder="1"
                  min="1"
                />
              </div>
              <div className="form-group-modern">
                <label>Material Type</label>
                <select
                  value={predictionParams.materialType}
                  onChange={e => setPredictionParams({ ...predictionParams, materialType: e.target.value })}
                >
                  <option value="all">All Materials</option>
                  <option value="cement">Cement</option>
                  <option value="steel">Steel</option>
                  <option value="sand">Sand</option>
                  <option value="gravel">Gravel</option>
                  <option value="wood">Wood</option>
                  <option value="bricks">Bricks</option>
                </select>
              </div>
            </div>
            <button className="btn-primary-modern" onClick={generatePrediction}>
              <TrendingUpIcon size={16} /> Generate Prediction
            </button>
          </div>

          {predictionResult && (
            <div className="prediction-result">
              <div className="prediction-summary">
                <div className="prediction-item">
                  <span className="label">Project Type</span>
                  <span className="value">{predictionResult.projectType}</span>
                </div>
                <div className="prediction-item">
                  <span className="label">Total Area</span>
                  <span className="value">{predictionResult.totalArea.toFixed(1)} m²</span>
                </div>
                <div className="prediction-item">
                  <span className="label">Floors</span>
                  <span className="value">{predictionResult.floors}</span>
                </div>
                <div className="prediction-item">
                  <span className="label">Estimated Cost</span>
                  <span className="value highlight">{Utils.formatCurrency(predictionResult.estimatedCost)}</span>
                </div>
                <div className="prediction-item">
                  <span className="label">Labor Hours</span>
                  <span className="value">{predictionResult.laborHours.toFixed(1)} hrs</span>
                </div>
                <div className="prediction-item">
                  <span className="label">Project Timeline</span>
                  <span className="value">{predictionResult.timeline} days</span>
                </div>
              </div>

              <div className="prediction-materials">
                <h4>Required Materials</h4>
                <div className="materials-prediction-grid">
                  {Object.entries(predictionResult.materials).map(([key, value]) => (
                    <div key={key} className="material-prediction-item">
                      <div className="material-name">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
                      <div className="material-quantity">{value.quantity.toFixed(2)} {value.unit}</div>
                      {value.cost && (
                        <div className="material-cost">
                          {Utils.formatCurrency(value.cost)}
                          {value.estimatedPrice && <span className="estimated-badge">*</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {predictionResult.materials.estimatedPrice && (
                  <div className="estimation-note">* Estimated based on average prices</div>
                )}
              </div>

              <div className="prediction-actions">
                <button className="btn-secondary-modern" onClick={() => {
                  // Add predicted materials to inventory
                  const materials = data.materials || [];
                  Object.entries(predictionResult.materials).forEach(([key, value]) => {
                    const existing = materials.find(m =>
                      m.name.toLowerCase().includes(key)
                    );
                    if (!existing) {
                      materials.push({
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                        name: key.charAt(0).toUpperCase() + key.slice(1),
                        category: 'Construction',
                        unit: value.unit,
                        unitPrice: 50, // Default price
                        quantity: 0,
                        supplier: '',
                        reorderLevel: value.quantity * 0.2
                      });
                    }
                  });
                  updateData({ materials });
                  alert('Predicted materials added to inventory!');
                }}>
                  <PlusCircle size={16} /> Add to Inventory
                </button>
                <button className="btn-primary-modern" onClick={() => {
                  // Create BOM from prediction
                  const materials = Object.entries(predictionResult.materials).map(([key, value]) => ({
                    materialId: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name: key.charAt(0).toUpperCase() + key.slice(1),
                    unit: value.unit,
                    unitPrice: value.cost ? value.cost / value.quantity : 50,
                    quantity: value.quantity,
                    totalCost: value.cost || value.quantity * 50
                  }));

                  const bom = {
                    id: Date.now().toString(),
                    projectName: `${predictionResult.projectType} Project - ${Utils.today()}`,
                    siteId: '',
                    materials: materials,
                    estimatedHours: predictionResult.laborHours.toString(),
                    labourCost: (predictionResult.laborHours * 8).toString(),
                    overheadPercentage: '10',
                    totalMaterialCost: predictionResult.estimatedCost,
                   
                    overhead: predictionResult.estimatedCost * 0.1,
                    totalCost: predictionResult.estimatedCost * 1.1,
                    createdAt: new Date().toISOString()
                  };

                  updateData({ bom: [...(data.bom || []), bom] });
                  alert('BOM created from prediction!');
                }}>
                  <ClipboardList size={16} /> Create BOM
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// EXPORT FUNCTIONS
// ============================================
const ExportUtils = {
  exportToExcel: (data) => {
    const wb = XLSX.utils.book_new();

    const sitesData = data.sites.map(s => ({
      'Site ID': s.id,
      'Name': s.name,
      'Location': s.location || '',
      'Manager': s.manager || '',
      'Phone': s.phone || '',
      'Profit': Utils.calculateSiteProfit(data.entries, s.id)
    }));
    const wsSites = XLSX.utils.json_to_sheet(sitesData);
    XLSX.utils.book_append_sheet(wb, wsSites, 'Sites');

    const workersData = data.workers.map(w => {
      const salary = Utils.calculateWorkerSalary(w, data.attendance);
      return {
        'Worker ID': w.id,
        'Name': w.name,
        'Role': w.role || '',
        'Daily Rate': w.dailyRate,
        'Total Hours': salary.totalHours.toFixed(2),
        'Total Days': salary.daysPresent,
        'Total Salary': salary.totalWage
      };
    });
    const wsWorkers = XLSX.utils.json_to_sheet(workersData);
    XLSX.utils.book_append_sheet(wb, wsWorkers, 'Workers');

    const entriesData = data.entries.map(e => ({
      'Date': e.date,
      'Site': data.sites.find(s => s.id === e.siteId)?.name || 'Unknown',
      'Revenue': e.kamai,
      'Labour': e.labour,
      'Overhead': e.overhead,
      'One-Time': e.oneTime,
      'Profit': Utils.calculateEntryProfit(e),
      'Note': e.note || ''
    }));
    const wsEntries = XLSX.utils.json_to_sheet(entriesData);
    XLSX.utils.book_append_sheet(wb, wsEntries, 'Entries');

    const attendanceData = data.attendance.map(a => ({
      'Date': a.date,
      'Worker': data.workers.find(w => w.id === a.workerId)?.name || 'Unknown',
      'Check In': a.checkedIn ? Utils.formatTime(a.checkedIn) : '',
      'Check Out': a.checkedOut ? Utils.formatTime(a.checkedOut) : '',
      'Hours': a.checkedIn && a.checkedOut ? Utils.calculateHoursWorked(a.checkedIn, a.checkedOut) : 0,
      'Present': a.present ? 'Yes' : 'No'
    }));
    const wsAttendance = XLSX.utils.json_to_sheet(attendanceData);
    XLSX.utils.book_append_sheet(wb, wsAttendance, 'Attendance');

    const totalKamai = Utils.calculateTotal(data.entries, 'kamai');
    const totalLabour = Utils.calculateTotal(data.entries, 'labour');
    const totalOH = Utils.calculateTotal(data.entries, 'overhead');
    const totalOT = Utils.calculateTotal(data.entries, 'oneTime');
    const netProfit = totalKamai - totalLabour - totalOH - totalOT;

    const summaryData = [
      ['HAJI YOUNAS CONTRACTING - FINANCIAL SUMMARY'],
      [''],
      ['Metric', 'Value (BD)'],
      ['Total Revenue', totalKamai],
      ['Total Labour Cost', totalLabour],
      ['Total Overhead', totalOH],
      ['Total One-Time Expenses', totalOT],
      ['Net Profit', netProfit],
      [''],
      ['Total Sites', data.sites.length],
      ['Total Workers', data.workers.length],
      ['Total Entries', data.entries.length],
      ['Total Attendance Records', data.attendance.length]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    XLSX.writeFile(wb, `haji_younas_report_${Utils.today()}.xlsx`);
  },

  exportToCSV: (data) => {
    const rows = [];
    rows.push(['HAJI YOUNAS CONTRACTING - COMPLETE REPORT']);
    rows.push(['Generated:', new Date().toISOString()]);
    rows.push([]);
    rows.push(['=== SITES ===']);
    rows.push(['ID', 'Name', 'Location', 'Manager', 'Phone', 'Profit']);
    data.sites.forEach(s => {
      rows.push([s.id, s.name, s.location || '', s.manager || '', s.phone || '', Utils.calculateSiteProfit(data.entries, s.id)]);
    });
    rows.push([]);
    rows.push(['=== WORKERS ===']);
    rows.push(['ID', 'Name', 'Role', 'Daily Rate', 'Total Hours', 'Days', 'Total Salary']);
    data.workers.forEach(w => {
      const salary = Utils.calculateWorkerSalary(w, data.attendance);
      rows.push([w.id, w.name, w.role || '', w.dailyRate, salary.totalHours.toFixed(2), salary.daysPresent, salary.totalWage]);
    });
    rows.push([]);
    rows.push(['=== ENTRIES ===']);
    rows.push(['Date', 'Site', 'Revenue', 'Labour', 'Overhead', 'One-Time', 'Profit']);
    data.entries.forEach(e => {
      const siteName = data.sites.find(s => s.id === e.siteId)?.name || 'Unknown';
      rows.push([e.date, siteName, e.kamai, e.labour, e.overhead, e.oneTime, Utils.calculateEntryProfit(e)]);
    });

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `haji_younas_report_${Utils.today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// ============================================
// NAVIGATION
// ============================================
const Navigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'entries', icon: PlusCircle, label: 'Entries' },
    { id: 'sites', icon: Building2, label: 'Sites' },
    { id: 'workers', icon: HardHat, label: 'Workers' },
    { id: 'attendance', icon: Clock, label: 'Attendance' },
    { id: 'dailyreport', icon: FileText, label: 'Daily Report' },
    { id: 'reports', icon: BarChart3, label: 'Reports' },
    { id: 'bom', icon: Package, label: 'BOM' }, // NEW
    { id: 'ai', icon: Bot, label: 'AI' }
  ];

  return (
    <nav className="navigation">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon size={20} />
            <span className="nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

// ============================================
// DASHBOARD COMPONENT
// ============================================
const DashboardComponent = ({ data }) => {
  const stats = useMemo(() => {
    const totalEntries = data.entries.length;
    const totalKamai = Utils.calculateTotal(data.entries, 'kamai');
    const totalLabour = Utils.calculateTotal(data.entries, 'labour');
    const totalOH = Utils.calculateTotal(data.entries, 'overhead');
    const totalOT = Utils.calculateTotal(data.entries, 'oneTime');
    const netProfit = totalKamai - totalLabour - totalOH - totalOT;

    const today = Utils.today();
    const todayEntries = data.entries.filter(e => e.date === today);
    const todayKamai = Utils.calculateTotal(todayEntries, 'kamai');
    const todayProfit = todayEntries.reduce((sum, e) => sum + Utils.calculateEntryProfit(e), 0);

    const todayAttendance = data.attendance.filter(a => a.date === today);
    const workersPresent = todayAttendance.filter(a => a.present).length;
    const workersCheckedIn = todayAttendance.filter(a => a.checkedIn && !a.checkedOut).length;

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayEntries = data.entries.filter(e => e.date === dateStr);
      const dayKamai = Utils.calculateTotal(dayEntries, 'kamai');
      const dayProfit = dayEntries.reduce((sum, e) => sum + Utils.calculateEntryProfit(e), 0);
      last7Days.push({
        date: dateStr,
        revenue: dayKamai,
        profit: dayProfit,
        label: date.toLocaleDateString('en', { weekday: 'short' })
      });
    }

    const siteStats = data.sites.map(site => ({
      name: site.name,
      profit: Utils.calculateSiteProfit(data.entries, site.id),
      entryCount: data.entries.filter(e => e.siteId === site.id).length
    }));

    const pieData = data.sites.map(site => ({
      name: site.name,
      value: Utils.calculateSiteProfit(data.entries, site.id)
    }));

    const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899'];

    return {
      totalEntries,
      totalKamai,
      totalLabour,
      totalOH,
      totalOT,
      netProfit,
      todayKamai,
      todayProfit,
      workersPresent,
      workersCheckedIn,
      siteStats,
      last7Days,
      pieData,
      COLORS
    };
  }, [data]);

  if (data.entries.length === 0 && data.sites.length === 0) {
    return (
      <div className="dashboard-modern">
        <div className="empty-state-modern">
          <Building2 size={64} className="empty-icon" />
          <h3>Welcome to Haji Younas Contracting</h3>
          <p>Start by adding your first site, workers, and financial entries.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-modern">
      <div className="stats-grid-modern">
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <DollarSign size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Today's Revenue</span>
            <span className="stat-value">{Utils.formatCurrency(stats.todayKamai)}</span>
          </div>
          <div className={`stat-trend ${stats.todayProfit >= 0 ? 'positive' : 'negative'}`}>
            {stats.todayProfit >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Today's Profit</span>
            <span className={`stat-value ${stats.todayProfit >= 0 ? 'positive' : 'negative'}`}>
              {Utils.formatCurrency(stats.todayProfit)}
            </span>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <UserCheck size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Workers Present</span>
            <span className="stat-value">{stats.workersPresent}</span>
          </div>
        </div>

        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
            <Clock size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Currently Working</span>
            <span className="stat-value">{stats.workersCheckedIn}</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h4>Revenue & Profit Trend</h4>
            <span className="chart-period">Last 7 Days</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={stats.last7Days}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis dataKey="label" stroke="#8b949e" />
              <YAxis stroke="#8b949e" />
              <Tooltip
                contentStyle={{ background: '#161b22', border: '1px solid #30363d' }}
                labelStyle={{ color: '#e6edf3' }}
                formatter={(value) => Utils.formatCurrency(value)}
              />
              <Legend />
              <Area type="monotone" dataKey="revenue" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.2} name="Revenue" />
              <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} name="Profit" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h4>Site Performance</h4>
            <span className="chart-period">Profit Distribution</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={stats.pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {stats.pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={stats.COLORS[index % stats.COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#161b22', border: '1px solid #30363d' }}
                labelStyle={{ color: '#e6edf3' }}
                formatter={(value) => Utils.formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="site-performance-modern">
        <div className="section-header">
          <h4>Site Performance</h4>
          <span className="section-subtitle">Profit & entry count by site</span>
        </div>
        <div className="site-list-modern">
          {stats.siteStats.map((site, index) => (
            <div key={index} className="site-item-modern">
              <div className="site-info-modern">
                <Building2 size={18} className="site-icon" />
                <span className="site-name">{site.name}</span>
                <span className="site-entries">{site.entryCount} entries</span>
              </div>
              <div className={`site-profit-modern ${site.profit >= 0 ? 'positive' : 'negative'}`}>
                {Utils.formatCurrency(site.profit)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// ENTRIES MANAGER
// ============================================
const EntriesManagerComponent = ({ data, addEntry, updateEntry, deleteEntry }) => {
  const [formData, setFormData] = useState({
    date: Utils.today(),
    siteId: '',
    kamai: '',
    labour: '',
    oneTime: '',
    note: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState({ site: '', dateFrom: '', dateTo: '' });

  const dailyOH = useMemo(() =>
    Utils.calculateDailyOH(data.monthlyOverhead, new Date(formData.date)),
    [data.monthlyOverhead, formData.date]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.siteId) {
      alert('Please select a site');
      return;
    }

    const entry = {
      date: formData.date,
      siteId: formData.siteId,
      kamai: parseFloat(formData.kamai) || 0,
      labour: parseFloat(formData.labour) || 0,
      overhead: dailyOH,
      oneTime: parseFloat(formData.oneTime) || 0,
      note: formData.note
    };

    if (editingId) {
      updateEntry(editingId, entry);
      setEditingId(null);
    } else {
      addEntry(entry);
    }

    setFormData({
      date: Utils.today(),
      siteId: '',
      kamai: '',
      labour: '',
      oneTime: '',
      note: ''
    });
  };

  const filteredEntries = useMemo(() => {
    return data.entries.filter(entry => {
      if (filter.site && entry.siteId !== filter.site) return false;
      if (filter.dateFrom && entry.date < filter.dateFrom) return false;
      if (filter.dateTo && entry.date > filter.dateTo) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [data.entries, filter]);

  const getSiteName = (id) => data.sites.find(s => s.id === id)?.name || 'Unknown';

  return (
    <div className="entries-manager-modern">
      <h2>Manage Entries</h2>

      <form className="entry-form-modern" onSubmit={handleSubmit}>
        <div className="form-row-modern">
          <div className="form-group-modern">
            <label>Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div className="form-group-modern">
            <label>Site</label>
            <select
              value={formData.siteId}
              onChange={e => setFormData({ ...formData, siteId: e.target.value })}
              required
            >
              <option value="">Select Site</option>
              {data.sites.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row-modern">
          <div className="form-group-modern">
            <label>Kamai (Revenue) BD</label>
            <input
              type="number"
              step="0.001"
              value={formData.kamai}
              onChange={e => setFormData({ ...formData, kamai: e.target.value })}
              placeholder="0.000"
            />
          </div>
          <div className="form-group-modern">
            <label>Labour Cost BD</label>
            <input
              type="number"
              step="0.001"
              value={formData.labour}
              onChange={e => setFormData({ ...formData, labour: e.target.value })}
              placeholder="0.000"
            />
          </div>
        </div>

        <div className="form-row-modern">
          <div className="form-group-modern">
            <label>Overhead (Auto) BD</label>
            <input
              type="text"
              value={Utils.formatCurrency(dailyOH)}
              disabled
              className="disabled-input"
            />
          </div>
          <div className="form-group-modern">
            <label>One-Time Expense BD</label>
            <input
              type="number"
              step="0.001"
              value={formData.oneTime}
              onChange={e => setFormData({ ...formData, oneTime: e.target.value })}
              placeholder="0.000"
            />
          </div>
        </div>

        <div className="form-group-modern">
          <label>Note</label>
          <input
            type="text"
            value={formData.note}
            onChange={e => setFormData({ ...formData, note: e.target.value })}
            placeholder="What work was done today?"
          />
        </div>

        <button type="submit" className="btn-primary-modern">
          {editingId ? 'Update Entry' : 'Add Entry'}
        </button>
        {editingId && (
          <button type="button" className="btn-secondary-modern" onClick={() => {
            setEditingId(null);
            setFormData({
              date: Utils.today(),
              siteId: '',
              kamai: '',
              labour: '',
              oneTime: '',
              note: ''
            });
          }}>
            Cancel Edit
          </button>
        )}
      </form>

      <div className="filters-modern">
        <select
          value={filter.site}
          onChange={e => setFilter({ ...filter, site: e.target.value })}
        >
          <option value="">All Sites</option>
          {data.sites.map(site => (
            <option key={site.id} value={site.id}>{site.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={filter.dateFrom}
          onChange={e => setFilter({ ...filter, dateFrom: e.target.value })}
          placeholder="From"
        />
        <input
          type="date"
          value={filter.dateTo}
          onChange={e => setFilter({ ...filter, dateTo: e.target.value })}
          placeholder="To"
        />
        <button className="btn-secondary-modern" onClick={() => setFilter({ site: '', dateFrom: '', dateTo: '' })}>
          Clear
        </button>
      </div>

      <div className="entries-list-modern">
        {filteredEntries.map(entry => {
          const profit = Utils.calculateEntryProfit(entry);
          return (
            <div key={entry.id} className="entry-item-modern">
              <div className="entry-header-modern">
                <div className="entry-date">{Utils.formatDate(entry.date)}</div>
                <div className="entry-site">{getSiteName(entry.siteId)}</div>
                <div className={`entry-profit ${profit >= 0 ? 'positive' : 'negative'}`}>
                  {Utils.formatCurrency(profit)}
                </div>
              </div>
              <div className="entry-details-modern">
                <span>💰 {Utils.formatCurrency(entry.kamai)}</span>
                <span>👷 {Utils.formatCurrency(entry.labour)}</span>
                <span>📋 {Utils.formatCurrency(entry.overhead)}</span>
                <span>🔧 {Utils.formatCurrency(entry.oneTime)}</span>
              </div>
              {entry.note && <div className="entry-note">📝 {entry.note}</div>}
              <div className="entry-actions-modern">
                <button className="btn-small-modern" onClick={() => {
                  setEditingId(entry.id);
                  setFormData({
                    date: entry.date,
                    siteId: entry.siteId,
                    kamai: entry.kamai.toString(),
                    labour: entry.labour.toString(),
                    oneTime: entry.oneTime.toString(),
                    note: entry.note || ''
                  });
                }}>
                  <Edit size={14} /> Edit
                </button>
                <button className="btn-small-modern danger" onClick={() => deleteEntry(entry.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          );
        })}
        {filteredEntries.length === 0 && (
          <div className="empty-state-modern">No entries found. Add your first entry above!</div>
        )}
      </div>
    </div>
  );
};

// ============================================
// SITES MANAGER
// ============================================
const SitesManagerComponent = ({ data, addSite, updateSite, deleteSite }) => {
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', location: '', manager: '', phone: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Site name is required');
      return;
    }

    if (editingId) {
      updateSite(editingId, formData);
      setEditingId(null);
    } else {
      addSite(formData);
    }

    setFormData({ name: '', location: '', manager: '', phone: '' });
  };

  return (
    <div className="sites-manager-modern">
      <h2>Manage Sites</h2>

      <form className="site-form-modern" onSubmit={handleSubmit}>
        <div className="form-row-modern">
          <div className="form-group-modern">
            <label>Site Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter site name"
              required
            />
          </div>
          <div className="form-group-modern">
            <label>Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
              placeholder="Site location"
            />
          </div>
        </div>

        <div className="form-row-modern">
          <div className="form-group-modern">
            <label>Site Manager</label>
            <input
              type="text"
              value={formData.manager}
              onChange={e => setFormData({ ...formData, manager: e.target.value })}
              placeholder="Manager name"
            />
          </div>
          <div className="form-group-modern">
            <label>Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Contact number"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary-modern">
          {editingId ? 'Update Site' : 'Add Site'}
        </button>
      </form>

      <div className="sites-list-modern">
        {data.sites.map(site => {
          const profit = Utils.calculateSiteProfit(data.entries, site.id);
          const entryCount = data.entries.filter(e => e.siteId === site.id).length;

          return (
            <div key={site.id} className="site-card-modern">
              <div className="site-card-header">
                <div className="site-card-title">
                  <Building2 size={20} className="site-card-icon" />
                  <h3>{site.name}</h3>
                  {site.location && <span className="site-location">📍 {site.location}</span>}
                </div>
                <div className={`site-balance ${profit >= 0 ? 'positive' : 'negative'}`}>
                  {Utils.formatCurrency(profit)}
                </div>
              </div>

              <div className="site-card-meta">
                {site.manager && <span>👤 {site.manager}</span>}
                {site.phone && <span>📞 {site.phone}</span>}
                <span>📊 {entryCount} entries</span>
              </div>

              <div className="site-card-actions">
                <button className="btn-small-modern" onClick={() => {
                  setEditingId(site.id);
                  setFormData({
                    name: site.name,
                    location: site.location || '',
                    manager: site.manager || '',
                    phone: site.phone || ''
                  });
                }}>
                  <Edit size={14} /> Edit
                </button>
                <button className="btn-small-modern danger" onClick={() => deleteSite(site.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          );
        })}
        {data.sites.length === 0 && (
          <div className="empty-state-modern">No sites added yet</div>
        )}
      </div>
    </div>
  );
};

// ============================================
// WORKERS MANAGER
// ============================================
const WorkersManagerComponent = ({ data, addWorker, updateWorker, deleteWorker }) => {
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', role: '', dailyRate: '', phone: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Worker name is required');
      return;
    }

    if (editingId) {
      updateWorker(editingId, formData);
      setEditingId(null);
    } else {
      addWorker(formData);
    }

    setFormData({ name: '', role: '', dailyRate: '', phone: '' });
  };

  return (
    <div className="workers-manager-modern">
      <h2>Manage Workers</h2>

      <form className="worker-form-modern" onSubmit={handleSubmit}>
        <div className="form-row-modern">
          <div className="form-group-modern">
            <label>Worker Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter worker name"
              required
            />
          </div>
          <div className="form-group-modern">
            <label>Role</label>
            <input
              type="text"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              placeholder="e.g., Mason, Helper"
            />
          </div>
        </div>

        <div className="form-row-modern">
          <div className="form-group-modern">
            <label>Daily Rate (BD)</label>
            <input
              type="number"
              step="0.001"
              value={formData.dailyRate}
              onChange={e => setFormData({ ...formData, dailyRate: e.target.value })}
              placeholder="0.000"
            />
          </div>
          <div className="form-group-modern">
            <label>Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Contact number"
            />
          </div>
        </div>

        <button type="submit" className="btn-primary-modern">
          {editingId ? 'Update Worker' : 'Add Worker'}
        </button>
      </form>

      <div className="workers-list-modern">
        <h3>All Workers</h3>
        {data.workers.map(worker => {
          const workerAttendance = data.attendance.filter(a => a.workerId === worker.id);
          const totalHours = workerAttendance.reduce((sum, a) => {
            if (a.checkedIn && a.checkedOut) {
              return sum + Utils.calculateHoursWorked(a.checkedIn, a.checkedOut);
            }
            return sum;
          }, 0);

          

          return (
            <div key={worker.id} className="worker-card-modern">
              <div className="worker-card-header">
                <div className="worker-card-title">
                  <HardHat size={20} className="worker-card-icon" />
                  <span className="worker-name">{worker.name}</span>
                  <span className="worker-role">{worker.role || 'No role'}</span>
                </div>
                <div className="worker-card-stats">
                  <span className="worker-rate">{Utils.formatCurrency(worker.dailyRate)}/day</span>
                  <span className="worker-hours">{totalHours.toFixed(1)} hrs</span>
                </div>
              </div>

              {worker.phone && <div className="worker-phone">📞 {worker.phone}</div>}

              <div className="worker-card-actions">
                <button className="btn-small-modern" onClick={() => {
                  setEditingId(worker.id);
                  setFormData({
                    name: worker.name,
                    role: worker.role || '',
                    dailyRate: worker.dailyRate || '',
                    phone: worker.phone || ''
                  });
                }}>
                  <Edit size={14} /> Edit
                </button>
                <button className="btn-small-modern danger" onClick={() => deleteWorker(worker.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          );
        })}
        {data.workers.length === 0 && (
          <div className="empty-state-modern">No workers added yet</div>
        )}
      </div>
    </div>
  );
};

// ============================================
// ATTENDANCE MANAGER
// ============================================
const AttendanceManagerComponent = ({ data, clockInWorker, clockOutWorker, refreshData }) => {
  const [selectedDate, setSelectedDate] = useState(Utils.today());
  const [loading, setLoading] = useState({});

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

      return {
        ...worker,
        record: record || null,
        status,
        checkedInTime,
        checkedOutTime,
        hoursWorked,
        wageEarned,
        present: record ? record.present : false
      };
    });
  }, [data.workers, data.attendance, selectedDate]);

  const handleClockIn = async (workerId) => {
    setLoading(prev => ({ ...prev, [workerId]: 'clocking-in' }));
    try {
      await clockInWorker(workerId, selectedDate);
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshData();
      setLoading(prev => ({ ...prev, [workerId]: null }));
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

  const dayStats = useMemo(() => {
    const present = todayAttendance.filter(w => w.present);
    const working = todayAttendance.filter(w => w.status === 'working');
    const totalHours = todayAttendance.reduce((sum, w) => sum + w.hoursWorked, 0);
    const totalWages = todayAttendance.reduce((sum, w) => sum + w.wageEarned, 0);
    return { present: present.length, working: working.length, totalHours, totalWages };
  }, [todayAttendance]);

  return (
    <div className="attendance-manager-modern">
      <h2>⏰ Attendance & Time Tracking</h2>

      <div className="attendance-summary-modern">
        <div className="summary-card-modern">
          <div className="summary-label">👷 Present Today</div>
          <div className="summary-value">{dayStats.present}</div>
        </div>
        <div className="summary-card-modern">
          <div className="summary-label">⏰ Currently Working</div>
          <div className="summary-value">{dayStats.working}</div>
        </div>
        <div className="summary-card-modern">
          <div className="summary-label">📊 Total Hours</div>
          <div className="summary-value">{dayStats.totalHours.toFixed(1)}h</div>
        </div>
        <div className="summary-card-modern">
          <div className="summary-label">💰 Total Wages</div>
          <div className="summary-value">{Utils.formatCurrency(dayStats.totalWages)}</div>
        </div>
      </div>

      <div className="attendance-date-selector-modern">
        <label>📅 Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => {
            setSelectedDate(e.target.value);
            setTimeout(() => refreshData(), 100);
          }}
        />
        <button className="btn-refresh-modern" onClick={() => refreshData()}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div className="attendance-list-modern">
        {todayAttendance.map(worker => {
          const isLoading = loading[worker.id];
          return (
            <div key={worker.id} className="attendance-item-modern">
              <div className="attendance-worker-info">
                <div className="worker-name">{worker.name}</div>
                <div className="worker-role">{worker.role || 'No role'}</div>
                <div className="worker-rate">{Utils.formatCurrency(worker.dailyRate)}/day</div>
              </div>

              <div className="attendance-status">
                {worker.status === 'working' && <span className="status-working">🟢 Working</span>}
                {worker.status === 'completed' && <span className="status-completed">✅ Completed</span>}
                {worker.status === 'pending' && <span className="status-pending">⏳ Pending</span>}
                {worker.status === 'absent' && <span className="status-absent">❌ Absent</span>}
              </div>

              <div className="attendance-time">
                {worker.checkedInTime && <div>⏰ In: {Utils.formatTime(worker.checkedInTime)}</div>}
                {worker.checkedOutTime && <div>⏰ Out: {Utils.formatTime(worker.checkedOutTime)}</div>}
                {worker.hoursWorked > 0 && (
                  <div className="hours-wage">
                    {worker.hoursWorked.toFixed(1)} hrs | {Utils.formatCurrency(worker.wageEarned)}
                  </div>
                )}
              </div>

              <div className="attendance-actions">
                {isLoading === 'clocking-in' && <span>⏳ Clocking In...</span>}
                {isLoading === 'clocking-out' && <span>⏳ Clocking Out...</span>}

                {!isLoading && worker.status === 'working' && (
                  <button className="btn-clock-out" onClick={() => handleClockOut(worker.id)}>
                    ⏰ Clock Out
                  </button>
                )}

                {!isLoading && worker.status === 'completed' && (
                  <span className="completed-text">✅ Done</span>
                )}

                {!isLoading && (worker.status === 'absent' || worker.status === 'pending') && (
                  <button className="btn-clock-in" onClick={() => handleClockIn(worker.id)}>
                    ⏰ Clock In
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {todayAttendance.length === 0 && (
          <div className="empty-state-modern">No workers added yet. Add workers in the Workers tab.</div>
        )}
      </div>
    </div>
  );
};

// ============================================
// REPORTS COMPONENT
// ============================================
const ReportsComponent = ({ data }) => {
  const [exportType, setExportType] = useState('excel');

  const handleExport = () => {
    if (exportType === 'excel') {
      ExportUtils.exportToExcel(data);
    } else {
      ExportUtils.exportToCSV(data);
    }
  };

  const totalKamai = Utils.calculateTotal(data.entries, 'kamai');
  const totalLabour = Utils.calculateTotal(data.entries, 'labour');
  const totalOH = Utils.calculateTotal(data.entries, 'overhead');
  const totalOT = Utils.calculateTotal(data.entries, 'oneTime');
  const netProfit = totalKamai - totalLabour - totalOH - totalOT;

  const workerSalaries = data.workers.map(w => {
    const salary = Utils.calculateWorkerSalary(w, data.attendance);
    return { ...w, ...salary };
  });

  const totalWages = workerSalaries.reduce((sum, w) => sum + w.totalWage, 0);

  const siteProfitData = data.sites.map(s => ({
    name: s.name,
    profit: Utils.calculateSiteProfit(data.entries, s.id)
  }));

  const dailyData = data.entries.reduce((acc, e) => {
    if (!acc[e.date]) {
      acc[e.date] = { date: e.date, revenue: 0, profit: 0 };
    }
    acc[e.date].revenue += e.kamai || 0;
    acc[e.date].profit += Utils.calculateEntryProfit(e);
    return acc;
  }, {});
  const dailyChartData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

  const COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="reports-modern">
      <div className="reports-header">
        <h2>Reports & Analytics</h2>
        <div className="export-controls">
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
            className="export-select"
          >
            <option value="excel">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
          <button onClick={handleExport} className="btn-primary-modern">
            <Download size={16} /> Export Report
          </button>
        </div>
      </div>

      <div className="stats-grid-modern">
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <DollarSign size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Revenue</span>
            <span className="stat-value">{Utils.formatCurrency(totalKamai)}</span>
          </div>
        </div>
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <TrendingDownIcon size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Labour</span>
            <span className="stat-value">{Utils.formatCurrency(totalLabour)}</span>
          </div>
        </div>
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
            <TrendingUpIcon size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Net Profit</span>
            <span className={`stat-value ${netProfit >= 0 ? 'positive' : 'negative'}`}>
              {Utils.formatCurrency(netProfit)}
            </span>
          </div>
        </div>
        <div className="stat-card-modern">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
            <Users size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total Wages</span>
            <span className="stat-value">{Utils.formatCurrency(totalWages)}</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h4>Daily Revenue & Profit</h4>
            <span className="chart-period">All Entries</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={dailyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis dataKey="date" stroke="#8b949e" />
              <YAxis stroke="#8b949e" />
              <Tooltip
                contentStyle={{ background: '#161b22', border: '1px solid #30363d' }}
                labelStyle={{ color: '#e6edf3' }}
                formatter={(value) => Utils.formatCurrency(value)}
              />
              <Legend />
              <Area type="monotone" dataKey="revenue" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.2} name="Revenue" />
              <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} name="Profit" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h4>Site Profit Distribution</h4>
            <span className="chart-period">By Site</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={siteProfitData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="profit"
              >
                {siteProfitData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#161b22', border: '1px solid #30363d' }}
                labelStyle={{ color: '#e6edf3' }}
                formatter={(value) => Utils.formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="salary-report">
        <h3>Worker Salary Breakdown</h3>
        <div className="salary-table">
          <table>
            <thead>
              <tr>
                <th>Worker</th>
                <th>Role</th>
                <th>Daily Rate</th>
                <th>Hours</th>
                <th>Days</th>
                <th>Total Salary</th>
              </tr>
            </thead>
            <tbody>
              {workerSalaries.map((w, i) => (
                <tr key={i}>
                  <td><HardHat size={14} /> {w.name}</td>
                  <td>{w.role || '-'}</td>
                  <td>{Utils.formatCurrency(w.dailyRate)}</td>
                  <td>{w.totalHours.toFixed(1)}h</td>
                  <td>{w.daysPresent}</td>
                  <td className="salary-amount">{Utils.formatCurrency(w.totalWage)}</td>
                </tr>
              ))}
              {workerSalaries.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state-modern">No workers found</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="5"><strong>Total Wages</strong></td>
                <td><strong>{Utils.formatCurrency(totalWages)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================
// AI ASSISTANT
// ============================================
const AIAssistantComponent = ({ data }) => {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Assalam o Alaikum! I\'m your AI assistant for Haji Younas Contracting. How can I help you today? 🏗️' }
  ]);
  const [input, setInput] = useState('');
  const { sendMessage, loading } = useAI();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const context = {
        sites: data.sites,
        workers: data.workers,
        entries: data.entries.slice(-50),
        attendance: data.attendance,
        monthlyOverhead: data.monthlyOverhead,
        summary: {
          totalKamai: Utils.calculateTotal(data.entries, 'kamai'),
          totalLabour: Utils.calculateTotal(data.entries, 'labour'),
          totalOH: Utils.calculateTotal(data.entries, 'overhead'),
          totalOT: Utils.calculateTotal(data.entries, 'oneTime'),
          netProfit: Utils.calculateTotal(data.entries, 'kamai') -
            Utils.calculateTotal(data.entries, 'labour') -
            Utils.calculateTotal(data.entries, 'overhead') -
            Utils.calculateTotal(data.entries, 'oneTime')
        }
      };

      const reply = await sendMessage(userMessage, context);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again later. 🔧'
      }]);
    }
  };

  const quickQuestions = [
    "What's today's profit?",
    "Show site performance summary",
    "Calculate total worker wages today",
    "Who is working today?",
    "Give me business recommendations"
  ];

  return (
    <div className="ai-assistant-modern">
      <div className="ai-header-modern">
        <h2>AI Assistant</h2>
        <span className="ai-status">{loading ? '🔄 Thinking...' : '✅ Online'}</span>
      </div>

      <div className="messages-container-modern">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'assistant' ? '🏗️' : '👤'}
            </div>
            <div className="message-content">
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="message assistant">
            <div className="message-avatar">🏗️</div>
            <div className="message-content typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="quick-questions-modern">
          {quickQuestions.map((q, i) => (
            <button key={i} className="quick-btn-modern" onClick={() => {
              setInput(q);
              setTimeout(handleSend, 100);
            }}>
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="input-area-modern">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask me anything about your business..."
          rows={1}
          disabled={loading}
        />
        <button
          className={`send-btn-modern ${loading || !input.trim() ? 'disabled' : ''}`}
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          {loading ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
};

// ============================================
// SETTINGS
// ============================================
const SettingsComponent = ({ data, updateData }) => {
  const [settings, setSettings] = useState(data.settings || {});
  const [showBackup, setShowBackup] = useState(false);

  const handleSave = () => {
    updateData({ settings });
    alert('Settings saved successfully!');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `haji_younas_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (window.confirm('This will replace all current data. Continue?')) {
            updateData(imported);
            alert('Data imported successfully!');
          }
        } catch (error) {
          alert('Invalid file format');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      alert('Failed to import data: ' + error.message);
    }
    e.target.value = '';
  };

  return (
    <div className="settings-modern">
      <h2>Settings</h2>

      <div className="settings-section-modern">
        <h3>General Settings</h3>
        <div className="form-group-modern">
          <label>Currency</label>
          <select
            value={settings.currency || 'BD'}
            onChange={e => setSettings({ ...settings, currency: e.target.value })}
          >
            <option value="BD">Bahraini Dinar (BD)</option>
            <option value="USD">US Dollar ($)</option>
            <option value="PKR">Pakistani Rupee (₨)</option>
          </select>
        </div>

        <div className="form-group-modern">
          <label>Language</label>
          <select
            value={settings.language || 'urdu'}
            onChange={e => setSettings({ ...settings, language: e.target.value })}
          >
            <option value="urdu">Urdu</option>
            <option value="english">English</option>
          </select>
        </div>

        <div className="form-group-modern">
          <label>Monthly Overhead (BD)</label>
          <input
            type="number"
            step="0.001"
            value={data.monthlyOverhead}
            onChange={e => updateData({ monthlyOverhead: parseFloat(e.target.value) || 0 })}
          />
        </div>

        <div className="form-group-modern">
          <label>Working Hours Per Day</label>
          <input
            type="number"
            step="0.5"
            value={settings.workingHours || 8}
            onChange={e => setSettings({ ...settings, workingHours: parseFloat(e.target.value) || 8 })}
          />
          <small>Used to calculate hourly rate from daily rate</small>
        </div>
      </div>

      <div className="settings-section-modern">
        <h3>Data Management</h3>
        <div className="button-group-modern">
          <button className="btn-primary-modern" onClick={handleExport}>
            <Download size={16} /> Export Data
          </button>
          <button className="btn-secondary-modern" onClick={() => setShowBackup(!showBackup)}>
            <Upload size={16} /> Import Data
          </button>
        </div>
        {showBackup && (
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="file-input-modern"
          />
        )}
      </div>

      <div className="settings-section-modern">
        <h3>About</h3>
        <p><strong>Company:</strong> {CONFIG.COMPANY_NAME}</p>
        <p><strong>Version:</strong> {CONFIG.VERSION}</p>
        <p><strong>Total Entries:</strong> {data.entries.length}</p>
        <p><strong>Total Sites:</strong> {data.sites.length}</p>
        <p><strong>Total Workers:</strong> {data.workers.length}</p>
        <p><strong>Total Attendance Records:</strong> {data.attendance.length}</p>
      </div>

      <button className="btn-primary-modern" onClick={handleSave}>
        💾 Save Settings
      </button>
    </div>
  );
};

// ============================================
// MAIN APP
// ============================================
const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data, loading, error, loadData, ...actions } = useData();

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <HardHat size={48} className="loading-icon" />
          <h2>Loading...</h2>
          <p>Connecting to server</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error-screen">
          <AlertCircle size={48} className="error-icon" />
          <h2>Connection Error</h2>
          <p>{error}</p>
          <button onClick={loadData} className="btn-retry">
            <RefreshCw size={16} /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header-modern">
        <div className="header-content-modern">
          <div className="logo-modern">
            <div className="logo-icon-modern">
              <HardHat size={28} />
            </div>
            <div>
              <h1>{CONFIG.COMPANY_NAME}</h1>
              <span className="company-tag-modern">Construction & Contracting</span>
            </div>
          </div>
          <div className="header-actions-modern">
            <button className="header-btn" onClick={() => setActiveTab('settings')}>
              <SettingsIcon size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="app-main-modern">
        {activeTab === 'dashboard' && <DashboardComponent data={data} />}
        {activeTab === 'entries' && (
          <EntriesManagerComponent
            data={data}
            addEntry={actions.addEntry}
            updateEntry={actions.updateEntry}
            deleteEntry={actions.deleteEntry}
          />
        )}
        {activeTab === 'sites' && (
          <SitesManagerComponent
            data={data}
            addSite={actions.addSite}
            updateSite={actions.updateSite}
            deleteSite={actions.deleteSite}
          />
        )}
        {activeTab === 'workers' && (
          <WorkersManagerComponent
            data={data}
            addWorker={actions.addWorker}
            updateWorker={actions.updateWorker}
            deleteWorker={actions.deleteWorker}
          />
        )}
        {activeTab === 'attendance' && (
          <AttendanceManagerComponent
            data={data}
            clockInWorker={actions.clockInWorker}
            clockOutWorker={actions.clockOutWorker}
            refreshData={actions.refreshData}
          />
        )}
        {activeTab === 'dailyreport' && (
          <DailyReportComponent data={data} selectedDate={Utils.today()} />
        )}
        {activeTab === 'reports' && (
          <ReportsComponent data={data} />
        )}
        {activeTab === 'bom' && (
          <BOMComponent data={data} updateData={actions.updateData} />
        )}
        {activeTab === 'ai' && <AIAssistantComponent data={data} />}
        {activeTab === 'settings' && (
          <SettingsComponent data={data} updateData={actions.updateData} />
        )}
      </main>

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default App;