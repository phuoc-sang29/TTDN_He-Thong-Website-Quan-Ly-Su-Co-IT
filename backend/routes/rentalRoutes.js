import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';
import {
    getRentals,
    createRental,
    approveRental,
    rejectRental,
    returnRental,
} from '../controllers/rentalController.js';

const router = Router();

router.use(authMiddleware);

router.get('/',                  getRentals);
router.post('/',                 requireRole('admin', 'technician'), createRental);
router.post('/:id/approve',      requireRole('admin'), approveRental);
router.post('/:id/reject',       requireRole('admin'), rejectRental);
router.patch('/:id/return',      requireRole('admin', 'technician'), returnRental);

export default router;
