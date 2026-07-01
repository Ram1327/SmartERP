import { Router } from 'express';
import { authenticateToken, requireCompanyContext } from '../middleware/auth.js';
import { VoucherController } from '../controllers/voucherController.js';

const router = Router();

router.use(authenticateToken);
router.use(requireCompanyContext);

router.get('/', VoucherController.listVouchers);
router.post('/', VoucherController.createVoucher);
router.delete('/:id', VoucherController.deleteVoucher);

export default router;
