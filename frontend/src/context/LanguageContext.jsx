import { createContext, useContext, useState } from 'react';
import vi from '../i18n/vi';
import en from '../i18n/en';

const DICTS = { vi, en };
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'vi');

    const toggleLang = () => {
        const next = lang === 'vi' ? 'en' : 'vi';
        setLang(next);
        localStorage.setItem('lang', next);
    };

    // t('key') trả về chuỗi theo ngôn ngữ hiện tại, fallback về key nếu chưa có
    const t = (key) => DICTS[lang][key] ?? DICTS['vi'][key] ?? key;

    return (
        <LanguageContext.Provider value={{ lang, toggleLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export const useLanguage = () => useContext(LanguageContext);
