import express from 'express';

const router = express.Router();

// POST /api/crash — receive crash from ESP32 or create manually
router.post('/', async (req, res) => {
    try {
        const { lat, lng, severity, device_id, location, victims, notes } = req.body;

        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: 'lat and lng are required' });
        }

        const crashData = {
            lat: parseFloat(lat),
            lng: parseFloat(lng),
            severity: severity || 'high',
            device_id: device_id || 'ESP32-UNKNOWN',
            location: location || `${parseFloat(lat).toFixed(4)}°N, ${parseFloat(lng).toFixed(4)}°E`,
            status: 'active',
            victims: parseInt(victims) || 1,
            notes: notes || null,
        };

        const { data, error } = await req.supabase
            .from('crashes')
            .insert(crashData)
            .select()
            .single();

        if (error) throw error;

        // Broadcast via Socket.io for instant push to all clients
        const normalized = {
            id: data.id, lat: data.lat, lng: data.lng, severity: data.severity,
            deviceId: data.device_id, location: data.location, timestamp: data.created_at,
            status: data.status, assignedAmbulance: data.assigned_ambulance,
            victims: data.victims, notes: data.notes,
        };
        req.io.emit('new_crash', normalized);

        res.status(201).json({ success: true, data: normalized });
    } catch (err) {
        console.error('Crash insert error:', err);
        res.status(500).json({ success: false, message: 'Failed to create crash' });
    }
});

// GET /api/crash — list all crashes
router.get('/', async (req, res) => {
    try {
        const { data, error } = await req.supabase
            .from('crashes')
            .select('*')
            .order('created_at', { ascending: false });

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

// PUT /api/crash/:id — update crash status
router.put('/:id', async (req, res) => {
    try {
        const updates = {};
        if (req.body.status) updates.status = req.body.status;
        if (req.body.assigned_ambulance) updates.assigned_ambulance = req.body.assigned_ambulance;
        if (req.body.status === 'responding') updates.responded_at = new Date().toISOString();
        if (req.body.status === 'resolved') updates.resolved_at = new Date().toISOString();

        const { data, error } = await req.supabase
            .from('crashes')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        // Broadcast update
        const normalized = {
            id: data.id, lat: data.lat, lng: data.lng, severity: data.severity,
            deviceId: data.device_id, location: data.location, timestamp: data.created_at,
            status: data.status, assignedAmbulance: data.assigned_ambulance,
            victims: data.victims, notes: data.notes,
        };
        req.io.emit('crash_updated', normalized);

        res.json({ success: true, data: normalized });
    } catch (err) {
        console.error('Crash update error:', err);
        res.status(500).json({ success: false, message: 'Failed to update crash' });
    }
});

export default router;
