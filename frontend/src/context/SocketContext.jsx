import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { supabase } from '../supabaseClient';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const socketRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [crashes, setCrashes] = useState([]);
    const [newCrashAlert, setNewCrashAlert] = useState(null);
    const [latestCrashUpdate, setLatestCrashUpdate] = useState(null);
    const [ambulanceLocations, setAmbulanceLocations] = useState({});
    const [latestGpsLocations, setLatestGpsLocations] = useState([]);

    // Subscribe to Supabase Realtime for crash inserts + GPS locations
    useEffect(() => {
        if (!user) return;

        // Supabase real-time subscription for new crashes
        const crashChannel = supabase
            .channel('crash_realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'crashes' },
                (payload) => {
                    const crash = payload.new;
                    const normalized = {
                        id: crash.id,
                        lat: crash.lat,
                        lng: crash.lng,
                        severity: crash.severity,
                        deviceId: crash.device_id,
                        location: crash.location,
                        timestamp: crash.created_at,
                        status: crash.status,
                        assignedAmbulance: crash.assigned_ambulance,
                        respondedByHospital: crash.responded_by_hospital,
                        respondedAt: crash.responded_at,
                        resolvedAt: crash.resolved_at,
                        victims: crash.victims,
                        notes: crash.notes,
                        // Victim info
                        userName: crash.user_name,
                        userPhone: crash.user_phone,
                        userBloodGroup: crash.user_blood_group,
                        vehiclePlate: crash.vehicle_plate,
                        userId: crash.user_id,
                    };

                    // ── Only promote to the hospital dashboard if the crash has
                    //    been confirmed by the mobile app (status === 'active').
                    //    'pending_user'  → user still has the 15s window open
                    //    'cancelled'     → user pressed "I'm OK", hospitals must never see it
                    if (crash.status !== 'active') return;

                    setCrashes(prev => [normalized, ...prev]);
                    setNewCrashAlert(normalized);
                    toast.custom((t) => (
                        <div style={{
                            background: '#1a0a0a',
                            border: '1px solid rgba(239,68,68,0.5)',
                            borderRadius: '12px',
                            padding: '16px 20px',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                            maxWidth: 380,
                            boxShadow: '0 0 30px rgba(239,68,68,0.3)',
                            animation: 'slideInRight 0.3s ease',
                            opacity: t.visible ? 1 : 0,
                        }}>
                            <span style={{ fontSize: 24 }}>🚨</span>
                            <div>
                                <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 4 }}>CRASH DETECTED!</div>
                                <div style={{ color: '#94a3b8', fontSize: 13 }}>
                                    {normalized.location || `${normalized.lat?.toFixed(4)}, ${normalized.lng?.toFixed(4)}`} — Severity: <strong style={{ color: normalized.severity === 'high' ? '#ef4444' : '#f59e0b' }}>{normalized.severity?.toUpperCase()}</strong>
                                </div>
                                <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>Device: {normalized.deviceId}</div>
                            </div>
                        </div>
                    ), { duration: 8000, position: 'top-right' });
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'crashes' },
                (payload) => {
                    const crash = payload.new;
                    const normalized = {
                        id: crash.id,
                        lat: crash.lat,
                        lng: crash.lng,
                        severity: crash.severity,
                        deviceId: crash.device_id,
                        location: crash.location,
                        timestamp: crash.created_at,
                        status: crash.status,
                        assignedAmbulance: crash.assigned_ambulance,
                        respondedByHospital: crash.responded_by_hospital,
                        respondedAt: crash.responded_at,
                        resolvedAt: crash.resolved_at,
                        victims: crash.victims,
                        notes: crash.notes,
                    };
                    setCrashes(prev => prev.map(c => c.id === normalized.id ? normalized : c));
                    // 🚀 CRITICAL FIX: Push the update directly to the new dedicated state
                    setLatestCrashUpdate(normalized);
                }
            )
            .subscribe();

        // Supabase real-time subscription for GPS location updates
        const gpsChannel = supabase
            .channel('gps_realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'gps_locations' },
                (payload) => {
                    const gps = payload.new;
                    setLatestGpsLocations(prev => {
                        const filtered = prev.filter(g => g.device_id !== gps.device_id);
                        return [gps, ...filtered];
                    });
                }
            )
            .subscribe();

        // Also connect to Socket.io for ESP32 push events
        const socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('join_role', user.role === 'hospital' || user.role === 'admin' ? 'hospital' : 'ambulance');
        });

        socket.on('disconnect', () => setConnected(false));

        socket.on('new_crash', (crash) => {
            // Only show crashes that have been confirmed by the mobile user
            // (pending_user = 15s window still open, cancelled = user is OK)
            if (crash.status === 'pending_user' || crash.status === 'cancelled') return;
            setCrashes(prev => {
                if (prev.find(c => c.id === crash.id)) return prev;
                return [crash, ...prev];
            });
        });

        socket.on('crash_updated', (updated) => {
            setCrashes(prev => prev.map(c => c.id === updated.id ? updated : c));
            // 🚀 CRITICAL FIX: Also capture WebSocket updates for dashboard UI
            setLatestCrashUpdate(updated);
        });

        socket.on('ambulance_location', (data) => {
            setAmbulanceLocations(prev => ({ ...prev, [data.id]: data }));
        });

        return () => {
            crashChannel.unsubscribe();
            gpsChannel.unsubscribe();
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user]);

    const dismissAlert = () => setNewCrashAlert(null);
    const emit = (event, data) => socketRef.current?.emit(event, data);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, connected, crashes, newCrashAlert, latestCrashUpdate, dismissAlert, ambulanceLocations, latestGpsLocations, emit, setCrashes }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
