import { getSupabaseAdmin } from '../services/supabaseAdmin.js';

const DB_NOT_CONFIGURED = 'Database chưa được cấu hình.';

/**
 * GET /api/rental-contracts
 * Admin/Technician: tất cả | Customer: chỉ hợp đồng của mình
 */
export const getRentals = async (req, res) => {
    const db = getSupabaseAdmin();
    if (!db) return res.status(503).json({ error: DB_NOT_CONFIGURED });

    const { role, id: userId } = req.user;

    let query = db
        .from('rental_contracts')
        .select(`
            *,
            customer:profiles!customer_id(full_name, email),
            equipment:equipments(device_type, brand, model),
            approver:profiles!approved_by(full_name)
        `)
        .order('created_at', { ascending: false });

    if (role === 'customer') query = query.eq('customer_id', userId);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Tự động đánh dấu quá hạn
    const now = new Date();
    const result = (data || []).map(c =>
        c.status === 'active' && new Date(c.end_date) < now
            ? { ...c, status: 'overdue' }
            : c
    );

    return res.json(result);
};

/**
 * POST /api/rental-contracts
 * Technician/Admin tạo hợp đồng cho thuê
 */
export const createRental = async (req, res) => {
    const db = getSupabaseAdmin();
    if (!db) return res.status(503).json({ error: DB_NOT_CONFIGURED });

    const { equipment_id, customer_id, start_date, end_date, notes } = req.body;
    const { role, id: userId } = req.user;

    if (!equipment_id || !customer_id || !start_date || !end_date) {
        return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: equipment_id, customer_id, start_date, end_date.' });
    }

    // KTV không được tự đặt giá — admin mới được
    const insertData = {
        equipment_id,
        customer_id,
        start_date,
        end_date,
        price_per_day:   role === 'admin' ? (parseFloat(req.body.price_per_day) || 0) : 0,
        deposit:         role === 'admin' ? (parseFloat(req.body.deposit) || 0) : 0,
        status:          'pending',
        approval_status: 'pending',
        notes:           notes || null,
        created_by:      userId,
    };

    const { data, error } = await db.from('rental_contracts').insert(insertData).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
};

/**
 * POST /api/rental-contracts/:id/approve
 * Admin only: duyệt và định giá hợp đồng
 */
export const approveRental = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Chỉ admin mới có quyền duyệt hợp đồng.' });
    }

    const db = getSupabaseAdmin();
    if (!db) return res.status(503).json({ error: DB_NOT_CONFIGURED });

    const { price_per_day, deposit, notes } = req.body;

    if (!price_per_day || parseFloat(price_per_day) <= 0) {
        return res.status(400).json({ error: 'Vui lòng nhập giá thuê/ngày hợp lệ (> 0).' });
    }

    const { data: contract } = await db
        .from('rental_contracts').select('*').eq('id', req.params.id).single();

    if (!contract) return res.status(404).json({ error: 'Không tìm thấy hợp đồng.' });
    if (contract.approval_status !== 'pending') {
        return res.status(400).json({ error: 'Hợp đồng này đã được xử lý.' });
    }

    const { data, error } = await db
        .from('rental_contracts')
        .update({
            price_per_day:   parseFloat(price_per_day),
            deposit:         deposit ? parseFloat(deposit) : 0,
            approval_status: 'approved',
            status:          'active',
            approved_by:     req.user.id,
            approved_at:     new Date().toISOString(),
            notes:           notes || contract.notes || null,
        })
        .eq('id', req.params.id)
        .select().single();

    if (error) return res.status(500).json({ error: error.message });

    // Đánh dấu thiết bị không còn khả dụng
    if (contract.equipment_id) {
        await db.from('equipments').update({ is_available: false }).eq('id', contract.equipment_id);
    }

    return res.json(data);
};

/**
 * POST /api/rental-contracts/:id/reject
 * Admin only: từ chối hợp đồng
 */
export const rejectRental = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Chỉ admin mới có quyền từ chối hợp đồng.' });
    }

    const db = getSupabaseAdmin();
    if (!db) return res.status(503).json({ error: DB_NOT_CONFIGURED });

    const { data: contract } = await db
        .from('rental_contracts').select('approval_status').eq('id', req.params.id).single();

    if (!contract) return res.status(404).json({ error: 'Không tìm thấy hợp đồng.' });
    if (contract.approval_status !== 'pending') {
        return res.status(400).json({ error: 'Hợp đồng này đã được xử lý.' });
    }

    const { data, error } = await db
        .from('rental_contracts')
        .update({
            approval_status: 'rejected',
            status:          'cancelled',
            approved_by:     req.user.id,
            approved_at:     new Date().toISOString(),
        })
        .eq('id', req.params.id)
        .select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
};

/**
 * PATCH /api/rental-contracts/:id/return
 * Admin/Technician: đánh dấu hợp đồng đã trả thiết bị
 */
export const returnRental = async (req, res) => {
    if (!['admin', 'technician'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Không có quyền thực hiện thao tác này.' });
    }

    const db = getSupabaseAdmin();
    if (!db) return res.status(503).json({ error: DB_NOT_CONFIGURED });

    const { data: contract } = await db
        .from('rental_contracts').select('*').eq('id', req.params.id).single();

    if (!contract) return res.status(404).json({ error: 'Không tìm thấy hợp đồng.' });
    if (contract.status === 'returned') {
        return res.status(400).json({ error: 'Hợp đồng này đã được trả thiết bị trước đó.' });
    }
    if (contract.approval_status !== 'approved') {
        return res.status(400).json({ error: 'Chỉ có thể trả thiết bị của hợp đồng đã được duyệt.' });
    }

    const { error } = await db.from('rental_contracts')
        .update({ status: 'returned', returned_at: new Date().toISOString() })
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });

    // Thiết bị khả dụng lại
    if (contract.equipment_id) {
        await db.from('equipments').update({ is_available: true }).eq('id', contract.equipment_id);
    }

    return res.json({ success: true });
};
