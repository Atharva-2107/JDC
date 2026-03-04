import React from 'react';
import { Bell, Clock, RefreshCw } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export default function Topbar({ title, subtitle }) {
    const { crashes, connected } = useSocket();
    const activeCrashes = crashes.filter(c => c.status === 'active').length;
    const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

    return (
        <header className="topbar">
            <div>
                <h1 className="topbar-title">{title}</h1>
                {subtitle && <p style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{subtitle}</p>}
            </div>
            <div className="topbar-actions">
                {/* Timestamp */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 12 }}>
                    <Clock size={13} />
                    <span>{now}</span>
                </div>
                {/* Connection dot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 100, border: `1px solid ${connected ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#10b981' : '#ef4444', animation: connected ? 'blink 2s ease infinite' : 'none' }} />
                    <span style={{ fontSize: 12, color: connected ? '#10b981' : '#ef4444', fontWeight: 600 }}>{connected ? 'Live' : 'Offline'}</span>
                </div>
                {/* Alert bell */}
                <button style={{ position: 'relative', background: activeCrashes ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${activeCrashes ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 10, padding: '8px 10px', cursor: 'pointer', color: activeCrashes ? '#ef4444' : '#94a3b8', transition: 'all 0.2s' }}>
                    <Bell size={18} />
                    {activeCrashes > 0 && (
                        <span style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {activeCrashes}
                        </span>
                    )}
                </button>
            </div>
        </header>
    );
}
