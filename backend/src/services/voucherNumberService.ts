import prisma from '../config/db.js';

export class VoucherNumberService {
  /**
   * Generates the next sequential voucher number for a given company and voucher type.
   * Updates the sequence counter in the database.
   */
  static async generateNextNumber(companyId: string, voucherType: string): Promise<string> {
    return await prisma.$transaction(async (tx) => {
      // Find or create sequence configuration
      let sequence = await tx.voucherSequence.findUnique({
        where: {
          companyId_voucherType: {
            companyId,
            voucherType,
          },
        },
      });

      if (!sequence) {
        // Define default prefixes for each type
        let prefix = '';
        switch (voucherType) {
          case 'Receipt':
            prefix = 'RCP-';
            break;
          case 'Payment':
            prefix = 'PAY-';
            break;
          case 'Contra':
            prefix = 'CON-';
            break;
          case 'Journal':
            prefix = 'JRN-';
            break;
          case 'Purchase':
            prefix = 'PUR-';
            break;
          case 'Sales':
            prefix = 'SAL-';
            break;
          case 'CreditNote':
            prefix = 'CRN-';
            break;
          case 'DebitNote':
            prefix = 'DBN-';
            break;
          default:
            prefix = 'VOU-';
        }

        sequence = await tx.voucherSequence.create({
          data: {
            companyId,
            voucherType,
            prefix,
            nextNumber: 1,
            padding: 4,
          },
        });
      }

      const currentNum = sequence.nextNumber;
      const prefix = sequence.prefix || '';
      const suffix = sequence.suffix || '';
      const padding = sequence.padding;

      // Format voucher number, e.g., SAL-0001
      const formattedNum = `${prefix}${currentNum.toString().padStart(padding, '0')}${suffix}`;

      // Increment next number
      await tx.voucherSequence.update({
        where: {
          id: sequence.id,
        },
        data: {
          nextNumber: currentNum + 1,
        },
      });

      return formattedNum;
    });
  }

  /**
   * Gets the current sequence state for viewing purposes without incrementing it.
   */
  static async previewNextNumber(companyId: string, voucherType: string): Promise<string> {
    const sequence = await prisma.voucherSequence.findUnique({
      where: {
        companyId_voucherType: {
          companyId,
          voucherType,
        },
      },
    });

    if (!sequence) {
      // Return preview of first number
      let prefix = '';
      switch (voucherType) {
        case 'Receipt': prefix = 'RCP-'; break;
        case 'Payment': prefix = 'PAY-'; break;
        case 'Contra': prefix = 'CON-'; break;
        case 'Journal': prefix = 'JRN-'; break;
        case 'Purchase': prefix = 'PUR-'; break;
        case 'Sales': prefix = 'SAL-'; break;
        case 'CreditNote': prefix = 'CRN-'; break;
        case 'DebitNote': prefix = 'DBN-'; break;
        default: prefix = 'VOU-';
      }
      return `${prefix}${'1'.padStart(4, '0')}`;
    }

    const currentNum = sequence.nextNumber;
    const prefix = sequence.prefix || '';
    const suffix = sequence.suffix || '';
    const padding = sequence.padding;

    return `${prefix}${currentNum.toString().padStart(padding, '0')}${suffix}`;
  }
}
