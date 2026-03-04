import express from 'express';

const router = express.Router();

// GET /api/ambulances
router.get('/', async (req, res) => {
    try {
        const { data, error } = await req.supabase.from('ambulances').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch ambulances' });
    }
});

// GET /api/ambulances/:id
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await req.supabase
            .from('ambulances')
            .select('*')
            .eq('id', req.params.id)
            .single();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Ambulance not found' });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch ambulance' });
    }
});

// PUT /api/ambulances/:id/status
router.put('/:id/status', async (req, res) => {
    try {
        const updates = { last_update: new Date().toISOString() };
        if (req.body.status) updates.status = req.body.status;
        if (req.body.lat) updates.lat = req.body.lat;
        if (req.body.lng) updates.lng = req.body.lng;

        const { data, error } = await req.supabase
            .from('ambulances')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        // Broadcast to hospital room
        req.io.to('hospital').emit('ambulance_location', {
            id: data.id,
            callSign: data.call_sign,
            lat: data.lat,
            lng: data.lng,
            status: data.status,
        });

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update ambulance' });
    }
});

export default router;
