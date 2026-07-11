import { getSupabaseAdmin } from '../services/supabaseAdmin.js';

const DB_NOT_CONFIGURED = 'Database chưa được cấu hình.';

/**
 * GET /api/tickets
 * Query: ?status=&type=&search=&assigned_to=
 * Admin: tất cả phiếu (chưa bị xóa)
 * Technician: chỉ phiếu được phân công
 * Customer: chỉ phiếu của chính mình
 */
export const getTickets = async (req, res) => {
    const db = getSupabaseAdmin();
    if (!db) return res.status(503).json({ error: DB_NOT_CONFIGURED });

    const { status, type, search, assigned_to } = req.query;
    const { role, id: userId } = req.user;

    let query = db
        .from('tickets')
        .select(`
            *,
            equipment:equipments(device_type, brand, model),
            creator:profiles!created_by(full_name, email),
            assignee:profiles!assigned_to(full_name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    // Phân quyền dữ liệu
    if (role === 'customer')   query = query.eq('created_by', userId);
    if (role === 'technician') query = query.eq('assigned_to', userId);

    // Bộ lọc tùy chọn
    if (status)      query = query.eq('current_status', status);
    if (type)        query = query.eq('ticket_type', type);
    if (assigned_to) query = query.eq('assigned_to', assigned_to);

    // Tìm kiếm theo nội dung phiếu (dùng ilike trên DB thay vì in-memory)
    if (search) {
        query = query.ilike('issue_summary', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.json(data || []);
};

/**
 * GET /api/tickets/deleted
 * Admin only: xem phiếu đã xóa mềm
 */
export const getDeletedTickets = async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Chỉ admin mới có quyền xem phiếu đã xóa.' });
    }

    const db = getSupabaseAdmin();
    if (!db) return res.status(503).json({ error: DB_NOT_CONFIGURED });

    const { data, error } = await db
        .from('tickets')
        .select('*, creator:profiles!created_by(full_name, email), equipment:equipments(device_type, brand, model)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
};

/**
 * PATCH /api/tickets/:id
 * Cập nhật trạng thái, nội dung phiếu
 */
export const updateTicket = async (req, res) => {
    const db = getSupabaseAdmin();
    if (!db) return res.status(503).json({ error: DB_NOT_CONFIGURED });

    const { id } = req.params;
    const { role, id: userId } = req.user;

    // Lấy phiếu hiện tại
    const { data: ticket, error: fetchErr } = await db
        .from('tickets').select('*').eq('id', id).single();

    if (fetchErr || !ticket) return res.status(404).json({ error: 'Không tìm thấy phiếu.' });

    // Kiểm tra quyền chỉnh sửa
    if (role === 'customer' && ticket.created_by !== userId) {
        return res.status(403).json({ error: 'Bạn không có quyền sửa phiếu này.' });
    }
    if (role === 'customer' && ticket.current_status !== 'Chờ xử lý') {
        return res.status(403).json({ error: 'Chỉ có thể sửa phiếu khi ở trạng thái "Chờ xử lý".' });
    }

    const allowed = ['current_status', 'issue_summary', 'priority', 'assigned_to',
                     'expected_return_date', 'ticket_type'];
    const updates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await db.from('tickets').update(updates).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
};

/**
 * DELETE /api/tickets/:id
 * Soft delete — chỉ customer (phiếu của mình) hoặc admin
 */
export const deleteTicket = async (req, res) => {
    const db = getSupabaseAdmin();
    if (!db) return res.status(503).json({ error: DB_NOT_CONFIGURED });

    const { id } = req.params;
    const { role, id: userId } = req.user;

    const { data: ticket } = await db.from('tickets').select('*').eq('id', id).single();
    if (!ticket) return res.status(404).json({ error: 'Không tìm thấy phiếu.' });

    if (role === 'customer') {
        if (ticket.created_by !== userId) return res.status(403).json({ error: 'Không có quyền xóa phiếu này.' });
        if (ticket.current_status !== 'Chờ xử lý') return res.status(403).json({ error: 'Chỉ xóa được phiếu đang "Chờ xử lý".' });
    }

    const { error } = await db.from('tickets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
};

/**
 * PATCH /api/tickets/:id/restore
 * Admin only: khôi phục phiếu đã xóa
 */
export const restoreTicket = async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ admin mới có quyền khôi phục phiếu.' });

    const db = getSupabaseAdmin();
    if (!db) return res.status(503).json({ error: DB_NOT_CONFIGURED });

    const { error } = await db.from('tickets')
        .update({ deleted_at: null })
        .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
};

/**
 * GET /api/tickets/stats
 * Tổng hợp số liệu cho admin dashboard
 */
export const getDashboardStats = async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Chỉ dành cho admin.' });

    const db = getSupabaseAdmin();
    if (!db) return res.status(503).json({ error: DB_NOT_CONFIGURED });

    const [ticketsRes, usersRes, rentalRes] = await Promise.all([
        db.from('tickets').select('current_status, ticket_type, created_at').is('deleted_at', null),
        db.from('profiles').select('role, is_active'),
        db.from('rental_contracts').select('status, approval_status'),
    ]);

    const tickets  = ticketsRes.data  || [];
    const users    = usersRes.data    || [];
    const rentals  = rentalRes.data   || [];

    return res.json({
        tickets: {
            total:      tickets.length,
            pending:    tickets.filter(t => t.current_status === 'Chờ xử lý').length,
            processing: tickets.filter(t => t.current_status === 'Đang xử lý').length,
            done:       tickets.filter(t => t.current_status === 'Đã hoàn thành').length,
        },
        users: {
            total:      users.length,
            active:     users.filter(u => u.is_active).length,
            customers:  users.filter(u => u.role === 'customer').length,
            technicians:users.filter(u => u.role === 'technician').length,
        },
        rentals: {
            total:    rentals.length,
            pending:  rentals.filter(r => r.approval_status === 'pending').length,
            active:   rentals.filter(r => r.status === 'active').length,
            overdue:  rentals.filter(r => r.status === 'overdue').length,
        },
    });
};
