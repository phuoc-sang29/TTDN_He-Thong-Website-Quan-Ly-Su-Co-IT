import { useLanguage } from '../context/LanguageContext';
import { tStatus } from '../lib/i18nMaps';

const STATUS_CONFIG = {
    'Đã hoàn thành': { dot: 'bg-emerald-400', cls: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60' },
    'Đang xử lý':    { dot: 'bg-amber-400',   cls: 'bg-amber-950/80  text-amber-400   border-amber-800/60'   },
    'Chờ xử lý':     { dot: 'bg-zinc-500',    cls: 'bg-zinc-800/80   text-zinc-400    border-zinc-700/60'    },
    'Chờ linh kiện': { dot: 'bg-blue-400',    cls: 'bg-blue-950/80   text-blue-400    border-blue-800/60'    },
    'Khẩn cấp':      { dot: 'bg-red-400',     cls: 'bg-red-950/80    text-red-400     border-red-800/60'     },
};

function StatusBadge({ status }) {
    const { t } = useLanguage();
    const cfg = STATUS_CONFIG[status] || {
        dot: 'bg-zinc-500',
        cls: 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60',
    };
    return (
        <span className={'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md border whitespace-nowrap ' + cfg.cls}>
            <span className={'w-1.5 h-1.5 rounded-full shrink-0 ' + cfg.dot} />
            {tStatus(t, status)}
        </span>
    );
}

export default StatusBadge;
