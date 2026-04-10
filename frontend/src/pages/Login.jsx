import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Eye, EyeOff, AlertCircle, Building2, Truck } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
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
            const role = prof?.role || 'hospital';
            navigate(role === 'ambulance' ? '/ambulance' : '/hospital', { replace: true });
        } catch (err) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const demoLogin = (type) => {
        if (type === 'hospital') {
            setEmail('hospital@jdc.demo');
            setPassword('demo1234');
        } else {
            setEmail('ambulance@jdc.demo');
            setPassword('demo1234');
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', position: 'relative', overflow: 'hidden' }}>
            {/* Background glow */}
            <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(230,57,70,0.05) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-10%', right: '5%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(29,111,164,0.06) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

            {/* ── Left panel — Branding ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px', position: 'relative', zIndex: 1 }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 60, textDecoration: 'none', width: 'fit-content' }}>
                    <div className="sidebar-logo-icon" style={{ width: 44, height: 44 }}>
                        <ShieldAlert size={22} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-1)' }}>JDC CrashGuard</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Emergency Response System</div>
                    </div>
                </Link>

                <h1 style={{ fontSize: 'clamp(28px, 3.5vw, 46px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 18, color: 'var(--text-1)', letterSpacing: '-1.5px' }}>
                    Welcome back to<br />
                    <span style={{ color: 'var(--red)' }}>CrashGuard</span>
                </h1>
                <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.75, maxWidth: 420, marginBottom: 48 }}>
                    Sign in to access your emergency dashboard — monitor live crash alerts, manage bed availability, and coordinate ambulance dispatch.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                        { icon: Building2, color: 'var(--blue-light)', title: 'Hospital Staff', desc: 'Manage alerts, beds & dispatch' },
                        { icon: Truck, color: 'var(--amber)', title: 'Ambulance Drivers', desc: 'Accept crashes & navigate' },
                    ].map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                            <div style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: `${r.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <r.icon size={18} color={r.color} />
                            </div>
                            <div>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)' }}>{r.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{r.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, background: 'var(--border)', margin: '40px 0', position: 'relative', zIndex: 1 }} />

            {/* ── Right panel — Login Form ── */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 56px', position: 'relative', zIndex: 1 }}>
                <div style={{ width: '100%', maxWidth: 420, animation: 'fadeInUp 0.4s ease' }}>
                    <div style={{ marginBottom: 32 }}>
                        <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>Sign in</h2>
                        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Enter your credentials to continue</p>
                    </div>

                    {/* Quick demo buttons */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                            Quick Demo Access
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => demoLogin('hospital')} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 12.5 }}>
                                <Building2 size={14} />
                                Hospital Demo
                            </button>
                            <button onClick={() => demoLogin('ambulance')} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 12.5 }}>
                                <Truck size={14} />
                                Ambulance Demo
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Or sign in manually</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>

                    <div className="form-card">
                        {error && (
                            <div className="form-error">
                                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div>
                                <label className="form-label">Email Address</label>
                                <input
                                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="you@hospital.com" required autoComplete="email"
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="form-label">Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        value={password} onChange={e => setPassword(e.target.value)}
                                        placeholder="Enter password" required autoComplete="current-password"
                                        className="input-field"
                                        style={{ paddingRight: 44 }}
                                    />
                                    <button
                                        type="button" onClick={() => setShowPw(p => !p)}
                                        style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0, display: 'flex', alignItems: 'center' }}
                                    >
                                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit" disabled={loading}
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, marginTop: 4 }}
                            >
                                {loading ? <><span style={{ display: 'flex', animation: 'spin 1s linear infinite' }}><ShieldAlert size={16} /></span>Signing in...</> : 'Sign In to Dashboard'}
                            </button>
                        </form>

                        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5, color: 'var(--text-3)' }}>
                            Don't have an account?{' '}
                            <Link to="/signup" style={{ color: 'var(--blue-light)', fontWeight: 700, textDecoration: 'none' }}>
                                Create Account
                            </Link>
                        </div>
                    </div>

                    <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12.5 }}>
                        <Link to="/" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>← Back to Landing Page</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
