// src/components/Navigation.jsx - Accordion Behavior (Only one open at a time)

import React, { useState } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Building2,
  HardHat,
  Clock,
  FileText,
  BarChart3,
  Package,
  Settings as SettingsIcon,
  Users,
  DollarSign,
  Layers,
  Receipt,
  FileSpreadsheet,
  Boxes,
  PieChart,
  Tags,
  CalendarDays,
  Shield,
  Gauge,
  Wrench,
  Wallet,
  FolderKanban,
  Users2,
  CreditCard,
  CircleDollarSign,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  TrendingUp,
  ChevronRight,
  LogOut
} from 'lucide-react';
import './Navigation.css';
import logoImg from '../assets/logo.png';
import sideLogoImg from '../assets/SideLogo.png'; // Import smaller logo for collapsed state

const Navigation = ({ 
  activeTab, 
  setActiveTab, 
  companyName, 
  isCollapsed, 
  toggleNav,
  onLogout 
}) => {
  const [expandedSection, setExpandedSection] = useState('dashboard');

  const toggleSection = (sectionId) => {
    if (isCollapsed) return;
    if (expandedSection === sectionId) {
      setExpandedSection(null);
    } else {
      setExpandedSection(sectionId);
    }
  };

  const navSections = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: LayoutDashboard,
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      id: 'project',
      title: 'Project Management',
      icon: FolderKanban,
      items: [
        { id: 'projects', label: 'Projects', icon: FolderKanban },
        { id: 'budget-forecast', label: 'Budget & Forecast', icon: Wallet },
        { id: 'clients', label: 'Clients', icon: Users2 },
        { id: 'equipment', label: 'Equipment', icon: Wrench }
      ]
    },
    {
      id: 'hr',
      title: 'HR & Staff',
      icon: Users,
      items: [
        { id: 'workers', label: 'Workers', icon: HardHat },
        { id: 'teams', label: 'Teams', icon: Users },
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'leave', label: 'Leave Management', icon: CalendarDays },
        { id: 'performance', label: 'Performance', icon: Gauge }
      ]
    },
    {
      id: 'finance',
      title: 'Finance',
      icon: DollarSign,
      items: [
        { id: 'entries', label: 'Entries', icon: PlusCircle },
        { id: 'expenses', label: 'Expenses', icon: DollarSign },
        { id: 'invoices', label: 'Invoices', icon: FileText },
        { id: 'advances', label: 'Advances', icon: CircleDollarSign },
        { id: 'loans', label: 'Loans', icon: CreditCard }
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory & BOM',
      icon: Package,
      items: [
        { id: 'items', label: 'Items', icon: Package },
        { id: 'inventory', label: 'Inventory', icon: Boxes },
        { id: 'bom', label: 'Bill of Materials', icon: Layers }
      ]
    },
    {
      id: 'overhead',
      title: 'Overhead Management',
      icon: Receipt,
      items: [
        { id: 'overhead-categories', label: 'Overhead Categories', icon: Tags },
        { id: 'monthly-overhead', label: 'Monthly Overhead', icon: Receipt },
        { id: 'monthly-summary', label: 'Monthly Summary', icon: PieChart },
        { id: 'cumulative', label: 'Cumulative Tracker', icon: TrendingUp }
      ]
    },
    {
      id: 'quality',
      title: 'Quality & Compliance',
      icon: Shield,
      items: [
        { id: 'quality', label: 'Quality Control', icon: Shield },
        { id: 'sites', label: 'Sites', icon: Building2 }
      ]
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      icon: BarChart3,
      items: [
        { id: 'dailyreport', label: 'Daily Report', icon: FileSpreadsheet },
        { id: 'reports', label: 'Reports', icon: BarChart3 }
      ]
    },
    {
      id: 'setup',
      title: 'Setup & Configuration',
      icon: SettingsIcon,
      items: [
        { id: 'settings', label: 'Settings', icon: SettingsIcon }
      ]
    }
  ];

  const renderSectionItems = (items) => {
    if (isCollapsed) return null;
    
    return items.map((item) => {
      const Icon = item.icon;
      const isActive = activeTab === item.id;
      return (
        <button
          key={item.id}
          className={`nav-btn ${isActive ? 'active' : ''}`}
          onClick={() => setActiveTab(item.id)}
          title={item.label}
        >
          <Icon size={18} className="nav-icon" />
          <span className="nav-label">{item.label}</span>
          {isActive && <span className="nav-indicator"></span>}
        </button>
      );
    });
  };

  return (
    <nav className={`navigation ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Company Logo - Shows different logos based on state */}
      <div className="sidebar-logo">
        <div className="logo-icon-wrapper">
          {isCollapsed ? (
            // Show smaller side logo when collapsed
            <img 
              src={sideLogoImg} 
              alt="HYC" 
              className="sidebar-logo-img collapsed-logo" 
            />
          ) : (
            // Show full logo when expanded
            <img 
              src={logoImg} 
              alt="HYC" 
              className="sidebar-logo-img" 
            />
          )}
          {/* <span className="logo-badge"></span> */}
        </div>
        {!isCollapsed && (
          <div className="logo-text">
            <h1>{companyName || 'HYC'}</h1>
            <span>Construction & Contracting</span>
          </div>
        )}
      </div>

      <div className="nav-scroll">
        {navSections.map((section) => {
          const SectionIcon = section.icon;
          const isExpanded = expandedSection === section.id;
          const hasActiveItem = section.items.some(item => activeTab === item.id);
          
          return (
            <div key={section.id} className="nav-section">
              <div 
                className={`nav-section-header ${isExpanded ? 'expanded' : ''} ${hasActiveItem ? 'has-active' : ''}`}
                onClick={() => toggleSection(section.id)}
                title={isCollapsed ? section.title : ''}
              >
                <SectionIcon size={isCollapsed ? 20 : 16} className="nav-section-icon" />
                {!isCollapsed && (
                  <>
                    <span className="nav-section-title">{section.title}</span>
                    {/* <div className="section-toggle-icon">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div> */}
                  </>
                )}
              </div>
              
              {(isExpanded || isCollapsed) && (
                <div className={`nav-section-items ${isExpanded ? 'expanded' : ''}`}>
                  {renderSectionItems(section.items)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="nav-footer">
        {!isCollapsed ? (
          <>
            <div className="nav-footer-content">
              <span className="nav-version">v2.0.0</span>
              {/* <button className="logout-btn" onClick={onLogout}>
                <LogOut size={16} />
                <span>Logout</span>
              </button> */}
            </div>
          </>
        ) : (
          <button className="logout-btn collapsed" onClick={onLogout} title="Logout">
            <LogOut size={18} />
          </button>
        )}
      </div>

      {/* Collapse Toggle Button */}
      {/* <button className="collapse-btn" onClick={toggleNav} title={isCollapsed ? 'Expand' : 'Collapse'}>
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button> */}
    </nav>
  );
};

export default Navigation;