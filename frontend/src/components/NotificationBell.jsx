import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

function timeAgo(dateStr) {
    const diff = (Date.now() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
}

// Lay danh sach phieu cho admin truc tiep tu tickets table
// Khong can bang notifications
function NotificationBell({ onNavigateTicket }) {
    const { userId } = useAuth();
    const [tickets, setTickets]       = useState([]); // phieu chua xu ly
    const [readIds, setReadIds]       = useState(() => {
        try { return JSON.parse(localStorage.getItem('admin_read_tickets') || '[]'); }
        catch { return []; }
    });
    const [open, setOpen] = useState(false);
    const dropRef = useRef(null);

    const unreadCount = tickets.filter(t => !readIds.includes(t.id)).length;

    const fetchPending = async () => {
        const { data, error } = await supabase
            .from('tickets')
            .select('id, issue_summary, current_status, created_at, creator:profiles!created_by(full_name)')
            .not('current_status', 'eq', 'Da hoan thanh')
            .not('current_status', 'eq', '\u0110\u00e3 ho\u00e0n th\u00e0nh')
            .order('created_at', { ascending: false })
            .limit(30);
        if (error) console.warn('[BELL] fetch error:', error.message);
        setTickets(data || []);
    };

    // Subscribe to new ticket inserts
    useEffect(() => {
        if (!userId) return;
        fetchPending();

        const channel = supabase
            .channel('admin-bell-tickets')
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'tickets',
            }, payload => {
                setTickets(prev => [payload.new, ...prev].slice(0, 30));
            })
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'tickets',
            }, payload => {
                setTickets(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t));
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [userId]);

    // Close on outside click
    useEffect(() => {
        const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const markRead = (ticketId) => {
        const next = [...new Set([...readIds, ticketId])];
        setReadIds(next);
        localStorage.setItem('admin_read_tickets', JSON.stringify(next));
    };

    const markAllRead = () => {
        const next = tickets.map(t => t.id);
        setReadIds(next);
        localStorage.setItem('admin_read_tickets', JSON.stringify(next));
    };

    const handleClick = (ticket) => {
        markRead(ticket.id);
        setOpen(false);
        if (onNavigateTicket) onNavigateTicket(ticket.id);
    };

    return (
        <div className="relative" ref={dropRef}>
            {/* Bell button */}
            <button
                onClick={() => { setOpen(v => !v); if (!open) fetchPending(); }}
                className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition-colors"
                title="Thông báo phiếu mới"
            >
                <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                {/* Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl z-[300] overflow-hidden">
                    <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent"/>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                        <div>
                            <span className="text-white text-sm font-semibold">Phiếu cần xử lý</span>
                            <p className="text-zinc-600 text-xs">{tickets.length} phiếu đang chờ</p>
                        </div>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead}
                                className="text-zinc-500 hover:text-teal-400 text-xs transition-colors">
                                Đã đọc tất cả
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-96 overflow-y-auto divide-y divide-zinc-800/60">
                        {tickets.length === 0 && (
                            <div className="text-center py-10">
                                <svg className="w-8 h-8 text-zinc-800 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                                    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
                                </svg>
                                <p className="text-zinc-600 text-xs">Không có phiếu nào</p>
                            </div>
                        )}
                        {tickets.map(tk => {
                            const isUnread = !readIds.includes(tk.id);
                            return (
                                <button key={tk.id} onClick={() => handleClick(tk)}
                                    className={'w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-800/60 ' + (isUnread ? 'bg-zinc-800/25' : '')}>
                                    {/* Dot indicator */}
                                    <div className={'w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ' + (isUnread ? 'bg-teal-400' : 'bg-zinc-700')} />
                                    <div className="flex-1 min-w-0">
                                        <p className={'text-xs font-medium truncate ' + (isUnread ? 'text-white' : 'text-zinc-400')}>
                                            {tk.issue_summary || 'Phiếu không có mô tả'}
                                        </p>
                                        <p className="text-zinc-600 text-xs mt-0.5">
                                            {tk.creator?.full_name || 'Khách hàng'} — {tk.current_status}
                                        </p>
                                        <p className="text-zinc-700 text-xs mt-0.5">{timeAgo(tk.created_at)}</p>
                                    </div>
                                    {/* Arrow */}
                                    <svg className="w-3 h-3 text-zinc-700 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
                                    </svg>
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-900/80">
                        <button onClick={() => { setOpen(false); if (onNavigateTicket) onNavigateTicket(null); }}
                            className="text-teal-400 text-xs hover:text-teal-300 transition-colors w-full text-center">
                            Xem tất cả phiếu trong Hỗ trợ / Chat
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
