import { getSupabaseClient, isSupabaseConfigured } from './supabase.js';

/**
 * Convert Database Row (snake_case) to Frontend Object (camelCase)
 */
export function mapCustomerFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    dairy_id: row.dairy_id,
    customerCode: row.customer_code || '',
    userId: row.user_id || null,
    linkedUserId: row.user_id || null,
    name: row.name || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    usualQuantityKg: Number(row.usual_quantity_kg ?? 1),
    usualPricePerKg: Number(row.usual_price_per_kg ?? 60),
    notes: row.notes || '',
    status: row.status || 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapCustomerToDb(c, dairyId) {
  return {
    id: c.id,
    dairy_id: dairyId || c.dairy_id,
    customer_code: c.customerCode || null,
    user_id: c.userId || c.linkedUserId || null,
    name: c.name,
    phone: c.phone || null,
    email: c.email || null,
    address: c.address || null,
    usual_quantity_kg: Number(c.usualQuantityKg || 1),
    usual_price_per_kg: Number(c.usualPricePerKg || 60),
    notes: c.notes || null,
    status: c.status || 'active',
    updated_at: new Date().toISOString()
  };
}

export function mapDeliveryFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    dairy_id: row.dairy_id,
    customerId: row.customer_id,
    date: row.date,
    time: row.time ? row.time.substring(0, 5) : '06:30',
    quantityKg: Number(row.quantity_kg || 0),
    pricePerKg: Number(row.price_per_kg || 0),
    charge: Number(row.charge || 0),
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapDeliveryToDb(d, dairyId) {
  return {
    id: d.id,
    dairy_id: dairyId || d.dairy_id,
    customer_id: d.customerId,
    date: d.date,
    time: d.time ? `${d.time.substring(0, 5)}:00` : '06:30:00',
    quantity_kg: Number(d.quantityKg || 0),
    price_per_kg: Number(d.pricePerKg || 0),
    charge: Number(d.charge || 0),
    note: d.note || null,
    updated_at: new Date().toISOString()
  };
}

export function mapPaymentFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    dairy_id: row.dairy_id,
    customerId: row.customer_id,
    date: row.date,
    time: row.time ? row.time.substring(0, 5) : '12:00',
    amount: Number(row.amount || 0),
    paymentMethod: row.payment_method || 'Cash',
    note: row.note || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapPaymentToDb(p, dairyId) {
  return {
    id: p.id,
    dairy_id: dairyId || p.dairy_id,
    customer_id: p.customerId,
    date: p.date,
    time: p.time ? `${p.time.substring(0, 5)}:00` : '12:00:00',
    amount: Number(p.amount || 0),
    payment_method: p.paymentMethod || 'Cash',
    note: p.note || null,
    updated_at: new Date().toISOString()
  };
}

export function mapAdjustmentFromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    dairy_id: row.dairy_id,
    customerId: row.customer_id,
    date: row.date,
    time: row.time ? row.time.substring(0, 5) : '00:00',
    type: row.type || 'debit',
    amount: Number(row.amount || 0),
    reason: row.reason || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapAdjustmentToDb(a, dairyId) {
  return {
    id: a.id,
    dairy_id: dairyId || a.dairy_id,
    customer_id: a.customerId,
    date: a.date,
    time: a.time ? `${a.time.substring(0, 5)}:00` : '00:00:00',
    type: a.type || 'debit',
    amount: Number(a.amount || 0),
    reason: a.reason || '',
    updated_at: new Date().toISOString()
  };
}

/**
 * Fetch all seller records from Supabase PostgreSQL
 */
export async function fetchSellerDataFromSupabase(dairyId) {
  if (!isSupabaseConfigured() || !dairyId) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const [custRes, delivRes, payRes, adjRes] = await Promise.all([
      supabase.from('customers').select('*').order('name'),
      supabase.from('deliveries').select('*').order('date', { ascending: false }),
      supabase.from('payments').select('*').order('date', { ascending: false }),
      supabase.from('adjustments').select('*').order('date', { ascending: false })
    ]);

    if (custRes.error) {
      console.warn("Could not fetch customers from Supabase:", custRes.error.message);
      return null;
    }

    return {
      customers: (custRes.data || []).map(mapCustomerFromDb),
      deliveries: (delivRes.data || []).map(mapDeliveryFromDb),
      payments: (payRes.data || []).map(mapPaymentFromDb),
      adjustments: (adjRes.data || []).map(mapAdjustmentFromDb)
    };
  } catch (err) {
    console.warn("Error communicating with Supabase:", err);
    return null;
  }
}

/**
 * Fetch customer records for Customer Portal
 */
export async function fetchCustomerDataFromSupabase(customerCode, userAuthId) {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    // 1. Fetch the linked customer
    let query = supabase.from('customers').select('*');
    if (userAuthId) {
      query = query.or(`user_id.eq.${userAuthId}${customerCode ? `,customer_code.eq.${customerCode}` : ''}`);
    } else if (customerCode) {
      query = query.eq('customer_code', customerCode);
    }

    const { data: custList, error: custErr } = await query;
    if (custErr || !custList || custList.length === 0) return null;

    const customer = mapCustomerFromDb(custList[0]);

    // 2. Fetch deliveries, payments, adjustments for this customer
    const [delivRes, payRes, adjRes] = await Promise.all([
      supabase.from('deliveries').select('*').eq('customer_id', customer.id).order('date', { ascending: false }),
      supabase.from('payments').select('*').eq('customer_id', customer.id).order('date', { ascending: false }),
      supabase.from('adjustments').select('*').eq('customer_id', customer.id).order('date', { ascending: false })
    ]);

    return {
      customer,
      deliveries: (delivRes.data || []).map(mapDeliveryFromDb),
      payments: (payRes.data || []).map(mapPaymentFromDb),
      adjustments: (adjRes.data || []).map(mapAdjustmentFromDb)
    };
  } catch (err) {
    console.warn("Error fetching customer portal data from Supabase:", err);
    return null;
  }
}

/**
 * Cloud Sync mutations (Fire and forget with background error logging)
 */
export async function syncCustomerToSupabase(customer, dairyId) {
  if (!isSupabaseConfigured() || !dairyId) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const row = mapCustomerToDb(customer, dairyId);
    await supabase.from('customers').upsert(row, { onConflict: 'id' });
  } catch (err) {
    console.warn("Supabase sync customer error:", err);
  }
}

export async function syncDeliveryToSupabase(delivery, dairyId) {
  if (!isSupabaseConfigured() || !dairyId) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const row = mapDeliveryToDb(delivery, dairyId);
    await supabase.from('deliveries').upsert(row, { onConflict: 'id' });
  } catch (err) {
    console.warn("Supabase sync delivery error:", err);
  }
}

export async function syncDeliveriesBatchToSupabase(deliveriesList, dairyId) {
  if (!isSupabaseConfigured() || !dairyId || !deliveriesList?.length) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const rows = deliveriesList.map(d => mapDeliveryToDb(d, dairyId));
    await supabase.from('deliveries').upsert(rows, { onConflict: 'id' });
  } catch (err) {
    console.warn("Supabase sync deliveries batch error:", err);
  }
}

export async function deleteDeliveryFromSupabase(deliveryId) {
  if (!isSupabaseConfigured() || !deliveryId) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from('deliveries').delete().eq('id', deliveryId);
  } catch (err) {
    console.warn("Supabase delete delivery error:", err);
  }
}

export async function syncPaymentToSupabase(payment, dairyId) {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const row = mapPaymentToDb(payment, dairyId);
    await supabase.from('payments').upsert(row, { onConflict: 'id' });
  } catch (err) {
    console.warn("Supabase sync payment error:", err);
  }
}

export async function deletePaymentFromSupabase(paymentId) {
  if (!isSupabaseConfigured() || !paymentId) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from('payments').delete().eq('id', paymentId);
  } catch (err) {
    console.warn("Supabase delete payment error:", err);
  }
}

export async function syncAdjustmentToSupabase(adjustment, dairyId) {
  if (!isSupabaseConfigured() || !dairyId) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const row = mapAdjustmentToDb(adjustment, dairyId);
    await supabase.from('adjustments').upsert(row, { onConflict: 'id' });
  } catch (err) {
    console.warn("Supabase sync adjustment error:", err);
  }
}

export async function deleteAdjustmentFromSupabase(adjustmentId) {
  if (!isSupabaseConfigured() || !adjustmentId) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from('adjustments').delete().eq('id', adjustmentId);
  } catch (err) {
    console.warn("Supabase delete adjustment error:", err);
  }
}
