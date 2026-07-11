import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

function AssignModal({ ticket, onClose, onAssigned }) {
    const { t } = useLanguage();
    const [technicians, setTechnicians] = useState([]);
    const [selected, setSelected]       = useState(ticket?.assigned_to || '');
    const [saving, setSaving]           = useState(false);

    useEffect(() => {
        supabase
            .from('profiles')
            .select('id, full_name, phone')
            .eq('role', 'technician')
            .eq('is_active', true)
            .then(({ data }) => setTechnicians(data || []));
    }, []);

    const handleAssign = async () => {
        setSaving(true);
        const newAssignee = selected || null;
        const { error } = await supabase
            .from('tickets')
            .update({ assigned_to: newAssignee, updated_at: new Date().toISOString() })
            .eq('id', ticket.id);

        if (!error) {
            // Ghi log phân công
            await supabase.from('ticket_logs').insert({
                ticket_id:   ticket.id,
                action_type: 'Tiếp nhận',
                note: newAssignee
                    ? 'Admin phân công kỹ thuật viên: ' + (technicians.find(t => t.id === newAssignee)?.full_name || newAssignee)
                    : 'Admin bỏ phân công kỹ thuật viên.',
            });
            onAssigned?.();
            onClose?.();
        } else {
            console.error('[ASSIGN ERROR] ' + error.message);
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-sm fade-in">
                <div className="px-6 py-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-white text-sm font-semibold">{t('admin.assign.title')}</h2>
                        <button onClick={onClose} className="text-zinc-600 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Ticket info */}
                    <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl px-3 py-2.5 mb-4">
                        <p className="text-zinc-400 text-xs line-clamp-2">{ticket?.issue_summary}</p>
                    </div>

                    {/* Technician list */}
                    <p className="text-zinc-500 text-xs font-medium mb-2">{t('admin.assign.select')}</p>
                    <div className="space-y-1.5 mb-4 max-h-48 overflow-y-auto pr-1">
                        {/* Bỏ phân công */}
                        <label className={
                            'flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-100 ' +
                            (!selected ? 'border-zinc-600 bg-zinc-800' : 'border-zinc-800 hover:border-zinc-700')
                        }>
                            <input type="radio" name="tech" value="" checked={!selected} onChange={() => setSelected('')} className="hidden" />
                            <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ' + (!selected ? 'border-teal-500 bg-teal-500' : 'border-zinc-600')}>
                                {!selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                            <span className="text-zinc-500 text-xs italic">{t('admin.assign.none')}</span>
                        </label>

                        {technicians.map(tech => (
                            <label key={tech.id} className={
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all duration-100 ' +
                                (selected === tech.id ? 'border-teal-700/60 bg-teal-950/30' : 'border-zinc-800 hover:border-zinc-700')
                            }>
                                <input type="radio" name="tech" value={tech.id} checked={selected === tech.id} onChange={() => setSelected(tech.id)} className="hidden" />
                                <div className={'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ' + (selected === tech.id ? 'border-teal-500 bg-teal-500' : 'border-zinc-600')}>
                                    {selected === tech.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <div>
                                    <p className="text-zinc-200 text-xs font-medium">{tech.full_name}</p>
                                    {tech.phone && <p className="text-zinc-600 text-xs">{tech.phone}</p>}
                                </div>
                            </label>
                        ))}

                        {technicians.length === 0 && (
                            <p className="text-zinc-700 text-xs text-center py-4">Chưa có kỹ thuật viên nào trong hệ thống.</p>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button onClick={onClose} className="flex-1 text-zinc-400 text-xs py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-all">
                            {t('btn.cancel')}
                        </button>
                        <button onClick={handleAssign} disabled={saving}
                            className="flex-1 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-all">
                            {saving ? t('loading') : t('btn.assign')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AssignModal;
