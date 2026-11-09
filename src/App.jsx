import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import DailyEntryView from './components/DailyEntryView';
import CustomerListView from './components/CustomerListView';
import CustomerLedgerView from './components/CustomerLedgerView';
import MonthlyBillingView from './components/MonthlyBillingView';
import PaymentsView from './components/PaymentsView';
import BackupView from './components/BackupView';
import CustomerModal from './components/CustomerModal';
import PaymentModal from './components/PaymentModal';
import AdjustmentModal from './components/AdjustmentModal';
import DeliveryModal from './components/DeliveryModal';
import ConfirmModal from './components/ConfirmModal';
import Toast from './components/Toast';
import AuthView from './components/AuthView';

import { 
  loadFromStorage, 
  saveToStorage, 
  generateId,
  getScopedKey,
  migrateLegacyRecordsToAccount
} from './utils/storage';
import { STORAGE_KEYS } from './utils/constants';
import { getCustomerBalance } from './utils/calculations';
import { roundToTwo, getTodayKolkata, generateCustomerCode } from './utils/formatters';
import { 
  getActiveSession, 
  subscribeToAuthChanges, 
  signOutUser
} from './utils/authService';
import { 
  fetchSellerDataFromSupabase,
  syncCustomerToSupabase,
  syncDeliveryToSupabase,
  syncDeliveriesBatchToSupabase,
  deleteDeliveryFromSupabase,
  syncPaymentToSupabase,
  deletePaymentFromSupabase,
  syncAdjustmentToSupabase,
  deleteAdjustmentFromSupabase
} from './utils/dbSync';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Navigation active tab for seller
  const [activeTab, setActiveTab] = useState('dashboard');

  // Account-Scoped Persistent State
  const [customers, setCustomers] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [payments, setPayments] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [statusOverrides, setStatusOverrides] = useState([]);

  // UI Modals State
  const [toast, setToast] = useState(null);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [preselectedPaymentCustomer, setPreselectedPaymentCustomer] = useState(null);
  const [prefilledPaymentAmount, setPrefilledPaymentAmount] = useState(null);
  const [paymentToEdit, setPaymentToEdit] = useState(null);

  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [preselectedAdjustmentCustomer, setPreselectedAdjustmentCustomer] = useState(null);
  const [adjustmentToEdit, setAdjustmentToEdit] = useState(null);

  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliveryCustomer, setDeliveryCustomer] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState(null);
  const [deliveryToEdit, setDeliveryToEdit] = useState(null);

  const [selectedLedgerCustomerId, setSelectedLedgerCustomerId] = useState(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    isDanger: true,
    onConfirm: () => {}
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // 1. Initial Session Check on App Mount
  useEffect(() => {
    let mounted = true;

    getActiveSession()
      .then(user => {
        if (mounted) {
          setCurrentUser(user);
          setAuthChecking(false);
        }
      })
      .catch(err => {
        console.error("Session check failed:", err);
        if (mounted) {
          setAuthChecking(false);
        }
      });

    // Listen to real-time auth changes from Supabase (sign in, sign out, token refresh)
    const unsubscribe = subscribeToAuthChanges((event, user) => {
      if (mounted) {
        setCurrentUser(user);
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // 2. Load and Sync Account-Scoped Records whenever currentUser changes
  useEffect(() => {
    if (!currentUser?.id) {
      setCustomers([]);
      setDeliveries([]);
      setPayments([]);
      setAdjustments([]);
      setStatusOverrides([]);
      return;
    }

    const userId = currentUser.id;

    // Migrate any legacy unassigned records to this authenticated dairy account
    const migrationResult = migrateLegacyRecordsToAccount(userId);
    if (migrationResult.migrated) {
      showToast(`Migrated ${migrationResult.stats.customers} existing local customers to your authenticated dairy account!`, 'info');
    }

    // Load account-scoped records
    const scopedCust = loadFromStorage(getScopedKey(STORAGE_KEYS.CUSTOMERS, userId), []);
    const scopedDeliv = loadFromStorage(getScopedKey(STORAGE_KEYS.DELIVERIES, userId), []);
    const scopedPay = loadFromStorage(getScopedKey(STORAGE_KEYS.PAYMENTS, userId), []);
    const scopedAdj = loadFromStorage(getScopedKey(STORAGE_KEYS.ADJUSTMENTS, userId), []);
    const scopedOvr = loadFromStorage(getScopedKey(STORAGE_KEYS.STATUS_OVERRIDES, userId), []);

    // Ensure all existing customers have a unique customerCode
    const existingCodes = [];
    let codesUpdated = false;
    const withCodes = scopedCust.map(c => {
      if (!c.customerCode) {
        const code = generateCustomerCode(existingCodes);
        existingCodes.push({ customerCode: code });
        codesUpdated = true;
        return { ...c, customerCode: code };
      }
      existingCodes.push({ customerCode: c.customerCode });
      return c;
    });

    if (codesUpdated) {
      saveToStorage(getScopedKey(STORAGE_KEYS.CUSTOMERS, userId), withCodes);
    }

    setCustomers(withCodes);
    setDeliveries(scopedDeliv);
    setPayments(scopedPay);
    setAdjustments(scopedAdj);
    setStatusOverrides(scopedOvr);

    // Live remote sync from Supabase PostgreSQL for multi-device sync
    fetchSellerDataFromSupabase(userId).then(remote => {
      if (remote && remote.customers && remote.customers.length > 0) {
        setCustomers(remote.customers);
        setDeliveries(remote.deliveries);
        setPayments(remote.payments);
        setAdjustments(remote.adjustments);
      } else if (withCodes.length > 0) {
        // If Supabase has no records yet, seed local dairy records to Supabase
        withCodes.forEach(c => syncCustomerToSupabase(c, userId));
        scopedDeliv.forEach(d => syncDeliveryToSupabase(d, userId));
        scopedPay.forEach(p => syncPaymentToSupabase(p, userId));
        scopedAdj.forEach(a => syncAdjustmentToSupabase(a, userId));
      }
    }).catch(() => {});
  }, [currentUser?.id, currentUser?.role]);

  // Sync to account-scoped storage whenever seller state updates
  useEffect(() => {
    if (currentUser?.id && currentUser.role === 'seller') {
      saveToStorage(getScopedKey(STORAGE_KEYS.CUSTOMERS, currentUser.id), customers);
    }
  }, [customers, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.id && currentUser.role === 'seller') {
      saveToStorage(getScopedKey(STORAGE_KEYS.DELIVERIES, currentUser.id), deliveries);
    }
  }, [deliveries, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.id && currentUser.role === 'seller') {
      saveToStorage(getScopedKey(STORAGE_KEYS.PAYMENTS, currentUser.id), payments);
    }
  }, [payments, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.id && currentUser.role === 'seller') {
      saveToStorage(getScopedKey(STORAGE_KEYS.ADJUSTMENTS, currentUser.id), adjustments);
    }
  }, [adjustments, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (currentUser?.id && currentUser.role === 'seller') {
      saveToStorage(getScopedKey(STORAGE_KEYS.STATUS_OVERRIDES, currentUser.id), statusOverrides);
    }
  }, [statusOverrides, currentUser?.id, currentUser?.role]);

  // Reload data for account
  const handleDataReloaded = () => {
    if (!currentUser?.id) return;
    const userId = currentUser.id;
    setCustomers(loadFromStorage(getScopedKey(STORAGE_KEYS.CUSTOMERS, userId), []));
    setDeliveries(loadFromStorage(getScopedKey(STORAGE_KEYS.DELIVERIES, userId), []));
    setPayments(loadFromStorage(getScopedKey(STORAGE_KEYS.PAYMENTS, userId), []));
    setAdjustments(loadFromStorage(getScopedKey(STORAGE_KEYS.ADJUSTMENTS, userId), []));
    setStatusOverrides(loadFromStorage(getScopedKey(STORAGE_KEYS.STATUS_OVERRIDES, userId), []));
  };

  const handleLogout = async () => {
    await signOutUser();
    setCurrentUser(null);
    showToast("Signed out successfully.");
  };

  // ----------------------------------------------------
  // Customer Handlers
  // ----------------------------------------------------
  const handleSaveCustomer = (customerData) => {
    try {
      if (customerData.id) {
        let updatedCustomer = null;
        setCustomers(prev => prev.map(c => {
          if (c.id === customerData.id) {
            updatedCustomer = {
              ...c,
              name: customerData.name,
              customerCode: customerData.customerCode || c.customerCode || generateCustomerCode(customers),
              phone: customerData.phone,
              address: customerData.address,
              usualQuantityKg: customerData.usualQuantityKg,
              usualPricePerKg: customerData.usualPricePerKg,
              notes: customerData.notes,
              status: customerData.status,
              updatedAt: new Date().toISOString()
            };
            return updatedCustomer;
          }
          return c;
        }));
        if (updatedCustomer) syncCustomerToSupabase(updatedCustomer, currentUser?.id);
        showToast(`Customer "${customerData.name}" updated successfully.`);
      } else {
        const newId = generateId('cust');
        const code = customerData.customerCode || generateCustomerCode(customers);
        const newCustomer = {
          id: newId,
          dairy_id: currentUser?.id,
          name: customerData.name,
          customerCode: code,
          phone: customerData.phone,
          address: customerData.address,
          usualQuantityKg: customerData.usualQuantityKg,
          usualPricePerKg: customerData.usualPricePerKg,
          notes: customerData.notes,
          status: customerData.status || 'active',
          createdAt: new Date().toISOString()
        };

        setCustomers(prev => [...prev, newCustomer]);
        syncCustomerToSupabase(newCustomer, currentUser?.id);

        if (customerData.openingBalance && customerData.openingBalance > 0) {
          const isCredit = customerData.openingBalanceType === 'credit';
          const adj = {
            id: generateId('adj'),
            dairy_id: currentUser?.id,
            customerId: newId,
            type: isCredit ? 'credit' : 'debit',
            amount: customerData.openingBalance,
            date: getTodayKolkata(),
            time: '00:00',
            reason: isCredit
              ? 'Opening Advance Credit (Initial setup)'
              : 'Opening Balance Due (Initial setup)'
          };
          setAdjustments(prev => [...prev, adj]);
          syncAdjustmentToSupabase(adj, currentUser?.id);
        }

        showToast(`Customer "${customerData.name}" added successfully.`);
      }
    } catch (err) {
      showToast("Failed to save customer: " + err.message, "error");
    }
  };

  const handleToggleCustomerStatus = (customer) => {
    const isActivating = customer.status === 'inactive';
    setConfirmModal({
      isOpen: true,
      title: isActivating ? "Reactivate Customer" : "Deactivate Customer",
      message: isActivating
        ? `Are you sure you want to reactivate "${customer.name}"? They will appear in the daily milk entry sheet again.`
        : `Are you sure you want to deactivate "${customer.name}"? Past deliveries, bills, and payment records will be completely preserved.`,
      confirmLabel: isActivating ? "Reactivate" : "Deactivate",
      isDanger: !isActivating,
      onConfirm: () => {
        let updatedCustomer = null;
        setCustomers(prev => prev.map(c => {
          if (c.id === customer.id) {
            updatedCustomer = {
              ...c,
              status: isActivating ? 'active' : 'inactive',
              updatedAt: new Date().toISOString()
            };
            return updatedCustomer;
          }
          return c;
        }));
        if (updatedCustomer) syncCustomerToSupabase(updatedCustomer, currentUser?.id);
        showToast(`Customer "${customer.name}" ${isActivating ? 'reactivated' : 'deactivated'} successfully.`);
      }
    });
  };

  // ----------------------------------------------------
  // Delivery Handlers
  // ----------------------------------------------------
  const handleSaveDelivery = (deliveryRecord) => {
    try {
      if (deliveryRecord.id) {
        let updatedRecord = null;
        setDeliveries(prev => prev.map(d => {
          if (d.id === deliveryRecord.id) {
            updatedRecord = {
              ...d,
              date: deliveryRecord.date,
              time: deliveryRecord.time,
              quantityKg: deliveryRecord.quantityKg,
              pricePerKg: deliveryRecord.pricePerKg,
              charge: deliveryRecord.charge,
              note: deliveryRecord.note,
              updatedAt: new Date().toISOString()
            };
            return updatedRecord;
          }
          return d;
        }));
        if (updatedRecord) syncDeliveryToSupabase(updatedRecord, currentUser?.id);
        showToast("Delivery record updated successfully.");
      } else {
        const existing = deliveries.find(
          d => d.customerId === deliveryRecord.customerId && d.date === deliveryRecord.date
        );

        if (existing) {
          let updatedRecord = null;
          setDeliveries(prev => prev.map(d => {
            if (d.id === existing.id) {
              updatedRecord = {
                ...d,
                time: deliveryRecord.time,
                quantityKg: deliveryRecord.quantityKg,
                pricePerKg: deliveryRecord.pricePerKg,
                charge: deliveryRecord.charge,
                note: deliveryRecord.note,
                updatedAt: new Date().toISOString()
              };
              return updatedRecord;
            }
            return d;
          }));
          if (updatedRecord) syncDeliveryToSupabase(updatedRecord, currentUser?.id);
          showToast("Existing delivery updated successfully.");
        } else {
          const newDelivery = {
            id: generateId('deliv'),
            dairy_id: currentUser?.id,
            ...deliveryRecord,
            createdAt: new Date().toISOString()
          };
          setDeliveries(prev => [...prev, newDelivery]);
          syncDeliveryToSupabase(newDelivery, currentUser?.id);
          showToast("Delivery recorded successfully.");
        }
      }
    } catch (err) {
      showToast("Failed to save delivery: " + err.message, "error");
    }
  };

  const handleBatchSaveDeliveries = (recordsToSave) => {
    try {
      const savedBatch = [];
      setDeliveries(prev => {
        let updated = [...prev];
        recordsToSave.forEach(rec => {
          const existingIndex = updated.findIndex(
            d => d.customerId === rec.customerId && d.date === rec.date
          );
          if (existingIndex >= 0) {
            const updatedRec = {
              ...updated[existingIndex],
              time: rec.time,
              quantityKg: rec.quantityKg,
              pricePerKg: rec.pricePerKg,
              charge: rec.charge,
              note: rec.note,
              updatedAt: new Date().toISOString()
            };
            updated[existingIndex] = updatedRec;
            savedBatch.push(updatedRec);
          } else {
            const newRec = {
              id: generateId('deliv'),
              dairy_id: currentUser?.id,
              ...rec,
              createdAt: new Date().toISOString()
            };
            updated.push(newRec);
            savedBatch.push(newRec);
          }
        });
        return updated;
      });
      if (savedBatch.length > 0) {
        syncDeliveriesBatchToSupabase(savedBatch, currentUser?.id);
      }
      showToast(`Saved ${recordsToSave.length} daily delivery entries successfully!`);
    } catch (err) {
      showToast("Failed to save daily entries: " + err.message, "error");
    }
  };

  // ----------------------------------------------------
  // Payment Handlers
  // ----------------------------------------------------
  const handleSavePayment = (paymentRecord) => {
    try {
      if (paymentRecord.id) {
        let updatedPayment = null;
        setPayments(prev => prev.map(p => {
          if (p.id === paymentRecord.id) {
            updatedPayment = {
              ...p,
              customerId: paymentRecord.customerId,
              amount: paymentRecord.amount,
              date: paymentRecord.date,
              time: paymentRecord.time,
              paymentMethod: paymentRecord.paymentMethod,
              note: paymentRecord.note,
              updatedAt: new Date().toISOString()
            };
            return updatedPayment;
          }
          return p;
        }));
        if (updatedPayment) syncPaymentToSupabase(updatedPayment, currentUser?.id);
        showToast("Payment record updated successfully.");
      } else {
        const newPayment = {
          id: generateId('pay'),
          dairy_id: currentUser?.id,
          ...paymentRecord,
          createdAt: new Date().toISOString()
        };
        setPayments(prev => [...prev, newPayment]);
        syncPaymentToSupabase(newPayment, currentUser?.id);
        showToast(`Payment of ₹${paymentRecord.amount} recorded successfully.`);
      }
    } catch (err) {
      showToast("Failed to record payment: " + err.message, "error");
    }
  };

  // ----------------------------------------------------
  // Adjustment Handlers
  // ----------------------------------------------------
  const handleSaveAdjustment = (adjustmentRecord) => {
    try {
      if (adjustmentRecord.id) {
        let updatedAdj = null;
        setAdjustments(prev => prev.map(a => {
          if (a.id === adjustmentRecord.id) {
            updatedAdj = {
              ...a,
              customerId: adjustmentRecord.customerId,
              type: adjustmentRecord.type,
              amount: adjustmentRecord.amount,
              date: adjustmentRecord.date,
              time: adjustmentRecord.time,
              reason: adjustmentRecord.reason,
              updatedAt: new Date().toISOString()
            };
            return updatedAdj;
          }
          return a;
        }));
        if (updatedAdj) syncAdjustmentToSupabase(updatedAdj, currentUser?.id);
        showToast("Adjustment updated successfully.");
      } else {
        const newAdj = {
          id: generateId('adj'),
          dairy_id: currentUser?.id,
          ...adjustmentRecord,
          createdAt: new Date().toISOString()
        };
        setAdjustments(prev => [...prev, newAdj]);
        syncAdjustmentToSupabase(newAdj, currentUser?.id);
        showToast(`Balance adjustment of ₹${adjustmentRecord.amount} recorded.`);
      }
    } catch (err) {
      showToast("Failed to record adjustment: " + err.message, "error");
    }
  };

  // ----------------------------------------------------
  // Status Override Handlers
  // ----------------------------------------------------
  const handleSaveStatusOverride = ({ customerId, month, status, reason }) => {
    setStatusOverrides(prev => {
      const filtered = prev.filter(s => !(s.customerId === customerId && s.month === month));
      return [
        ...filtered,
        {
          id: generateId('ovr'),
          customerId,
          month,
          status,
          reason,
          timestamp: new Date().toISOString()
        }
      ];
    });
    showToast(`Bill status updated to "${status}".`);
  };

  const handleRemoveStatusOverride = (customerId, month) => {
    setStatusOverrides(prev => 
      prev.filter(s => !(s.customerId === customerId && s.month === month))
    );
    showToast("Status reset to calculated ledger value.");
  };

  // ----------------------------------------------------
  // Transaction Editing & Deletion from Ledger
  // ----------------------------------------------------
  const handleEditTransaction = (tx) => {
    if (tx.type === 'delivery') {
      setDeliveryToEdit(tx.raw);
      setDeliveryCustomer(customers.find(c => c.id === tx.raw.customerId));
      setDeliveryDate(tx.raw.date);
      setDeliveryModalOpen(true);
    } else if (tx.type === 'payment') {
      setPaymentToEdit(tx.raw);
      setPaymentModalOpen(true);
    } else if (tx.type === 'adjustment') {
      setAdjustmentToEdit(tx.raw);
      setAdjustmentModalOpen(true);
    }
  };

  const handleDeleteTransaction = (tx) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Transaction",
      message: `Are you sure you want to permanently delete this ${tx.type} transaction dated ${tx.date}? The running ledger and customer balance will update immediately.`,
      confirmLabel: "Delete Record",
      isDanger: true,
      onConfirm: () => {
        if (tx.type === 'delivery') {
          setDeliveries(prev => prev.filter(d => d.id !== tx.id));
          deleteDeliveryFromSupabase(tx.id);
          showToast("Delivery record deleted.");
        } else if (tx.type === 'payment') {
          setPayments(prev => prev.filter(p => p.id !== tx.id));
          deletePaymentFromSupabase(tx.id);
          showToast("Payment record deleted.");
        } else if (tx.type === 'adjustment') {
          setAdjustments(prev => prev.filter(a => a.id !== tx.id));
          deleteAdjustmentFromSupabase(tx.id);
          showToast("Adjustment record deleted.");
        }
      }
    });
  };

  // Quick Action Triggers
  const openRecordDeliveryForCustomer = (customer, date = null, existingDelivery = null) => {
    setDeliveryCustomer(customer);
    setDeliveryDate(date);
    setDeliveryToEdit(existingDelivery);
    setDeliveryModalOpen(true);
  };

  const openRecordPaymentForCustomer = (customer = null, fillAmount = null) => {
    setPreselectedPaymentCustomer(customer);
    setPrefilledPaymentAmount(fillAmount);
    setPaymentToEdit(null);
    setPaymentModalOpen(true);
  };

  const openCustomerLedger = (customer) => {
    setSelectedLedgerCustomerId(customer.id);
    setActiveTab('ledger');
  };

  const openAddCustomer = () => {
    setCustomerToEdit(null);
    setCustomerModalOpen(true);
  };

  const openEditCustomer = (customer) => {
    setCustomerToEdit(customer);
    setCustomerModalOpen(true);
  };

  const openAddAdjustment = (customer) => {
    setPreselectedAdjustmentCustomer(customer);
    setAdjustmentToEdit(null);
    setAdjustmentModalOpen(true);
  };

  // Calculate total outstanding balance across all customer accounts
  const totalDueAcrossActiveCustomers = customers
    .reduce((sum, c) => sum + getCustomerBalance(c.id, deliveries, payments, adjustments), 0);

  // ----------------------------------------------------
  // Render States: Auth Loading, Login Screen, Customer View, Seller View
  // ----------------------------------------------------
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 animate-pulse flex items-center justify-center text-white mb-4">
          <span className="font-black text-xl">D</span>
        </div>
        <p className="text-sm font-semibold text-slate-300">
          Connecting to Dr. Sanjay Kumar Dairy secure session...
        </p>
      </div>
    );
  }

  // Not signed in: Show Login / Sign Up / Password Reset flow
  if (!currentUser) {
    return (
      <>
        <Toast toast={toast} onClose={() => setToast(null)} />
        <AuthView 
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            setActiveTab('dashboard');
          }} 
          showToast={showToast} 
        />
      </>
    );
  }

  // Signed in as Authorized Seller: Show Full Milk Management & Billing System
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        isDanger={confirmModal.isDanger}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Customer Add/Edit Modal */}
      <CustomerModal
        isOpen={customerModalOpen}
        customerToEdit={customerToEdit}
        customers={customers}
        onSave={handleSaveCustomer}
        onClose={() => {
          setCustomerModalOpen(false);
          setCustomerToEdit(null);
        }}
      />

      {/* Payment Record/Edit Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        preselectedCustomer={preselectedPaymentCustomer}
        prefilledAmount={prefilledPaymentAmount}
        paymentToEdit={paymentToEdit}
        customers={customers}
        deliveries={deliveries}
        payments={payments}
        adjustments={adjustments}
        onSave={handleSavePayment}
        onClose={() => {
          setPaymentModalOpen(false);
          setPreselectedPaymentCustomer(null);
          setPrefilledPaymentAmount(null);
          setPaymentToEdit(null);
        }}
      />

      {/* Manual Balance Adjustment Modal */}
      <AdjustmentModal
        isOpen={adjustmentModalOpen}
        preselectedCustomer={preselectedAdjustmentCustomer}
        adjustmentToEdit={adjustmentToEdit}
        customers={customers}
        onSave={handleSaveAdjustment}
        onClose={() => {
          setAdjustmentModalOpen(false);
          setPreselectedAdjustmentCustomer(null);
          setAdjustmentToEdit(null);
        }}
      />

      {/* Single Delivery Modal */}
      <DeliveryModal
        isOpen={deliveryModalOpen}
        customer={deliveryCustomer}
        date={deliveryDate}
        deliveryToEdit={deliveryToEdit}
        customers={customers}
        onSave={handleSaveDelivery}
        onClose={() => {
          setDeliveryModalOpen(false);
          setDeliveryCustomer(null);
          setDeliveryDate(null);
          setDeliveryToEdit(null);
        }}
      />

      {/* Navigation Bar with User Identity & Logout */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalDue={totalDueAcrossActiveCustomers}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Page Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            customers={customers}
            deliveries={deliveries}
            payments={payments}
            adjustments={adjustments}
            onOpenAddCustomer={openAddCustomer}
            onOpenRecordDelivery={openRecordDeliveryForCustomer}
            onOpenRecordPayment={openRecordPaymentForCustomer}
            onOpenCustomerLedger={openCustomerLedger}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'daily-entry' && (
          <DailyEntryView
            customers={customers}
            deliveries={deliveries}
            payments={payments}
            adjustments={adjustments}
            onSaveDelivery={handleSaveDelivery}
            onBatchSaveDeliveries={handleBatchSaveDeliveries}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerListView
            customers={customers}
            deliveries={deliveries}
            payments={payments}
            adjustments={adjustments}
            onOpenAddCustomer={openAddCustomer}
            onOpenEditCustomer={openEditCustomer}
            onToggleCustomerStatus={handleToggleCustomerStatus}
            onOpenCustomerLedger={openCustomerLedger}
            onOpenRecordPayment={openRecordPaymentForCustomer}
          />
        )}

        {activeTab === 'ledger' && (
          <CustomerLedgerView
            customers={customers}
            deliveries={deliveries}
            payments={payments}
            adjustments={adjustments}
            selectedCustomerId={selectedLedgerCustomerId}
            onSelectCustomer={setSelectedLedgerCustomerId}
            onOpenRecordDelivery={openRecordDeliveryForCustomer}
            onOpenRecordPayment={openRecordPaymentForCustomer}
            onOpenAddAdjustment={openAddAdjustment}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === 'billing' && (
          <MonthlyBillingView
            customers={customers}
            deliveries={deliveries}
            payments={payments}
            adjustments={adjustments}
            statusOverrides={statusOverrides}
            onOpenRecordPayment={openRecordPaymentForCustomer}
            onSaveStatusOverride={handleSaveStatusOverride}
            onRemoveStatusOverride={handleRemoveStatusOverride}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsView
            customers={customers}
            payments={payments}
            onOpenRecordPayment={openRecordPaymentForCustomer}
            onEditPayment={(p) => {
              setPaymentToEdit(p);
              setPaymentModalOpen(true);
            }}
            onDeletePayment={(p) => {
              setConfirmModal({
                isOpen: true,
                title: "Delete Payment Record",
                message: `Are you sure you want to delete this payment of ₹${p.amount} received on ${p.date}? Customer balance will be restored accordingly.`,
                confirmLabel: "Delete Payment",
                isDanger: true,
                onConfirm: () => {
                  setPayments(prev => prev.filter(item => item.id !== p.id));
                  showToast("Payment record deleted.");
                }
              });
            }}
          />
        )}

        {activeTab === 'backup' && (
          <BackupView
            customers={customers}
            deliveries={deliveries}
            payments={payments}
            adjustments={adjustments}
            currentUser={currentUser}
            onDataReloaded={handleDataReloaded}
            showToast={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500 no-print mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-semibold text-slate-700">
            Dr. Sanjay Kumar Dairy Management System
          </p>
          <p className="text-slate-400">
            Authenticated Account: {currentUser.email} • Row-Level Security Enforced
          </p>
        </div>
      </footer>

    </div>
  );
}
