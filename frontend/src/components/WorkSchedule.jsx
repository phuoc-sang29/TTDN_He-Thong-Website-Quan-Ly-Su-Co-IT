import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

const SHIFT_META = {
    morning:   { label: 'Sáng',   cls: 'bg-amber-900/30 text-amber-400 border-amber-800/30' },
    afternoon: { label: 'Chiều',  cls: 'bg-indigo-900/30 text-indigo-400 border-indigo-800/30' },
};

const STATUS_META = {
    pending:     { label: 'Chờ',       cls: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
    in_progress: { label: 'Đang làm',  cls: 'bg-teal-900/40 text-teal-400 border-teal-800/40' },
    done:        { label: 'Xong',      cls: 'bg-emerald-900/40 text-emerald-400 border-emerald-800/40' },
    cancelled:   { label: 'Hủy',      cls: 'bg-red-900/30 text-red-500 border-red-900/30' },
};

const STATUS_MAP_VI = { 'Chờ': 'pending', 'Đang làm': 'in_progress', 'Xong': 'done', 'Hủy': 'cancelled' };

function getWeekDates(offset = 0) {
    const today = new Date();
    const day = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
}

function fmtISO(d) { return d.toISOString().split('T')[0]; }
function fmtVN(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// ── Parse CSV ─────────────────────────────────────────────────────────────────
function parseCSVLine(line) {
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { result.push(cur); cur = ''; }
        else cur += ch;
    }
    result.push(cur);
    return result.map(v => v.trim());
}

// ── Modal thêm/sửa lịch ───────────────────────────────────────────────────────
function ScheduleModal({ technicians, userId, initial, onClose, onSaved }) {
    const isEdit = !!initial;
    const [title, setTitle]   = useState(initial?.title || '');
    const [desc, setDesc]     = useState(initial?.description || '');
    const [techId, setTechId] = useState(initial?.technician_id || '');
    const [date, setDate]     = useState(initial?.scheduled_date || fmtISO(new Date()));
    const [shift, setShift]   = useState(initial?.shift || 'morning');
    const [status, setStatus] = useState(initial?.status || 'pending');
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    const handleSave = async () => {
        if (!title.trim()) { setError('Vui lòng nhập tiêu đề.'); return; }
        setSaving(true);
        const payload = {
            title: title.trim(),
            description: desc.trim() || null,
            technician_id: techId || null,
            scheduled_date: date,
            shift,
            status,
        };
        const { error: err } = isEdit
            ? await supabase.from('task_schedules').update(payload).eq('id', initial.id)
            : await supabase.from('task_schedules').insert({ ...payload, created_by: userId });
        if (err) { setError('Lỗi: ' + err.message); setSaving(false); return; }
        onSaved();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-md p-6 fade-in">
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-white text-sm font-semibold">
                        {isEdit ? 'Chỉnh sửa lịch' : 'Thêm lịch công việc'}
                    </h3>
                    <button onClick={onClose} className="text-zinc-600 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-all">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-zinc-500 text-xs mb-1">Tiêu đề <span className="text-red-500">*</span></label>
                        <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
                            placeholder="VD: Bảo trì máy in tầng 3"
                            className="w-full bg-zinc-800 border border-zinc-700 focus:border-teal-600/60 text-white text-xs px-3 py-2 rounded-lg placeholder-zinc-600 outline-none transition-all" />
                    </div>
                    <div>
                        <label className="block text-zinc-500 text-xs mb-1">Mô tả chi tiết</label>
                        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
                            placeholder="Chi tiết công việc..."
                            className="w-full bg-zinc-800 border border-zinc-700 focus:border-teal-600/60 text-white text-xs px-3 py-2 rounded-lg placeholder-zinc-600 resize-none outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-zinc-500 text-xs mb-1">Kỹ thuật viên</label>
                            <select value={techId} onChange={e => setTechId(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2.5 py-2 rounded-lg appearance-none cursor-pointer outline-none">
                                <option value="">-- Chọn KTV --</option>
                                {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-zinc-500 text-xs mb-1">Ngày <span className="text-red-500">*</span></label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2.5 py-2 rounded-lg outline-none" />
                        </div>
                        <div>
                            <label className="block text-zinc-500 text-xs mb-1">Buổi</label>
                            <select value={shift} onChange={e => setShift(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2.5 py-2 rounded-lg appearance-none cursor-pointer outline-none">
                                <option value="morning">Sáng</option>
                                <option value="afternoon">Chiều</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-zinc-500 text-xs mb-1">Trạng thái</label>
                            <select value={status} onChange={e => setStatus(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs px-2.5 py-2 rounded-lg appearance-none cursor-pointer outline-none">
                                {Object.entries(STATUS_META).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {error && (
                    <p className="text-red-400 text-xs mt-3 bg-red-950/40 border border-red-900/40 px-3 py-2 rounded-lg">{error}</p>
                )}
                <div className="flex gap-2 mt-5">
                    <button onClick={onClose}
                        className="flex-1 text-zinc-400 hover:text-white text-xs py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-all">
                        Hủy
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 bg-teal-700 hover:bg-teal-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5">
                        {saving
                            ? <><span className="w-3 h-3 border-2 border-zinc-600 border-t-white rounded-full animate-spin-slow" />Đang lưu...</>
                            : (isEdit ? 'Cập nhật' : 'Thêm lịch')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function WorkSchedule({ isAdmin = false }) {
    const { userId } = useAuth();
    const [weekOffset, setWeekOffset]   = useState(0);
    const [schedules, setSchedules]     = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading]         = useState(true);
    const [showModal, setShowModal]     = useState(false);
    const [editTarget, setEditTarget]   = useState(null);
    const [importing, setImporting]     = useState(false);
    const [importMsg, setImportMsg]     = useState('');
    const importRef = useRef(null);

    const weekDates = getWeekDates(weekOffset);
    const weekStart = fmtISO(weekDates[0]);
    const weekEnd   = fmtISO(weekDates[6]);

    const fetchSchedules = useCallback(async () => {
        setLoading(true);
        let q = supabase
            .from('task_schedules')
            .select('*, technician:profiles!technician_id(id, full_name)')
            .gte('scheduled_date', weekStart)
            .lte('scheduled_date', weekEnd)
            .order('scheduled_date')
            .order('shift');
        if (!isAdmin) q = q.eq('technician_id', userId);
        const { data } = await q;
        setSchedules(data || []);
        setLoading(false);
    }, [weekStart, weekEnd, isAdmin, userId]);

    useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

    useEffect(() => {
        if (!isAdmin) return;
        supabase.from('profiles').select('id, full_name').eq('role', 'technician')
            .then(({ data }) => setTechnicians(data || []));
    }, [isAdmin]);

    const deleteSchedule = async (id) => {
        await supabase.from('task_schedules').delete().eq('id', id);
        fetchSchedules();
    };

    // Xuất Excel (CSV)
    const exportCSV = () => {
        const headers = ['Ngày', 'Buổi', 'Tiêu đề', 'Mô tả', 'Trạng thái', 'Kỹ thuật viên'];
        const rows = schedules.map(s => [
            s.scheduled_date,
            SHIFT_META[s.shift]?.label || s.shift,
            s.title,
            s.description || '',
            STATUS_META[s.status]?.label || s.status,
            s.technician?.full_name || '',
        ]);
        const csv = [headers, ...rows]
            .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
            .join('\r\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement('a'), {
            href: url, download: `lich-tuan-${weekStart}.csv`,
        });
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Tải file mẫu
    const downloadTemplate = () => {
        window.open('/mau-lich-cong-viec.csv', '_blank');
    };

    // Nhập từ Excel (CSV)
    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImporting(true);
        setImportMsg('');

        try {
            const text = await file.text();
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) { setImportMsg('File trống hoặc không đúng định dạng.'); setImporting(false); return; }

            const headers = parseCSVLine(lines[0]);
            let inserted = 0, skipped = 0;

            for (const line of lines.slice(1)) {
                const cols = parseCSVLine(line);
                const row  = {};
                headers.forEach((h, i) => { row[h] = (cols[i] || '').replace(/^"|"$/g, '').trim(); });

                const date  = row['Ngày'];
                const title = row['Tiêu đề'];
                if (!date || !title) { skipped++; continue; }

                const shift  = row['Buổi'] === 'Chiều' ? 'afternoon' : 'morning';
                const status = STATUS_MAP_VI[row['Trạng thái']] || 'pending';
                const tech   = technicians.find(t => t.full_name === row['Kỹ thuật viên']);

                const { error } = await supabase.from('task_schedules').insert({
                    title,
                    description:    row['Mô tả'] || null,
                    technician_id:  tech?.id || null,
                    scheduled_date: date,
                    shift,
                    status,
                    created_by: userId,
                });
                if (error) skipped++;
                else inserted++;
            }
            setImportMsg(`Đã thêm ${inserted} lịch${skipped > 0 ? `, bỏ qua ${skipped} dòng lỗi` : ''}.`);
            fetchSchedules();
        } catch (err) {
            setImportMsg('Lỗi đọc file: ' + err.message);
        }
        setImporting(false);
        e.target.value = '';
    };

    // Group by date
    const byDate = {};
    weekDates.forEach(d => { byDate[fmtISO(d)] = { morning: [], afternoon: [] }; });
    schedules.forEach(s => {
        const group = byDate[s.scheduled_date];
        if (group) group[s.shift]?.push(s);
    });

    const todayISO = fmtISO(new Date());

    return (
        <div className="p-5 max-w-7xl mx-auto space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h2 className="text-white text-sm font-semibold">Lịch công việc tuần</h2>
                    <p className="text-zinc-600 text-xs mt-0.5">{fmtVN(weekStart)} — {fmtVN(weekEnd)}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setWeekOffset(w => w - 1)}
                        className="text-zinc-400 hover:text-white border border-zinc-800 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-xs transition-all">
                        Tuần trước
                    </button>
                    <button onClick={() => setWeekOffset(0)}
                        className="text-zinc-400 hover:text-white border border-zinc-800 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-xs transition-all">
                        Tuần này
                    </button>
                    <button onClick={() => setWeekOffset(w => w + 1)}
                        className="text-zinc-400 hover:text-white border border-zinc-800 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 text-xs transition-all">
                        Tuần sau
                    </button>
                    {isAdmin && (
                        <>
                            <button onClick={exportCSV}
                                className="text-emerald-500 hover:text-white border border-emerald-900/60 hover:bg-emerald-900/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-all">
                                Xuất Excel
                            </button>
                            {/* Import CSV */}
                            <div className="relative">
                                <input ref={importRef} type="file" accept=".csv" onChange={handleImport}
                                    className="absolute inset-0 opacity-0 w-full cursor-pointer" />
                                <button
                                    onClick={() => importRef.current?.click()}
                                    disabled={importing}
                                    className="flex items-center gap-1.5 text-violet-400 hover:text-white border border-violet-900/60 hover:bg-violet-900/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50">
                                    {importing
                                        ? <><span className="w-3 h-3 border-2 border-zinc-600 border-t-violet-400 rounded-full animate-spin-slow" />Đang nhập...</>
                                        : 'Nhập Excel'}
                                </button>
                            </div>
                            <button onClick={downloadTemplate}
                                className="text-zinc-500 hover:text-zinc-300 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs transition-all">
                                Tải file mẫu
                            </button>
                            <button onClick={() => { setEditTarget(null); setShowModal(true); }}
                                className="bg-teal-700 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">
                                Thêm lịch
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Import message */}
            {importMsg && (
                <div className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between">
                    <span>{importMsg}</span>
                    <button onClick={() => setImportMsg('')} className="text-zinc-600 hover:text-white ml-3">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            )}

            {/* Calendar grid */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-5 h-5 border-2 border-zinc-700 border-t-teal-500 rounded-full animate-spin-slow" />
                </div>
            ) : (
                <div className="grid grid-cols-7 gap-2">
                    {weekDates.map((date, i) => {
                        const iso     = fmtISO(date);
                        const isToday = iso === todayISO;
                        const morning   = byDate[iso]?.morning || [];
                        const afternoon = byDate[iso]?.afternoon || [];

                        return (
                            <div key={iso}
                                className={`border rounded-xl p-3 min-h-[200px] transition-all ${
                                    isToday ? 'border-teal-700/60 bg-teal-950/10' : 'border-zinc-800 bg-zinc-900'
                                }`}>
                                {/* Day header */}
                                <div className={`flex items-center gap-1 mb-3 ${isToday ? 'text-teal-400' : 'text-zinc-500'}`}>
                                    <span className="text-xs font-semibold">{DAY_LABELS[i]}</span>
                                    <span className={`text-[10px] font-mono px-1 rounded ${isToday ? 'bg-teal-900/50' : 'text-zinc-700'}`}>
                                        {fmtVN(iso)}
                                    </span>
                                </div>

                                {/* Sáng section */}
                                {(morning.length > 0 || isAdmin) && (
                                    <div className="mb-2">
                                        <p className="text-[9px] font-semibold text-amber-600 uppercase tracking-wider mb-1">Sáng</p>
                                        <div className="space-y-1">
                                            {morning.length === 0
                                                ? <p className="text-zinc-800 text-[10px] italic">Trống</p>
                                                : morning.map(s => (
                                                    <TaskCard key={s.id} s={s} isAdmin={isAdmin}
                                                        onEdit={() => { setEditTarget(s); setShowModal(true); }}
                                                        onDelete={() => deleteSchedule(s.id)} />
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}

                                {/* Chiều section */}
                                {(afternoon.length > 0 || isAdmin) && (
                                    <div>
                                        <p className="text-[9px] font-semibold text-indigo-500 uppercase tracking-wider mb-1">Chiều</p>
                                        <div className="space-y-1">
                                            {afternoon.length === 0
                                                ? <p className="text-zinc-800 text-[10px] italic">Trống</p>
                                                : afternoon.map(s => (
                                                    <TaskCard key={s.id} s={s} isAdmin={isAdmin}
                                                        onEdit={() => { setEditTarget(s); setShowModal(true); }}
                                                        onDelete={() => deleteSchedule(s.id)} />
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}

                                {/* KTV: no tasks at all */}
                                {!isAdmin && morning.length === 0 && afternoon.length === 0 && (
                                    <p className="text-zinc-800 text-[10px] italic text-center pt-6">Không có lịch</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <ScheduleModal
                    technicians={technicians}
                    userId={userId}
                    initial={editTarget}
                    onClose={() => { setShowModal(false); setEditTarget(null); }}
                    onSaved={() => { setShowModal(false); setEditTarget(null); fetchSchedules(); }}
                />
            )}
        </div>
    );
}

// ── Task card ─────────────────────────────────────────────────────────────────
function TaskCard({ s, isAdmin, onEdit, onDelete }) {
    return (
        <div className="bg-zinc-800/60 border border-zinc-700/40 rounded-lg p-2 group">
            <div className="flex items-start justify-between gap-1">
                <p className="text-zinc-200 text-[11px] font-medium leading-snug flex-1 line-clamp-2">{s.title}</p>
                {isAdmin && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={onEdit}
                            className="text-zinc-500 hover:text-teal-400 p-0.5 rounded transition-colors">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button onClick={onDelete}
                            className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition-colors">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                )}
            </div>
            {isAdmin && s.technician?.full_name && (
                <p className="text-zinc-600 text-[10px] mt-0.5">{s.technician.full_name}</p>
            )}
            {s.description && (
                <p className="text-zinc-600 text-[10px] mt-0.5 line-clamp-1">{s.description}</p>
            )}
            <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded border mt-1.5 ${STATUS_META[s.status]?.cls || ''}`}>
                {STATUS_META[s.status]?.label}
            </span>
        </div>
    );
}
