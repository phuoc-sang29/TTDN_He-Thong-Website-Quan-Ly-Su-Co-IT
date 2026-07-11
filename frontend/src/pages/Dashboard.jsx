import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import TopNavbar from '../components/TopNavbar';
import TicketCard from '../components/TicketCard';
import StatusBadge from '../components/StatusBadge';
import AIChatWidget from '../components/AIChatWidget';

const STATUS_OPTIONS = ['Da ban giao', 'Dang xu ly', 'Dang cho', 'Khan cap'];

const ACTION_TYPE_COLOR = {
    'Tiep nhan': 'text-blue-400',
    'Chan doan':  'text-amber-400',
    'Xu ly':      'text-teal-400',
    'Ban giao':   'text-emerald-400',
    'Dang cho':   'text-zinc-400',
};

function TimelineDot({ actionType }) {
    const colorMap = {
        'Tiep nhan': 'border-blue-600 bg-blue-900/30',
        'Chan doan':  'border-amber-600 bg-amber-900/30',
        'Xu ly':      'border-teal-600 bg-teal-900/30',
        'Ban giao':   'border-emerald-600 bg-emerald-900/30',
        'Dang cho':   'border-zinc-600 bg-zinc-800/50',
    };
    const cls = colorMap[actionType] || 'border-zinc-600 bg-zinc-800/50';
    return (
        <div className={'absolute -left-[21px] top-3.5 w-2.5 h-2.5 rounded-full border-2 ' + cls} />
    );
}

function StatsBar({ tickets }) {
    const total    = tickets.length;
    const done     = tickets.filter(t => t.current_status === 'Da ban giao').length;
    const inProg   = tickets.filter(t => t.current_status === 'Dang xu ly').length;
    const waiting  = tickets.filter(t => t.current_status === 'Dang cho').length;

    const stats = [
        { label: 'Tong phieu', value: total, cls: 'text-zinc-300' },
        { label: 'Da ban giao', value: done,   cls: 'text-emerald-400' },
        { label: 'Dang xu ly',  value: inProg, cls: 'text-amber-400' },
        { label: 'Dang cho',    value: waiting,cls: 'text-zinc-500' },
    ];

    return (
        <div className="flex items-center gap-4 px-3 py-2 border-b border-zinc-800/60 bg-zinc-950/40 shrink-0">
            {stats.map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                    <span className={'text-sm font-bold leading-none ' + s.cls}>{s.value}</span>
                    <span className="text-zinc-700 text-xs">{s.label}</span>
                </div>
            ))}
        </div>
    );
}

function EmptyDetail() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <div className="w-12 h-12 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center">
                <svg className="w-6 h-6 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </div>
            <p className="text-zinc-600 text-sm font-medium">Chua chon phieu su co</p>
            <p className="text-zinc-700 text-xs">Chon mot phieu o danh sach ben trai de xem chi tiet</p>
        </div>
    );
}

function Dashboard({ session }) {
    const [tickets, setTickets]             = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [ticketLogs, setTicketLogs]       = useState([]);
    const [loadingTickets, setLoadingTickets] = useState(true);
    const [loadingLogs, setLoadingLogs]     = useState(false);
    const [filterStatus, setFilterStatus]   = useState('all');

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        setLoadingTickets(true);

        const { data, error } = await supabase
            .from('tickets')
            .select(`
                *,
                equipments (
                    device_type,
                    brand,
                    model,
                    profiles (
                        full_name
                    )
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[ERROR] Khong the tai danh sach ticket: ' + error.message);
            setLoadingTickets(false);
            return;
        }

        const list = data || [];
        setTickets(list);

        if (list.length > 0) {
            setSelectedTicket(list[0]);
            fetchLogs(list[0].id);
        }

        setLoadingTickets(false);
    };

    const fetchLogs = async (ticketId) => {
        setLoadingLogs(true);
        setTicketLogs([]);

        const { data, error } = await supabase
            .from('ticket_logs')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[ERROR] Khong the tai log: ' + error.message);
        } else {
            setTicketLogs(data || []);
        }

        setLoadingLogs(false);
    };

    const handleSelectTicket = (ticket) => {
        setSelectedTicket(ticket);
        fetchLogs(ticket.id);
    };

    const filteredTickets = filterStatus === 'all'
        ? tickets
        : tickets.filter(t => t.current_status === filterStatus);

    return (
        <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
            <TopNavbar session={session} />

            <div className="flex flex-1 overflow-hidden">

                {/* ===== LEFT PANEL 30% ===== */}
                <aside className="w-[30%] min-w-[220px] max-w-[320px] border-r border-zinc-800/60 flex flex-col bg-zinc-950">

                    {/* Stats summary */}
                    {!loadingTickets && tickets.length > 0 && (
                        <StatsBar tickets={tickets} />
                    )}

                    {/* Filter */}
                    <div className="px-3 pt-2.5 pb-2 border-b border-zinc-800/60 shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-zinc-400 text-xs font-semibold">Phieu su co</span>
                            <span className="text-zinc-700 text-xs">{filteredTickets.length} phieu</span>
                        </div>
                        <div className="relative">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full appearance-none bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs px-2.5 py-1.5 pr-6 rounded-lg cursor-pointer transition-colors"
                            >
                                <option value="all">Tat ca trang thai</option>
                                {STATUS_OPTIONS.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    {/* Ticket list */}
                    <div className="flex-1 overflow-y-auto">
                        {loadingTickets ? (
                            <div className="flex items-center justify-center py-10">
                                <div className="w-4 h-4 rounded-full border-2 border-zinc-700 border-t-teal-500 animate-spin-slow" />
                            </div>
                        ) : filteredTickets.length === 0 ? (
                            <p className="text-center text-zinc-700 text-xs py-10">Khong co phieu nao.</p>
                        ) : (
                            filteredTickets.map(ticket => (
                                <TicketCard
                                    key={ticket.id}
                                    ticket={ticket}
                                    isSelected={selectedTicket?.id === ticket.id}
                                    onClick={() => handleSelectTicket(ticket)}
                                />
                            ))
                        )}
                    </div>
                </aside>

                {/* ===== RIGHT PANEL 70% ===== */}
                <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
                    {selectedTicket ? (
                        <>
                            {/* Ticket header */}
                            <div className="px-6 py-4 border-b border-zinc-800/60 shrink-0 fade-in">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-white text-sm font-semibold leading-snug mb-2.5">
                                            {selectedTicket.issue_summary}
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                            {/* Device chip */}
                                            {selectedTicket.equipments && (
                                                <span className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-md">
                                                    <svg className="w-3 h-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                    {selectedTicket.equipments.device_type}
                                                    {' - '}
                                                    {selectedTicket.equipments.brand}
                                                    {' '}
                                                    {selectedTicket.equipments.model}
                                                </span>
                                            )}
                                            {/* Customer chip */}
                                            {selectedTicket.equipments?.profiles?.full_name && (
                                                <span className="inline-flex items-center gap-1 text-zinc-600 text-xs">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    {selectedTicket.equipments.profiles.full_name}
                                                </span>
                                            )}
                                            {/* Return date chip */}
                                            {selectedTicket.expected_return_date && (
                                                <span className="inline-flex items-center gap-1 text-zinc-600 text-xs">
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    {'Tra may: '}
                                                    {new Date(selectedTicket.expected_return_date).toLocaleDateString('vi-VN')}
                                                </span>
                                            )}
                                            {/* Created date */}
                                            <span className="text-zinc-700 text-xs">
                                                {'Tao ngay: '}
                                                {new Date(selectedTicket.created_at).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 pt-0.5">
                                        <StatusBadge status={selectedTicket.current_status} />
                                    </div>
                                </div>
                            </div>

                            {/* Log timeline */}
                            <div className="flex-1 overflow-y-auto px-6 py-5">
                                <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest mb-5">
                                    Lich su xu ly
                                </p>

                                {loadingLogs ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full border-2 border-zinc-700 border-t-teal-500 animate-spin-slow" />
                                        <span className="text-zinc-700 text-xs">Dang tai lich su...</span>
                                    </div>
                                ) : ticketLogs.length === 0 ? (
                                    <p className="text-zinc-700 text-xs">Chua co nhat ky xu ly nao.</p>
                                ) : (
                                    <div className="relative pl-5 border-l border-zinc-800 space-y-4">
                                        {ticketLogs.map((log, idx) => (
                                            <div key={log.id} className="relative fade-in" style={{ animationDelay: idx * 40 + 'ms' }}>
                                                <TimelineDot actionType={log.action_type} />

                                                <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-3.5 hover:border-zinc-700/80 hover:bg-zinc-900 transition-all duration-150">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={
                                                            'text-xs font-semibold ' +
                                                            (ACTION_TYPE_COLOR[log.action_type] || 'text-teal-400')
                                                        }>
                                                            {log.action_type}
                                                        </span>
                                                        <span className="text-zinc-700 text-xs tabular-nums">
                                                            {new Date(log.created_at).toLocaleString('vi-VN')}
                                                        </span>
                                                    </div>
                                                    <p className="text-zinc-300 text-xs leading-relaxed">
                                                        {log.note}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}

                                        {/* End of timeline marker */}
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-2 w-2.5 h-2.5 rounded-full bg-zinc-900 border-2 border-zinc-700" />
                                            <p className="text-zinc-800 text-xs pl-1 pt-1.5">
                                                Bat dau phieu
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <EmptyDetail />
                    )}
                </main>
            </div>

            {/* Floating AI Chat */}
            <AIChatWidget />
        </div>
    );
}

export default Dashboard;
