import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import LangSwitcher from './LangSwitcher';
import NotificationBell from './NotificationBell';

const ROLE_BADGE = {
    admin:      { label: 'Admin',     cls: 'bg-purple-950/60 text-purple-400 border-purple-800/50' },
    technician: { label: 'KTV',       cls: 'bg-teal-950/60  text-teal-400   border-teal-800/50'   },
    customer:   { label: 'Khách',     cls: 'bg-blue-950/60  text-blue-400   border-blue-800/50'   },
};

function TopNavbar({ onNotifNavigate }) {
    const { t }                               = useLanguage();
    const { userEmail, profile, signOut, isCustomer } = useAuth();

    const initial  = userEmail ? userEmail[0].toUpperCase() : 'U';
    const roleCfg  = ROLE_BADGE[profile?.role] || ROLE_BADGE.customer;
    const isAdmin  = profile?.role === 'admin';

    return (
        <header className="h-12 bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-between px-4 shrink-0 z-20">
            {/* Left: Brand */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-teal-500/20 border border-teal-500/40 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-sm bg-teal-400" />
                    </div>
                    <span className="text-white font-semibold text-sm tracking-tight">{t('app.name')}</span>
                </div>
                <div className="w-px h-4 bg-zinc-800" />
                <span className="text-zinc-600 text-xs hidden sm:block">{t('app.tagline')}</span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
                {/* LangSwitcher chỉ hiển thị cho khách hàng */}
                {isCustomer && <LangSwitcher />}

                {/* Chuong thong bao — chi admin */}
                {isAdmin && (
                    <NotificationBell onNavigateTicket={onNotifNavigate} />
                )}

                {/* User info */}
                <div className="hidden sm:flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5">
                    <div className="w-5 h-5 rounded-full bg-teal-700 flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold leading-none">{initial}</span>
                    </div>
                    <span className="text-zinc-400 text-xs truncate max-w-[160px]">{userEmail}</span>
                    <span className={'text-xs font-medium px-1.5 py-0.5 rounded border ' + roleCfg.cls}>
                        {roleCfg.label}
                    </span>
                </div>

                <button
                    onClick={signOut}
                    className="text-zinc-500 hover:text-red-400 text-xs px-3 py-1.5 rounded-md border border-zinc-800 hover:border-red-900/60 hover:bg-red-950/30 transition-all duration-150"
                >
                    {t('btn.logout')}
                </button>
            </div>
        </header>
    );
}

export default TopNavbar;
