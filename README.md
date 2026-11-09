# Dr. Sanjay Kumar Dairy — Milk Management & Billing System

A responsive, production-ready Milk Business Management and Monthly Billing web application designed specifically for the dairy seller **Dr. Sanjay Kumar Dairy** and their **Milk Customers**.

Built strictly to real-world business requirements with **account-scoped persistent storage, real role-based authentication (Seller & Customer), email/password login, Google OAuth, password recovery, and exact financial calculations**.

---

## 🔐 Real Authentication Architecture (Seller & Customer)

Authentication is powered by a real identity provider (Supabase Auth) with client-side verification gates and database Row-Level Security (RLS). **No plaintext passwords or browser-stored credentials exist.**

### 1. Seller Portal (Dairy Owner)
- **Email & Password Login & Registration**: Dairy owners register and log in with their official email and secure password. Passwords are never stored in plaintext and are securely hashed and authenticated via Supabase.
- **Continue with Google**: Direct Google OAuth identity provider integration.
- **Password Reset**: "Forgot password?" sends real reset instructions to the registered email with token verification.
- **Capabilities**:
  - Full daily operations dashboard & metrics
  - Quick daily milk entry sheet (batch logging, 0 kg absent handling)
  - Customer directory & rate configuration
  - Chronological transaction ledgers with running balance
  - Monthly billing, printable invoices, and WhatsApp share
  - Payment collections log (cash, UPI, cheques, bank transfers)
  - Data backup & restore (JSON export/import)

### 2. Customer Portal (Milk Buyer)
- **Email & Password Sign Up & Login**: Customers register with their full name, email, password, phone, delivery address, and preferred daily milk quantity in kg.
- **Continue with Google**: Secure Google OAuth authentication.
- **Capabilities**:
  - Live account balance (Amount Due or Advance Credit)
  - Daily milk delivery log (date, time, kg, rate, daily charge)
  - Monthly bills with itemized delivery line-items & printable invoice
  - Transaction ledger statement with running balance
  - Online UPI payment assistant (scan QR code, pre-filled amount, and submit UTR reference)

---

## 🛡️ Security, Access Control & Data Isolation

1. **Authentication Gate**: Sign-in is strictly required before accessing any customer, delivery, payment, ledger, or bill data.
2. **Account Scoping**: Data is scoped per dairy account (`dairy_id`). Users can only access records associated with their authenticated account.
3. **Database RLS Policies**: Defined in `supabase-schema.sql` ensuring database-enforced row isolation for `profiles`, `customers`, `deliveries`, `payments`, and `adjustments`.
4. **Safe Data Migration**: Any unassigned legacy local records are seamlessly migrated to the authenticated account upon first login, ensuring zero data loss.
5. **Real Error Handling & Verification**: Invalid credentials, unverified emails, weak passwords, and unconfigured backends are caught and displayed clearly with readable error alerts.

---

## 🌟 Core Business Features

### 1. Customer Directory & Management
- **Add Customers Once**: Name, phone, address, preferred usual milk quantity (kg), usual price per kg (₹), status (`Active` / `Inactive`), and initial opening balance (Due or Advance Credit).
- **Fast Daily Defaults**: Usual settings make daily entry instantaneous. Updating them **never alters past deliveries or existing bills**.
- **Safe Deactivation**: Inactive customers are hidden from the daily entry sheet while keeping their complete transaction ledger and billing history fully intact.

### 2. Daily Milk Recording
- **Quick Entry Screen**: Displays all active customers for any selected date (`Asia/Kolkata` timezone).
- **Auto Calculation**:
  $$\text{Daily Charge} = \text{Quantity (kg)} \times \text{Rate (₹/kg)}$$
- **Zero Delivery Handling**: One-click "0 kg / Absent" records no milk with ₹0 charge.
- **Strict Units**: Always measured in **kg** and **₹/kg** (no silent conversions to liters).
- **Immediate Balance Update**: Updates customer running balance and daily totals without page reload.
- **Batch Helper**: "Save All Pending Entries" allows one-click morning recording for all active buyers.

### 3. Customer Transaction Ledger
- Complete chronological transaction history per customer:
  - Milk Deliveries (Debit): Date, time, quantity in kg, price per kg, daily charge
  - Payments Received (Credit): Date, time, amount, method, reference note
  - Balance Adjustments: Debits (extra charges/bottle deposits) or Credits (waivers/discounts)
  - **Running Balance**: Accurately calculated after every single transaction:
    $$\text{Running Balance} = \text{Previous Balance} + \text{Delivery Charges} + \text{Adjustments} - \text{Payments Received}$$
- Filter transactions by Month, Date Range, or Transaction Type.
- Toggle between **Oldest First (Statement View)** and **Newest First (Recent Activity)**.

### 4. Monthly Bill Generation & Invoices
- Generate separate, detailed monthly bills for each customer for any month (e.g. November 2026).
- **Bill Information**:
  - Dairy Name: **Dr. Sanjay Kumar Dairy**
  - Customer contact details & billing period
  - Itemized daily milk delivery line-items (date, time, kg, rate, charge)
  - Total milk delivered in kg
  - Total milk charges for the month in ₹
  - Previous outstanding balance (unpaid balance prior to month)
  - Payments received during the month
  - **Final Amount Due**
  - Payment Status: `Paid`, `Partially Paid`, or `Due`
- **Actions**:
  - 🖨️ **Print Invoice**: Dedicated print layout (`@media print`) that removes browser controls and formats an official receipt.
  - 📲 **WhatsApp Share**: Pre-fills a formatted bilingual summary directly to the customer's phone number.
  - 💳 **Pay Bill**: Pre-fills the remaining balance due for instant settlement.
  - ✏️ **Status Override**: Correct mistaken statuses back to Due or record explicit notes without masking the actual amount due.

---

## 🚀 Setup and Configuration

### Connecting Supabase Authentication

1. Create a free project at [Supabase](https://supabase.com).
2. Copy your Project URL and public `anon` key from **Settings > API**.
3. Run the SQL script `supabase-schema.sql` in the **SQL Editor** of your Supabase dashboard to set up tables and Row-Level Security policies.
4. Configure in one of two easy ways:
   - **Method A (Environment Variables)**:
     Create a `.env` file in the project root:
     ```env
     VITE_SUPABASE_URL=https://your-project-id.supabase.co
     VITE_SUPABASE_ANON_KEY=your-supabase-public-anon-key
     ```
   - **Method B (In-App Assistant)**:
     Launch the app and click **"Configure Backend"** on the login screen. Enter your Project URL and Anon Key and click **"Save & Connect"**. The app tests connection immediately!

---

## 💻 How to Run Locally

### Prerequisites
- Node.js (v18+)
- npm

### Development Mode
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run Verification Tests
```bash
npm test
```
Runs the 16 automated tests covering calculations, rounding, ledger chronology, monthly billing, balance formulas, date arithmetic, account scoping, and authentication security gates.

### Production Build
```bash
npm run build
```
Creates an optimized static production build in `dist/`.
