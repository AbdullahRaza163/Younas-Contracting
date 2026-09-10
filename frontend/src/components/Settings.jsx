// src/components/SettingsComponent.jsx
import React, { useState } from 'react';
import { 
  Download, Upload, Save, Settings, 
  Globe, DollarSign, Clock, Database,
  Shield, Info, RefreshCw, CheckCircle,
  AlertCircle, LayoutDashboard, Users,
  Building2, FileText, HardHat,
  ChevronDown, ChevronUp, X,
  Zap, Sparkles, Crown, Award,
  Target, Gauge, BarChart3
} from 'lucide-react';
import { CONFIG } from '../config/constants';
import './Settings.css';

const SettingsComponent = ({ data, updateData }) => {
  // ============================================
  // STATE
  // ============================================
  const [settings, setSettings] = useState(data.settings || {});
  const [showBackup, setShowBackup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [hoveredCard, setHoveredCard] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // ============================================
  // CARD DETAILS FOR TOOLTIPS
  // ============================================
  const cardDetails = {
    entries: {
      title: 'Total Entries',
      details: [
        { label: 'Total Entries', value: data.entries.length },
        { label: 'Revenue Entries', value: data.entries.filter(e => e.kamai > 0).length },
        { label: 'Labour Entries', value: data.entries.filter(e => e.labour > 0).length },
        { label: 'Total Revenue', value: data.entries.reduce((sum, e) => sum + (e.kamai || 0), 0).toFixed(3) }
      ]
    },
    sites: {
      title: 'Total Sites',
      details: [
        { label: 'Total Sites', value: data.sites.length },
        { label: 'Active Sites', value: data.sites.filter(s => s.status !== 'inactive').length },
        { label: 'Total Revenue', value: data.entries.reduce((sum, e) => sum + (e.kamai || 0), 0).toFixed(3) },
        { label: 'Total Labour', value: data.entries.reduce((sum, e) => sum + (e.labour || 0), 0).toFixed(3) }
      ]
    },
    workers: {
      title: 'Total Workers',
      details: [
        { label: 'Total Workers', value: data.workers.length },
        { label: 'Active Workers', value: data.workers.filter(w => w.status !== 'inactive').length },
        { label: 'Attendance Records', value: data.attendance.length },
        { label: 'Total Wages', value: data.workers.reduce((sum, w) => sum + (w.dailyRate || 0), 0).toFixed(3) }
      ]
    },
    attendance: {
      title: 'Attendance Records',
      details: [
        { label: 'Total Records', value: data.attendance.length },
        { label: 'Present Records', value: data.attendance.filter(a => a.present).length },
        { label: 'Absent Records', value: data.attendance.filter(a => !a.present).length },
        { label: 'Attendance Rate', value: data.attendance.length > 0 ? `${((data.attendance.filter(a => a.present).length / data.attendance.length) * 100).toFixed(1)}%` : '0%' }
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

  // ============================================
  // HANDLERS
  // ============================================
  const handleSave = () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      updateData({ settings });
      setSuccess('✅ Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('❌ Failed to save settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    setLoading(true);
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `haji_younas_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess('✅ Data exported successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('❌ Failed to export data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (window.confirm('⚠️ This will replace all current data. Continue?')) {
            updateData(imported);
            setSuccess('✅ Data imported successfully!');
            setTimeout(() => setSuccess(''), 3000);
          }
        } catch (error) {
          setError('❌ Invalid file format. Please select a valid JSON backup file.');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      setError('❌ Failed to import data: ' + error.message);
      setLoading(false);
    }
    e.target.value = '';
  };

  // ============================================
  // STATS ITEMS
  // ============================================
  const statItems = [
    { 
      id: 'entries', 
      icon: FileText, 
      label: 'Total Entries', 
      value: data.entries.length,
      color: '#3b82f6',
      bg: 'rgba(59, 130, 246, 0.12)',
      trend: 'neutral'
    },
    { 
      id: 'sites', 
      icon: Building2, 
      label: 'Total Sites', 
      value: data.sites.length,
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.12)',
      trend: 'neutral'
    },
    { 
      id: 'workers', 
      icon: Users, 
      label: 'Total Workers', 
      value: data.workers.length,
      color: '#8b5cf6',
      bg: 'rgba(139, 92, 246, 0.12)',
      trend: 'neutral'
    },
    { 
      id: 'attendance', 
      icon: Clock, 
      label: 'Attendance Records', 
      value: data.attendance.length,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
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
        className="settings-card-tooltip"
        style={{
          position: 'fixed',
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          zIndex: 9999
        }}
      >
        <div className="settings-tooltip-header">
          <strong>{cardDetails[hoveredCard].title}</strong>
        </div>
        <div className="settings-tooltip-body">
          {cardDetails[hoveredCard].details.map((detail, idx) => (
            <div key={idx} className="settings-tooltip-row">
              <span className="settings-tooltip-label">{detail.label}</span>
              <span className="settings-tooltip-value">{detail.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="settings-modern">
      {/* Header */}
      <div className="dashboard-header-modern">
        <div className="header-left">
          <div className="header-icon-wrapper">
            <Settings size={28} />
            <span className="header-badge">Settings</span>
          </div>
          <div>
            <h2>System Settings</h2>
            <p className="header-subtitle">Manage application settings and data</p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-refresh-modern" onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>
            <Save size={16} /> {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="success-message-modern">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="error-message-modern">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Stats Cards */}
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
                <BarChart3 size={16} color="#8a9bb5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {renderTooltip()}

      {/* Settings Grid */}
      <div className="settings-grid">
        {/* General Settings */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">
              <Globe size={20} className="settings-icon" />
              <h3>General Settings</h3>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="form-group">
              <label><DollarSign size={14} /> Currency</label>
              <select
                value={settings.currency || 'BD'}
                onChange={e => setSettings({ ...settings, currency: e.target.value })}
                className="form-select"
              >
                <option value="BD">Bahraini Dinar (BD)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="PKR">Pakistani Rupee (₨)</option>
              </select>
            </div>

            <div className="form-group">
              <label><Globe size={14} /> Language</label>
              <select
                value={settings.language || 'urdu'}
                onChange={e => setSettings({ ...settings, language: e.target.value })}
                className="form-select"
              >
                <option value="urdu">اردو (Urdu)</option>
                <option value="english">English</option>
              </select>
            </div>

            <div className="form-group">
              <label><DollarSign size={14} /> Monthly Overhead (BD)</label>
              <input
                type="number"
                step="0.001"
                value={data.monthlyOverhead}
                onChange={e => updateData({ monthlyOverhead: parseFloat(e.target.value) || 0 })}
                className="form-input"
                placeholder="0.000"
              />
            </div>

            <div className="form-group">
              <label><Clock size={14} /> Working Hours Per Day</label>
              <input
                type="number"
                step="0.5"
                value={settings.workingHours || 8}
                onChange={e => setSettings({ ...settings, workingHours: parseFloat(e.target.value) || 8 })}
                className="form-input"
                placeholder="8"
              />
              <small className="form-hint">Used to calculate hourly rate from daily rate</small>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">
              <Database size={20} className="settings-icon" />
              <h3>Data Management</h3>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="data-management-actions">
              <button className="btn-export" onClick={handleExport} disabled={loading}>
                <Download size={16} /> Export Data
              </button>
              <button className="btn-import" onClick={() => setShowBackup(!showBackup)} disabled={loading}>
                <Upload size={16} /> Import Data
              </button>
            </div>
            {showBackup && (
              <div className="import-section">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="file-input"
                  id="file-input"
                />
                <label htmlFor="file-input" className="file-input-label">
                  <Upload size={20} /> Choose JSON File
                </label>
                <small className="form-hint">Select a JSON backup file to restore data</small>
              </div>
            )}
            <div className="data-info">
              <div className="data-info-item">
                <span className="data-info-label">Last Backup</span>
                <span className="data-info-value">-</span>
              </div>
              <div className="data-info-item">
                <span className="data-info-label">Data Size</span>
                <span className="data-info-value">{new Blob([JSON.stringify(data)]).size / 1024 > 1024 ? `${(new Blob([JSON.stringify(data)]).size / (1024 * 1024)).toFixed(2)} MB` : `${(new Blob([JSON.stringify(data)]).size / 1024).toFixed(2)} KB`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-title">
              <Info size={20} className="settings-icon" />
              <h3>About</h3>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="about-section">
              <div className="about-logo">
                <HardHat size={40} className="about-icon" />
                <div>
                  <h4>{CONFIG.COMPANY_NAME}</h4>
                  <p>Construction & Contracting</p>
                </div>
              </div>
              <div className="about-details">
                <div className="about-item">
                  <span className="about-label">Version</span>
                  <span className="about-value">{CONFIG.VERSION}</span>
                </div>
                <div className="about-item">
                  <span className="about-label">Total Entries</span>
                  <span className="about-value">{data.entries.length}</span>
                </div>
                <div className="about-item">
                  <span className="about-label">Total Sites</span>
                  <span className="about-value">{data.sites.length}</span>
                </div>
                <div className="about-item">
                  <span className="about-label">Total Workers</span>
                  <span className="about-value">{data.workers.length}</span>
                </div>
                <div className="about-item">
                  <span className="about-label">Attendance Records</span>
                  <span className="about-value">{data.attendance.length}</span>
                </div>
                <div className="about-item">
                  <span className="about-label">Total Revenue</span>
                  <span className="about-value">{data.entries.reduce((sum, e) => sum + (e.kamai || 0), 0).toFixed(3)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsComponent;