import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const STATUS_DONE = 'Đã hoàn thành';

function StatCard({ label, value, accent }) {
    const colors = {
        teal:    'text-teal-400 bg-teal-950/50 border-teal-800/40',
        emerald: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/40',
        amber:   'text-amber-400 bg-amber-950/50 border-amber-800/40',
        zinc:    'text-zinc-400 bg-zinc-800/50 border-zinc-700/40',
    };
    return (
        <div className={'border rounded-xl px-4 py-3 ' + (colors[accent] || colors.zinc)}>
            <p className="text-xs text-zinc-500 mb-1">{label}</p>
            <p className={'text-2xl font-bold ' + (accent === 'teal' ? 'text-teal-400' : accent === 'emerald' ? 'text-emerald-400' : accent === 'amber' ? 'text-amber-400' : 'text-zinc-300')}>
                {value}
            </p>
        </div>
    );
}

function StatsPanel({ compact = false }) {
    const { t } = useLanguage();
    const { isAdmin } = useAuth();
    const [tickets, setTickets]   = useState([]);
    const [techStats, setTechStats] = useState([]);
    const [period, setPeriod]     = useState('month');
    const [loading, setLoading]   = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data } = await supabase
                .from('tickets')
                .select('id, assigned_to, current_status, updated_at, created_at, assignee:profiles!assigned_to(id, full_name)');
            setTickets(data || []);

            if (isAdmin) {
                const { data: techs } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .eq('role', 'technician');

                const now = new Date();
                const today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const weekAgo = new Date(today.getTime() - 6 * 86400000);
                const monthS  = new Date(now.getFullYear(), now.getMonth(), 1);
                const yearS   = new Date(now.getFullYear(), 0, 1);

                const allTickets = data || [];
                const stats = (techs || []).map(tech => {
                    const mine = allTickets.filter(t => t.assigned_to === tech.id);
                    const done = mine.filter(t => t.current_status === STATUS_DONE);
                    return {
                        id: tech.id, name: tech.full_name,
                        total:  mine.length,
                        today:  done.filter(t => new Date(t.updated_at) >= today).length,
                        week:   done.filter(t => new Date(t.updated_at) >= weekAgo).length,
                        month:  done.filter(t => new Date(t.updated_at) >= monthS).length,
                        year:   done.filter(t => new Date(t.updated_at) >= yearS).length,
                    };
                });
                setTechStats(stats);
            }
            setLoading(false);
        };
        fetchData();
    }, [isAdmin]);

    // Summary counts
    const total      = tickets.length;
    const done       = tickets.filter(t => t.current_status === STATUS_DONE).length;
    const processing = tickets.filter(t => t.current_status === 'Đang xử lý').length;
    const waiting    = tickets.filter(t => t.current_status === 'Chờ xử lý' || t.current_status === 'Chờ linh kiện').length;

    if (loading) return <div className="flex justify-center py-8"><div className="w-4 h-4 border-2 border-zinc-700 border-t-teal-500 rounded-full animate-spin-slow" /></div>;

    if (compact) {
        return (
            <div className="grid grid-cols-4 gap-2 p-3">
                <StatCard label={t('stats.total')}      value={total}      accent="teal" />
                <StatCard label={t('stats.done')}       value={done}       accent="emerald" />
                <StatCard label={t('stats.processing')} value={processing} accent="amber" />
                <StatCard label={t('stats.waiting')}    value={waiting}    accent="zinc" />
            </div>
        );
    }

    const PERIODS = [
        { key: 'today', label: t('stats.today') },
        { key: 'week',  label: t('stats.week') },
        { key: 'month', label: t('stats.month') },
        { key: 'year',  label: t('stats.year') },
    ];

    return (
        <div className="space-y-6 p-1">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label={t('stats.total')}      value={total}      accent="teal" />
                <StatCard label={t('stats.done')}       value={done}       accent="emerald" />
                <StatCard label={t('stats.processing')} value={processing} accent="amber" />
                <StatCard label={t('stats.waiting')}    value={waiting}    accent="zinc" />
            </div>

            {/* Per-technician table (admin only) */}
            {isAdmin && techStats.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-zinc-400 text-sm font-semibold">{t('stats.per_tech')}</p>
                        <div className="flex gap-1">
                            {PERIODS.map(p => (
                                <button
                                    key={p.key}
                                    onClick={() => setPeriod(p.key)}
                                    className={
                                        'text-xs px-2.5 py-1 rounded-lg transition-all duration-100 ' +
                                        (period === p.key
                                            ? 'bg-teal-700 text-white'
                                            : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300')
                                    }
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-zinc-800 text-zinc-500">
                                    <th className="text-left px-4 py-2.5 font-medium">{t('stats.tech_name')}</th>
                                    <th className="text-center px-4 py-2.5 font-medium">{t('stats.tasks_total')}</th>
                                    <th className="text-center px-4 py-2.5 font-medium text-emerald-500">{t('stats.done')} ({PERIODS.find(p=>p.key===period)?.label})</th>
                                </tr>
                            </thead>
                            <tbody>
                                {techStats.map((tech, i) => (
                                    <tr key={tech.id} className={'border-b border-zinc-800/50 ' + (i % 2 === 0 ? '' : 'bg-zinc-900/30')}>
                                        <td className="px-4 py-2.5 text-zinc-200 font-medium">{tech.name}</td>
                                        <td className="px-4 py-2.5 text-center text-zinc-400">{tech.total}</td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className="text-emerald-400 font-bold">{tech[period]}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StatsPanel;
