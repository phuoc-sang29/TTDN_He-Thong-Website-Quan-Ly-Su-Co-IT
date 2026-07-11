import { useState, useRef, useEffect } from 'react';

const INITIAL_MESSAGE = {
    role: 'assistant',
    content:
        'Xin chào! Tôi là trợ lý IT Helpdesk nội bộ. Tôi có thể trả lời các câu hỏi về sự cố kỹ thuật trong hệ thống. Bạn cần hỗ trợ gì?',
};

function TypingDots() {
    return (
        <div className="flex items-center gap-1 px-3 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 typing-dot" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 typing-dot" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 typing-dot" />
        </div>
    );
}

function ChatMessage({ msg }) {
    const isUser = msg.role === 'user';
    return (
        <div className={'flex ' + (isUser ? 'justify-end' : 'justify-start') + ' fade-in'}>
            {!isUser && (
                <div className="w-5 h-5 rounded-full bg-teal-900 border border-teal-700/50 flex items-center justify-center shrink-0 mr-1.5 mt-0.5">
                    <svg className="w-2.5 h-2.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
            )}
            <div
                className={
                    'max-w-[82%] text-xs px-3 py-2 rounded-xl leading-relaxed whitespace-pre-wrap ' +
                    (isUser
                        ? 'bg-teal-700/80 text-white rounded-tr-sm'
                        : 'bg-zinc-700/70 text-zinc-200 rounded-tl-sm border border-zinc-600/30')
                }
            >
                {msg.content}
            </div>
        </div>
    );
}

function AIChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([INITIAL_MESSAGE]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 120);
        }
    }, [isOpen]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        setInput('');
        const currentMessages = [...messages, { role: 'user', content: text }];
        setMessages(currentMessages);
        setIsLoading(true);

        const history = messages
            .slice(1)
            .map(m => ({ role: m.role, content: m.content }));

        const tryFetch = async () => {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text, history }),
                signal: AbortSignal.timeout(55000), // 55 giay timeout
            });
            return res.json();
        };

        try {
            let data;
            try {
                data = await tryFetch();
            } catch {
                // Thu lai 1 lan neu loi ket noi (backend vua restart)
                await new Promise(r => setTimeout(r, 1000));
                data = await tryFetch();
            }
            const reply = data.reply || data.error || 'Không nhận được phản hồi từ server.';
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        } catch {
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Lỗi kết nối tới AI. Thử lại sau vài giây hoặc kiểm tra backend (port 3001).',
                },
            ]);
        } finally {
            setIsLoading(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleClearChat = () => {
        setMessages([INITIAL_MESSAGE]);
    };

    /* Collapsed state - floating button */
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-5 right-5 group flex items-center gap-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl border border-zinc-700/80 hover:border-teal-600/50 transition-all duration-200 hover:shadow-teal-950/30"
            >
                {/* Pulsing dot indicator */}
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                </span>
                AI Helpdesk
            </button>
        );
    }

    /* Expanded chat panel */
    return (
        <div
            className="fixed bottom-5 right-5 flex flex-col bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden slide-in-right"
            style={{ width: '340px', height: '480px' }}
        >
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-teal-900/60 border border-teal-700/40 flex items-center justify-center">
                        <svg className="w-3 h-3 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-white text-xs font-semibold leading-none mb-0.5">AI Helpdesk Assistant</p>
                        <p className="text-zinc-600 text-xs leading-none">Chỉ trả lời sự cố IT nội bộ</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleClearChat}
                        className="text-zinc-600 hover:text-zinc-400 text-xs px-2 py-1 rounded-md hover:bg-zinc-800 transition-all duration-100"
                        title="Xóa lịch sử chat"
                    >
                        Xóa
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-zinc-600 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-all duration-100"
                        title="Thu gọn"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Message list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {messages.map((msg, i) => (
                    <ChatMessage key={i} msg={msg} />
                ))}

                {isLoading && (
                    <div className="flex justify-start fade-in">
                        <div className="w-5 h-5 rounded-full bg-teal-900 border border-teal-700/50 flex items-center justify-center shrink-0 mr-1.5 mt-0.5">
                            <svg className="w-2.5 h-2.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="bg-zinc-700/70 border border-zinc-600/30 rounded-xl rounded-tl-sm">
                            <TypingDots />
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-zinc-800 p-2.5 shrink-0 bg-zinc-950/50">
                <div className="flex gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập câu hỏi..."
                        disabled={isLoading}
                        className="flex-1 bg-zinc-800/80 border border-zinc-700/60 focus:border-teal-600/60 text-white text-xs px-3 py-2 rounded-lg placeholder-zinc-700 transition-all duration-150 disabled:opacity-40"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        className="bg-teal-700 hover:bg-teal-600 disabled:bg-zinc-800 disabled:text-zinc-700 text-white p-2 rounded-lg transition-all duration-150 shrink-0"
                        title="Gửi (Enter)"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                </div>
                <p className="text-zinc-800 text-xs mt-1.5 text-center">Enter để gửi</p>
            </div>
        </div>
    );
}

export default AIChatWidget;
