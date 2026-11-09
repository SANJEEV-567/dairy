import assert from 'node:assert';
import { 
  roundToTwo, 
  formatINR, 
  formatKg, 
  getTodayKolkata, 
  formatMonthYear 
} from './src/utils/formatters.js';
import { 
  calculateCustomerLedger, 
  getCustomerBalance, 
  generateMonthlyBill, 
  getDailyDashboardMetrics 
} from './src/utils/calculations.js';
import { BILL_STATUS } from './src/utils/constants.js';

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
  usualPricePerKg: 60
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

console.log("All calculation and business workflow tests passed successfully!");
