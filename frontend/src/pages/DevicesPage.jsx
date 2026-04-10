import React, { useState, useEffect, useRef } from 'react';
import {
    Cpu, Zap, AlertTriangle, CheckCircle, RefreshCw, Plus, Smartphone,
    Wifi, WifiOff, Package, Trash2, ChevronRight, Info, MapPin, User,
    Clock, Shield, PlayCircle, XCircle, Copy, Check,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const API = 'http://localhost:3001';

// ─── Utility: copy to clipboard ──────────────────────────────────────────────
function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };
    return (
        <button onClick={copy} title="Copy" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: copied ? '#10b981' : '#64748b', padding: '2px 4px',
            transition: 'color 0.2s', display: 'inline-flex', alignItems: 'center',
        }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
    );
}

// ─── Device Card ─────────────────────────────────────────────────────────────
function DeviceCard({ device, onSimulate, onDelete, simulatingId }) {
    const isVirtual = device.is_virtual;
    const isActive = device.is_active;
    const isSim = simulatingId === device.device_id;

    return (
        <div style={{
            padding: '20px 22px',
            background: isVirtual ? 'rgba(59,130,246,0.04)' : 'rgba(16,185,129,0.04)',
            border: `1px solid ${isVirtual ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)'}`,
            borderRadius: 16,
            transition: 'all 0.2s',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* colored left bar */}
            <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                background: isVirtual
                    ? 'linear-gradient(180deg, #3b82f6, #06b6d4)'
                    : 'linear-gradient(180deg, #10b981, #3b82f6)',
                borderRadius: '3px 0 0 3px',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: isVirtual ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {isVirtual
                            ? <Smartphone size={20} color="#3b82f6" />
                            : <Cpu size={20} color="#10b981" />}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>
                            {device.device_name || device.device_id}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                            <code style={{
                                fontSize: 11, color: isVirtual ? '#3b82f6' : '#10b981',
                                background: isVirtual ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                                padding: '1px 6px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace',
                            }}>
                                {device.device_id}
                            </code>
                            <CopyButton text={device.device_id} />
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{
                        padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                        background: isVirtual ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                        color: isVirtual ? '#3b82f6' : '#10b981',
                        border: `1px solid ${isVirtual ? 'rgba(59,130,246,0.3)' : 'rgba(16,185,129,0.3)'}`,
                    }}>
                        {isVirtual ? '🖥️ Virtual' : '📡 ESP32'}
                    </span>
                    <span style={{
                        padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                        background: isActive ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                        color: isActive ? '#10b981' : '#64748b',
                        border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(100,116,139,0.2)'}`,
                    }}>
                        {isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>

            {/* Meta */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                {device.vehicle_plate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}>
                        <span style={{ color: '#64748b' }}>Plate:</span>
                        <strong style={{ color: '#f59e0b', letterSpacing: '1px' }}>{device.vehicle_plate}</strong>
                    </div>
                )}
                {device.user_id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' }}>
                        <User size={11} color="#64748b" />
                        <span style={{ color: '#64748b' }}>Paired:</span>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>Yes ✓</span>
                    </div>
                )}
                {!device.user_id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                        <WifiOff size={11} color="#f59e0b" />
                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>Not paired to any user</span>
                    </div>
                )}
                <div style={{ fontSize: 12, color: '#475569' }}>
                    Added {new Date(device.created_at).toLocaleDateString('en-IN')}
                </div>
            </div>

            {/* Action: Simulate crash */}
            <div style={{ display: 'flex', gap: 8 }}>
                <button
                    id={`simulate-${device.device_id}`}
                    onClick={() => onSimulate(device)}
                    disabled={isSim}
                    style={{
                        flex: 1, height: 38, borderRadius: 10, border: 'none', cursor: isSim ? 'not-allowed' : 'pointer',
                        background: isSim ? 'rgba(100,116,139,0.2)' : 'rgba(239,68,68,0.12)',
                        color: isSim ? '#64748b' : '#ef4444',
                        fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        border: `1px solid ${isSim ? 'rgba(100,116,139,0.2)' : 'rgba(239,68,68,0.3)'}`,
                        transition: 'all 0.2s',
                    }}
                >
                    {isSim
                        ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Simulating...</>
                        : <><Zap size={14} /> Simulate Crash + Alert Phone</>}
                </button>
                <button
                    onClick={() => onDelete(device.device_id)}
                    title="Remove device"
                    style={{
                        width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(100,116,139,0.2)',
                        background: 'rgba(100,116,139,0.06)', cursor: 'pointer',
                        color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                    onMouseOut={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(100,116,139,0.2)'; }}
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {!device.user_id && (
                <div style={{
                    marginTop: 10, padding: '8px 12px', background: 'rgba(245,158,11,0.06)',
                    border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8,
                    fontSize: 11.5, color: '#f59e0b', lineHeight: 1.5,
                }}>
                    ⚠️ <strong>FCM alert won't fire</strong> — open the mobile app and go to <em>Devices → Pair Device</em> and enter this Device ID (<code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '0 4px', borderRadius: 3 }}>{device.device_id}</code>) to link it to your phone.
                </div>
            )}
        </div>
    );
}

// ─── Simulator Controls ───────────────────────────────────────────────────────
function CrashSimulatorPanel({ devices, onSimulate, simulatingId }) {
    const [selectedId, setSelectedId] = useState('');
    const [customLat, setCustomLat] = useState('19.0760');
    const [customLng, setCustomLng] = useState('72.8777');
    const [severity, setSeverity] = useState('high');
    const [location, setLocation] = useState('Andheri West, Mumbai');
    const [useUserLocation, setUseUserLocation] = useState(false);
    const [lastResult, setLastResult] = useState(null);

    useEffect(() => {
        if (devices.length > 0 && !selectedId) setSelectedId(devices[0].device_id);
    }, [devices]);

    const getUserLocation = () => {
        if (!navigator.geolocation) return toast.error('Geolocation not supported');
        navigator.geolocation.getCurrentPosition(
            pos => {
                setCustomLat(pos.coords.latitude.toFixed(5));
                setCustomLng(pos.coords.longitude.toFixed(5));
                setLocation('Your Current Location');
                setUseUserLocation(true);
                toast.success('📍 Using your current GPS location');
            },
            () => toast.error('Could not get your location'),
        );
    };

    const handleSimulate = async () => {
        if (!selectedId) return toast.error('Select a device first');
        const device = devices.find(d => d.device_id === selectedId);
        const result = await onSimulate(device, {
            lat: parseFloat(customLat),
            lng: parseFloat(customLng),
            severity,
            location,
        });
        setLastResult(result);
    };

    return (
        <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Zap size={20} color="#ef4444" />
                </div>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 17 }}>Crash Simulator</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Simulate a crash — fires FCM push alert to the paired phone</div>
                </div>
            </div>

            <div style={{
                margin: '16px 0', padding: '10px 14px',
                background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 10, fontSize: 12.5, color: '#94a3b8', lineHeight: 1.6,
            }}>
                🔔 <strong style={{ color: '#f1f5f9' }}>How it works:</strong> Clicking "Simulate Crash" will:
                <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                    <li>Create a real crash record in Supabase (shows on map + dashboard)</li>
                    <li>Emit a Socket.io event (crash alert modal pops on dashboard)</li>
                    <li><strong style={{ color: '#ef4444' }}>Fire an FCM push notification to the paired phone</strong></li>
                    <li>Phone shows <em>"🚨 CRASH DETECTED"</em> screen with 15-second countdown</li>
                    <li>If user doesn't press "I'm OK", ambulance is AUTO-DISPATCHED after 15s</li>
                </ol>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Device selector */}
                <div>
                    <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                        <Cpu size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        Select Device
                    </label>
                    <select
                        value={selectedId}
                        onChange={e => setSelectedId(e.target.value)}
                        style={{
                            width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)', color: '#f1f5f9',
                            padding: '0 12px', fontFamily: 'Inter, sans-serif', fontSize: 13,
                        }}
                    >
                        <option value="">— Select device —</option>
                        {devices.map(d => (
                            <option key={d.device_id} value={d.device_id} style={{ background: '#0d1526' }}>
                                {d.device_name || d.device_id} ({d.device_id})
                                {d.user_id ? ' ✓ Paired' : ' ⚠ Unpaired'}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Severity */}
                <div>
                    <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                        <AlertTriangle size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        Severity
                    </label>
                    <select
                        value={severity}
                        onChange={e => setSeverity(e.target.value)}
                        style={{
                            width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)', color: '#f1f5f9',
                            padding: '0 12px', fontFamily: 'Inter, sans-serif', fontSize: 13,
                        }}
                    >
                        <option value="high" style={{ background: '#0d1526' }}>🔴 High</option>
                        <option value="medium" style={{ background: '#0d1526' }}>🟡 Medium</option>
                        <option value="low" style={{ background: '#0d1526' }}>🟢 Low</option>
                    </select>
                </div>

                {/* Lat */}
                <div>
                    <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                        <MapPin size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        Latitude
                    </label>
                    <input
                        value={customLat}
                        onChange={e => setCustomLat(e.target.value)}
                        style={{
                            width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)', color: '#f1f5f9',
                            padding: '0 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* Lng */}
                <div>
                    <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                        <MapPin size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        Longitude
                    </label>
                    <input
                        value={customLng}
                        onChange={e => setCustomLng(e.target.value)}
                        style={{
                            width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)', color: '#f1f5f9',
                            padding: '0 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, boxSizing: 'border-box',
                        }}
                    />
                </div>
            </div>

            {/* Location label */}
            <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Location Label (shown in alerts)
                </label>
                <input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    style={{
                        width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)', color: '#f1f5f9',
                        padding: '0 12px', fontFamily: 'Inter, sans-serif', fontSize: 13, boxSizing: 'border-box',
                    }}
                />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
                <button
                    onClick={getUserLocation}
                    style={{
                        height: 44, borderRadius: 10, border: '1px solid rgba(6,182,212,0.3)',
                        background: 'rgba(6,182,212,0.06)', color: '#06b6d4',
                        fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        padding: '0 16px', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                    }}
                >
                    <MapPin size={14} /> My Location
                </button>

                <button
                    id="btn-simulate-crash"
                    onClick={handleSimulate}
                    disabled={!selectedId || simulatingId !== null}
                    style={{
                        flex: 1, height: 44, borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: simulatingId ? 'rgba(100,116,139,0.2)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                        color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: simulatingId ? 'none' : '0 4px 16px rgba(239,68,68,0.3)',
                        transition: 'all 0.2s',
                    }}
                >
                    {simulatingId
                        ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Simulating...</>
                        : <><Zap size={16} /> 🚨 Simulate Crash &amp; Alert Phone</>}
                </button>
            </div>

            {/* Result */}
            {lastResult && (
                <div style={{
                    marginTop: 14, padding: '12px 16px',
                    background: lastResult.success ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                    border: `1px solid ${lastResult.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    borderRadius: 10, fontSize: 13,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontWeight: 700 }}>
                        {lastResult.success
                            ? <CheckCircle size={15} color="#10b981" />
                            : <XCircle size={15} color="#ef4444" />}
                        <span style={{ color: lastResult.success ? '#10b981' : '#ef4444' }}>
                            {lastResult.success ? 'Simulation Successful!' : 'Simulation Failed'}
                        </span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 12.5, lineHeight: 1.5 }}>{lastResult.message}</div>
                    {lastResult.crash_id && (
                        <div style={{ marginTop: 6, fontSize: 11.5, color: '#475569' }}>
                            Crash ID: <code style={{ color: '#06b6d4', fontFamily: 'monospace' }}>{lastResult.crash_id}</code>
                        </div>
                    )}
                    {lastResult.fcm_sent === false && lastResult.device_owner_found === false && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#f59e0b' }}>
                            💡 Tip: Pair this device in the mobile app to receive push notifications.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Add Virtual Device Form ──────────────────────────────────────────────────
function AddVirtualDeviceForm({ onAdded }) {
    const [deviceId, setDeviceId] = useState('');
    const [name, setName] = useState('');
    const [plate, setPlate] = useState('');
    const [loading, setLoading] = useState(false);

    const PRESETS = [
        { id: 'JDC-VIRTUAL-001', name: 'Virtual Car 1', plate: 'MH-12-AB-1234' },
        { id: 'JDC-VIRTUAL-002', name: 'Virtual Bike 1', plate: 'MH-04-CD-5678' },
        { id: 'JDC-TEST-001', name: 'Test Device Alpha', plate: '' },
        { id: 'DEMO-DEVICE-001', name: 'Demo ESP32 Sim', plate: 'DL-01-EF-9012' },
    ];

    const submit = async (e) => {
        e.preventDefault();
        if (!deviceId.trim()) return toast.error('Device ID is required');
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/devices/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_id: deviceId.trim().toUpperCase(),
                    device_name: name.trim() || `Virtual Device (${deviceId.trim()})`,
                    vehicle_plate: plate.trim() || null,
                    is_virtual: true,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);
            toast.success(`✅ Virtual device "${data.data.device_name}" registered!`);
            setDeviceId(''); setName(''); setPlate('');
            onAdded();
        } catch (err) {
            toast.error(err.message || 'Failed to add device');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={20} color="#3b82f6" />
                </div>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 17 }}>Register Virtual Device</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Test without physical hardware</div>
                </div>
            </div>

            {/* Quick Presets */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Quick Presets:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {PRESETS.map(p => (
                        <button
                            key={p.id}
                            onClick={() => { setDeviceId(p.id); setName(p.name); setPlate(p.plate); }}
                            style={{
                                padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(59,130,246,0.3)',
                                background: 'rgba(59,130,246,0.06)', color: '#3b82f6', cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600,
                                transition: 'all 0.15s',
                            }}
                        >
                            {p.id}
                        </button>
                    ))}
                </div>
            </div>

            <form onSubmit={submit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                        <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 5 }}>Device ID *</label>
                        <input
                            value={deviceId}
                            onChange={e => setDeviceId(e.target.value.toUpperCase())}
                            placeholder="JDC-VIRTUAL-001"
                            style={{
                                width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.04)', color: '#f1f5f9',
                                padding: '0 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, boxSizing: 'border-box',
                            }}
                        />
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                            This is what you type in the mobile app to pair.
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 5 }}>Device Name</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="My Virtual Car"
                            style={{
                                width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.04)', color: '#f1f5f9',
                                padding: '0 12px', fontFamily: 'Inter, sans-serif', fontSize: 13, boxSizing: 'border-box',
                            }}
                        />
                    </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 5 }}>Vehicle Plate (Optional)</label>
                    <input
                        value={plate}
                        onChange={e => setPlate(e.target.value.toUpperCase())}
                        placeholder="MH-12-AB-1234"
                        style={{
                            width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.04)', color: '#f1f5f9',
                            padding: '0 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, boxSizing: 'border-box',
                        }}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%', height: 44, borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: loading ? 'rgba(100,116,139,0.2)' : 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                        color: '#fff', fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: loading ? 'none' : '0 4px 16px rgba(59,130,246,0.3)',
                    }}
                >
                    {loading
                        ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Registering...</>
                        : <><Plus size={16} /> Register Virtual Device</>}
                </button>
            </form>
        </div>
    );
}

// ─── How to Pair Guide ────────────────────────────────────────────────────────
function PairingGuide() {
    const steps = [
        {
            n: 1,
            title: 'Create a Virtual Device ID (Dashboard)',
            body: 'Use the "Register Virtual Device" panel (right). Pick a preset like JDC-VIRTUAL-001 or type any unique ID.',
            icon: '🖥️',
        },
        {
            n: 2,
            title: 'Pair in Mobile App → Devices Tab',
            body: 'Open the JDC mobile app → go to the "Devices" tab → tap + → enter the exact same Device ID you created above. This links your phone\'s FCM token to that device.',
            icon: '📱',
        },
        {
            n: 3,
            title: 'Simulate a Crash from Dashboard',
            body: 'Go to the Crash Simulator panel. Select your virtual device, set coordinates, and click "Simulate Crash". Your phone will show a 🚨 CRASH DETECTED screen immediately.',
            icon: '🚨',
        },
        {
            n: 4,
            title: 'Phone shows 15-second countdown',
            body: 'The mobile app shows a countdown screen. If the user taps "I\'m OK", the alert is cancelled. If nobody responds within 15 seconds, emergency contacts are auto-notified and crash status is set to "responding".',
            icon: '⏱️',
        },
        {
            n: 5,
            title: 'With Physical ESP32: use "vehicle_001"',
            body: 'Your firmware uses deviceId = "vehicle_001" by default. Change it in the .ino file and pair that ID in the mobile app. The ESP32 directly writes to Supabase, bypassing the backend.',
            icon: '📡',
        },
    ];

    return (
        <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Info size={20} color="#8b5cf6" />
                </div>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 17 }}>How to Pair &amp; Test (Step by Step)</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Even without physical hardware</div>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {steps.map(s => (
                    <div key={s.n} style={{
                        display: 'flex', gap: 14, padding: '14px 16px',
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 12,
                    }}>
                        <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{s.icon}</div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9', marginBottom: 4 }}>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    width: 20, height: 20, borderRadius: '50%', background: '#8b5cf6',
                                    color: '#fff', fontSize: 11, fontWeight: 800, marginRight: 8,
                                }}>{s.n}</span>
                                {s.title}
                            </div>
                            <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{s.body}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DevicesPage() {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [simulatingId, setSimulatingId] = useState(null);

    const fetchDevices = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/devices`);
            const data = await res.json();
            setDevices(data.data || []);
        } catch (e) {
            toast.error('Failed to load devices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDevices(); }, []);

    const handleSimulate = async (device, overrides = {}) => {
        if (simulatingId) return;
        setSimulatingId(device.device_id);
        try {
            const res = await fetch(`${API}/api/devices/simulate-crash`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_id: device.device_id,
                    lat: overrides.lat ?? 19.0760,
                    lng: overrides.lng ?? 72.8777,
                    severity: overrides.severity ?? 'high',
                    location: overrides.location ?? 'Dashboard Simulation',
                    victims: 1,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(device.user_id ? '🚨 Crash simulated! Push alert sent to phone!' : '🚨 Crash simulated (device not paired — no push sent)');
            } else {
                toast.error(data.message || 'Simulation failed');
            }
            return data;
        } catch (e) {
            toast.error('Simulation failed: ' + e.message);
            return { success: false, message: e.message };
        } finally {
            setSimulatingId(null);
        }
    };

    const handleDelete = async (deviceId) => {
        if (!window.confirm(`Remove device ${deviceId}?`)) return;
        try {
            // We just delete from the supabase devices table directly via backend
            const res = await fetch(`${API}/api/devices/${deviceId}`, { method: 'DELETE' });
            // If DELETE not implemented, just remove from local state
            setDevices(prev => prev.filter(d => d.device_id !== deviceId));
            toast.success('Device removed');
        } catch {
            setDevices(prev => prev.filter(d => d.device_id !== deviceId));
        }
    };

    const virtualDevices = devices.filter(d => d.is_virtual);
    const physicalDevices = devices.filter(d => !d.is_virtual);

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>
                    Devices &amp; Crash Simulator
                </div>
                <div style={{ fontSize: 14, color: '#64748b' }}>
                    Manage paired hardware &amp; virtual devices · Simulate crashes to test mobile push alerts
                </div>
            </div>

            {/* Top row: Guide + Add Virtual */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, marginBottom: 20 }}>
                <PairingGuide />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <AddVirtualDeviceForm onAdded={fetchDevices} />
                    <button
                        onClick={fetchDevices}
                        style={{
                            height: 38, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.03)', color: '#64748b', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
                        }}
                    >
                        <RefreshCw size={13} /> Refresh Devices
                    </button>
                </div>
            </div>

            {/* Crash Simulator Panel */}
            <div style={{ marginBottom: 20 }}>
                <CrashSimulatorPanel
                    devices={devices}
                    onSimulate={handleSimulate}
                    simulatingId={simulatingId}
                />
            </div>

            {/* Device Lists */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    Loading devices...
                </div>
            ) : (
                <>
                    {/* Virtual Devices */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <Smartphone size={15} color="#3b82f6" />
                            <span style={{ fontWeight: 700, fontSize: 14, color: '#94a3b8' }}>
                                Virtual Devices ({virtualDevices.length})
                            </span>
                            <span style={{ fontSize: 12, color: '#475569' }}>— for testing without hardware</span>
                        </div>
                        {virtualDevices.length === 0 ? (
                            <div style={{
                                padding: '24px', border: '1px dashed rgba(59,130,246,0.2)',
                                borderRadius: 14, textAlign: 'center', color: '#475569', fontSize: 13,
                            }}>
                                No virtual devices yet. Add one using the form above.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 14 }}>
                                {virtualDevices.map(d => (
                                    <DeviceCard
                                        key={d.device_id}
                                        device={d}
                                        onSimulate={handleSimulate}
                                        onDelete={handleDelete}
                                        simulatingId={simulatingId}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Physical Devices */}
                    {physicalDevices.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <Cpu size={15} color="#10b981" />
                                <span style={{ fontWeight: 700, fontSize: 14, color: '#94a3b8' }}>
                                    Physical ESP32 Devices ({physicalDevices.length})
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 14 }}>
                                {physicalDevices.map(d => (
                                    <DeviceCard
                                        key={d.device_id}
                                        device={d}
                                        onSimulate={handleSimulate}
                                        onDelete={handleDelete}
                                        simulatingId={simulatingId}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
