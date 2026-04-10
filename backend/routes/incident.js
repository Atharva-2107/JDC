import express from 'express';
import { sendCrashAlertNotification } from '../fcm-service.js';

const router = express.Router();

// POST /api/incident — ESP32 crash endpoint
router.post('/', async (req, res) => {
  const { device_id, latitude, longitude, g_force } = req.body;

  if (!device_id || !latitude || !longitude) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data: device, error: devErr } = await req.supabase
      .from('devices')
      .select('user_id, device_name')
      .eq('device_id', device_id)
      .single();

    if (devErr || !device) {
      return res.status(404).json({ error: 'Device not registered' });
    }

    const { data: incident, error: incErr } = await req.supabase
      .from('incidents')
      .insert({
        user_id: device.user_id,
        device_id,
        latitude,
        longitude,
        g_force,
        status: 'alert_sent',
        sms_sent: true,
      })
      .select()
      .single();

    if (incErr) throw incErr;

    await req.supabase
      .from('devices')
      .update({ last_seen: new Date().toISOString() })
      .eq('device_id', device_id);

    // Send push notification
    await sendCrashAlertNotification(
      device.user_id,
      incident.id,
      latitude,
      longitude
    );
    
    // Fallback broadcast to web clients if needed
    req.io.emit('new_incident', incident);

    return res.status(201).json({ incident_id: incident.id, status: 'ok' });
  } catch (err) {
    console.error('Crash handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/incident/:id - Get specific incident
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await req.supabase
            .from('incidents')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Incident not found' });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch incident' });
    }
});

export default router;
