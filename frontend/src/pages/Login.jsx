import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('hospital');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { login, signup } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (isSignUp) {
                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }
                if (password.length < 6) {
                    setError('Password must be at least 6 characters');
                    setLoading(false);
                    return;
                }
                const result = await signup(email, password, name, role);
                if (result) {
                    // Auto-confirmed — redirect using the role selected in the form
                    if (role === 'hospital') navigate('/hospital', { replace: true });
                    else navigate('/ambulance', { replace: true });
                } else {
                    setSuccess('Account created! Check your email for a confirmation link, then sign in.');
                    setIsSignUp(false);
                }
            } else {
                const profile = await login(email, password);
                const userRole = profile?.role || 'hospital';
                if (userRole === 'hospital' || userRole === 'admin') navigate('/hospital', { replace: true });
                else navigate('/ambulance', { replace: true });
            }
        } catch (err) {
            setError(err.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const ROLES = [
        { value: 'hospital', label: '🏥 Hospital Staff', color: '#3b82f6', desc: 'Manage beds, receive crash alerts' },
        { value: 'ambulance', label: '🚑 Ambulance Driver', color: '#f59e0b', desc: 'Respond to crashes, dispatch' },
    ];

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
                    <p style={{ fontSize: 14, color: '#64748b' }}>
                        {isSignUp ? 'Create your emergency response account' : 'Sign in to access the emergency dashboard'}
                    </p>
                </div>

                {/* Tab switch */}
                <div style={{ display: 'flex', background: 'rgba(13,21,38,0.8)', borderRadius: 14, padding: 4, marginBottom: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => { setIsSignUp(false); setError(''); setSuccess(''); }} style={{ flex: 1, padding: '11px 16px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.25s', background: !isSignUp ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(124,58,237,0.15))' : 'transparent', color: !isSignUp ? '#f1f5f9' : '#64748b', boxShadow: !isSignUp ? '0 0 12px rgba(59,130,246,0.15)' : 'none' }}>
                        🔐 Sign In
                    </button>
                    <button onClick={() => { setIsSignUp(true); setError(''); setSuccess(''); }} style={{ flex: 1, padding: '11px 16px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.25s', background: isSignUp ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(59,130,246,0.15))' : 'transparent', color: isSignUp ? '#f1f5f9' : '#64748b', boxShadow: isSignUp ? '0 0 12px rgba(16,185,129,0.15)' : 'none' }}>
                        ✨ Sign Up
                    </button>
                </div>

                {/* Form */}
                <div style={{ background: 'rgba(13,21,38,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32, backdropFilter: 'blur(20px)' }}>
                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#ef4444', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            ⚠️ {error}
                        </div>
                    )}
                    {success && (
                        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#10b981', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            ✅ {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Name (signup only) */}
                        {isSignUp && (
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Full Name</label>
                                <input
                                    type="text" value={name} onChange={e => setName(e.target.value)}
                                    placeholder="Enter your full name" required
                                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: 15, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                    onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                        )}

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
                                placeholder={isSignUp ? 'Min 6 characters' : 'Enter your password'} required autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: 15, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                        </div>

                        {/* Confirm Password (signup only) */}
                        {isSignUp && (
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Confirm Password</label>
                                <input
                                    type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your password" required autoComplete="new-password"
                                    style={{ width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9', fontSize: 15, fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                    onFocus={e => e.target.style.borderColor = 'rgba(59,130,246,0.5)'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                                />
                            </div>
                        )}

                        {/* Role selector (signup only) */}
                        {isSignUp && (
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 10 }}>Select Your Role</label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {ROLES.map(r => (
                                        <button
                                            type="button"
                                            key={r.value}
                                            onClick={() => setRole(r.value)}
                                            style={{
                                                flex: 1,
                                                padding: '14px 12px',
                                                background: role === r.value ? `${r.color}18` : 'rgba(255,255,255,0.03)',
                                                border: `2px solid ${role === r.value ? r.color : 'rgba(255,255,255,0.08)'}`,
                                                borderRadius: 12,
                                                cursor: 'pointer',
                                                transition: 'all 0.25s',
                                                textAlign: 'center',
                                            }}
                                        >
                                            <div style={{ fontSize: 24, marginBottom: 6 }}>{r.label.split(' ')[0]}</div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: role === r.value ? r.color : '#94a3b8' }}>{r.label.split(' ').slice(1).join(' ')}</div>
                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{r.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Submit */}
                        <button type="submit" disabled={loading} style={{
                            width: '100%', padding: '14px',
                            background: isSignUp ? 'linear-gradient(135deg, #10b981, #3b82f6)' : 'linear-gradient(135deg, #ef4444, #7c3aed)',
                            color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif',
                            opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
                            boxShadow: isSignUp ? '0 4px 20px rgba(16,185,129,0.3)' : '0 4px 20px rgba(239,68,68,0.3)',
                            marginTop: 4,
                        }}>
                            {loading
                                ? '⏳ Processing...'
                                : isSignUp
                                    ? '✨ Create Account'
                                    : '🔐 Sign In'
                            }
                        </button>
                    </form>

                    {/* Toggle */}
                    <div style={{ textAlign: 'center', marginTop: 20 }}>
                        <span style={{ color: '#64748b', fontSize: 14 }}>
                            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                            <button onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }} style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </button>
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
