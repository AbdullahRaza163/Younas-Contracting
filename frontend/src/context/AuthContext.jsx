// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import ApiService from '../services/ApiService';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const isMounted = useRef(true);

    useEffect(() => {
        console.log('🔐 AuthProvider mounted');
        return () => {
            isMounted.current = false;
        };
    }, []);

    const fetchUser = async () => {
        console.log('🔐 Fetching user...');
        try {
            const response = await ApiService.getCurrentUser();
            console.log('🔐 User fetched:', response);
            if (isMounted.current) {
                setUser(response.user);
                localStorage.setItem('user', JSON.stringify(response.user));
                setLoading(false); // ← THIS IS IMPORTANT
                console.log('🔐 User set, loading false');
            }
        } catch (error) {
            console.error('❌ Error fetching user:', error);
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    console.log('🔐 Using stored user from localStorage');
                    setUser(JSON.parse(storedUser));
                    setLoading(false); // ← THIS IS IMPORTANT
                } catch (e) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                    if (isMounted.current) {
                        setUser(null);
                        setLoading(false);
                    }
                }
            } else {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                if (isMounted.current) {
                    setUser(null);
                    setLoading(false);
                    console.log('🔐 Error, loading false');
                }
            }
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        console.log('🔐 Token found:', token ? 'Yes' : 'No');
        
        if (token) {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    console.log('🔐 Using stored user from localStorage');
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setLoading(false); // ← SET LOADING TO FALSE IMMEDIATELY
                    // Still fetch fresh user data in background
                    fetchUser();
                } catch (e) {
                    console.error('Error parsing stored user:', e);
                    fetchUser();
                }
            } else {
                fetchUser();
            }
        } else {
            console.log('🔐 No token, setting loading to false');
            localStorage.removeItem('user');
            setLoading(false);
        }
    }, []);

    const login = async (identifier, password) => {
        setError(null);
        try {
            console.log('🔐 Attempting login with:', identifier);
            const response = await ApiService.login(identifier, password);
            console.log('🔐 Login response:', response);
            
            const accessToken = response.accessToken || response.access_token;
            const refreshToken = response.refreshToken || response.refresh_token;
            const userData = response.user;
            
            console.log('🔐 Access token present:', accessToken ? 'Yes' : 'No');
            
            if (accessToken) {
                localStorage.setItem('accessToken', accessToken);
                console.log('✅ Access token saved to localStorage');
            } else {
                console.error('❌ No access token in response!');
                throw new Error('No access token received');
            }
            
            if (refreshToken) {
                localStorage.setItem('refreshToken', refreshToken);
                console.log('✅ Refresh token saved to localStorage');
            }
            
            if (userData) {
                localStorage.setItem('user', JSON.stringify(userData));
                console.log('✅ User saved to localStorage');
            }
            
            console.log('🔐 Verification - accessToken in localStorage:', 
                localStorage.getItem('accessToken') ? 'Yes' : 'No'
            );
            
            setUser(userData);
            setLoading(false); // ← SET LOADING TO FALSE
            console.log('🔐 Login successful, user set, loading false');
            return { success: true, user: userData };
        } catch (error) {
            console.error('❌ Login error:', error);
            const message = error.message || 'Login failed';
            setError(message);
            setLoading(false); // ← SET LOADING TO FALSE ON ERROR TOO
            return { success: false, error: message };
        }
    };

    const register = async (userData) => {
        setError(null);
        try {
            console.log('🔐 Attempting registration...');
            const response = await ApiService.register(userData);
            console.log('🔐 Register response:', response);
            
            const accessToken = response.accessToken || response.access_token;
            const refreshToken = response.refreshToken || response.refresh_token;
            const user = response.user;
            
            if (accessToken) {
                localStorage.setItem('accessToken', accessToken);
                console.log('✅ Access token saved from register');
            }
            if (refreshToken) {
                localStorage.setItem('refreshToken', refreshToken);
                console.log('✅ Refresh token saved from register');
            }
            if (user) {
                localStorage.setItem('user', JSON.stringify(user));
                console.log('✅ User saved from register');
            }
            
            setUser(user);
            setLoading(false);
            console.log('🔐 Register successful, user set');
            return { success: true, user };
        } catch (error) {
            console.error('❌ Register error:', error);
            const message = error.message || 'Registration failed';
            setError(message);
            setLoading(false);
            return { success: false, error: message };
        }
    };

    const logout = async () => {
        console.log('🔐 Logging out...');
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            try {
                await ApiService.logout(refreshToken);
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
        setLoading(false);
        console.log('🔐 Logout complete');
    };

    const value = {
        user,
        loading,
        error,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isManager: user?.role === 'admin' || user?.role === 'manager'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};