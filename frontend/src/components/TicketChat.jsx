import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

function TicketChat({ ticketId, compact, autoFocus }) {
    const { t } = useLanguage();
    const { userId, profile } = useAuth();

    const [messages, setMessages] = useState([]);
    const [input, setInput]       = useState('');
    const [sending, setSending]   = useState(false);
    const bottomRef = useRef(null);
    const inputRef  = useRef(null);

    // Load messages khi ticketId thay doi
    useEffect(() => {
        if (!ticketId) return;
        setMessages([]);
        // Auto focus input neu co prop
        if (autoFocus) setTimeout(() => inputRef.current?.focus(), 150);

        const fetchMessages = async () => {
            const { data } = await supabase
                .from('chat_messages')
                .select('*, sender:profiles!sender_id(full_name, role)')
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });
            setMessages(data || []);
        };

        fetchMessages();

        // Supabase Realtime subscription
        const channel = supabase.channel('chat-ticket-' + ticketId)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: 'ticket_id=eq.' + ticketId,
            }, async (payload) => {
                // Lấy thêm thông tin sender
                const { data: sender } = await supabase
                    .from('profiles')
                    .select('full_name, role')
                    .eq('id', payload.new.sender_id)
                    .single();
                setMessages(prev => {
                    // Tránh duplicate nếu tin nhắn do chính mình gửi đã được thêm optimistically
                    const exists = prev.some(m => m.id === payload.new.id);
                    if (exists) return prev;
                    return [...prev, { ...payload.new, sender }];
                });
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [ticketId]);

    // Auto scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || sending || !userId) return;

        setInput('');
        setSending(true);
        // Trả focus về input ngay lập tức để user gõ tiếp
        inputRef.current?.focus();

        // Optimistic update
        const tempMsg = {
            id: 'temp-' + Date.now(),
            ticket_id: ticketId,
            sender_id: userId,
            content: text,
            created_at: new Date().toISOString(),
            sender: { full_name: profile?.full_name || 'Bạn', role: profile?.role },
        };
        setMessages(prev => [...prev, tempMsg]);

        const { data, error } = await supabase
            .from('chat_messages')
            .insert({ ticket_id: ticketId, sender_id: userId, content: text })
            .select()
            .single();

        if (error) {
            console.error('[CHAT ERROR] ' + error.message);
            // Rollback optimistic
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        } else if (data) {
            // Replace temp với real record
            setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...data, sender: tempMsg.sender } : m));
        }

        setSending(false);
        // Đảm bảo focus vẫn ở input sau khi async hoàn thành
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    const isMe = (msg) => msg.sender_id === userId;

    const formatTime = (ts) => new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex flex-col bg-zinc-950/50 border border-zinc-800/60 rounded-xl overflow-hidden" style={{ height: '280px' }}>
            {/* Header */}
            <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-950/80 shrink-0 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-zinc-400 text-xs font-semibold">{t('chat.title')}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {messages.length === 0 ? (
                    <p className="text-zinc-700 text-xs text-center pt-4">{t('chat.empty')}</p>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={'flex ' + (isMe(msg) ? 'justify-end' : 'justify-start') + ' fade-in'}>
                            <div className={'max-w-[75%] ' + (isMe(msg) ? 'items-end' : 'items-start') + ' flex flex-col gap-0.5'}>
                                {!isMe(msg) && (
                                    <span className="text-zinc-600 text-xs px-1">
                                        {msg.sender?.full_name || 'N/A'}
                                    </span>
                                )}
                                <div className={'text-xs px-3 py-2 rounded-xl leading-relaxed ' + (isMe(msg)
                                    ? 'bg-teal-700/80 text-white rounded-tr-sm'
                                    : 'bg-zinc-800 text-zinc-200 rounded-tl-sm border border-zinc-700/40')}>
                                    {msg.content}
                                </div>
                                <span className="text-zinc-800 text-xs px-1">{formatTime(msg.created_at)}</span>
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-zinc-800 p-2 shrink-0 flex gap-1.5">
                <input
                    type="text"
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('chat.placeholder')}
                    disabled={sending || !userId}
                    className="flex-1 bg-zinc-800/80 border border-zinc-700/60 focus:border-teal-600/60 text-white text-xs px-3 py-1.5 rounded-lg placeholder-zinc-700 transition-all duration-150 disabled:opacity-40"
                />
                <button
                    onClick={sendMessage}
                    disabled={sending || !input.trim() || !userId}
                    className="bg-teal-700 hover:bg-teal-600 disabled:bg-zinc-800 disabled:text-zinc-700 text-white p-1.5 rounded-lg transition-all duration-150 shrink-0"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default TicketChat;
