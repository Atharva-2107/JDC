import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
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

const createGpsDeviceIcon = () => L.divIcon({
    html: `<div style="width:30px;height:30px;background:#06b6d4;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 16px rgba(6,182,212,0.5);">📡</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    className: '',
});

const createUserLocationIcon = () => L.divIcon({
    html: `<div style="width:20px;height:20px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 6px rgba(59,130,246,0.25), 0 0 16px rgba(59,130,246,0.4);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    className: '',
});

const getSeverityColor = (s) => s === 'high' ? '#ef4444' : s === 'medium' ? '#f59e0b' : '#10b981';
const getStatusBadge = (status) => ({ active: '#ef4444', responding: '#f59e0b', resolved: '#10b981' }[status] || '#64748b');

// Auto-center component: flies to the latest active crash, or user's location
function AutoCenter({ crashes, userLocation }) {
    const map = useMap();

    useEffect(() => {
        const activeCrashes = crashes.filter(c => c.status === 'active' && c.lat && c.lng);
        if (activeCrashes.length > 0) {
            const latest = activeCrashes[0];
            map.flyTo([latest.lat, latest.lng], 15, { duration: 1.5 });
        } else if (userLocation) {
            map.flyTo(userLocation, 13, { duration: 1.5 });
        }
    }, [crashes, userLocation, map]);

    return null;
}

// Component that gets browser geolocation and updates map center
function GeolocateUser({ onLocationFound }) {
    const map = useMap();

    useEffect(() => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const loc = [pos.coords.latitude, pos.coords.longitude];
                onLocationFound(loc);
                // Only center if no other center logic has kicked in
                map.setView(loc, map.getZoom());
            },
            (err) => {
                console.log('Geolocation error:', err.message);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, [map, onLocationFound]);

    return null;
}

export default function MapView({ crashes = [], ambulances = [], hospitals = [], gpsLocations = [], height = 500, center, autoCenter = false, useGeolocation = false }) {
    const [userLocation, setUserLocation] = useState(null);

    // Determine the best initial center
    const activeCrashes = crashes.filter(c => c.status === 'active' && c.lat && c.lng);
    const allCrashes = crashes.filter(c => c.lat && c.lng);

    let mapCenter;
    let initialZoom;

    if (activeCrashes.length > 0) {
        mapCenter = [activeCrashes[0].lat, activeCrashes[0].lng];
        initialZoom = 14;
    } else if (allCrashes.length > 0) {
        mapCenter = [allCrashes[0].lat, allCrashes[0].lng];
        initialZoom = 12;
    } else if (center) {
        mapCenter = center;
        initialZoom = 13;
    } else {
        // Fallback — will be overridden by geolocation
        mapCenter = [19.076, 72.8777];
        initialZoom = 12;
    }

    return (
        <div className="map-container" style={{ height }}>
            <MapContainer
                center={mapCenter}
                zoom={initialZoom}
                style={{ height: '100%', width: '100%', background: '#0a1120' }}
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    className="dark-map-tiles"
                />

                {/* Geolocation — centers map on user's real location */}
                {useGeolocation && <GeolocateUser onLocationFound={setUserLocation} />}

                {/* Auto-center on latest active crash if enabled */}
                {autoCenter && <AutoCenter crashes={crashes} userLocation={userLocation} />}

                {/* User's live location marker */}
                {userLocation && (
                    <Marker position={userLocation} icon={createUserLocationIcon()}>
                        <Popup>
                            <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 160 }}>
                                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6, color: '#3b82f6' }}>📍 Your Location</div>
                                <div style={{ fontSize: 12, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>
                                    {userLocation[0].toFixed(6)}, {userLocation[1].toFixed(6)}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                )}

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
                                        <div><strong>GPS:</strong> <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{crash.lat?.toFixed(6)}, {crash.lng?.toFixed(6)}</span></div>
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

                {/* GPS device markers (live tracking) */}
                {gpsLocations.map((gps) => (
                    <React.Fragment key={gps.id || gps.device_id}>
                        <Marker position={[gps.latitude, gps.longitude]} icon={createGpsDeviceIcon()}>
                            <Popup>
                                <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 200 }}>
                                    <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8, color: '#06b6d4' }}>📡 GPS Device</div>
                                    <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.7 }}>
                                        <div><strong>Device:</strong> {gps.device_id}</div>
                                        <div><strong>Position:</strong> <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>{gps.latitude?.toFixed(6)}, {gps.longitude?.toFixed(6)}</span></div>
                                        <div><strong>Accuracy:</strong> {gps.accuracy?.toFixed(1)} HDOP</div>
                                        <div><strong>Satellites:</strong> {gps.satellites}</div>
                                        <div><strong>Last update:</strong> {new Date(gps.created_at).toLocaleTimeString('en-IN')}</div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                        <Circle center={[gps.latitude, gps.longitude]} radius={200} pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.05, weight: 1, dashArray: '3,6' }} />
                    </React.Fragment>
                ))}
            </MapContainer>
        </div>
    );
}
