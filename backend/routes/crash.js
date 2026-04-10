import express from 'express';
import { sendCrashAlertNotification } from '../fcm-service.js';

const router = express.Router();

// POST /api/crash — receive crash from ESP32, SOS button, or demo inject
router.post('/', async (req, res) => {
    try {
        const {
            lat, lng, severity, device_id, location, victims, notes,
            is_sos, is_demo,
            // User details (passed from mobile app during SOS)
            user_name, user_phone, user_blood_group, vehicle_plate, user_id,
        } = req.body;

        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'lat and lng are required' });
        }

        const crashData = {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            severity: severity || 'high',
            device_id: device_id || (is_sos ? 'SOS-MOBILE' : is_demo ? 'DEMO-INJECT' : 'ESP32-UNKNOWN'),
            location: location || `${parseFloat(lat).toFixed(4)}°N, ${parseFloat(lng).toFixed(4)}°E`,
            status: 'active',
            victims: parseInt(victims) || 1,
            notes: notes || null,
            is_sos: Boolean(is_sos),
            is_demo: Boolean(is_demo),
            // Victim/user info
            user_name: user_name || null,
            user_phone: user_phone || null,
            user_blood_group: user_blood_group || null,
            vehicle_plate: vehicle_plate || null,
            user_id: user_id || null,
        };

        const { data, error } = await req.supabase
            .from('crashes')
            .insert(crashData)
            .select()
            .single();

        if (error) throw error;

        // Normalize for Socket.io broadcast
        const normalized = {
            id: data.id,
            lat: data.lat,
            lng: data.lng,
            severity: data.severity,
            deviceId: data.device_id,
            location: data.location,
            timestamp: data.created_at,
            status: data.status,
            assignedAmbulance: data.assigned_ambulance,
            victims: data.victims,
            notes: data.notes,
            is_sos: data.is_sos,
            is_demo: data.is_demo,
            // Victim info — passed through to hospitals & ambulances
            userName: data.user_name,
            userPhone: data.user_phone,
            userBloodGroup: data.user_blood_group,
            vehiclePlate: data.vehicle_plate,
            userId: data.user_id,
        };

        // Broadcast to all connected hospital/ambulance clients
        req.io.emit('new_crash', normalized);

        console.log(`🚨 Crash recorded: ${data.device_id} @ ${data.lat},${data.lng} [${data.severity}]${data.is_sos ? ' — SOS' : ''}${data.is_demo ? ' — DEMO' : ''}`);

        // --- 🚨 CRUCIAL FIX: Send FCM Push Notification to Mobile App ---
        try {
            if (data.device_id === 'DEMO-INJECT') {
                // If it's the dashboard's "Simulate Crash" button, push to ALL registered test phones
                const { data: tokens } = await req.supabase.from('fcm_tokens').select('user_id');
                if (tokens && tokens.length > 0) {
                    const uniqueUsers = [...new Set(tokens.map(t => t.user_id))];
                    console.log(`📲 [DEMO] Blasting crash push to ${uniqueUsers.length} test phone(s)...`);
                    for (const uid of uniqueUsers) {
                        sendCrashAlertNotification(uid, data.id, data.lat, data.lng).catch(e => console.error("FCM failed:", e));
                    }
                } else {
                    console.warn(`⚠️ [DEMO] No mobile phones have registered FCM tokens. Cannot trigger mobile screen.`);
                }
            } else if (data.user_id) {
                // Real device crash: push exactly to the device owner
                console.log(`📲 Sending crash push to user ${data.user_id}`);
                sendCrashAlertNotification(data.user_id, data.id, data.lat, data.lng).catch(e => console.error("FCM failed:", e));
            } else if (data.device_id !== 'SOS-MOBILE') {
                // Fallback attempt: maybe user_id wasn't passed, lookup from devices table
                const { data: dev } = await req.supabase.from('devices').select('user_id').eq('device_id', data.device_id).maybeSingle();
                if (dev && dev.user_id) {
                    sendCrashAlertNotification(dev.user_id, data.id, data.lat, data.lng).catch(e => {});
                }
            }
        } catch (fcmErr) {
            console.error('FCM Broadcast error (non-fatal):', fcmErr);
        }
        // -------------------------------------------------------------

        res.status(201).json({ success: true, data: normalized });
    } catch (err) {
        console.error('Crash insert error:', err);
        res.status(500).json({ success: false, message: 'Failed to create crash' });
    }
});

// GET /api/crash — list all crashes (optional ?hospital_id= filter)
router.get('/', async (req, res) => {
    try {
        let query = req.supabase
            .from('crashes')
            .select('*')
            .order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch crashes' });
    }
});

// GET /api/crash/:id
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await req.supabase
            .from('crashes')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Crash not found' });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch crash' });
    }
});

// PUT /api/crash/:id — update crash status (with dispatch locking)
router.put('/:id', async (req, res) => {
    try {
        const updates = {};
        if (req.body.status) updates.status = req.body.status;
        if (req.body.assigned_ambulance) updates.assigned_ambulance = req.body.assigned_ambulance;
        if (req.body.responded_by_hospital) updates.responded_by_hospital = req.body.responded_by_hospital;
        if (req.body.status === 'responding') updates.responded_at = new Date().toISOString();
        if (req.body.status === 'resolved') updates.resolved_at = new Date().toISOString();

        // Dispatch locking: if setting to 'responding', only update if still 'active'
        if (req.body.status === 'responding') {
            const { data: current, error: checkErr } = await req.supabase
                .from('crashes')
                .select('status, responded_by_hospital')
                .eq('id', req.params.id)
                .single();

            if (checkErr) throw checkErr;

            if (current.status !== 'active') {
                return res.status(409).json({
                    success: false,
                    message: `Already dispatched by ${current.responded_by_hospital || 'another hospital'}`,
                    respondedBy: current.responded_by_hospital,
                });
            }
        }

        const { data, error } = await req.supabase
            .from('crashes')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        const normalized = {
            id: data.id, lat: data.lat, lng: data.lng, severity: data.severity,
            deviceId: data.device_id, location: data.location, timestamp: data.created_at,
            status: data.status, assignedAmbulance: data.assigned_ambulance,
            respondedByHospital: data.responded_by_hospital,
            victims: data.victims, notes: data.notes,
            is_sos: data.is_sos, is_demo: data.is_demo,
        };
        req.io.emit('crash_updated', normalized);

        res.json({ success: true, data: normalized });
    } catch (err) {
        console.error('Crash update error:', err);
        res.status(500).json({ success: false, message: 'Failed to update crash' });
    }
});

export default router;
