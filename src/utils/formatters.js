import { TIMEZONE } from './constants.js';

/**
 * Format a number into Indian Rupee format (e.g., ₹1,250.00 or ₹1,25,000.00)
 */
export function formatINR(amount, options = { showZeroDecimals: true }) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return "₹0.00";
  }

  const num = Number(amount);
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: options.showZeroDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(absNum);

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format milk quantity in kg with strict unit labeling (never converts to liters)
 */
export function formatKg(quantity) {
  if (quantity === undefined || quantity === null || isNaN(quantity)) {
    return "0.00 kg";
  }
  const num = Number(quantity);
  // Keep up to 2 decimal places if needed, strip redundant trailing zeroes
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
  return `${formatted} kg`;
}

/**
 * Get current date in Asia/Kolkata timezone as YYYY-MM-DD
 */
export function getTodayKolkata() {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date());
  } catch (e) {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }
}

/**
 * Get current time in Asia/Kolkata timezone as HH:mm
 */
export function getCurrentTimeKolkata() {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return formatter.format(new Date());
  } catch (e) {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
}

/**
 * Format date string (YYYY-MM-DD) into Indian readable format (e.g. 09 Nov 2026)
 */
export function formatDateIndian(dateStr) {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

/**
 * Format date string (YYYY-MM-DD) into short DD/MM/YYYY
 */
export function formatDateShort(dateStr) {
  if (!dateStr) return "-";
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Format time (HH:mm) into 12-hour format with AM/PM (e.g. 06:30 AM)
 */
export function formatTimeIndian(timeStr) {
  if (!timeStr) return "";
  const [hh, mm] = timeStr.split(':');
  if (hh === undefined || mm === undefined) return timeStr;
  
  let hour = parseInt(hh, 10);
  const minute = mm.padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${minute} ${ampm}`;
}

/**
 * Format YYYY-MM into readable month e.g. "November 2026"
 */
export function formatMonthYear(yearMonthStr) {
  if (!yearMonthStr) return "";
  const [year, month] = yearMonthStr.split('-');
  if (!year || !month) return yearMonthStr;

  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric'
  }).format(date);
}

/**
 * Generate month options for dropdown (past 12 months + current month)
 */
export function getRecentMonthOptions(count = 12) {
  const options = [];
  const todayStr = getTodayKolkata();
  const [currentYear, currentMonth] = todayStr.split('-').map(Number);
  
  let y = currentYear;
  let m = currentMonth;

  for (let i = 0; i < count; i++) {
    const val = `${y}-${String(m).padStart(2, '0')}`;
    const label = formatMonthYear(val);
    options.push({ value: val, label, isCurrent: i === 0 });
    m--;
    if (m === 0) {
      m = 12;
      y--;
    }
  }
  return options;
}

/**
 * Safe parse number with 2 decimal precision
 */
export function roundToTwo(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}
