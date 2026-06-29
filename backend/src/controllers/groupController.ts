import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

// Zod validation schemas
const groupSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters'),
  parentId: z.string().nullable().optional(),
  primaryGroup: z.enum(['Assets', 'Liabilities', 'Income', 'Expenses']).optional(),
});

const DEFAULT_SYSTEM_GROUPS = new Set([
  'Assets', 'Liabilities', 'Income', 'Expenses',
  'Current Assets', 'Fixed Assets', 'Capital Account', 'Current Liabilities',
  'Direct Incomes', 'Indirect Incomes', 'Direct Expenses', 'Indirect Expenses',
  'Bank Accounts', 'Cash-in-hand', 'Sundry Debtors', 'Stock-in-hand',
  'Sundry Creditors', 'Duties & Taxes'
]);

export class GroupController {
  /**
   * List all groups for the active company
   */
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const groups = await prisma.group.findMany({
        where: { companyId },
        include: {
          _count: {
            select: {
              ledgers: true,
              subgroups: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      return res.status(200).json(groups);
    } catch (error) {
      console.error('List groups error:', error);
      return res.status(500).json({ error: 'Internal server error listing groups' });
    }
  }

  /**
   * Get single group details
   */
  static async get(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      const { id } = req.params;

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const group = await prisma.group.findFirst({
        where: { id, companyId },
        include: {
          parent: true,
        },
      });

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      return res.status(200).json(group);
    } catch (error) {
      console.error('Get group error:', error);
      return res.status(500).json({ error: 'Internal server error fetching group' });
    }
  }

  /**
   * Create a new group
   */
  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const parsedBody = groupSchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: 'Validation error', details: parsedBody.error.flatten() });
      }

      const { name, parentId, primaryGroup } = parsedBody.data;

      // Check duplicate group name in the same company
      const duplicate = await prisma.group.findUnique({
        where: {
          companyId_name: {
            companyId,
            name,
          },
        },
      });

      if (duplicate) {
        return res.status(409).json({ error: `Group with name '${name}' already exists in this company` });
      }

      let finalPrimaryGroup = primaryGroup;
      if (parentId) {
        const parent = await prisma.group.findFirst({
          where: { id: parentId, companyId },
        });
        if (!parent) {
          return res.status(400).json({ error: 'Parent group not found' });
        }
        finalPrimaryGroup = parent.primaryGroup as any;
      } else {
        if (!finalPrimaryGroup) {
          return res.status(400).json({ error: 'Primary group is required for top-level groups' });
        }
      }

      const newGroup = await prisma.group.create({
        data: {
          companyId,
          name,
          parentId: parentId || null,
          primaryGroup: finalPrimaryGroup!,
        },
      });

      return res.status(201).json({
        message: 'Group created successfully',
        group: newGroup,
      });
    } catch (error: any) {
      console.error('Create group error:', error);
      return res.status(500).json({ error: error.message || 'Internal server error creating group' });
    }
  }

  /**
   * Update Group details
   */
  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      const { id } = req.params;

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const parsedBody = groupSchema.partial().safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: 'Validation error', details: parsedBody.error.flatten() });
      }

      const existingGroup = await prisma.group.findFirst({
        where: { id, companyId },
      });

      if (!existingGroup) {
        return res.status(404).json({ error: 'Group not found or access denied' });
      }

      const { name, parentId, primaryGroup } = parsedBody.data;

      // Duplicate name check if name is updated
      if (name && name !== existingGroup.name) {
        const duplicate = await prisma.group.findUnique({
          where: {
            companyId_name: {
              companyId,
              name,
            },
          },
        });
        if (duplicate) {
          return res.status(409).json({ error: `Group with name '${name}' already exists in this company` });
        }
      }

      // Deletion/modification block for system default group names (cannot rename them)
      if (name && DEFAULT_SYSTEM_GROUPS.has(existingGroup.name)) {
        return res.status(403).json({ error: `System default group '${existingGroup.name}' cannot be renamed` });
      }

      let finalPrimaryGroup = existingGroup.primaryGroup;

      if (parentId !== undefined) {
        if (parentId === id) {
          return res.status(400).json({ error: 'A group cannot be its own parent' });
        }

        if (parentId) {
          // Cycle check
          let currentParentId: string | null = parentId;
          while (currentParentId) {
            if (currentParentId === id) {
              return res.status(400).json({ error: 'Cyclic dependency detected: Group cannot be nested under itself or its subgroups' });
            }
            const pGroup: any = await prisma.group.findUnique({
              where: { id: currentParentId },
              select: { parentId: true },
            });
            currentParentId = pGroup?.parentId || null;
          }

          const parent = await prisma.group.findFirst({
            where: { id: parentId, companyId },
          });
          if (!parent) {
            return res.status(400).json({ error: 'Parent group not found' });
          }
          finalPrimaryGroup = parent.primaryGroup;
        } else {
          // Changed to top level
          if (primaryGroup) {
            finalPrimaryGroup = primaryGroup;
          }
        }
      }

      // Propagate new primaryGroup recursively
      const updateDescendantsPrimaryGroup = async (tx: any, parentGroupId: string, newPrimary: string) => {
        const children = await tx.group.findMany({
          where: { parentId: parentGroupId },
        });
        for (const child of children) {
          await tx.group.update({
            where: { id: child.id },
            data: { primaryGroup: newPrimary },
          });
          await updateDescendantsPrimaryGroup(tx, child.id, newPrimary);
        }
      };

      const updated = await prisma.$transaction(async (tx) => {
        const group = await tx.group.update({
          where: { id },
          data: {
            name: name !== undefined ? name : undefined,
            parentId: parentId !== undefined ? parentId : undefined,
            primaryGroup: finalPrimaryGroup,
          },
        });

        if (parentId !== undefined || primaryGroup !== undefined) {
          await updateDescendantsPrimaryGroup(tx, id, finalPrimaryGroup);
        }

        return group;
      });

      return res.status(200).json({
        message: 'Group updated successfully',
        group: updated,
      });
    } catch (error) {
      console.error('Update group error:', error);
      return res.status(500).json({ error: 'Internal server error updating group' });
    }
  }

  /**
   * Delete a Group
   */
  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      const { id } = req.params;

      if (!companyId) {
        return res.status(400).json({ error: 'Company context required' });
      }

      const group = await prisma.group.findFirst({
        where: { id, companyId },
      });

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      // 1. Block delete of default system groups
      if (DEFAULT_SYSTEM_GROUPS.has(group.name)) {
        return res.status(403).json({ error: `System default group '${group.name}' cannot be deleted` });
      }

      // 2. Block if has direct ledgers
      const ledgerCount = await prisma.ledger.count({
        where: { groupId: id },
      });
      if (ledgerCount > 0) {
        return res.status(400).json({ error: 'Cannot delete group: it has ledgers directly attached' });
      }

      // 3. Block if has direct subgroups
      const subgroupCount = await prisma.group.count({
        where: { parentId: id },
      });
      if (subgroupCount > 0) {
        return res.status(400).json({ error: 'Cannot delete group: it has subgroups. Please delete subgroups first.' });
      }

      await prisma.group.delete({
        where: { id },
      });

      return res.status(200).json({
        message: 'Group deleted successfully',
      });
    } catch (error) {
      console.error('Delete group error:', error);
      return res.status(500).json({ error: 'Internal server error deleting group' });
    }
  }
}
