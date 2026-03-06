import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const prof = await login(email, password);
            const userRole = prof?.role || 'hospital';
            if (userRole === 'hospital' || userRole === 'admin') {
                navigate('/hospital', { replace: true });
            } else {
                navigate('/ambulance', { replace: true });
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#060b14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
            {/* BG orbs */}
            <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: 480, animation: 'fadeInUp 0.5s ease' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #ef4444, #7c3aed)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, margin: '0 auto 16px', boxShadow: '0 0 30px rgba(239,68,68,0.4)' }}>🛡️</div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>CrashGuard</h1>
                    <p style={{ fontSize: 14, color: '#64748b' }}>Sign in to access the emergency dashboard</p>
                </div>

                {/* Form */}
                <div style={{ background: 'rgba(13,21,38,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32, backdropFilter: 'blur(20px)' }}>
                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#ef4444', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Email */}
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Email Address</label>
                            <input
                                type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="Enter your email" required autoComplete="email"
                                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: 15, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Password</label>
                            <input
                                type="password" value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password" required autoComplete="current-password"
                                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: 15, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '14px',
                            background: 'linear-gradient(135deg, #ef4444, #7c3aed)',
                            color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
                            opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
                            boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
                            marginTop: 4,
                        }}>
                            {loading ? '⏳ Signing In...' : '🔐 Sign In'}
                        </button>
                    </form>

                    {/* Toggle to signup */}
                    <div style={{ textAlign: 'center', marginTop: 20 }}>
                        <span style={{ color: '#64748b', fontSize: 14 }}>
                            Don't have an account?{' '}
                            <Link to="/signup" style={{ color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>
                                Sign Up
                            </Link>
                        </span>
                    </div>
                </div>

                <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#475569' }}>
                    <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>← Back to Landing Page</Link>
                </p>
            </div>
        </div>
    );
}
