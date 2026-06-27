# SUCCESS_CRITERIA.md - Verification Metrics

## Day 1 Setup & Database Architecture Metrics
* [x] **Workspaces Connected**: Npm workspaces configured for `backend` and `frontend`.
* [x] **PostgreSQL Connected**: Local PostgreSQL container running and responsive.
* [x] **Prisma Generated**: DB Schema defined and generated in Prisma client.
* [x] **Database Migrated**: Initial DB migration applied successfully with all tables.
* [x] **Data Seeded**: Initial primary accounting groups (Assets, Liabilities, Income, Expenses) populated in database.
* [x] **Backend Up**: Express.js server running in TypeScript, accessible on port 5000, and returns `{"status": "ok"}` at `/api/health`.
* [x] **Voucher Sequence Generator Working**: A backend module generates auto-incremented voucher numbers with customizable prefix/padding.
* [x] **Frontend Initialized**: Next.js typescript skeleton generated.

## Day 2 Auth & Company Management Metrics
* [x] **Registration & Login**: User registration and login flow functional with hashed password checking.
* [x] **JWT Verification**: Auth middleware verifies access tokens and blocks unauthorized requests.
* [x] **Active Company context**: API endpoints verify company access and link operations via `x-company-id` header.
* [x] **Company CRUD**: Full CRUD endpoints for company management functional.
* [x] **Company Limit Enforcement**: Logic blocks company creation when count reaches 5.
* [x] **Ledger Seeding**: Seeding chart of accounts and default ledgers is transactionally executed upon company creation.

## Day 4 Ledger Management Metrics
* [x] **Ledger Creation & Selection**: Create ledgers under specified accounting groups (e.g. Indirect Expenses) with default values.
* [x] **Customer/Supplier Binding**: Transactionally create corresponding metadata in Customer/Supplier tables when creating Customer/Supplier type ledgers.
* [x] **Ledger Listing & Keyboard Navigation**: Fetch all company ledgers, support arrow-key list scrolling and quick name filtering.
* [x] **Alteration Sync**: Update ledger and customer/supplier details in a unified transaction, verifying name changes propagate properly.

