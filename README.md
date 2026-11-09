# Dr. Sanjay Kumar Dairy — Milk Management & Billing System

A responsive, production-ready Milk Business Management and Monthly Billing web application designed specifically for the dairy seller **Dr. Sanjay Kumar Dairy** and their **Milk Customers**.

Built strictly to real-world business requirements with **persistent storage, role-based authentication (Seller & Customer), email/password login, Google sign-in, and exact financial calculations**.

---

## 🔐 Authentication System (Seller & Customer)

The application provides dual login and registration options:

### 1. Seller Portal (Dairy Owner)
- **Email & Password Login**: Pre-seeded with `drsanjay@dairy.com` / `dairy123` (or register a custom seller account).
- **Continue with Google**: One-click Google sign-in with Dr. Sanjay Kumar profile or any custom Google account.
- **Capabilities**:
  - Full daily operations dashboard & metrics
  - Quick daily milk entry sheet (batch logging, 0 kg absent handling)
  - Customer directory & rate configuration
  - Chronological transaction ledgers with running balance
  - Monthly billing, printable invoices, and WhatsApp share
  - Payment collections log (cash, UPI, cheques, bank transfers)
  - Data backup & restore (JSON export/import)

### 2. Customer Portal (Milk Buyer)
- **Email & Password Login / Register**: Quick sign up with name, email, password, phone, delivery address, and preferred daily milk quantity in kg. Automatically links or creates an active record in the dairy's customer directory!
- **Continue with Google**: Instant Google sign-in.
- **Capabilities**:
  - Live account balance (Amount Due or Advance Credit)
  - Daily milk delivery log (date, time, kg, rate, daily charge)
  - Monthly bills with itemized delivery line-items & printable invoice
  - Transaction ledger statement with running balance
  - Online UPI payment assistant (scan QR code for `drsanjay.dairy@upi`, pre-filled amount, and submit UTR reference)

---

## 🌟 Core Business Features

### 1. Customer Directory & Management
- **Add Customers Once**: Name, phone, address, preferred usual milk quantity (kg), usual price per kg (₹), status (`Active` / `Inactive`), and initial opening balance (Due or Advance Credit).
- **Fast Daily Defaults**: Usual settings make daily entry instantaneous. Updating them **never alters past deliveries or existing bills**.
- **Safe Deactivation**: Inactive customers are hidden from the daily entry sheet while keeping their complete transaction ledger and billing history fully intact.

### 2. Daily Milk Recording
- **Quick Entry Screen**: Displays all active customers for any selected date (Asia/Kolkata timezone).
- **Auto Calculation**: $\text{Daily Charge} = \text{Quantity (kg)} \times \text{Rate (₹/kg)}$.
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

## 🚀 How to Run Locally

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

### Production Build
```bash
npm run build
```

---

## 🔑 Quick Login Credentials (for testing)

- **Seller Login**:
  - Email: `drsanjay@dairy.com`
  - Password: `dairy123`
  - Or click **"Continue with Google"** $\rightarrow$ select Dr. Sanjay Kumar.
- **Customer Login**:
  - Switch tab to **Customer Login**
  - Email: `ramesh.sharma@gmail.com`
  - Password: `customer123`
  - Or click **"Continue with Google"** $\rightarrow$ select any Google account.
  - Or click **"Create Account"** to sign up as a new customer.
