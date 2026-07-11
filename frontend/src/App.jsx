import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import TechnicianDashboard from './pages/TechnicianDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CustomerPortal from './pages/CustomerPortal';
import AddressWidget from './components/AddressWidget';

// Route guard: chuyển hướng theo role sau khi đăng nhập
function RoleRouter() {
    const { session, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-zinc-700 border-t-teal-500 animate-spin-slow" />
                <p className="text-zinc-700 text-xs">Đang kết nối...</p>
            </div>
        );
    }

    return (
        <>
        <Routes>
            {/* Login */}
            <Route
                path="/login"
                element={!session ? <Login /> : <Navigate to="/" replace />}
            />

            {/* Admin */}
            <Route
                path="/admin/*"
                element={session && profile?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" replace />}
            />

            {/* Kỹ thuật viên */}
            <Route
                path="/dashboard/*"
                element={session && profile?.role === 'technician' ? <TechnicianDashboard /> : <Navigate to="/login" replace />}
            />

            {/* Khách hàng */}
            <Route
                path="/portal/*"
                element={session && profile?.role === 'customer' ? <CustomerPortal /> : <Navigate to="/login" replace />}
            />

            {/* Root redirect theo role */}
            <Route
                path="/*"
                element={
                    !session ? (
                        <Navigate to="/login" replace />
                    ) : profile?.role === 'admin' ? (
                        <Navigate to="/admin" replace />
                    ) : profile?.role === 'technician' ? (
                        <Navigate to="/dashboard" replace />
                    ) : profile?.role === 'customer' ? (
                        <Navigate to="/portal" replace />
                    ) : (
                        // Profile chưa tải xong hoặc role chưa được gán
                        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-sm text-center">
                                <div className="w-10 h-10 rounded-xl bg-amber-950/50 border border-amber-800/50 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <p className="text-white text-sm font-semibold mb-1.5">Tài khoản chưa được phân quyền</p>
                                <p className="text-zinc-500 text-xs mb-4">Vui lòng liên hệ Admin để được cấp quyền truy cập hệ thống.</p>
                                <p className="text-zinc-700 text-xs">Email: {session?.user?.email}</p>
                            </div>
                        </div>
                    )
                }
            />
        </Routes>
        {session && profile?.role === 'customer' && <AddressWidget />}
        </>
    );
}

function App() {
    return (
        <LanguageProvider>
            <AuthProvider>
                <BrowserRouter>
                    <RoleRouter />
                </BrowserRouter>
            </AuthProvider>
        </LanguageProvider>
    );
}

export default App;
