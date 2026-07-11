import { createClient } from '@supabase/supabase-js';

// Supabase Admin client — dùng service_role key (chỉ chạy ở backend, KHÔNG expose ra frontend)
// Vượt qua RLS, dùng để đọc/ghi dữ liệu phía server

let _client = null;

export function getSupabaseAdmin() {
    if (_client) return _client;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.warn('[SUPABASE ADMIN] SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình trong .env');
        console.warn('[SUPABASE ADMIN] Một số tính năng (ticket/rental API) sẽ không hoạt động.');
        return null;
    }

    _client = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    return _client;
}
