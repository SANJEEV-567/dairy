import { STORAGE_KEYS } from './constants.js';
import { generateCustomerCode } from './formatters.js';

export const CUSTOMER_LINK_KEY_PREFIX = 'dsk_dairy_customer_link_';

/**
 * Generate account-scoped storage key for user data isolation
 */
export function getScopedKey(baseKey, userId) {
  if (!userId) return baseKey;
  return `${baseKey}_${userId}`;
}

/**
 * Safe local storage reader
 */
export function loadFromStorage(key, defaultValue = []) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return defaultValue;
  }
}

/**
 * Safe local storage writer
 */
export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
    return false;
  }
}

/**
 * Generate unique ID with prefix
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Migrate unassigned legacy records to an authenticated account
 * Ensures zero data loss when setting up authentication on existing dairy records!
 */
export function migrateLegacyRecordsToAccount(userId) {
  if (!userId) return { migrated: false };

  const scopedCustKey = getScopedKey(STORAGE_KEYS.CUSTOMERS, userId);
  const scopedDeliveriesKey = getScopedKey(STORAGE_KEYS.DELIVERIES, userId);
  const scopedPaymentsKey = getScopedKey(STORAGE_KEYS.PAYMENTS, userId);
  const scopedAdjustmentsKey = getScopedKey(STORAGE_KEYS.ADJUSTMENTS, userId);

  const existingScopedCust = loadFromStorage(scopedCustKey, []);
  if (existingScopedCust.length > 0) {
    return { migrated: false, alreadyHasRecords: true };
  }

  // Check legacy unassigned records
  const legacyCustomers = loadFromStorage(STORAGE_KEYS.CUSTOMERS, []);
  const legacyDeliveries = loadFromStorage(STORAGE_KEYS.DELIVERIES, []);
  const legacyPayments = loadFromStorage(STORAGE_KEYS.PAYMENTS, []);
  const legacyAdjustments = loadFromStorage(STORAGE_KEYS.ADJUSTMENTS, []);

  if (legacyCustomers.length === 0 && legacyDeliveries.length === 0) {
    return { migrated: false, noLegacyRecords: true };
  }

  // Assign dairy_id and ensure unique customer_code to legacy records
  const existingCodes = [];
  const migratedCust = legacyCustomers.map((c, idx) => {
    const code = c.customerCode || generateCustomerCode(existingCodes);
    existingCodes.push({ customerCode: code });
    return { ...c, dairy_id: userId, customerCode: code };
  });
  const migratedDeliv = legacyDeliveries.map(d => ({ ...d, dairy_id: userId }));
  const migratedPay = legacyPayments.map(p => ({ ...p, dairy_id: userId }));
  const migratedAdj = legacyAdjustments.map(a => ({ ...a, dairy_id: userId }));

  saveToStorage(scopedCustKey, migratedCust);
  saveToStorage(scopedDeliveriesKey, migratedDeliv);
  saveToStorage(scopedPaymentsKey, migratedPay);
  saveToStorage(scopedAdjustmentsKey, migratedAdj);

  return {
    migrated: true,
    stats: {
      customers: migratedCust.length,
      deliveries: migratedDeliv.length,
      payments: migratedPay.length,
      adjustments: migratedAdj.length
    }
  };
}

/**
 * Locate a customer record across dairy storage by unique customer code
 */
export function findCustomerByCode(customerCode) {
  if (!customerCode) return null;
  const cleanCode = customerCode.trim().toUpperCase();

  // 1. Search in localStorage keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.CUSTOMERS)) {
        const custList = loadFromStorage(key, []);
        const found = custList.find(c => c?.customerCode?.toUpperCase() === cleanCode);
        if (found) {
          const dairyId = found.dairy_id || key.replace(`${STORAGE_KEYS.CUSTOMERS}_`, '');
          return { customer: found, dairyId, key };
        }
      }
    }
  } catch (e) {
    console.error("Error searching customer by code:", e);
  }

  // 2. Check unassigned legacy customers key
  const unassigned = loadFromStorage(STORAGE_KEYS.CUSTOMERS, []);
  const foundUnassigned = unassigned.find(c => c?.customerCode?.toUpperCase() === cleanCode);
  if (foundUnassigned) {
    return { customer: foundUnassigned, dairyId: null, key: STORAGE_KEYS.CUSTOMERS };
  }

  return null;
}

/**
 * Link customer user account to a dairy customer record locally
 */
export function linkCustomerAccountLocally(customerCode, userAuthId) {
  if (!customerCode || !userAuthId) {
    return { success: false, error: "Customer code and User ID are required." };
  }

  const result = findCustomerByCode(customerCode);
  if (!result || !result.customer) {
    return {
      success: false,
      error: "Invalid customer code. Please verify the code on your milk bill or ask Dr. Sanjay Kumar Dairy."
    };
  }

  const { customer, dairyId, key } = result;

  // Check if already claimed by another user
  if (customer.linkedUserId && customer.linkedUserId !== userAuthId) {
    return {
      success: false,
      error: "This customer code is already connected to another user account. Contact Dr. Sanjay Kumar Dairy for assistance."
    };
  }

  // Update customer record
  const custList = loadFromStorage(key, []);
  const updatedCustList = custList.map(c => 
    c.id === customer.id ? { ...c, linkedUserId: userAuthId, updatedAt: new Date().toISOString() } : c
  );
  saveToStorage(key, updatedCustList);

  // Save the customer link pointer
  const linkKey = `${CUSTOMER_LINK_KEY_PREFIX}${userAuthId}`;
  saveToStorage(linkKey, {
    customerId: customer.id,
    dairyId: dairyId || customer.dairy_id || null,
    customerCode: customer.customerCode,
    customerName: customer.name,
    linkedAt: new Date().toISOString()
  });

  return {
    success: true,
    customer: { ...customer, linkedUserId: userAuthId },
    dairyId
  };
}

/**
 * Get linked customer data for a logged-in customer account
 * STRICT DATA ISOLATION: Only returns the customer's OWN deliveries, payments, and adjustments
 */
export function getLinkedCustomerData(userAuthId) {
  if (!userAuthId) return null;
  const linkKey = `${CUSTOMER_LINK_KEY_PREFIX}${userAuthId}`;
  const link = loadFromStorage(linkKey, null);

  if (!link || !link.customerId) {
    return null;
  }

  const { customerId, dairyId } = link;
  const custKey = dairyId ? getScopedKey(STORAGE_KEYS.CUSTOMERS, dairyId) : STORAGE_KEYS.CUSTOMERS;
  const delivKey = dairyId ? getScopedKey(STORAGE_KEYS.DELIVERIES, dairyId) : STORAGE_KEYS.DELIVERIES;
  const payKey = dairyId ? getScopedKey(STORAGE_KEYS.PAYMENTS, dairyId) : STORAGE_KEYS.PAYMENTS;
  const adjKey = dairyId ? getScopedKey(STORAGE_KEYS.ADJUSTMENTS, dairyId) : STORAGE_KEYS.ADJUSTMENTS;
  const ovrKey = dairyId ? getScopedKey(STORAGE_KEYS.STATUS_OVERRIDES, dairyId) : STORAGE_KEYS.STATUS_OVERRIDES;

  const customers = loadFromStorage(custKey, []);
  const customer = customers.find(c => c.id === customerId);

  if (!customer) return null;

  // STRICT FILTER: Only deliveries and records belonging to this customer
  const allDeliveries = loadFromStorage(delivKey, []);
  const allPayments = loadFromStorage(payKey, []);
  const allAdjustments = loadFromStorage(adjKey, []);
  const allOverrides = loadFromStorage(ovrKey, []);

  const myDeliveries = allDeliveries.filter(d => d.customerId === customerId);
  const myPayments = allPayments.filter(p => p.customerId === customerId);
  const myAdjustments = allAdjustments.filter(a => a.customerId === customerId);
  const myOverrides = allOverrides.filter(o => o.customerId === customerId);

  return {
    customer,
    dairyId,
    deliveries: myDeliveries,
    payments: myPayments,
    adjustments: myAdjustments,
    statusOverrides: myOverrides
  };
}

/**
 * Export all system data for an account as a single backup JSON file
 */
export function exportAllData(userId = null) {
  const custKey = getScopedKey(STORAGE_KEYS.CUSTOMERS, userId);
  const delivKey = getScopedKey(STORAGE_KEYS.DELIVERIES, userId);
  const payKey = getScopedKey(STORAGE_KEYS.PAYMENTS, userId);
  const adjKey = getScopedKey(STORAGE_KEYS.ADJUSTMENTS, userId);
  const ovrKey = getScopedKey(STORAGE_KEYS.STATUS_OVERRIDES, userId);

  const data = {
    appName: "Dr. Sanjay Kumar Dairy Management System",
    exportedAt: new Date().toISOString(),
    version: 2,
    userId: userId || null,
    customers: loadFromStorage(custKey, []),
    deliveries: loadFromStorage(delivKey, []),
    payments: loadFromStorage(payKey, []),
    adjustments: loadFromStorage(adjKey, []),
    statusOverrides: loadFromStorage(ovrKey, []),
    settings: loadFromStorage(STORAGE_KEYS.SETTINGS, {})
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Import and validate backup JSON data
 */
export function importAllData(jsonString, userId = null) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error("Invalid backup format: Not a JSON object");
    }
    
    // Validate arrays exist or default
    const customers = Array.isArray(parsed.customers) ? parsed.customers : [];
    const deliveries = Array.isArray(parsed.deliveries) ? parsed.deliveries : [];
    const payments = Array.isArray(parsed.payments) ? parsed.payments : [];
    const adjustments = Array.isArray(parsed.adjustments) ? parsed.adjustments : [];
    const statusOverrides = Array.isArray(parsed.statusOverrides) ? parsed.statusOverrides : [];
    const settings = parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {};

    const custKey = getScopedKey(STORAGE_KEYS.CUSTOMERS, userId);
    const delivKey = getScopedKey(STORAGE_KEYS.DELIVERIES, userId);
    const payKey = getScopedKey(STORAGE_KEYS.PAYMENTS, userId);
    const adjKey = getScopedKey(STORAGE_KEYS.ADJUSTMENTS, userId);
    const ovrKey = getScopedKey(STORAGE_KEYS.STATUS_OVERRIDES, userId);

    // Save to account-scoped keys
    saveToStorage(custKey, customers);
    saveToStorage(delivKey, deliveries);
    saveToStorage(payKey, payments);
    saveToStorage(adjKey, adjustments);
    saveToStorage(ovrKey, statusOverrides);
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);

    return {
      success: true,
      stats: {
        customers: customers.length,
        deliveries: deliveries.length,
        payments: payments.length,
        adjustments: adjustments.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to parse backup JSON"
    };
  }
}

/**
 * Clear all data safely for an account
 */
export function clearAllData(userId = null) {
  const keys = [
    getScopedKey(STORAGE_KEYS.CUSTOMERS, userId),
    getScopedKey(STORAGE_KEYS.DELIVERIES, userId),
    getScopedKey(STORAGE_KEYS.PAYMENTS, userId),
    getScopedKey(STORAGE_KEYS.ADJUSTMENTS, userId),
    getScopedKey(STORAGE_KEYS.STATUS_OVERRIDES, userId)
  ];

  keys.forEach(key => {
    localStorage.removeItem(key);
  });
}
