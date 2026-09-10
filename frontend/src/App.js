// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HardHat, AlertCircle, RefreshCw } from 'lucide-react';

// Import global styles
import './components/globals.css';

// Import ThemeProvider
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

import { CONFIG } from './config/constants';
import useData from './hooks/useData';
import Navigation from './components/Navigation';
import TopBar from './components/TopBar';

// Auth Components
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ProtectedRoute from './components/ProtectedRoute';

// Main Components
import ProjectDashboard from './components/ProjectDashboard';
import DashboardComponent from './components/Dashboard';
import EntriesManagerComponent from './components/EntriesManager';
import SitesManagerComponent from './components/SitesManager';
import WorkersManagerComponent from './components/WorkersManager';
import AttendanceManagerComponent from './components/AttendanceManager';
import DailyReportComponent from './components/DailyReport';
import ReportsComponent from './components/Reports';
import BOMComponent from './components/BOM';
import AIAssistantComponent from './components/AIAssistant';
import SettingsComponent from './components/Settings';
import CumulativeTrackerComponent from './components/CumulativeTracker';
import ExpensesManagerComponent from './components/ExpensesManager';
import InvoicesManagerComponent from './components/InvoicesManager';
import TeamsManagerComponent from './components/TeamsManager';
import Utils from './utils/Utils';
import ItemManagerComponent from './components/ItemManager';
import OverheadCategoriesManager from './components/OverheadCategoriesManager';
import MonthlyOverheadManager from './components/MonthlyOverheadManager';
import MonthlySummaryComponent from './components/MonthlySummaryComponent';
import BudgetForecasting from './components/BudgetForecasting';
import ClientManagement from './components/ClientManagement';
import EquipmentManagement from './components/EquipmentManagement';
import QualityControl from './components/QualityControl';
import LeaveManagement from './components/LeaveManagement';
import PerformanceAnalytics from './components/PerformanceAnalytics';
import InventoryManagement from './components/InventoryManagement';
import LoanManagement from './components/LoanManagement';
import AdvanceManagement from './components/AdvanceManagement';

// Main App Content (Protected)
function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data, loading, error, loadData, ...actions } = useData();

  const toggleNav = () => {
    setIsNavCollapsed(!isNavCollapsed);
  };

  if (loading) {
    return (
      <div className="app" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="loading-screen">
          <HardHat size={48} className="loading-icon" />
          <h2>{t('loading')}</h2>
          <p>Connecting to server</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="error-screen">
          <AlertCircle size={48} className="error-icon" />
          <h2>Connection Error</h2>
          <p>{error}</p>
          <button onClick={loadData} className="btn-retry">
            <RefreshCw size={16} /> {t('refresh')}
          </button>
        </div>
      </div>
    );
  }

  const companyName = data.companyName || CONFIG.COMPANY_NAME || 'Company';

  return (
    <div className={`app ${isNavCollapsed ? 'nav-collapsed' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <TopBar 
        companyName={companyName}
        isNavCollapsed={isNavCollapsed}
        toggleNav={toggleNav}
        user={user}
        onLogout={logout}
      />

      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        companyName={companyName}
        isCollapsed={isNavCollapsed}
        toggleNav={toggleNav}
        user={user}
      />

      <main className={`app-main-modern ${isNavCollapsed ? 'nav-collapsed' : ''}`}>
        {activeTab === 'dashboard' && <DashboardComponent data={data} />}
        {activeTab === 'projects' && <ProjectDashboard data={data} refreshData={actions.refreshData} />}
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
            refreshData={actions.refreshData}
          />
        )}
        {activeTab === 'items' && (
          <ItemManagerComponent
            data={data}
            addItem={actions.addItem}
            updateItem={actions.updateItem}
            deleteItem={actions.deleteItem}
            refreshData={actions.refreshData}
          />
        )}
        {activeTab === 'overhead-categories' && (
          <OverheadCategoriesManager
            data={data}
            refreshData={actions.refreshData}
            loading={loading}
          />
        )}
        {activeTab === 'monthly-overhead' && (
          <MonthlyOverheadManager
            data={data}
            addMonthlyOverhead={actions.addMonthlyOverhead}
            updateMonthlyOverhead={actions.updateMonthlyOverhead}
            deleteMonthlyOverhead={actions.deleteMonthlyOverhead}
            refreshData={actions.refreshData}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        )}
        {activeTab === 'monthly-summary' && (
          <MonthlySummaryComponent
            data={data}
            refreshData={actions.refreshData}
            addMonthlySummary={actions.addMonthlySummary}
            updateMonthlySummary={actions.updateMonthlySummary}
            deleteMonthlySummary={actions.deleteMonthlySummary}
            calculateMonthlySummary={actions.calculateMonthlySummary}
          />
        )}
        {activeTab === 'dailyentry' && (
          <DailyEntryComponent
            data={data}
            addDailyEntry={actions.addDailyEntry}
            fetchDailyEntries={actions.fetchDailyEntries}
            refreshData={actions.refreshData}
          />
        )}
        {activeTab === 'advances' && (
          <AdvanceManagement data={data} refreshData={actions.refreshData} />
        )}
        {activeTab === 'loans' && (
          <LoanManagement data={data} refreshData={actions.refreshData} />
        )}
        {activeTab === 'inventory' && (
          <InventoryManagement data={data} refreshData={actions.refreshData} />
        )}
        {activeTab === 'cumulative' && (
          <CumulativeTrackerComponent data={data} />
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
        {activeTab === 'teams' && (
          <TeamsManagerComponent
            data={data}
            addTeam={actions.addTeam}
            updateTeam={actions.updateTeam}
            deleteTeam={actions.deleteTeam}
            addTeamMember={actions.addTeamMember}
            removeTeamMember={actions.removeTeamMember}
          />
        )}
        {activeTab === 'leave' && (
          <LeaveManagement data={data} refreshData={actions.refreshData} />
        )}
        {activeTab === 'performance' && (
          <PerformanceAnalytics data={data} refreshData={actions.refreshData} />
        )}
        {activeTab === 'quality' && (
          <QualityControl data={data} refreshData={actions.refreshData} />
        )}
        {activeTab === 'budget-forecast' && (
          <BudgetForecasting data={data} refreshData={actions.refreshData} />
        )}
        {activeTab === 'clients' && (
          <ClientManagement data={data} refreshData={actions.refreshData} />
        )}
        {activeTab === 'equipment' && (
          <EquipmentManagement 
            data={data} 
            refreshData={actions.refreshData}
            addEquipment={actions.addEquipment}
            updateEquipment={actions.updateEquipment}
            deleteEquipment={actions.deleteEquipment}
            addMaintenance={actions.addMaintenance}
            assignEquipment={actions.assignEquipment}
            returnEquipment={actions.returnEquipment}
            logEquipmentUsage={actions.logEquipmentUsage}
            calculateDepreciation={actions.calculateDepreciation}
          />
        )}
        {activeTab === 'expenses' && (
          <ExpensesManagerComponent
            data={data}
            addExpense={actions.addExpense}
            updateExpense={actions.updateExpense}
            deleteExpense={actions.deleteExpense}
            refreshData={actions.refreshData}
          />
        )}
        {activeTab === 'invoices' && (
          <InvoicesManagerComponent
            data={data}
            addInvoice={actions.addInvoice}
            updateInvoice={actions.updateInvoice}
            deleteInvoice={actions.deleteInvoice}
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
    </div>
  );
}

// Main App with Routing and Providers
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Protected Routes */}
              <Route 
                path="/*" 
                element={
                  <ProtectedRoute>
                    <AppContent />
                  </ProtectedRoute>
                } 
              />
              
              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;