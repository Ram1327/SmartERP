import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController.js';
import { authenticateToken, requireCompanyContext } from '../middleware/auth.js';

const router = Router();

// Protect all inventory routes with auth token and company context headers
router.use(authenticateToken);
router.use(requireCompanyContext);

// Stock Groups
router.get('/groups', InventoryController.listGroups);
router.post('/groups', InventoryController.createGroup);
router.put('/groups/:id', InventoryController.updateGroup);
router.delete('/groups/:id', InventoryController.deleteGroup);

// Units of Measure
router.get('/units', InventoryController.listUnits);
router.post('/units', InventoryController.createUnit);
router.put('/units/:id', InventoryController.updateUnit);
router.delete('/units/:id', InventoryController.deleteUnit);

// Stock Items
router.get('/items', InventoryController.listItems);
router.get('/items/:id', InventoryController.getItem);
router.post('/items', InventoryController.createItem);
router.put('/items/:id', InventoryController.updateItem);
router.delete('/items/:id', InventoryController.deleteItem);

export default router;
