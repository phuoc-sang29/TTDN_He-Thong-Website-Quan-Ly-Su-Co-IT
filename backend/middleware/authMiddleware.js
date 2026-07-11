import { createClient } from '@supabase/supabase-js';

// Cache client theo URL để tránh tạo lại mỗi request
let _verifyClient = null;

function getVerifyClient() {
    if (_verifyClient) return _verifyClient;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    _verifyClient = createClient(url, key);
    return _verifyClient;
}

/**
 * Middleware xác minh JWT của Supabase
 * Gắn req.user = { id, email, role, fullName } vào request
 */
export async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Chưa đăng nhập. Vui lòng đăng nhập lại.' });
    }

    const supabase = getVerifyClient();

    if (!supabase) {
        // Chưa cấu hình Supabase — bỏ qua xác thực (dev mode)
        console.warn('[AUTH] Supabase chưa cấu hình — bỏ qua xác thực (dev mode)');
        req.user = { id: 'dev', role: 'admin' };
        return next();
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn.' });
        }

        // Lấy role từ bảng profiles
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, full_name, is_active')
            .eq('id', user.id)
            .single();

        if (profile && !profile.is_active) {
            return res.status(403).json({ error: 'Tài khoản đã bị vô hiệu hóa.' });
        }

        req.user = {
            id:       user.id,
            email:    user.email,
            role:     profile?.role || 'customer',
            fullName: profile?.full_name || '',
        };

        next();
    } catch (err) {
        console.error('[AUTH] Lỗi xác thực:', err.message);
        return res.status(500).json({ error: 'Lỗi xác thực. Thử lại sau.' });
    }
}

/**
 * Kiểm tra role — dùng sau authMiddleware
 * @param  {...string} roles - Danh sách role được phép
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Chưa xác thực.' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Không có quyền truy cập. Cần role: ${roles.join(' hoặc ')}.`,
            });
        }
        next();
    };
}
