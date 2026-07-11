import { generateWithGemini } from '../services/geminiService.js';

/**
 * POST /api/chat
 * Body: { prompt, history }
 * history: [{ role: 'user'|'assistant', content: '...' }]
 */
export const chatController = async (req, res) => {
    const { prompt, history } = req.body;

    if (!prompt || !String(prompt).trim()) {
        return res.status(400).json({ error: 'Nội dung tin nhắn không được để trống.' });
    }

    // Xây dựng conversation contents
    const contents = [];

    if (Array.isArray(history) && history.length > 0) {
        for (const msg of history) {
            const text = String(msg.content || '').trim();
            if (!text) continue;
            const role = msg.role === 'assistant' ? 'model' : 'user';
            contents.push({ role, parts: [{ text }] });
        }
    }

    contents.push({
        role: 'user',
        parts: [{ text: String(prompt).trim() }],
    });

    try {
        const reply = await generateWithGemini(contents);
        return res.json({ reply });
    } catch (error) {
        console.error('[CHAT CONTROLLER]', error.message);
        return res.status(500).json({ error: 'Hệ thống AI quá tải. Vui lòng thử lại sau.' });
    }
};
