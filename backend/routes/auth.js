import express from 'express';

const router = express.Router();

// GET /api/auth/me — verify JWT and return profile
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

        const { data: { user }, error } = await req.supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }

        const { data: profile, error: profileError } = await req.supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: profile.name,
                role: profile.role,
                hospital: profile.hospital,
                hospitalId: profile.hospital_id,
                callSign: profile.call_sign,
                phone: profile.phone,
            },
        });
    } catch (err) {
        console.error('Auth error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/auth/hospital-code/:code — validate hospital code during signup
router.get('/hospital-code/:code', async (req, res) => {
    try {
        const code = req.params.code.toUpperCase().trim();
        const { data, error } = await req.supabase
            .from('hospital_codes')
            .select('hospital_id, hospital_name, code')
            .eq('code', code)
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, message: 'Invalid hospital code. Please check with your hospital admin.' });
        }

        res.json({ success: true, hospitalId: data.hospital_id, hospitalName: data.hospital_name, code: data.code });
    } catch (err) {
        console.error('Hospital code lookup error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
