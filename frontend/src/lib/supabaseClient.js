import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[CONFIG ERROR] VITE_SUPABASE_URL hoac VITE_SUPABASE_ANON_KEY chua duoc cau hinh trong file .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
