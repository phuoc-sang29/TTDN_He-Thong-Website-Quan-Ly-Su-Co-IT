import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import TopNavbar from '../components/TopNavbar';
import StatusBadge from '../components/StatusBadge';
import StatsPanel from '../components/StatsPanel';
import AssignModal from '../components/AssignModal';
import AIChatWidget from '../components/AIChatWidget';
import RentalManagement from '../components/RentalManagement';
import TicketChat from '../components/TicketChat';

const ROLE_OPTIONS = ['admin', 'technician', 'customer'];

const TICKET_TYPE_META = {
    repair:           { label: 'Sửa chữa',    cls: 'bg-teal-900/40 text-teal-400 border-teal-800/40' },
    maintenance:      { label: 'Bảo trì',      cls: 'bg-blue-900/40 text-blue-400 border-blue-800/40' },
    rental:           { label: 'Cho thuê',     cls: 'bg-violet-900/40 text-violet-400 border-violet-800/40' },
};

function TicketTypeBadge({ type }) {
    const meta = TICKET_TYPE_META[type] || TICKET_TYPE_META.repair;
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.cls}`}>{meta.label}</span>
    );
}

function AdminDashboard() {
    const { t }          = useLanguage();
    const { userId }     = useAuth();

    const [tab, setTab]           = useState('overview');
    const [tickets, setTickets]   = useState([]);
    const [deletedTickets, setDeletedTickets] = useState([]);
    const [users, setUsers]       = useState([]);
    const [equipments, setEquipments] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [assignTicket, setAssignTicket] = useState(null);
    const [restoringId, setRestoringId] = useState(null);

    // Chat dispatch
    const [chatTicket, setChatTicket] = useState(null);

    // Ticket filter trong tab tickets
    const [customerSearch, setCustomerSearch] = useState('');

    // Điều hướng tới phiếu từ thông báo -> chuyển sang tab hỗ trợ
    const handleNotifNavigate = useCallback((ticketId) => {
        setTab('support');
        if (!ticketId) return; // Click "Xem tất cả" — chỉ chuyển tab
        setTimeout(() => {
            const el = document.getElementById('support-ticket-' + ticketId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }, []);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        const [{ data: tks, error: tksErr }, { data: delTks }, { data: usrs }, { data: eqs }] = await Promise.all([
            supabase.from('tickets')
                .select('*, equipments(device_type, brand, model), creator:profiles!created_by(full_name), assignee:profiles!assigned_to(full_name)')
                .is('deleted_at', null)
                .order('created_at', { ascending: false }),
            supabase.from('tickets')
                .select('*, equipments(device_type, brand, model), creator:profiles!created_by(full_name)')
                .not('deleted_at', 'is', null)
                .order('deleted_at', { ascending: false }),
            supabase.from('profiles').select('*').order('created_at', { ascending: false }),
            supabase.from('equipments').select('*, owner:profiles!owner_id(role, full_name)').order('created_at', { ascending: false }),
        ]);
        if (tksErr) console.error('[ADMIN] fetchTickets error:', tksErr.message);
        setTickets(tks || []);
        setDeletedTickets(delTks || []);
        setUsers(usrs || []);
        const companyEqs = (eqs || []).filter(eq => !eq.owner || eq.owner.role !== 'customer');
        setEquipments(companyEqs);
        setLoading(false);
    };

    const restoreTicket = async (ticketId) => {
        setRestoringId(ticketId);
        await supabase.from('tickets').update({ deleted_at: null }).eq('id', ticketId);
        setRestoringId(null);
        fetchAll();
    };

    const changeRole = async (profileId, newRole) => {
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', profileId);
        if (!error) fetchAll();
    };

    const toggleActive = async (profileId, currentlyActive) => {
        await supabase.from('profiles').update({ is_active: !currentlyActive }).eq('id', profileId);
        fetchAll();
    };

    const toggleRentable = async (eqId, currentVal) => {
        await supabase.from('equipments').update({ is_rentable: !currentVal }).eq('id', eqId);
        setEquipments(prev => prev.map(eq => eq.id === eqId ? { ...eq, is_rentable: !currentVal } : eq));
    };

    // Phân công KTV trả lời chat
    const assignChatToTech = async (ticket, techId) => {
        await supabase.from('tickets').update({ assigned_to: techId }).eq('id', ticket.id);
        // Thông báo cho KTV (không block nếu bảng notifications chưa có)
        supabase.from('notifications').insert({
            recipient_id: techId, sender_id: userId,
            type: 'new_message',
            title: 'Bạn được phân công hỗ trợ khách',
            body: ticket.issue_summary?.slice(0, 80),
            ticket_id: ticket.id,
        }).then(({ error }) => { if (error) console.warn('[ASSIGN NOTIF]', error.message); });
        fetchAll();
    };

    const tabClass = (key) =>
        'text-xs font-semibold px-4 py-2 border-b-2 transition-all duration-100 whitespace-nowrap ' +
        (tab === key ? 'border-teal-500 text-teal-400' : 'border-transparent text-zinc-600 hover:text-zinc-400');

    // Filtered tickets — theo ten khach hang
    const filteredTickets = customerSearch.trim()
        ? tickets.filter(tk =>
            tk.creator?.full_name?.toLowerCase().includes(customerSearch.toLowerCase().trim())
          )
        : tickets;

    // Phiếu hiển thị trong tab Hỗ trợ: tất cả phiếu chưa hoàn thành
    const pendingChatTickets = tickets.filter(tk =>
        tk.current_status !== 'Đã hoàn thành'
    );

    const technicians = users.filter(u => u.role === 'technician');

    return (
        <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
            <TopNavbar onNotifNavigate={handleNotifNavigate} />

            {/* Tab bar */}
            <div className="flex border-b border-zinc-800 px-4 gap-1 shrink-0 bg-zinc-950 overflow-x-auto">
                <button className={tabClass('overview')}  onClick={() => setTab('overview')}>{t('admin.tab.overview')}</button>
                <button className={tabClass('tickets')}   onClick={() => setTab('tickets')}>
                    {t('admin.tab.tickets')} <span className="text-zinc-700 font-normal">({tickets.length})</span>
                </button>
                <button className={tabClass('accounts')}  onClick={() => setTab('accounts')}>
                    {t('admin.tab.accounts')} <span className="text-zinc-700 font-normal">({users.length})</span>
                </button>
                <button className={tabClass('equipment')} onClick={() => setTab('equipment')}>
                    {t('admin.tab.equipment')} <span className="text-zinc-700 font-normal">({equipments.length})</span>
                </button>
                <button className={tabClass('rental')}    onClick={() => setTab('rental')}>Cho thuê</button>
                <button className={tabClass('support')}   onClick={() => setTab('support')}>
                    Hỗ trợ / Chat
                    {pendingChatTickets.filter(tk => !tk.assigned_to).length > 0 && (
                        <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {pendingChatTickets.filter(tk => !tk.assigned_to).length}
                        </span>
                    )}
                </button>
                <button className={tabClass('trash')} onClick={() => setTab('trash')}>
                    Đã xóa
                    {deletedTickets.length > 0 && (
                        <span className="ml-1.5 bg-zinc-700 text-zinc-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {deletedTickets.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-5 h-5 border-2 border-zinc-700 border-t-teal-500 rounded-full animate-spin-slow"/>
                    </div>
                ) : (

                    /* === OVERVIEW === */
                    tab === 'overview' ? (
                        <div className="p-5 max-w-5xl mx-auto">
                            <h1 className="text-white text-lg font-bold mb-5">{t('admin.title')}</h1>
                            <StatsPanel />
                        </div>

                    /* === TICKETS === */
                    ) : tab === 'tickets' ? (
                        <div className="p-5 max-w-6xl mx-auto">
                            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                                <div>
                                    <h2 className="text-white text-sm font-semibold">{t('admin.tab.tickets')}</h2>
                                    <p className="text-zinc-600 text-xs mt-0.5">
                                        {customerSearch.trim()
                                            ? `${filteredTickets.length} phiếu của "${customerSearch.trim()}"`
                                            : `${tickets.length} phiếu tổng cộng`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Search khach hang */}
                                    <div className="relative">
                                        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600"
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                                        </svg>
                                        <input
                                            type="text"
                                            value={customerSearch}
                                            onChange={e => setCustomerSearch(e.target.value)}
                                            placeholder="Tìm theo tên khách hàng..."
                                            className="bg-zinc-900 border border-zinc-800 focus:border-teal-700/60 text-white text-xs pl-7 pr-8 py-1.5 rounded-lg outline-none transition-all w-52 placeholder-zinc-600"
                                        />
                                        {customerSearch && (
                                            <button
                                                onClick={() => setCustomerSearch('')}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                                                    <path d="M18 6L6 18M6 6l12 12"/>
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    <button onClick={fetchAll} className="text-zinc-600 hover:text-zinc-300 text-xs border border-zinc-800 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-all">
                                        {t('btn.refresh')}
                                    </button>
                                </div>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-zinc-800 text-zinc-600">
                                            <th className="text-left px-4 py-3 font-medium">Loại / Nội dung</th>
                                            <th className="text-left px-4 py-3 font-medium">{t('ticket.device')}</th>
                                            <th className="text-left px-4 py-3 font-medium">{t('ticket.customer')}</th>
                                            <th className="text-left px-4 py-3 font-medium">{t('ticket.technician')}</th>
                                            <th className="text-left px-4 py-3 font-medium">Trạng thái</th>
                                            <th className="text-center px-4 py-3 font-medium">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTickets.map(tk => (
                                            <tr key={tk.id} id={'ticket-row-' + tk.id}
                                                className="border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-4 py-3 max-w-[220px]">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <TicketTypeBadge type={tk.ticket_type || 'repair'} />
                                                    </div>
                                                    <p className="text-zinc-200 line-clamp-2 leading-snug">{tk.issue_summary}</p>
                                                    <p className="text-zinc-700 text-xs mt-0.5">{new Date(tk.created_at).toLocaleDateString('vi-VN')}</p>
                                                </td>
                                                <td className="px-4 py-3 text-zinc-500">
                                                    {tk.equipments ? `${tk.equipments.device_type} ${tk.equipments.brand || ''} ${tk.equipments.model || ''}`.trim() : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={
                                                        customerSearch.trim() &&
                                                        tk.creator?.full_name?.toLowerCase().includes(customerSearch.toLowerCase().trim())
                                                            ? 'text-teal-300 font-medium'
                                                            : 'text-zinc-400'
                                                    }>{tk.creator?.full_name || '—'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {tk.assignee
                                                        ? <span className="text-teal-400">{tk.assignee.full_name}</span>
                                                        : <span className="text-zinc-700 italic">{t('ticket.unassigned')}</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-3"><StatusBadge status={tk.current_status} /></td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => setAssignTicket(tk)}
                                                        className="bg-teal-900/50 hover:bg-teal-800/60 text-teal-400 text-xs px-3 py-1 rounded-lg border border-teal-800/50 transition-all">
                                                        {t('btn.assign')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredTickets.length === 0 && (
                                    <div className="text-center py-10">
                                        <p className="text-zinc-700 text-xs">
                                            {customerSearch.trim()
                                                ? `Không tìm thấy phiếu nào của "${customerSearch.trim()}"`
                                                : t('ticket.empty')}
                                        </p>
                                        {customerSearch.trim() && (
                                            <button onClick={() => setCustomerSearch('')} className="text-teal-500 text-xs mt-2 hover:underline">
                                                Xóa bộ lọc
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                    /* === ACCOUNTS === */
                    ) : tab === 'accounts' ? (
                        <div className="p-5 max-w-4xl mx-auto">
                            <h2 className="text-white text-sm font-semibold mb-4">{t('admin.accounts.title')}</h2>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-zinc-800 text-zinc-600">
                                            <th className="text-left px-4 py-3 font-medium">{t('admin.accounts.name')}</th>
                                            <th className="text-left px-4 py-3 font-medium">{t('admin.accounts.role')}</th>
                                            <th className="text-left px-4 py-3 font-medium">{t('admin.accounts.status')}</th>
                                            <th className="text-center px-4 py-3 font-medium">{t('admin.accounts.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(u => (
                                            <tr key={u.id} className={'border-b border-zinc-800/40 transition-colors ' + (!u.is_active ? 'opacity-50' : 'hover:bg-zinc-800/30')}>
                                                <td className="px-4 py-3">
                                                    <p className="text-zinc-200 font-medium">{u.full_name || t('admin.accounts.no_name')}</p>
                                                    {u.phone && <p className="text-zinc-700">{u.phone}</p>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {u.id === userId ? (
                                                        <span className="text-purple-400">{t('role.' + u.role)}</span>
                                                    ) : (
                                                        <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                                                            className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2 py-1 rounded-lg cursor-pointer">
                                                            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{t('role.' + r)}</option>)}
                                                        </select>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={'text-xs font-medium px-2 py-0.5 rounded border ' + (u.is_active ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800/50' : 'text-zinc-600 bg-zinc-800/50 border-zinc-700/50')}>
                                                        {u.is_active ? t('admin.accounts.active') : t('admin.accounts.inactive')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {u.id !== userId && (
                                                        <button onClick={() => toggleActive(u.id, u.is_active)}
                                                            className={'text-xs px-3 py-1 rounded-lg border transition-all ' + (u.is_active
                                                                ? 'border-red-900/50 text-red-500 hover:bg-red-950/30'
                                                                : 'border-emerald-900/50 text-emerald-500 hover:bg-emerald-950/30')}>
                                                            {u.is_active ? t('btn.deactivate') : t('btn.activate')}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {users.length === 0 && <p className="text-center text-zinc-700 py-10 text-xs">{t('admin.accounts.no_users')}</p>}
                            </div>
                        </div>

                    /* === EQUIPMENT === */
                    ) : tab === 'equipment' ? (
                        <div className="p-5 max-w-5xl mx-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-white text-sm font-semibold">{t('admin.tab.equipment')}</h2>
                                <p className="text-zinc-600 text-xs">Toggle cột “Cho thuê” để KTV có thể thấy thiết bị khi tạo phiếu thuê.</p>
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-zinc-800 text-zinc-600">
                                            <th className="text-left px-4 py-3 font-medium">{t('eq.type')}</th>
                                            <th className="text-left px-4 py-3 font-medium">{t('eq.brand')}</th>
                                            <th className="text-left px-4 py-3 font-medium">{t('eq.model')}</th>
                                            <th className="text-left px-4 py-3 font-medium">{t('eq.owner')}</th>
                                            <th className="text-center px-4 py-3 font-medium">Cho thuê</th>
                                            <th className="text-left px-4 py-3 font-medium">{t('eq.date')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {equipments.map(eq => (
                                            <tr key={eq.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-4 py-3 text-zinc-300">{eq.device_type}</td>
                                                <td className="px-4 py-3 text-zinc-400">{eq.brand || '—'}</td>
                                                <td className="px-4 py-3 text-zinc-400">{eq.model || '—'}</td>
                                                <td className="px-4 py-3 text-zinc-500">{eq.owner?.full_name || '—'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => toggleRentable(eq.id, eq.is_rentable)}
                                                        title={eq.is_rentable ? 'Đang cho thuê — click để tắt' : 'Cho phép cho thuê'}
                                                        className={'relative inline-flex h-5 w-9 items-center rounded-full border transition-all duration-200 ' +
                                                            (eq.is_rentable
                                                                ? 'bg-violet-600 border-violet-500'
                                                                : 'bg-zinc-800 border-zinc-700')}
                                                    >
                                                        <span className={'absolute h-3.5 w-3.5 rounded-full bg-white shadow transition-all duration-200 ' +
                                                            (eq.is_rentable ? 'left-[18px]' : 'left-[3px]')}
                                                        />
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-zinc-700">{new Date(eq.created_at).toLocaleDateString('vi-VN')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {equipments.length === 0 && <p className="text-center text-zinc-700 py-10 text-xs">{t('eq.empty')}</p>}
                            </div>
                        </div>

                    /* === TRASH (Deleted Tickets) === */
                    ) : tab === 'trash' ? (
                        <div className="p-5 max-w-5xl mx-auto">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-white text-sm font-semibold">Phiếu đã xóa</h2>
                                <p className="text-zinc-600 text-xs">Chỉ admin mới thấy và khôi phục được phiếu đã xóa.</p>
                            </div>
                            {deletedTickets.length === 0 ? (
                                <div className="text-center py-20 text-zinc-700 text-sm">Không có phiếu nào bị xóa.</div>
                            ) : (
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-zinc-800 text-zinc-600">
                                                <th className="text-left px-4 py-3 font-medium">Nội dung</th>
                                                <th className="text-left px-4 py-3 font-medium">Khách hàng</th>
                                                <th className="text-left px-4 py-3 font-medium">Ngày tạo</th>
                                                <th className="text-left px-4 py-3 font-medium">Ngày xóa</th>
                                                <th className="text-center px-4 py-3 font-medium">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {deletedTickets.map(tk => (
                                                <tr key={tk.id} className="border-b border-zinc-800/40 opacity-70 hover:opacity-100 transition-opacity">
                                                    <td className="px-4 py-3 max-w-[280px]">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <TicketTypeBadge type={tk.ticket_type || 'repair'} />
                                                        </div>
                                                        <p className="text-zinc-400 line-clamp-2 leading-snug">{tk.issue_summary}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-zinc-500">{tk.creator?.full_name || '—'}</td>
                                                    <td className="px-4 py-3 text-zinc-600">{new Date(tk.created_at).toLocaleDateString('vi-VN')}</td>
                                                    <td className="px-4 py-3 text-red-500/70">{new Date(tk.deleted_at).toLocaleDateString('vi-VN')}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => restoreTicket(tk.id)}
                                                            disabled={restoringId === tk.id}
                                                            className="flex items-center gap-1 mx-auto bg-emerald-900/40 hover:bg-emerald-800/60 disabled:bg-zinc-800 text-emerald-400 disabled:text-zinc-600 text-xs px-3 py-1.5 rounded-lg border border-emerald-800/50 transition-all">
                                                            {restoringId === tk.id
                                                                ? <><span className="w-2.5 h-2.5 border-2 border-zinc-600 border-t-emerald-400 rounded-full animate-spin" />Đang khôi phục...</>
                                                                : <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Khôi phục</>
                                                            }
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                    /* === RENTAL === */
                    ) : tab === 'rental' ? (
                        <RentalManagement />

                    /* === SUPPORT / CHAT === */
                    ) : tab === 'support' ? (
                        <div className="flex gap-0 h-full overflow-hidden">
                            {/* Left: danh sach phieu */}
                            <div className="w-full lg:w-[420px] shrink-0 overflow-y-auto border-r border-zinc-800/60 px-4 py-4 space-y-2">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-zinc-300 text-sm font-semibold">Phiếu chờ xử lý ({pendingChatTickets.length})</p>
                                    <button onClick={fetchAll} className="text-zinc-600 hover:text-zinc-300 text-xs border border-zinc-800 px-2.5 py-1 rounded-lg hover:bg-zinc-800 transition-all">Làm mới</button>
                                </div>
                                {pendingChatTickets.length === 0 && (
                                    <div className="text-center py-10 text-zinc-700 text-sm">Không có phiếu nào cần xử lý</div>
                                )}
                                {pendingChatTickets.map(tk => {
                                    // Tim KTV da duoc phan cong
                                    const assignedTech = users.find(u => u.id === tk.assigned_to);
                                    const isActive = chatTicket?.id === tk.id;
                                    return (
                                        <div key={tk.id} id={'support-ticket-' + tk.id}
                                            className={'bg-zinc-900 border rounded-xl p-3.5 transition-all cursor-pointer ' + (isActive ? 'border-teal-600/60 bg-teal-950/20' : 'border-zinc-800 hover:border-zinc-700')}
                                            onClick={() => setChatTicket(isActive ? null : tk)}>
                                            {/* Header row */}
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <TicketTypeBadge type={tk.ticket_type || 'repair'} />
                                                    <StatusBadge status={tk.current_status} />
                                                </div>
                                                {!tk.assigned_to
                                                    ? <span className="shrink-0 text-red-400 text-[10px] bg-red-900/30 border border-red-800/40 px-1.5 py-0.5 rounded-full">Chưa phân công</span>
                                                    : <span className="shrink-0 text-teal-400 text-[10px] bg-teal-900/20 border border-teal-800/30 px-1.5 py-0.5 rounded-full">{assignedTech?.full_name || 'KTV'}</span>
                                                }
                                            </div>
                                            <p className="text-zinc-200 text-xs font-medium line-clamp-2 mb-1">{tk.issue_summary}</p>
                                            <p className="text-zinc-600 text-[10px]">Khách: {tk.creator?.full_name || '—'}</p>

                                            {/* Action row — stop propagation de click vao day khong toggle chat */}
                                            <div className="flex items-center gap-2 mt-2.5" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setChatTicket(isActive ? null : tk)}
                                                    className={'text-xs px-2.5 py-1 rounded-lg border transition-all ' + (isActive
                                                        ? 'bg-teal-800/60 border-teal-700 text-teal-300'
                                                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-teal-700')}>
                                                    {isActive ? 'Đóng' : 'Trả lời'}
                                                </button>
                                                <select
                                                    value={tk.assigned_to || ''}
                                                    onChange={e => { if (e.target.value) assignChatToTech(tk, e.target.value); }}
                                                    className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-1 rounded-lg outline-none hover:border-zinc-600 transition-all flex-1">
                                                    <option value="">Phân công...</option>
                                                    {technicians.map(tc => (
                                                        <option key={tc.id} value={tc.id}>{tc.full_name || tc.email}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Right: Chat panel — sticky, chiem phan con lai */}
                            <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
                                {chatTicket ? (
                                    <>
                                        {/* Chat header */}
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
                                            <div>
                                                <p className="text-white text-xs font-semibold">Trả lời: {chatTicket.creator?.full_name || 'Khách hàng'}</p>
                                                <p className="text-zinc-600 text-xs truncate max-w-[280px]">{chatTicket.issue_summary}</p>
                                            </div>
                                            <button onClick={() => setChatTicket(null)} className="text-zinc-600 hover:text-white transition-colors p-1">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                                            </button>
                                        </div>
                                        {/* Chat body */}
                                        <div className="flex-1 overflow-hidden">
                                            <TicketChat ticketId={chatTicket.id} compact autoFocus />
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <svg className="w-10 h-10 text-zinc-800 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                                        <p className="text-zinc-700 text-sm">Chọn một phiếu để bắt đầu trả lời</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null
                )}
            </div>

            {assignTicket && (
                <AssignModal ticket={assignTicket} onClose={() => setAssignTicket(null)} onAssigned={fetchAll} />
            )}
            <AIChatWidget />
        </div>
    );
}

export default AdminDashboard;
