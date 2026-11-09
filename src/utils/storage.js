import { STORAGE_KEYS } from './constants.js';

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
 * Export all system data as a single backup JSON file
 */
export function exportAllData() {
  const data = {
    appName: "Dr. Sanjay Kumar Dairy Management System",
    exportedAt: new Date().toISOString(),
    version: 1,
    customers: loadFromStorage(STORAGE_KEYS.CUSTOMERS, []),
    deliveries: loadFromStorage(STORAGE_KEYS.DELIVERIES, []),
    payments: loadFromStorage(STORAGE_KEYS.PAYMENTS, []),
    adjustments: loadFromStorage(STORAGE_KEYS.ADJUSTMENTS, []),
    statusOverrides: loadFromStorage(STORAGE_KEYS.STATUS_OVERRIDES, []),
    settings: loadFromStorage(STORAGE_KEYS.SETTINGS, {})
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Import and validate backup JSON data
 */
export function importAllData(jsonString) {
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

    // Save to localStorage
    saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
    saveToStorage(STORAGE_KEYS.DELIVERIES, deliveries);
    saveToStorage(STORAGE_KEYS.PAYMENTS, payments);
    saveToStorage(STORAGE_KEYS.ADJUSTMENTS, adjustments);
    saveToStorage(STORAGE_KEYS.STATUS_OVERRIDES, statusOverrides);
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
 * Clear all data safely
 */
export function clearAllData() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}
