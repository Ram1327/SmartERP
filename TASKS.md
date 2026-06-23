# TASKS.md - SmartERP Task Checklist

## Day 1 (Combined Original Day 1 + Day 2): Requirement Analysis + Backend Setup + Database Design

- [x] Initial workspace skeleton and Git setup
- [x] Spin up local PostgreSQL container via Docker
- [x] Configure Express.js backend project structure with TypeScript
- [x] Define full Prisma schema models
- [x] Generate initial database migrations
- [x] Implement database client and health check endpoint
- [x] Implement centralized Voucher Numbering Service
- [x] Implement accounting group seed scripts and run seed
- [x] Initialize Next.js frontend workspace
- [x] Day 1 Documentation & Status verification

## Day 2 (Combined Original Day 3 + Day 4): Authentication + Company Management

- [x] Add AI instruction files all md files(`frontend/AGENTS.md`, `frontend/CLAUDE.md`, current state.md, tasks.md, project.md, decision.md, success criteria.md) to `.gitignore` and untrack them
- [x] User Register/Login endpoints with JWT access/refresh token rotation
- [x] Protect routes using auth middleware
- [x] Implement Company creation, alteration, deletion endpoints
- [x] Company list and Company switching logic (inject active company ID into session context)
- [x] Enforce max 5 companies per user rule

## Day 3: Dashboard UI

- [ ] Set up main dashboard shell using shadcn
- [ ] Design data-dense "Gateway of SmartERP" menu structure
- [ ] Keyboard navigation for selection and screen transitions

## Day 4: Ledger Management

- [ ] Ledger creation, alteration, search, and list screens
- [ ] Automatically link/unbind ledger profiles for Customer & Supplier accounts

## Day 5: Group Management

- [ ] Account Group creation and hierarchy nesting
- [ ] Trial balance grouping layout

## Day 6: Stock Management

- [ ] Stock Groups, Stock Items, and Units of Measure management forms
- [ ] Basic stock balance queries

## Day 7: Purchase Voucher

- [ ] Purchase voucher form entry with inventory auto-increase
- [ ] Double-entry bookkeeping posting under the hood

## Day 8: Sales Voucher

- [ ] Sales voucher entry form with inventory auto-decrease
- [ ] PDF invoice layout generator

## Day 9: Billing System

- [ ] Billing view: GST Invoice, Proforma Invoice, Quotation, Estimate switcher
- [ ] PDF download & print logic integration

## Day 10: Reports Module

- [ ] Trial Balance report sheet
- [ ] Profit & Loss statement
- [ ] Balance Sheet statement
- [ ] Stock Summary & Low Stock report

## Day 11: Keyboard Shortcut System

- [ ] Add global shortcut listeners (F1, F2, ESC, CTRL+H, CTRL+K, CTRL+B, CTRL+F)
- [ ] Connect menus and forms to respective keyboard shortcuts

## Day 12: Testing & QA

- [ ] Validation auditing
- [ ] DB constraint integrity checking
- [ ] Keyboard trap resolution

## Day 13: Deployment & Walkthrough

- [ ] Environment production configs
- [ ] README writeup and deployment preparation
