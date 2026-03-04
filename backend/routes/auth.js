import express from 'express';

const router = express.Router();

// Verify Supabase JWT and return user profile
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

        // Verify token with Supabase (uses req.supabase from middleware)
        const { data: { user }, error } = await req.supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }

        // Fetch profile
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
                avatar: profile.avatar,
                hospital: profile.hospital,
                callSign: profile.call_sign,
                phone: profile.phone,
            },
        });
    } catch (err) {
        console.error('Auth error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
