import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/db.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { Decimal } from '@prisma/client/runtime/library';

// Zod schema
const itemSchema = z.object({
  stockItemId: z.string(),
  quantity: z.number().positive('Quantity must be positive'),
  rate: z.number().nonnegative('Rate cannot be negative'),
  gstPercentage: z.number().nonnegative('GST Percentage cannot be negative'),
});

const createVoucherSchema = z.object({
  voucherType: z.enum(['Purchase', 'Sales', 'Receipt', 'Payment', 'Contra', 'Journal', 'CreditNote', 'DebitNote']),
  date: z.string(),
  partyLedgerId: z.string(),
  purchaseLedgerId: z.string().optional(),
  salesLedgerId: z.string().optional(),
  referenceNumber: z.string().nullable().optional(),
  narration: z.string().nullable().optional(),
  items: z.array(itemSchema).min(1, 'At least one item is required'),
});

export class VoucherController {
  static async listVouchers(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      const { type } = req.query;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const vouchers = await prisma.voucher.findMany({
        where: {
          companyId,
          ...(type ? { voucherType: String(type) } : {}),
        },
        include: {
          entries: {
            include: {
              ledger: true,
            },
          },
          inventoryTransactions: {
            include: {
              stockItem: {
                include: {
                  unit: true,
                },
              },
            },
          },
        },
        orderBy: { date: 'desc' },
      });

      return res.status(200).json(vouchers);
    } catch (err: any) {
      console.error('List vouchers error:', err);
      return res.status(500).json({ error: 'Internal server error listing vouchers' });
    }
  }

  static async createVoucher(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      const parsed = createVoucherSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      }

      const {
        voucherType,
        date,
        partyLedgerId,
        purchaseLedgerId,
        salesLedgerId,
        referenceNumber,
        narration,
        items,
      } = parsed.data;

      // Business checks:
      if (voucherType === 'Purchase' && !purchaseLedgerId) {
        return res.status(400).json({ error: 'Purchase Ledger is required for Purchase Vouchers' });
      }
      if (voucherType === 'Sales' && !salesLedgerId) {
        return res.status(400).json({ error: 'Sales Ledger is required for Sales Vouchers' });
      }

      // Execute entire booking in a unified transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Get Company details to verify state
        const company = await tx.company.findUnique({
          where: { id: companyId },
        });
        if (!company) throw new Error('Company not found');

        // 2. Check Party Ledger details
        const partyLedger = await tx.ledger.findFirst({
          where: { id: partyLedgerId, companyId },
          include: {
            supplier: true,
            customer: true,
          },
        });
        if (!partyLedger) throw new Error('Party Ledger not found');

        // Determine if local or interstate by comparing the first 2 digits of the GSTINs
        let isLocal = true;
        const companyGst = company.gstNumber ? company.gstNumber.trim() : '';
        if (voucherType === 'Purchase' && partyLedger.supplier?.gstin) {
          const supplierGst = partyLedger.supplier.gstin.trim();
          if (supplierGst.length >= 2 && companyGst.length >= 2) {
            isLocal = supplierGst.substring(0, 2) === companyGst.substring(0, 2);
          }
        } else if (voucherType === 'Sales' && partyLedger.customer?.gstin) {
          const customerGst = partyLedger.customer.gstin.trim();
          if (customerGst.length >= 2 && companyGst.length >= 2) {
            isLocal = customerGst.substring(0, 2) === companyGst.substring(0, 2);
          }
        }

        // Get Tax Ledgers
        const taxLedgers = await tx.ledger.findMany({
          where: {
            companyId,
            name: { in: ['CGST Ledger', 'SGST Ledger', 'IGST Ledger'] },
          },
        });
        const cgstLedger = taxLedgers.find((l) => l.name === 'CGST Ledger');
        const sgstLedger = taxLedgers.find((l) => l.name === 'SGST Ledger');
        const igstLedger = taxLedgers.find((l) => l.name === 'IGST Ledger');

        if (!cgstLedger || !sgstLedger || !igstLedger) {
          throw new Error('Duties & Taxes ledgers (CGST, SGST, IGST) must be seeded first');
        }

        // 3. Compute totals and tax splits
        let subtotal = new Decimal(0);
        let totalCgst = new Decimal(0);
        let totalSgst = new Decimal(0);
        let totalIgst = new Decimal(0);

        const parsedItems = [];

        for (const item of items) {
          const dbItem = await tx.stockItem.findFirst({
            where: { id: item.stockItemId, companyId },
          });
          if (!dbItem) throw new Error(`Stock item not found: ${item.stockItemId}`);

          const lineSubtotal = new Decimal(item.quantity).times(item.rate);
          subtotal = subtotal.plus(lineSubtotal);

          const gstRate = new Decimal(item.gstPercentage);
          let cgst = new Decimal(0);
          let sgst = new Decimal(0);
          let igst = new Decimal(0);

          if (isLocal) {
            cgst = lineSubtotal.times(gstRate).dividedBy(200);
            sgst = lineSubtotal.times(gstRate).dividedBy(200);
            totalCgst = totalCgst.plus(cgst);
            totalSgst = totalSgst.plus(sgst);
          } else {
            igst = lineSubtotal.times(gstRate).dividedBy(100);
            totalIgst = totalIgst.plus(igst);
          }

          const lineTotal = lineSubtotal.plus(cgst).plus(sgst).plus(igst);

          parsedItems.push({
            stockItemId: item.stockItemId,
            quantity: new Decimal(item.quantity),
            price: new Decimal(item.rate),
            cgstAmount: cgst,
            sgstAmount: sgst,
            igstAmount: igst,
            totalAmount: lineTotal,
          });
        }

        const grandTotal = subtotal.plus(totalCgst).plus(totalSgst).plus(totalIgst);

        // 4. Generate sequential voucher number
        const sequence = await tx.voucherSequence.findUnique({
          where: { companyId_voucherType: { companyId, voucherType } },
        });

        let nextNum = 1;
        let prefix = voucherType === 'Purchase' ? 'PUR-' : voucherType === 'Sales' ? 'SAL-' : '';
        let padding = 4;

        if (sequence) {
          nextNum = sequence.nextNumber;
          prefix = sequence.prefix || '';
          padding = sequence.padding;

          await tx.voucherSequence.update({
            where: { id: sequence.id },
            data: { nextNumber: nextNum + 1 },
          });
        } else {
          await tx.voucherSequence.create({
            data: {
              companyId,
              voucherType,
              prefix,
              nextNumber: 2,
              padding,
            },
          });
        }

        const voucherNumber = `${prefix}${String(nextNum).padStart(padding, '0')}`;

        // 5. Create Voucher
        const voucher = await tx.voucher.create({
          data: {
            companyId,
            voucherNumber,
            voucherType,
            date: new Date(date),
            referenceNumber: referenceNumber || null,
            narration: narration || null,
            totalAmount: grandTotal,
          },
        });

        // 6. Create Double Entry Voucher lines (VoucherEntry)
        const entries = [];

        if (voucherType === 'Purchase') {
          // Debit: Purchase Account (subtotal)
          entries.push({
            voucherId: voucher.id,
            ledgerId: purchaseLedgerId!,
            entryType: 'Debit',
            amount: subtotal,
          });

          // Debit: Taxes
          if (isLocal) {
            if (totalCgst.gt(0)) {
              entries.push({
                voucherId: voucher.id,
                ledgerId: cgstLedger.id,
                entryType: 'Debit',
                amount: totalCgst,
              });
            }
            if (totalSgst.gt(0)) {
              entries.push({
                voucherId: voucher.id,
                ledgerId: sgstLedger.id,
                entryType: 'Debit',
                amount: totalSgst,
              });
            }
          } else {
            if (totalIgst.gt(0)) {
              entries.push({
                voucherId: voucher.id,
                ledgerId: igstLedger.id,
                entryType: 'Debit',
                amount: totalIgst,
              });
            }
          }

          // Credit: Party Ledger (Grand Total)
          entries.push({
            voucherId: voucher.id,
            ledgerId: partyLedgerId,
            entryType: 'Credit',
            amount: grandTotal,
          });
        } else if (voucherType === 'Sales') {
          // Debit: Party Ledger (Grand Total)
          entries.push({
            voucherId: voucher.id,
            ledgerId: partyLedgerId,
            entryType: 'Debit',
            amount: grandTotal,
          });

          // Credit: Sales Account (subtotal)
          entries.push({
            voucherId: voucher.id,
            ledgerId: salesLedgerId!,
            entryType: 'Credit',
            amount: subtotal,
          });

          // Credit: Taxes
          if (isLocal) {
            if (totalCgst.gt(0)) {
              entries.push({
                voucherId: voucher.id,
                ledgerId: cgstLedger.id,
                entryType: 'Credit',
                amount: totalCgst,
              });
            }
            if (totalSgst.gt(0)) {
              entries.push({
                voucherId: voucher.id,
                ledgerId: sgstLedger.id,
                entryType: 'Credit',
                amount: totalSgst,
              });
            }
          } else {
            if (totalIgst.gt(0)) {
              entries.push({
                voucherId: voucher.id,
                ledgerId: igstLedger.id,
                entryType: 'Credit',
                amount: totalIgst,
              });
            }
          }
        }

        await tx.voucherEntry.createMany({
          data: entries,
        });

        // 7. Inventory Transactions logging & stock updates
        for (const item of parsedItems) {
          await tx.inventoryTransaction.create({
            data: {
              voucherId: voucher.id,
              stockItemId: item.stockItemId,
              transactionType: voucherType === 'Purchase' ? 'In' : 'Out',
              quantity: item.quantity,
              price: item.price,
              cgstAmount: item.cgstAmount,
              sgstAmount: item.sgstAmount,
              igstAmount: item.igstAmount,
              totalAmount: item.totalAmount,
            },
          });

          // Adjust item stock quantity
          const delta = voucherType === 'Purchase' ? item.quantity : item.quantity.negated();
          await tx.stockItem.update({
            where: { id: item.stockItemId },
            data: {
              quantity: {
                increment: delta,
              },
            },
          });
        }

        // 8. Adjust party outstanding dues/balance if it binds to a customer/supplier profile
        if (voucherType === 'Purchase' && partyLedger.supplier) {
          await tx.supplier.update({
            where: { id: partyLedger.supplier.id },
            data: {
              outstandingDues: {
                increment: grandTotal,
              },
            },
          });
        } else if (voucherType === 'Sales' && partyLedger.customer) {
          await tx.customer.update({
            where: { id: partyLedger.customer.id },
            data: {
              outstandingBalance: {
                increment: grandTotal,
              },
            },
          });
        }

        return voucher;
      });

      return res.status(201).json(result);
    } catch (err: any) {
      console.error('Create voucher error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error creating voucher' });
    }
  }

  static async deleteVoucher(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req;
      const { id } = req.params;
      if (!companyId) return res.status(400).json({ error: 'Company context required' });

      // Find the voucher first
      const voucher = await prisma.voucher.findFirst({
        where: { id, companyId },
        include: {
          entries: {
            include: {
              ledger: {
                include: {
                  supplier: true,
                  customer: true,
                },
              },
            },
          },
          inventoryTransactions: true,
        },
      });

      if (!voucher) return res.status(404).json({ error: 'Voucher not found' });

      await prisma.$transaction(async (tx) => {
        // 1. Rollback Inventory quantities
        for (const txLine of voucher.inventoryTransactions) {
          const delta = voucher.voucherType === 'Purchase' 
            ? new Decimal(txLine.quantity).negated() // Decrease inventory
            : new Decimal(txLine.quantity);         // Increase inventory

          await tx.stockItem.update({
            where: { id: txLine.stockItemId },
            data: {
              quantity: {
                increment: delta,
              },
            },
          });
        }

        // 2. Rollback Party outstanding balances
        const partyEntry = voucher.entries.find(e => 
          voucher.voucherType === 'Purchase' ? e.entryType === 'Credit' : e.entryType === 'Debit'
        );

        if (partyEntry) {
          if (voucher.voucherType === 'Purchase' && partyEntry.ledger.supplier) {
            await tx.supplier.update({
              where: { id: partyEntry.ledger.supplier.id },
              data: {
                outstandingDues: {
                  decrement: voucher.totalAmount,
                },
              },
            });
          } else if (voucher.voucherType === 'Sales' && partyEntry.ledger.customer) {
            await tx.customer.update({
              where: { id: partyEntry.ledger.customer.id },
              data: {
                outstandingBalance: {
                  decrement: voucher.totalAmount,
                },
              },
            });
          }
        }

        // 3. Delete voucher (cascades to VoucherEntry & InventoryTransaction)
        await tx.voucher.delete({
          where: { id },
        });
      });

      return res.status(200).json({ message: 'Voucher deleted successfully and balances rolled back' });
    } catch (err: any) {
      console.error('Delete voucher error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error deleting voucher' });
    }
  }
}
