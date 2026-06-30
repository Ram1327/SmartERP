import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// Zod schemas
const stockGroupSchema = z.object({
  name: z.string().min(2, 'Stock group name must be at least 2 characters'),
});

const unitSchema = z.object({
  name: z.string().min(1, 'Unit name must be at least 1 character'),
});

const stockItemSchema = z.object({
  name: z.string().min(2, 'Stock item name must be at least 2 characters'),
  sku: z.string().nullable().optional(),
  groupId: z.string().nullable().optional(),
  unitId: z.string({ required_error: 'Unit of measure is required' }),
  purchasePrice: z.number().nonnegative().optional(),
  sellingPrice: z.number().nonnegative().optional(),
  gstPercentage: z.number().nonnegative().optional(),
  quantity: z.number().nonnegative().optional(),
});

export class InventoryController {
  // ─── STOCK GROUPS CRUD ─────────────────────────────────────────────────────

  static async listGroups(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const groups = await prisma.stockGroup.findMany({
        where: { companyId },
        orderBy: { name: 'asc' },
      });
      return res.status(200).json(groups);
    } catch (err: any) {
      console.error('List stock groups error:', err);
      return res.status(500).json({ error: 'Internal server error listing stock groups' });
    }
  }

  static async createGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const parsed = stockGroupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      }

      const { name } = parsed.data;

      const duplicate = await prisma.stockGroup.findUnique({
        where: { companyId_name: { companyId, name } },
      });
      if (duplicate) {
        return res.status(409).json({ error: `Stock group '${name}' already exists` });
      }

      const newGroup = await prisma.stockGroup.create({
        data: { companyId, name },
      });
      return res.status(201).json(newGroup);
    } catch (err: any) {
      console.error('Create stock group error:', err);
      return res.status(500).json({ error: 'Internal server error creating stock group' });
    }
  }

  static async updateGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      const { id } = req.params;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const parsed = stockGroupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      }

      const { name } = parsed.data;

      const group = await prisma.stockGroup.findFirst({
        where: { id, companyId },
      });
      if (!group) return res.status(404).json({ error: 'Stock group not found' });

      if (name !== group.name) {
        const duplicate = await prisma.stockGroup.findUnique({
          where: { companyId_name: { companyId, name } },
        });
        if (duplicate) {
          return res.status(409).json({ error: `Stock group '${name}' already exists` });
        }
      }

      const updated = await prisma.stockGroup.update({
        where: { id },
        data: { name },
      });
      return res.status(200).json(updated);
    } catch (err: any) {
      console.error('Update stock group error:', err);
      return res.status(500).json({ error: 'Internal server error updating stock group' });
    }
  }

  static async deleteGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      const { id } = req.params;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const group = await prisma.stockGroup.findFirst({
        where: { id, companyId },
      });
      if (!group) return res.status(404).json({ error: 'Stock group not found' });

      await prisma.stockGroup.delete({
        where: { id },
      });
      return res.status(200).json({ message: 'Stock group deleted successfully' });
    } catch (err: any) {
      console.error('Delete stock group error:', err);
      return res.status(500).json({ error: 'Internal server error deleting stock group' });
    }
  }

  // ─── UNITS OF MEASURE CRUD ─────────────────────────────────────────────────

  static async listUnits(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const units = await prisma.unit.findMany({
        where: { companyId },
        orderBy: { name: 'asc' },
      });
      return res.status(200).json(units);
    } catch (err: any) {
      console.error('List units error:', err);
      return res.status(500).json({ error: 'Internal server error listing units' });
    }
  }

  static async createUnit(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const parsed = unitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      }

      const { name } = parsed.data;

      const duplicate = await prisma.unit.findUnique({
        where: { companyId_name: { companyId, name } },
      });
      if (duplicate) {
        return res.status(409).json({ error: `Unit '${name}' already exists` });
      }

      const newUnit = await prisma.unit.create({
        data: { companyId, name },
      });
      return res.status(201).json(newUnit);
    } catch (err: any) {
      console.error('Create unit error:', err);
      return res.status(500).json({ error: 'Internal server error creating unit' });
    }
  }

  static async updateUnit(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      const { id } = req.params;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const parsed = unitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      }

      const { name } = parsed.data;

      const unit = await prisma.unit.findFirst({
        where: { id, companyId },
      });
      if (!unit) return res.status(404).json({ error: 'Unit not found' });

      if (name !== unit.name) {
        const duplicate = await prisma.unit.findUnique({
          where: { companyId_name: { companyId, name } },
        });
        if (duplicate) {
          return res.status(409).json({ error: `Unit '${name}' already exists` });
        }
      }

      const updated = await prisma.unit.update({
        where: { id },
        data: { name },
      });
      return res.status(200).json(updated);
    } catch (err: any) {
      console.error('Update unit error:', err);
      return res.status(500).json({ error: 'Internal server error updating unit' });
    }
  }

  static async deleteUnit(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      const { id } = req.params;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const unit = await prisma.unit.findFirst({
        where: { id, companyId },
      });
      if (!unit) return res.status(404).json({ error: 'Unit not found' });

      // Block delete if referenced by items
      const itemCount = await prisma.stockItem.count({
        where: { unitId: id },
      });
      if (itemCount > 0) {
        return res.status(400).json({ error: 'Cannot delete unit: it is referenced by stock items' });
      }

      await prisma.unit.delete({
        where: { id },
      });
      return res.status(200).json({ message: 'Unit deleted successfully' });
    } catch (err: any) {
      console.error('Delete unit error:', err);
      return res.status(500).json({ error: 'Internal server error deleting unit' });
    }
  }

  // ─── STOCK ITEMS CRUD ──────────────────────────────────────────────────────

  static async listItems(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const items = await prisma.stockItem.findMany({
        where: { companyId },
        include: {
          group: true,
          unit: true,
        },
        orderBy: { name: 'asc' },
      });
      return res.status(200).json(items);
    } catch (err: any) {
      console.error('List stock items error:', err);
      return res.status(500).json({ error: 'Internal server error listing stock items' });
    }
  }

  static async getItem(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      const { id } = req.params;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const item = await prisma.stockItem.findFirst({
        where: { id, companyId },
        include: {
          group: true,
          unit: true,
        },
      });
      if (!item) return res.status(404).json({ error: 'Stock item not found' });
      return res.status(200).json(item);
    } catch (err: any) {
      console.error('Get stock item error:', err);
      return res.status(500).json({ error: 'Internal server error fetching stock item' });
    }
  }

  static async createItem(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const parsed = stockItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      }

      const { name, sku, groupId, unitId, purchasePrice, sellingPrice, gstPercentage, quantity } = parsed.data;

      // Unique name check
      const duplicate = await prisma.stockItem.findUnique({
        where: { companyId_name: { companyId, name } },
      });
      if (duplicate) {
        return res.status(409).json({ error: `Stock item '${name}' already exists` });
      }

      // Verify unit exists
      const unit = await prisma.unit.findFirst({
        where: { id: unitId, companyId },
      });
      if (!unit) return res.status(400).json({ error: 'Selected Unit of Measure not found' });

      // Verify group exists if provided
      if (groupId) {
        const group = await prisma.stockGroup.findFirst({
          where: { id: groupId, companyId },
        });
        if (!group) return res.status(400).json({ error: 'Selected Stock Group not found' });
      }

      const newItem = await prisma.stockItem.create({
        data: {
          companyId,
          name,
          sku: sku || null,
          groupId: groupId || null,
          unitId,
          purchasePrice: purchasePrice || 0,
          sellingPrice: sellingPrice || 0,
          gstPercentage: gstPercentage || 0,
          quantity: quantity || 0,
        },
        include: {
          group: true,
          unit: true,
        },
      });

      return res.status(201).json(newItem);
    } catch (err: any) {
      console.error('Create stock item error:', err);
      return res.status(500).json({ error: 'Internal server error creating stock item' });
    }
  }

  static async updateItem(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      const { id } = req.params;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const parsed = stockItemSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      }

      const item = await prisma.stockItem.findFirst({
        where: { id, companyId },
      });
      if (!item) return res.status(404).json({ error: 'Stock item not found' });

      const { name, sku, groupId, unitId, purchasePrice, sellingPrice, gstPercentage, quantity } = parsed.data;

      // Unique name check
      if (name !== item.name) {
        const duplicate = await prisma.stockItem.findUnique({
          where: { companyId_name: { companyId, name } },
        });
        if (duplicate) {
          return res.status(409).json({ error: `Stock item '${name}' already exists` });
        }
      }

      // Verify unit exists
      const unit = await prisma.unit.findFirst({
        where: { id: unitId, companyId },
      });
      if (!unit) return res.status(400).json({ error: 'Selected Unit of Measure not found' });

      // Verify group exists if provided
      if (groupId) {
        const group = await prisma.stockGroup.findFirst({
          where: { id: groupId, companyId },
        });
        if (!group) return res.status(400).json({ error: 'Selected Stock Group not found' });
      }

      const updated = await prisma.stockItem.update({
        where: { id },
        data: {
          name,
          sku: sku || null,
          groupId: groupId || null,
          unitId,
          purchasePrice: purchasePrice || 0,
          sellingPrice: sellingPrice || 0,
          gstPercentage: gstPercentage || 0,
          quantity: quantity || 0,
        },
        include: {
          group: true,
          unit: true,
        },
      });

      return res.status(200).json(updated);
    } catch (err: any) {
      console.error('Update stock item error:', err);
      return res.status(500).json({ error: 'Internal server error updating stock item' });
    }
  }

  static async deleteItem(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      const { id } = req.params;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const item = await prisma.stockItem.findFirst({
        where: { id, companyId },
      });
      if (!item) return res.status(404).json({ error: 'Stock item not found' });

      // Block delete if referenced by voucher transactions or invoices
      const txCount = await prisma.inventoryTransaction.count({
        where: { stockItemId: id },
      });
      const invoiceCount = await prisma.invoiceItem.count({
        where: { stockItemId: id },
      });

      if (txCount > 0 || invoiceCount > 0) {
        return res.status(400).json({
          error: 'Cannot delete stock item: it contains transaction or invoice history',
        });
      }

      await prisma.stockItem.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'Stock item deleted successfully' });
    } catch (err: any) {
      console.error('Delete stock item error:', err);
      return res.status(500).json({ error: 'Internal server error deleting stock item' });
    }
  }
}
