# DECISIONS.md - Engineering Decision Log

## 2026-06-22: Monorepo Setup with npm Workspaces
* **Decision**: Adopt a monorepo setup using npm workspaces with two folders (`/frontend` and `/backend`).
* **Reason**: Speeds up concurrent local development, coordinates scripts, makes TypeScript models sharing straightforward, and simplifies dependency tracking.
* **Impact**: Developers can launch the entire stack using `npm run dev` from the root directory.

## 2026-06-22: Choose Prisma ORM for database operations
* **Decision**: Use Prisma ORM to interact with PostgreSQL.
* **Reason**: Prisma provides an expressive schema definition file, automated migrations, type safety, and clean API queries. This allows us to focus on database relationships rather than writing verbose SQL strings.
* **Impact**: Automatic TypeScript types will be available in the backend for all database tables (Ledgers, Vouchers, StockItems, etc.).

## 2026-06-22: Auto-Create Ledgers for Customers and Suppliers
* **Decision**: Ensure that when a Customer or Supplier is created, a matching general Ledger is automatically generated.
* **Reason**: This keeps database structures decoupled but guarantees double-entry posting integrity under Tally's accounting model.
* **Impact**: Customer records bind to a Ledger under `Sundry Debtors` assets, and Supplier records bind to a Ledger under `Sundry Creditors` liabilities.
