# PROJECT.md - SmartERP

## Project Vision
SmartERP is a web-based, keyboard-first Billing, Inventory, and Accounting Management System inspired by the efficiency and speed of Tally, built with modern web technologies. 

It targets accountants, small-to-medium business operators, and distributors who require high-speed data entry, clean accounting ledgers, stock management, and invoice billing without mouse latency.

---

## Tech Stack
* **Frontend**: Next.js (App Router, React 19, TypeScript), Tailwind CSS, ShadCN UI, TanStack Table, React Hook Form, Zustand
* **Backend**: Node.js, Express.js, TypeScript, Zod (validation)
* **Database**: PostgreSQL (Prisma ORM / Supabase Postgres)
* **Authentication**: JWT authentication with Access/Refresh tokens
* **PDF & Reports**: PDFKit for invoice printing, ExcelJS/CSV utility for spreadsheet exports

---

## High-Level Architecture
The project is set up as a monorepo using npm workspaces:
* `/frontend`: Next.js SPA/App dealing with dashboard UI, company selectors, ledger screens, voucher entries, billing forms, and reports.
* `/backend`: Express.js REST API server handling user authentication, company management, double-entry voucher posts, stock calculation, invoice numbers, and report generation.

---

## Key Features & Modules
1. **Authentication**: Secure registration, login, and token management.
2. **Company Management**: Select, create, alter, and switch between companies (max 5 per user).
3. **Ledger Management**: Group-based charts of accounts (Assets, Liabilities, Income, Expenses) with customer/supplier ledger bindings.
4. **Stock Management**: Stock groups, units of measure, items, purchase price, selling price, and real-time quantities.
5. **Voucher Management**: Keyboard-centric screens for Contra, Payment, Receipt, Journal, Purchase, and Sales.
6. **Voucher Auto-Numbering**: Centralized sequence service per voucher type.
7. **Billing System**: GST invoices, proforma invoices, quotations, estimates with PDF export/print.
8. **Reports Module**: Trial Balance, Profit & Loss, Balance Sheet, Stock Summary, and GST Register.
9. **Keyboard Navigation**: Complete mouse-free experience with shortcuts (F1-F10, ESC, Control and Alt keys).

---

## Folder Structure
```
/SmartERP
  ├── /frontend              # Next.js Application
  ├── /backend               # Express.js Application
  │     ├── /prisma          # Database schema and migrations
  │     └── /src
  │           ├── /config    # DB, CORS, environment configs
  │           ├── /controllers
  │           ├── /middleware
  │           ├── /routes
  │           ├── /services  # Voucher numbering, auth, ledger balance services
  │           ├── /utils
  │           └── app.ts
  ├── package.json           # Root workspace script setup
  ├── PROJECT.md             # Project vision & tech stack
  ├── CURRENT_STATE.md       # Current progress & next actions
  ├── TASKS.md               # Day-by-day task checklist
  ├── DECISIONS.md           # Engineering decision log
  └── SUCCESS_CRITERIA.md    # Quality checkpoints
```

---

## Constraints & Rules
* Strict keyboard-driven flows.
* Neutral, data-dense, enterprise-grade ShadCN UI styling (No flashy animations or glassmorphism).
* Under 2 seconds load time, fully responsive, and zero console errors.
