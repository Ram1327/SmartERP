import { Router } from 'express';
import { CompanyController } from '../controllers/companyController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// All company routes are protected by JWT authentication
router.use(authenticateToken);

router.get('/', CompanyController.list);
router.post('/', CompanyController.create);
router.get('/:id', CompanyController.get);
router.put('/:id', CompanyController.update);
router.delete('/:id', CompanyController.delete);

export default router;
