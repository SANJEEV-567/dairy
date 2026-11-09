import { STORAGE_KEYS } from './constants.js';

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

  // Assign dairy_id to legacy records
  const migratedCust = legacyCustomers.map(c => ({ ...c, dairy_id: userId }));
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
