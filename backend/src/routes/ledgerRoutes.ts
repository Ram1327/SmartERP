import { Router } from 'express';
import { LedgerController } from '../controllers/ledgerController.js';
import { authenticateToken, requireCompanyContext } from '../middleware/auth.js';

const router = Router();

// Protect all ledger routes with auth token and company context headers
router.use(authenticateToken);
router.use(requireCompanyContext);

router.get('/', LedgerController.list);
router.get('/groups', LedgerController.listGroups);
router.post('/', LedgerController.create);
router.get('/:id', LedgerController.get);
router.put('/:id', LedgerController.update);
router.delete('/:id', LedgerController.delete);

export default router;
