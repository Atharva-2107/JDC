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
    Activity, BedDouble, Ambulance, AlertTriangle, CheckCircle, Clock, TrendingUp, Users
} from 'lucide-react';

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

const MapView = lazy(() => import('../components/MapView'));

// ── sub-page: Overview ──────────────────────────────────────────────
function Overview({ crashes, hospitals, ambulances, onRespond }) {
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
                                <th>Time</th><th>Location</th><th>Severity</th><th>Status</th><th>Ambulance</th><th>Victims</th><th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {crashes.slice(0, 8).map(c => (
                                <tr key={c.id}>
                                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#64748b' }}>
                                        {new Date(c.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{c.location}</td>
                                    <td>
                                        <span className={`badge badge-${c.severity}`}>
                                            <span className="pulse-dot" />{c.severity}
                                        </span>
                                    </td>
                                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                                    <td style={{ color: '#3b82f6', fontWeight: 600 }}>{c.assignedAmbulance || '—'}</td>
                                    <td>{c.victims || 1}</td>
                                    <td>
                                        {c.status === 'active' && (
                                            <button onClick={() => onRespond(c)} className="btn btn-danger btn-sm">Dispatch</button>
                                        )}
                                        {c.status !== 'active' && <span style={{ color: '#475569', fontSize: 13 }}>—</span>}
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
                            <th>Timestamp</th><th>Location</th><th>Coords</th><th>Device</th><th>Severity</th><th>Status</th><th>Ambulance</th><th>Victims</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(c => (
                            <tr key={c.id}>
                                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748b' }}>
                                    {new Date(c.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                                <td style={{ color: '#f1f5f9', fontWeight: 500, maxWidth: 150 }}>{c.location}</td>
                                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748b' }}>{c.lat?.toFixed(4)}, {c.lng?.toFixed(4)}</td>
                                <td style={{ color: '#3b82f6', fontWeight: 600 }}>{c.deviceId}</td>
                                <td><span className={`badge badge-${c.severity}`}>{c.severity}</span></td>
                                <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                                <td style={{ color: '#f59e0b', fontWeight: 600 }}>{c.assignedAmbulance || '—'}</td>
                                <td style={{ textAlign: 'center' }}>{c.victims || 1}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {c.status === 'active' && <button onClick={() => onUpdateStatus(c.id, 'responding')} className="btn btn-danger btn-sm">Respond</button>}
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
// Helper to normalize snake_case DB rows to camelCase for components
const normalizeCrash = (c) => ({
    id: c.id, lat: c.lat, lng: c.lng, severity: c.severity,
    deviceId: c.device_id, location: c.location, timestamp: c.created_at,
    status: c.status, assignedAmbulance: c.assigned_ambulance,
    respondedAt: c.responded_at, resolvedAt: c.resolved_at,
    victims: c.victims, notes: c.notes,
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
    const { crashes: socketCrashes, newCrashAlert, dismissAlert, setCrashes } = useSocket();
    const [crashes, setCrashesLocal] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [ambulances, setAmbulances] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAll = async () => {
        try {
            const [crashRes, hospRes, ambRes] = await Promise.all([
                supabase.from('crashes').select('*').order('created_at', { ascending: false }),
                supabase.from('hospitals').select('*'),
                supabase.from('ambulances').select('*'),
            ]);
            if (crashRes.error) throw crashRes.error;
            if (hospRes.error) throw hospRes.error;
            if (ambRes.error) throw ambRes.error;
            setCrashesLocal((crashRes.data || []).map(normalizeCrash));
            setHospitals((hospRes.data || []).map(normalizeHospital));
            setAmbulances((ambRes.data || []).map(normalizeAmbulance));
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
                const existingIds = new Set(prev.map(c => c.id));
                const newOnes = socketCrashes.filter(c => !existingIds.has(c.id));
                return newOnes.length ? [...newOnes, ...prev] : prev;
            });
        }
    }, [socketCrashes]);

    const handleRespond = async (crash) => {
        try {
            const updateFields = { status: 'responding', responded_at: new Date().toISOString() };
            const { error } = await supabase.from('crashes').update(updateFields).eq('id', crash.id);
            if (error) throw error;
            toast.success(`Ambulance dispatched to ${crash.location}`);
            fetchAll();
        } catch { toast.error('Failed to update status'); }
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

    return (
        <div className="app-layout">
            <Sidebar role="hospital" />

            <div className="main-content">
                <Routes>
                    <Route path="/" element={
                        <>
                            <Topbar title="Hospital Dashboard" subtitle={`${crashes.filter(c => c.status === 'active').length} active emergencies`} />
                            <div className="page-content">
                                <Overview crashes={crashes} hospitals={hospitals} ambulances={ambulances} onRespond={handleRespond} />
                            </div>
                        </>
                    } />
                    <Route path="/map" element={
                        <>
                            <Topbar title="Live Incident Map" subtitle="Real-time crash locations" />
                            <div className="page-content">
                                <div className="glass-card">
                                    <Suspense fallback={<div style={{ height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>}>
                                        <MapView crashes={crashes} ambulances={ambulances} hospitals={hospitals} height={600} />
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
