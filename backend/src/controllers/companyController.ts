import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { seedCompanyGroups } from '../scripts/seed.js';

// Zod validation schema for Company
const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST format').optional().or(z.literal('')),
  financialYearStart: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid financial year start date',
  }),
  state: z.string().min(2, 'State must be specified'),
  contactInfo: z.string().optional(),
});

export class CompanyController {
  /**
   * List all companies belonging to the logged-in user
   */
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const companies = await prisma.company.findMany({
        where: {
          userId: req.user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return res.status(200).json(companies);
    } catch (error) {
      console.error('List companies error:', error);
      return res.status(500).json({ error: 'Internal server error listing companies' });
    }
  }

  /**
   * Create a new company (max 5 companies limit enforced)
   */
  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const parsedBody = companySchema.safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: 'Validation error', details: parsedBody.error.flatten() });
      }

      const { name, address, gstNumber, financialYearStart, state, contactInfo } = parsedBody.data;

      // Enforce max 5 companies constraint
      const companyCount = await prisma.company.count({
        where: {
          userId: req.user.id,
        },
      });

      if (companyCount >= 5) {
        return res.status(400).json({
          error: 'Company limit reached. A maximum of 5 companies is allowed per user account.',
        });
      }

      // Create company and seed its chart of accounts in a single transaction
      const company = await prisma.$transaction(async (tx) => {
        const createdCompany = await tx.company.create({
          data: {
            userId: req.user!.id,
            name,
            address,
            gstNumber: gstNumber || null,
            financialYearStart: new Date(financialYearStart),
            state,
            contactInfo: contactInfo || null,
          },
        });

        // Seed default groups
        const groups = await seedCompanyGroups(tx, createdCompany.id);

        // Seed default ledgers
        const defaultLedgers = [
          { name: 'Cash', type: 'Cash', groupName: 'Cash-in-hand', openingBalance: 0.00 },
          { name: 'Bank Account', type: 'Bank', groupName: 'Bank Accounts', openingBalance: 0.00 },
          { name: 'Sales Account', type: 'Income', groupName: 'Direct Incomes', openingBalance: 0.00 },
          { name: 'Purchase Account', type: 'Expense', groupName: 'Direct Expenses', openingBalance: 0.00 },
          { name: 'Rent Expense', type: 'Expense', groupName: 'Indirect Expenses', openingBalance: 0.00 },
          { name: 'CGST Ledger', type: 'General', groupName: 'Duties & Taxes', openingBalance: 0.00 },
          { name: 'SGST Ledger', type: 'General', groupName: 'Duties & Taxes', openingBalance: 0.00 },
          { name: 'IGST Ledger', type: 'General', groupName: 'Duties & Taxes', openingBalance: 0.00 },
        ];

        for (const ledger of defaultLedgers) {
          const group = groups[ledger.groupName];
          if (!group) {
            throw new Error(`Group not found for seeding: ${ledger.groupName}`);
          }

          await tx.ledger.create({
            data: {
              companyId: createdCompany.id,
              groupId: group.id,
              name: ledger.name,
              type: ledger.type,
              openingBalance: ledger.openingBalance,
              currentBalance: ledger.openingBalance,
            },
          });
        }

        return createdCompany;
      });

      return res.status(201).json({
        message: 'Company created successfully, chart of accounts initialized.',
        company,
      });
    } catch (error) {
      console.error('Create company error:', error);
      return res.status(500).json({ error: 'Internal server error creating company' });
    }
  }

  /**
   * Update company details
   */
  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;

      const parsedBody = companySchema.partial().safeParse(req.body);
      if (!parsedBody.success) {
        return res.status(400).json({ error: 'Validation error', details: parsedBody.error.flatten() });
      }

      // Check ownership
      const existingCompany = await prisma.company.findFirst({
        where: {
          id,
          userId: req.user.id,
        },
      });

      if (!existingCompany) {
        return res.status(404).json({ error: 'Company not found or access denied' });
      }

      const updateData: any = { ...parsedBody.data };
      if (updateData.financialYearStart) {
        updateData.financialYearStart = new Date(updateData.financialYearStart);
      }

      const updatedCompany = await prisma.company.update({
        where: { id },
        data: updateData,
      });

      return res.status(200).json({
        message: 'Company updated successfully',
        company: updatedCompany,
      });
    } catch (error) {
      console.error('Update company error:', error);
      return res.status(500).json({ error: 'Internal server error updating company' });
    }
  }

  /**
   * Delete a company
   */
  static async delete(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;

      // Check ownership
      const existingCompany = await prisma.company.findFirst({
        where: {
          id,
          userId: req.user.id,
        },
      });

      if (!existingCompany) {
        return res.status(404).json({ error: 'Company not found or access denied' });
      }

      await prisma.company.delete({
        where: { id },
      });

      return res.status(200).json({ message: 'Company deleted successfully' });
    } catch (error) {
      console.error('Delete company error:', error);
      return res.status(500).json({ error: 'Internal server error deleting company' });
    }
  }

  /**
   * Get single company details
   */
  static async get(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;

      const company = await prisma.company.findFirst({
        where: {
          id,
          userId: req.user.id,
        },
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found or access denied' });
      }

      return res.status(200).json(company);
    } catch (error) {
      console.error('Get company error:', error);
      return res.status(500).json({ error: 'Internal server error fetching company' });
    }
  }
}
