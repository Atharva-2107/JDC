import express from 'express';

const router = express.Router();

// GET /api/hospitals
router.get('/', async (req, res) => {
    try {
        const { data, error } = await req.supabase.from('hospitals').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch hospitals' });
    }
});

// GET /api/hospitals/:id
router.get('/:id', async (req, res) => {
    try {
        const { data, error } = await req.supabase
            .from('hospitals')
            .select('*')
            .eq('id', req.params.id)
            .single();
        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, message: 'Hospital not found' });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch hospital' });
    }
});

// PUT /api/hospitals/:id/beds
router.put('/:id/beds', async (req, res) => {
    try {
        const updates = {};
        for (const [key, val] of Object.entries(req.body)) {
            if (typeof val === 'number') updates[key] = val;
        }

        const { data, error } = await req.supabase
            .from('hospitals')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        req.io.emit('hospital_updated', data);
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update hospital' });
    }
});

export default router;
