import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
    { icon: '🚨', title: 'Real-Time Crash Detection', desc: 'ESP32 sensors detect collisions instantly and transmit GPS coordinates via Wi-Fi within milliseconds.' },
    { icon: '🗺️', title: 'Live Location Mapping', desc: 'Precise crash coordinates displayed on interactive maps, enabling fastest route calculation for ambulances.' },
    { icon: '🏥', title: 'Hospital Coordination', desc: 'Instant notifications to nearby hospitals for bed preparation, ICU allocation, and trauma team readiness.' },
    { icon: '🚑', title: 'Smart Dispatch System', desc: 'Automatically identifies the nearest available ambulance and dispatches it with turn-by-turn navigation.' },
    { icon: '📊', title: 'Analytics Dashboard', desc: 'Comprehensive insights on response times, crash patterns, and resource utilization for better planning.' },
    { icon: '🔔', title: 'Multi-Channel Alerts', desc: 'Simultaneous alerts via WebSocket, SMS (Twilio), and push notifications to all stakeholders.' },
];

const STATS = [
    { value: '<30s', label: 'Avg. Alert Time', icon: '⚡' },
    { value: '98.7%', label: 'Detection Accuracy', icon: '🎯' },
    { value: '4.2 min', label: 'Faster Response', icon: '⏱️' },
    { value: '24/7', label: 'System Uptime', icon: '🔄' },
];

const HOW_IT_WORKS = [
    { step: '01', title: 'Collision Detected', desc: 'ESP32 accelerometer detects sudden deceleration consistent with a crash event.', icon: '💥' },
    { step: '02', title: 'GPS Coordinates Sent', desc: 'Device transmits precise lat/lng coordinates via Wi-Fi to our CrashGuard server.', icon: '📡' },
    { step: '03', title: 'Instant Alert Broadcast', desc: 'Server processes crash data and sends real-time alerts to hospitals and ambulance units.', icon: '📢' },
    { step: '04', title: 'Rapid Response', desc: 'Nearest ambulance dispatched while hospital prepares for patient arrival.', icon: '🚑' },
];

const Counter = ({ target, suffix = '', duration = 2000 }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        const numericTarget = parseFloat(target.replace(/[^0-9.]/g, ''));
        if (isNaN(numericTarget)) { setCount(target); return; }
        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * numericTarget));
            if (progress >= 1) { clearInterval(interval); setCount(numericTarget); }
        }, 16);
        return () => clearInterval(interval);
    }, [target, duration]);
    return <span>{typeof count === 'number' ? count + suffix : count}</span>;
};

export default function Landing() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <div style={{ background: '#060b14', minHeight: '100vh', color: '#f1f5f9', overflow: 'hidden' }}>
            {/* Ambient background orbs */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: '20%', right: '-10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', top: '50%', left: '40%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)', borderRadius: '50%' }} />
            </div>

            {/* NAVBAR */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
                padding: '16px 48px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: scrolled ? 'rgba(6,11,20,0.95)' : 'transparent',
                backdropFilter: scrolled ? 'blur(20px)' : 'none',
                borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
                transition: 'all 0.3s ease',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #ef4444, #7c3aed)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 0 20px rgba(239,68,68,0.4)' }}>🛡️</div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1 }}>CrashGuard</div>
                        <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Emergency Response</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <a href="#features" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 16px', borderRadius: 8, transition: 'color 0.2s' }}
                        onMouseOver={e => e.target.style.color = '#f1f5f9'} onMouseOut={e => e.target.style.color = '#94a3b8'}>Features</a>
                    <a href="#how" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 14, fontWeight: 500, padding: '8px 16px', borderRadius: 8, transition: 'color 0.2s' }}
                        onMouseOver={e => e.target.style.color = '#f1f5f9'} onMouseOut={e => e.target.style.color = '#94a3b8'}>How It Works</a>
                    <Link to="/login" style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #ef4444, #7c3aed)', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 20px rgba(239,68,68,0.3)', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                        Dashboard Login
                    </Link>
                </div>
            </nav>

            {/* HERO */}
            <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 24px 80px', position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: 800 }}>
                    {/* Live indicator */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 100, marginBottom: 32 }}>
                        <div style={{ width: 8, height: 8, background: '#ef4444', borderRadius: '50%', animation: 'blink 1.2s ease infinite' }} />
                        <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 600 }}>SYSTEM ACTIVE — Monitoring 24/7</span>
                    </div>

                    <h1 style={{ fontSize: 'clamp(48px, 8vw, 84px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 24, letterSpacing: '-2px' }}>
                        Save Lives with
                        <br />
                        <span style={{ background: 'linear-gradient(135deg, #ef4444 0%, #7c3aed 50%, #3b82f6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% 200%', animation: 'gradient-shift 4s ease infinite' }}>
                            AI-Powered
                        </span>
                        <br />
                        Crash Detection
                    </h1>

                    <p style={{ fontSize: 20, color: '#94a3b8', lineHeight: 1.7, marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>
                        CrashGuard uses ESP32 microcontrollers to detect vehicle crashes in real-time and instantly notifies hospitals and ambulances — every second counts.
                    </p>

                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 36px', background: 'linear-gradient(135deg, #ef4444, #7c3aed)', color: '#fff', borderRadius: 14, textDecoration: 'none', fontWeight: 700, fontSize: 16, boxShadow: '0 4px 30px rgba(239,68,68,0.4)', transition: 'all 0.3s ease' }}
                            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 40px rgba(239,68,68,0.5)'; }}
                            onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 30px rgba(239,68,68,0.4)'; }}>
                            🚨 View Dashboard <span style={{ fontSize: 20 }}>→</span>
                        </Link>
                        <a href="#how" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 36px', background: 'rgba(255,255,255,0.05)', color: '#f1f5f9', borderRadius: 14, textDecoration: 'none', fontWeight: 700, fontSize: 16, border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.3s ease' }}
                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}>
                            How It Works
                        </a>
                    </div>

                    {/* Hero visual */}
                    <div style={{ marginTop: 80, position: 'relative', display: 'inline-block', animation: 'float 4s ease-in-out infinite' }}>
                        <div style={{ width: 300, height: 200, background: 'linear-gradient(135deg, rgba(13,21,38,0.9), rgba(20,32,55,0.9))', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, boxShadow: '0 0 60px rgba(239,68,68,0.15)' }}>
                            <div style={{ fontSize: 40 }}>🚘</div>
                            <div style={{ width: 200, height: 4, background: 'linear-gradient(90deg, #ef4444, #7c3aed)', borderRadius: 4, animation: 'shimmer 2s ease infinite', backgroundSize: '200% 100%' }} />
                            <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#94a3b8' }}>
                                <span>📡 ESP32</span>
                                <span>→</span>
                                <span>🏥 Hospital</span>
                                <span>→</span>
                                <span>🚑 Ambulance</span>
                            </div>
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 100, padding: '4px 14px', fontSize: 12, color: '#ef4444', fontWeight: 700 }}>
                                CRASH DETECTED — 0.8s
                            </div>
                        </div>
                        {/* Pulse rings */}
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 300 + i * 80, height: 200 + i * 60, border: `1px solid rgba(239,68,68,${0.15 / i})`, borderRadius: 20, animation: `pulse-ring ${1.5 + i * 0.5}s ease-out infinite`, animationDelay: `${i * 0.3}s` }} />
                        ))}
                    </div>
                </div>
            </section>

            {/* STATS BAR */}
            <section style={{ padding: '0 24px 80px', position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                    {STATS.map((s, i) => (
                        <div key={i} style={{ textAlign: 'center', padding: '28px 16px', background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, animation: `fadeInUp 0.6s ease ${i * 0.1}s both` }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                            <div style={{ fontSize: 32, fontWeight: 900, background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                {s.value}
                            </div>
                            <div style={{ fontSize: 13, color: '#64748b', marginTop: 6, fontWeight: 500 }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* FEATURES */}
            <section id="features" style={{ padding: '80px 24px', position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 60 }}>
                        <div style={{ display: 'inline-block', padding: '6px 18px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 100, fontSize: 12, color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Core Features</div>
                        <h2 style={{ fontSize: 48, fontWeight: 800, marginBottom: 16, letterSpacing: '-1px' }}>Everything You Need for<br /><span style={{ color: '#3b82f6' }}>Emergency Response</span></h2>
                        <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 600, margin: '0 auto' }}>A complete ecosystem connecting cars, hospitals, and ambulances in real-time.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                        {FEATURES.map((f, i) => (
                            <div key={i} style={{
                                padding: '32px', background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: 20, transition: 'all 0.3s ease', cursor: 'default',
                                animation: `fadeInUp 0.6s ease ${i * 0.1}s both`,
                            }}
                                onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)'; }}
                                onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                                <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
                                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{f.title}</h3>
                                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="how" style={{ padding: '80px 24px', position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 60 }}>
                        <div style={{ display: 'inline-block', padding: '6px 18px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 100, fontSize: 12, color: '#8b5cf6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Process</div>
                        <h2 style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-1px' }}>How <span style={{ color: '#8b5cf6' }}>CrashGuard</span> Works</h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 24 }}>
                        {HOW_IT_WORKS.map((s, i) => (
                            <div key={i} style={{ textAlign: 'center', padding: '40px 24px', background: 'rgba(13,21,38,0.8)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, position: 'relative', animation: `fadeInUp 0.6s ease ${i * 0.15}s both` }}>
                                <div style={{ position: 'absolute', top: 20, right: 20, fontSize: 11, fontWeight: 800, color: 'rgba(139,92,246,0.5)', letterSpacing: '0.05em' }}>{s.step}</div>
                                <div style={{ width: 68, height: 68, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px' }}>{s.icon}</div>
                                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>{s.title}</h3>
                                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7 }}>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section style={{ padding: '80px 24px 100px', position: 'relative', zIndex: 1 }}>
                <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', padding: '60px', background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(124,58,237,0.08))', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 28 }}>
                    <div style={{ fontSize: 52, marginBottom: 20 }}>🚨</div>
                    <h2 style={{ fontSize: 42, fontWeight: 900, marginBottom: 16, letterSpacing: '-1px' }}>Ready to Save Lives?</h2>
                    <p style={{ fontSize: 18, color: '#94a3b8', marginBottom: 36, lineHeight: 1.7 }}>Log in to the CrashGuard dashboard to monitor crashes in real-time, manage ambulance dispatch, and coordinate hospital responses.</p>
                    <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '18px 48px', background: 'linear-gradient(135deg, #ef4444, #7c3aed)', color: '#fff', borderRadius: 14, textDecoration: 'none', fontWeight: 700, fontSize: 18, boxShadow: '0 4px 40px rgba(239,68,68,0.4)', transition: 'all 0.3s ease' }}
                        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 50px rgba(239,68,68,0.5)'; }}
                        onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 40px rgba(239,68,68,0.4)'; }}>
                        🏥 Access Dashboard →
                    </Link>
                    <div style={{ marginTop: 24, display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {['Hospital Staff Login', 'Ambulance Driver Login', 'Admin Access'].map((t, i) => (
                            <span key={i} style={{ fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ color: '#10b981' }}>✓</span> {t}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>🛡️</span>
                    <span style={{ fontWeight: 700 }}>CrashGuard</span>
                    <span style={{ color: '#475569', fontSize: 13 }}>— Emergency Response System</span>
                </div>
                <div style={{ color: '#475569', fontSize: 13 }}>
                    Built with ❤️ for Final Year Project | React + Node.js + ESP32
                </div>
            </footer>
        </div>
    );
}
