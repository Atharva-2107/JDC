import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';

import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import CrashAlertModal from '../components/CrashAlertModal';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
    Activity, BedDouble, Ambulance, AlertTriangle, CheckCircle, Clock, TrendingUp, Users, MapPin, Satellite
} from 'lucide-react';

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

const MapView = lazy(() => import('../components/MapView'));
const DevicesPage = lazy(() => import('./DevicesPage'));

// ── sub-page: Overview ──────────────────────────────────────────────
function Overview({ crashes, hospitals, ambulances, gpsLocations, onRespond }) {
    const active = crashes.filter(c => c.status === 'active').length;
    const responding = crashes.filter(c => c.status === 'responding').length;
    const resolved = crashes.filter(c => c.status === 'resolved').length;
    const highSeverity = crashes.filter(c => c.severity === 'high').length;
    const availableAmb = ambulances.filter(a => a.status === 'available').length;
    const totalBeds = hospitals.reduce((s, h) => s + (h.availableBeds || 0), 0);

    const STATS = [
        { label: 'Active Crashes', value: active, icon: <AlertTriangle size={20} />, color: '#ef4444', glow: 'rgba(239,68,68,0.3)', change: 'Needs attention' },
        { label: 'Responding', value: responding, icon: <Ambulance size={20} />, color: '#f59e0b', glow: 'rgba(245,158,11,0.25)', change: 'In progress' },
        { label: 'Resolved Today', value: resolved, icon: <CheckCircle size={20} />, color: '#10b981', glow: 'rgba(16,185,129,0.25)', change: '+2 from yesterday' },
        { label: 'Ambulances Available', value: `${availableAmb}/${ambulances.length}`, icon: <Ambulance size={20} />, color: '#3b82f6', glow: 'rgba(59,130,246,0.25)', change: 'Fleet status' },
        { label: 'Beds Available', value: totalBeds, icon: <BedDouble size={20} />, color: '#8b5cf6', glow: 'rgba(139,92,246,0.25)', change: 'Across all hospitals' },
        { label: 'High Severity', value: highSeverity, icon: <TrendingUp size={20} />, color: '#ef4444', glow: 'rgba(239,68,68,0.2)', change: 'Critical cases' },
    ];

    const CHART_DATA = [
        { time: '00:00', crashes: 2, resolved: 2 },
        { time: '04:00', crashes: 1, resolved: 1 },
        { time: '08:00', crashes: 4, resolved: 3 },
        { time: '12:00', crashes: 6, resolved: 5 },
        { time: '16:00', crashes: 8, resolved: 6 },
        { time: '20:00', crashes: crashes.length, resolved: resolved },
    ];

    const PIE_DATA = [
        { name: 'Active', value: active || 1, color: '#ef4444' },
        { name: 'Responding', value: responding || 1, color: '#f59e0b' },
        { name: 'Resolved', value: resolved || 1, color: '#10b981' },
    ];

    // Get the latest GPS-reported crashes (those with real coordinates)
    const gpsCrashes = crashes.filter(c => c.lat && c.lng && c.deviceId);

    return (
        <div>
            {/* Stats */}
            <div className="stat-grid">
                {STATS.map((s, i) => (
                    <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.08}s` }}>
                        <div className="stat-card-glow" style={{ background: s.glow }} />
                        <div className="stat-card-icon" style={{ background: `${s.color}1a` }}>
                            <span style={{ color: s.color }}>{s.icon}</span>
                        </div>
                        <div className="stat-card-value" style={{ color: s.color }}>{s.value}</div>
                        <div className="stat-card-label">{s.label}</div>
                        <div className="stat-card-change" style={{ color: '#64748b' }}>{s.change}</div>
                    </div>
                ))}
            </div>

            {/* GPS Crash Locations — Real-time from ESP32 */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                <div className="section-header" style={{ marginBottom: 20 }}>
                    <div>
                        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <MapPin size={20} style={{ color: '#06b6d4' }} />
                            GPS Crash Locations
                        </div>
                        <div className="section-subtitle">Real-time crash coordinates from ESP32 devices</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 100 }}>
                        <Satellite size={14} style={{ color: '#06b6d4' }} />
                        <span style={{ fontSize: 12, color: '#06b6d4', fontWeight: 600 }}>{gpsCrashes.length} GPS Reports</span>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* Mini-map with latest crash */}
                    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', height: 280 }}>
                        <Suspense fallback={<div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a1120' }}><div className="spinner" /></div>}>
                            <MapView crashes={gpsCrashes.slice(0, 10)} hospitals={[]} ambulances={[]} gpsLocations={gpsLocations} height={280} autoCenter={true} useGeolocation={true} />
                        </Suspense>
                    </div>

                    {/* Latest GPS crash cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
                        {gpsCrashes.length === 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569', fontSize: 14 }}>
                                No GPS crash reports yet
                            </div>
                        )}
                        {gpsCrashes.slice(0, 6).map((c, i) => (
                            <div key={c.id} style={{
                                padding: '14px 18px',
                                background: i === 0 ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${i === 0 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                borderRadius: 12,
                                transition: 'all 0.2s',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 16 }}>{i === 0 ? '🔴' : '📍'}</span>
                                        <span style={{ fontWeight: 700, fontSize: 14, color: i === 0 ? '#ef4444' : '#f1f5f9' }}>
                                            {i === 0 ? 'LATEST' : `Crash #${gpsCrashes.length - i}`}
                                        </span>
                                    </div>
                                    <span className={`badge badge-${c.status}`} style={{ fontSize: 10 }}>{c.status}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                                    <div>
                                        <span style={{ color: '#64748b' }}>GPS: </span>
                                        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#06b6d4', fontWeight: 600, fontSize: 11 }}>
                                            {c.lat?.toFixed(6)}, {c.lng?.toFixed(6)}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ color: '#64748b' }}>Device: </span>
                                        <span style={{ color: '#3b82f6', fontWeight: 600 }}>{c.deviceId}</span>
                                    </div>
                                    <div>
                                        <span style={{ color: '#64748b' }}>Time: </span>
                                        <span style={{ color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                                            {new Date(c.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' })}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ color: '#64748b' }}>Severity: </span>
                                        <span style={{ color: c.severity === 'high' ? '#ef4444' : c.severity === 'medium' ? '#f59e0b' : '#10b981', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>
                                            {c.severity}
                                        </span>
                                    </div>
                                </div>
                                {c.status === 'active' && (
                                    <div style={{ marginTop: 10 }}>
                                        <button onClick={() => onRespond(c)} className="btn btn-danger btn-sm" style={{ width: '100%', fontSize: 12 }}>
                                            🚑 Dispatch Ambulance
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
                {/* Area chart */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>Crash Activity (Today)</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>Real-time crash vs resolution trend</div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={CHART_DATA}>
                            <defs>
                                <linearGradient id="crashGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="resolveGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 12 }} />
                            <YAxis stroke="#475569" tick={{ fontSize: 12 }} />
                            <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9' }} />
                            <Area type="monotone" dataKey="crashes" stroke="#ef4444" fill="url(#crashGrad)" strokeWidth={2} name="Crashes" />
                            <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="url(#resolveGrad)" strokeWidth={2} name="Resolved" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie chart */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>Status Breakdown</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>Current incidents</div>
                    </div>
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                                {PIE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9' }} itemStyle={{ color: '#f1f5f9' }} labelStyle={{ color: '#94a3b8' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        {PIE_DATA.map(d => (
                            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color }} />
                                <span style={{ color: '#94a3b8' }}>{d.name}</span>
                                <span style={{ marginLeft: 'auto', fontWeight: 700, color: d.color }}>{d.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent incidents */}
            <div className="glass-card" style={{ padding: 24 }}>
                <div className="section-header">
                    <div>
                        <div className="section-title">Recent Incidents</div>
                        <div className="section-subtitle">Live crash feed</div>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Victim</th>
                                <th>Location</th>
                                <th>Severity</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {crashes.slice(0, 8).map(c => (
                                <tr key={c.id}>
                                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                                        {new Date(c.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    {/* Victim info cell */}
                                    <td>
                                        {c.userName ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{
                                                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                                    background: 'rgba(230,57,70,0.12)', border: '1px solid rgba(230,57,70,0.25)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 13, fontWeight: 800, color: 'var(--red)',
                                                }}>
                                                    {c.userName[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{c.userName}</div>
                                                    <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                                                        {c.userPhone && (
                                                            <a href={`tel:${c.userPhone}`} style={{
                                                                fontSize: 11, color: '#06b6d4', textDecoration: 'none',
                                                                fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
                                                            }}>{c.userPhone}</a>
                                                        )}
                                                        {c.userBloodGroup && (
                                                            <span style={{
                                                                fontSize: 10, fontWeight: 700, color: 'var(--red)',
                                                                background: 'rgba(230,57,70,0.08)', padding: '1px 6px',
                                                                borderRadius: 10, border: '1px solid rgba(230,57,70,0.2)',
                                                            }}>{c.userBloodGroup}</span>
                                                        )}
                                                        {c.vehiclePlate && (
                                                            <span style={{
                                                                fontSize: 10, fontWeight: 700, color: '#06b6d4',
                                                                background: 'rgba(6,182,212,0.06)', padding: '1px 6px',
                                                                borderRadius: 10, border: '1px solid rgba(6,182,212,0.2)',
                                                                fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px',
                                                            }}>{c.vehiclePlate}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{ color: '#475569', fontSize: 12 }}>Unknown</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 500 }}>{c.location}</div>
                                        <div style={{ fontSize: 11, color: '#475569', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                                            {c.lat?.toFixed(4)}, {c.lng?.toFixed(4)}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge badge-${c.severity}`}>
                                            <span className="pulse-dot" />{c.severity}
                                        </span>
                                    </td>
                                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                                    <td>
                                        {c.status === 'active' && (
                                            <button onClick={() => onRespond(c)} className="btn btn-danger btn-sm">🚑 Dispatch</button>
                                        )}
                                        {c.status === 'responding' && (
                                            <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>Dispatched ✓</span>
                                        )}
                                        {c.status === 'resolved' && <span style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>Resolved ✓</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── sub-page: Beds ──────────────────────────────────────────────────
function BedManagement({ hospitals, onUpdate }) {
    const [updating, setUpdating] = useState(null);

    const FIELD_MAP = { availableBeds: 'available_beds', availableIcuBeds: 'available_icu_beds', availableEmergencyBeds: 'available_emergency_beds' };
    const updateBeds = async (hospitalId, field, delta) => {
        const hosp = hospitals.find(h => h.id === hospitalId);
        if (!hosp) return;
        setUpdating(hospitalId);
        try {
            const dbField = FIELD_MAP[field] || field;
            const { error } = await supabase
                .from('hospitals')
                .update({ [dbField]: Math.max(0, (hosp[field] || 0) + delta) })
                .eq('id', hospitalId);
            if (error) throw error;
            onUpdate();
            toast.success('Bed count updated');
        } catch { toast.error('Update failed'); }
        finally { setUpdating(null); }
    };

    const BedBar = ({ available, total, color }) => (
        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(available / total) * 100}%`, background: color, borderRadius: 100, transition: 'width 0.5s ease' }} />
        </div>
    );

    return (
        <div>
            <div className="section-header" style={{ marginBottom: 24 }}>
                <div>
                    <div className="section-title">Bed Management</div>
                    <div className="section-subtitle">Real-time hospital bed availability</div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
                {hospitals.map(h => {
                    const generalPct = Math.round((h.availableBeds / h.totalBeds) * 100);
                    const icuPct = Math.round((h.availableIcuBeds / h.icuBeds) * 100);
                    return (
                        <div key={h.id} className="glass-card" style={{ padding: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 17 }}>🏥 {h.name}</div>
                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{h.type} • {h.address.split(',')[0]}</div>
                                </div>
                                <span className={`badge badge-${h.status}`}>{h.status}</span>
                            </div>

                            {/* General beds */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 13, color: '#94a3b8' }}>General Beds</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: generalPct > 30 ? '#10b981' : generalPct > 10 ? '#f59e0b' : '#ef4444' }}>
                                        {h.availableBeds} / {h.totalBeds}
                                    </span>
                                </div>
                                <BedBar available={h.availableBeds} total={h.totalBeds} color={generalPct > 30 ? '#10b981' : generalPct > 10 ? '#f59e0b' : '#ef4444'} />
                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                    <button onClick={() => updateBeds(h.id, 'availableBeds', -1)} disabled={updating === h.id} className="btn btn-danger btn-sm">−</button>
                                    <button onClick={() => updateBeds(h.id, 'availableBeds', 1)} disabled={updating === h.id} className="btn btn-success btn-sm">+</button>
                                </div>
                            </div>

                            {/* ICU beds */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 13, color: '#94a3b8' }}>ICU Beds</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: icuPct > 30 ? '#10b981' : icuPct > 10 ? '#f59e0b' : '#ef4444' }}>
                                        {h.availableIcuBeds} / {h.icuBeds}
                                    </span>
                                </div>
                                <BedBar available={h.availableIcuBeds} total={h.icuBeds} color={icuPct > 30 ? '#10b981' : icuPct > 10 ? '#f59e0b' : '#ef4444'} />
                            </div>

                            {/* Emergency beds */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <span style={{ fontSize: 13, color: '#94a3b8' }}>Emergency Beds</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: h.availableEmergencyBeds > 0 ? '#3b82f6' : '#ef4444' }}>
                                        {h.availableEmergencyBeds} / {h.emergencyBeds}
                                    </span>
                                </div>
                                <BedBar available={h.availableEmergencyBeds} total={h.emergencyBeds} color="#3b82f6" />
                            </div>

                            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
                                {h.specializations.slice(0, 3).map(s => (
                                    <span key={s} style={{ padding: '3px 10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 100, fontSize: 11, color: '#3b82f6', fontWeight: 600 }}>{s}</span>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── sub-page: Incidents table ──────────────────────────────────────
function IncidentsPage({ crashes, onUpdateStatus }) {
    const [filter, setFilter] = useState('all');
    const filtered = filter === 'all' ? crashes : crashes.filter(c => c.status === filter || c.severity === filter);

    return (
        <div>
            <div className="section-header" style={{ marginBottom: 20 }}>
                <div>
                    <div className="section-title">All Incidents</div>
                    <div className="section-subtitle">{filtered.length} crash events</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['all', 'active', 'responding', 'resolved', 'high', 'medium', 'low'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', textTransform: 'capitalize', transition: 'all 0.2s', background: filter === f ? (f === 'high' ? '#ef4444' : f === 'active' ? '#10b981' : '#3b82f6') : 'rgba(255,255,255,0.04)', color: filter === f ? '#fff' : '#94a3b8', borderColor: filter === f ? 'transparent' : 'rgba(255,255,255,0.1)' }}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass-card" style={{ padding: 24 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Victim</th>
                            <th>Location</th>
                            <th>Severity</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(c => (
                            <tr key={c.id}>
                                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
                                    {new Date(c.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                                {/* Victim cell */}
                                <td style={{ minWidth: 180 }}>
                                    {c.userName ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{
                                                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                                background: 'rgba(230,57,70,0.12)', border: '1px solid rgba(230,57,70,0.25)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 13, fontWeight: 800, color: 'var(--red)',
                                            }}>
                                                {c.userName[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{c.userName}</div>
                                                <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                                                    {c.userPhone && (
                                                        <a href={`tel:${c.userPhone}`} style={{ fontSize: 11, color: '#06b6d4', textDecoration: 'none', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                                                            {c.userPhone}
                                                        </a>
                                                    )}
                                                    {c.userBloodGroup && (
                                                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', background: 'rgba(230,57,70,0.08)', padding: '1px 6px', borderRadius: 10, border: '1px solid rgba(230,57,70,0.2)' }}>
                                                            {c.userBloodGroup}
                                                        </span>
                                                    )}
                                                    {c.vehiclePlate && (
                                                        <span style={{ fontSize: 10, fontWeight: 700, color: '#06b6d4', background: 'rgba(6,182,212,0.06)', padding: '1px 6px', borderRadius: 10, border: '1px solid rgba(6,182,212,0.2)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px' }}>
                                                            {c.vehiclePlate}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <span style={{ color: '#475569', fontSize: 12 }}>Unknown</span>
                                    )}
                                </td>
                                <td>
                                    <div style={{ color: '#f1f5f9', fontWeight: 500, fontSize: 13 }}>{c.location}</div>
                                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#475569', marginTop: 2 }}>
                                        {c.lat?.toFixed(4)}, {c.lng?.toFixed(4)}
                                    </div>
                                </td>
                                <td><span className={`badge badge-${c.severity}`}>{c.severity}</span></td>
                                <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {c.status === 'active' && <button onClick={() => onUpdateStatus(c.id, 'responding')} className="btn btn-danger btn-sm">🚑 Dispatch</button>}
                                        {c.status === 'responding' && <button onClick={() => onUpdateStatus(c.id, 'resolved')} className="btn btn-success btn-sm">Resolve</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── sub-page: Ambulances ────────────────────────────────────────────
function AmbulanceTracking({ ambulances }) {
    const STATUS_COLORS = { available: '#10b981', responding: '#f59e0b', at_scene: '#8b5cf6', transporting: '#3b82f6', off_duty: '#64748b' };
    return (
        <div>
            <div className="section-header" style={{ marginBottom: 20 }}>
                <div className="section-title">Ambulance Fleet</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {ambulances.map(a => (
                    <div key={a.id} className="glass-card" style={{ padding: 22 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 20, color: STATUS_COLORS[a.status] || '#fff' }}>🚑 {a.callSign}</div>
                                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{a.vehicleNumber}</div>
                            </div>
                            <span className={`badge badge-${a.status}`}>{a.status.replace('_', ' ')}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Driver</span><span style={{ fontWeight: 600 }}>{a.driver}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Phone</span><span style={{ fontWeight: 600, color: '#3b82f6' }}>{a.phone}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Total Dispatches</span><span style={{ fontWeight: 700 }}>{a.totalDispatches}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Avg Response</span><span style={{ fontWeight: 700, color: '#10b981' }}>{a.avgResponseTime} min</span></div>
                            {a.assignedHospital && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#64748b' }}>Hospital</span><span style={{ fontWeight: 600, color: '#8b5cf6' }}>{a.assignedHospital}</span></div>}
                        </div>
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: '#475569' }}>
                            Last update: {new Date(a.lastUpdate).toLocaleTimeString('en-IN')}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main Hospital Dashboard ─────────────────────────────────────────
const normalizeCrash = (c) => ({
    id: c.id, lat: c.lat, lng: c.lng, severity: c.severity,
    deviceId: c.device_id, location: c.location, timestamp: c.created_at,
    status: c.status, assignedAmbulance: c.assigned_ambulance,
    respondedByHospital: c.responded_by_hospital,
    respondedAt: c.responded_at, resolvedAt: c.resolved_at,
    victims: c.victims, notes: c.notes,
    is_sos: c.is_sos, is_demo: c.is_demo,
    // Victim / user details
    userName: c.user_name,
    userPhone: c.user_phone,
    userBloodGroup: c.user_blood_group,
    vehiclePlate: c.vehicle_plate,
    userId: c.user_id,
});
const normalizeHospital = (h) => ({
    id: h.id, name: h.name, address: h.address || '', lat: h.lat, lng: h.lng,
    phone: h.phone, type: h.type, totalBeds: h.total_beds,
    availableBeds: h.available_beds, icuBeds: h.icu_beds,
    availableIcuBeds: h.available_icu_beds, emergencyBeds: h.emergency_beds,
    availableEmergencyBeds: h.available_emergency_beds, distance: h.distance,
    status: h.status, specializations: h.specializations || [],
});
const normalizeAmbulance = (a) => ({
    id: a.id, callSign: a.call_sign, driver: a.driver, phone: a.phone,
    vehicleNumber: a.vehicle_number, lat: a.lat, lng: a.lng, status: a.status,
    currentCrashId: a.current_crash_id, assignedHospital: a.assigned_hospital,
    lastUpdate: a.last_update, totalDispatches: a.total_dispatches,
    avgResponseTime: a.avg_response_time,
});

export default function HospitalDashboard() {
    // BUG FIX #1: useAuth() must be called at component root scope
    const { user } = useAuth();
    const { crashes: socketCrashes, newCrashAlert, latestCrashUpdate, dismissAlert, setCrashes, latestGpsLocations } = useSocket();
    const [crashes, setCrashesLocal] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [ambulances, setAmbulances] = useState([]);
    const [gpsLocations, setGpsLocations] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = async () => {
        try {
            // If user has a hospitalId, scope crashes and hospital data accordingly
            // Otherwise load all (admin mode)
            const [crashRes, hospRes, ambRes, gpsRes] = await Promise.all([
                supabase
                    .from('crashes')
                    .select('*')
                    .not('status', 'in', '("pending_user","cancelled")')
                    .order('created_at', { ascending: false }),
                user?.hospitalId
                    ? supabase.from('hospitals').select('*').eq('id', user.hospitalId)
                    : supabase.from('hospitals').select('*'),
                supabase.from('ambulances').select('*'),
                supabase.from('gps_locations').select('*').order('created_at', { ascending: false }).limit(50),
            ]);
            if (crashRes.error) throw crashRes.error;
            if (hospRes.error) throw hospRes.error;
            if (ambRes.error) throw ambRes.error;
            setCrashesLocal((crashRes.data || []).map(normalizeCrash));
            setHospitals((hospRes.data || []).map(normalizeHospital));
            setAmbulances((ambRes.data || []).map(normalizeAmbulance));
            if (!gpsRes.error) {
                const seen = new Set();
                const unique = (gpsRes.data || []).filter(g => {
                    if (seen.has(g.device_id)) return false;
                    seen.add(g.device_id);
                    return true;
                });
                setGpsLocations(unique);
            }
        } catch (e) {
            console.error('Fetch error:', e);
            toast.error('Failed to load data from Supabase');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    // Merge socket/realtime crashes into local state
    useEffect(() => {
        if (socketCrashes.length) {
            setCrashesLocal(prev => {
                let updatedList = [...prev];
                let hasChanges = false;
                
                socketCrashes.forEach(newCrash => {
                    const idx = updatedList.findIndex(c => c.id === newCrash.id);
                    if (idx >= 0) {
                        // Found an existing crash, update it if its status or resolved_at changed
                        if (updatedList[idx].status !== newCrash.status || updatedList[idx].resolvedAt !== newCrash.resolvedAt) {
                            updatedList[idx] = { ...updatedList[idx], ...newCrash };
                            hasChanges = true;
                        }
                    } else {
                        // Completely new crash
                        updatedList.unshift(newCrash);
                        hasChanges = true;
                    }
                });
                
                return hasChanges ? updatedList : prev;
            });
        }
    }, [socketCrashes]);

    // 🚀 CRITICAL FIX: Merge live single-crash updates from context instantly seamlessly
    useEffect(() => {
        if (latestCrashUpdate) {
            setCrashesLocal(prev => {
                const idx = prev.findIndex(c => c.id === latestCrashUpdate.id);
                if (idx === -1) return prev; // Not in view, ignore

                const updatedList = [...prev];
                // Deep merge the updated row data over the old row
                updatedList[idx] = { ...updatedList[idx], ...latestCrashUpdate };
                return updatedList;
            });
        }
    }, [latestCrashUpdate]);

    // Merge realtime GPS locations
    useEffect(() => {
        if (latestGpsLocations && latestGpsLocations.length) {
            setGpsLocations(prev => {
                const merged = [...prev];
                latestGpsLocations.forEach(newGps => {
                    const idx = merged.findIndex(g => g.device_id === newGps.device_id);
                    if (idx >= 0) {
                        merged[idx] = newGps;
                    } else {
                        merged.unshift(newGps);
                    }
                });
                return merged;
            });
        }
    }, [latestGpsLocations]);

    const handleRespond = async (crash) => {
        try {
            // BUG FIX #1 resolved: user is now properly in scope
            const hospitalName = user?.hospital || user?.name || 'Hospital';

            const { data: current } = await supabase
                .from('crashes')
                .select('status')
                .eq('id', crash.id)
                .single();

            if (current && current.status !== 'active') {
                toast.error('Already dispatched by another hospital');
                fetchAll();
                return;
            }

            const { error } = await supabase
                .from('crashes')
                .update({
                    status: 'responding',
                    responded_at: new Date().toISOString(),
                    responded_by_hospital: hospitalName,
                })
                .eq('id', crash.id);

            if (error) throw error;

            toast.success(`Ambulance dispatched to ${crash.location}`);
            fetchAll();
        } catch (err) {
            console.error('Dispatch error:', err);
            toast.error('Failed to dispatch');
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            const updateFields = { status };
            if (status === 'responding') updateFields.responded_at = new Date().toISOString();
            if (status === 'resolved') updateFields.resolved_at = new Date().toISOString();
            const { error } = await supabase.from('crashes').update(updateFields).eq('id', id);
            if (error) throw error;
            toast.success(`Status updated to ${status}`);
            fetchAll();
        } catch { toast.error('Update failed'); }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#060b14' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 16px' }} />
                    <div style={{ color: '#64748b', fontSize: 14 }}>Loading CrashGuard data...</div>
                </div>
            </div>
        );
    }

    // Look up hospital name for sidebar display
    const myHospital = hospitals.find(h => h.id === user?.hospitalId);

    return (
        <div className="app-layout">
            <Sidebar role="hospital" hospitalName={myHospital?.name} />

            <div className="main-content">
                <Routes>
                    <Route path="/" element={
                        <>
                            <Topbar title="Hospital Dashboard" subtitle={`${crashes.filter(c => c.status === 'active').length} active emergencies`} />
                            <div className="page-content">
                                <Overview crashes={crashes} hospitals={hospitals} ambulances={ambulances} gpsLocations={gpsLocations} onRespond={handleRespond} />
                            </div>
                        </>
                    } />
                    <Route path="/map" element={
                        <>
                            <Topbar title="Live Incident Map" subtitle="Real-time crash locations" />
                            <div className="page-content">
                                <div className="glass-card">
                                    <Suspense fallback={<div style={{ height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>}>
                                        <MapView crashes={crashes} ambulances={ambulances} hospitals={hospitals} gpsLocations={gpsLocations} height={600} autoCenter={true} useGeolocation={true} />
                                    </Suspense>
                                </div>
                            </div>
                        </>
                    } />
                    <Route path="/incidents" element={
                        <>
                            <Topbar title="Incidents" subtitle="All crash records" />
                            <div className="page-content">
                                <IncidentsPage crashes={crashes} onUpdateStatus={handleUpdateStatus} />
                            </div>
                        </>
                    } />
                    <Route path="/beds" element={
                        <>
                            <Topbar title="Bed Management" subtitle="Live bed availability" />
                            <div className="page-content">
                                <BedManagement hospitals={hospitals} onUpdate={fetchAll} />
                            </div>
                        </>
                    } />
                    <Route path="/ambulances" element={
                        <>
                            <Topbar title="Ambulance Fleet" subtitle="Track all units" />
                            <div className="page-content">
                                <AmbulanceTracking ambulances={ambulances} />
                            </div>
                        </>
                    } />
                    <Route path="/alerts" element={
                        <>
                            <Topbar title="Alert History" subtitle="All crash alerts" />
                            <div className="page-content">
                                <IncidentsPage crashes={crashes} onUpdateStatus={handleUpdateStatus} />
                            </div>
                        </>
                    } />
                    <Route path="/analytics" element={
                        <>
                            <Topbar title="Analytics" subtitle="Response metrics and insights" />
                            <div className="page-content">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                    <div className="glass-card" style={{ padding: 24 }}>
                                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Crashes by Severity</div>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={[
                                                { severity: 'High', count: crashes.filter(c => c.severity === 'high').length },
                                                { severity: 'Medium', count: crashes.filter(c => c.severity === 'medium').length },
                                                { severity: 'Low', count: crashes.filter(c => c.severity === 'low').length },
                                            ]}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                <XAxis dataKey="severity" stroke="#475569" tick={{ fontSize: 12 }} />
                                                <YAxis stroke="#475569" tick={{ fontSize: 12 }} />
                                                <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9' }} />
                                                <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="glass-card" style={{ padding: 24 }}>
                                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Hospital Bed Utilization</div>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={hospitals.map(h => ({ name: h.name.split(' ')[0], available: h.availableBeds, total: h.totalBeds }))}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 12 }} />
                                                <YAxis stroke="#475569" tick={{ fontSize: 12 }} />
                                                <Tooltip contentStyle={{ background: '#0d1526', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f1f5f9' }} />
                                                <Bar dataKey="available" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Available" />
                                                <Bar dataKey="total" fill="rgba(59,130,246,0.2)" radius={[6, 6, 0, 0]} name="Total" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                {/* Key metrics */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 20 }}>
                                    {[
                                        { label: 'Avg Response Time', value: '8.4 min', color: '#10b981', icon: '⏱️' },
                                        { label: 'Total Crashes', value: crashes.length, color: '#3b82f6', icon: '💥' },
                                        { label: 'Resolution Rate', value: `${crashes.length ? Math.round((crashes.filter(c => c.status === 'resolved').length / crashes.length) * 100) : 0}%`, color: '#f59e0b', icon: '✅' },
                                        { label: 'High Severity', value: crashes.filter(c => c.severity === 'high').length, color: '#ef4444', icon: '🔴' },
                                    ].map((m, i) => (
                                        <div key={i} className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
                                            <div style={{ fontSize: 28, marginBottom: 8 }}>{m.icon}</div>
                                            <div style={{ fontSize: 28, fontWeight: 800, color: m.color, marginBottom: 4 }}>{m.value}</div>
                                            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{m.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    } />
                    <Route path="/devices" element={
                        <>
                            <Topbar title="Devices & Simulator" subtitle="Pair hardware · Simulate crashes · Test mobile alerts" />
                            <div className="page-content">
                                <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>Loading...</div>}>
                                    <DevicesPage />
                                </Suspense>
                            </div>
                        </>
                    } />
                </Routes>
            </div>

            {/* Crash Alert Modal */}
            {newCrashAlert && (
                <CrashAlertModal
                    crash={newCrashAlert}
                    onDismiss={dismissAlert}
                    onRespond={handleRespond}
                />
            )}
        </div>
    );
}
