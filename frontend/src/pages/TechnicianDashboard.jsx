import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import TopNavbar from '../components/TopNavbar';
import TicketCard from '../components/TicketCard';
import StatusBadge from '../components/StatusBadge';
import TicketChat from '../components/TicketChat';
import CreateTicketModal from '../components/CreateTicketModal';
import AIChatWidget from '../components/AIChatWidget';
import WorkSchedule from '../components/WorkSchedule';
import { tAction, tDevice } from '../lib/i18nMaps';

const STATUSES = ['Chờ xử lý', 'Đang xử lý', 'Chờ linh kiện', 'Đã hoàn thành', 'Khẩn cấp'];
const ACTION_TYPES = ['Tiếp nhận', 'Chẩn đoán', 'Xử lý', 'Bàn giao', 'Chờ'];

// Map action_type -> trang thai tu dong de xuat
const ACTION_TO_STATUS = {
    'Tiếp nhận': 'Chờ xử lý',
    'Chẩn đoán': 'Đang xử lý',
    'Xử lý':     'Đang xử lý',
    'Bàn giao':  'Đã hoàn thành',
    'Chờ':       'Chờ linh kiện',
};

const ACTION_COLOR = {
    'Tiếp nhận': 'text-blue-400',
    'Chẩn đoán': 'text-amber-400',
    'Xử lý':     'text-teal-400',
    'Bàn giao':  'text-emerald-400',
    'Chờ':       'text-zinc-500',
};
const ACTION_DOT = {
    'Tiếp nhận': 'border-blue-600 bg-blue-900/30',
    'Chẩn đoán': 'border-amber-600 bg-amber-900/30',
    'Xử lý':     'border-teal-600 bg-teal-900/30',
    'Bàn giao':  'border-emerald-600 bg-emerald-900/30',
    'Chờ':       'border-zinc-600 bg-zinc-800/40',
};

function TechnicianDashboard() {
    const { t }      = useLanguage();
    const { userId } = useAuth();

    const [tickets, setTickets]           = useState([]);
    const [selected, setSelected]         = useState(null);
    const [logs, setLogs]                 = useState([]);
    const [loadingT, setLoadingT]         = useState(true);
    const [loadingL, setLoadingL]         = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [showCreate, setShowCreate]     = useState(false);
    const [activeView, setActiveView]     = useState('tickets'); // 'tickets' | 'schedule'

    // Form cap nhat tien do
    const [actionType, setActionType]     = useState('Xử lý');
    const [newStatus, setNewStatus]       = useState('Đang xử lý');
    const [note, setNote]                 = useState('');
    const [saving, setSaving]             = useState(false);
    const [saveMsg, setSaveMsg]           = useState('');

    useEffect(() => { fetchTickets(); }, []);

    // Real-time: khi ticket duoc cap nhat, refresh lai
    useEffect(() => {
        const channel = supabase.channel('tech-tickets-rt')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'tickets',
            }, () => {
                fetchTickets();
            })
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    const fetchTickets = async () => {
        setLoadingT(true);
        const { data, error } = await supabase
            .from('tickets')
            .select('*, equipments(device_type, brand, model), assignee:profiles!assigned_to(full_name), creator:profiles!created_by(full_name)')
            .eq('assigned_to', userId)
            .order('created_at', { ascending: false });
        if (error) console.error('[TECH] fetchTickets error:', error.message);
        const list = data || [];
        setTickets(list);
        // Cap nhat selected neu dang xem phieu nao do
        if (list.length > 0) {
            const prev = selected;
            if (prev) {
                const refreshed = list.find(tk => tk.id === prev.id);
                if (refreshed) { setSelected(refreshed); return; }
            }
            setSelected(list[0]);
            fetchLogs(list[0].id);
        }
        setLoadingT(false);
    };

    const fetchLogs = async (id) => {
        setLoadingL(true);
        const { data } = await supabase
            .from('ticket_logs')
            .select('*')
            .eq('ticket_id', id)
            .order('created_at', { ascending: true });
        setLogs(data || []);
        setLoadingL(false);
    };

    const handleSelect = (tk) => {
        setSelected(tk);
        fetchLogs(tk.id);
        // Reset form
        setNote('');
        setSaveMsg('');
        setNewStatus(tk.current_status || 'Đang xử lý');
    };

    // Khi doi action_type, de xuat status tuong ung
    const handleActionChange = (act) => {
        setActionType(act);
        setNewStatus(ACTION_TO_STATUS[act] || selected?.current_status || 'Đang xử lý');
    };

    const handleSaveProgress = async () => {
        if (!note.trim() || !selected) return;
        setSaving(true);
        setSaveMsg('');

        try {
            // 1. Cap nhat trang thai phieu
            const { error: ticketErr } = await supabase
                .from('tickets')
                .update({ current_status: newStatus })
                .eq('id', selected.id);

            if (ticketErr) throw ticketErr;

            // 2. Ghi log xu ly
            const { error: logErr } = await supabase
                .from('ticket_logs')
                .insert({
                    ticket_id:   selected.id,
                    author_id:   userId,
                    action_type: actionType,
                    note:        note.trim(),
                });

            if (logErr) throw logErr;

            // 3. Cap nhat local state
            setTickets(prev => prev.map(tk =>
                tk.id === selected.id ? { ...tk, current_status: newStatus } : tk
            ));
            setSelected(prev => prev ? { ...prev, current_status: newStatus } : prev);

            // 4. Reload logs va reset form
            await fetchLogs(selected.id);
            setNote('');
            setSaveMsg('ok');
            setTimeout(() => setSaveMsg(''), 3000);

        } catch (err) {
            console.error('[UPDATE TICKET ERROR] ' + err.message);
            setSaveMsg('error');
        } finally {
            setSaving(false);
        }
    };

    const filtered = filterStatus === 'all' ? tickets : tickets.filter(tk => tk.current_status === filterStatus);

    const done = tickets.filter(tk => tk.current_status === 'Đã hoàn thành').length;
    const proc = tickets.filter(tk => tk.current_status === 'Đang xử lý').length;
    const wait = tickets.filter(tk => tk.current_status === 'Chờ xử lý' || tk.current_status === 'Chờ linh kiện').length;

    return (
        <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
            <TopNavbar />

            {/* Stats micro bar */}
            <div className="flex items-center gap-4 px-4 py-1.5 bg-zinc-950 border-b border-zinc-800/50 shrink-0 text-xs">
                <span className="text-zinc-600">{t('stats.total')}: <span className="text-zinc-300 font-semibold">{tickets.length}</span></span>
                <span className="text-zinc-600">{t('stats.done')}: <span className="text-emerald-400 font-semibold">{done}</span></span>
                <span className="text-zinc-600">{t('stats.processing')}: <span className="text-amber-400 font-semibold">{proc}</span></span>
                <span className="text-zinc-600">{t('stats.waiting')}: <span className="text-zinc-400 font-semibold">{wait}</span></span>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        onClick={() => setActiveView(v => v === 'tickets' ? 'schedule' : 'tickets')}
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                            activeView === 'schedule'
                                ? 'bg-teal-900/40 border-teal-700/60 text-teal-400'
                                : 'border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                        }`}
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        Lịch tuần
                    </button>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {t('ticket.new')}
                    </button>
                </div>
            </div>

            {activeView === 'schedule' ? (
                <div className="flex-1 overflow-y-auto"><WorkSchedule isAdmin={false} /></div>
            ) : (
            <div className="flex flex-1 overflow-hidden">
                {/* LEFT 30%: danh sach phieu */}
                <aside className="w-[30%] min-w-[200px] max-w-[300px] border-r border-zinc-800/60 flex flex-col bg-zinc-950">
                    <div className="px-3 pt-2.5 pb-2 border-b border-zinc-800/60 shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-zinc-400 text-xs font-semibold">{t('ticket.list')}</span>
                            <span className="text-zinc-700 text-xs">{filtered.length} {t('ticket.count')}</span>
                        </div>
                        <div className="relative">
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="w-full appearance-none bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs px-2.5 py-1.5 pr-6 rounded-lg cursor-pointer transition-colors"
                            >
                                <option value="all">{t('ticket.all_status')}</option>
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loadingT ? (
                            <div className="flex justify-center py-10"><div className="w-4 h-4 border-2 border-zinc-700 border-t-teal-500 rounded-full animate-spin-slow" /></div>
                        ) : filtered.length === 0 ? (
                            <p className="text-center text-zinc-700 text-xs py-10">{t('ticket.empty')}</p>
                        ) : (
                            filtered.map(tk => (
                                <TicketCard key={tk.id} ticket={tk} isSelected={selected?.id === tk.id} onClick={() => handleSelect(tk)} />
                            ))
                        )}
                    </div>
                </aside>

                {/* RIGHT 70%: chi tiet + cap nhat */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {selected ? (
                        <>
                            {/* Header phieu */}
                            <div className="px-5 py-4 border-b border-zinc-800/60 shrink-0 fade-in">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-white text-sm font-semibold leading-snug mb-2">{selected.issue_summary}</h2>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {/* Device info with S/N */}
                                        {selected.equipments && (
                                                <span className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-md">
                                                    {selected.equipments.device_type} — {selected.equipments.brand} {selected.equipments.model}
                                                    {selected.equipments.serial_number && (
                                                        <span className="text-zinc-600 font-mono">| S/N: {selected.equipments.serial_number}</span>
                                                    )}
                                                </span>
                                            )}
                                            {selected.equipments?.profiles?.full_name && (
                                                <span className="text-zinc-600 text-xs">{t('ticket.customer')}: {selected.equipments.profiles.full_name}</span>
                                            )}
                                            <span className="text-zinc-600 text-xs">
                                                {t('ticket.technician')}: <span className="text-zinc-400">{selected.assignee?.full_name || t('ticket.unassigned')}</span>
                                            </span>
                                            {/* Dia diem */}
                                            {selected.location && (
                                                <span className="inline-flex items-center gap-1.5 text-zinc-500 text-xs">
                                                    <svg className="w-3 h-3 text-teal-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                                    <span className="text-zinc-400">{selected.location}</span>
                                                    {selected.location_note && (
                                                        <span className="text-zinc-600">— {selected.location_note}</span>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <StatusBadge status={selected.current_status} />
                                </div>
                            </div>

                            {/* Body: logs + chat */}
                            <div className="flex-1 overflow-hidden flex">
                                {/* Log timeline */}
                                <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
                                    <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest">{t('ticket.history')}</p>

                                    {loadingL ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 border-2 border-zinc-700 border-t-teal-500 rounded-full animate-spin-slow" />
                                            <span className="text-zinc-700 text-xs">{t('ticket.loading')}</span>
                                        </div>
                                    ) : logs.length === 0 ? (
                                        <p className="text-zinc-700 text-xs">{t('ticket.no_history')}</p>
                                    ) : (
                                        <div className="relative pl-5 border-l border-zinc-800 space-y-3">
                                            {logs.map((log, i) => (
                                                <div key={log.id} className="relative fade-in" style={{ animationDelay: i * 30 + 'ms' }}>
                                                    <div className={'absolute -left-[21px] top-3.5 w-2.5 h-2.5 rounded-full border-2 ' + (ACTION_DOT[log.action_type] || 'border-zinc-600 bg-zinc-800')} />
                                                    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3.5 hover:border-zinc-700/80 transition-all">
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className={'text-xs font-semibold ' + (ACTION_COLOR[log.action_type] || 'text-teal-400')}>{tAction(t, log.action_type)}</span>
                                                            <span className="text-zinc-700 text-xs tabular-nums">{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                                                        </div>
                                                        <p className="text-zinc-300 text-xs leading-relaxed">{log.note}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="relative">
                                                <div className="absolute -left-[21px] top-2 w-2.5 h-2.5 rounded-full bg-zinc-900 border-2 border-zinc-700" />
                                                <p className="text-zinc-800 text-xs pl-1 pt-1">{t('ticket.start_history')}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Form cap nhat tien do */}
                                    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 mt-2 space-y-3">
                                        <p className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">{t('tech.update_progress')}</p>

                                        {/* Hang 1: loai hanh dong + trang thai moi */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-zinc-600 text-xs mb-1">{t('tech.action_type')}</label>
                                                <select
                                                    value={actionType}
                                                    onChange={e => handleActionChange(e.target.value)}
                                                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs px-2.5 py-1.5 rounded-lg appearance-none cursor-pointer"
                                                >
                                                    {ACTION_TYPES.map(a => (
                                                        <option key={a} value={a}>{tAction(t, a)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-zinc-600 text-xs mb-1">{t('tech.new_status')}</label>
                                                <select
                                                    value={newStatus}
                                                    onChange={e => setNewStatus(e.target.value)}
                                                    className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs px-2.5 py-1.5 rounded-lg appearance-none cursor-pointer"
                                                >
                                                    {STATUSES.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Ghi chu */}
                                        <div>
                                            <label className="block text-zinc-600 text-xs mb-1">{t('tech.note')} <span className="text-red-500">*</span></label>
                                            <textarea
                                                value={note}
                                                onChange={e => setNote(e.target.value)}
                                                placeholder={t('tech.note.placeholder')}
                                                rows={3}
                                                className="w-full bg-zinc-800 border border-zinc-700 focus:border-teal-600/60 text-white text-xs px-3 py-2 rounded-lg placeholder-zinc-700 resize-none transition-all"
                                            />
                                        </div>

                                        {/* Nut gui */}
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleSaveProgress}
                                                disabled={saving || !note.trim()}
                                                className="flex items-center gap-2 bg-teal-700 hover:bg-teal-600 disabled:bg-zinc-800 disabled:text-zinc-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all"
                                            >
                                                {saving ? (
                                                    <><span className="w-3 h-3 border-2 border-zinc-600 border-t-white rounded-full animate-spin-slow" />{t('tech.saving')}</>
                                                ) : (
                                                    <>{t('tech.save_progress')}</>
                                                )}
                                            </button>
                                            {saveMsg === 'ok' && (
                                                <span className="text-emerald-400 text-xs flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    {t('tech.saved')}
                                                </span>
                                            )}
                                            {saveMsg === 'error' && (
                                                <span className="text-red-400 text-xs">{t('create.error')}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Chat panel */}
                                <div className="w-72 shrink-0 border-l border-zinc-800/60 p-3 overflow-y-auto">
                                    <TicketChat ticketId={selected?.id} />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                            <div className="w-12 h-12 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center">
                                <svg className="w-6 h-6 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <p className="text-zinc-600 text-sm font-medium">{t('ticket.select')}</p>
                        </div>
                    )}
                </main>
            </div>
            )}

            {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} onCreated={fetchTickets} />}
            <AIChatWidget />
        </div>
    );
}

export default TechnicianDashboard;
