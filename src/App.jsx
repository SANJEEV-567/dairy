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
import CustomerPortalView from './components/CustomerPortalView';

import { 
  loadFromStorage, 
  saveToStorage, 
  generateId 
} from './utils/storage';
import { STORAGE_KEYS } from './utils/constants';
import { getCustomerBalance } from './utils/calculations';
import { roundToTwo, getTodayKolkata } from './utils/formatters';
import { getCurrentUser, logout as authLogout } from './utils/auth';

export default function App() {
  // Current Authenticated User (Seller or Customer)
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  // Navigation active tab: 'dashboard' | 'daily-entry' | 'customers' | 'ledger' | 'billing' | 'payments' | 'backup'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Core Persistent State
  const [customers, setCustomers] = useState(() => 
    loadFromStorage(STORAGE_KEYS.CUSTOMERS, [])
  );
  const [deliveries, setDeliveries] = useState(() => 
    loadFromStorage(STORAGE_KEYS.DELIVERIES, [])
  );
  const [payments, setPayments] = useState(() => 
    loadFromStorage(STORAGE_KEYS.PAYMENTS, [])
  );
  const [adjustments, setAdjustments] = useState(() => 
    loadFromStorage(STORAGE_KEYS.ADJUSTMENTS, [])
  );
  const [statusOverrides, setStatusOverrides] = useState(() => 
    loadFromStorage(STORAGE_KEYS.STATUS_OVERRIDES, [])
  );

  // Sync to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
  }, [customers]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.DELIVERIES, deliveries);
  }, [deliveries]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PAYMENTS, payments);
  }, [payments]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ADJUSTMENTS, adjustments);
  }, [adjustments]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.STATUS_OVERRIDES, statusOverrides);
  }, [statusOverrides]);

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

  // Reload all state from storage (used after backup restore or reset)
  const handleDataReloaded = () => {
    setCustomers(loadFromStorage(STORAGE_KEYS.CUSTOMERS, []));
    setDeliveries(loadFromStorage(STORAGE_KEYS.DELIVERIES, []));
    setPayments(loadFromStorage(STORAGE_KEYS.PAYMENTS, []));
    setAdjustments(loadFromStorage(STORAGE_KEYS.ADJUSTMENTS, []));
    setStatusOverrides(loadFromStorage(STORAGE_KEYS.STATUS_OVERRIDES, []));
  };

  // ----------------------------------------------------
  // Customer Handlers
  // ----------------------------------------------------
  const handleSaveCustomer = (customerData) => {
    try {
      if (customerData.id) {
        // Edit existing customer
        setCustomers(prev => prev.map(c => {
          if (c.id === customerData.id) {
            return {
              ...c,
              name: customerData.name,
              phone: customerData.phone,
              address: customerData.address,
              usualQuantityKg: customerData.usualQuantityKg,
              usualPricePerKg: customerData.usualPricePerKg,
              notes: customerData.notes,
              status: customerData.status,
              updatedAt: new Date().toISOString()
            };
          }
          return c;
        }));
        showToast(`Customer "${customerData.name}" updated successfully.`);
      } else {
        // Add new customer
        const newId = generateId('cust');
        const newCustomer = {
          id: newId,
          name: customerData.name,
          phone: customerData.phone,
          address: customerData.address,
          usualQuantityKg: customerData.usualQuantityKg,
          usualPricePerKg: customerData.usualPricePerKg,
          notes: customerData.notes,
          status: customerData.status || 'active',
          createdAt: new Date().toISOString()
        };

        setCustomers(prev => [...prev, newCustomer]);

        // If an opening balance was entered, record it as an initial balance adjustment
        if (customerData.openingBalance && customerData.openingBalance > 0) {
          const isCredit = customerData.openingBalanceType === 'credit';
          const adj = {
            id: generateId('adj'),
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
        setCustomers(prev => prev.map(c => {
          if (c.id === customer.id) {
            return {
              ...c,
              status: isActivating ? 'active' : 'inactive',
              updatedAt: new Date().toISOString()
            };
          }
          return c;
        }));
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
        // Update existing delivery
        setDeliveries(prev => prev.map(d => {
          if (d.id === deliveryRecord.id) {
            return {
              ...d,
              date: deliveryRecord.date,
              time: deliveryRecord.time,
              quantityKg: deliveryRecord.quantityKg,
              pricePerKg: deliveryRecord.pricePerKg,
              charge: deliveryRecord.charge,
              note: deliveryRecord.note,
              updatedAt: new Date().toISOString()
            };
          }
          return d;
        }));
        showToast("Delivery record updated successfully.");
      } else {
        // Check if there is already a delivery for this customer on this date
        const existing = deliveries.find(
          d => d.customerId === deliveryRecord.customerId && d.date === deliveryRecord.date
        );

        if (existing) {
          setDeliveries(prev => prev.map(d => {
            if (d.id === existing.id) {
              return {
                ...d,
                time: deliveryRecord.time,
                quantityKg: deliveryRecord.quantityKg,
                pricePerKg: deliveryRecord.pricePerKg,
                charge: deliveryRecord.charge,
                note: deliveryRecord.note,
                updatedAt: new Date().toISOString()
              };
            }
            return d;
          }));
          showToast("Existing delivery updated successfully.");
        } else {
          const newDelivery = {
            id: generateId('deliv'),
            ...deliveryRecord,
            createdAt: new Date().toISOString()
          };
          setDeliveries(prev => [...prev, newDelivery]);
          showToast("Delivery recorded successfully.");
        }
      }
    } catch (err) {
      showToast("Failed to save delivery: " + err.message, "error");
    }
  };

  const handleBatchSaveDeliveries = (recordsToSave) => {
    try {
      setDeliveries(prev => {
        let updated = [...prev];
        recordsToSave.forEach(rec => {
          const existingIndex = updated.findIndex(
            d => d.customerId === rec.customerId && d.date === rec.date
          );
          if (existingIndex >= 0) {
            updated[existingIndex] = {
              ...updated[existingIndex],
              time: rec.time,
              quantityKg: rec.quantityKg,
              pricePerKg: rec.pricePerKg,
              charge: rec.charge,
              note: rec.note,
              updatedAt: new Date().toISOString()
            };
          } else {
            updated.push({
              id: generateId('deliv'),
              ...rec,
              createdAt: new Date().toISOString()
            });
          }
        });
        return updated;
      });
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
        setPayments(prev => prev.map(p => {
          if (p.id === paymentRecord.id) {
            return {
              ...p,
              customerId: paymentRecord.customerId,
              amount: paymentRecord.amount,
              date: paymentRecord.date,
              time: paymentRecord.time,
              paymentMethod: paymentRecord.paymentMethod,
              note: paymentRecord.note,
              updatedAt: new Date().toISOString()
            };
          }
          return p;
        }));
        showToast("Payment record updated successfully.");
      } else {
        const newPayment = {
          id: generateId('pay'),
          ...paymentRecord,
          createdAt: new Date().toISOString()
        };
        setPayments(prev => [...prev, newPayment]);
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
        setAdjustments(prev => prev.map(a => {
          if (a.id === adjustmentRecord.id) {
            return {
              ...a,
              customerId: adjustmentRecord.customerId,
              type: adjustmentRecord.type,
              amount: adjustmentRecord.amount,
              date: adjustmentRecord.date,
              time: adjustmentRecord.time,
              reason: adjustmentRecord.reason,
              updatedAt: new Date().toISOString()
            };
          }
          return a;
        }));
        showToast("Adjustment updated successfully.");
      } else {
        const newAdj = {
          id: generateId('adj'),
          ...adjustmentRecord,
          createdAt: new Date().toISOString()
        };
        setAdjustments(prev => [...prev, newAdj]);
        showToast(`Balance adjustment of ₹${adjustmentRecord.amount} recorded.`);
      }
    } catch (err) {
      showToast("Failed to record adjustment: " + err.message, "error");
    }
  };

  // ----------------------------------------------------
  // Status Override Handlers (Preserves Audit History)
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
          showToast("Delivery record deleted.");
        } else if (tx.type === 'payment') {
          setPayments(prev => prev.filter(p => p.id !== tx.id));
          showToast("Payment record deleted.");
        } else if (tx.type === 'adjustment') {
          setAdjustments(prev => prev.filter(a => a.id !== tx.id));
          showToast("Adjustment record deleted.");
        }
      }
    });
  };

  // ----------------------------------------------------
  // Quick View Triggers
  // ----------------------------------------------------
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

  // Calculate total outstanding balance across all customers (all receivables due)
  const totalDueAcrossActiveCustomers = customers
    .reduce((sum, c) => sum + getCustomerBalance(c.id, deliveries, payments, adjustments), 0);

  const handleLogout = () => {
    authLogout();
    setCurrentUser(null);
    showToast("Signed out successfully.");
  };

  // If user is not authenticated, display login & registration page
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

  // If user is a Customer, display Customer Portal
  if (currentUser.role === 'customer') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Toast toast={toast} onClose={() => setToast(null)} />
        <Navbar
          activeTab="customer-portal"
          setActiveTab={() => {}}
          totalDue={0}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <CustomerPortalView
            currentUser={currentUser}
            customers={customers}
            deliveries={deliveries}
            payments={payments}
            adjustments={adjustments}
            statusOverrides={statusOverrides}
            onCustomerPaymentSubmit={handleSavePayment}
            showToast={showToast}
          />
        </main>
        <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500 no-print mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="font-semibold text-slate-700">
              Dr. Sanjay Kumar Dairy — Customer Account Portal
            </p>
            <p className="text-slate-400">
              Direct Daily Milk & Billing Records • Asia/Kolkata
            </p>
          </div>
        </footer>
      </div>
    );
  }

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

      {/* Navigation Bar */}
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
            onDataReloaded={handleDataReloaded}
            showToast={showToast}
          />
        )}
      </main>

      {/* Footer (Hidden in Print) */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500 no-print mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-semibold text-slate-700">
            Dr. Sanjay Kumar Dairy Management System
          </p>
          <p className="text-slate-400">
            Real Business Edition • Local Persistent Storage • Asia/Kolkata Timezone
          </p>
        </div>
      </footer>

    </div>
  );
}
