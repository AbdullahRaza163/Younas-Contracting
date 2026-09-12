// src/context/ThemeContext.js

import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Check localStorage for saved theme preference
  const getInitialTheme = () => {
    if (typeof window === 'undefined') return 'light';
    try {
      const savedTheme = window.localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    } catch (_) { /* ignore */ }

    // Check system preference
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
    return 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Save theme preference to localStorage
    try {
      window.localStorage.setItem('theme', theme);
    } catch (_) { /* ignore */ }

    // ALWAYS set the attribute — both "light" and "dark"
    // This makes html[data-theme="light"] and html[data-theme="dark"]
    // selectors in every CSS file (globals, Navigation, WorkersManager)
    // match reliably.
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const setThemeExplicit = (next) => {
    setTheme(next === 'dark' ? 'dark' : 'light');
  };

  const value = {
    theme,
    toggleTheme,
    setTheme: setThemeExplicit,
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;