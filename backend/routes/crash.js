import express from 'express';
import { sendCrashAlertNotification } from '../fcm-service.js';

const router = express.Router();

// ── Helper: normalize a DB row for socket/API responses ──────────────────────
const normalizeCrash = (data) => ({
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
    userName: data.user_name,
    userPhone: data.user_phone,
    userBloodGroup: data.user_blood_group,
    vehiclePlate: data.vehicle_plate,
    userId: data.user_id,
});

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

        // ──────────────────────────────────────────────────────────────────────
        // KEY: Status starts as 'pending_user' (NOT 'active').
        //
        // The crash is stored silently and the FCM push goes to the device
        // owner's phone. The hospital dashboard is NOT notified yet.
        //
        // Two outcomes:
        //   1. User presses "I'm OK" → PATCH to 'cancelled' (hospitals never see it)
        //   2. 15s countdown elapses → mobile calls POST /api/crash/:id/confirm
        //      which flips to 'active', emits new_crash to hospitals, fires Twilio
        // ──────────────────────────────────────────────────────────────────────
        const initialStatus = (is_demo || is_sos) ? 'pending_user' : 'pending_user';

        const crashData = {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            severity: severity || 'high',
            device_id: device_id || (is_sos ? 'SOS-MOBILE' : is_demo ? 'DEMO-INJECT' : 'ESP32-UNKNOWN'),
            location: location || `${parseFloat(lat).toFixed(4)}°N, ${parseFloat(lng).toFixed(4)}°E`,
            status: initialStatus,
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

        if (error) {
            console.error('🔴 Supabase insert error:', JSON.stringify(error, null, 2));
            return res.status(500).json({ success: false, message: 'Failed to create crash', supabaseError: error });
        }

        // Do NOT broadcast new_crash to hospitals yet — we wait for /confirm
        console.log(`📋 Crash queued (pending_user): ${data.device_id} @ ${data.lat},${data.lng} [${data.severity}] id=${data.id}${data.is_demo ? ' — DEMO' : ''}`);

        // --- Send FCM Push Notification to the device owner's phone ---
        //     This happens immediately so the user sees the 15s screen
        try {
            if (data.device_id === 'DEMO-INJECT') {
                // Dashboard "Simulate Crash" → push to ALL registered phones
                const { data: tokens } = await req.supabase.from('fcm_tokens').select('user_id');
                if (tokens && tokens.length > 0) {
                    const uniqueUsers = [...new Set(tokens.map(t => t.user_id))];
                    console.log(`📲 [DEMO] Blasting crash push to ${uniqueUsers.length} test phone(s)...`);
                    for (const uid of uniqueUsers) {
                        sendCrashAlertNotification(uid, data.id, data.lat, data.lng).catch(e => console.error('FCM failed:', e));
                    }
                } else {
                    console.warn('⚠️ [DEMO] No FCM tokens registered.');
                }
            } else if (data.user_id) {
                console.log(`📲 Sending crash push to user ${data.user_id}`);
                sendCrashAlertNotification(data.user_id, data.id, data.lat, data.lng).catch(e => console.error('FCM failed:', e));
            } else if (data.device_id !== 'SOS-MOBILE') {
                // Fallback: lookup owner from devices table
                const { data: dev } = await req.supabase
                    .from('devices')
                    .select('user_id')
                    .eq('device_id', data.device_id)
                    .maybeSingle();
                if (dev?.user_id) {
                    sendCrashAlertNotification(dev.user_id, data.id, data.lat, data.lng).catch(() => {});
                }
            }
        } catch (fcmErr) {
            console.error('FCM error (non-fatal):', fcmErr);
        }

        res.status(201).json({ success: true, data: normalizeCrash(data) });
    } catch (err) {
        console.error('Crash insert error:', err);
        res.status(500).json({ success: false, message: 'Failed to create crash' });
    }
});

// POST /api/crash/:id/confirm ─────────────────────────────────────────────────
// Called by the mobile app when the 15s window elapses without user pressing
// "I'm OK". This:
//   1. Flips crash status from 'pending_user' → 'active'
//   2. Emits 'new_crash' to hospital/ambulance dashboards
//   3. Triggers Twilio (SMS + WhatsApp + voice call) for emergency contacts
router.post('/:id/confirm', async (req, res) => {
    const { id } = req.params;
    const {
        userId,
        userName,
        userPhone,
        bloodGroup,
        vehiclePlate,
        lat,
        lng,
    } = req.body;

    try {
        // 1. Fetch current crash
        const { data: current, error: fetchErr } = await req.supabase
            .from('crashes')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !current) {
            return res.status(404).json({ success: false, message: 'Crash not found' });
        }

        // Guard: already confirmed or cancelled — do nothing
        if (current.status !== 'pending_user') {
            return res.json({ success: true, message: `Crash already in status: ${current.status}` });
        }

        // 2. Flip to 'active' and enrich victim data if provided
        const updateFields = {
            status: 'active',
            responded_at: null, // clear any accidental value
        };
        if (userName)      updateFields.user_name = userName;
        if (userPhone)     updateFields.user_phone = userPhone;
        if (bloodGroup)    updateFields.user_blood_group = bloodGroup;
        if (vehiclePlate)  updateFields.vehicle_plate = vehiclePlate;
        if (userId)        updateFields.user_id = userId;

        const { data: updated, error: updateErr } = await req.supabase
            .from('crashes')
            .update(updateFields)
            .eq('id', id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        const normalized = normalizeCrash(updated);

        // 3. NOW broadcast to hospital dashboards
        req.io.emit('new_crash', normalized);
        console.log(`🚨 Crash CONFIRMED (active): ${updated.device_id} @ ${updated.lat},${updated.lng} id=${id}`);

        // 4. Trigger Twilio emergency alerts for emergency contacts
        if (userId || updated.user_id) {
            try {
                const emergencyUserId = userId || updated.user_id;
                const backendBase = `http://localhost:${process.env.PORT || 3001}`;
                fetch(`${backendBase}/api/emergency/alert`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: emergencyUserId,
                        severity: updated.severity || 'high',
                        lat: updated.lat,
                        lng: updated.lng,
                        device_id: updated.device_id,
                        userName: updated.user_name || userName || 'JDC User',
                        userPhone: updated.user_phone || userPhone || '',
                        bloodGroup: updated.user_blood_group || bloodGroup || '',
                        vehiclePlate: updated.vehicle_plate || vehiclePlate || '',
                        isAutoDispatch: true,
                        countdown: 15,
                    }),
                }).catch(e => console.error('Twilio trigger failed (non-fatal):', e.message));
            } catch (twilioErr) {
                console.error('Failed to trigger Twilio from /confirm (non-fatal):', twilioErr);
            }
        }

        res.json({ success: true, data: normalized });
    } catch (err) {
        console.error('Crash confirm error:', err);
        res.status(500).json({ success: false, message: 'Failed to confirm crash' });
    }
});

// POST /api/crash/:id/cancel ──────────────────────────────────────────────────
// Called by the mobile app when the user presses "I'm OK".
// Marks the crash as 'cancelled' — hospitals never see it.
router.post('/:id/cancel', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: current } = await req.supabase
            .from('crashes')
            .select('status')
            .eq('id', id)
            .single();

        // Only cancel if still pending (don't undo a confirmed crash)
        if (current && current.status !== 'pending_user') {
            return res.json({ success: true, message: `Crash status is '${current.status}' — not cancellable` });
        }

        const { error } = await req.supabase
            .from('crashes')
            .update({
                status: 'cancelled',
                resolved_at: new Date().toISOString(),
            })
            .eq('id', id);

        if (error) throw error;

        console.log(`✅ Crash CANCELLED by user: id=${id}`);
        res.json({ success: true, message: 'Crash cancelled — hospital not notified' });
    } catch (err) {
        console.error('Crash cancel error:', err);
        res.status(500).json({ success: false, message: 'Failed to cancel crash' });
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
