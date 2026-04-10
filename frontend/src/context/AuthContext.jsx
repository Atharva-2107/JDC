import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

// Utility: wrap any promise with a timeout so we never hang forever
const withTimeout = (promise, ms, label = 'Operation') =>
    Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
        ),
    ]);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const isManualAuth = useRef(false);

    // Build a fallback profile from Supabase user metadata
    const buildFallbackProfile = (supaUser, overrides = {}) => {
        const meta = supaUser.user_metadata || {};
        return {
            id: supaUser.id,
            name: overrides.name || meta.name || supaUser.email?.split('@')[0] || 'User',
            email: supaUser.email,
            role: overrides.role || meta.role || 'hospital',
            avatar: (overrides.name || meta.name || 'U').charAt(0).toUpperCase(),
            hospital: null,
            call_sign: null,
            phone: null,
        };
    };

    // Fetch user profile — single attempt with timeout, no retries (fast)
    const fetchProfile = async (supaUser) => {
        try {
            const { data, error } = await withTimeout(
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', supaUser.id)
                    .single(),
                5000,
                'Profile fetch'
            );

            if (!error && data) {
                setProfile(data);
                return data;
            }
        } catch (err) {
            console.warn('Profile fetch failed:', err.message);
        }

        // Fallback to user metadata
        console.log('Using metadata fallback for profile');
        const fallback = buildFallbackProfile(supaUser);
        setProfile(fallback);
        return fallback;
    };

    // Fetch profile with retries — used only during signup (DB trigger delay)
    const fetchProfileWithRetry = async (supaUser, retries = 2) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const { data, error } = await withTimeout(
                    supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', supaUser.id)
                        .single(),
                    4000,
                    `Profile fetch (attempt ${attempt})`
                );

                if (!error && data) {
                    setProfile(data);
                    return data;
                }

                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            } catch (err) {
                console.warn(`Profile fetch attempt ${attempt} failed:`, err.message);
                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
        }

        // Fallback
        const fallback = buildFallbackProfile(supaUser);
        setProfile(fallback);
        return fallback;
    };

    // Listen to auth state changes
    useEffect(() => {
        let isMounted = true;

        // Get initial session
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            if (!isMounted) return;
            setSession(currentSession);
            if (currentSession?.user) {
                setUser(currentSession.user);
                fetchProfile(currentSession.user).finally(() => {
                    if (isMounted) setLoading(false);
                });
            } else {
                setLoading(false);
            }
        }).catch(() => {
            if (isMounted) setLoading(false);
        });

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, newSession) => {
                if (!isMounted) return;

                setSession(newSession);
                if (newSession?.user) {
                    setUser(newSession.user);
                    // Skip profile fetch if login()/signup() is already handling it
                    if (isManualAuth.current) {
                        isManualAuth.current = false;
                        return;
                    }
                    // Fire-and-forget profile fetch (don't await — prevents blocking)
                    fetchProfile(newSession.user);
                } else {
                    setUser(null);
                    setProfile(null);
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Sign Up — accepts optional hospitalId for hospital staff
    const signup = async (email, password, name, role, hospitalId = null) => {
        isManualAuth.current = true;

        let data, error;
        try {
            const result = await withTimeout(
                supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { name, role, hospital_id: hospitalId } },
                }),
                10000,
                'Signup'
            );
            data = result.data;
            error = result.error;
        } catch (err) {
            isManualAuth.current = false;
            throw err;
        }

        if (error) {
            isManualAuth.current = false;
            throw error;
        }

        // If email confirmation is disabled → session exists immediately
        if (data.session && data.user) {
            setUser(data.user);
            setSession(data.session);

            // If hospital staff, also update profiles with hospital_id
            if (hospitalId && data.user.id) {
                try {
                    await supabase
                        .from('profiles')
                        .upsert({ id: data.user.id, hospital_id: hospitalId }, { onConflict: 'id' });
                } catch (upsertErr) {
                    console.warn('Could not set hospital_id on profile:', upsertErr.message);
                }
            }

            const prof = await fetchProfileWithRetry(data.user, 2);
            return { role: prof?.role || role };
        }

        // Email confirmation enabled → no session yet
        isManualAuth.current = false;
        return null;
    };

    // Sign In
    const login = async (email, password) => {
        isManualAuth.current = true;

        let data, error;
        try {
            const result = await withTimeout(
                supabase.auth.signInWithPassword({ email, password }),
                10000,
                'Login'
            );
            data = result.data;
            error = result.error;
        } catch (err) {
            isManualAuth.current = false;
            throw err;
        }

        if (error) {
            isManualAuth.current = false;
            throw error;
        }

        setUser(data.user);
        setSession(data.session);
        const prof = await fetchProfile(data.user);
        return prof;
    };

    // Sign Out
    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setSession(null);
    };

    // The combined user object that components consume
    const currentUser = profile ? {
        id: user?.id || profile.id,
        email: user?.email || profile.email,
        name: profile.name,
        role: profile.role,
        avatar: profile.avatar,
        hospital: profile.hospital,
        hospitalId: profile.hospital_id || null,
        callSign: profile.call_sign,
        phone: profile.phone,
    } : null;

    return (
        <AuthContext.Provider value={{
            user: currentUser,
            supabaseUser: user,
            session,
            profile,
            loading,
            login,
            signup,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
