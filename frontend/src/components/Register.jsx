// src/components/auth/Register.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    User, Mail, Lock, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle,
    Moon, Sun, Building2, Globe, Shield, Sparkles, ArrowRight,
    Loader2, Fingerprint, Clock, HardHat, Zap
} from 'lucide-react';
import './Register.css';

import logoImg from '../assets/logo.png';

const Register = () => {
    const navigate = useNavigate();
    const { register, error: authError } = useAuth();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        fullName: ''
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    const [typedText, setTypedText] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const containerRef = useRef(null);

    const fullText = "Join Our Growing Team";

    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    useEffect(() => {
        let timeout;
        if (isTyping && typedText.length < fullText.length) {
            timeout = setTimeout(() => {
                setTypedText(fullText.slice(0, typedText.length + 1));
            }, 100);
        } else if (typedText.length === fullText.length) {
            setIsTyping(false);
        }
        return () => clearTimeout(timeout);
    }, [typedText, isTyping]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setCursorPosition({
                    x: ((e.clientX - rect.left) / rect.width) * 100,
                    y: ((e.clientY - rect.top) / rect.height) * 100,
                });
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const toggleTheme = () => setIsDark(prev => !prev);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'password') {
            let strength = 0;
            if (value.length >= 6) strength++;
            if (/[A-Z]/.test(value)) strength++;
            if (/[a-z]/.test(value)) strength++;
            if (/\d/.test(value)) strength++;
            setPasswordStrength(strength);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword || !formData.fullName) {
            setError('Please fill in all fields');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        setError('');

        // FIX: Use 'full_name' instead of 'fullName' (matches backend)
        const result = await register({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            full_name: formData.fullName  // ← Changed from fullName to full_name
        });

        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }

        setLoading(false);
    };

    const getPasswordStrengthLabel = () => {
        if (passwordStrength <= 1) return 'Weak';
        if (passwordStrength === 2) return 'Fair';
        if (passwordStrength === 3) return 'Good';
        if (passwordStrength >= 4) return 'Strong';
        return '';
    };

    const getPasswordStrengthColor = () => {
        if (passwordStrength <= 1) return '#ef4444';
        if (passwordStrength === 2) return '#f59e0b';
        if (passwordStrength === 3) return '#3b82f6';
        if (passwordStrength >= 4) return '#22c55e';
        return '#8b949e';
    };

    const getPasswordStrengthWidth = () => {
        if (passwordStrength === 0) return '0%';
        if (passwordStrength === 1) return '25%';
        if (passwordStrength === 2) return '50%';
        if (passwordStrength === 3) return '75%';
        if (passwordStrength >= 4) return '100%';
        return '0%';
    };

    return (
        <div
            className={`register-page ${mounted ? 'is-mounted' : ''}`}
            ref={containerRef}
            style={{ '--mouse-x': cursorPosition.x + '%', '--mouse-y': cursorPosition.y + '%' }}
        >
            {/* Theme Toggle */}
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
                <div className="theme-toggle-inner">
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </div>
                <span className="theme-toggle-ring"></span>
            </button>

            {/* Background */}
            <div className="register-bg">
                <div className="bg-gradient"></div>
                <div className="bg-mesh">
                    <div className="mesh-orb orb-1"></div>
                    <div className="mesh-orb orb-2"></div>
                    <div className="mesh-orb orb-3"></div>
                    <div className="mesh-orb orb-4"></div>
                </div>

                <div className="cursor-glow"></div>

                {/* Blueprint SVG */}
                <svg className="blueprint-draw" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMax slice">
                    <defs>
                        <linearGradient id="blueprintGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--blueprint-line)" stopOpacity="0.3" />
                            <stop offset="50%" stopColor="var(--blueprint-line)" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="var(--blueprint-line)" stopOpacity="0.3" />
                        </linearGradient>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    <g className="bp-skyline">
                        <rect x="40" y="550" width="90" height="310" rx="2" />
                        <rect x="140" y="460" width="70" height="400" rx="2" />
                        <rect x="220" y="600" width="120" height="260" rx="2" />
                        <rect x="350" y="400" width="85" height="460" rx="2" />
                        <rect x="445" y="520" width="100" height="340" rx="2" />
                        <rect x="555" y="580" width="75" height="280" rx="2" />
                        <rect x="640" y="430" width="90" height="430" rx="2" />
                        <rect x="740" y="560" width="100" height="300" rx="2" />
                        <rect x="850" y="480" width="80" height="380" rx="2" />

                        {[[60, 580, 5], [150, 490, 7], [240, 630, 4], [365, 430, 9], [465, 550, 6], [570, 610, 5], [655, 460, 8], [755, 590, 5], [865, 510, 6]].map(([x, y, count], idx) => (
                            Array.from({ length: count }).map((_, i) => (
                                <line key={`w${idx}-${i}`} x1={x} x2={x + (idx === 3 ? 85 : idx === 4 ? 100 : idx === 6 ? 90 : idx === 7 ? 100 : 80)} y1={y + i * 40} y2={y + i * 40} strokeDasharray="8 6" />
                            ))
                        ))}
                    </g>

                    <g className="bp-crane">
                        <line x1="950" y1="870" x2="950" y2="180" strokeWidth="3" />
                        <line x1="950" y1="200" x2="1100" y2="200" strokeWidth="3" />
                        <line x1="950" y1="200" x2="890" y2="280" />
                        <line x1="950" y1="230" x2="1020" y2="200" />
                        <line x1="920" y1="870" x2="980" y2="870" strokeWidth="3" />
                        <line x1="950" y1="380" x2="920" y2="870" />
                        <line x1="950" y1="380" x2="980" y2="870" />
                        <line className="bp-cable" x1="1020" y1="200" x2="1020" y2="300" strokeWidth="2" />
                        <polygon className="bp-hook" points="1015,300 1025,300 1022,318 1018,318" />
                        <circle cx="1020" cy="200" r="6" fill="none" stroke="var(--blueprint-line)" strokeWidth="2" />
                        <rect x="930" y="170" width="40" height="30" rx="3" fill="none" stroke="var(--blueprint-line)" strokeWidth="2" />
                        <line x1="940" y1="180" x2="940" y2="190" strokeWidth="2" />
                        <line x1="960" y1="180" x2="960" y2="190" strokeWidth="2" />
                    </g>

                    <g className="bp-construction">
                        <line x1="50" y1="860" x2="1100" y2="860" strokeDasharray="4 8" strokeWidth="1.5" />
                        <circle cx="70" cy="860" r="4" fill="var(--blueprint-line)" />
                        <circle cx="1070" cy="860" r="4" fill="var(--blueprint-line)" />
                    </g>

                    <g className="bp-dims">
                        <text x="560" y="885" className="bp-dim-label" filter="url(#glow)">
                            ● PROJECT: HYC TOWER - PHASE 3 ●
                        </text>
                        <text x="560" y="40" className="bp-dim-label title-label" filter="url(#glow)">
                            HAJI YOUNAS CONTRACTING CO.
                        </text>
                    </g>

                    <g className="bp-icons">
                        <circle cx="1120" cy="840" r="25" fill="none" stroke="var(--blueprint-line)" strokeWidth="1.5" strokeDasharray="3 3" />
                        <text x="1120" y="845" className="bp-icon-label">🏗️</text>
                    </g>
                </svg>

                <div className="bg-particles">
                    {[...Array(30)].map((_, i) => (
                        <div key={i} className="particle" style={{
                            '--delay': `${i * 0.2}s`,
                            '--duration': `${4 + Math.random() * 6}s`,
                            '--size': `${1.5 + Math.random() * 5}px`,
                            '--x': `${Math.random() * 100}%`,
                            '--y': `${Math.random() * 100}%`,
                            '--tx': `${(Math.random() - 0.5) * 200}px`,
                            '--ty': `${(Math.random() - 0.5) * 200}px`,
                            animationDelay: `${i * 0.15}s`,
                        }}></div>
                    ))}
                </div>
            </div>

            {/* LEFT — Brand Section */}
            <div className="register-visual">
                <div className="brand-section anim anim-1">
                    <div className="brand-logo-wrapper">
                        <img src={logoImg} alt="Haji Younas Contracting Co. Logo" className="brand-logo-img" />
                        <div className="brand-logo-shimmer"></div>
                    </div>
                    <div className="brand-badge">
                        <Sparkles size={12} />
                        <span>Enterprise</span>
                    </div>
                </div>

                <div className="visual-copy">
                    <div className="copy-badge anim anim-2">
                        <Zap size={12} />
                        <span>Next-Gen ERP Platform</span>
                        <span className="badge-dot"></span>
                        <span className="badge-live">v3.0</span>
                    </div>

                    <div className="hero-content">
                        <h1>
                            <span className="line anim anim-3">
                                <span className="line-prefix">🚀</span>
                                Start Your
                            </span>
                            <span className="line anim anim-4">
                                <span className="line-gradient">Journey</span>
                            </span>
                            <span className="line anim anim-5">
                                <span className="line-suffix">With Us</span>
                            </span>
                        </h1>

                        <div className="typed-container anim anim-6">
                            <span className="typed-cursor">▌</span>
                            <span className="typed-text">{typedText}</span>
                            <span className="typed-cursor blinking">|</span>
                        </div>
                    </div>

                    <div className="feature-badges anim anim-7">
                        <span className="feature-item">
                            <span className="feature-icon"><Building2 size={14} /></span>
                            Project Tracking
                            <span className="feature-check"><CheckCircle size={12} /></span>
                        </span>
                        <span className="feature-item">
                            <span className="feature-icon"><Globe size={14} /></span>
                            Multi-Site
                            <span className="feature-check"><CheckCircle size={12} /></span>
                        </span>
                        <span className="feature-item">
                            <span className="feature-icon"><Shield size={14} /></span>
                            Enterprise Grade
                            <span className="feature-check"><CheckCircle size={12} /></span>
                        </span>
                        <span className="feature-item">
                            <span className="feature-icon"><HardHat size={14} /></span>
                            Safety First
                            <span className="feature-check"><CheckCircle size={12} /></span>
                        </span>
                    </div>

                    <div className="trust-badges anim anim-8">
                        <span className="trust-item">
                            <Clock size={14} />
                            40+ Years Excellence
                        </span>
                        <span className="trust-item">
                            <Building2 size={14} />
                            500+ Projects
                        </span>
                        <span className="trust-item">
                            <Globe size={14} />
                            15+ Countries
                        </span>
                    </div>
                </div>
            </div>

            {/* RIGHT — Register Card */}
            <div className="register-panel">
                <div className="register-card anim anim-5">
                    <div className="card-header">
                        <div className="card-header-top">
                            <div className="card-status">
                                <span className="status-dot"></span>
                                <span className="status-text">Secure Registration</span>
                            </div>
                            <div className="card-version">
                                <Fingerprint size={14} />
                            </div>
                        </div>
                        <h2 className="register-heading">Create Account</h2>
                        <p className="card-subtitle">Join our construction management platform</p>
                    </div>

                    {(error || authError) && (
                        <div className="register-error">
                            <AlertCircle size={16} />
                            <span>{error || authError}</span>
                            <button className="error-close" onClick={() => setError('')}>×</button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="register-form">
                        <div className="field">
                            <label htmlFor="fullName">
                                <span>Full Name</span>
                                <span className="label-required">*</span>
                            </label>
                            <div className="input-shell">
                                <User size={16} className="field-icon" />
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                    disabled={loading}
                                    className={formData.fullName ? 'has-value' : ''}
                                />
                                <div className="input-highlight"></div>
                            </div>
                        </div>

                        <div className="field">
                            <label htmlFor="username">
                                <span>Username</span>
                                <span className="label-required">*</span>
                            </label>
                            <div className="input-shell">
                                <User size={16} className="field-icon" />
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Choose a username"
                                    disabled={loading}
                                    className={formData.username ? 'has-value' : ''}
                                />
                                <div className="input-highlight"></div>
                            </div>
                        </div>

                        <div className="field">
                            <label htmlFor="email">
                                <span>Email Address</span>
                                <span className="label-required">*</span>
                            </label>
                            <div className="input-shell">
                                <Mail size={16} className="field-icon" />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter your email"
                                    disabled={loading}
                                    className={formData.email ? 'has-value' : ''}
                                />
                                <div className="input-highlight"></div>
                            </div>
                        </div>

                        <div className="field">
                            <label htmlFor="password">
                                <span>Password</span>
                                <span className="label-required">*</span>
                            </label>
                            <div className="input-shell">
                                <Lock size={16} className="field-icon" />
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Create a password"
                                    disabled={loading}
                                    className={formData.password ? 'has-value' : ''}
                                />
                                <button
                                    type="button"
                                    className="visibility-toggle"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-pressed={showPassword}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    <span className="vis-label">{showPassword ? 'Hide' : 'Show'}</span>
                                </button>
                                <div className="input-highlight"></div>
                            </div>
                            {formData.password && (
                                <div className="password-strength">
                                    <div className="strength-bar">
                                        <div
                                            className="strength-fill"
                                            style={{
                                                width: getPasswordStrengthWidth(),
                                                background: getPasswordStrengthColor()
                                            }}
                                        />
                                    </div>
                                    <span style={{ color: getPasswordStrengthColor() }}>
                                        {getPasswordStrengthLabel()}
                                    </span>
                                </div>
                            )}
                            <div className="password-hint">
                                <span>🔒 6+ characters with mix</span>
                            </div>
                        </div>

                        <div className="field">
                            <label htmlFor="confirmPassword">
                                <span>Confirm Password</span>
                                <span className="label-required">*</span>
                            </label>
                            <div className="input-shell">
                                <Lock size={16} className="field-icon" />
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm your password"
                                    disabled={loading}
                                    className={formData.confirmPassword ? 'has-value' : ''}
                                />
                                <button
                                    type="button"
                                    className="visibility-toggle"
                                    onClick={() => setShowConfirmPassword((v) => !v)}
                                    aria-pressed={showConfirmPassword}
                                >
                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    <span className="vis-label">{showConfirmPassword ? 'Hide' : 'Show'}</span>
                                </button>
                                <div className="input-highlight"></div>
                            </div>
                            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                <small className="password-error">Passwords do not match</small>
                            )}
                            {formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 6 && (
                                <small className="password-success">
                                    <CheckCircle size={14} /> Passwords match
                                </small>
                            )}
                        </div>

                        <button type="submit" className="access-btn" disabled={loading}>
                            {loading ? (
                                <span className="btn-loading">
                                    <Loader2 size={20} className="spinning" />
                                    <span>Creating Account...</span>
                                </span>
                            ) : (
                                <span className="btn-content">
                                    <span>Create Account</span>
                                    <ArrowRight size={18} className="btn-icon" />
                                </span>
                            )}
                        </button>

                        <div className="register-links">
                            <span className="register-text">Already have an account?</span>
                            <Link to="/login" className="link-with-icon">
                                <span>Sign In</span>
                            </Link>
                        </div>
                    </form>

                    <div className="divider">
                        <span>Or continue with</span>
                    </div>

                    <div className="sso-row">
                        <button type="button" className="sso-btn">
                            <svg width="18" height="18" viewBox="0 0 48 48">
                                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                            </svg>
                            Google
                        </button>
                        <button type="button" className="sso-btn">
                            <Fingerprint size={15} />
                            SSO
                        </button>
                    </div>

                    <div className="developer-footer">
                        <p>Powered by <strong>OmniCore Developers</strong></p>
                        <div className="footer-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;