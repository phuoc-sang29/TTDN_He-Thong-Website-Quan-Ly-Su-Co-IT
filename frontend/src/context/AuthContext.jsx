import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [session, setSession]   = useState(null);
    const [profile, setProfile]   = useState(null);
    const [loading, setLoading]   = useState(true);

    // Lấy profile từ Supabase dựa trên user ID
    // Nếu chưa có profile (user đăng ký trước khi có trigger) thì tự tạo
    const fetchProfile = async (userId, userEmail) => {
        if (!userId) { setProfile(null); return; }
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error && error.code === 'PGRST116') {
            // Profile chưa tồn tại — tự tạo mới với role customer
            const name = userEmail ? userEmail.split('@')[0] : 'Người dùng';
            const { data: newProfile } = await supabase
                .from('profiles')
                .insert({ id: userId, full_name: name, role: 'customer' })
                .select()
                .single();
            setProfile(newProfile || null);
        } else if (error) {
            console.error('[AUTH] Loi lay profile: ' + error.message);
            setProfile(null);
        } else {
            setProfile(data);
        }
    };

    useEffect(() => {
        // Lấy session hiện tại
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            await fetchProfile(session?.user?.id, session?.user?.email);
            setLoading(false);
        });

        // Lắng nghe thay đổi auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            await fetchProfile(session?.user?.id, session?.user?.email);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
    };

    // Cập nhật profile (dùng cho admin đổi role)
    const refreshProfile = () => fetchProfile(session?.user?.id, session?.user?.email);

    const value = {
        session,
        profile,
        loading,
        role: profile?.role || null,        // 'admin' | 'technician' | 'customer'
        userId: session?.user?.id || null,  // auth UUID = profiles.id
        userEmail: session?.user?.email || '',
        isAdmin:      profile?.role === 'admin',
        isTechnician: profile?.role === 'technician',
        isCustomer:   profile?.role === 'customer',
        signOut,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
