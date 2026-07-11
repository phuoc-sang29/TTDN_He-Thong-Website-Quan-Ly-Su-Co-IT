import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

function StarButton({ index, filled, onClick }) {
    return (
        <button
            onClick={() => onClick(index)}
            className="transition-transform duration-100 hover:scale-110"
        >
            <svg
                className={'w-8 h-8 transition-colors duration-100 ' + (filled ? 'text-amber-400' : 'text-zinc-700 hover:text-amber-300')}
                fill={filled ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
        </button>
    );
}

function RatingWidget({ ticketId }) {
    const { t } = useLanguage();
    const { userId } = useAuth();

    const [existingRating, setExistingRating] = useState(null);
    const [score, setScore]     = useState(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading]     = useState(true);
    const [saving, setSaving]       = useState(false);

    useEffect(() => {
        const fetchRating = async () => {
            const { data } = await supabase
                .from('ratings')
                .select('*')
                .eq('ticket_id', ticketId)
                .single();
            if (data) {
                setExistingRating(data);
                setScore(data.score);
                setComment(data.comment || '');
            }
            setLoading(false);
        };
        if (ticketId) fetchRating();
    }, [ticketId]);

    const handleSubmit = async () => {
        if (score === 0 || saving) return;
        setSaving(true);
        const { error } = await supabase.from('ratings').upsert({
            ticket_id: ticketId,
            customer_id: userId,
            score,
            comment: comment.trim() || null,
        }, { onConflict: 'ticket_id' });

        if (!error) setSubmitted(true);
        else console.error('[RATING ERROR] ' + error.message);
        setSaving(false);
    };

    if (loading) return null;

    if (submitted || (existingRating && existingRating.customer_id === userId)) {
        return (
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-4 fade-in">
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                            <svg key={i} className={'w-5 h-5 ' + (i <= score ? 'text-amber-400' : 'text-zinc-700')} fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        ))}
                    </div>
                    <span className="text-amber-400 text-xs font-semibold">{t('rating.done')}</span>
                </div>
                {comment && <p className="text-zinc-400 text-xs italic">"{comment}"</p>}
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 fade-in">
            <p className="text-zinc-300 text-sm font-semibold mb-0.5">{t('rating.title')}</p>
            <p className="text-zinc-600 text-xs mb-4">{t('rating.subtitle')}</p>

            <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map(i => (
                    <StarButton key={i} index={i} filled={i <= score} onClick={setScore} />
                ))}
            </div>

            <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={t('rating.placeholder')}
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 focus:border-teal-600/60 text-white text-xs px-3 py-2 rounded-lg placeholder-zinc-700 resize-none transition-all duration-150 mb-3"
            />

            <button
                onClick={handleSubmit}
                disabled={score === 0 || saving}
                className="w-full bg-amber-700 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-700 text-white text-xs font-semibold py-2 rounded-lg transition-all duration-150"
            >
                {saving ? t('loading') : t('rating.submit')}
            </button>
        </div>
    );
}

export default RatingWidget;
