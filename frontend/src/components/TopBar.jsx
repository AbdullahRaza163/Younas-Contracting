// src/components/TopBar.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  HardHat, 
  User, 
  Bell, 
  Settings, 
  LogOut,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
  UserCircle,
  Shield,
  HelpCircle,
  Search,
  LayoutGrid,
  MessageSquare,
  Sparkles,
  Award,
  TrendingUp
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import './TopBar.css';

const TopBar = ({ companyName, isNavCollapsed, toggleNav }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
  };

  const getUserInitials = () => {
    if (user?.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getRoleBadge = () => {
    const role = user?.role || 'user';
    const roleMap = {
      'admin': { label: 'Admin', icon: Shield, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
      'manager': { label: 'Manager', icon: User, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
      'user': { label: 'User', icon: UserCircle, color: '#8b949e', gradient: 'linear-gradient(135deg, #8b949e, #6b7280)' }
    };
    return roleMap[role] || roleMap['user'];
  };

  const RoleIcon = getRoleBadge().icon;

  const notifications = [
    { id: 1, title: 'New project assigned: "HYC Tower Phase 3"', time: '5 min ago', read: false, icon: '📋' },
    { id: 2, title: 'Budget update required for Site A', time: '1 hour ago', read: false, icon: '💰' },
    { id: 3, title: 'Team meeting scheduled at 3 PM', time: '3 hours ago', read: true, icon: '📅' },
    { id: 4, title: 'Daily report approved', time: '5 hours ago', read: true, icon: '✅' },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className={`topbar ${isNavCollapsed ? 'nav-collapsed' : ''}`}>
      <div className="topbar-left">
        <button className="topbar-toggle" onClick={toggleNav} title={isNavCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}>
          <div className="toggle-icon-wrapper">
            {isNavCollapsed ? <Menu size={20} /> : <X size={20} />}
          </div>
          <span className="toggle-tooltip">{isNavCollapsed ? 'Expand' : 'Collapse'}</span>
        </button>

        <div className="topbar-brand">
          <div className="topbar-brand-text">
            <h1>
              <span className="greeting">{t('welcomeBack') || 'Welcome back,'}</span>
              <span className="user-name">{user?.full_name || user?.username || 'Admin'}</span>
            </h1>
            <span className="brand-subtitle">
              <Sparkles size={12} className="sparkle-icon" />
              {companyName || 'Construction Management System'}
              <span className="topbar-role-badge">
                <RoleIcon size={12} />
                {getRoleBadge().label}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="topbar-right">
        {/* Search Bar */}
        <div className={`topbar-search ${searchFocused ? 'focused' : ''}`}>
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder={t('search') || 'Search anything...'} 
            className="search-input"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <kbd className="search-shortcut">⌘K</kbd>
          <div className="search-glow"></div>
        </div>

        {/* Theme Toggle */}
        <button 
          className="topbar-btn theme-toggle" 
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <div className="theme-icon-wrapper">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </div>
          <div className="theme-ripple"></div>
        </button>

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Notification Bell */}
        <div className="topbar-notification-wrapper" ref={notificationRef}>
          <button 
            className={`topbar-btn notification-btn ${showNotifications ? 'active' : ''}`} 
            onClick={() => setShowNotifications(!showNotifications)}
            title={t('notifications') || 'Notifications'}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="topbar-badge">
                {unreadCount}
                <span className="badge-pulse"></span>
              </span>
            )}
            <div className="btn-glow"></div>
          </button>

          {showNotifications && (
            <div className="topbar-notification-dropdown">
              <div className="notification-header">
                <div className="notification-header-left">
                  <h3>{t('notifications') || 'Notifications'}</h3>
                  <span className="notification-count">{unreadCount} unread</span>
                </div>
                <button className="mark-all-btn">{t('markAllRead') || 'Mark all read'}</button>
              </div>
              <div className="notification-list">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`notification-item ${!notif.read ? 'unread' : ''}`}>
                    <div className="notification-icon-wrapper">
                      <span className="notification-emoji">{notif.icon}</span>
                    </div>
                    <div className="notification-content">
                      <span className="notification-title">{notif.title}</span>
                      <span className="notification-time">{notif.time}</span>
                    </div>
                    {!notif.read && <div className="notification-dot"></div>}
                  </div>
                ))}
              </div>
              <div className="notification-footer">
                <button className="view-all-btn">
                  <span>{t('viewAll') || 'View All Notifications'}</span>
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="topbar-user" ref={menuRef}>
          <div className="topbar-user-trigger" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="topbar-avatar" style={{ 
              background: getRoleBadge().gradient,
              color: '#ffffff'
            }}>
              {getUserInitials()}
              <span className="avatar-status"></span>
            </div>
            <div className="topbar-user-info">
              <span className="topbar-user-name">
                {user?.full_name || user?.username || 'User'}
              </span>
              <span className="topbar-user-role">
                <RoleIcon size={12} />
                {getRoleBadge().label}
              </span>
            </div>
            <ChevronDown 
              size={16} 
              className={`topbar-user-dropdown ${showUserMenu ? 'rotated' : ''}`} 
            />
          </div>

          {showUserMenu && (
            <div className="topbar-user-menu">
              <div className="user-menu-header">
                <div className="user-menu-avatar" style={{ 
                  background: getRoleBadge().gradient,
                  color: '#ffffff'
                }}>
                  {getUserInitials()}
                </div>
                <div className="user-menu-info">
                  <span className="user-menu-name">
                    {user?.full_name || user?.username || 'User'}
                  </span>
                  <span className="user-menu-email">
                    {user?.email || 'user@example.com'}
                  </span>
                  <span className="user-menu-role">
                    <RoleIcon size={12} />
                    {getRoleBadge().label}
                  </span>
                </div>
              </div>

              <div className="user-menu-divider" />

              <button className="user-menu-item" onClick={() => {/* Navigate to profile */}}>
                <UserCircle size={16} />
                <span>{t('profile') || 'My Profile'}</span>
                <span className="menu-shortcut">⌘P</span>
              </button>
              <button className="user-menu-item" onClick={() => {/* Navigate to settings */}}>
                <Settings size={16} />
                <span>{t('settings') || 'Settings'}</span>
                <span className="menu-shortcut">⌘S</span>
              </button>
              <button className="user-menu-item" onClick={() => {/* Navigate to help */}}>
                <HelpCircle size={16} />
                <span>{t('help') || 'Help & Support'}</span>
              </button>

              <div className="user-menu-divider" />

              <button className="user-menu-item logout" onClick={handleLogout}>
                <LogOut size={16} />
                <span>{t('logout') || 'Logout'}</span>
                <span className="menu-shortcut">⌘L</span>
              </button>
            </div>
          )}
        </div>

        {/* Settings Button */}
        <button className="topbar-btn settings-btn" title={t('settings') || 'Settings'} onClick={() => {/* Navigate to settings */}}>
          <Settings size={18} />
          <div className="btn-glow"></div>
        </button>
      </div>
    </header>
  );
};

export default TopBar;