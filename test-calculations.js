// In-memory localStorage polyfill for Node.js test environment
const memStore = {};
globalThis.localStorage = {
  getItem: (k) => memStore[k] || null,
  setItem: (k, v) => { memStore[k] = String(v); },
  removeItem: (k) => { delete memStore[k]; },
  clear: () => { Object.keys(memStore).forEach(k => delete memStore[k]); }
};

import assert from 'node:assert';
import { 
  roundToTwo, 
  formatINR, 
  formatKg, 
  getTodayKolkata, 
  formatMonthYear,
  addDays 
} from './src/utils/formatters.js';
import { 
  calculateCustomerLedger, 
  getCustomerBalance, 
  generateMonthlyBill, 
  getDailyDashboardMetrics 
} from './src/utils/calculations.js';
import { BILL_STATUS } from './src/utils/constants.js';
import { 
  loginWithEmail, 
  registerAccount, 
  loginWithGoogleAuth, 
  logout, 
  getCurrentUser 
} from './src/utils/auth.js';

console.log("Starting verification test suite for Dr. Sanjay Kumar Dairy...");

// Test 1: Daily delivery charge formula: quantity in kg * price per kg
const qty1 = 1.5;
const rate1 = 60;
const charge1 = roundToTwo(qty1 * rate1);
assert.strictEqual(charge1, 90.00, "1.5 kg @ ₹60 must equal ₹90.00");

// Test 2: Zero delivery adds ₹0 charge
const qtyZero = 0;
const chargeZero = roundToTwo(qtyZero * rate1);
assert.strictEqual(chargeZero, 0, "0 kg delivery must add ₹0 charge");

// Test 3: Decimal kg calculation
const qtyDecimal = 2.25;
const rateDecimal = 64;
const chargeDecimal = roundToTwo(qtyDecimal * rateDecimal);
assert.strictEqual(chargeDecimal, 144.00, "2.25 kg @ ₹64 must equal ₹144.00");

// Test 4: Running ledger calculation
const testCustomerId = "cust_test_1";
const deliveries = [
  { id: "d1", customerId: testCustomerId, date: "2026-11-01", time: "06:30", quantityKg: 1.5, pricePerKg: 60, charge: 90 },
  { id: "d2", customerId: testCustomerId, date: "2026-11-02", time: "06:30", quantityKg: 2.0, pricePerKg: 60, charge: 120 },
  { id: "d3", customerId: testCustomerId, date: "2026-11-03", time: "06:30", quantityKg: 0, pricePerKg: 60, charge: 0 },
  { id: "d4", customerId: testCustomerId, date: "2026-11-04", time: "06:30", quantityKg: 1.5, pricePerKg: 60, charge: 90 }
];

const payments = [
  { id: "p1", customerId: testCustomerId, date: "2026-11-02", time: "18:00", amount: 100, paymentMethod: "UPI" }
];

const adjustments = [
  { id: "a1", customerId: testCustomerId, date: "2026-11-01", time: "00:00", type: "debit", amount: 50, reason: "Opening balance" }
];

// Balance formula: Previous balance + delivery charges + adjustments - payments received
// Expected balance = 50 (adj) + 90 (d1) + 120 (d2) - 100 (p1) + 0 (d3) + 90 (d4) = 250
const balance = getCustomerBalance(testCustomerId, deliveries, payments, adjustments);
assert.strictEqual(balance, 250, "Calculated customer balance must be ₹250");

// Test 5: Ledger chronological order and running balances
const ledger = calculateCustomerLedger(testCustomerId, deliveries, payments, adjustments);
assert.strictEqual(ledger.currentBalance, 250, "Ledger final balance must match ₹250");
assert.strictEqual(ledger.transactions.length, 6, "Must contain all 6 transactions");

// Test 6: Monthly Bill Generation for November 2026
const customerObj = {
  id: testCustomerId,
  name: "Ramesh Test",
  phone: "9876543210",
  address: "Test Address",
  usualQuantityKg: 1.5,
  usualPricePerKg: 60,
  status: "active"
};

const bill = generateMonthlyBill(customerObj, "2026-11", deliveries, payments, adjustments, []);
assert.strictEqual(bill.totalKg, 5.0, "Total kg in November must be 1.5 + 2.0 + 0 + 1.5 = 5.0 kg");
assert.strictEqual(bill.totalMilkCharges, 300, "Total charges in November must be 90 + 120 + 0 + 90 = 300");
assert.strictEqual(bill.totalPaymentsInMonth, 100, "Payments in month must be 100");
assert.strictEqual(bill.finalAmountDue, 250, "Final amount due in bill must be 250");
assert.strictEqual(bill.status, BILL_STATUS.PARTIALLY_PAID, "Status must be Partially Paid because 100 was paid out of 350");

// Test 7: Bill paid when payments equal or exceed amount due
const fullPayments = [
  { id: "p1", customerId: testCustomerId, date: "2026-11-02", time: "18:00", amount: 100, paymentMethod: "UPI" },
  { id: "p2", customerId: testCustomerId, date: "2026-11-30", time: "19:00", amount: 250, paymentMethod: "Cash" }
];
const paidBill = generateMonthlyBill(customerObj, "2026-11", deliveries, fullPayments, adjustments, []);
assert.strictEqual(paidBill.finalAmountDue, 0, "Final amount due after full payment must be 0");
assert.strictEqual(paidBill.status, BILL_STATUS.PAID, "Status must be Paid when balance <= 0");

// Test 8: Manual status override keeps actual amount due visible
const overrides = [
  { customerId: testCustomerId, month: "2026-11", status: BILL_STATUS.PAID, reason: "Settled via barter" }
];
const overriddenBill = generateMonthlyBill(customerObj, "2026-11", deliveries, payments, adjustments, overrides);
assert.strictEqual(overriddenBill.status, BILL_STATUS.PAID, "Status must reflect override");
assert.strictEqual(overriddenBill.finalAmountDue, 250, "Actual amount due must stay 250 even if overridden to Paid");
assert.strictEqual(overriddenBill.isOverridden, true, "Must flag isOverridden as true");

// Test 9: Daily Dashboard Metrics
const dashboard = getDailyDashboardMetrics(
  "2026-11-01",
  [customerObj],
  deliveries,
  payments,
  adjustments
);
assert.strictEqual(dashboard.totalMilkDeliveredTodayKg, 1.5, "Nov 1 milk delivered must be 1.5 kg");
assert.strictEqual(dashboard.totalChargesToday, 90, "Nov 1 charges must be ₹90");
assert.strictEqual(dashboard.paymentsReceivedToday, 0, "Nov 1 payments must be ₹0");

// Test 10: addDays date navigation helper
assert.strictEqual(addDays("2026-11-09", -1), "2026-11-08", "Nov 9 - 1 day must be Nov 8");
assert.strictEqual(addDays("2026-11-09", 1), "2026-11-10", "Nov 9 + 1 day must be Nov 10");
assert.strictEqual(addDays("2026-12-31", 1), "2027-01-01", "Dec 31 + 1 day must cross year to Jan 1");
assert.strictEqual(addDays("2026-03-01", -1), "2026-02-28", "Mar 1 - 1 day in non-leap year must be Feb 28");

// Test 11: Advance payment credit status resolution
const advanceCust = { id: "cust_adv", name: "Advance Customer", usualQuantityKg: 1, usualPricePerKg: 50 };
const advDeliveries = [{ id: "ad1", customerId: "cust_adv", date: "2026-11-05", time: "06:00", quantityKg: 2, pricePerKg: 50, charge: 100 }];
const advAdjustments = [{ id: "aa1", customerId: "cust_adv", date: "2026-10-31", time: "00:00", type: "credit", amount: 40, reason: "October Advance Credit" }];
const advBill = generateMonthlyBill(advanceCust, "2026-11", advDeliveries, [], advAdjustments, []);
assert.strictEqual(advBill.previousOutstandingBalance, -40, "Previous advance credit must be -40");
assert.strictEqual(advBill.finalAmountDue, 60, "Final amount due must be 100 - 40 = 60");
assert.strictEqual(advBill.status, BILL_STATUS.PARTIALLY_PAID, "Must be Partially Paid because advance covered part of month charges");

// Test 12: Inactive customer with balance still included in total receivables
const inactiveCust = { id: "cust_inact", name: "Inactive Customer", status: "inactive" };
const inactDeliveries = [{ id: "id1", customerId: "cust_inact", date: "2026-11-01", quantityKg: 5, pricePerKg: 60, charge: 300 }];
const inactDashboard = getDailyDashboardMetrics("2026-11-01", [customerObj, inactiveCust], [...deliveries, ...inactDeliveries], payments, adjustments);
assert.strictEqual(inactDashboard.totalOutstandingDue, 250 + 300, "Total outstanding due must include inactive customer with balance");

// Test 13: Seller Email Authentication
const sellerLogin = loginWithEmail('drsanjay@dairy.com', 'dairy123', 'seller');
assert.strictEqual(sellerLogin.success, true, "Seller login with default credentials must succeed");
assert.strictEqual(sellerLogin.user.role, 'seller', "Seller role must be 'seller'");

// Test 14: Customer Registration & Login
const custReg = registerAccount({
  name: 'Suresh Kumar',
  email: 'suresh@test.com',
  password: 'password123',
  role: 'customer',
  phone: '9876500000',
  usualQuantityKg: 2.0
});
assert.strictEqual(custReg.success, true, "Customer registration must succeed");
assert.strictEqual(custReg.user.role, 'customer', "Role must be 'customer'");

// Test 15: Google Sign-In for Customer
const googleLogin = loginWithGoogleAuth({
  name: 'Google User',
  email: 'googleuser@gmail.com',
  picture: 'https://example.com/pic.jpg'
}, 'customer');
assert.strictEqual(googleLogin.success, true, "Google login for customer must succeed");
assert.strictEqual(googleLogin.user.provider, 'google', "Provider must be google");

// Test 16: Logout
logout();
assert.strictEqual(getCurrentUser(), null, "Current user must be null after logout");

console.log("All 16 calculation, business workflow, and authentication tests passed cleanly!");
