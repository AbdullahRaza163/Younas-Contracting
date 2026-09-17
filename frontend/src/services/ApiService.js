// src/services/ApiService.js
import { CONFIG } from '../config/constants';

class ApiService {
  static async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // Add auth token if available
    const token = localStorage.getItem('accessToken');
    console.log(`📡 Request to: ${endpoint}`);
    console.log(`📡 Token exists: ${!!token}`);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log(`📡 Token: ${token.substring(0, 20)}...`);
    }

    try {
      const response = await fetch(url, { ...options, headers });

      console.log(`📡 Response status: ${response.status} for ${endpoint}`);

      // Handle token refresh on 401/403
      if (response.status === 401 || response.status === 403) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            // Try to refresh token
            const refreshResponse = await fetch(`${CONFIG.API_BASE}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken })
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              localStorage.setItem('accessToken', refreshData.accessToken);
              if (refreshData.refreshToken) {
                localStorage.setItem('refreshToken', refreshData.refreshToken);
              }
              // Retry original request with new token
              headers['Authorization'] = `Bearer ${refreshData.accessToken}`;
              const retryResponse = await fetch(url, { ...options, headers });
              if (!retryResponse.ok) {
                const error = await retryResponse.json().catch(() => ({}));
                throw new Error(error.message || error.error || `HTTP error ${retryResponse.status}`);
              }
              return await retryResponse.json();
            }
          } catch (refreshError) {
            // Refresh failed - clear tokens and redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            throw new Error('Session expired. Please login again.');
          }
        } else {
          // No refresh token - redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || error.error || `HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // ============================================
  // AUTHENTICATION
  // ============================================
  static async login(identifier, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
  }

  static async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  static async logout(refreshToken) {
    return this.request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
  }

  static async refreshAccessToken(refreshToken) {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken })
    });
  }

  static async getCurrentUser() {
    return this.request('/auth/me');
  }

  static async changePassword(currentPassword, newPassword) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  static async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  static async resetPassword(token, newPassword) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  }

  static async verifyToken(token) {
    return this.request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  // ============================================
  // DASHBOARD
  // ============================================
  static async getDashboardData(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    const queryString = queryParams.toString();
    const endpoint = `/dashboard${queryString ? `?${queryString}` : ''}`;
    console.log('📊 Fetching dashboard data from:', endpoint);
    return this.request(endpoint, { method: 'GET' });
  }

  static async getDashboardFilters() {
    console.log('📊 Fetching dashboard filters');
    return this.request('/dashboard/filters', { method: 'GET' });
  }

  static async exportDashboardReport(params = {}) {
    const queryParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        queryParams.append(key, params[key]);
      }
    });
    const queryString = queryParams.toString();
    const endpoint = `/dashboard/export${queryString ? `?${queryString}` : ''}`;
    console.log('📊 Exporting dashboard report from:', endpoint);

    const url = `${CONFIG.API_BASE}${endpoint}`;
    const headers = {
      'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || `HTTP error ${response.status}`);
    }

    return await response.blob();
  }

  static async getDashboardSummary(period, startDate, endDate) {
    const params = new URLSearchParams({ period });
    if (startDate) params.append('dateFrom', startDate);
    if (endDate) params.append('dateTo', endDate);
    return this.request(`/dashboard/summary?${params}`);
  }

  // ============================================
  // SITES
  // ============================================
  static async getSites() {
    return this.request('/sites');
  }
  static async createSite(site) {
    return this.request('/sites', { method: 'POST', body: JSON.stringify(site) });
  }
  static async updateSite(id, site) {
    return this.request(`/sites/${id}`, { method: 'PUT', body: JSON.stringify(site) });
  }
  static async deleteSite(id) {
    return this.request(`/sites/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // WORKERS
  // ============================================
  static async getWorkers() {
    return this.request('/workers');
  }
  static async createWorker(worker) {
    return this.request('/workers', { method: 'POST', body: JSON.stringify(worker) });
  }
  static async updateWorker(id, worker) {
    return this.request(`/workers/${id}`, { method: 'PUT', body: JSON.stringify(worker) });
  }
  static async deleteWorker(id) {
    return this.request(`/workers/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // ENTRIES
  // ============================================
  static async getEntries(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/entries?${params}`);
  }
  static async createEntry(entry) {
    return this.request('/entries', { method: 'POST', body: JSON.stringify(entry) });
  }
  static async updateEntry(id, entry) {
    return this.request(`/entries/${id}`, { method: 'PUT', body: JSON.stringify(entry) });
  }
  static async deleteEntry(id) {
    return this.request(`/entries/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // ATTENDANCE
  // ============================================
  static async getAttendance(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/attendance?${params}`);
  }
  static async createAttendance(attendance) {
    return this.request('/attendance', { method: 'POST', body: JSON.stringify(attendance) });
  }
  static async updateAttendance(id, updates) {
    return this.request(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }
  static async deleteAttendance(id) {
    return this.request(`/attendance/${id}`, { method: 'DELETE' });
  }
  static async editAttendanceTimes(attendanceId, times) {
    return this.request(`/attendance/${attendanceId}/edit-times`, {
      method: 'PUT',
      body: JSON.stringify(times)
    });
  }
  static async getTeamAttendance(teamId, date) {
    return this.request(`/attendance/team/${teamId}?date=${date}`);
  }
  static async getAttendanceSettings() {
    return this.request('/attendance/settings');
  }
  static async updateAttendanceSettings(settings) {
    return this.request('/attendance/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  // ============================================
  // UNITS ⭐ (now static — matches all other methods)
  // ============================================
  static async getUnits(filters = {}) {
    const params = new URLSearchParams();
    if (filters.includeInactive) params.append('includeInactive', '1');
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    const qs = params.toString();
    return this.request(`/units${qs ? '?' + qs : ''}`);
  }

  static async getUnitCategories() {
    return this.request('/units/categories');
  }

  static async createUnit(payload) {
    return this.request('/units', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static async updateUnit(id, payload) {
    return this.request(`/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  static async deleteUnit(id) {
    return this.request(`/units/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // CLIENT INVOICES ⭐ (now static)
  // ============================================
  static async getClientInvoices(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    const qs = params.toString();
    return this.request(`/client-invoices${qs ? '?' + qs : ''}`);
  }

  static async getNextClientInvoiceNumber() {
    return this.request('/client-invoices/next-number');
  }

  static async getClientInvoice(id) {
    return this.request(`/client-invoices/${id}`);
  }

  static async createClientInvoice(payload) {
    return this.request('/client-invoices', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static async updateClientInvoice(id, payload) {
    return this.request(`/client-invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  static async deleteClientInvoice(id) {
    return this.request(`/client-invoices/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // EXPENSES
  // ============================================
  static async getExpenses(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/expenses?${params}`);
  }
  static async createExpense(expense) {
    return this.request('/expenses', { method: 'POST', body: JSON.stringify(expense) });
  }
  static async updateExpense(id, expense) {
    return this.request(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(expense) });
  }
  static async deleteExpense(id) {
    return this.request(`/expenses/${id}`, { method: 'DELETE' });
  }
  static async getExpenseCategories() {
    return this.request('/expenses/categories');
  }
  static async getMonthlyExpenseSummary(month) {
    return this.request(`/expenses/monthly-summary?month=${month}`);
  }
  static async bulkCreateExpenses(expenses) {
    return this.request('/expenses/bulk', { method: 'POST', body: JSON.stringify({ expenses }) });
  }

  // ============================================
  // INVOICES (daily)
  // ============================================
  static async getInvoices() {
    return this.request('/invoices');
  }
  static async getInvoice(id) {
    return this.request(`/invoices/${id}`);
  }
  static async createInvoice(invoice) {
    return this.request('/invoices', { method: 'POST', body: JSON.stringify(invoice) });
  }
  static async updateInvoice(id, invoice) {
    return this.request(`/invoices/${id}`, { method: 'PUT', body: JSON.stringify(invoice) });
  }
  static async deleteInvoice(id) {
    return this.request(`/invoices/${id}`, { method: 'DELETE' });
  }
  static async generateInvoiceNumber() {
    return this.request('/invoices/generate-number');
  }

  // ============================================
  // WORKER TEAMS
  // ============================================
  static async getTeams() {
    return this.request('/teams');
  }
  static async getTeam(id) {
    return this.request(`/teams/${id}`);
  }
  static async createTeam(team) {
    return this.request('/teams', { method: 'POST', body: JSON.stringify(team) });
  }
  static async updateTeam(id, team) {
    return this.request(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(team) });
  }
  static async deleteTeam(id) {
    return this.request(`/teams/${id}`, { method: 'DELETE' });
  }
  static async addTeamMember(teamId, member) {
    return this.request(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify(member) });
  }
  static async removeTeamMember(teamId, memberId) {
    return this.request(`/teams/${teamId}/members/${memberId}`, { method: 'DELETE' });
  }
  static async updateTeamMember(teamId, memberId, member) {
    return this.request(`/teams/${teamId}/members/${memberId}`, { method: 'PUT', body: JSON.stringify(member) });
  }

  // ============================================
  // ITEMS / INVENTORY
  // ============================================
  static async getItems(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/items?${params}`);
  }
  static async getItem(id) {
    return this.request(`/items/${id}`);
  }
  static async getItemCategories() {
    return this.request('/items/categories');
  }
  static async createItem(item) {
    return this.request('/items', { method: 'POST', body: JSON.stringify(item) });
  }
  static async updateItem(id, item) {
    return this.request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(item) });
  }
  static async deleteItem(id) {
    return this.request(`/items/${id}`, { method: 'DELETE' });
  }
  static async bulkCreateItems(items) {
    return this.request('/items/bulk', { method: 'POST', body: JSON.stringify({ items }) });
  }

  // ============================================
  // MONTHLY OVERHEAD
  // ============================================
  static async getMonthlyOverhead(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/monthly-overhead?${params}`);
  }
  static async createMonthlyOverhead(data) {
    return this.request('/monthly-overhead', { method: 'POST', body: JSON.stringify(data) });
  }
  static async updateMonthlyOverhead(id, data) {
    return this.request(`/monthly-overhead/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  static async deleteMonthlyOverhead(id) {
    return this.request(`/monthly-overhead/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // OVERHEAD CATEGORIES
  // ============================================
  static async getOverheadCategories() {
    return this.request('/overhead-categories');
  }
  static async createOverheadCategory(data) {
    return this.request('/overhead-categories', { method: 'POST', body: JSON.stringify(data) });
  }
  static async updateOverheadCategory(id, data) {
    return this.request(`/overhead-categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  static async deleteOverheadCategory(id) {
    return this.request(`/overhead-categories/${id}`, { method: 'DELETE' });
  }

  // ============================================
  // CUMULATIVE TRACKER
  // ============================================
  static async getCumulativeTracker(month) {
    const params = month ? `?month=${month}` : '';
    return this.request(`/cumulative-tracker${params}`);
  }
  static async createCumulativeTracker(data) {
    return this.request('/cumulative-tracker', { method: 'POST', body: JSON.stringify(data) });
  }
  static async updateCumulativeTracker(id, data) {
    return this.request(`/cumulative-tracker/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }
  static async deleteCumulativeTracker(id) {
    return this.request(`/cumulative-tracker/${id}`, { method: 'DELETE' });
  }
  static async calculateCumulative(month) {
    return this.request('/cumulative-tracker/calculate', {
      method: 'POST',
      body: JSON.stringify({ month })
    });
  }
  static async autoCalculateAll() {
    return this.request('/cumulative-tracker/auto-calculate', { method: 'POST' });
  }
  static async getLatestCumulative() {
    return this.request('/cumulative-tracker/latest');
  }

  // ============================================
  // MONTHLY SUMMARY
  // ============================================
  static async getMonthlySummaries(filters = {}) {
    const params = new URLSearchParams();
    if (filters.month) params.append('month', filters.month);
    const queryString = params.toString();
    const url = `/monthly-summary${queryString ? `?${queryString}` : ''}`;
    console.log('📊 Fetching monthly summaries from:', url);
    const result = await this.request(url);
    console.log('📊 Monthly summaries received:', result);
    return result;
  }

  static async getMonthlySummary(month) {
    if (!month) return this.getMonthlySummaries();
    console.log('📊 Fetching monthly summary for month:', month);
    return this.request(`/monthly-summary?month=${month}`);
  }

  static async createMonthlySummary(data) {
    console.log('📊 Creating monthly summary:', data);
    return this.request('/monthly-summary', { method: 'POST', body: JSON.stringify(data) });
  }

  static async updateMonthlySummary(id, data) {
    console.log('📊 Updating monthly summary:', id, data);
    return this.request(`/monthly-summary/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  static async deleteMonthlySummary(id) {
    console.log('📊 Deleting monthly summary:', id);
    return this.request(`/monthly-summary/${id}`, { method: 'DELETE' });
  }

  static async calculateMonthlySummary(month) {
    if (!month) throw new Error('Month is required for calculation');
    console.log('📊 Calculating monthly summary for month:', month);
    const result = await this.request(`/monthly-summary/calculate/${month}`, { method: 'POST' });
    console.log('📊 Calculate result:', result);
    return result;
  }

  // ============================================
  // REPORTS
  // ============================================
  static async getFinancialReport(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('dateFrom', startDate);
    if (endDate) params.append('dateTo', endDate);
    return this.request(`/reports/financial?${params}`);
  }
  static async getAttendanceReport(startDate, endDate) {
    const params = new URLSearchParams();
    if (startDate) params.append('dateFrom', startDate);
    if (endDate) params.append('dateTo', endDate);
    return this.request(`/reports/attendance?${params}`);
  }
  static async getSiteReport(siteId, startDate, endDate) {
    const params = new URLSearchParams({ siteId });
    if (startDate) params.append('dateFrom', startDate);
    if (endDate) params.append('dateTo', endDate);
    return this.request(`/reports/site?${params}`);
  }
  static async getWorkerReport(workerId, startDate, endDate) {
    const params = new URLSearchParams({ workerId });
    if (startDate) params.append('dateFrom', startDate);
    if (endDate) params.append('dateTo', endDate);
    return this.request(`/reports/worker?${params}`);
  }

  // ============================================
  // SETTINGS
  // ============================================
  static async getSettings() {
    return this.request('/settings');
  }
  static async updateSettings(settings) {
    return this.request('/settings', { method: 'POST', body: JSON.stringify(settings) });
  }
  static async getSetting(key) {
    return this.request(`/settings/${key}`);
  }
  static async updateSetting(key, value) {
    return this.request(`/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value }) });
  }

  // ============================================
  // AI CHAT
  // ============================================
  static async chat(message, context) {
    return this.request('/chat', { method: 'POST', body: JSON.stringify({ message, context }) });
  }

  // ============================================
  // HEALTH
  // ============================================
  static async healthCheck() {
    return this.request('/health');
  }

  // ============================================
  // EXPORT / IMPORT
  // ============================================
  static async exportData() {
    return this.request('/export');
  }
  static async importData(data) {
    return this.request('/import', { method: 'POST', body: JSON.stringify(data) });
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================
  static async bulkCreateEntries(entries) {
    return this.request('/entries/bulk', { method: 'POST', body: JSON.stringify({ entries }) });
  }
  static async bulkCreateAttendance(attendance) {
    return this.request('/attendance/bulk', { method: 'POST', body: JSON.stringify({ attendance }) });
  }

  // ============================================
  // PROJECTS
  // ============================================
  static async getProjects(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = `/projects${params ? `?${params}` : ''}`;
    return this.request(url);
  }
  static async getProject(id) {
    return this.request(`/projects/${id}`);
  }
  static async createProject(project) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(project)
    });
  }
  static async updateProject(id, project) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(project)
    });
  }
  static async deleteProject(id) {
    return this.request(`/projects/${id}`, { method: 'DELETE' });
  }
  static async calculateProject(id) {
    return this.request(`/projects/${id}/calculate`, { method: 'POST' });
  }
  static async getProjectSummary() {
    return this.request('/projects/summary');
  }
  static async getProjectEntries(projectId) {
    return this.request(`/projects/${projectId}/entries`);
  }
  static async getProjectTimeline(projectId) {
    return this.request(`/projects/${projectId}/timeline`);
  }

  // ============================================
  // CLIENTS
  // ============================================
  static async getClients(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = `/clients${params ? `?${params}` : ''}`;
    return this.request(url);
  }
  static async getClient(id) {
    return this.request(`/clients/${id}`);
  }
  static async createClient(client) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify(client)
    });
  }
  static async updateClient(id, client) {
    return this.request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(client)
    });
  }
  static async deleteClient(id) {
    return this.request(`/clients/${id}`, { method: 'DELETE' });
  }

  static async addClientContact(clientId, contact) {
    return this.request(`/clients/${clientId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(contact)
    });
  }
  static async updateClientContact(contactId, contact) {
    return this.request(`/clients/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(contact)
    });
  }
  static async deleteClientContact(contactId) {
    return this.request(`/clients/contacts/${contactId}`, { method: 'DELETE' });
  }
  static async addClientCommunication(clientId, communication) {
    return this.request(`/clients/${clientId}/communications`, {
      method: 'POST',
      body: JSON.stringify(communication)
    });
  }
  static async getClientCommunications(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/clients/communications?${params}`);
  }
  static async linkClientProject(clientId, projectId, data = {}) {
    return this.request(`/clients/${clientId}/projects`, {
      method: 'POST',
      body: JSON.stringify({ projectId, ...data })
    });
  }
  static async unlinkClientProject(linkId) {
    return this.request(`/clients/client-projects/${linkId}`, { method: 'DELETE' });
  }
  static async addClientPayment(clientId, payment) {
    return this.request(`/clients/${clientId}/payments`, {
      method: 'POST',
      body: JSON.stringify(payment)
    });
  }
  static async addClientMeeting(clientId, meeting) {
    return this.request(`/clients/${clientId}/meetings`, {
      method: 'POST',
      body: JSON.stringify(meeting)
    });
  }
  static async addClientSatisfaction(clientId, satisfaction) {
    return this.request(`/clients/${clientId}/satisfaction`, {
      method: 'POST',
      body: JSON.stringify(satisfaction)
    });
  }
  static async getClientSummary() {
    return this.request('/clients/summary');
  }

  // ============================================
  // EQUIPMENT MANAGEMENT
  // ============================================
  static async getEquipment(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = `/equipment${params ? `?${params}` : ''}`;
    return this.request(url);
  }
  static async getEquipmentItem(id) {
    return this.request(`/equipment/${id}`);
  }
  static async createEquipment(data) {
    return this.request('/equipment', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  static async updateEquipment(id, data) {
    return this.request(`/equipment/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  static async deleteEquipment(id) {
    return this.request(`/equipment/${id}`, { method: 'DELETE' });
  }
  static async getEquipmentCategories() {
    return this.request('/equipment/categories');
  }
  static async createEquipmentCategory(data) {
    return this.request('/equipment/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  static async addMaintenance(equipmentId, data) {
    return this.request(`/equipment/${equipmentId}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  static async getMaintenanceRecords(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/equipment/maintenance?${params}`);
  }
  static async assignEquipment(equipmentId, data) {
    return this.request(`/equipment/${equipmentId}/assign`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  static async returnEquipment(assignmentId, data) {
    return this.request(`/equipment/assignments/${assignmentId}/return`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  static async logUsage(equipmentId, data) {
    return this.request(`/equipment/${equipmentId}/usage`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  static async calculateDepreciation(equipmentId) {
    return this.request(`/equipment/${equipmentId}/depreciation`, {
      method: 'POST'
    });
  }
  static async getEquipmentSummary() {
    return this.request('/equipment/summary');
  }

  // ============================================
  // QUALITY CONTROL
  // ============================================
  static async getInspectionTypes() {
    return this.request('/qc/inspection-types');
  }
  static async createInspectionType(data) {
    return this.request('/qc/inspection-types', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  static async getChecklists(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/qc/checklists?${params}`);
  }
  static async createChecklist(data) {
    return this.request('/qc/checklists', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  static async getInspections(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/qc/inspections?${params}`);
  }
  static async getInspection(id) {
    return this.request(`/qc/inspections/${id}`);
  }
  static async createInspection(data) {
    return this.request('/qc/inspections', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  static async updateInspection(id, data) {
    return this.request(`/qc/inspections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  static async deleteInspection(id) {
    return this.request(`/qc/inspections/${id}`, { method: 'DELETE' });
  }
  static async updateInspectionResults(id, data) {
    return this.request(`/qc/inspections/${id}/results`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  static async getIssues(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/qc/issues?${params}`);
  }
  static async createIssue(data) {
    return this.request('/qc/issues', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  static async updateIssue(id, data) {
    return this.request(`/qc/issues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  static async addCorrectiveAction(issueId, data) {
    return this.request(`/qc/issues/${issueId}/actions`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  static async getSafetyIncidents(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/qc/safety-incidents?${params}`);
  }
  static async createSafetyIncident(data) {
    return this.request('/qc/safety-incidents', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  static async updateSafetyIncident(id, data) {
    return this.request(`/qc/safety-incidents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  static async getQCSummary() {
    return this.request('/qc/summary');
  }

  // ============================================
  // PERFORMANCE ANALYTICS
  // ============================================
  static async getPerformanceMetrics(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = `/performance/metrics${params ? `?${params}` : ''}`;
    return this.request(url);
  }
  static async getPerformanceRankings(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = `/performance/rankings${params ? `?${params}` : ''}`;
    return this.request(url);
  }
  static async getPerformanceTrends(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = `/performance/trends${params ? `?${params}` : ''}`;
    return this.request(url);
  }
  static async getPerformanceKPIs() {
    return this.request('/performance/kpis');
  }

  // ============================================
  // LEAVE & HOLIDAY MANAGEMENT
  // ============================================
  static async getLeaveTypes() {
    return this.request('/leave/types');
  }
  static async createLeaveType(data) {
    return this.request('/leave/types', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  static async updateLeaveType(id, data) {
    return this.request(`/leave/types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  static async deleteLeaveType(id) {
    return this.request(`/leave/types/${id}`, { method: 'DELETE' });
  }

  static async getLeaveRequests(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = `/leave/requests${params ? `?${params}` : ''}`;
    return this.request(url);
  }
  static async createLeaveRequest(data) {
    return this.request('/leave/requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  static async updateLeaveRequest(id, data) {
    return this.request(`/leave/requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  static async approveLeaveRequest(id, data = {}) {
    return this.request(`/leave/requests/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  static async rejectLeaveRequest(id, data = {}) {
    return this.request(`/leave/requests/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  static async cancelLeaveRequest(id) {
    return this.request(`/leave/requests/${id}/cancel`, {
      method: 'PUT'
    });
  }
  static async deleteLeaveRequest(id) {
    return this.request(`/leave/requests/${id}`, { method: 'DELETE' });
  }

  static async getLeaveBalances(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = `/leave/balances${params ? `?${params}` : ''}`;
    return this.request(url);
  }
  static async initializeLeaveBalances(data) {
    return this.request('/leave/balances/initialize', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  static async updateLeaveBalance(id, data) {
    return this.request(`/leave/balances/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static async getHolidays(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = `/leave/holidays${params ? `?${params}` : ''}`;
    return this.request(url);
  }
  static async createHoliday(data) {
    return this.request('/leave/holidays', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  static async updateHoliday(id, data) {
    return this.request(`/leave/holidays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  static async deleteHoliday(id) {
    return this.request(`/leave/holidays/${id}`, { method: 'DELETE' });
  }

  static async getLeaveStats(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const url = `/leave/stats${params ? `?${params}` : ''}`;
    return this.request(url);
  }
  // ============================================
  // INVENTORY MATERIALS (used by BOM screen)
  // ============================================
  static async getMaterials(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.categoryId) params.append('categoryId', filters.categoryId);
    if (filters.status) params.append('status', filters.status);
    if (filters.supplierId) params.append('supplierId', filters.supplierId);
    if (filters.lowStock) params.append('lowStock', 'true');
    const qs = params.toString();
    return this.request(`/inventory/materials${qs ? '?' + qs : ''}`);
  }

  static async getMaterial(id) {
    return this.request(`/inventory/materials/${id}`);
  }

  static async createMaterial(payload) {
    return this.request('/inventory/materials', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static async updateMaterial(id, payload) {
    return this.request(`/inventory/materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  static async deleteMaterial(id) {
    return this.request(`/inventory/materials/${id}`, { method: 'DELETE' });
  }

  static async getMaterialCategories() {
    return this.request('/inventory/categories');
  }

  static async getInventorySummary() {
    return this.request('/inventory/summary');
  }
  // ============================================
  // UTILITY
  // ============================================
  static getCurrentMonthString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // ============================================
  // AUTH HELPER METHODS
  // ============================================
  static isAuthenticated() {
    return !!localStorage.getItem('accessToken');
  }
  static getAuthToken() {
    return localStorage.getItem('accessToken');
  }
  static getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }
  static clearAuthTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
  static setAuthTokens(accessToken, refreshToken) {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  }
}

export default ApiService;