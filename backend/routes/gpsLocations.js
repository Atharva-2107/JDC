import express from 'express';

const router = express.Router();

// GET /api/gps-locations — all GPS entries (latest first)
router.get('/', async (req, res) => {
    try {
        const { data, error } = await req.supabase
            .from('gps_locations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error('GPS locations fetch error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch GPS locations' });
    }
});

// GET /api/gps-locations/latest/:deviceId — most recent GPS fix for a device
router.get('/latest/:deviceId', async (req, res) => {
    try {
        const { data, error } = await req.supabase
            .from('gps_locations')
            .select('*')
            .eq('device_id', req.params.deviceId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'No GPS data for device' });
        res.json({ success: true, data });
    } catch (err) {
        console.error('GPS latest fetch error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch latest GPS location' });
    }
});

export default router;
