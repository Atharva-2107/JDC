import express from 'express';
import { sendCrashAlertNotification } from '../fcm-service.js';

const router = express.Router();

// ── GET /api/devices  — list all virtual/registered devices ──────────────────
router.get('/', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('devices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('Devices fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch devices' });
  }
});

// ── GET /api/devices/:deviceId  — lookup a single device ───────────────────
router.get('/:deviceId', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('devices')
      .select('*')
      .eq('device_id', req.params.deviceId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Device not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch device' });
  }
});

// ── POST /api/devices/simulate-crash  — simulate crash alert + FCM push ──────
router.post('/simulate-crash', async (req, res) => {
  const { device_id, lat, lng, severity, location, victims, notes } = req.body;

  if (!device_id || !lat || !lng) {
    return res.status(400).json({ success: false, message: 'device_id, lat, and lng are required' });
  }

  try {
    // 1. Find the device and its owner
    const { data: device, error: devErr } = await req.supabase
      .from('devices')
      .select('user_id, device_name, vehicle_plate')
      .eq('device_id', device_id)
      .maybeSingle();

    if (devErr) throw devErr;

    // 2. Look up the user's full profile (name, phone — from 'profiles' table)
    let userProfile = null;
    if (device?.user_id) {
      const { data: profile } = await req.supabase
        .from('profiles')
        .select('name, phone')
        .eq('id', device.user_id)
        .maybeSingle();
      userProfile = profile;
    }

    const deviceNote = notes || `Dashboard-simulated crash for device ${device_id}`;

    // 3. Insert crash record with full user details
    const { data: crash, error: crashErr } = await req.supabase
      .from('crashes')
      .insert({
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        severity: severity || 'high',
        device_id,
        location: location || `${parseFloat(lat).toFixed(4)}°N, ${parseFloat(lng).toFixed(4)}°E`,
        status: 'active',
        victims: parseInt(victims) || 1,
        notes: deviceNote,
        is_demo: true,
        // Victim/user info from profile
        user_id: device?.user_id || null,
        user_name: userProfile?.name || null,
        user_phone: userProfile?.phone || null,
        user_blood_group: null,   // not stored in profiles table
        vehicle_plate: device?.vehicle_plate || null,
      })
      .select()
      .single();

    if (crashErr) throw crashErr;

    // 4. Broadcast crash via Socket.io to dashboard
    req.io.emit('new_crash', {
      id: crash.id,
      lat: crash.lat,
      lng: crash.lng,
      severity: crash.severity,
      deviceId: crash.device_id,
      location: crash.location,
      timestamp: crash.created_at,
      status: crash.status,
      victims: crash.victims,
      notes: crash.notes,
      is_demo: true,
      // Victim info
      userName: crash.user_name,
      userPhone: crash.user_phone,
      userBloodGroup: crash.user_blood_group,
      vehiclePlate: crash.vehicle_plate,
      userId: crash.user_id,
    });

    // 4. Fire FCM push notification to the device owner's phone (if paired)
    let fcmResult = null;
    if (device?.user_id) {
      console.log(`📲 Sending FCM crash alert to user: ${device.user_id}`);
      fcmResult = await sendCrashAlertNotification(
        device.user_id,
        crash.id,
        crash.lat,
        crash.lng,
      );
    } else {
      console.warn(`⚠️ Device ${device_id} is not paired to any user — FCM skipped`);
    }

    console.log(`🚨 [SIMULATE] Crash for device ${device_id} @ ${lat},${lng}`);

    res.status(201).json({
      success: true,
      crash_id: crash.id,
      device_owner_found: !!device?.user_id,
      fcm_sent: !!fcmResult,
      message: device?.user_id
        ? `Crash simulated. FCM alert sent to device owner's phone. User has 15 seconds to respond before ambulance is auto-dispatched.`
        : `Crash simulated. No paired user found for device ${device_id} — FCM not sent. Pair the device in the mobile app first.`,
    });
  } catch (err) {
    console.error('Simulate crash error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/devices/register  — register a virtual/dashboard device ────────
// Use this to add a virtual device without physical hardware (for testing)
router.post('/register', async (req, res) => {
  const { device_id, device_name, user_id, vehicle_plate, is_virtual } = req.body;

  if (!device_id) {
    return res.status(400).json({ success: false, message: 'device_id is required' });
  }

  // Build payload — try with is_virtual first, fall back if column missing
  const payload = {
    device_id: device_id.toUpperCase(),
    device_name: device_name || `Virtual Device (${device_id})`,
    user_id: user_id || null,
    vehicle_plate: vehicle_plate || null,
    is_active: true,
  };

  try {
    // First attempt: with is_virtual column
    let result = await req.supabase
      .from('devices')
      .upsert({ ...payload, is_virtual: is_virtual !== false }, { onConflict: 'device_id' })
      .select()
      .single();

    if (result.error) {
      // If column doesn't exist yet, retry without it
      if (result.error.message?.includes('is_virtual') || result.error.code === '42703') {
        console.warn('⚠️ is_virtual column not found — retrying without it. Run migration SQL to add the column.');
        result = await req.supabase
          .from('devices')
          .upsert(payload, { onConflict: 'device_id' })
          .select()
          .single();
      } else {
        throw result.error;
      }
    }

    if (result.error) throw result.error;
    
    // Tag the response as virtual even if column missing
    const responseData = { ...result.data, is_virtual: is_virtual !== false };
    res.status(201).json({ success: true, data: responseData });
  } catch (err) {
    console.error('Device register error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/devices/:deviceId  — remove a device ─────────────────────────
router.delete('/:deviceId', async (req, res) => {
  try {
    const { error } = await req.supabase
      .from('devices')
      .delete()
      .eq('device_id', req.params.deviceId);
    if (error) throw error;
    res.json({ success: true, message: 'Device removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove device' });
  }
});

export default router;
