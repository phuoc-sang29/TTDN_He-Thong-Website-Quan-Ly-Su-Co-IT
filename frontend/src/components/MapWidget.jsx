import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

// Fix Leaflet default marker icon trong Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Marker icon cong ty — xanh teal
const COMPANY_ICON = new L.DivIcon({
    html: `<div style="width:14px;height:14px;background:#0d9488;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.45)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    className: '',
});

// Marker icon khach hang — vang amber
const CUSTOMER_ICON = new L.DivIcon({
    html: `<div style="width:14px;height:14px;background:#f59e0b;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.45)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    className: '',
});

// Marker icon ket qua tim kiem — tim
const SEARCH_ICON = new L.DivIcon({
    html: `<div style="width:14px;height:14px;background:#8b5cf6;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.45)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    className: '',
});

// Dia chi cong ty — chinh lai theo thuc te
const COMPANY = {
    name: 'IT Helpdesk — Văn phòng kỹ thuật',
    address: '227 Nguyễn Văn Cừ, P.4, Q.5, TP. Hồ Chí Minh',
    lat: 10.7540,
    lng: 106.6815,
};

// Bay den vi tri moi tren ban do
function MapFlyTo({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, 16, { duration: 1.0 });
    }, [center, map]);
    return null;
}

// Geocode text -> toa do, dung Nominatim (mien phi)
async function geocodeAddress(addr) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}&limit=1`;
        const res  = await fetch(url, { headers: { 'Accept-Language': 'vi' } });
        const data = await res.json();
        if (data?.[0]) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
        }
    } catch (e) {
        console.error('[GEOCODE]', e);
    }
    return null;
}

// SVG icons nho dung trong button
const IconBuilding = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/>
    </svg>
);
const IconPin = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
);
const IconSearch = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
);
const IconMap = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16M16 6v16"/>
    </svg>
);
const IconChevronDown = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6"/>
    </svg>
);
const IconCheck = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5"/>
    </svg>
);
const IconExternalLink = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
);

export default function MapWidget() {
    const { userId, profile } = useAuth();
    const isCustomer = profile?.role === 'customer';

    const [isOpen, setIsOpen]             = useState(false);
    const [myAddress, setMyAddress]       = useState('');
    const [myCoords, setMyCoords]         = useState(null);
    const [searchAddr, setSearchAddr]     = useState('');
    const [searchCoords, setSearchCoords] = useState(null);
    const [flyTo, setFlyTo]               = useState(null);
    const [saving, setSaving]             = useState(false);
    const [geocoding, setGeocoding]       = useState(false);
    const [saveMsg, setSaveMsg]           = useState('');
    const inputRef = useRef(null);

    // Load dia chi da luu
    useEffect(() => {
        if (!userId || !isOpen) return;
        (async () => {
            const { data } = await supabase
                .from('profiles')
                .select('address, lat, lng')
                .eq('id', userId)
                .single();
            if (data?.address) {
                setMyAddress(data.address);
                if (data.lat && data.lng) setMyCoords({ lat: data.lat, lng: data.lng });
            }
        })();
    }, [userId, isOpen]);

    useEffect(() => {
        if (isOpen && isCustomer) setTimeout(() => inputRef.current?.focus(), 200);
    }, [isOpen, isCustomer]);

    // Luu dia chi khach hang
    const handleSaveAddress = useCallback(async () => {
        if (!myAddress.trim() || !userId) return;
        setSaving(true);
        setSaveMsg('');
        setGeocoding(true);
        const coords = await geocodeAddress(myAddress);
        setGeocoding(false);
        if (!coords) {
            setSaveMsg('Không tìm thấy địa chỉ. Hãy nhập chi tiết hơn.');
            setSaving(false);
            return;
        }
        const { error } = await supabase
            .from('profiles')
            .update({ address: myAddress.trim(), lat: coords.lat, lng: coords.lng })
            .eq('id', userId);
        if (!error) {
            setMyCoords({ lat: coords.lat, lng: coords.lng });
            setFlyTo([coords.lat, coords.lng]);
            setSaveMsg('ok');
            setTimeout(() => setSaveMsg(''), 3000);
        } else {
            setSaveMsg('Lưu thất bại. Vui lòng thử lại.');
        }
        setSaving(false);
    }, [myAddress, userId]);

    // Tim kiem dia chi
    const handleSearch = useCallback(async () => {
        if (!searchAddr.trim()) return;
        setGeocoding(true);
        const coords = await geocodeAddress(searchAddr);
        setGeocoding(false);
        if (coords) {
            setSearchCoords({ lat: coords.lat, lng: coords.lng, label: coords.display });
            setFlyTo([coords.lat, coords.lng]);
            setSaveMsg('');
        } else {
            setSaveMsg('Không tìm thấy địa chỉ này.');
            setTimeout(() => setSaveMsg(''), 3000);
        }
    }, [searchAddr]);

    const handleShowCompany = () => setFlyTo([COMPANY.lat, COMPANY.lng]);
    const handleShowMe      = () => myCoords && setFlyTo([myCoords.lat, myCoords.lng]);

    /* ── Collapsed button ── */
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                title="Xem bản đồ"
                className="fixed bottom-5 right-44 flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium px-3.5 py-2.5 rounded-full shadow-xl border border-zinc-700/80 hover:border-zinc-600 transition-all duration-200"
            >
                <span className="text-teal-400"><IconMap /></span>
                Bản đồ
            </button>
        );
    }

    /* ── Expanded panel ── */
    return (
        <div
            className="fixed bottom-5 right-5 flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden slide-in-right"
            style={{ width: '400px', height: '410px', zIndex: 1000 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-800 bg-zinc-950/90 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-teal-400"><IconMap /></span>
                    <span className="text-white text-xs font-semibold">Bản đồ</span>
                    <span className="text-zinc-700 text-xs">OpenStreetMap</span>
                </div>

                <div className="flex items-center gap-0.5">
                    {/* Nut ve cong ty */}
                    <button
                        onClick={handleShowCompany}
                        title="Vị trí công ty"
                        className="flex items-center gap-1.5 text-teal-500 hover:text-teal-300 hover:bg-zinc-800 text-xs px-2 py-1 rounded-md transition-all"
                    >
                        <IconBuilding />
                        Công ty
                    </button>

                    {/* Nut ve vi tri minh (chi hien khi da luu dia chi) */}
                    {myCoords && (
                        <button
                            onClick={handleShowMe}
                            title="Địa chỉ của bạn"
                            className="flex items-center gap-1.5 text-amber-500 hover:text-amber-300 hover:bg-zinc-800 text-xs px-2 py-1 rounded-md transition-all"
                        >
                            <IconPin />
                            Của tôi
                        </button>
                    )}

                    {/* Nut dong */}
                    <button
                        onClick={() => setIsOpen(false)}
                        title="Thu gọn"
                        className="text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 p-1.5 rounded-md transition-all ml-1"
                    >
                        <IconChevronDown />
                    </button>
                </div>
            </div>

            {/* Map area */}
            <div className="flex-1" style={{ minHeight: 0 }}>
                <MapContainer
                    center={[COMPANY.lat, COMPANY.lng]}
                    zoom={15}
                    style={{ width: '100%', height: '100%' }}
                    zoomControl
                    attributionControl={false}
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {flyTo && <MapFlyTo center={flyTo} />}

                    {/* Marker cong ty */}
                    <Marker position={[COMPANY.lat, COMPANY.lng]} icon={COMPANY_ICON}>
                        <Popup>
                            <div style={{ fontSize: '12px', lineHeight: 1.6, minWidth: '180px' }}>
                                <p style={{ fontWeight: 600, color: '#0d9488', marginBottom: 2 }}>{COMPANY.name}</p>
                                <p style={{ color: '#555', fontSize: 11, marginBottom: 4 }}>{COMPANY.address}</p>
                                <a
                                    href={`https://www.google.com/maps?q=${COMPANY.lat},${COMPANY.lng}`}
                                    target="_blank" rel="noreferrer"
                                    style={{ color: '#0d9488', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                >
                                    Mở Google Maps
                                </a>
                            </div>
                        </Popup>
                    </Marker>

                    {/* Marker dia chi khach */}
                    {myCoords && (
                        <Marker position={[myCoords.lat, myCoords.lng]} icon={CUSTOMER_ICON}>
                            <Popup>
                                <div style={{ fontSize: '12px', lineHeight: 1.6, minWidth: '180px' }}>
                                    <p style={{ fontWeight: 600, color: '#f59e0b', marginBottom: 2 }}>Địa chỉ của bạn</p>
                                    <p style={{ color: '#555', fontSize: 11, marginBottom: 4 }}>{myAddress}</p>
                                    <a
                                        href={`https://www.google.com/maps?q=${myCoords.lat},${myCoords.lng}`}
                                        target="_blank" rel="noreferrer"
                                        style={{ color: '#f59e0b', fontSize: 11 }}
                                    >
                                        Mở Google Maps
                                    </a>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Marker ket qua tim kiem */}
                    {searchCoords && (
                        <Marker position={[searchCoords.lat, searchCoords.lng]} icon={SEARCH_ICON}>
                            <Popup>
                                <div style={{ fontSize: '12px', lineHeight: 1.6, minWidth: '180px' }}>
                                    <p style={{ fontWeight: 600, color: '#8b5cf6', marginBottom: 2 }}>Kết quả tìm kiếm</p>
                                    <p style={{ color: '#555', fontSize: 11 }}>{searchCoords.label}</p>
                                </div>
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>

            {/* Bottom: input */}
            <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/90 px-3 py-2.5">
                {isCustomer ? (
                    /* Khach hang: luu dia chi */
                    <div className="space-y-2">
                        <p className="text-zinc-500 text-xs">Địa chỉ của bạn (để kỹ thuật viên đến tận nơi hoặc gửi máy):</p>
                        <div className="flex gap-1.5">
                            <input
                                ref={inputRef}
                                type="text"
                                value={myAddress}
                                onChange={e => setMyAddress(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSaveAddress()}
                                placeholder="VD: 12 Nguyễn Trãi, Quận 1, TP.HCM"
                                className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-teal-600/60 text-white text-xs px-2.5 py-1.5 rounded-lg placeholder-zinc-600 outline-none transition-all"
                            />
                            <button
                                onClick={handleSaveAddress}
                                disabled={saving || geocoding || !myAddress.trim()}
                                className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all shrink-0"
                            >
                                {geocoding || saving ? (
                                    <span className="w-3 h-3 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <IconPin />
                                )}
                                {geocoding ? 'Đang tìm...' : saving ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                        {saveMsg === 'ok' && (
                            <p className="flex items-center gap-1.5 text-emerald-400 text-xs">
                                <IconCheck /> Địa chỉ đã lưu và hiển thị trên bản đồ.
                            </p>
                        )}
                        {saveMsg && saveMsg !== 'ok' && (
                            <p className="text-red-400 text-xs">{saveMsg}</p>
                        )}
                    </div>
                ) : (
                    /* Ky thuat vien / Admin: tim kiem */
                    <div className="space-y-2">
                        <div className="flex gap-1.5">
                            <input
                                type="text"
                                value={searchAddr}
                                onChange={e => setSearchAddr(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="Nhập địa chỉ cần tìm..."
                                className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-violet-600/60 text-white text-xs px-2.5 py-1.5 rounded-lg placeholder-zinc-600 outline-none transition-all"
                            />
                            <button
                                onClick={handleSearch}
                                disabled={geocoding || !searchAddr.trim()}
                                className="flex items-center gap-1.5 bg-violet-700 hover:bg-violet-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all shrink-0"
                            >
                                {geocoding
                                    ? <span className="w-3 h-3 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                                    : <IconSearch />
                                }
                                {geocoding ? 'Đang tìm...' : 'Tìm'}
                            </button>
                        </div>
                        {saveMsg && <p className="text-red-400 text-xs">{saveMsg}</p>}
                        <div className="flex items-center gap-4 text-xs text-zinc-600">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />Công ty
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />Địa chỉ khách
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />Kết quả tìm
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
