import * as XLSX from 'xlsx';
import Utils from '../utils/Utils';

export const ExportUtils = {
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