import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const skipAuthChange = useRef(false);

    // Fetch user profile from profiles table, with fallback to user metadata
    const fetchProfile = async (supaUser) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', supaUser.id)
                .single();

            if (!error && data) {
                setProfile(data);
                return data;
            }
        } catch (err) {
            console.warn('Profile fetch failed, using metadata fallback:', err.message);
        }

        // Fallback: build profile from Supabase user metadata
        const meta = supaUser.user_metadata || {};
        const fallback = {
            id: supaUser.id,
            name: meta.name || supaUser.email?.split('@')[0] || 'User',
            email: supaUser.email,
            role: meta.role || 'hospital',
            avatar: (meta.name || 'U').charAt(0).toUpperCase(),
            hospital: null,
            call_sign: null,
            phone: null,
        };
        setProfile(fallback);
        return fallback;
    };

    // Listen to auth state changes
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            setSession(currentSession);
            if (currentSession?.user) {
                setUser(currentSession.user);
                fetchProfile(currentSession.user).finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                // Skip if signup/login is handling this manually
                if (skipAuthChange.current) return;

                setSession(newSession);
                if (newSession?.user) {
                    setUser(newSession.user);
                    await fetchProfile(newSession.user);
                } else {
                    setUser(null);
                    setProfile(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    // Sign Up — returns { role } on success, null if email confirmation needed
    const signup = async (email, password, name, role) => {
        skipAuthChange.current = true; // prevent race condition
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { name, role },
                },
            });
            if (error) throw error;

            // If email confirmation is disabled → session exists
            if (data.session && data.user) {
                setUser(data.user);
                setSession(data.session);
                // Build a quick profile from what we know
                const quickProfile = {
                    id: data.user.id,
                    name: name,
                    email: email,
                    role: role,
                    avatar: name.charAt(0).toUpperCase(),
                    hospital: null,
                    call_sign: null,
                    phone: null,
                };
                setProfile(quickProfile);
                return { role };
            }

            // Email confirmation enabled → no session
            return null;
        } finally {
            skipAuthChange.current = false;
        }
    };

    // Sign In
    const login = async (email, password) => {
        skipAuthChange.current = true;
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;

            setUser(data.user);
            setSession(data.session);
            const prof = await fetchProfile(data.user);
            return prof;
        } finally {
            skipAuthChange.current = false;
        }
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
