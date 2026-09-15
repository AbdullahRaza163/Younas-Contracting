// src/utils/Utils.js
import { CONFIG } from '../config/constants';

const Utils = {
  // ============================================
  // DATE FUNCTIONS
  // ============================================
  today: () => new Date().toISOString().split('T')[0],
  
  getCurrentMonthString: () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  },
  
  getMonthString: (date) => {
    if (!date) return Utils.getCurrentMonthString();
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  },
  
  // ============================================
  // MONTH NAME FUNCTIONS - ADDED
  // ============================================
  getMonthName: (monthStr) => {
    if (!monthStr) return '';
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthNamesShort = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    // If monthStr is in YYYY-MM format
    if (monthStr.includes('-')) {
      const parts = monthStr.split('-');
      if (parts.length === 2) {
        const monthIndex = parseInt(parts[1]) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          return monthNames[monthIndex];
        }
      }
    }
    
    // If monthStr is a number
    const num = parseInt(monthStr);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      return monthNames[num - 1];
    }
    
    // Try parsing as date
    try {
      const date = new Date(monthStr);
      if (!isNaN(date.getTime())) {
        return monthNames[date.getMonth()];
      }
    } catch (e) {
      // Ignore
    }
    
    return monthStr;
  },
  
  getShortMonthName: (monthStr) => {
    if (!monthStr) return '';
    const monthNamesShort = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    if (monthStr.includes('-')) {
      const parts = monthStr.split('-');
      if (parts.length === 2) {
        const monthIndex = parseInt(parts[1]) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          return monthNamesShort[monthIndex];
        }
      }
    }
    
    const num = parseInt(monthStr);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      return monthNamesShort[num - 1];
    }
    
    try {
      const date = new Date(monthStr);
      if (!isNaN(date.getTime())) {
        return monthNamesShort[date.getMonth()];
      }
    } catch (e) {
      // Ignore
    }
    
    return monthStr;
  },
  
  formatMonth: (monthStr) => {
    if (!monthStr) return '';
    const parts = monthStr.split('-');
    if (parts.length === 2) {
      const monthName = Utils.getMonthName(monthStr);
      return `${monthName} ${parts[0]}`;
    }
    return monthStr;
  },
  
  formatMonthYear: (monthStr) => {
    if (!monthStr) return '';
    const parts = monthStr.split('-');
    if (parts.length === 2) {
      const monthName = Utils.getShortMonthName(monthStr);
      return `${monthName} ${parts[0]}`;
    }
    return monthStr;
  },
  
  // ============================================
  // DATE FORMATTING FUNCTIONS
  // ============================================
  formatDate: (date) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  },
  
  formatDateShort: (date) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
  },
  
  formatDateTime: (date) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-PK', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  formatTime: (date) => {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  },
  
  getDaysInMonth: (date = new Date()) => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  },
  
  getMonthStart: (date = new Date()) => {
    const d = new Date(date);
    d.setDate(1);
    return d.toISOString().split('T')[0];
  },
  
  getMonthEnd: (date = new Date()) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split('T')[0];
  },
  
  getYearStart: (date = new Date()) => {
    const d = new Date(date);
    d.setMonth(0, 1);
    return d.toISOString().split('T')[0];
  },
  
  getYearEnd: (date = new Date()) => {
    const d = new Date(date);
    d.setMonth(11, 31);
    return d.toISOString().split('T')[0];
  },
  
  addDays: (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  },
  
  subtractDays: (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  },
  
  getDateRange: (period) => {
    const today = new Date();
    const todayStr = Utils.today();
    const start = new Date(today);
    const end = new Date(today);
    
    switch(period) {
      case 'today':
        return { start: todayStr, end: todayStr };
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        const yStr = start.toISOString().split('T')[0];
        return { start: yStr, end: yStr };
      case 'week':
        start.setDate(start.getDate() - 7);
        return { start: start.toISOString().split('T')[0], end: todayStr };
      case 'month':
        start.setDate(1);
        return { start: start.toISOString().split('T')[0], end: todayStr };
      case 'lastMonth':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0);
        return { 
          start: start.toISOString().split('T')[0], 
          end: end.toISOString().split('T')[0] 
        };
      case 'year':
        start.setMonth(0, 1);
        return { start: start.toISOString().split('T')[0], end: todayStr };
      case 'lastYear':
        start.setFullYear(start.getFullYear() - 1);
        start.setMonth(0, 1);
        end.setFullYear(end.getFullYear() - 1);
        end.setMonth(11, 31);
        return { 
          start: start.toISOString().split('T')[0], 
          end: end.toISOString().split('T')[0] 
        };
      default:
        return { start: todayStr, end: todayStr };
    }
  },

  // ============================================
  // CURRENCY FUNCTIONS
  // ============================================
  formatCurrency: (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0.000 BD';
    return `${Number(amount || 0).toFixed(3)} ${CONFIG.CURRENCY}`;
  },
  
  formatCurrencyShort: (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0.000';
    return Number(amount || 0).toFixed(3);
  },
  
  formatCurrencyWithSign: (amount, showSign = false) => {
    const formatted = Utils.formatCurrencyShort(amount);
    if (!showSign) return formatted;
    return amount >= 0 ? `+${formatted}` : `${formatted}`;
  },
  
  calculateProfitMargin: (revenue, profit) => {
    if (revenue === 0) return 0;
    return (profit / revenue) * 100;
  },

  // ============================================
  // CALCULATION FUNCTIONS
  // ============================================
    calculateHoursWorked: (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    if (isNaN(start) || isNaN(end)) return 0;
    const diff = end - start;
    // ⭐ Never return negative — clamp to 0
    if (diff <= 0) return 0;
    return Math.round((diff / 3600000) * 100) / 100;
  },
  calculateDailyWage: (hoursWorked, dailyRate) => {
    if (!hoursWorked || !dailyRate) return 0;
    const hourlyRate = dailyRate / 8;
    return hoursWorked * hourlyRate;
  },
  
  calculateOvertimePay: (overtimeHours, dailyRate) => {
    if (!overtimeHours || !dailyRate) return 0;
    const hourlyRate = dailyRate / 8;
    return overtimeHours * hourlyRate * 1.5;
  },
  
  calculateDailyOH: (monthlyOH, date = new Date()) => {
    const days = Utils.getDaysInMonth(date);
    return monthlyOH / days;
  },
  
  calculateEntryProfit: (entry) => {
    if (!entry) return 0;
    return (entry.kamai || 0) - (entry.labour || 0) - (entry.overhead || 0) - (entry.oneTime || 0);
  },
  
  calculateTotal: (items, field) => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
  },
  
  calculateAverage: (items, field) => {
    if (!items || items.length === 0) return 0;
    const total = Utils.calculateTotal(items, field);
    return total / items.length;
  },
  
  calculateSiteProfit: (entries, siteId) => {
    if (!entries || !siteId) return 0;
    const siteEntries = entries.filter(e => e.siteId === siteId);
    const kamai = Utils.calculateTotal(siteEntries, 'kamai');
    const labour = Utils.calculateTotal(siteEntries, 'labour');
    const overhead = Utils.calculateTotal(siteEntries, 'overhead');
    const oneTime = Utils.calculateTotal(siteEntries, 'oneTime');
    return kamai - labour - overhead - oneTime;
  },
  
  calculateWorkerSalary: (worker, attendanceRecords) => {
    if (!worker || !attendanceRecords) {
      return { totalHours: 0, totalWage: 0, daysPresent: 0, overtimeHours: 0, overtimePay: 0, totalEarnings: 0 };
    }
    const workerAttendance = attendanceRecords.filter(a => a.workerId === worker.id);
    const totalHours = workerAttendance.reduce((sum, a) => {
      if (a.checkedIn && a.checkedOut) {
        return sum + Utils.calculateHoursWorked(a.checkedIn, a.checkedOut);
      }
      return sum;
    }, 0);
    const totalWage = Utils.calculateDailyWage(totalHours, worker.dailyRate);
    const daysPresent = workerAttendance.filter(a => a.present).length;
    const overtimeHours = workerAttendance.reduce((sum, a) => sum + (a.overtimeHours || 0), 0);
    const overtimePay = Utils.calculateOvertimePay(overtimeHours, worker.dailyRate);
    return { 
      totalHours, 
      totalWage, 
      daysPresent, 
      overtimeHours, 
      overtimePay,
      totalEarnings: totalWage + overtimePay
    };
  },

  // ============================================
  // ATTENDANCE FUNCTIONS
  // ============================================
  getWorkerAttendance: (attendance, workerId, date) => {
    return attendance.find(a => a.workerId === workerId && a.date === date) || null;
  },
  
  getTeamAttendance: (attendance, teamId, date) => {
    return attendance.filter(a => a.teamId === teamId && a.date === date);
  },
  
  getSiteAttendance: (attendance, siteId, workers, date) => {
    const siteWorkers = workers.filter(w => w.siteId === siteId);
    return attendance.filter(a => 
      siteWorkers.some(w => w.id === a.workerId) && a.date === date
    );
  },

  // ============================================
  // FILTER FUNCTIONS
  // ============================================
  filterByDateRange: (items, startDate, endDate) => {
    if (!items) return [];
    return items.filter(item => {
      const itemDate = item.date || item.createdAt?.split('T')[0];
      if (!itemDate) return false;
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      return true;
    });
  },
  
  filterBySite: (items, siteId) => {
    if (!items) return [];
    if (!siteId) return items;
    return items.filter(item => item.siteId === siteId);
  },
  
  filterByWorker: (items, workerId) => {
    if (!items) return [];
    if (!workerId) return items;
    return items.filter(item => item.workerId === workerId);
  },

  // ============================================
  // SORT FUNCTIONS
  // ============================================
  sortByDate: (items, ascending = false) => {
    if (!items) return [];
    return [...items].sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt);
      const dateB = new Date(b.date || b.createdAt);
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
      return ascending ? dateA - dateB : dateB - dateA;
    });
  },
  
  sortByAmount: (items, field, ascending = false) => {
    if (!items) return [];
    return [...items].sort((a, b) => {
      const valA = Number(a[field] || 0);
      const valB = Number(b[field] || 0);
      return ascending ? valA - valB : valB - valA;
    });
  },

  // ============================================
  // AGGREGATION FUNCTIONS
  // ============================================
  groupByMonth: (items, dateField = 'date') => {
    if (!items) return {};
    return items.reduce((acc, item) => {
      const date = new Date(item[dateField]);
      if (isNaN(date.getTime())) return acc;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  },
  
  groupBySite: (items) => {
    if (!items) return {};
    return items.reduce((acc, item) => {
      const key = item.siteId || 'unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  },
  
  getMonthlySummary: (entries) => {
    if (!entries) return {};
    const grouped = Utils.groupByMonth(entries);
    const summary = {};
    Object.keys(grouped).forEach(month => {
      const monthEntries = grouped[month];
      summary[month] = {
        revenue: Utils.calculateTotal(monthEntries, 'kamai'),
        labour: Utils.calculateTotal(monthEntries, 'labour'),
        overhead: Utils.calculateTotal(monthEntries, 'overhead'),
        oneTime: Utils.calculateTotal(monthEntries, 'oneTime'),
        profit: monthEntries.reduce((sum, e) => sum + Utils.calculateEntryProfit(e), 0),
        entries: monthEntries.length
      };
    });
    return summary;
  },
  
  getYearlySummary: (entries) => {
    if (!entries) return {};
    const grouped = entries.reduce((acc, entry) => {
      const year = new Date(entry.date).getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(entry);
      return acc;
    }, {});
    const summary = {};
    Object.keys(grouped).forEach(year => {
      const yearEntries = grouped[year];
      summary[year] = {
        revenue: Utils.calculateTotal(yearEntries, 'kamai'),
        labour: Utils.calculateTotal(yearEntries, 'labour'),
        overhead: Utils.calculateTotal(yearEntries, 'overhead'),
        oneTime: Utils.calculateTotal(yearEntries, 'oneTime'),
        profit: yearEntries.reduce((sum, e) => sum + Utils.calculateEntryProfit(e), 0),
        entries: yearEntries.length
      };
    });
    return summary;
  },

  // ============================================
  // INVOICE FUNCTIONS
  // ============================================
  convertAmountToWords: (amount) => {
    try {
      const num = parseFloat(amount);
      if (isNaN(num) || num === 0) return 'Zero';
      
      const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
      const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
      
      function numberToWords(n) {
        if (n < 20) return words[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 === 0 ? "" : " " + words[n % 10]);
        if (n < 1000) return words[Math.floor(n / 100)] + " Hundred" + (n % 100 === 0 ? "" : " " + numberToWords(n % 100));
        if (n < 1000000) return numberToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 === 0 ? "" : " " + numberToWords(n % 1000));
        if (n < 1000000000) return numberToWords(Math.floor(n / 1000000)) + " Million" + (n % 1000000 === 0 ? "" : " " + numberToWords(n % 1000000));
        return String(n);
      }
      
      const bd = Math.floor(num);
      const fils = Math.round((num - bd) * 1000);
      
      let result = numberToWords(bd) + " Bahraini Dinar";
      if (fils > 0) {
        result += " and " + numberToWords(fils) + " Fils";
      }
      return result;
    } catch (e) {
      return String(amount) + " BD";
    }
  },
  
  calculateInvoiceTotals: (items, vatRate = 10) => {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;
    return { subtotal, vatAmount, total };
  },

  // ============================================
  // VALIDATION FUNCTIONS
  // ============================================
  isValidDate: (date) => {
    if (!date) return false;
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  },
  
  isValidAmount: (amount) => {
    return typeof amount === 'number' && !isNaN(amount) && amount >= 0;
  },
  
  isValidEmail: (email) => {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },
  
  isValidPhone: (phone) => {
    if (!phone) return false;
    const re = /^\+?[0-9]{8,15}$/;
    return re.test(phone);
  },

  // ============================================
  // STRING FUNCTIONS
  // ============================================
  capitalize: (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },
  
  truncate: (str, length = 50) => {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
  },
  
  generateId: () => {
    return Math.random().toString(36).substring(2, 9) + 
           Math.random().toString(36).substring(2, 9);
  },
  
  generateInvoiceNumber: (prefix = 'INV') => {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${year}-${random}`;
  },

  // ============================================
  // COLOR FUNCTIONS
  // ============================================
  getStatusColor: (status) => {
    const colors = {
      'active': '#22c55e',
      'inactive': '#ef4444',
      'draft': '#f59e0b',
      'sent': '#3b82f6',
      'paid': '#22c55e',
      'overdue': '#ef4444',
      'present': '#22c55e',
      'absent': '#ef4444',
      'working': '#f59e0b',
      'completed': '#22c55e',
      'pending': '#f59e0b'
    };
    return colors[status] || '#6b7280';
  },
  
  getProfitColor: (profit) => {
    if (profit > 0) return '#22c55e';
    if (profit < 0) return '#ef4444';
    return '#f59e0b';
  },

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================
  downloadFile: (data, filename, type = 'text/csv') => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  
  downloadJSON: (data, filename) => {
    const json = JSON.stringify(data, null, 2);
    Utils.downloadFile(json, filename, 'application/json');
  },
  
  downloadCSV: (data, filename) => {
    const rows = data.map(row => Object.values(row).join(','));
    const csv = rows.join('\n');
    Utils.downloadFile(csv, filename, 'text/csv');
  },
  
  // ============================================
  // ADDITIONAL HELPER FUNCTIONS
  // ============================================
  isEmpty: (str) => {
    return !str || str.trim().length === 0;
  },
  
  getDayName: (dateStr) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return days[date.getDay()];
  },
  
  getShortDayName: (dateStr) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return days[date.getDay()];
  },
  
  isWeekend: (dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    const day = date.getDay();
    return day === 0 || day === 6;
  },
  
  getWorkingDays: (startDate, endDate) => {
    let count = 0;
    const current = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(current.getTime()) || isNaN(end.getTime())) return 0;
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  },
  
  getWeekNumber: (dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 0;
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const diff = (date - startOfYear) / (1000 * 60 * 60 * 24);
    return Math.ceil((diff + startOfYear.getDay() + 1) / 7);
  },
  
  excelDateToDate: (excelSerial) => {
    if (!excelSerial) return null;
    const utc_days = Math.floor(excelSerial - 25569);
    const utc_value = utc_days * 86400;
    const date = new Date(utc_value * 1000);
    return date.toISOString().split('T')[0];
  }
};

export default Utils;