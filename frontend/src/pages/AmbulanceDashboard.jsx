import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import CrashAlertModal from '../components/CrashAlertModal';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Navigation, Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MapView = lazy(() => import('../components/MapView'));

const STATUS_STYLES = {
    available: { color: '#10b981', label: 'Available', icon: '✅' },
    responding: { color: '#f59e0b', label: 'En Route', icon: '🚨' },
    at_scene: { color: '#8b5cf6', label: 'At Scene', icon: '📍' },
    transporting: { color: '#3b82f6', label: 'Transporting', icon: '🏥' },
    off_duty: { color: '#64748b', label: 'Off Duty', icon: '💤' },
};

// ── Ambulance Overview ───────────────────────────────────────────────
function AmbOverview({ crashes, myAmbulance, onAcceptCrash }) {
    const active = crashes.filter(c => c.status === 'active');
    const responding = crashes.filter(c => c.status === 'responding');

    const STATS = [
        { label: 'Active Crashes', value: active.length, color: '#ef4444', icon: '💥' },
        { label: 'My Status', value: myAmbulance ? STATUS_STYLES[myAmbulance.status]?.label || myAmbulance.status : 'Unknown', color: myAmbulance ? STATUS_STYLES[myAmbulance.status]?.color : '#64748b', icon: myAmbulance ? STATUS_STYLES[myAmbulance.status]?.icon : '❓' },
        { label: 'Total Dispatches', value: myAmbulance?.totalDispatches || 0, color: '#3b82f6', icon: '📋' },
        { label: 'Avg Response', value: myAmbulance ? `${myAmbulance.avgResponseTime} min` : '—', color: '#10b981', icon: '⏱️' },
    ];

    return (
        <div>
            {/* Stat cards */}
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {STATS.map((s, i) => (
                    <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
                        <div className="stat-card-value" style={{ color: s.color, fontSize: 28 }}>{s.value}</div>
                        <div className="stat-card-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* My ambulance card */}
            {myAmbulance && (
                <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, fontSize: 17 }}>🚑 My Unit — {myAmbulance.callSign}</div>
                        <span className={`badge badge-${myAmbulance.status}`}>{myAmbulance.status.replace('_', ' ')}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, fontSize: 13 }}>
                        {[
                            { label: 'Vehicle', value: myAmbulance.vehicleNumber },
                            { label: 'Phone', value: myAmbulance.phone },
                            { label: 'Hospital', value: myAmbulance.assignedHospital || 'None assigned' },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <div style={{ color: '#64748b', marginBottom: 3 }}>{label}</div>
                                <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active crash alerts */}
            <div className="section-header">
                <div className="section-title">🚨 Active Crash Alerts ({active.length})</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {active.length === 0 ? (
                    <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                        <div style={{ fontWeight: 600 }}>No active crashes at the moment</div>
                    </div>
                ) : active.map(c => (
                    <div key={c.id} className="glass-card" style={{ padding: 20, borderColor: c.severity === 'high' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)', background: 'rgba(239,68,68,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                                    <span className={`badge badge-${c.severity}`}>{c.severity} SEVERITY</span>
                                    <span className={`badge badge-${c.status}`}>{c.status}</span>
                                    {c.is_sos && <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.25)' }}>SOS</span>}
                                </div>
                                {/* Victim info */}
                                {c.userName && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 14px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10 }}>
                                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#ef4444', flexShrink: 0 }}>
                                            {c.userName[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>{c.userName}</div>
                                            <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                                                {c.userPhone && (
                                                    <a href={`tel:${c.userPhone}`} style={{ fontSize: 12, color: '#06b6d4', textDecoration: 'none', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
                                                        📞 {c.userPhone}
                                                    </a>
                                                )}
                                                {c.userBloodGroup && (
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)' }}>🩸 {c.userBloodGroup}</span>
                                                )}
                                                {c.vehiclePlate && (
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#06b6d4', fontFamily: 'JetBrains Mono, monospace', background: 'rgba(6,182,212,0.06)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(6,182,212,0.2)', letterSpacing: '0.5px' }}>🚗 {c.vehiclePlate}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>📍 {c.location}</div>
                                <div style={{ fontSize: 13, color: '#64748b', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                                    <span>🌐 {c.lat?.toFixed(4)}, {c.lng?.toFixed(4)}</span>
                                    <span>👥 {c.victims || 1} victims</span>
                                    <span>⏰ {new Date(c.timestamp).toLocaleTimeString('en-IN')}</span>
                                </div>
                                {c.notes && <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>📝 {c.notes}</div>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                                <button onClick={() => onAcceptCrash(c)} className="btn btn-danger" style={{ fontSize: 13 }}>
                                    🚑 Respond
                                </button>
                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                                    🗺️ Navigate
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Responding incidents */}
            {responding.length > 0 && (
                <>
                    <div className="section-header"><div className="section-title">🟡 En Route ({responding.length})</div></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {responding.map(c => (
                            <div key={c.id} className="glass-card" style={{ padding: 18, borderColor: 'rgba(245,158,11,0.2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>📍 {c.location}</div>
                                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Ambulance: {c.assignedAmbulance || 'Unassigned'} • {c.victims || 1} victims</div>
                                    </div>
                                    <span className="badge badge-responding">Responding</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ── My Incidents ─────────────────────────────────────────────────────
function MyIncidents({ crashes, onUpdateStatus }) {
    const myIncidents = crashes.filter(c => c.status !== 'active');

    return (
        <div>
            <div className="section-header" style={{ marginBottom: 20 }}>
                <div className="section-title">My Dispatches</div>
            </div>
            <div className="glass-card" style={{ padding: 24 }}>
                {myIncidents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No dispatches yet</div>
                ) : (
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
                            {myIncidents.map(c => (
                                <tr key={c.id}>
                                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
                                        {new Date(c.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                    </td>
                                    <td style={{ minWidth: 160 }}>
                                        {c.userName ? (
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{c.userName}</div>
                                                <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                                                    {c.userPhone && <a href={`tel:${c.userPhone}`} style={{ fontSize: 11, color: '#06b6d4', textDecoration: 'none', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{c.userPhone}</a>}
                                                    {c.userBloodGroup && <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '1px 6px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)' }}>{c.userBloodGroup}</span>}
                                                    {c.vehiclePlate && <span style={{ fontSize: 10, fontWeight: 700, color: '#06b6d4', background: 'rgba(6,182,212,0.06)', padding: '1px 6px', borderRadius: 10, border: '1px solid rgba(6,182,212,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>{c.vehiclePlate}</span>}
                                                </div>
                                            </div>
                                        ) : <span style={{ color: '#475569', fontSize: 12 }}>Unknown</span>}
                                    </td>
                                    <td style={{ color: '#f1f5f9', fontWeight: 500, fontSize: 13 }}>{c.location}</td>
                                    <td><span className={`badge badge-${c.severity}`}>{c.severity}</span></td>
                                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                                    <td>
                                        {c.status === 'responding' && (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button onClick={() => onUpdateStatus(c.id, 'at_scene')} className="btn btn-sm" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, fontSize: 12, cursor: 'pointer', padding: '6px 12px', fontFamily: 'Inter' }}>At Scene</button>
                                                <button onClick={() => onUpdateStatus(c.id, 'resolved')} className="btn btn-success btn-sm">Resolve</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// Helper normalizers (same as HospitalDashboard)
const normalizeCrash = (c) => ({
    id: c.id, lat: c.lat, lng: c.lng, severity: c.severity,
    deviceId: c.device_id, location: c.location, timestamp: c.created_at,
    status: c.status, assignedAmbulance: c.assigned_ambulance,
    respondedAt: c.responded_at, resolvedAt: c.resolved_at,
    victims: c.victims, notes: c.notes,
    is_sos: c.is_sos, is_demo: c.is_demo,
    // Victim info
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

// ── Main Ambulance Dashboard ─────────────────────────────────────────
export default function AmbulanceDashboard() {
    const { user } = useAuth();
    const { crashes: socketCrashes, newCrashAlert, dismissAlert } = useSocket();
    const [crashes, setCrashesLocal] = useState([]);
    const [ambulances, setAmbulances] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [loading, setLoading] = useState(true);

    const myAmbulance = ambulances.find(a => a.callSign === user?.callSign) || ambulances[0];

    const fetchAll = async () => {
        try {
            const [crashRes, ambRes, hospRes] = await Promise.all([
                supabase.from('crashes').select('*').order('created_at', { ascending: false }),
                supabase.from('ambulances').select('*'),
                supabase.from('hospitals').select('*'),
            ]);
            if (crashRes.error) throw crashRes.error;
            if (ambRes.error) throw ambRes.error;
            if (hospRes.error) throw hospRes.error;
            setCrashesLocal((crashRes.data || []).map(normalizeCrash));
            setAmbulances((ambRes.data || []).map(normalizeAmbulance));
            setHospitals((hospRes.data || []).map(normalizeHospital));
        } catch { toast.error('Failed to load data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    useEffect(() => {
        if (socketCrashes.length) {
            setCrashesLocal(prev => {
                const ids = new Set(prev.map(c => c.id));
                const newOnes = socketCrashes.filter(c => !ids.has(c.id));
                return newOnes.length ? [...newOnes, ...prev] : prev;
            });
        }
    }, [socketCrashes]);

    const handleAcceptCrash = async (crash) => {
        try {
            const { error } = await supabase.from('crashes').update({
                status: 'responding',
                assigned_ambulance: myAmbulance?.callSign || 'AMB-001',
                responded_at: new Date().toISOString(),
            }).eq('id', crash.id);
            if (error) throw error;
            if (myAmbulance) {
                await supabase.from('ambulances').update({ status: 'responding' }).eq('id', myAmbulance.id);
            }
            toast.success(`🚨 Responding to crash at ${crash.location}`);
            fetchAll();
        } catch { toast.error('Failed to accept crash'); }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            const updateFields = { status };
            if (status === 'resolved') updateFields.resolved_at = new Date().toISOString();
            const { error } = await supabase.from('crashes').update(updateFields).eq('id', id);
            if (error) throw error;
            toast.success(`Status updated: ${status}`);
            fetchAll();
        } catch { toast.error('Update failed'); }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#060b14' }}>
                <div style={{ textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto 16px' }} /><div style={{ color: '#64748b', fontSize: 14 }}>Loading...</div></div>
            </div>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar role="ambulance" />
            <div className="main-content">
                <Routes>
                    <Route path="/" element={
                        <>
                            <Topbar title="Ambulance Dashboard" subtitle={`${crashes.filter(c => c.status === 'active').length} crashes need response`} />
                            <div className="page-content">
                                <AmbOverview crashes={crashes} myAmbulance={myAmbulance} onAcceptCrash={handleAcceptCrash} />
                            </div>
                        </>
                    } />
                    <Route path="/dispatch" element={
                        <>
                            <Topbar title="Dispatch Map" subtitle="Real-time crash locations" />
                            <div className="page-content">
                                <div className="glass-card">
                                    <Suspense fallback={<div style={{ height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>}>
                                        <MapView crashes={crashes} ambulances={ambulances} hospitals={hospitals} height={600} />
                                    </Suspense>
                                </div>
                                {/* Active crashes below map */}
                                <div style={{ marginTop: 20 }}>
                                    <div className="section-header"><div className="section-title">🚨 Active Crashes</div></div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {crashes.filter(c => c.status === 'active').map(c => (
                                            <div key={c.id} className="glass-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'rgba(239,68,68,0.25)' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>📍 {c.location}</div>
                                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>Severity: <span style={{ color: c.severity === 'high' ? '#ef4444' : '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>{c.severity}</span> • {c.victims} victims</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button onClick={() => handleAcceptCrash(c)} className="btn btn-danger btn-sm">🚑 Respond</button>
                                                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Navigate</a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    } />
                    <Route path="/incidents" element={
                        <>
                            <Topbar title="My Dispatches" />
                            <div className="page-content">
                                <MyIncidents crashes={crashes} onUpdateStatus={handleUpdateStatus} />
                            </div>
                        </>
                    } />
                    <Route path="/history" element={
                        <>
                            <Topbar title="Dispatch History" />
                            <div className="page-content">
                                <div className="glass-card" style={{ padding: 24 }}>
                                    <table className="data-table">
                                        <thead><tr><th>Date</th><th>Location</th><th>Severity</th><th>Status</th><th>Response Time</th></tr></thead>
                                        <tbody>
                                            {crashes.map(c => (
                                                <tr key={c.id}>
                                                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#64748b' }}>{new Date(c.timestamp).toLocaleString('en-IN')}</td>
                                                    <td style={{ color: '#f1f5f9', fontWeight: 500 }}>{c.location}</td>
                                                    <td><span className={`badge badge-${c.severity}`}>{c.severity}</span></td>
                                                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                                                    <td style={{ color: '#10b981', fontWeight: 600 }}>
                                                        {c.respondedAt ? `${Math.round((new Date(c.respondedAt) - new Date(c.timestamp)) / 60000)} min` : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    } />
                </Routes>
            </div>

            {/* New crash alert modal */}
            {newCrashAlert && (
                <CrashAlertModal
                    crash={newCrashAlert}
                    onDismiss={dismissAlert}
                    onRespond={handleAcceptCrash}
                />
            )}
        </div>
    );
}
