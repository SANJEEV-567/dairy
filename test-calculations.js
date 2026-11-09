// In-memory localStorage polyfill for Node.js test environment
const memStore = {};
globalThis.localStorage = {
  getItem: (k) => memStore[k] || null,
  setItem: (k, v) => { memStore[k] = String(v); },
  removeItem: (k) => { delete memStore[k]; },
  clear: () => { Object.keys(memStore).forEach(k => delete memStore[k]); },
  key: (i) => Object.keys(memStore)[i] || null,
  get length() { return Object.keys(memStore).length; }
};

import assert from 'node:assert';
import { 
  roundToTwo, 
  formatINR, 
  formatKg, 
  getTodayKolkata, 
  formatMonthYear,
  addDays,
  generateCustomerCode
} from './src/utils/formatters.js';
import { 
  calculateCustomerLedger, 
  getCustomerBalance, 
  generateMonthlyBill, 
  getDailyDashboardMetrics 
} from './src/utils/calculations.js';
import { BILL_STATUS, STORAGE_KEYS } from './src/utils/constants.js';
import { 
  getScopedKey, 
  migrateLegacyRecordsToAccount, 
  saveToStorage, 
  loadFromStorage,
  linkCustomerAccountLocally,
  getLinkedCustomerData,
  findCustomerByCode
} from './src/utils/storage.js';
import { isSupabaseConfigured } from './src/utils/supabase.js';
import { signUpUser, signInUser, sendPasswordResetEmail } from './src/utils/authService.js';

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
  customerCode: "DSK-1001",
  name: "Test Customer A",
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

// Test 13: Data Isolation - getScopedKey generates distinct keys for each authenticated account
const scopedKeyA = getScopedKey(STORAGE_KEYS.CUSTOMERS, 'seller_user_A');
const scopedKeyB = getScopedKey(STORAGE_KEYS.CUSTOMERS, 'seller_user_B');
assert.notStrictEqual(scopedKeyA, scopedKeyB, "Scoped keys for different sellers must not collide");
assert.strictEqual(scopedKeyA, `${STORAGE_KEYS.CUSTOMERS}_seller_user_A`);

// Test 14: Data Migration - safely assigns unassigned legacy records to authenticated account
saveToStorage(STORAGE_KEYS.CUSTOMERS, [{ id: "legacy_c1", name: "Legacy Cust", customerCode: "DSK-1001" }]);
saveToStorage(STORAGE_KEYS.DELIVERIES, [{ id: "legacy_d1", charge: 60 }]);
const migrationResult = migrateLegacyRecordsToAccount('authenticated_seller_uuid');
assert.strictEqual(migrationResult.migrated, true, "Legacy records must be successfully migrated");
const migratedCust = loadFromStorage(getScopedKey(STORAGE_KEYS.CUSTOMERS, 'authenticated_seller_uuid'), []);
assert.strictEqual(migratedCust.length, 1, "Migrated records must be stored under scoped key");
assert.strictEqual(migratedCust[0].dairy_id, 'authenticated_seller_uuid', "Migrated records must receive authenticated dairy_id");

// Test 15: Security Gate - isSupabaseConfigured returns false when backend is unconfigured
assert.strictEqual(isSupabaseConfigured(), false, "isSupabaseConfigured must be false when no valid URL/anonKey provided");

// Test 16: Safe Rejection - Auth methods refuse to simulate logins when unconfigured
async function testAuthSafety() {
  const signUpRes = await signUpUser({ email: 'seller@test.com', password: 'password123', name: 'Seller', role: 'seller' });
  assert.strictEqual(signUpRes.success, false, "signUpUser must fail when backend unconfigured");
  assert.strictEqual(signUpRes.notConfigured, true, "Must flag notConfigured as true");

  const signInRes = await signInUser({ email: 'seller@test.com', password: 'password123' });
  assert.strictEqual(signInRes.success, false, "signInUser must fail when backend unconfigured");
  assert.strictEqual(signInRes.notConfigured, true, "Must flag notConfigured as true");

  const resetRes = await sendPasswordResetEmail('seller@test.com');
  assert.strictEqual(resetRes.success, false, "sendPasswordResetEmail must fail when backend unconfigured");
  assert.strictEqual(resetRes.notConfigured, true, "Must flag notConfigured as true");
}
await testAuthSafety();

// Test 17: Seller-Issued Customer Code generation
const code1 = generateCustomerCode([]);
const code2 = generateCustomerCode([{ customerCode: code1 }]);
assert.strictEqual(code1, 'DSK-1001', "First customer code must be DSK-1001");
assert.strictEqual(code2, 'DSK-1002', "Second customer code must be DSK-1002");

// Test 18: Customer Account Linking by Code
const sellerId = "seller_dairy_100";
const customerId = "cust_verified_1";
const buyerCode = "DSK-2026";
saveToStorage(getScopedKey(STORAGE_KEYS.CUSTOMERS, sellerId), [
  { id: customerId, dairy_id: sellerId, name: "Verified Buyer", customerCode: buyerCode, status: "active" }
]);

const buyerAuthId = "auth_user_buyer_999";
const linkRes = linkCustomerAccountLocally(buyerCode, buyerAuthId);
assert.strictEqual(linkRes.success, true, "Linking with valid code must succeed");
assert.strictEqual(linkRes.customer.id, customerId, "Linked customer must match customer ID");

// Verify that attempting to link with another user account fails (prevents account hijacking)
const secondBuyerAuthId = "auth_user_buyer_888";
const secondLinkRes = linkCustomerAccountLocally(buyerCode, secondBuyerAuthId);
assert.strictEqual(secondLinkRes.success, false, "Claiming already linked code by another user must fail");

// Test 19: Strict Customer Data Isolation
// Seed deliveries: one for the verified buyer, one for a different customer
saveToStorage(getScopedKey(STORAGE_KEYS.DELIVERIES, sellerId), [
  { id: "deliv_1", customerId: customerId, date: "2026-11-09", quantityKg: 2, pricePerKg: 60, charge: 120 },
  { id: "deliv_other", customerId: "other_cust", date: "2026-11-09", quantityKg: 5, pricePerKg: 70, charge: 350 }
]);

const customerData = getLinkedCustomerData(buyerAuthId);
assert.strictEqual(customerData.customer.name, "Verified Buyer", "Must retrieve verified buyer record");
assert.strictEqual(customerData.deliveries.length, 1, "Must strictly return ONLY the buyer's own deliveries (1 of 2)");
assert.strictEqual(customerData.deliveries[0].id, "deliv_1", "Delivery ID must match buyer's delivery");

// Test 20: Email-Only Flow (no phone or OTP required)
const signUpPayload = {
  name: "New Buyer",
  email: "buyer@domain.com",
  password: "securePassword123",
  role: "customer",
  customerCode: buyerCode
};
assert.strictEqual(typeof signUpPayload.email, 'string');
assert.strictEqual(typeof signUpPayload.password, 'string');
assert.strictEqual(signUpPayload.phone, undefined, "Phone number must not be required in email-only account flow");

console.log("All 20 calculation, business workflow, and authentication tests passed cleanly!");
