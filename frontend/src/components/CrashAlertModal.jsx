import React from 'react';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle, Clock, MapPin, Cpu, Users, X, Truck, CheckCircle, Phone, Droplets, Car, User } from 'lucide-react';

const crashMarkerIcon = L.divIcon({
    html: `<div style="width:26px;height:26px;background:var(--red, #e63946);border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 0 12px rgba(230,57,70,0.6);"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    className: '',
});

// ── Victim Info Panel ─────────────────────────────────────────────────────────
function VictimInfoPanel({ crash }) {
    const hasVictimInfo = crash.userName || crash.userPhone || crash.userBloodGroup || crash.vehiclePlate;
    if (!hasVictimInfo) return null;

    return (
        <div style={{
            background: 'rgba(230,57,70,0.04)',
            border: '1px solid rgba(230,57,70,0.2)',
            borderRadius: 'var(--r-md)',
            padding: '14px 16px',
            marginBottom: 16,
        }}>
            <div style={{
                fontSize: 10.5, color: 'var(--red)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 6,
            }}>
                <User size={11} />
                Victim Information
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: crash.userPhone || crash.userBloodGroup || crash.vehiclePlate ? 12 : 0 }}>
                {/* Avatar */}
                <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(230,57,70,0.12)',
                    border: '1px solid rgba(230,57,70,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 800, color: 'var(--red)',
                    flexShrink: 0,
                }}>
                    {crash.userName ? crash.userName[0].toUpperCase() : '?'}
                </div>
                <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                        {crash.userName || 'Unknown User'}
                    </div>
                    {crash.userPhone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--text-2)', marginTop: 2 }}>
                            <Phone size={11} color="var(--text-3)" />
                            <a href={`tel:${crash.userPhone}`} style={{ color: 'var(--blue-light)', textDecoration: 'none', fontWeight: 600 }}>
                                {crash.userPhone}
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Tags row */}
            {(crash.userBloodGroup || crash.vehiclePlate) && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {crash.userBloodGroup && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 100,
                            background: 'rgba(230,57,70,0.08)',
                            border: '1px solid rgba(230,57,70,0.25)',
                            fontSize: 12, fontWeight: 700, color: 'var(--red)',
                        }}>
                            <Droplets size={11} />
                            {crash.userBloodGroup}
                        </span>
                    )}
                    {crash.vehiclePlate && (
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 100,
                            background: 'rgba(0,212,255,0.06)',
                            border: '1px solid rgba(0,212,255,0.2)',
                            fontSize: 12, fontWeight: 700, color: 'var(--blue-light)',
                            letterSpacing: '1px', fontFamily: 'JetBrains Mono, monospace',
                        }}>
                            <Car size={11} />
                            {crash.vehiclePlate}
                        </span>
                    )}
                </div>
            )}

            {!crash.userName && !crash.userPhone && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
                    No profile data — device may not be paired to a user account.
                </div>
            )}
        </div>
    );
}

export default function CrashAlertModal({ crash, onDismiss, onRespond }) {
    if (!crash) return null;

    const severityColor = crash.severity === 'high' ? 'var(--red)' : crash.severity === 'medium' ? 'var(--amber)' : 'var(--green)';
    const timeSince = Math.floor((Date.now() - new Date(crash.timestamp)) / 1000);
    const hasCoords = crash.lat && crash.lng;

    return (
        <div className="modal-overlay" onClick={onDismiss}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                {/* SOS Banner */}
                {crash.is_sos && (
                    <div className="modal-sos-banner">
                        <AlertTriangle size={16} />
                        SOS — Manual Emergency Trigger
                    </div>
                )}
                {crash.is_demo && !crash.is_sos && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', marginBottom: 18, background: 'rgba(244,162,97,0.08)', border: '1px solid rgba(244,162,97,0.2)', borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Demo Simulation
                    </div>
                )}

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(230,57,70,0.1)', border: '2px solid rgba(230,57,70,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'sos-pulse 2s ease infinite' }}>
                            <AlertTriangle size={24} color="var(--red)" />
                        </div>
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--red)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>Crash Detected</div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Clock size={12} />
                                {timeSince < 60 ? `${timeSince}s ago` : `${Math.floor(timeSince / 60)}m ago`}
                            </div>
                        </div>
                    </div>
                    <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4, borderRadius: 'var(--r-sm)', display: 'flex', alignItems: 'center' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Severity chip */}
                <div style={{ display: 'flex', marginBottom: 16 }}>
                    <span className={`badge badge-${crash.severity}`} style={{ fontSize: 12 }}>
                        <span className="pulse-dot" />
                        {crash.severity?.toUpperCase()} SEVERITY
                    </span>
                </div>

                {/* ── VICTIM INFO — most important for hospital/ambulance ── */}
                <VictimInfoPanel crash={crash} />

                {/* Mini-map */}
                {hasCoords && (
                    <div style={{ marginBottom: 16, borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)', height: 160 }}>
                        <MapContainer center={[crash.lat, crash.lng]} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} attributionControl={false}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={[crash.lat, crash.lng]} icon={crashMarkerIcon} />
                            <Circle center={[crash.lat, crash.lng]} radius={300} pathOptions={{ color: '#e63946', fillColor: '#e63946', fillOpacity: 0.06, weight: 1.5, dashArray: '5,5' }} />
                        </MapContainer>
                    </div>
                )}

                {/* Details grid */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '16px 18px', marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {[
                            { icon: MapPin, label: 'Location', value: crash.location, mono: false },
                            { icon: Cpu, label: 'Device ID', value: crash.deviceId, mono: true },
                            { icon: MapPin, label: 'GPS Coordinates', value: hasCoords ? `${crash.lat?.toFixed(6)}, ${crash.lng?.toFixed(6)}` : 'No GPS data', mono: true },
                            { icon: Users, label: 'Victims', value: crash.victims || 1 },
                        ].map(({ icon: Icon, label, value, mono }) => (
                            <div key={label}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                                    <Icon size={10} />{label}
                                </div>
                                <div style={{ fontSize: 13.5, color: 'var(--text-1)', fontWeight: 600, fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit', wordBreak: 'break-all' }}>
                                    {value}
                                </div>
                            </div>
                        ))}
                    </div>
                    {crash.notes && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.6 }}>
                            {crash.notes}
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                    {onRespond && (
                        <button onClick={() => { onRespond(crash); onDismiss(); }} className="btn btn-danger" style={{ flex: 1, justifyContent: 'center', padding: '12px', fontSize: 14 }}>
                            <Truck size={16} />
                            Dispatch Ambulance
                        </button>
                    )}
                    <button onClick={onDismiss} className="btn btn-ghost" style={{ flex: onRespond ? '0 0 auto' : 1, padding: '12px 18px', justifyContent: 'center' }}>
                        <CheckCircle size={15} />
                        Acknowledge
                    </button>
                </div>
            </div>
        </div>
    );
}
