import React, { useCallback } from 'react';
import { Bell, Clock, Zap, Loader2 } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { toast } from 'react-hot-toast';
import { useState } from 'react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function Topbar({ title, subtitle }) {
    const { crashes, connected } = useSocket();
    const activeCrashes = crashes.filter(c => c.status === 'active').length;
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
    const [injecting, setInjecting] = useState(false);

    const handleDemoInject = useCallback(async () => {
        setInjecting(true);
        try {
            // Use real browser geolocation for demo inject too
            const pos = await new Promise((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 })
            ).catch(() => null);

            const lat = pos?.coords.latitude ?? 19.0760;
            const lng = pos?.coords.longitude ?? 72.8777;

            const res = await fetch(`${BACKEND}/api/crash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lat, lng,
                    severity: 'high',
                    device_id: 'DEMO-INJECT',
                    location: pos
                        ? `Demo Crash — ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`
                        : 'Demo Crash — Andheri West, Mumbai',
                    victims: 1,
                    notes: `Demo crash injected from dashboard at ${new Date().toLocaleTimeString('en-IN')}`,
                    is_demo: true,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Demo crash injected! Check the crash alert.');
            } else {
                toast.error('Inject failed: ' + data.message);
            }
        } catch (err) {
            toast.error('Demo inject error: ' + err.message);
        } finally {
            setInjecting(false);
        }
    }, []);

    return (
        <header className="topbar">
            <div>
                <h1 className="topbar-title">{title}</h1>
                {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
            </div>
            <div className="topbar-actions">
                {/* Demo Inject Button */}
                <button className="btn-demo-inject" onClick={handleDemoInject} disabled={injecting} title="Simulate a crash event for demo purposes">
                    {injecting
                        ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Zap size={13} />
                    }
                    {injecting ? 'Injecting...' : 'Simulate Crash'}
                </button>

                {/* Timestamp */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)', fontSize: 12 }}>
                    <Clock size={12} />
                    <span>{now}</span>
                </div>

                {/* Live indicator */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
                    background: connected ? 'rgba(44,182,125,0.08)' : 'rgba(230,57,70,0.08)',
                    borderRadius: 'var(--r-full)',
                    border: `1px solid ${connected ? 'rgba(44,182,125,0.2)' : 'rgba(230,57,70,0.2)'}`,
                }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? 'var(--green)' : 'var(--red)', animation: connected ? 'blink 2s ease infinite' : 'none' }} />
                    <span style={{ fontSize: 12, color: connected ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                        {connected ? 'Live' : 'Offline'}
                    </span>
                </div>

                {/* Alert bell */}
                <button style={{
                    position: 'relative',
                    background: activeCrashes ? 'rgba(230,57,70,0.08)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${activeCrashes ? 'rgba(230,57,70,0.25)' : 'var(--border)'}`,
                    borderRadius: 'var(--r-md)', padding: '7px 9px', cursor: 'pointer',
                    color: activeCrashes ? 'var(--red)' : 'var(--text-3)', transition: 'all var(--t-fast)',
                }}>
                    <Bell size={16} />
                    {activeCrashes > 0 && (
                        <span style={{
                            position: 'absolute', top: -5, right: -5, background: 'var(--red)',
                            color: '#fff', fontSize: 9, fontWeight: 700,
                            width: 17, height: 17, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            {activeCrashes}
                        </span>
                    )}
                </button>
            </div>
        </header>
    );
}
