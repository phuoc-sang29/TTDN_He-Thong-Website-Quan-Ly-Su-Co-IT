import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const STATUS_MAP = {
    pending:   { label: 'Chờ duyệt',  cls: 'bg-amber-900/40 text-amber-400 border-amber-800/40' },
    active:    { label: 'Đang thuê',  cls: 'bg-teal-900/40 text-teal-400 border-teal-800/40' },
    returned:  { label: 'Đã trả',     cls: 'bg-zinc-800 text-zinc-500 border-zinc-700' },
    overdue:   { label: 'Quá hạn',    cls: 'bg-red-900/40 text-red-400 border-red-800/40' },
    cancelled: { label: 'Đã hủy',     cls: 'bg-zinc-800 text-zinc-600 border-zinc-700' },
    rejected:  { label: 'Từ chối',    cls: 'bg-zinc-800 text-zinc-600 border-zinc-700' },
};

function days(start, end) {
    return Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000));
}
function fmt(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN');
}

// Modal admin duyệt: điền giá + cọc
function ApproveModal({ contract, onClose, onDone }) {
    const { userId } = useAuth();
    const [pricePerDay, setPricePerDay] = useState('');
    const [deposit, setDeposit]         = useState('');
    const [note, setNote]               = useState('');
    const [saving, setSaving]           = useState(false);
    const [error, setError]             = useState('');

    const d = contract.start_date && contract.end_date
        ? days(contract.start_date, contract.end_date) : 0;
    const total = pricePerDay && d ? (d * parseFloat(pricePerDay)).toLocaleString('vi-VN') : null;

    const handleApprove = async () => {
        if (!pricePerDay || parseFloat(pricePerDay) <= 0) {
            setError('Vui lòng nhập giá thuê/ngày.'); return;
        }
        setSaving(true);
        const { error: err } = await supabase.from('rental_contracts').update({
            price_per_day:   parseFloat(pricePerDay),
            deposit:         deposit ? parseFloat(deposit) : 0,
            approval_status: 'approved',
            status:          'active',
            approved_by:     userId,
            approved_at:     new Date().toISOString(),
            notes:           note.trim() || contract.notes || null,
        }).eq('id', contract.id);
        if (err) { setError('Lỗi: ' + err.message); setSaving(false); return; }

        // Đánh dấu thiết bị không còn available
        if (contract.equipment_id) {
            await supabase.from('equipments')
                .update({ is_available: false })
                .eq('id', contract.equipment_id);
        }
        onDone();
    };

    const handleReject = async () => {
        setSaving(true);
        await supabase.from('rental_contracts').update({
            approval_status: 'rejected',
            status:          'cancelled',
            approved_by:     userId,
            approved_at:     new Date().toISOString(),
        }).eq('id', contract.id);
        onDone();
    };

    const eq = contract.equipment;
    const cust = contract.customer;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md p-6 fade-in">
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white text-sm font-semibold">Duyệt yêu cầu thuê thiết bị</h3>
                    <button onClick={onClose} className="text-zinc-600 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>

                {/* Thông tin yêu cầu */}
                <div className="bg-zinc-800/60 border border-zinc-700/40 rounded-xl p-3.5 mb-5 space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Khách hàng</span>
                        <span className="text-zinc-200 font-medium">{cust?.full_name || cust?.email || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Thiết bị</span>
                        <span className="text-zinc-200">{eq?.device_type} {eq?.brand} {eq?.model}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">Thời gian</span>
                        <span className="text-zinc-200">{fmt(contract.start_date)} → {fmt(contract.end_date)} ({d} ngày)</span>
                    </div>
                    {contract.notes && (
                        <div className="pt-1 border-t border-zinc-700/40">
                            <span className="text-zinc-600 text-xs">Ghi chú KTV: </span>
                            <span className="text-zinc-400 text-xs">{contract.notes}</span>
                        </div>
                    )}
                </div>

                {/* Admin điền giá */}
                <div className="space-y-3 mb-5">
                    <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Điều khoản giá thuê</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-zinc-500 text-xs mb-1.5">
                                Giá thuê / ngày (đ) <span className="text-red-500">*</span>
                            </label>
                            <input type="number" value={pricePerDay} onChange={e => setPricePerDay(e.target.value)}
                                placeholder="VD: 150000" min="0" autoFocus
                                className="w-full bg-zinc-800 border border-zinc-700 focus:border-violet-600/60 text-white text-xs px-3 py-2 rounded-lg placeholder-zinc-600 outline-none transition-all"/>
                        </div>
                        <div>
                            <label className="block text-zinc-500 text-xs mb-1.5">Tiền đặt cọc (đ)</label>
                            <input type="number" value={deposit} onChange={e => setDeposit(e.target.value)}
                                placeholder="0" min="0"
                                className="w-full bg-zinc-800 border border-zinc-700 focus:border-violet-600/60 text-white text-xs px-3 py-2 rounded-lg placeholder-zinc-600 outline-none transition-all"/>
                        </div>
                    </div>
                    {total && (
                        <div className="flex items-center justify-between bg-violet-950/40 border border-violet-800/30 rounded-lg px-3 py-2">
                            <span className="text-zinc-400 text-xs">Tổng tiền thuê ({d} ngày):</span>
                            <span className="text-violet-300 font-bold text-sm">{total}đ</span>
                        </div>
                    )}
                    <div>
                        <label className="block text-zinc-500 text-xs mb-1.5">Ghi chú của admin</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                            placeholder="Điều kiện bàn giao, tình trạng máy..."
                            className="w-full bg-zinc-800 border border-zinc-700 focus:border-violet-600/60 text-white text-xs px-3 py-2 rounded-lg placeholder-zinc-600 resize-none outline-none transition-all"/>
                    </div>
                </div>

                {error && <p className="text-red-400 text-xs bg-red-950/40 border border-red-900/40 px-3 py-2 rounded-lg mb-4">{error}</p>}

                <div className="flex gap-2">
                    <button onClick={handleReject} disabled={saving}
                        className="flex-1 text-red-400 hover:text-white text-xs font-medium py-2.5 rounded-xl border border-red-900/50 hover:bg-red-950/40 transition-all disabled:opacity-50">
                        Từ chối
                    </button>
                    <button onClick={handleApprove} disabled={saving}
                        className="flex-1 bg-violet-700 hover:bg-violet-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2">
                        {saving
                            ? <><span className="w-3 h-3 border-2 border-zinc-600 border-t-white rounded-full animate-spin"/>Đang lưu...</>
                            : 'Duyệt & Kích hoạt'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function RentalManagement() {
    const [contracts, setContracts]   = useState([]);
    const [loading, setLoading]       = useState(true);
    const [subTab, setSubTab]         = useState('pending'); // pending | active | history
    const [approveTarget, setApproveTarget] = useState(null);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('rental_contracts')
            .select('*, customer:profiles!customer_id(full_name), equipment:equipments(device_type, brand, model)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[RENTAL] Fetch error:', error.code, error.message, error.details);
        }

        const now = new Date();
        const updated = (data || []).map(c => {
            if (c.status === 'active' && new Date(c.end_date) < now) return { ...c, status: 'overdue' };
            return c;
        });
        setContracts(updated);
        setLoading(false);
    };

    const updateStatus = async (id, status) => {
        await supabase.from('rental_contracts').update({ status }).eq('id', id);
        // Nếu đã trả -> đánh dấu thiết bị available trở lại
        if (status === 'returned') {
            const contract = contracts.find(c => c.id === id);
            if (contract?.equipment_id) {
                await supabase.from('equipments').update({ is_available: true }).eq('id', contract.equipment_id);
            }
        }
        setContracts(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    };

    const pending   = contracts.filter(c => c.approval_status === 'pending' || c.status === 'pending');
    const active    = contracts.filter(c => c.status === 'active' || c.status === 'overdue');
    const history   = contracts.filter(c => ['returned', 'cancelled', 'rejected'].includes(c.status) || c.approval_status === 'rejected');

    const subTabClass = (key) =>
        'text-xs font-medium px-4 py-2 rounded-lg transition-all ' +
        (subTab === key ? 'bg-violet-700 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800');

    const renderTable = (list, showApproveBtn = false) => (
        list.length === 0
            ? <div className="text-center py-16 text-zinc-700 text-sm">Không có hợp đồng nào</div>
            : <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                    <thead className="border-b border-zinc-800">
                        <tr className="text-zinc-600">
                            <th className="text-left px-4 py-3 font-medium">Khách hàng</th>
                            <th className="text-left px-4 py-3 font-medium">Thiết bị</th>
                            <th className="text-left px-4 py-3 font-medium">Thời gian</th>
                            {!showApproveBtn && <th className="text-right px-4 py-3 font-medium">Giá/ngày</th>}
                            {!showApproveBtn && <th className="text-right px-4 py-3 font-medium">Tổng</th>}
                            <th className="text-center px-4 py-3 font-medium">Trạng thái</th>
                            <th className="px-4 py-3"/>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map(c => {
                            const stMeta = STATUS_MAP[c.status] || STATUS_MAP.pending;
                            const d = days(c.start_date, c.end_date);
                            const isOverdue = c.status === 'overdue';
                            return (
                                <tr key={c.id} className={'border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ' + (isOverdue ? 'bg-red-950/10' : '')}>
                                    <td className="px-4 py-3">
                                        <p className="text-zinc-200 font-medium">{c.customer?.full_name || '—'}</p>
                                        <p className="text-zinc-600">{c.customer?.email}</p>
                                    </td>
                                    <td className="px-4 py-3 text-zinc-400">
                                        {c.equipment?.device_type} {c.equipment?.brand} {c.equipment?.model}
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-zinc-300">{fmt(c.start_date)} → {fmt(c.end_date)}</p>
                                        <p className={isOverdue ? 'text-red-400 font-medium' : 'text-zinc-600'}>
                                            {d} ngày{isOverdue && ' — QUÁ HẠN'}
                                        </p>
                                    </td>
                                    {!showApproveBtn && (
                                        <>
                                            <td className="px-4 py-3 text-right text-zinc-300">
                                                {c.price_per_day ? Number(c.price_per_day).toLocaleString('vi-VN') + 'đ' : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-violet-300">
                                                {c.price_per_day ? (d * c.price_per_day).toLocaleString('vi-VN') + 'đ' : '—'}
                                            </td>
                                        </>
                                    )}
                                    <td className="px-4 py-3 text-center">
                                        <span className={`text-xs px-2 py-1 rounded-full border ${stMeta.cls}`}>{stMeta.label}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 justify-end">
                                            {showApproveBtn && (
                                                <button onClick={() => setApproveTarget(c)}
                                                    className="text-xs px-3 py-1.5 rounded-lg bg-violet-900/50 hover:bg-violet-800/60 text-violet-300 border border-violet-800/50 transition-all font-medium">
                                                    Xem & Duyệt
                                                </button>
                                            )}
                                            {c.status === 'active' && (
                                                <>
                                                    <button onClick={() => updateStatus(c.id, 'returned')}
                                                        className="text-xs px-2 py-1 rounded-lg bg-zinc-800 hover:bg-teal-900/40 text-zinc-400 hover:text-teal-400 border border-zinc-700 transition-all">
                                                        Đã trả
                                                    </button>
                                                    <button onClick={() => updateStatus(c.id, 'cancelled')}
                                                        className="text-xs px-2 py-1 rounded-lg bg-zinc-800 hover:bg-red-900/30 text-zinc-500 hover:text-red-400 border border-zinc-700 transition-all">
                                                        Hủy
                                                    </button>
                                                </>
                                            )}
                                            {c.status === 'overdue' && (
                                                <button onClick={() => updateStatus(c.id, 'returned')}
                                                    className="text-xs px-2 py-1 rounded-lg bg-red-900/40 hover:bg-teal-900/40 text-red-400 hover:text-teal-400 border border-red-800/40 transition-all">
                                                    Đánh dấu đã trả
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
    );

    return (
        <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-white text-lg font-semibold">Quản lý cho thuê</h2>
                    <p className="text-zinc-600 text-xs mt-0.5">Hợp đồng thuê thiết bị — Admin duyệt và định giá</p>
                </div>
                <button onClick={fetchAll}
                    className="text-zinc-600 hover:text-zinc-300 text-xs border border-zinc-800 px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-all">
                    Làm mới
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: 'Chờ duyệt', val: pending.length,                              cls: 'text-amber-400' },
                    { label: 'Đang thuê', val: active.filter(c=>c.status==='active').length, cls: 'text-teal-400' },
                    { label: 'Quá hạn',  val: active.filter(c=>c.status==='overdue').length,cls: 'text-red-400' },
                    { label: 'Đã kết thúc', val: history.length,                            cls: 'text-zinc-500' },
                ].map(s => (
                    <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
                        <p className={`text-2xl font-bold ${s.cls}`}>{s.val}</p>
                        <p className="text-zinc-600 text-xs mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800 rounded-xl p-1 w-fit">
                <button className={subTabClass('pending')} onClick={() => setSubTab('pending')}>
                    Chờ duyệt
                    {pending.length > 0 && (
                        <span className="ml-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pending.length}</span>
                    )}
                </button>
                <button className={subTabClass('active')} onClick={() => setSubTab('active')}>Đang thuê</button>
                <button className={subTabClass('history')} onClick={() => setSubTab('history')}>Lịch sử</button>
            </div>

            {/* Content */}
            {loading
                ? <div className="flex items-center justify-center py-20"><span className="w-6 h-6 border-2 border-zinc-700 border-t-violet-400 rounded-full animate-spin-slow"/></div>
                : subTab === 'pending'  ? renderTable(pending, true)
                : subTab === 'active'  ? renderTable(active, false)
                : renderTable(history, false)
            }

            {/* Modal duyệt */}
            {approveTarget && (
                <ApproveModal
                    contract={approveTarget}
                    onClose={() => setApproveTarget(null)}
                    onDone={() => { setApproveTarget(null); fetchAll(); }}
                />
            )}
        </div>
    );
}

export default RentalManagement;
