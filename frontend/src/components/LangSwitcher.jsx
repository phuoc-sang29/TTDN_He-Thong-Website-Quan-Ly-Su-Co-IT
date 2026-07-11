import { useLanguage } from '../context/LanguageContext';

function LangSwitcher() {
    const { lang, toggleLang } = useLanguage();
    return (
        <button
            onClick={toggleLang}
            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all duration-150"
            title="Chuyển ngôn ngữ / Switch language"
        >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            {lang === 'vi' ? 'EN' : 'VI'}
        </button>
    );
}

export default LangSwitcher;
