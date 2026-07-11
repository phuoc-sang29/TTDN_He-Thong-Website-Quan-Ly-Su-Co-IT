import StatusBadge from './StatusBadge';

const PRIORITY_DOT = {
    urgent: 'bg-red-500',
    high:   'bg-amber-500',
    normal: 'bg-zinc-600',
    low:    'bg-zinc-700',
};

const DEVICE_PATH = {
    'PC':         'M3 5a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm14 10H3',
    'Laptop':     'M4 7a2 2 0 012-2h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V7zm0 8h16',
    'Máy in':    'M6 9V4h12v5M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2v-4H6v4zm0 0h12',
    'Phần mềm': 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
};

function DeviceIcon({ type }) {
    const d = DEVICE_PATH[type] || DEVICE_PATH['PC'];
    return (
        <svg className="w-3 h-3 text-zinc-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d={d} />
        </svg>
    );
}

function TicketCard({ ticket, isSelected, onClick }) {
    const eq          = ticket.equipments;
    const deviceLabel = eq ? (eq.brand ? eq.brand + ' ' + eq.model : eq.model || eq.device_type) : 'Thiết bị không xác định';
    const created     = new Date(ticket.created_at).toLocaleDateString('vi-VN');
    const priorityDot = PRIORITY_DOT[ticket.priority] || PRIORITY_DOT.normal;

    return (
        <div
            onClick={onClick}
            className={
                'relative px-3.5 py-3 border-b border-zinc-800/50 cursor-pointer transition-all duration-100 group ' +
                (isSelected
                    ? 'bg-zinc-800/70 border-l-2 border-l-teal-500'
                    : 'border-l-2 border-l-transparent hover:bg-zinc-800/30 hover:border-l-zinc-700')
            }
        >
            {/* Top row */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5">
                    {eq && <DeviceIcon type={eq.device_type} />}
                    {eq && <span className="text-zinc-600 text-xs">{eq.device_type}</span>}
                    {/* Priority dot */}
                    <span className={'w-1.5 h-1.5 rounded-full shrink-0 ' + priorityDot} title={'Ưu tiên: ' + ticket.priority} />
                </div>
                <StatusBadge status={ticket.current_status} />
            </div>

            {/* Issue summary */}
            <p className={'text-xs leading-snug line-clamp-2 mb-2 transition-colors ' + (isSelected ? 'text-zinc-100' : 'text-zinc-300 group-hover:text-zinc-200')}>
                {ticket.issue_summary}
            </p>

            {/* Bottom */}
            <div className="flex items-center justify-between gap-2">
                <p className="text-zinc-600 text-xs truncate">{deviceLabel}</p>
                <p className="text-zinc-700 text-xs shrink-0">{created}</p>
            </div>
        </div>
    );
}

export default TicketCard;
