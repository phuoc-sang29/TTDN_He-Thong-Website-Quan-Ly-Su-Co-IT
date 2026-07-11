import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

// ── Nominatim search (OpenStreetMap, mien phi) ──
async function searchAddress(query) {
    if (!query || query.trim().length < 3) return [];
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&countrycodes=vn&addressdetails=1&accept-language=vi`;
        const res  = await fetch(url);
        const data = await res.json();
        return data.map(item => ({
            id:      item.place_id,
            label:   formatAddress(item),
            full:    item.display_name,
            lat:     parseFloat(item.lat),
            lng:     parseFloat(item.lon),
        }));
    } catch {
        return [];
    }
}

// Rut gon ten dia chi cho dep
function formatAddress(item) {
    const a = item.address || {};
    const parts = [
        a.road,
        a.house_number ? ('Số ' + a.house_number) : null,
        a.quarter || a.suburb,
        a.city_district,
        a.city || a.state,
    ].filter(Boolean);
    return parts.join(', ') || item.display_name;
}

// ── SVG icons ──
const IcPin = ({ cls = 'w-3.5 h-3.5' }) => (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
);
const IcClose = () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
        <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
);
const IcCheck = () => (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
        <path d="M20 6L9 17l-5-5"/>
    </svg>
);
const IcEdit = () => (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
);
const IcTrash = () => (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
);
const IcSearch = () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
);
const IcChevronDown = () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <path d="M6 9l6 6 6-6"/>
    </svg>
);

// ── Component chinh ──
export default function AddressWidget() {
    const { userId, profile } = useAuth();

    const [isOpen,    setIsOpen]    = useState(false);
    const [mode,      setMode]      = useState('view');   // 'view' | 'edit'
    const [saved,     setSaved]     = useState(null);     // { address, lat, lng }
    const [query,     setQuery]     = useState('');
    const [results,   setResults]   = useState([]);
    const [hiIdx,     setHiIdx]     = useState(-1);       // highlighted index
    const [loading,   setLoading]   = useState(false);
    const [saving,    setSaving]    = useState(false);
    const [msg,       setMsg]       = useState('');
    const [showDrop,  setShowDrop]  = useState(false);

    const inputRef   = useRef(null);
    const dropRef    = useRef(null);
    const debounceRef = useRef(null);

    // ── Load dia chi da luu ──
    useEffect(() => {
        if (!userId || !isOpen) return;
        (async () => {
            const { data } = await supabase
                .from('profiles')
                .select('address, lat, lng')
                .eq('id', userId)
                .single();
            if (data?.address) {
                setSaved({ address: data.address, lat: data.lat, lng: data.lng });
                setMode('view');
            } else {
                setMode('edit');
            }
        })();
    }, [userId, isOpen]);

    // ── Focus input khi chuyen sang mode edit ──
    useEffect(() => {
        if (mode === 'edit' && isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [mode, isOpen]);

    // ── Debounce search khi gõ ──
    useEffect(() => {
        clearTimeout(debounceRef.current);
        if (query.trim().length < 3) {
            setResults([]);
            setShowDrop(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            const list = await searchAddress(query);
            setResults(list);
            setHiIdx(-1);
            setShowDrop(list.length > 0);
            setLoading(false);
        }, 400);
        return () => clearTimeout(debounceRef.current);
    }, [query]);

    // ── Dong dropdown khi click ra ngoai ──
    useEffect(() => {
        const handler = (e) => {
            if (dropRef.current && !dropRef.current.contains(e.target)) {
                setShowDrop(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Chon mot goi y ──
    const handleSelect = useCallback(async (item) => {
        setQuery(item.label);
        setShowDrop(false);
        setHiIdx(-1);
        setSaving(true);
        setMsg('');

        const { error } = await supabase
            .from('profiles')
            .update({ address: item.label, lat: item.lat, lng: item.lng })
            .eq('id', userId);

        if (!error) {
            setSaved({ address: item.label, lat: item.lat, lng: item.lng });
            setMode('view');
            setQuery('');
            setMsg('ok');
            setTimeout(() => setMsg(''), 3000);
        } else {
            setMsg('Lưu thất bại. Vui lòng thử lại.');
        }
        setSaving(false);
    }, [userId]);

    // ── Xoa dia chi ──
    const handleDelete = useCallback(async () => {
        setSaving(true);
        await supabase
            .from('profiles')
            .update({ address: null, lat: null, lng: null })
            .eq('id', userId);
        setSaved(null);
        setQuery('');
        setResults([]);
        setMode('edit');
        setSaving(false);
    }, [userId]);

    // ── Phim tat ──
    const handleKeyDown = (e) => {
        if (!showDrop) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHiIdx(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHiIdx(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter' && hiIdx >= 0) {
            e.preventDefault();
            handleSelect(results[hiIdx]);
        } else if (e.key === 'Escape') {
            setShowDrop(false);
            setHiIdx(-1);
        }
    };

    const handleOpen = () => {
        setIsOpen(true);
        setMsg('');
    };

    const handleClose = () => {
        setIsOpen(false);
        setShowDrop(false);
        setQuery('');
        setResults([]);
    };

    // ── Collapsed button ──
    if (!isOpen) {
        return (
            <button
                onClick={handleOpen}
                title="Địa chỉ của tôi"
                className="fixed bottom-5 right-44 flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium px-3.5 py-2.5 rounded-full shadow-xl border border-zinc-700/80 hover:border-zinc-600 transition-all duration-200"
            >
                <span className={saved ? 'text-teal-400' : 'text-zinc-500'}>
                    <IcPin />
                </span>
                <span>{saved ? 'Địa chỉ' : 'Thêm địa chỉ'}</span>
                {/* Dot chi bao da co dia chi */}
                {saved && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                )}
            </button>
        );
    }

    // ── Expanded panel ──
    return (
        <div
            className="fixed bottom-5 right-5 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-visible slide-in-right"
            style={{ zIndex: 1000 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <span className="text-teal-400"><IcPin cls="w-4 h-4" /></span>
                    <span className="text-white text-xs font-semibold">Địa chỉ của tôi</span>
                </div>
                <button
                    onClick={handleClose}
                    className="text-zinc-600 hover:text-zinc-300 p-1 rounded-md hover:bg-zinc-800 transition-all"
                >
                    <IcChevronDown />
                </button>
            </div>

            <div className="px-4 py-3 space-y-3">

                {/* ── VIEW MODE: hien thi dia chi da luu ── */}
                {mode === 'view' && saved && (
                    <div className="space-y-2">
                        <p className="text-zinc-500 text-xs">Địa chỉ đã ghim:</p>
                        <div className="flex items-start gap-2.5 bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-3 py-2.5">
                            <span className="text-teal-400 mt-0.5 shrink-0"><IcPin cls="w-3.5 h-3.5" /></span>
                            <p className="text-zinc-200 text-xs leading-relaxed flex-1">{saved.address}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setMode('edit'); setQuery(saved.address); }}
                                className="flex items-center gap-1.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 text-xs px-3 py-1.5 rounded-lg transition-all"
                            >
                                <IcEdit /> Sửa địa chỉ
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={saving}
                                className="flex items-center gap-1.5 text-red-500 hover:text-red-300 bg-zinc-800 hover:bg-red-950/40 text-xs px-3 py-1.5 rounded-lg transition-all"
                            >
                                <IcTrash /> Xóa
                            </button>
                        </div>
                        {msg === 'ok' && (
                            <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                                <IcCheck /> Đã lưu địa chỉ thành công.
                            </div>
                        )}
                    </div>
                )}

                {/* ── EDIT MODE: o tim kiem co autocomplete ── */}
                {mode === 'edit' && (
                    <div className="space-y-2" ref={dropRef}>
                        <p className="text-zinc-500 text-xs">
                            {saved ? 'Tìm địa chỉ mới:' : 'Nhập địa chỉ của bạn:'}
                        </p>

                        {/* Input + Dropdown wrapper */}
                        <div className="relative">
                            {/* Search input */}
                            <div className="relative flex items-center">
                                <span className="absolute left-2.5 text-zinc-600 pointer-events-none">
                                    {loading
                                        ? <span className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-teal-400 rounded-full animate-spin block" />
                                        : <IcSearch />
                                    }
                                </span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={e => { setQuery(e.target.value); setShowDrop(true); }}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => results.length > 0 && setShowDrop(true)}
                                    placeholder="Số nhà, tên đường, quận..."
                                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-teal-500/70 text-white text-xs pl-8 pr-8 py-2 rounded-xl placeholder-zinc-600 outline-none transition-all"
                                />
                                {query && (
                                    <button
                                        onClick={() => { setQuery(''); setResults([]); setShowDrop(false); inputRef.current?.focus(); }}
                                        className="absolute right-2.5 text-zinc-600 hover:text-zinc-300 transition-colors"
                                    >
                                        <IcClose />
                                    </button>
                                )}
                            </div>

                            {/* Dropdown goi y */}
                            {showDrop && results.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50">
                                    {results.map((item, idx) => (
                                        <button
                                            key={item.id}
                                            onMouseDown={() => handleSelect(item)}
                                            onMouseEnter={() => setHiIdx(idx)}
                                            className={
                                                'w-full text-left flex items-start gap-2.5 px-3 py-2.5 text-xs transition-colors border-b border-zinc-700/50 last:border-0 ' +
                                                (hiIdx === idx
                                                    ? 'bg-teal-900/40 text-white'
                                                    : 'text-zinc-300 hover:bg-zinc-700/60 hover:text-white')
                                            }
                                        >
                                            <span className={
                                                'mt-0.5 shrink-0 ' +
                                                (hiIdx === idx ? 'text-teal-400' : 'text-zinc-600')
                                            }>
                                                <IcPin cls="w-3 h-3" />
                                            </span>
                                            <span className="leading-relaxed line-clamp-2">{item.label}</span>
                                        </button>
                                    ))}
                                    <div className="px-3 py-1.5 text-zinc-700 text-xs text-right border-t border-zinc-700/50">
                                        © OpenStreetMap
                                    </div>
                                </div>
                            )}

                            {/* Khong co ket qua */}
                            {showDrop && !loading && query.length >= 3 && results.length === 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-3 text-zinc-600 text-xs z-50">
                                    Không tìm thấy địa chỉ. Thử nhập đầy đủ hơn.
                                </div>
                            )}
                        </div>

                        {/* Hint */}
                        <p className="text-zinc-700 text-xs">
                            Gõ ít nhất 3 ký tự để xem gợi ý. Chọn địa chỉ để ghim.
                        </p>

                        {/* Nut huy (neu dang sua) */}
                        {saved && (
                            <button
                                onClick={() => { setMode('view'); setQuery(''); setResults([]); setShowDrop(false); }}
                                className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
                            >
                                Hủy thay đổi
                            </button>
                        )}

                        {/* Loi */}
                        {msg && msg !== 'ok' && (
                            <p className="text-red-400 text-xs">{msg}</p>
                        )}
                    </div>
                )}

                {/* Saving overlay */}
                {saving && (
                    <div className="flex items-center gap-2 text-zinc-500 text-xs">
                        <span className="w-3 h-3 border-2 border-zinc-600 border-t-teal-400 rounded-full animate-spin" />
                        Đang lưu...
                    </div>
                )}
            </div>
        </div>
    );
}
