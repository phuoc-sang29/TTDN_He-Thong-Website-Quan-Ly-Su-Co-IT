import rateLimit from 'express-rate-limit';

// Giới hạn chung cho tất cả API
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 phút
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.' },
});

// Giới hạn riêng cho AI chat (tốn token nhiều hơn)
export const chatLimiter = rateLimit({
    windowMs: 60 * 1000,       // 1 phút
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Quá nhiều tin nhắn. Vui lòng chờ 1 phút.' },
});
