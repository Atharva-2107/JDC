import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    ShieldAlert, Zap, Map, Building2, Truck, BarChart3, Bell,
    ChevronRight, AlertTriangle, CheckCircle2, X, Loader2, Navigation,
    PhoneCall, MapPin,
} from 'lucide-react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const FEATURES = [
    {
        icon: Zap, color: 'var(--red)', bg: 'var(--red-soft)',
        title: 'Real-Time Crash Detection',
        desc: 'ESP32 accelerometers detect collisions within milliseconds and immediately transmit GPS coordinates via Wi-Fi to the CrashGuard server.',
    },
    {
        icon: Map, color: 'var(--blue-light)', bg: 'var(--blue-soft)',
        title: 'Live Location Mapping',
        desc: 'Precise crash coordinates appear on interactive maps, enabling fastest route calculation for ambulances and hospital prep.',
    },
    {
        icon: Building2, color: 'var(--green)', bg: 'var(--green-soft)',
        title: 'Per-Hospital Dashboards',
        desc: 'Each hospital logs in with their unique code and sees only their assigned incidents, bed status, and ambulance fleet.',
    },
    {
        icon: Truck, color: 'var(--amber)', bg: 'var(--amber-soft)',
        title: 'Smart Ambulance Dispatch',
        desc: 'Automatically identifies and dispatches the nearest available unit with turn-by-turn navigation to the crash site.',
    },
    {
        icon: BarChart3, color: 'var(--purple)', bg: 'var(--purple-soft)',
        title: 'Analytics & Reporting',
        desc: 'Comprehensive insights on response times, crash patterns, and resource utilization to improve emergency planning.',
    },
    {
        icon: Bell, color: 'var(--cyan)', bg: 'rgba(14,165,233,0.1)',
        title: 'Multi-Channel Alerts',
        desc: 'Simultaneous alerts via WebSocket realtime, SMS, WhatsApp, and push notifications to all stakeholders.',
    },
];

const HOW_IT_WORKS = [
    { step: 1, title: 'Collision Detected', desc: 'ESP32 accelerometer detects sudden deceleration consistent with a crash event — or SOS is manually triggered.' },
    { step: 2, title: 'GPS Transmitted', desc: 'Real GPS coordinates are sent over Wi-Fi to the CrashGuard server and stored in the database.' },
    { step: 3, title: 'All Dashboards Alert', desc: 'Every hospital dashboard receives an instant real-time push notification with the crash location and severity.' },
    { step: 4, title: 'Ambulance Dispatched', desc: 'Nearest available ambulance is dispatched while the hospital prepares the trauma team and ER beds.' },
];

const STATS = [
    { value: '<30s', label: 'Alert Time', sub: 'From crash to notification' },
    { value: '98.7%', label: 'Accuracy', sub: 'Detection precision' },
    { value: '4.2 min', label: 'Faster Response', sub: 'vs. manual dispatch' },
    { value: '24/7', label: 'Uptime', sub: 'Always monitoring' },
];

// ── SOS Modal ────────────────────────────────────────────────
function SOSModal({ onClose }) {
    const [phase, setPhase] = useState('confirm'); // confirm | locating | sending | success | error
    const [coords, setCoords] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSOS = useCallback(async () => {
        setPhase('locating');

        let lat, lng;
        try {
            const pos = await new Promise((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true, timeout: 12000, maximumAge: 0,
                })
            );
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
            setCoords({ lat, lng });
        } catch (err) {
            setErrorMsg('Could not get your location. Please enable GPS/location access and try again.');
            setPhase('error');
            return;
        }

        setPhase('sending');

        try {
            const res = await fetch(`${BACKEND}/api/crash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lat,
                    lng,
                    severity: 'high',
                    device_id: 'SOS-WEB',
                    location: `SOS Alert — ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`,
                    victims: 1,
                    notes: `Manual SOS triggered from landing page at ${new Date().toLocaleString('en-IN')}`,
                    is_sos: true,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message || 'Server error');
            setPhase('success');
        } catch (err) {
            setErrorMsg(err.message || 'Failed to send SOS. Please call 108 directly.');
            setPhase('error');
        }
    }, []);

    return (
        <div className="sos-modal-overlay" onClick={phase === 'success' || phase === 'error' ? onClose : undefined}>
            <div className="sos-modal-box" onClick={e => e.stopPropagation()}>
                {phase === 'confirm' && (
                    <>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--red-soft)', border: '2px solid var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <AlertTriangle size={34} color="var(--red)" />
                        </div>
                        <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-1)', marginBottom: 12 }}>Send SOS Alert?</h2>
                        <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
                            This will send a <strong style={{ color: 'var(--red)' }}>real emergency alert</strong> to all hospital dashboards with your current GPS location.
                        </p>
                        <p style={{ color: 'var(--text-3)', fontSize: 13, lineHeight: 1.6, marginBottom: 32 }}>
                            Your browser will request location access. Please allow it. Use this only in a real emergency.
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>
                                Cancel
                            </button>
                            <button onClick={handleSOS} className="btn-sos" style={{ flex: 2, justifyContent: 'center', animation: 'none', borderRadius: 'var(--r-md)', fontSize: 15, padding: '12px 20px' }}>
                                <PhoneCall size={18} />
                                Confirm SOS
                            </button>
                        </div>
                    </>
                )}

                {phase === 'locating' && (
                    <>
                        <div style={{ margin: '0 auto 24px', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ position: 'relative', width: 72, height: 72 }}>
                                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--blue-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Navigation size={30} color="var(--blue-light)" />
                                </div>
                            </div>
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', marginBottom: 10 }}>Getting Your Location</h2>
                        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Allow location access in your browser popup...</p>
                        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                            <Loader2 size={28} color="var(--blue-light)" style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                    </>
                )}

                {phase === 'sending' && (
                    <>
                        <div style={{ margin: '0 auto 24px', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--red-soft)', border: '2px solid rgba(230,57,70,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ShieldAlert size={34} color="var(--red)" />
                            </div>
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', marginBottom: 10 }}>Sending SOS Alert</h2>
                        {coords && (
                            <p style={{ color: 'var(--text-2)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', marginBottom: 16 }}>
                                <MapPin size={13} style={{ display: 'inline', marginRight: 4 }} />
                                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                            </p>
                        )}
                        <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Alerting all hospital dashboards in real-time...</p>
                        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                            <Loader2 size={28} color="var(--red)" style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                    </>
                )}

                {phase === 'success' && (
                    <>
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--green-soft)', border: '2px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <CheckCircle2 size={40} color="var(--green)" />
                        </div>
                        <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--green)', marginBottom: 12 }}>SOS Alert Sent!</h2>
                        <p style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
                            Your emergency alert has been broadcast to all hospital dashboards with your GPS location.
                        </p>
                        {coords && (
                            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 24, textAlign: 'left' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Your Location</div>
                                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--blue-light)' }}>
                                    {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                                </div>
                                <a href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, display: 'block' }}>
                                    View on Google Maps →
                                </a>
                            </div>
                        )}
                        <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 28 }}>If this is a real emergency, also call <strong style={{ color: 'var(--red)' }}>108</strong> (ambulance helpline).</p>
                        <button onClick={onClose} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>Close</button>
                    </>
                )}

                {phase === 'error' && (
                    <>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--red-soft)', border: '2px solid rgba(230,57,70,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <X size={34} color="var(--red)" />
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--red)', marginBottom: 12 }}>SOS Failed</h2>
                        <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{errorMsg}</p>
                        <p style={{ color: 'var(--text-1)', fontSize: 16, fontWeight: 700, marginBottom: 28 }}>
                            Emergency: Call <span style={{ color: 'var(--red)', fontSize: 20 }}>108</span> directly
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => { setPhase('confirm'); setErrorMsg(''); }} className="btn btn-blue" style={{ flex: 1, justifyContent: 'center' }}>Try Again</button>
                            <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Close</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ── Landing Page ─────────────────────────────────────────────
export default function Landing() {
    const [scrolled, setScrolled] = useState(false);
    const [showSOS, setShowSOS] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text-1)' }}>
            {/* Subtle background gradient grid */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-20%', left: '-15%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(230,57,70,0.05) 0%, transparent 65%)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(29,111,164,0.06) 0%, transparent 65%)', borderRadius: '50%' }} />
            </div>

            {/* ── NAVBAR ── */}
            <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="sidebar-logo-icon" style={{ width: 36, height: 36 }}>
                        <ShieldAlert size={18} color="#fff" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-1)', lineHeight: 1.1 }}>JDC CrashGuard</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Emergency Response System</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <a href="#features" className="landing-nav-link">Features</a>
                    <a href="#how" className="landing-nav-link">How It Works</a>
                    <button
                        onClick={() => setShowSOS(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '8px 18px', background: 'var(--red)', color: '#fff',
                            border: 'none', borderRadius: 'var(--r-md)', fontWeight: 700,
                            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                            marginLeft: 8, marginRight: 4,
                            boxShadow: '0 2px 12px var(--red-glow)',
                            transition: 'all 0.15s',
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'none'}
                    >
                        <AlertTriangle size={14} />
                        SOS
                    </button>
                    <Link to="/login" style={{
                        padding: '8px 20px', background: 'var(--bg-card)', color: 'var(--text-1)',
                        borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
                        fontWeight: 600, fontSize: 13, textDecoration: 'none',
                        transition: 'all 0.15s',
                    }}
                        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
                        onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                        Sign In
                    </Link>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 80px', position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: 820 }}>
                    <div className="live-chip" style={{ marginBottom: 32 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', display: 'inline-block', animation: 'blink 1.4s ease infinite' }} />
                        System Active — Monitoring 24/7
                    </div>

                    <h1 style={{ fontSize: 'clamp(40px, 7vw, 76px)', fontWeight: 900, lineHeight: 1.06, marginBottom: 24, letterSpacing: '-2.5px', color: 'var(--text-1)' }}>
                        Emergency Response,
                        <br />
                        <span style={{
                            background: 'linear-gradient(90deg, var(--red), var(--blue-light))',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            backgroundSize: '200% 200%', animation: 'gradient-x 4s ease infinite',
                        }}>
                            Automated &amp; Instant
                        </span>
                    </h1>

                    <p style={{ fontSize: 18, color: 'var(--text-2)', lineHeight: 1.75, marginBottom: 48, maxWidth: 580, margin: '0 auto 48px' }}>
                        JDC CrashGuard connects vehicle crash sensors, hospital dashboards, and ambulance dispatch in one real-time emergency response ecosystem.
                    </p>

                    {/* CTA Buttons */}
                    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* SOS Button */}
                        <button
                            onClick={() => setShowSOS(true)}
                            className="btn-sos"
                        >
                            <AlertTriangle size={20} />
                            SOS Emergency
                        </button>

                        <Link to="/login" className="btn btn-blue btn-xl" style={{ textDecoration: 'none' }}>
                            Hospital Dashboard
                            <ChevronRight size={18} />
                        </Link>

                        <a href="#how" className="btn btn-ghost btn-xl">
                            How It Works
                        </a>
                    </div>

                    {/* Trust line */}
                    <div style={{ marginTop: 40, display: 'flex', gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {['ESP32 Hardware', 'Supabase Realtime', 'Twilio SMS & Voice', 'Google Maps'].map((t, i) => (
                            <span key={i} style={{ fontSize: 12.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CheckCircle2 size={13} color="var(--green)" />
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── STATS BAR ── */}
            <section style={{ padding: '0 24px 80px', position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    {STATS.map((s, i) => (
                        <div key={i} className="stat-pill" style={{ animation: `fadeInUp 0.5s ease ${i * 0.08}s both` }}>
                            <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--text-1)', marginBottom: 4, letterSpacing: '-1px' }}>{s.value}</div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{s.label}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>{s.sub}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FEATURES ── */}
            <section id="features" style={{ padding: '80px 24px', position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 56 }}>
                        <div style={{ display: 'inline-block', padding: '5px 16px', background: 'var(--blue-soft)', border: '1px solid rgba(29,111,164,0.25)', borderRadius: 'var(--r-full)', fontSize: 11.5, color: 'var(--blue-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                            Platform Features
                        </div>
                        <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, marginBottom: 14, letterSpacing: '-1px' }}>
                            Everything for Emergency Response
                        </h2>
                        <p style={{ fontSize: 17, color: 'var(--text-2)', maxWidth: 560, margin: '0 auto' }}>
                            End-to-end infrastructure connecting vehicles, hospitals, and ambulances.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 18 }}>
                        {FEATURES.map((f, i) => (
                            <div key={i} className="feature-card" style={{ animation: `fadeInUp 0.5s ease ${i * 0.07}s both` }}>
                                <div className="feature-icon" style={{ background: f.bg }}>
                                    <f.icon size={22} color={f.color} />
                                </div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: 'var(--text-1)' }}>{f.title}</h3>
                                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.7 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section id="how" style={{ padding: '80px 24px', position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 52 }}>
                        <div style={{ display: 'inline-block', padding: '5px 16px', background: 'var(--red-soft)', border: '1px solid rgba(230,57,70,0.25)', borderRadius: 'var(--r-full)', fontSize: 11.5, color: 'var(--red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                            The Process
                        </div>
                        <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-1px' }}>How CrashGuard Works</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {HOW_IT_WORKS.map((s, i) => (
                            <div key={i} className="how-step" style={{ animation: `fadeInUp 0.5s ease ${i * 0.1}s both` }}>
                                <div className="how-step-number">{s.step}</div>
                                <div>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text-1)' }}>{s.title}</h3>
                                    <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.7 }}>{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section style={{ padding: '60px 24px 100px', position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center', padding: '56px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, boxShadow: 'var(--shadow-card)' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--red-soft)', border: '1px solid rgba(230,57,70,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <ShieldAlert size={28} color="var(--red)" />
                    </div>
                    <h2 style={{ fontSize: 36, fontWeight: 900, marginBottom: 14, letterSpacing: '-1px' }}>Ready to Respond?</h2>
                    <p style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 36, lineHeight: 1.7, maxWidth: 440, margin: '0 auto 36px' }}>
                        Log into your hospital dashboard to monitor live crash alerts, manage bed availability, and coordinate ambulance dispatch.
                    </p>
                    <Link to="/login" className="btn btn-primary btn-xl" style={{ textDecoration: 'none', display: 'inline-flex' }}>
                        Access Dashboard
                        <ChevronRight size={18} />
                    </Link>
                    <div style={{ marginTop: 24, display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {['Hospital Staff', 'Ambulance Drivers', 'Admin Access'].map((t, i) => (
                            <span key={i} style={{ fontSize: 12.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <CheckCircle2 size={13} color="var(--green)" />{t}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ borderTop: '1px solid var(--border)', padding: '28px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="sidebar-logo-icon" style={{ width: 28, height: 28, borderRadius: 6 }}>
                        <ShieldAlert size={14} color="#fff" />
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 14 }}>JDC CrashGuard</span>
                    <span style={{ color: 'var(--text-3)', fontSize: 13 }}>— Emergency Response System</span>
                </div>
                <div style={{ color: 'var(--text-3)', fontSize: 12.5 }}>
                    Final Year Project · React + Node.js + ESP32 + Supabase
                </div>
            </footer>

            {/* SOS Modal */}
            {showSOS && <SOSModal onClose={() => setShowSOS(false)} />}
        </div>
    );
}
