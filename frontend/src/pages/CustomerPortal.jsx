import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import TopNavbar from '../components/TopNavbar';
import StatusBadge from '../components/StatusBadge';
import TicketChat from '../components/TicketChat';
import RatingWidget from '../components/RatingWidget';
import CreateTicketModal from '../components/CreateTicketModal';
import { tAction, tDevice } from '../lib/i18nMaps';

// Modal xác nhận xóa
function ConfirmDeleteModal({ ticket, onCancel, onConfirm, deleting }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 fade-in">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-red-950/60 border border-red-800/50 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </div>
                    <div>
                        <p className="text-white text-sm font-semibold">Xóa phiếu này?</p>
                        <p className="text-zinc-500 text-xs mt-0.5">Hành động này không thể hoàn tác.</p>
                    </div>
                </div>
                <p className="text-zinc-400 text-xs bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-3 py-2 mb-5 line-clamp-2">
                    {ticket?.issue_summary}
                </p>
                <div className="flex gap-2">
                    <button onClick={onCancel} className="flex-1 text-zinc-400 hover:text-white text-xs font-medium py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-all">
                        Hủy
                    </button>
                    <button onClick={onConfirm} disabled={deleting}
                        className="flex-1 bg-red-700 hover:bg-red-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5">
                        {deleting
                            ? <><span className="w-3 h-3 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />Đang xóa...</>
                            : 'Xóa phiếu'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Modal chỉnh sửa phiếu (chỉ chỉnh issue_summary khi còn Chờ xử lý)
function EditTicketModal({ ticket, onClose, onSaved }) {
    const [summary, setSummary] = useState(ticket?.issue_summary || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!summary.trim()) { setError('Vui lòng nhập mô tả.'); return; }
        setSaving(true);
        const { error: err } = await supabase
            .from('tickets')
            .update({ issue_summary: summary.trim() })
            .eq('id', ticket.id);
        if (err) { setError('Lỗi khi lưu. Thử lại.'); setSaving(false); return; }
        onSaved?.();
        onClose?.();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md p-6 fade-in">
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-white text-sm font-semibold">Chỉnh sửa phiếu</h2>
                    <button onClick={onClose} className="text-zinc-600 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
                <div className="mb-4">
                    <label className="block text-zinc-500 text-xs font-medium mb-1.5">Mô tả vấn đề</label>
                    <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={4}
                        className="w-full bg-zinc-800 border border-zinc-700 focus:border-teal-600/60 text-white text-xs px-3 py-2 rounded-lg placeholder-zinc-600 resize-none outline-none transition-all"
                        placeholder="Mô tả chi tiết sự cố..." autoFocus />
                </div>
                <p className="text-zinc-700 text-xs mb-4">Lưu ý: Chỉ có thể chỉnh sửa khi phiếu chưa được xử lý.</p>
                {error && <p className="text-red-400 text-xs mb-3 bg-red-950/40 border border-red-900/40 px-3 py-2 rounded-lg">{error}</p>}
                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 text-zinc-400 hover:text-white text-xs py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-all">Hủy</button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 bg-teal-700 hover:bg-teal-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5">
                        {saving ? <><span className="w-3 h-3 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />Đang lưu...</> : 'Lưu thay đổi'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CustomerPortal() {
    const { t }      = useLanguage();
    const { userId } = useAuth();

    const [tickets, setTickets]       = useState([]);
    const [selected, setSelected]     = useState(null);
    const [logs, setLogs]             = useState([]);
    const [loadingT, setLoadingT]     = useState(true);
    const [loadingL, setLoadingL]     = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [editTicket, setEditTicket] = useState(null);
    const [deleteTicket, setDeleteTicket] = useState(null);
    const [deleting, setDeleting]     = useState(false);

    const selectedRef = useRef(null);
    selectedRef.current = selected;

    useEffect(() => { if (userId) fetchTickets(); }, [userId]);

    // Realtime
    useEffect(() => {
        if (!userId) return;
        const ticketChannel = supabase.channel('customer-tickets-rt-' + userId)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, (payload) => {
                const updated = payload.new;
                setTickets(prev => prev.map(tk => tk.id === updated.id ? { ...tk, ...updated } : tk));
                if (selectedRef.current?.id === updated.id) {
                    setSelected(prev => prev ? { ...prev, ...updated } : prev);
                }
            })
            .subscribe();
        const logChannel = supabase.channel('customer-logs-rt-' + userId)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_logs' }, (payload) => {
                const newLog = payload.new;
                if (selectedRef.current?.id === newLog.ticket_id) {
                    setLogs(prev => prev.some(l => l.id === newLog.id) ? prev : [...prev, newLog]);
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(ticketChannel); supabase.removeChannel(logChannel); };
    }, [userId]);

    const fetchTickets = async () => {
        setLoadingT(true);
        const { data, error } = await supabase
            .from('tickets')
            .select('*, equipments(device_type, brand, model), assignee:profiles!assigned_to(full_name, phone)')
            .eq('created_by', userId)
            .is('deleted_at', null)          // ẩn ticket đã xóa mềm
            .order('created_at', { ascending: false });
        if (error) console.error('[CUSTOMER PORTAL] fetchTickets error:', error.message);
        const list = data || [];
        setTickets(list);
        if (list.length > 0) { setSelected(list[0]); fetchLogs(list[0].id); }
        else { setSelected(null); setLogs([]); }
        setLoadingT(false);
    };

    const fetchLogs = async (id) => {
        setLoadingL(true);
        const { data } = await supabase
            .from('ticket_logs').select('*').eq('ticket_id', id).order('created_at', { ascending: true });
        setLogs(data || []);
        setLoadingL(false);
    };

    const handleSelect = (tk) => { setSelected(tk); fetchLogs(tk.id); };

    // Soft delete
    const handleDelete = async () => {
        if (!deleteTicket) return;
        setDeleting(true);
        const { error } = await supabase
            .from('tickets')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', deleteTicket.id);
        setDeleting(false);
        if (!error) {
            setDeleteTicket(null);
            if (selected?.id === deleteTicket.id) { setSelected(null); setLogs([]); }
            fetchTickets();
        }
    };

    // Kiểm tra có thể edit/delete không (chỉ khi Chờ xử lý)
    const canEditDelete = (tk) => tk?.current_status === 'Chờ xử lý';

    const ACTION_COLOR = {
        'Tiếp nhận': 'text-blue-400', 'Chẩn đoán': 'text-amber-400',
        'Xử lý': 'text-teal-400', 'Bàn giao': 'text-emerald-400', 'Chờ': 'text-zinc-500',
    };
    const ACTION_DOT = {
        'Tiếp nhận': 'border-blue-600 bg-blue-900/30', 'Chẩn đoán': 'border-amber-600 bg-amber-900/30',
        'Xử lý': 'border-teal-600 bg-teal-900/30', 'Bàn giao': 'border-emerald-600 bg-emerald-900/30',
        'Chờ': 'border-zinc-600 bg-zinc-800/40',
    };

    return (
        <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
            <TopNavbar />

            {/* Header */}
            <div className="flex items-center gap-4 px-4 py-2 border-b border-zinc-800/60 shrink-0">
                <div>
                    <h1 className="text-white text-sm font-semibold">{t('portal.title')}</h1>
                    <p className="text-zinc-600 text-xs">{t('portal.subtitle')}</p>
                </div>
                <div className="ml-auto">
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {t('portal.new')}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* LEFT: danh sách phiếu */}
                <aside className="w-[30%] min-w-[200px] max-w-[300px] border-r border-zinc-800/60 flex flex-col bg-zinc-950 overflow-y-auto">
                    {loadingT ? (
                        <div className="flex justify-center py-10"><div className="w-4 h-4 border-2 border-zinc-700 border-t-teal-500 rounded-full animate-spin-slow" /></div>
                    ) : tickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center">
                                <svg className="w-5 h-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-zinc-600 text-xs font-medium">{t('portal.empty')}</p>
                            <p className="text-zinc-800 text-xs">{t('portal.empty.hint')}</p>
                        </div>
                    ) : (
                        tickets.map(tk => (
                            <div key={tk.id} onClick={() => handleSelect(tk)}
                                className={
                                    'px-3.5 py-3 border-b border-zinc-800/50 cursor-pointer transition-all duration-100 border-l-2 ' +
                                    (selected?.id === tk.id ? 'bg-zinc-800/60 border-l-teal-500' : 'border-l-transparent hover:bg-zinc-800/30')
                                }>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        {tk.ticket_type && tk.ticket_type !== 'repair' && (
                                            <span className={{
                                                maintenance: 'text-blue-400 bg-blue-900/30 border-blue-800/40',
                                                rental:      'text-violet-400 bg-violet-900/30 border-violet-800/40',
                                            }[tk.ticket_type] + ' text-[10px] px-1.5 py-0.5 rounded border leading-none'}>
                                                {{ maintenance: 'Bảo trì', rental: 'Cho thuê' }[tk.ticket_type]}
                                            </span>
                                        )}
                                        <span className="text-zinc-600 text-xs">{tDevice(t, tk.equipments?.device_type) || t('ticket.device')}</span>
                                    </div>
                                    <StatusBadge status={tk.current_status} />
                                </div>
                                <p className="text-zinc-200 text-xs leading-snug line-clamp-2 mb-1.5">{tk.issue_summary}</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-zinc-700 text-xs">{new Date(tk.created_at).toLocaleDateString('vi-VN')}</p>
                                    {/* Nút Edit / Delete — chỉ khi Chờ xử lý */}
                                    {canEditDelete(tk) && (
                                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => setEditTicket(tk)}
                                                title="Chỉnh sửa"
                                                className="p-1 text-zinc-600 hover:text-teal-400 hover:bg-teal-900/20 rounded-lg transition-all">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                                </svg>
                                            </button>
                                            <button onClick={() => setDeleteTicket(tk)}
                                                title="Xóa phiếu"
                                                className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </aside>

                {/* RIGHT: chi tiết */}
                <main className="flex-1 overflow-hidden flex flex-col">
                    {selected ? (
                        <>
                            {/* Detail header */}
                            <div className="px-5 py-3.5 border-b border-zinc-800/60 shrink-0 fade-in">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-white text-sm font-semibold leading-snug mb-1.5">{selected.issue_summary}</h2>
                                        <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                                            {selected.equipments && (
                                                <span>{tDevice(t, selected.equipments.device_type)} — {selected.equipments.brand} {selected.equipments.model}</span>
                                            )}
                                            <span>{t('ticket.created')}: {new Date(selected.created_at).toLocaleDateString('vi-VN')}</span>
                                            <span>
                                                {t('portal.technician')}: <span className={selected.assignee ? 'text-teal-400' : 'text-zinc-700'}>
                                                    {selected.assignee?.full_name || t('ticket.unassigned')}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {canEditDelete(selected) && (
                                            <>
                                                <button onClick={() => setEditTicket(selected)}
                                                    className="flex items-center gap-1 text-zinc-500 hover:text-teal-400 text-xs border border-zinc-700 hover:border-teal-700/60 px-2.5 py-1 rounded-lg hover:bg-teal-900/10 transition-all">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                                    Sửa
                                                </button>
                                                <button onClick={() => setDeleteTicket(selected)}
                                                    className="flex items-center gap-1 text-zinc-500 hover:text-red-400 text-xs border border-zinc-700 hover:border-red-700/60 px-2.5 py-1 rounded-lg hover:bg-red-900/10 transition-all">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                    Xóa
                                                </button>
                                            </>
                                        )}
                                        <StatusBadge status={selected.current_status} />
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-hidden flex">
                                {/* Logs */}
                                <div className="flex-1 overflow-y-auto px-5 py-4">
                                    <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest mb-4">{t('ticket.history')}</p>
                                    {loadingL ? (
                                        <div className="w-4 h-4 border-2 border-zinc-700 border-t-teal-500 rounded-full animate-spin-slow" />
                                    ) : logs.length === 0 ? (
                                        <p className="text-zinc-700 text-xs">{t('ticket.no_history')}</p>
                                    ) : (
                                        <div className="relative pl-5 border-l border-zinc-800 space-y-3">
                                            {logs.map((log, i) => (
                                                <div key={log.id} className="relative fade-in" style={{ animationDelay: i * 30 + 'ms' }}>
                                                    <div className={'absolute -left-[21px] top-3.5 w-2.5 h-2.5 rounded-full border-2 ' + (ACTION_DOT[log.action_type] || 'border-zinc-600 bg-zinc-800')} />
                                                    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3.5">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className={'text-xs font-semibold ' + (ACTION_COLOR[log.action_type] || 'text-teal-400')}>{tAction(t, log.action_type)}</span>
                                                            <span className="text-zinc-700 text-xs">{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                                                        </div>
                                                        <p className="text-zinc-300 text-xs leading-relaxed">{log.note}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Right panel */}
                                <div className="w-72 shrink-0 border-l border-zinc-800/60 overflow-y-auto p-3 space-y-3">
                                    <TicketChat ticketId={selected?.id} />
                                    {selected?.current_status === 'Đã hoàn thành' && (
                                        <RatingWidget ticketId={selected?.id} />
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center">
                                <svg className="w-6 h-6 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-zinc-600 text-sm">{t('ticket.select')}</p>
                        </div>
                    )}
                </main>
            </div>

            {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} onCreated={fetchTickets} />}
            {editTicket && <EditTicketModal ticket={editTicket} onClose={() => setEditTicket(null)} onSaved={fetchTickets} />}
            {deleteTicket && <ConfirmDeleteModal ticket={deleteTicket} onCancel={() => setDeleteTicket(null)} onConfirm={handleDelete} deleting={deleting} />}
        </div>
    );
}

export default CustomerPortal;
