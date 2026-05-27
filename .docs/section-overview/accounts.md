# Financial Accounts & Ledger Section Overview

The Financial Accounts & Ledger section provides a double-entry bookkeeping system for tracking organization income, expenses, bank accounts, and transactions.

---

## Key Features

### 1. Financial Dashboard
*   **Balance Summaries:** Tracks total assets and current balances across Cash, Bank, and Digital Wallet accounts.
*   **Income vs Expense charts:** Visualizes cash flow over time to analyze organizational profitability.

### 2. Account Directory
*   **Multiple Account Types:** Supports configuring different account ledgers:
    *   `Cash` / Petty Cash
    *   `Bank` (with IFSC and Account Number fields)
    *   `Digital Wallet`
*   **Account Controls:** Allows adding new accounts, inputting opening balances, and toggling active/inactive status.

### 3. Transaction Registry
*   **Ledger Table:** Lists all financial transactions with transaction type, account, amount, date, description, category, and reference number.
*   **Income & Expense Log:** Modals to enter income/expense details (Amount, Date, Account, Category, Description, and Reference Number).
*   **Receipt Uploads:** Allows dragging and dropping receipts/invoices as attachments linked directly to the transaction.
*   **Void Transaction:** Permitted administrators can void transactions, which reverses the account balance adjustments and logs a void status for audit compliance.

### 4. Categories Customizer
*   **Expense & Income Categories:** Create custom categories (e.g., Salary, Rent, Student Fees).
*   **Visual Customizer:** Assign custom colors and icons (Lucide icon library) to categories to make transaction lists readable.

### 5. Fund Transfers
*   **Transfer Modals:** Log fund movements from one internal account to another (e.g., withdrawing cash from the Bank account into the Petty Cash ledger).
*   **Double Entry Adjustment:** Automatically deducts from the origin account and credits the destination account in a single transaction block.

### 6. Reports Generator
*   **Custom Date Range Reports:** Generate income vs expense reports within user-defined date limits.
*   **Category-wise Breakdown:** Renders a breakdown showing where funds were spent or earned, helping with budgeting and tax computations.
