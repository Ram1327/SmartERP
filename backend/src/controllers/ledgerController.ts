import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// Zod validation schemas
const ledgerSchema = z.object({
  name: z.string().min(2, 'Ledger name must be at least 2 characters'),
  type: z.enum(['Customer', 'Supplier', 'Expense', 'Income', 'Bank', 'Cash', 'General']),
  groupId: z.string().optional(), // Optional since we lookup for Customer/Supplier
  openingBalance: z.number().default(0),
  // Customer/Supplier optional fields
  mobileNumber: z.string().optional(),
  address: z.string().optional(),
  gstin: z.string().optional(),
});

export class LedgerController {
  /**
   * List all ledgers for the active company
   */
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const ledgers = await prisma.ledger.findMany({
        where: { companyId },
        include: {
          group: { select: { id: true, name: true, primaryGroup: true } },
          customer: true,
          supplier: true,
        },
        orderBy: { name: 'asc' },
      });

      return res.status(200).json(ledgers);
    } catch (error) {
      console.error('List ledgers error:', error);
      return res.status(500).json({ error: 'Internal server error listing ledgers' });
    }
  }

  /**
   * Get groups list to populate ledger creation group dropdown
   */
  static async listGroups(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const groups = await prisma.group.findMany({
        where: { companyId },
        orderBy: { name: 'asc' },
      });

      return res.status(200).json(groups);
    } catch (error) {
      console.error('List groups error:', error);
      return res.status(500).json({ error: 'Internal server error listing groups' });
    }
  }

  /**
   * Create a new ledger (with optional Customer/Supplier bindings)
   */
  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const parsedBody = ledgerSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: 'Validation error', details: parsedBody.error.flatten() });
      }

      const { name, type, groupId, openingBalance, mobileNumber, address, gstin } = parsedBody.data;

      // Check duplicate ledger name in the same company
      const duplicate = await prisma.ledger.findUnique({
        where: {
          companyId_name: {
            companyId,
            name,
          },
        },
      });

      if (duplicate) {
        return res.status(409).json({ error: `Ledger with name '${name}' already exists in this company` });
      }

      const result = await prisma.$transaction(async (tx) => {
        let finalGroupId = groupId;

        // Auto-assign group for Customer & Supplier
        if (type === 'Customer') {
          let dbGroup = await tx.group.findFirst({
            where: { companyId, name: 'Sundry Debtors' },
          });
          if (!dbGroup) {
            dbGroup = await tx.group.findFirst({ where: { companyId, name: 'Current Assets' } });
          }
          if (!dbGroup) {
            throw new Error('Sundry Debtors or Assets group not found. Ensure groups are seeded.');
          }
          finalGroupId = dbGroup.id;
        } else if (type === 'Supplier') {
          let dbGroup = await tx.group.findFirst({
            where: { companyId, name: 'Sundry Creditors' },
          });
          if (!dbGroup) {
            dbGroup = await tx.group.findFirst({ where: { companyId, name: 'Current Liabilities' } });
          }
          if (!dbGroup) {
            throw new Error('Sundry Creditors or Liabilities group not found. Ensure groups are seeded.');
          }
          finalGroupId = dbGroup.id;
        }

        if (!finalGroupId) {
          throw new Error('GroupId is required for this ledger type');
        }

        // 1. Create Ledger
        const ledger = await tx.ledger.create({
          data: {
            companyId,
            groupId: finalGroupId,
            name,
            type,
            openingBalance,
            currentBalance: openingBalance,
          },
        });

        // 2. Create Customer record if applicable
        if (type === 'Customer') {
          await tx.customer.create({
            data: {
              companyId,
              ledgerId: ledger.id,
              name,
              mobileNumber: mobileNumber || null,
              address: address || null,
              gstin: gstin || null,
              outstandingBalance: openingBalance,
            },
          });
        }

        // 3. Create Supplier record if applicable
        if (type === 'Supplier') {
          await tx.supplier.create({
            data: {
              companyId,
              ledgerId: ledger.id,
              name,
              mobileNumber: mobileNumber || null,
              address: address || null,
              gstin: gstin || null,
              outstandingDues: openingBalance,
            },
          });
        }

        return ledger;
      });

      return res.status(201).json({
        message: 'Ledger created successfully',
        ledger: result,
      });
    } catch (error: any) {
      console.error('Create ledger error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error creating ledger' });
    }
  }

  /**
   * Get single ledger details with Customer/Supplier bindings
   */
  static async get(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      const { id } = req.params;

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const ledger = await prisma.ledger.findFirst({
        where: { id, companyId },
        include: {
          group: true,
          customer: true,
          supplier: true,
        },
      });

      if (!ledger) {
        return res.status(404).json({ error: 'Ledger not found' });
      }

      return res.status(200).json(ledger);
    } catch (error) {
      console.error('Get ledger error:', error);
      return res.status(500).json({ error: 'Internal server error fetching ledger' });
    }
  }

  /**
   * Update Ledger details
   */
  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      const { id } = req.params;

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const parsedBody = ledgerSchema.partial().safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: 'Validation error', details: parsedBody.error.flatten() });
      }

      const existingLedger = await prisma.ledger.findFirst({
        where: { id, companyId },
      });

      if (!existingLedger) {
        return res.status(404).json({ error: 'Ledger not found or access denied' });
      }

      const { name, openingBalance, mobileNumber, address, gstin } = parsedBody.data;

      const updated = await prisma.$transaction(async (tx) => {
        // 1. Update Ledger
        const ledger = await tx.ledger.update({
          where: { id },
          data: {
            name: name !== undefined ? name : undefined,
            openingBalance: openingBalance !== undefined ? openingBalance : undefined,
          },
        });

        // 2. Update Customer metadata if applicable
        if (existingLedger.type === 'Customer') {
          await tx.customer.updateMany({
            where: { ledgerId: id },
            data: {
              name: name !== undefined ? name : undefined,
              mobileNumber: mobileNumber !== undefined ? mobileNumber : undefined,
              address: address !== undefined ? address : undefined,
              gstin: gstin !== undefined ? gstin : undefined,
            },
          });
        }

        // 3. Update Supplier metadata if applicable
        if (existingLedger.type === 'Supplier') {
          await tx.supplier.updateMany({
            where: { ledgerId: id },
            data: {
              name: name !== undefined ? name : undefined,
              mobileNumber: mobileNumber !== undefined ? mobileNumber : undefined,
              address: address !== undefined ? address : undefined,
              gstin: gstin !== undefined ? gstin : undefined,
            },
          });
        }

        return ledger;
      });

      return res.status(200).json({
        message: 'Ledger updated successfully',
        ledger: updated,
      });
    } catch (error) {
      console.error('Update ledger error:', error);
      return res.status(500).json({ error: 'Internal server error updating ledger' });
    }
  }

  /**
   * Delete a Ledger
   */
  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      const { id } = req.params;

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const ledger = await prisma.ledger.findFirst({
        where: { id, companyId },
      });

      if (!ledger) {
        return res.status(404).json({ error: 'Ledger not found or access denied' });
      }

      // Check if ledger is used in voucher entries
      const entriesCount = await prisma.voucherEntry.count({
        where: { ledgerId: id },
      });

      if (entriesCount > 0) {
        return res.status(400).json({
          error: 'Cannot delete ledger: It contains voucher entries. Please delete the vouchers first.',
        });
      }

      await prisma.$transaction(async (tx) => {
        // Delete Customer/Supplier record first (restrict will block if parent not deleted, but since cascade/transaction, we clean it)
        if (ledger.type === 'Customer') {
          await tx.customer.deleteMany({ where: { ledgerId: id } });
        } else if (ledger.type === 'Supplier') {
          await tx.supplier.deleteMany({ where: { ledgerId: id } });
        }

        // Delete general ledger
        await tx.ledger.delete({ where: { id } });
      });

      return res.status(200).json({ message: 'Ledger deleted successfully' });
    } catch (error) {
      console.error('Delete ledger error:', error);
      return res.status(500).json({ error: 'Internal server error deleting ledger' });
    }
  }
}
