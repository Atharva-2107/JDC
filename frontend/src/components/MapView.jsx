import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default icon issue with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createCrashIcon = (severity) => L.divIcon({
    html: `<div style="width:36px;height:36px;background:${severity === 'high' ? '#ef4444' : severity === 'medium' ? '#f59e0b' : '#10b981'};border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 20px ${severity === 'high' ? 'rgba(239,68,68,0.6)' : 'rgba(245,158,11,0.5)'};">💥</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    className: '',
});

const createAmbulanceIcon = () => L.divIcon({
    html: `<div style="width:34px;height:34px;background:#3b82f6;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 0 16px rgba(59,130,246,0.5);">🚑</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    className: '',
});

const createHospitalIcon = () => L.divIcon({
    html: `<div style="width:34px;height:34px;background:#8b5cf6;border:3px solid #fff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 0 16px rgba(139,92,246,0.5);">🏥</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    className: '',
});

const getSeverityColor = (s) => s === 'high' ? '#ef4444' : s === 'medium' ? '#f59e0b' : '#10b981';
const getStatusBadge = (status) => ({ active: '#ef4444', responding: '#f59e0b', resolved: '#10b981' }[status] || '#64748b');

export default function MapView({ crashes = [], ambulances = [], hospitals = [], height = 500, center = [18.5204, 73.8567] }) {
    return (
        <div className="map-container" style={{ height }}>
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%', background: '#0a1120' }}
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    className="dark-map-tiles"
                />

                {/* Crash markers */}
                {crashes.map((crash) => (
                    <React.Fragment key={crash.id}>
                        <Marker position={[crash.lat, crash.lng]} icon={createCrashIcon(crash.severity)}>
                            <Popup>
                                <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 220 }}>
                                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8, color: '#1a1a2e' }}>
                                        💥 Crash Detected
                                    </div>
                                    <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.6 }}>
                                        <div><strong>Location:</strong> {crash.location}</div>
                                        <div><strong>Severity:</strong> <span style={{ color: getSeverityColor(crash.severity), fontWeight: 700, textTransform: 'uppercase' }}>{crash.severity}</span></div>
                                        <div><strong>Status:</strong> <span style={{ color: getStatusBadge(crash.status), fontWeight: 600, textTransform: 'capitalize' }}>{crash.status}</span></div>
                                        <div><strong>Device:</strong> {crash.deviceId}</div>
                                        <div><strong>Time:</strong> {new Date(crash.timestamp).toLocaleTimeString('en-IN')}</div>
                                        {crash.victims && <div><strong>Victims:</strong> {crash.victims}</div>}
                                        {crash.assignedAmbulance && <div><strong>Ambulance:</strong> {crash.assignedAmbulance}</div>}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                        {/* Radius circle for active crashes */}
                        {crash.status === 'active' && (
                            <Circle center={[crash.lat, crash.lng]} radius={500} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.06, weight: 1.5, dashArray: '5,5' }} />
                        )}
                    </React.Fragment>
                ))}

                {/* Ambulance markers */}
                {ambulances.map((amb) => (
                    <Marker key={amb.id} position={[amb.lat, amb.lng]} icon={createAmbulanceIcon()}>
                        <Popup>
                            <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 200 }}>
                                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>🚑 {amb.callSign}</div>
                                <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.7 }}>
                                    <div><strong>Driver:</strong> {amb.driver}</div>
                                    <div><strong>Status:</strong> <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{amb.status}</span></div>
                                    {amb.assignedHospital && <div><strong>Hospital:</strong> {amb.assignedHospital}</div>}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Hospital markers */}
                {hospitals.map((hosp) => (
                    <Marker key={hosp.id} position={[hosp.lat, hosp.lng]} icon={createHospitalIcon()}>
                        <Popup>
                            <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 220 }}>
                                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>🏥 {hosp.name}</div>
                                <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.7 }}>
                                    <div><strong>Available Beds:</strong> {hosp.availableBeds} / {hosp.totalBeds}</div>
                                    <div><strong>ICU Available:</strong> {hosp.availableIcuBeds} / {hosp.icuBeds}</div>
                                    <div><strong>Status:</strong> <span style={{ color: hosp.status === 'accepting' ? '#10b981' : '#f59e0b', fontWeight: 700, textTransform: 'capitalize' }}>{hosp.status}</span></div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
