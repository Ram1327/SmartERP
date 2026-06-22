import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedCompanyGroups(tx: any, companyId: string) {
  // 1. Primary Groups
  const primaryGroups = [
    { name: 'Assets', primaryGroup: 'Assets' },
    { name: 'Liabilities', primaryGroup: 'Liabilities' },
    { name: 'Income', primaryGroup: 'Income' },
    { name: 'Expenses', primaryGroup: 'Expenses' },
  ];

  const createdPrimaries: Record<string, any> = {};

  for (const g of primaryGroups) {
    createdPrimaries[g.name] = await tx.group.upsert({
      where: {
        companyId_name: {
          companyId,
          name: g.name,
        },
      },
      update: {},
      create: {
        companyId,
        name: g.name,
        primaryGroup: g.primaryGroup,
      },
    });
  }

  // 2. Sub-Groups
  const subGroups = [
    // Under Assets
    { name: 'Current Assets', parentName: 'Assets', primaryGroup: 'Assets' },
    { name: 'Fixed Assets', parentName: 'Assets', primaryGroup: 'Assets' },
    // Under Liabilities
    { name: 'Capital Account', parentName: 'Liabilities', primaryGroup: 'Liabilities' },
    { name: 'Current Liabilities', parentName: 'Liabilities', primaryGroup: 'Liabilities' },
    // Under Income
    { name: 'Direct Incomes', parentName: 'Income', primaryGroup: 'Income' },
    { name: 'Indirect Incomes', parentName: 'Income', primaryGroup: 'Income' },
    // Under Expenses
    { name: 'Direct Expenses', parentName: 'Expenses', primaryGroup: 'Expenses' },
    { name: 'Indirect Expenses', parentName: 'Expenses', primaryGroup: 'Expenses' },
  ];

  const createdSubs: Record<string, any> = {};

  for (const sg of subGroups) {
    const parent = createdPrimaries[sg.parentName];
    createdSubs[sg.name] = await tx.group.upsert({
      where: {
        companyId_name: {
          companyId,
          name: sg.name,
        },
      },
      update: {
        parentId: parent.id,
      },
      create: {
        companyId,
        name: sg.name,
        primaryGroup: sg.primaryGroup,
        parentId: parent.id,
      },
    });
  }

  // 3. Second-level Sub-Groups
  const deepGroups = [
    // Under Current Assets
    { name: 'Bank Accounts', parentName: 'Current Assets', primaryGroup: 'Assets' },
    { name: 'Cash-in-hand', parentName: 'Current Assets', primaryGroup: 'Assets' },
    { name: 'Sundry Debtors', parentName: 'Current Assets', primaryGroup: 'Assets' },
    { name: 'Stock-in-hand', parentName: 'Current Assets', primaryGroup: 'Assets' },
    // Under Current Liabilities
    { name: 'Sundry Creditors', parentName: 'Current Liabilities', primaryGroup: 'Liabilities' },
    { name: 'Duties & Taxes', parentName: 'Current Liabilities', primaryGroup: 'Liabilities' },
  ];

  const createdDeeps: Record<string, any> = {};

  for (const dg of deepGroups) {
    const parent = createdSubs[dg.parentName];
    createdDeeps[dg.name] = await tx.group.upsert({
      where: {
        companyId_name: {
          companyId,
          name: dg.name,
        },
      },
      update: {
        parentId: parent.id,
      },
      create: {
        companyId,
        name: dg.name,
        primaryGroup: dg.primaryGroup,
        parentId: parent.id,
      },
    });
  }

  return {
    ...createdPrimaries,
    ...createdSubs,
    ...createdDeeps,
  };
}

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const email = 'admin@smarterp.com';
  const passwordHash = await bcrypt.hash('admin123', 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash,
    },
  });

  console.log(`User created/updated: ${user.email}`);

  // Create demo company
  const companyName = 'Acme Corporation';
  const company = await prisma.company.upsert({
    where: {
      id: 'acme-corp-demo-id-1327', // Fix ID to make seeding idempotent
    },
    update: {
      userId: user.id,
      name: companyName,
      address: '123 Business Park, Sector 5, Kolkata',
      gstNumber: '19AAAAA1111A1Z1',
      financialYearStart: new Date('2026-04-01'),
      state: 'West Bengal',
      contactInfo: '+91 9876543210',
    },
    create: {
      id: 'acme-corp-demo-id-1327',
      userId: user.id,
      name: companyName,
      address: '123 Business Park, Sector 5, Kolkata',
      gstNumber: '19AAAAA1111A1Z1',
      financialYearStart: new Date('2026-04-01'),
      state: 'West Bengal',
      contactInfo: '+91 9876543210',
    },
  });

  console.log(`Company created/updated: ${company.name}`);

  // Seed company groups
  const groups = await seedCompanyGroups(prisma, company.id);
  console.log('Accounting groups seeded.');

  // Seed default ledgers
  const defaultLedgers = [
    { name: 'Cash', type: 'Cash', groupName: 'Cash-in-hand', openingBalance: 10000.00 },
    { name: 'State Bank of India', type: 'Bank', groupName: 'Bank Accounts', openingBalance: 50000.00 },
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

    await prisma.ledger.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: ledger.name,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        groupId: group.id,
        name: ledger.name,
        type: ledger.type,
        openingBalance: ledger.openingBalance,
        currentBalance: ledger.openingBalance,
      },
    });
  }

  console.log('Default Ledgers seeded.');
  console.log('Database seeding completed successfully.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
