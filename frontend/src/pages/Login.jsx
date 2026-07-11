import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../context/LanguageContext';

// Man hinh: 'login' | 'forgot_email' | 'forgot_otp' | 'register'
const SCREEN = {
    LOGIN: 'login',
    REGISTER: 'register',
    FORGOT_EMAIL: 'forgot_email',
    FORGOT_OTP: 'forgot_otp',
};

// ── Icon nho ──
const IcMail = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
    </svg>
);
const IcLock = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
);
const IcKey = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
);
const IcArrowLeft = () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
);
const IcEye = ({ show }) => show ? (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
) : (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
);

function Spinner() {
    return <span className="w-3.5 h-3.5 rounded-full border-2 border-zinc-600 border-t-teal-400 animate-spin-slow" />;
}

function Feedback({ msg }) {
    if (!msg.text) return null;
    return (
        <div className={
            'text-xs px-3 py-2.5 rounded-lg border fade-in ' +
            (msg.type === 'error'
                ? 'bg-red-950/50 border-red-900/60 text-red-400'
                : 'bg-emerald-950/50 border-emerald-900/60 text-emerald-400')
        }>
            {msg.text}
        </div>
    );
}

function Login() {
    const { t } = useLanguage();

    const [screen, setScreen] = useState(SCREEN.LOGIN);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [otp, setOtp] = useState('');
    const [newPass, setNewPass] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState({ type: '', text: '' });

    const ok = (text) => setMsg({ type: 'success', text });
    const err = (text) => setMsg({ type: 'error', text });
    const clr = () => setMsg({ type: '', text: '' });

    const goScreen = (s) => { setScreen(s); clr(); };

    // Khi user bam link trong email -> Supabase redirect ve /login
    // -> onAuthStateChange ban PASSWORD_RECOVERY -> chuyen sang man nhap mat khau moi
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                clr();
                setScreen(SCREEN.FORGOT_OTP);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    // ── 1. Dang nhap bang email/password ──
    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) { err('Vui lòng nhập đủ email và mật khẩu.'); return; }
        setLoading(true); clr();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) err('Email hoặc mật khẩu không đúng.');
        setLoading(false);
    };

    // ── 2. Dang ky ──
    const handleRegister = async (e) => {
        e.preventDefault();
        if (!email.trim() || password.length < 6) { err('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
        setLoading(true); clr();
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) err(error.message);
        else ok('Đăng ký thành công! Kiểm tra email để xác minh tài khoản.');
        setLoading(false);
    };

    // ── 3a. Gui link dat lai mat khau ──
    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!email.trim()) { err('Vui lòng nhập địa chỉ email.'); return; }
        setLoading(true); clr();
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin + '/login',
        });
        if (error) {
            err('Không gửi được email. Kiểm tra lại địa chỉ hoặc thử lại sau.');
        } else {
            ok('Đã gửi link đặt lại mật khẩu đến ' + email.trim() + '. Kiểm tra hộp thư (kể cả Spam).');
        }
        setLoading(false);
    };

    // ── 3b. Dat lai mat khau (sau khi da xac thuc qua link) ──
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (newPass.length < 6) { err('Mật khẩu mới phải có ít nhất 6 ký tự.'); return; }
        setLoading(true); clr();
        const { error } = await supabase.auth.updateUser({ password: newPass });
        if (error) {
            err('Không thể cập nhật mật khẩu: ' + error.message);
        } else {
            ok('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
            await supabase.auth.signOut();
            setTimeout(() => { setNewPass(''); goScreen(SCREEN.LOGIN); }, 2000);
        }
        setLoading(false);
    };

    // ── Render ──
    return (
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
            {/* Hinh nen rung — phu toan bo man hinh */}
            <img
                src="/hinh-nen-thien-nhien-4k-yody-vn-11.jpg"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover object-center"
                style={{ zIndex: 0 }}
            />
            {/* Lop overlay toi de chu y focus vao form */}
            <div className="absolute inset-0 bg-black/55" style={{ zIndex: 1 }} />


            {/* Card */}
            <div className="relative bg-zinc-900/85 backdrop-blur-sm border border-zinc-700/60 rounded-2xl p-8 w-full max-w-sm shadow-2xl fade-in" style={{ zIndex: 2 }}>
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent rounded-full" />



                {/* ════════════════════════════
                    MAN HINH: DANG NHAP / DANG KY
                    ════════════════════════════ */}
                {(screen === SCREEN.LOGIN || screen === SCREEN.REGISTER) && (
                    <>
                        <h1 className="text-white text-2xl font-bold leading-tight mb-1.5">{t('login.title')}</h1>
                        <p className="text-zinc-500 text-sm mb-6">{t('login.subtitle')}</p>

                        {/* Tab */}
                        <div className="flex bg-zinc-800/70 rounded-lg p-1 mb-5 gap-1">
                            {[SCREEN.LOGIN, SCREEN.REGISTER].map(s => (
                                <button key={s} type="button"
                                    onClick={() => goScreen(s)}
                                    className={
                                        'flex-1 text-xs font-medium py-1.5 rounded-md transition-all duration-150 ' +
                                        (screen === s ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300')
                                    }
                                >
                                    {s === SCREEN.LOGIN ? t('login.tab.login') : t('login.tab.register')}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={screen === SCREEN.LOGIN ? handleLogin : handleRegister} className="space-y-3">
                            {/* Email */}
                            <div>
                                <label className="block text-zinc-500 text-xs font-medium mb-1.5">{t('login.email')}</label>
                                <input
                                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder={t('login.email.placeholder')} disabled={loading}
                                    className="w-full bg-zinc-800 border border-zinc-700 focus:border-teal-600/70 text-white text-sm px-3 py-2.5 rounded-lg placeholder-zinc-700 outline-none transition-all disabled:opacity-50"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-zinc-500 text-xs font-medium mb-1.5">
                                    {t('login.password')}
                                    {screen === SCREEN.REGISTER && <span className="text-zinc-700 font-normal ml-1">{t('login.password.hint')}</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                                        placeholder={t('login.password.placeholder')} disabled={loading}
                                        className="w-full bg-zinc-800 border border-zinc-700 focus:border-teal-600/70 text-white text-sm px-3 pr-10 py-2.5 rounded-lg placeholder-zinc-700 outline-none transition-all disabled:opacity-50"
                                    />
                                    <button type="button" tabIndex={-1}
                                        onClick={() => setShowPass(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                                    >
                                        <IcEye show={showPass} />
                                    </button>
                                </div>
                            </div>

                            <Feedback msg={msg} />

                            <button type="submit" disabled={loading}
                                className="w-full bg-teal-700 hover:bg-teal-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 mt-1"
                            >
                                {loading ? <><Spinner />{t('login.loading')}</> : (screen === SCREEN.LOGIN ? t('btn.login') : t('btn.register'))}
                            </button>

                            {/* Quen mat khau — chi hien o tab dang nhap, nam duoi nut submit */}
                            {screen === SCREEN.LOGIN && (
                                <p className="text-center">
                                    <button type="button"
                                        onClick={() => { goScreen(SCREEN.FORGOT_EMAIL); }}
                                        className="text-zinc-500 hover:text-teal-400 text-xs transition-colors"
                                    >
                                        Quên mật khẩu?
                                    </button>
                                </p>
                            )}
                        </form>

                        <p className="text-zinc-800 text-xs text-center mt-5">{t('login.footer')}</p>
                    </>
                )}

                {/* ════════════════════════════
                    MAN HINH: NHAP EMAIL DE LAY OTP
                    ════════════════════════════ */}
                {screen === SCREEN.FORGOT_EMAIL && (
                    <>
                        <button type="button" onClick={() => goScreen(SCREEN.LOGIN)}
                            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs mb-5 transition-colors">
                            <IcArrowLeft /> Quay lại đăng nhập
                        </button>

                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4">
                            <span className="text-teal-400"><IcKey /></span>
                        </div>
                        <h2 className="text-white text-xl font-bold mb-1">Quên mật khẩu</h2>
                        <p className="text-zinc-500 text-sm mb-6">
                            Nhập email tài khoản — hệ thống sẽ gửi <span className="text-zinc-300 font-medium">link đặt lại mật khẩu</span> đến hộp thư của bạn.
                        </p>

                        <form onSubmit={handleSendOtp} className="space-y-3">
                            <div>
                                <label className="block text-zinc-500 text-xs font-medium mb-1.5">Địa chỉ email</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"><IcMail /></span>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                        placeholder="example@email.com" disabled={loading}
                                        className="w-full bg-zinc-800 border border-zinc-700 focus:border-teal-600/70 text-white text-sm pl-9 pr-3 py-2.5 rounded-lg placeholder-zinc-700 outline-none transition-all disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <Feedback msg={msg} />

                            <button type="submit" disabled={loading}
                                className="w-full bg-teal-700 hover:bg-teal-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <><Spinner />Đang gửi...</> : 'Gửi link đặt lại mật khẩu'}
                            </button>
                        </form>
                    </>
                )}

                {/* ════════════════════════════
                    MAN HINH: NHAP OTP + MAT KHAU MOI
                    ════════════════════════════ */}
                {screen === SCREEN.FORGOT_OTP && (
                    <>
                        <button type="button" onClick={() => goScreen(SCREEN.FORGOT_EMAIL)}
                            className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs mb-5 transition-colors">
                            <IcArrowLeft /> Nhập lại email
                        </button>

                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4">
                            <span className="text-teal-400"><IcKey /></span>
                        </div>
                        <h2 className="text-white text-xl font-bold mb-1">Tạo mật khẩu mới</h2>
                        <p className="text-zinc-500 text-sm mb-1">Xác thực thành công qua email:</p>
                        <p className="text-teal-400 text-sm font-medium mb-5">{email || 'email của bạn'}</p>

                        <form onSubmit={handleVerifyOtp} className="space-y-3">
                            <div>
                                <label className="block text-zinc-500 text-xs font-medium mb-1.5">Mật khẩu mới <span className="text-zinc-700">(tối thiểu 6 ký tự)</span></label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"><IcLock /></span>
                                    <input
                                        type={showNew ? 'text' : 'password'} value={newPass}
                                        onChange={e => setNewPass(e.target.value)}
                                        placeholder="Nhập mật khẩu mới..." disabled={loading} autoFocus
                                        className="w-full bg-zinc-800 border border-zinc-700 focus:border-teal-600/70 text-white text-sm pl-9 pr-10 py-2.5 rounded-lg placeholder-zinc-700 outline-none transition-all disabled:opacity-50"
                                    />
                                    <button type="button" tabIndex={-1} onClick={() => setShowNew(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                                    ><IcEye show={showNew} /></button>
                                </div>
                            </div>

                            <Feedback msg={msg} />

                            <button type="submit" disabled={loading || newPass.length < 6}
                                className="w-full bg-teal-700 hover:bg-teal-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <><Spinner />Đang cập nhật...</> : 'Xác nhận Đổi mật khẩu'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

export default Login;
