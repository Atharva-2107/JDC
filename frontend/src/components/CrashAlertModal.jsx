import React from 'react';

export default function CrashAlertModal({ crash, onDismiss, onRespond }) {
    if (!crash) return null;

    const severityColor = crash.severity === 'high' ? '#ef4444' : crash.severity === 'medium' ? '#f59e0b' : '#10b981';
    const timeSince = Math.floor((Date.now() - new Date(crash.timestamp)) / 1000);

    return (
        <div className="modal-overlay" onClick={onDismiss}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                {/* Animated alert header */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ fontSize: 56, marginBottom: 8, animation: 'float 2s ease-in-out infinite' }}>🚨</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#ef4444', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        CRASH DETECTED!
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{timeSince < 60 ? `${timeSince} seconds ago` : `${Math.floor(timeSince / 60)} minutes ago`}</div>
                </div>

                {/* Severity bar */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                    <span style={{ padding: '6px 20px', background: `${severityColor}18`, border: `1px solid ${severityColor}50`, borderRadius: 100, fontSize: 13, fontWeight: 700, color: severityColor, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, background: severityColor, borderRadius: '50%', animation: 'blink 1s ease infinite' }} />
                        {crash.severity} SEVERITY
                    </span>
                </div>

                {/* Details grid */}
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20, marginBottom: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {[
                            { label: '📍 Location', value: crash.location },
                            { label: '📡 Device ID', value: crash.deviceId },
                            { label: '🌐 Coordinates', value: `${crash.lat?.toFixed(4)}, ${crash.lng?.toFixed(4)}` },
                            { label: '👥 Victims', value: crash.victims || 'Unknown' },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                                <div style={{ fontSize: 14, color: '#f1f5f9', fontWeight: 600 }}>{value}</div>
                            </div>
                        ))}
                    </div>
                    {crash.notes && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
                            📝 {crash.notes}
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 12 }}>
                    {onRespond && (
                        <button onClick={() => { onRespond(crash); onDismiss(); }} style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 20px rgba(239,68,68,0.3)', transition: 'all 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                            🚑 Dispatch Ambulance
                        </button>
                    )}
                    <button onClick={onDismiss} style={{ flex: onRespond ? '0 0 auto' : 1, padding: '13px 20px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}>
                        Acknowledge
                    </button>
                </div>
            </div>
        </div>
    );
}
