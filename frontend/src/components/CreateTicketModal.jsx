import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

// Cac loai phieu — dung cho admin
const TICKET_TYPES = [
    { value: 'repair',      label: 'Sửa chữa', color: 'teal' },
    { value: 'maintenance', label: 'Bảo trì',   color: 'blue' },
    { value: 'rental',      label: 'Cho thuê',  color: 'violet' },
];
// Technician chi duoc chon loai cho thue
const TECH_TICKET_TYPES = [
    { value: 'rental', label: 'Cho thuê', color: 'violet' },
];

const DEVICE_TYPES = [
    { value: 'PC',        label: 'PC / Máy bàn' },
    { value: 'Laptop',    label: 'Laptop' },
    { value: 'Máy in',    label: 'Máy in' },
    { value: 'Phần mềm',  label: 'Phần mềm' },
    { value: 'Màn hình',  label: 'Màn hình' },
    { value: 'Khác',      label: 'Khác' },
];

// Color map cho tung loai
const COLOR = {
    teal:   { active: 'bg-teal-700 border-teal-600 text-white',   dot: 'bg-teal-400',   btn: 'bg-teal-700 hover:bg-teal-600' },
    blue:   { active: 'bg-blue-700 border-blue-600 text-white',   dot: 'bg-blue-400',   btn: 'bg-blue-700 hover:bg-blue-600' },
    violet: { active: 'bg-violet-700 border-violet-600 text-white', dot: 'bg-violet-400', btn: 'bg-violet-700 hover:bg-violet-600' },
    amber:  { active: 'bg-amber-700 border-amber-600 text-white', dot: 'bg-amber-400',  btn: 'bg-amber-700 hover:bg-amber-600' },
};

// Nominatim strip house number
function stripHouseNumber(q) {
    return q.replace(/^(số|so|s\.?\s*)?\s*\d+[\w\/-]*\s*[,\s]+/i, '').replace(/^(số|so)\s+/i, '').trim();
}
async function searchNominatim(query) {
    if (!query || query.trim().length < 3) return [];
    const stripped = stripHouseNumber(query);
    const queries = [...new Set([query.trim(), stripped].filter(q => q.length >= 3))];
    try {
        const fetches = queries.map(q =>
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=4&accept-language=vi`)
                .then(r => r.json()).catch(() => [])
        );
        const results = (await Promise.all(fetches)).flat();
        const seen = new Set();
        return results
            .filter(d => { if (seen.has(d.place_id)) return false; seen.add(d.place_id); return true; })
            .slice(0, 5)
            .map(d => ({ id: d.place_id, label: d.display_name.split(', ').slice(0, 4).join(', ') }));
    } catch { return []; }
}

// ── LocationInput sub-component ──
function LocationInput({ value, onChange }) {
    const [results, setResults] = useState([]);
    const [showDrop, setShowDrop] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hiIdx, setHiIdx] = useState(-1);
    const debRef = useRef(null);
    const dropRef = useRef(null);

    useEffect(() => {
        clearTimeout(debRef.current);
        if (value.trim().length < 3) { setResults([]); setShowDrop(false); return; }
        debRef.current = setTimeout(async () => {
            setLoading(true);
            const list = await searchNominatim(value);
            setResults(list); setHiIdx(-1);
            if (list.length > 0) setShowDrop(true);
            setLoading(false);
        }, 450);
        return () => clearTimeout(debRef.current);
    }, [value]);

    useEffect(() => {
        const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const select = label => { onChange(label); setShowDrop(false); setResults([]); };
    const kd = e => {
        if (!showDrop) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setHiIdx(i => Math.min(i+1, results.length-1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHiIdx(i => Math.max(i-1, 0)); }
        else if (e.key === 'Enter' && hiIdx >= 0) { e.preventDefault(); select(results[hiIdx].label); }
        else if (e.key === 'Escape') { setShowDrop(false); }
    };

    return (
        <div className="relative" ref={dropRef}>
            <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600">
                    {loading
                        ? <span className="w-3 h-3 border-2 border-zinc-600 border-t-teal-400 rounded-full animate-spin block" />
                        : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    }
                </span>
                <input type="text" value={value}
                    onChange={e => { onChange(e.target.value); setShowDrop(true); }}
                    onKeyDown={kd} onFocus={() => results.length > 0 && setShowDrop(true)}
                    placeholder="VD: Đường Trần Văn Ơn, Thủ Dầu Một"
                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-teal-600/60 text-white text-xs pl-7 pr-7 py-2 rounded-lg placeholder-zinc-600 outline-none transition-all"
                />
                {value && (
                    <button type="button" onClick={() => { onChange(''); setResults([]); setShowDrop(false); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                )}
            </div>
            {showDrop && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-[200]">
                    {results.map((r, idx) => (
                        <button key={r.id} type="button" onMouseDown={() => select(r.label)} onMouseEnter={() => setHiIdx(idx)}
                            className={'w-full text-left flex items-start gap-2 px-3 py-2 text-xs border-b border-zinc-700/40 last:border-0 transition-colors ' +
                                (hiIdx === idx ? 'bg-teal-900/40 text-white' : 'text-zinc-300 hover:bg-zinc-700/60')}>
                            <svg className="w-3 h-3 mt-0.5 shrink-0 text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span className="line-clamp-2">{r.label}</span>
                        </button>
                    ))}
                    <p className="text-right text-zinc-700 text-xs px-3 py-1 border-t border-zinc-700/40">© OpenStreetMap</p>
                </div>
            )}
            {showDrop && !loading && value.trim().length >= 3 && results.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 z-[200]">
                    <p className="text-zinc-500 text-xs mb-1.5">Không tìm thấy gợi ý. Địa chỉ sẽ được lưu như đã nhập.</p>
                    <button type="button" onMouseDown={() => setShowDrop(false)} className="text-teal-400 text-xs">Dùng địa chỉ này →</button>
                </div>
            )}
        </div>
    );
}

// ── Modal chinh ──
function CreateTicketModal({ onClose, onCreated }) {
    const { t } = useLanguage();
    const { userId, profile } = useAuth();
    const isCustomer    = profile?.role === 'customer';
    const isTechnician  = profile?.role === 'technician';
    const isAdmin       = profile?.role === 'admin';

    // Technician mac dinh la rental
    const availableTypes = isTechnician ? TECH_TICKET_TYPES : TICKET_TYPES;
    const [ticketType, setTicketType] = useState(isTechnician ? 'rental' : 'repair');
    const [deviceType, setDeviceType] = useState('Laptop');
    const [brand, setBrand]           = useState('');
    const [model, setModel]           = useState('');
    const [location, setLocation]     = useState('');
    const [locationNote, setLocationNote] = useState('');
    const [issue, setIssue]           = useState('');

    // Cho thue — thiet bi va khach hang
    const [companyEqs, setCompanyEqs]         = useState([]);  // thiet bi cua cong ty
    const [selectedEqId, setSelectedEqId]     = useState(''); // may chon thue
    const [customers, setCustomers]           = useState([]);  // danh sach khach
    const [selectedCustomerId, setSelectedCustomerId] = useState('');

    // Cho thue — thoi gian va gia (chi admin moi set gia)
    const [rentalStart, setRentalStart] = useState('');
    const [rentalEnd, setRentalEnd]     = useState('');
    const [pricePerDay, setPricePerDay] = useState('');
    const [deposit, setDeposit]         = useState('');



    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    const activeType = availableTypes.find(t => t.value === ticketType) || availableTypes[0];
    const col = COLOR[activeType.color];

    // Pre-fill address from profile
    useEffect(() => {
        if (!userId || !isCustomer) return;
        (async () => {
            const { data } = await supabase.from('profiles').select('address').eq('id', userId).single();
            if (data?.address) setLocation(data.address);
        })();
    }, [userId, isCustomer]);

    // Fetch thiet bi co the cho thue (is_rentable = true)
    useEffect(() => {
        if (ticketType !== 'rental') return;
        supabase.from('equipments')
            .select('id, device_type, brand, model, is_rentable, is_available, owner:profiles!owner_id(role)')
            .order('created_at', { ascending: false })
            .then(({ data }) => {
                // Admin: lay tat ca thiet bi cong ty
                // KTV: chi lay thiet bi duoc danh dau is_rentable
                const all = (data || []).filter(eq => !eq.owner || eq.owner.role !== 'customer');
                const companyOnly = isTechnician
                    ? all.filter(eq => eq.is_rentable)
                    : all;
                setCompanyEqs(companyOnly);
                if (companyOnly.length > 0 && !selectedEqId) setSelectedEqId(companyOnly[0].id);
            });
    }, [ticketType, isTechnician]);

    // Fetch khach hang: admin -> tat ca customers, technician -> chi khach dc phan cong
    useEffect(() => {
        if (ticketType !== 'rental') return;
        if (isAdmin) {
            supabase.from('profiles').select('id, full_name, email').eq('role', 'customer').order('full_name')
                .then(({ data }) => setCustomers(data || []));
        } else if (isTechnician) {
            // Chi lay customers tu cac ticket da duoc phan cong cho minh
            supabase.from('tickets')
                .select('created_by, creator:profiles!created_by(id, full_name, email)')
                .eq('assigned_to', userId)
                .then(({ data }) => {
                    const seen = new Set();
                    const list = [];
                    (data || []).forEach(tk => {
                        if (tk.creator && !seen.has(tk.creator.id)) {
                            seen.add(tk.creator.id);
                            list.push(tk.creator);
                        }
                    });
                    setCustomers(list);
                });
        }
    }, [ticketType, isAdmin, isTechnician, userId]);

    // Tinh tong tien thue
    const rentalTotal = useCallback(() => {
        if (!rentalStart || !rentalEnd || !pricePerDay) return null;
        const days = Math.max(1, Math.ceil((new Date(rentalEnd) - new Date(rentalStart)) / 86400000));
        return (days * parseFloat(pricePerDay)).toLocaleString('vi-VN');
    }, [rentalStart, rentalEnd, pricePerDay]);

    const handleSubmit = useCallback(async e => {
        e.preventDefault();
        setError('');

        // Validate
        if (!issue.trim() && ticketType !== 'rental') {
            setError('Vui lòng mô tả vấn đề.'); return;
        }
        if (ticketType === 'rental' && (!rentalStart || !rentalEnd || !pricePerDay)) {
            setError('Vui lòng nhập đầy đủ thông tin cho thuê.'); return;
        }
        setSaving(true);
        try {
            // 1. Tao thiet bi
            let equipmentId = null;
            const { data: eq, error: eqErr } = await supabase.from('equipments').insert({
                owner_id: userId, device_type: deviceType,
                brand: brand.trim() || null, model: model.trim() || null,
            }).select().single();
            if (eqErr) throw eqErr;
            equipmentId = eq.id;

            // 2. Xay dung issue_summary
            let summary = '';
            if (ticketType === 'rental') {
                summary = `[Cho thuê] Từ ${rentalStart} đến ${rentalEnd} - ${pricePerDay}đ/ngày${issue.trim() ? ' - ' + issue.trim() : ''}`;
            } else {
                summary = issue.trim();
            }

            // 3. Tao phieu — thu voi full columns truoc, neu loi column missing thi thu lai voi core columns
            let ticket = null;
            const fullInsert = {
                equipment_id:   equipmentId,
                created_by:     userId,
                issue_summary:  summary,
                priority:       'normal',
                current_status: 'Chờ xử lý',
                ticket_type:    ticketType,
                location:       isCustomer && location.trim() ? location.trim() : null,
                location_note:  isCustomer && locationNote.trim() ? locationNote.trim() : null,
            };
            const { data: tk1, error: err1 } = await supabase.from('tickets').insert(fullInsert).select().single();
            if (err1) {
                // Co the cot ticket_type / location chua ton tai — thu voi core columns
                console.warn('[TICKET] Full insert failed, retrying core-only:', err1.message);
                const { data: tk2, error: err2 } = await supabase.from('tickets').insert({
                    equipment_id:   equipmentId,
                    created_by:     userId,
                    issue_summary:  summary,
                    priority:       'normal',
                    current_status: 'Chờ xử lý',
                }).select().single();
                if (err2) throw err2;
                ticket = tk2;
            } else {
                ticket = tk1;
            }

            // 4. Tao hop dong thue neu la rental
            if (ticketType === 'rental' && equipmentId) {
                supabase.from('rental_contracts').insert({
                    equipment_id:    equipmentId,
                    customer_id:     selectedCustomerId || userId,
                    start_date:      rentalStart,
                    end_date:        rentalEnd,
                    price_per_day:   0,           // Admin se dinh gia khi duyet
                    deposit:         0,
                    created_by:      userId,
                    status:          'pending',   // cho admin duyet
                    approval_status: 'pending',
                    notes:           issue.trim() || null,
                }).then(({ error }) => { if (error) console.warn('[RENTAL CONTRACT]', error.message); });
            }

            // 5. Log tu dong (optional — khong block)
            const logParts = ['Phieu duoc tao'];
            if (isCustomer && location.trim()) logParts.push('Dia diem: ' + location.trim());
            if (isCustomer && locationNote.trim()) logParts.push('Ghi chu: ' + locationNote.trim());
            supabase.from('ticket_logs').insert({
                ticket_id: ticket.id, author_id: userId,
                action_type: 'Tiep nhan', note: logParts.join(' - '),
            }).then(({ error }) => { if (error) console.warn('[TICKET LOG]', error.message); });

            // 6. Notification cho admin (optional — khong block)
            supabase.from('profiles').select('id').eq('role', 'admin').then(({ data: admins }) => {
                if (!admins?.length) return;
                const typeLabels = { repair: 'Sua chua', maintenance: 'Bao tri', rental: 'Cho thue', purchase_request: 'De xuat mua' };
                supabase.from('notifications').insert(
                    admins.map(a => ({
                        recipient_id: a.id, sender_id: userId,
                        type: 'new_ticket',
                        title: `Phieu ${typeLabels[ticketType] || 'moi'}`,
                        body: summary.slice(0, 100),
                        ticket_id: ticket.id,
                    }))
                ).then(({ error }) => { if (error) console.warn('[NOTIFICATION]', error.message); });
            });

            onCreated?.();
            onClose?.();
        } catch (err) {
            console.error('[CREATE TICKET]', err.message);
            setError('Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setSaving(false);
        }
    }, [ticketType, deviceType, brand, model, location, locationNote, issue,
        rentalStart, rentalEnd, pricePerDay, deposit,
        selectedEqId, selectedCustomerId,
        userId, isCustomer, onCreated, onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-lg fade-in max-h-[92vh] overflow-y-auto">
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

                <div className="px-6 py-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-white text-base font-semibold">Tạo phiếu yêu cầu</h2>
                        <button onClick={onClose} className="text-zinc-600 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* === Loai phieu — chi Technician moi duoc chon === */}
                        {isTechnician && (
                            <div>
                                <label className="block text-zinc-500 text-xs font-medium mb-2">Loại yêu cầu</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {availableTypes.map(tt => (
                                        <button key={tt.value} type="button" onClick={() => setTicketType(tt.value)}
                                            className={
                                                'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ' +
                                                (ticketType === tt.value
                                                    ? COLOR[tt.color].active
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600')
                                            }>
                                            {tt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Section: Thiet bi ── */}
                        {(
                            <>
                                <div>
                                    <label className="block text-zinc-500 text-xs font-medium mb-2">Loại thiết bị</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {DEVICE_TYPES.map(dt => (
                                            <button key={dt.value} type="button" onClick={() => setDeviceType(dt.value)}
                                                className={
                                                    'text-xs px-3 py-1.5 rounded-lg border transition-all ' +
                                                    (deviceType === dt.value ? col.active : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600')
                                                }>
                                                {dt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-zinc-500 text-xs font-medium mb-1.5">Hãng</label>
                                        <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Dell, HP, Asus..."
                                            className="w-full bg-zinc-800 border border-zinc-700 focus:border-teal-600/60 text-white text-xs px-3 py-2 rounded-lg placeholder-zinc-600 outline-none transition-all"/>
                                    </div>
                                    <div>
                                        <label className="block text-zinc-500 text-xs font-medium mb-1.5">Model</label>
                                        <input type="text" value={model} onChange={e => setModel(e.target.value)} placeholder="Inspiron 15, VivoBook..."
                                            className="w-full bg-zinc-800 border border-zinc-700 focus:border-teal-600/60 text-white text-xs px-3 py-2 rounded-lg placeholder-zinc-600 outline-none transition-all"/>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* == Section: Cho thue == */}
                        {ticketType === 'rental' && (
                            <div className="bg-violet-950/30 border border-violet-800/40 rounded-xl p-3.5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-violet-300 text-xs font-medium">Thông tin cho thuê</p>
                                    {isTechnician && (
                                        <span className="text-amber-400 text-[10px] bg-amber-900/30 border border-amber-800/40 px-2 py-0.5 rounded-full">
                                            Chờ admin duyệt và định giá
                                        </span>
                                    )}
                                </div>

                                {/* Chon may tinh thue */}
                                <div>
                                    <label className="block text-zinc-500 text-xs mb-1.5">Thiết bị thuê <span className="text-red-500">*</span></label>
                                    {companyEqs.length > 0 ? (
                                        <select value={selectedEqId} onChange={e => setSelectedEqId(e.target.value)}
                                            className="w-full bg-zinc-800 border border-zinc-700 focus:border-violet-600/60 text-white text-xs px-3 py-2 rounded-lg outline-none transition-all">
                                            <option value="">-- Chọn thiết bị --</option>
                                            {companyEqs.map(eq => (
                                                <option key={eq.id} value={eq.id}>
                                                    {eq.device_type}{eq.brand ? ' — ' + eq.brand : ''}{eq.model ? ' ' + eq.model : ''}
                                                    {eq.is_available === false ? ' (Đang được thuê)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-zinc-600 text-xs italic">
                                            {isTechnician
                                                ? 'Chưa có thiết bị nào được admin đánh dấu cho thuê. Liên hệ admin.'
                                                : 'Chưa có thiết bị nào trong hệ thống. Thêm thiết bị trước.'}
                                        </p>
                                    )}
                                </div>

                                {/* Chon khach hang */}
                                <div>
                                    <label className="block text-zinc-500 text-xs mb-1.5">Khách hàng <span className="text-red-500">*</span></label>
                                    <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}
                                        className="w-full bg-zinc-800 border border-zinc-700 focus:border-violet-600/60 text-white text-xs px-3 py-2 rounded-lg outline-none transition-all">
                                        <option value="">-- Chọn khách hàng --</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.full_name || c.email}</option>
                                        ))}
                                    </select>
                                    {isTechnician && customers.length === 0 && (
                                        <p className="text-zinc-600 text-xs mt-1 italic">Chỉ có thể chọn khách hàng đã được phân công cho bạn.</p>
                                    )}
                                </div>

                                {/* Thoi gian */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-zinc-500 text-xs mb-1.5">Ngày bắt đầu <span className="text-red-500">*</span></label>
                                        <input type="date" value={rentalStart} onChange={e => setRentalStart(e.target.value)} required
                                            className="w-full bg-zinc-800 border border-zinc-700 focus:border-violet-600/60 text-white text-xs px-3 py-2 rounded-lg outline-none transition-all"/>
                                    </div>
                                    <div>
                                        <label className="block text-zinc-500 text-xs mb-1.5">Ngày kết thúc <span className="text-red-500">*</span></label>
                                        <input type="date" value={rentalEnd} onChange={e => setRentalEnd(e.target.value)} required
                                            className="w-full bg-zinc-800 border border-zinc-700 focus:border-violet-600/60 text-white text-xs px-3 py-2 rounded-lg outline-none transition-all"/>
                                    </div>
                                </div>

                                {/* Gia — chi Admin moi thay, KTV an hoàn toàn */}
                                {!isTechnician && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-zinc-500 text-xs mb-1.5">
                                                Giá thuê / ngày (đ) <span className="text-red-500">*</span>
                                            </label>
                                            <input type="number" value={pricePerDay} onChange={e => setPricePerDay(e.target.value)}
                                                placeholder="150000" min="0"
                                                className="w-full bg-zinc-800 border border-zinc-700 focus:border-violet-600/60 text-white text-xs px-3 py-2 rounded-lg placeholder-zinc-600 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-zinc-500 text-xs mb-1.5">Tiền đặt cọc (đ)</label>
                                            <input type="number" value={deposit} onChange={e => setDeposit(e.target.value)}
                                                placeholder="0" min="0"
                                                className="w-full bg-zinc-800 border border-zinc-700 focus:border-violet-600/60 text-white text-xs px-3 py-2 rounded-lg placeholder-zinc-600 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                )}

                                {!isTechnician && rentalTotal() && (
                                    <div className="flex items-center justify-between bg-violet-900/30 rounded-lg px-3 py-2">
                                        <span className="text-zinc-400 text-xs">Tổng ước tính:</span>
                                        <span className="text-violet-300 text-sm font-bold">{rentalTotal()}đ</span>
                                    </div>
                                )}

                                {isTechnician && rentalStart && rentalEnd && (
                                    <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-800/30 rounded-lg px-3 py-2">
                                        <svg className="w-3 h-3 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                        </svg>
                                        <span className="text-amber-400 text-xs">
                                            {Math.max(1, Math.ceil((new Date(rentalEnd) - new Date(rentalStart)) / 86400000))} ngày — Admin sẽ xác nhận giá sau khi duyệt
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Mo ta su co ── */}
                        {(
                            <div>
                                <label className="block text-zinc-500 text-xs font-medium mb-1.5">
                                    {ticketType === 'rental' ? 'Ghi chú thêm' : 'Mô tả vấn đề'}{' '}
                                    {ticketType !== 'rental' && <span className="text-red-500">*</span>}
                                </label>
                                <textarea value={issue} onChange={e => setIssue(e.target.value)}
                                    placeholder={ticketType === 'maintenance' ? 'Mô tả nội dung bảo trì cần thực hiện...' : ticketType === 'rental' ? 'Yêu cầu cấu hình, phần mềm cần cài...' : 'Mô tả chi tiết sự cố...'}
                                    rows={3} required={ticketType !== 'rental'}
                                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-teal-600/60 text-white text-xs px-3 py-2 rounded-lg placeholder-zinc-600 resize-none outline-none transition-all"/>
                            </div>
                        )}

                        {/* ── Dia diem (chi khach hang) ── */}
                        {isCustomer && (
                            <>
                                <div>
                                    <label className="flex items-center gap-1.5 text-zinc-500 text-xs font-medium mb-1.5">
                                        <svg className="w-3 h-3 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                        Địa điểm / Nơi làm việc
                                    </label>
                                    <LocationInput value={location} onChange={setLocation}/>
                                    <p className="text-zinc-700 text-xs mt-1">Nhập tên đường + thành phố để xem gợi ý. Số nhà, khóm điền vào Ghi chú.</p>
                                </div>
                                <div>
                                    <label className="block text-zinc-500 text-xs font-medium mb-1.5">
                                        Ghi chú địa điểm <span className="text-zinc-700 font-normal">(số nhà, khóm, tầng, mốc nhận ra)</span>
                                    </label>
                                    <input type="text" value={locationNote} onChange={e => setLocationNote(e.target.value)}
                                        placeholder="VD: Số 45, Khóm 10 / Tầng 3 phòng Kế toán"
                                        className="w-full bg-zinc-800 border border-zinc-700 focus:border-teal-600/60 text-white text-xs px-3 py-2 rounded-lg placeholder-zinc-600 outline-none transition-all"/>
                                </div>
                            </>
                        )}

                        {error && <p className="text-red-400 text-xs bg-red-950/50 border border-red-900/40 px-3 py-2 rounded-lg">{error}</p>}

                        <div className="flex gap-2 pt-1">
                            <button type="button" onClick={onClose}
                                className="flex-1 text-zinc-400 hover:text-white text-xs font-medium py-2.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-all">
                                Hủy
                            </button>
                            <button type="submit" disabled={saving}
                                className={`flex-1 ${col.btn} disabled:bg-zinc-800 disabled:text-zinc-700 text-white text-xs font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2`}>
                                {saving
                                    ? <><span className="w-3 h-3 border-2 border-zinc-600 border-t-white rounded-full animate-spin-slow"/>Đang tạo...</>
                                    : 'Tạo phiếu'
                                }
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default CreateTicketModal;
