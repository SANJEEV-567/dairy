import { roundToTwo } from './formatters.js';
import { BILL_STATUS } from './constants.js';

/**
 * Calculate running ledger for a customer
 * Returns list of transaction events sorted chronologically with running balance
 */
export function calculateCustomerLedger(
  customerId,
  allDeliveries = [],
  allPayments = [],
  allAdjustments = [],
  options = { startDate: null, endDate: null, month: null }
) {
  // 1. Collect all events for this customer
  const events = [];

  // Deliveries
  allDeliveries
    .filter(d => d.customerId === customerId)
    .forEach(d => {
      events.push({
        id: d.id,
        type: 'delivery',
        date: d.date,
        time: d.time || '06:00',
        timestamp: `${d.date}T${d.time || '06:00'}:00`,
        quantityKg: Number(d.quantityKg || 0),
        pricePerKg: Number(d.pricePerKg || 0),
        amount: Number(d.charge || 0), // charge is a debit (+)
        effect: 'debit',
        note: d.note || '',
        raw: d
      });
    });

  // Payments
  allPayments
    .filter(p => p.customerId === customerId)
    .forEach(p => {
      events.push({
        id: p.id,
        type: 'payment',
        date: p.date,
        time: p.time || '12:00',
        timestamp: `${p.date}T${p.time || '12:00'}:00`,
        amount: Number(p.amount || 0), // payment is a credit (-)
        effect: 'credit',
        paymentMethod: p.paymentMethod || 'Cash',
        note: p.note || '',
        raw: p
      });
    });

  // Adjustments
  allAdjustments
    .filter(a => a.customerId === customerId)
    .forEach(a => {
      const isDebit = a.type === 'debit';
      events.push({
        id: a.id,
        type: 'adjustment',
        date: a.date,
        time: a.time || '10:00',
        timestamp: `${a.date}T${a.time || '10:00'}:00`,
        amount: Number(a.amount || 0),
        effect: isDebit ? 'debit' : 'credit',
        adjustmentType: a.type,
        note: a.reason || a.note || '',
        raw: a
      });
    });

  // 2. Sort chronologically (oldest first for accurate running balance)
  events.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    const timeCompare = (a.time || '00:00').localeCompare(b.time || '00:00');
    if (timeCompare !== 0) return timeCompare;
    // Tie breaker: adjustments first (e.g. opening balances), then deliveries, then payments
    const priority = { adjustment: 1, delivery: 2, payment: 3 };
    const pA = priority[a.type] || 2;
    const pB = priority[b.type] || 2;
    if (pA !== pB) return pA - pB;
    return (a.id || '').localeCompare(b.id || '');
  });

  // 3. Calculate running balance from the very beginning
  let running = 0;
  const eventsWithBalance = events.map(event => {
    if (event.effect === 'debit') {
      running += event.amount;
    } else {
      running -= event.amount;
    }
    return {
      ...event,
      runningBalance: roundToTwo(running)
    };
  });

  // 4. Filter by date/month if requested
  let filtered = eventsWithBalance;
  if (options.month) {
    filtered = filtered.filter(e => e.date.startsWith(options.month));
  } else {
    if (options.startDate) {
      filtered = filtered.filter(e => e.date >= options.startDate);
    }
    if (options.endDate) {
      filtered = filtered.filter(e => e.date <= options.endDate);
    }
  }

  return {
    transactions: filtered, // or reversed for display
    currentBalance: roundToTwo(running),
    totalDeliveriesCount: events.filter(e => e.type === 'delivery').length,
    totalPaymentsCount: events.filter(e => e.type === 'payment').length
  };
}

/**
 * Get current balance due for a customer
 * Formula: deliveries + debit adjustments - payments - credit adjustments
 */
export function getCustomerBalance(
  customerId,
  allDeliveries = [],
  allPayments = [],
  allAdjustments = []
) {
  let balance = 0;

  for (const d of allDeliveries) {
    if (d.customerId === customerId) {
      balance += Number(d.charge || 0);
    }
  }

  for (const p of allPayments) {
    if (p.customerId === customerId) {
      balance -= Number(p.amount || 0);
    }
  }

  for (const a of allAdjustments) {
    if (a.customerId === customerId) {
      if (a.type === 'debit') {
        balance += Number(a.amount || 0);
      } else {
        balance -= Number(a.amount || 0);
      }
    }
  }

  return roundToTwo(balance);
}

/**
 * Generate Monthly Bill for a single customer
 */
export function generateMonthlyBill(
  customer,
  monthStr, // YYYY-MM e.g. "2026-11"
  allDeliveries = [],
  allPayments = [],
  allAdjustments = [],
  allStatusOverrides = []
) {
  if (!customer) return null;

  const firstDayOfMonth = `${monthStr}-01`;

  // 1. Deliveries during month
  const monthDeliveries = allDeliveries
    .filter(d => d.customerId === customer.id && d.date.startsWith(monthStr))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '').localeCompare(b.time || '');
    });

  const totalKg = roundToTwo(
    monthDeliveries.reduce((sum, d) => sum + Number(d.quantityKg || 0), 0)
  );

  const totalMilkCharges = roundToTwo(
    monthDeliveries.reduce((sum, d) => sum + Number(d.charge || 0), 0)
  );

  // 2. Previous outstanding balance (strictly before firstDayOfMonth)
  let previousOutstandingBalance = 0;

  allDeliveries.forEach(d => {
    if (d.customerId === customer.id && d.date < firstDayOfMonth) {
      previousOutstandingBalance += Number(d.charge || 0);
    }
  });

  allAdjustments.forEach(a => {
    if (a.customerId === customer.id && a.date < firstDayOfMonth) {
      if (a.type === 'debit') {
        previousOutstandingBalance += Number(a.amount || 0);
      } else {
        previousOutstandingBalance -= Number(a.amount || 0);
      }
    }
  });

  allPayments.forEach(p => {
    if (p.customerId === customer.id && p.date < firstDayOfMonth) {
      previousOutstandingBalance -= Number(p.amount || 0);
    }
  });

  previousOutstandingBalance = roundToTwo(previousOutstandingBalance);

  // 3. Payments made during the month
  const monthPayments = allPayments
    .filter(p => p.customerId === customer.id && p.date.startsWith(monthStr))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalPaymentsInMonth = roundToTwo(
    monthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  );

  // 4. Adjustments during month
  const monthAdjustments = allAdjustments
    .filter(a => a.customerId === customer.id && a.date.startsWith(monthStr));

  let netAdjustmentsInMonth = 0;
  monthAdjustments.forEach(a => {
    if (a.type === 'debit') {
      netAdjustmentsInMonth += Number(a.amount || 0);
    } else {
      netAdjustmentsInMonth -= Number(a.amount || 0);
    }
  });
  netAdjustmentsInMonth = roundToTwo(netAdjustmentsInMonth);

  // 5. Final amount due calculation:
  // Previous balance + delivery charges + adjustments - payments received
  const finalAmountDue = roundToTwo(
    previousOutstandingBalance + totalMilkCharges + netAdjustmentsInMonth - totalPaymentsInMonth
  );

  // 6. Payment Status resolution
  const statusOverride = allStatusOverrides.find(
    s => s.customerId === customer.id && s.month === monthStr
  );

  let status = BILL_STATUS.DUE;
  if (finalAmountDue <= 0) {
    status = BILL_STATUS.PAID;
  } else if (
    totalPaymentsInMonth > 0 || 
    (previousOutstandingBalance < 0 && finalAmountDue < (totalMilkCharges + netAdjustmentsInMonth))
  ) {
    status = BILL_STATUS.PARTIALLY_PAID;
  } else {
    status = BILL_STATUS.DUE;
  }

  // If there's an explicit override, record it while keeping actual amount due visible
  const isOverridden = !!statusOverride;
  const effectiveStatus = isOverridden ? statusOverride.status : status;

  return {
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    monthStr,
    deliveries: monthDeliveries,
    payments: monthPayments,
    adjustments: monthAdjustments,
    totalKg,
    totalMilkCharges,
    previousOutstandingBalance,
    totalPaymentsInMonth,
    netAdjustmentsInMonth,
    finalAmountDue,
    calculatedStatus: status,
    status: effectiveStatus,
    isOverridden,
    overrideReason: statusOverride?.reason || null,
    overrideTimestamp: statusOverride?.timestamp || null
  };
}

/**
 * Get daily dashboard metrics for selected date
 */
export function getDailyDashboardMetrics(
  selectedDate,
  customers = [],
  deliveries = [],
  payments = [],
  adjustments = []
) {
  // Deliveries on selected date
  const dayDeliveries = deliveries.filter(d => d.date === selectedDate);
  const totalMilkDeliveredTodayKg = roundToTwo(
    dayDeliveries.reduce((sum, d) => sum + Number(d.quantityKg || 0), 0)
  );
  const totalChargesToday = roundToTwo(
    dayDeliveries.reduce((sum, d) => sum + Number(d.charge || 0), 0)
  );

  // Payments received on selected date
  const dayPayments = payments.filter(p => p.date === selectedDate);
  const paymentsReceivedToday = roundToTwo(
    dayPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  );

  // Total amount currently due across all customers (active or inactive with pending balance)
  let totalOutstandingDueAllCustomers = 0;
  const customerSummary = customers.map(cust => {
    const balance = getCustomerBalance(cust.id, deliveries, payments, adjustments);
    totalOutstandingDueAllCustomers += balance;

    const deliveryForDay = dayDeliveries.find(d => d.customerId === cust.id);

    return {
      customer: cust,
      balance,
      hasDelivery: !!deliveryForDay,
      delivery: deliveryForDay || null
    };
  });

  return {
    selectedDate,
    totalMilkDeliveredTodayKg,
    totalChargesToday,
    paymentsReceivedToday,
    totalOutstandingDue: roundToTwo(totalOutstandingDueAllCustomers),
    customerSummary
  };
}
