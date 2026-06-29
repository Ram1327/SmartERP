import { Router } from 'express';
import { GroupController } from '../controllers/groupController.js';
import { authenticateToken, requireCompanyContext } from '../middleware/auth.js';

const router = Router();

// Protect all group routes with auth token and company context headers
router.use(authenticateToken);
router.use(requireCompanyContext);

router.get('/', GroupController.list);
router.post('/', GroupController.create);
router.get('/:id', GroupController.get);
router.put('/:id', GroupController.update);
router.delete('/:id', GroupController.delete);

export default router;
