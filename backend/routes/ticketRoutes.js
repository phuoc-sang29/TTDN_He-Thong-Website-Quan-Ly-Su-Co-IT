import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';
import {
    getTickets,
    getDeletedTickets,
    updateTicket,
    deleteTicket,
    restoreTicket,
    getDashboardStats,
} from '../controllers/ticketController.js';

const router = Router();

// Tất cả routes cần đăng nhập
router.use(authMiddleware);

router.get('/',                getTickets);
router.get('/deleted',         requireRole('admin'), getDeletedTickets);
router.get('/stats',           requireRole('admin'), getDashboardStats);
router.patch('/:id',           updateTicket);
router.delete('/:id',          deleteTicket);
router.patch('/:id/restore',   requireRole('admin'), restoreTicket);

export default router;
