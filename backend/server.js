import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { globalLimiter } from './middleware/rateLimiter.js';
import chatRoutes   from './routes/chatRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import rentalRoutes from './routes/rentalRoutes.js';
import { GEMINI_MODEL } from './services/geminiService.js';

const app = express();

// ── Middleware cơ bản ──
app.use(cors());
app.use(express.json());
app.use(globalLimiter);

// ── Routes ──
app.use('/api/chat',             chatRoutes);
app.use('/api/tickets',          ticketRoutes);
app.use('/api/rental-contracts', rentalRoutes);

// ── Health check ──
app.get('/api/health', (_req, res) => {
    res.json({
        status:  'ok',
        model:   GEMINI_MODEL,
        time:    new Date().toISOString(),
    });
});

// ── 404 handler ──
app.use((_req, res) => {
    res.status(404).json({ error: 'Route không tồn tại.' });
});

// ── Global error handler ──
app.use((err, _req, res, _next) => {
    console.error('[UNHANDLED ERROR]', err);
    res.status(500).json({ error: 'Lỗi server. Liên hệ quản trị viên.' });
});

// ── Start ──
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    const keyCount = (process.env.GEMINI_API_KEYS || '')
        .split(',').filter(k => k.trim().length > 0).length;

    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║     IT HELPDESK BACKEND v2.0         ║');
    console.log('╠══════════════════════════════════════╣');
    console.log(`║  URL    : http://localhost:${PORT}      ║`);
    console.log(`║  Model  : ${GEMINI_MODEL.padEnd(26)}║`);
    console.log(`║  AI Keys: ${String(keyCount).padEnd(26)}║`);
    console.log(`║  Supabase: ${process.env.SUPABASE_URL ? 'Connected' : 'NOT configured (set .env)'.padEnd(25)}║`);
    console.log('╚══════════════════════════════════════╝');
    console.log('');
    console.log('  Routes:');
    console.log('  POST /api/chat');
    console.log('  GET  /api/tickets         (auth required)');
    console.log('  GET  /api/tickets/deleted  (admin only)');
    console.log('  GET  /api/tickets/stats    (admin only)');
    console.log('  GET  /api/rental-contracts (auth required)');
    console.log('  POST /api/rental-contracts/:id/approve (admin)');
    console.log('');
});
