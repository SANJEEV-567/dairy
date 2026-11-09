# Dr. Sanjay Kumar Dairy — Milk Management & Billing System

A responsive, production-ready Milk Business Management and Monthly Billing web application designed specifically for the dairy seller **Dr. Sanjay Kumar Dairy**.

Built strictly to real-world business requirements with **zero fake/demo sample data**, persistent browser storage, and exact financial calculations.

---

## 🌟 Key Features & Workflow

### 1. Customer Directory & Management
- **Add Customers Once**: Name, optional phone & address, preferred usual daily milk quantity (in kg, supports decimals e.g., 1.5 kg, 0.75 kg), usual price per kg (in ₹), notes, and active/inactive status.
- **Fast Daily Defaults**: Usual quantity and price serve as quick daily defaults. Updating a customer's usual settings **never alters past deliveries or existing bills**.
- **Safe Deactivation**: Inactive customers are hidden from the daily entry sheet while keeping their complete transaction ledger and billing history fully intact.

### 2. Daily Milk Recording
- **Quick Daily Entry Sheet**: Displays all active customers for any selected date (Asia/Kolkata timezone).
- **Auto Calculation**: `Daily charge = quantity delivered in kg × price per kg`.
- **Zero Delivery Handling**: One-click "0 kg / No Delivery" logs absent days with ₹0 charge without errors.
- **Strict Units**: Always measured in **kg** and **₹/kg** (no silent conversions to liters).
- **Instant Updates**: Customer balances and daily dashboard totals update immediately without page refresh.
- **Batch Helper**: "Save All Pending Entries" allows one-click morning recording for all active buyers.

### 3. Customer Transaction Ledger
- Complete chronological transaction history per customer:
  - Milk Deliveries (Debit): Date, time, quantity in kg, price per kg, daily charge
  - Payments Received (Credit): Date, time, amount, method (Cash, UPI/GPay/PhonePe, Bank Transfer, Cheque), reference note
  - Balance Adjustments: Debits (extra charges/bottle deposits) or Credits (waivers/discounts)
  - **Running Balance**: Accurately calculated after every single transaction:
    $$\text{Running Balance} = \text{Previous Balance} + \text{Delivery Charges} + \text{Adjustments} - \text{Payments Received}$$
- Filter transactions by Month, Date Range, or Transaction Type.
- Edit and delete any entry with safety confirmation modals.

### 4. Monthly Bill Generation & Invoices
- Generate separate, detailed monthly bills for each customer for any month (e.g. November 2026).
- **Bill Contents**:
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
  - 🖨️ **Print Invoice**: Crisp printer stylesheet (`@media print`) hides web controls and formats an official receipt.
  - 📲 **WhatsApp Share**: Pre-fills a formatted bilingual summary directly to the customer's phone number.
  - 💳 **Pay Bill**: Pre-fills the remaining balance due for instant settlement.
  - ✏️ **Status Override**: Correct mistaken statuses back to Due or record explicit notes without masking the actual amount due.

### 5. Payments & Collections Log
- Audit log of all cash, UPI, bank transfer, and cheque collections.
- Filter by payment method, customer, or date.
- Auto-fill "Full Due Amount" button for single-click payment recording.

### 6. Operations Dashboard
- Real-time KPI summary for any selected date:
  - Total Milk Delivered (in kg)
  - Milk Sales Value (in ₹)
  - Payments Received (in ₹)
  - Total Current Due across all active customers (in ₹)
- Customer-by-customer status table (Delivered, Absent/0kg, Pending).

### 7. Reliable Offline Storage & Backups
- Stored locally in the browser's persistent storage.
- Download a full `.json` backup file anytime.
- Restore from backup on any smartphone, tablet, or PC.

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

## 📋 Technology Stack
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS with custom print media styles
- **Icons**: Lucide React
- **Timezone**: Asia/Kolkata (`en-IN` number and currency formatting)
