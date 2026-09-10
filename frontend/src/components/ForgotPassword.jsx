// src/components/auth/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, ArrowLeft, Send, AlertCircle, CheckCircle } from 'lucide-react';
import './ForgotPassword.css';

const ForgotPassword = () => {
    const { forgotPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email) {
            setError('Please enter your email');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess(false);

        const result = await forgotPassword(email);
        
        if (result.success) {
            setSuccess(true);
        } else {
            setError(result.error);
        }
        
        setLoading(false);
    };

    return (
        <div className="forgot-password-container">
            <div className="forgot-password-card">
                <Link to="/login" className="back-link">
                    <ArrowLeft size={18} />
                    Back to Login
                </Link>

                <div className="forgot-password-header">
                    <span className="header-icon">🔑</span>
                    <h2>Forgot Password</h2>
                    <p>Enter your email and we'll send you a reset link</p>
                </div>

                {error && (
                    <div className="forgot-error">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="forgot-success">
                        <CheckCircle size={18} />
                        <div>
                            <strong>Email sent!</strong>
                            <p>Check your inbox for password reset instructions</p>
                        </div>
                    </div>
                )}

                {!success && (
                    <form onSubmit={handleSubmit} className="forgot-form">
                        <div className="form-group">
                            <label htmlFor="email">
                                <Mail size={16} />
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your registered email"
                                disabled={loading}
                                required
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="forgot-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner"></span>
                            ) : (
                                <>
                                    <Send size={18} />
                                    Send Reset Link
                                </>
                            )}
                        </button>
                    </form>
                )}

                {success && (
                    <button 
                        onClick={() => window.location.href = '/login'} 
                        className="back-to-login"
                    >
                        Return to Login
                    </button>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;