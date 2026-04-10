import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Eye, EyeOff, AlertCircle, CheckCircle2, Building2, Truck, Hash, Loader2 } from 'lucide-react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [role, setRole] = useState('hospital');
    const [hospitalCode, setHospitalCode] = useState('');
    const [codeStatus, setCodeStatus] = useState(null); // null | 'checking' | {valid, hospitalName, hospitalId}
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { signup } = useAuth();
    const navigate = useNavigate();
    const codeTimer = useRef(null);

    // Validate hospital code with debounce
    useEffect(() => {
        if (role !== 'hospital' || !hospitalCode || hospitalCode.length < 4) {
            setCodeStatus(null);
            return;
        }
        setCodeStatus('checking');
        clearTimeout(codeTimer.current);
        codeTimer.current = setTimeout(async () => {
            try {
                const res = await fetch(`${BACKEND}/api/auth/hospital-code/${encodeURIComponent(hospitalCode.toUpperCase().trim())}`);
                const data = await res.json();
                if (data.success) {
                    setCodeStatus({ valid: true, hospitalName: data.hospitalName, hospitalId: data.hospitalId });
                } else {
                    setCodeStatus({ valid: false });
                }
            } catch {
                setCodeStatus({ valid: false });
            }
        }, 600);
        return () => clearTimeout(codeTimer.current);
    }, [hospitalCode, role]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setSuccess('');

        if (password !== confirmPassword) return setError('Passwords do not match');
        if (password.length < 6) return setError('Password must be at least 6 characters');
        if (role === 'hospital' && (!codeStatus || codeStatus === 'checking' || !codeStatus.valid)) {
            return setError('Please enter a valid hospital code before signing up');
        }

        setLoading(true);
        try {
            const hospitalId = role === 'hospital' ? codeStatus?.hospitalId : null;
            const result = await signup(email, password, name, role, hospitalId);
            if (result) {
                navigate(result.role === 'ambulance' ? '/ambulance' : '/hospital', { replace: true });
            } else {
                setSuccess('Account created! Check your email for a confirmation link.');
            }
        } catch (err) {
            setError(err.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const ROLES = [
        { value: 'hospital', label: 'Hospital Staff', icon: Building2, color: 'var(--blue-light)', desc: 'Manage alerts, beds & ambulances' },
        { value: 'ambulance', label: 'Ambulance Driver', icon: Truck, color: 'var(--amber)', desc: 'Respond to crash dispatch' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', overflow: 'hidden' }}>
            {/* BG glows */}
            <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(44,182,125,0.05) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(29,111,164,0.06) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: 500, animation: 'fadeInUp 0.4s ease', position: 'relative', zIndex: 1 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 20 }}>
                        <div className="sidebar-logo-icon" style={{ width: 44, height: 44 }}>
                            <ShieldAlert size={22} color="#fff" />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-1)' }}>JDC CrashGuard</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Emergency Response</div>
                        </div>
                    </Link>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6 }}>Create Account</h1>
                    <p style={{ fontSize: 13.5, color: 'var(--text-3)' }}>Join the emergency response network</p>
                </div>

                <div className="form-card">
                    {error && (
                        <div className="form-error">
                            <AlertCircle size={16} style={{ flexShrink: 0 }} />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="form-success">
                            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Full Name */}
                        <div>
                            <label className="form-label">Full Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Raj Kumar" required className="input-field" />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="form-label">Email Address</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@hospital.com" required autoComplete="email" className="input-field" />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPw ? 'text' : 'password'} value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Min. 6 characters" required autoComplete="new-password"
                                    className="input-field" style={{ paddingRight: 44 }}
                                />
                                <button type="button" onClick={() => setShowPw(p => !p)}
                                    style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="form-label">Confirm Password</label>
                            <input
                                type="password" value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Repeat password" required autoComplete="new-password"
                                className="input-field"
                            />
                        </div>

                        {/* Role Selector */}
                        <div>
                            <label className="form-label">Role</label>
                            <div style={{ display: 'flex', gap: 10 }}>
                                {ROLES.map(r => (
                                    <button
                                        key={r.value} type="button" onClick={() => setRole(r.value)}
                                        className={`role-btn ${role === r.value ? `active-${r.value}` : ''}`}
                                    >
                                        <div className="role-icon" style={{ background: role === r.value ? `${r.color}18` : 'rgba(255,255,255,0.04)' }}>
                                            <r.icon size={18} color={role === r.value ? r.color : 'var(--text-3)'} />
                                        </div>
                                        <div className="role-title" style={{ color: role === r.value ? r.color : 'var(--text-2)' }}>{r.label}</div>
                                        <div className="role-desc">{r.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Hospital Code (only for hospital role) */}
                        {role === 'hospital' && (
                            <div>
                                <label className="form-label">
                                    <Hash size={12} style={{ display: 'inline', marginRight: 4 }} />
                                    Hospital Code
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text" value={hospitalCode}
                                        onChange={e => setHospitalCode(e.target.value.toUpperCase())}
                                        placeholder="HOSP-001" maxLength={12}
                                        className={`input-field ${codeStatus && codeStatus !== 'checking' ? (codeStatus.valid ? 'hosp-code-valid' : 'hosp-code-invalid') : ''}`}
                                        style={{ fontFamily: 'JetBrains Mono, monospace', paddingRight: 40 }}
                                    />
                                    <div style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                                        {codeStatus === 'checking' && <Loader2 size={15} color="var(--text-3)" style={{ animation: 'spin 1s linear infinite' }} />}
                                        {codeStatus && codeStatus !== 'checking' && codeStatus.valid && <CheckCircle2 size={15} color="var(--green)" />}
                                        {codeStatus && codeStatus !== 'checking' && !codeStatus.valid && <AlertCircle size={15} color="var(--red)" />}
                                    </div>
                                </div>
                                {codeStatus && codeStatus !== 'checking' && (
                                    <span className={`hosp-code-preview ${codeStatus.valid ? 'valid' : 'invalid'}`}>
                                        {codeStatus.valid ? `✓ ${codeStatus.hospitalName}` : '✗ Invalid code — contact your hospital admin'}
                                    </span>
                                )}
                                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 6 }}>
                                    Get this code from your hospital administrator (e.g. HOSP-001)
                                </div>
                            </div>
                        )}

                        <button
                            type="submit" disabled={loading}
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, marginTop: 4 }}
                        >
                            {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Creating Account...</> : 'Create Account'}
                        </button>
                    </form>

                    <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5, color: 'var(--text-3)' }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: 'var(--blue-light)', fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
                    </div>
                </div>

                <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12.5 }}>
                    <Link to="/" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>← Back to Landing Page</Link>
                </p>
            </div>
        </div>
    );
}
