import React, { useState } from 'react';
import { 
  Milk, 
  Receipt, 
  Wallet, 
  Calendar, 
  Printer, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Phone, 
  MapPin, 
  Share2, 
  FileText, 
  Send, 
  KeyRound, 
  ShieldCheck, 
  Link2,
  Unlink
} from 'lucide-react';
import { 
  DAIRY_NAME, 
  DAIRY_PHONE, 
  DAIRY_LOCATION, 
  DAIRY_TAGLINE 
} from '../utils/constants';
import { 
  formatINR, 
  formatKg, 
  formatDateIndian, 
  formatDateShort, 
  formatTimeIndian, 
  formatMonthYear, 
  getRecentMonthOptions,
  getTodayKolkata,
  getCurrentTimeKolkata 
} from '../utils/formatters';
import { calculateCustomerLedger, generateMonthlyBill } from '../utils/calculations';

export default function CustomerPortalView({
  currentUser,
  customers = [],
  deliveries = [],
  payments = [],
  adjustments = [],
  statusOverrides = [],
  onLinkAccount,
  onCustomerPaymentSubmit,
  showToast
}) {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'deliveries' | 'bills' | 'ledger' | 'pay'
  const monthOptions = getRecentMonthOptions(6);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || '');
  
  // Connection Form State
  const [inputCode, setInputCode] = useState(currentUser?.customerCode || '');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  // UPI Submission form
  const [upiAmount, setUpiAmount] = useState('');
  const [upiRefNumber, setUpiRefNumber] = useState('');
  const [upiMethod, setUpiMethod] = useState('UPI (GPay / PhonePe / Paytm)');

  // Match the logged-in customer strictly by linked account or seller-issued code
  // NEVER automatically expose records based solely on matching email or names!
  const customerRecord = customers.find(c => 
    (c.linkedUserId && c.linkedUserId === currentUser.id) ||
    (currentUser.customerCode && c.customerCode && c.customerCode.toUpperCase() === currentUser.customerCode.toUpperCase()) ||
    (c.id === currentUser.customerId)
  ) || null;

  const handleConnectCode = async (e) => {
    e.preventDefault();
    setLinkError('');
    const cleanCode = inputCode.trim().toUpperCase();

    if (!cleanCode) {
      setLinkError("Please enter your Seller-Issued Customer Code.");
      return;
    }

    if (!onLinkAccount) {
      setLinkError("Linking handler not configured.");
      return;
    }

    setLinking(true);
    const result = await onLinkAccount(cleanCode);
    setLinking(false);

    if (result.success) {
      showToast(`Successfully connected to ${result.customerName || 'your customer record'}!`, 'success');
      setLinkError('');
    } else {
      setLinkError(result.error || "Invalid customer code. Please check with Dr. Sanjay Kumar Dairy.");
    }
  };

  // If customer account is not yet connected to a seller customer record, show Connection Screen
  if (!customerRecord) {
    return (
      <div className="max-w-xl mx-auto py-8 sm:py-12 px-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xl text-center">
          
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50/50">
            <KeyRound className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Connect to Dr. Sanjay Kumar Dairy
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            To ensure complete privacy and confidentiality, <strong>Dr. Sanjay Kumar Dairy</strong> issues a personal <strong>Customer Code</strong> (e.g. <code>DSK-1001</code>) to each milk buyer. Only your authenticated account with this code can view your deliveries and bills.
          </p>

          <form onSubmit={handleConnectCode} className="mt-8 space-y-4 max-w-sm mx-auto text-left">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Seller-Issued Customer Code <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. DSK-1001"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  className="w-full pl-9 pr-3 py-2.5 text-base font-mono font-bold uppercase tracking-wider rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Found on your printed milk bill, monthly WhatsApp slip, or provided directly by Dr. Sanjay Kumar Dairy.
              </p>
            </div>

            {linkError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{linkError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={linking}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-700/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              <span>{linking ? 'Verifying Code...' : 'Connect Milk Account'}</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Strict Row-Level Isolation • Encrypted Sessions</span>
          </div>

        </div>
      </div>
    );
  }

  // Calculate customer ledger & current balance for the verified customer
  const ledger = calculateCustomerLedger(
    customerRecord.id,
    deliveries,
    payments,
    adjustments
  );

  // Generate current month bill
  const monthlyBill = generateMonthlyBill(
    customerRecord,
    selectedMonth,
    deliveries,
    payments,
    adjustments,
    statusOverrides
  );

  // Customer's deliveries (most recent first)
  const myDeliveries = deliveries
    .filter(d => d.customerId === customerRecord.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Customer's payments (most recent first)
  const myPayments = payments
    .filter(p => p.customerId === customerRecord.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handlePrint = () => {
    window.print();
  };

  const handleOnlinePaymentSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(upiAmount || ledger.currentBalance);
    if (isNaN(amt) || amt <= 0) {
      showToast("Please enter a valid payment amount", "error");
      return;
    }
    if (!upiRefNumber.trim()) {
      showToast("Please enter your UPI / Transaction reference number", "error");
      return;
    }

    onCustomerPaymentSubmit({
      customerId: customerRecord.id,
      amount: amt,
      date: getTodayKolkata(),
      time: getCurrentTimeKolkata(),
      paymentMethod: upiMethod,
      note: `Online Payment (Ref: ${upiRefNumber.trim()})`
    });

    setUpiRefNumber('');
    setUpiAmount('');
    showToast("Payment recorded successfully! Balance updated immediately.", "success");
    setActiveTab('ledger');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Milk className="w-3.5 h-3.5" />
                Customer Milk Account Portal
              </span>
              {customerRecord.customerCode && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/10 text-emerald-200 border border-white/20">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  Code: {customerRecord.customerCode}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Welcome, {customerRecord.name}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg">
              Supplied by <strong>{DAIRY_NAME}</strong> • Daily fresh milk delivered to your home.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-300">
              {customerRecord.phone && <span>📞 {customerRecord.phone}</span>}
              {customerRecord.address && <span>📍 {customerRecord.address}</span>}
              <span>🥛 Usual: {formatKg(customerRecord.usualQuantityKg)} @ {formatINR(customerRecord.usualPricePerKg)}/kg</span>
            </div>
          </div>

          {/* Current Outstanding Balance Card */}
          <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 sm:min-w-[240px] text-right">
            <span className="text-xs uppercase font-extrabold tracking-wider text-slate-300 block">
              Current Balance Due
            </span>
            <div className={`text-3xl font-black font-mono-numbers mt-1 ${
              ledger.currentBalance > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {formatINR(ledger.currentBalance)}
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              {ledger.currentBalance > 0 
                ? 'Payment pending' 
                : ledger.currentBalance < 0 
                ? 'Advance payment credit' 
                : 'All dues cleared'}
            </p>

            {ledger.currentBalance > 0 && (
              <button
                onClick={() => setActiveTab('pay')}
                className="mt-3 w-full py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Pay Bill Online (UPI)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex p-1.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto no-print">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'summary'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Milk className="w-4 h-4" />
          <span>My Milk Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('deliveries')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'deliveries'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Daily Deliveries ({myDeliveries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bills')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'bills'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Monthly Bills & Invoices</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'ledger'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Payment Ledger ({myPayments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pay')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'pay'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Pay via UPI / QR</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* 1. Account Summary Tab */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-bold uppercase text-slate-500">Total Milk Received</span>
            <div className="text-2xl font-black font-mono-numbers text-slate-900 mt-2">
              {formatKg(myDeliveries.reduce((sum, d) => sum + (d.quantityKg || 0), 0))}
            </div>
            <p className="text-xs text-slate-500 mt-1">Across all logged deliveries</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-bold uppercase text-slate-500">Total Payments Made</span>
            <div className="text-2xl font-black font-mono-numbers text-emerald-600 mt-2">
              {formatINR(myPayments.reduce((sum, p) => sum + (p.amount || 0), 0))}
            </div>
            <p className="text-xs text-slate-500 mt-1">{myPayments.length} recorded payments</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-xs font-bold uppercase text-slate-500">Usual Daily Milk Rate</span>
            <div className="text-2xl font-black font-mono-numbers text-slate-900 mt-2">
              {formatINR(customerRecord.usualPricePerKg)}/kg
            </div>
            <p className="text-xs text-slate-500 mt-1">Fixed daily supply price</p>
          </div>
        </div>
      )}

      {/* 2. Daily Deliveries Tab */}
      {activeTab === 'deliveries' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Your Daily Milk Delivery Log
            </h2>
            <span className="text-xs text-slate-500">
              Showing {myDeliveries.length} days
            </span>
          </div>

          {myDeliveries.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No deliveries recorded yet. Daily records added by Dr. Sanjay Kumar Dairy will appear here automatically.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4 text-right">Quantity (kg)</th>
                    <th className="py-3 px-4 text-right">Rate (₹/kg)</th>
                    <th className="py-3 px-4 text-right">Daily Charge</th>
                    <th className="py-3 px-4">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myDeliveries.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatDateIndian(d.date)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {d.time ? formatTimeIndian(d.time) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers font-semibold text-slate-800">
                        {d.quantityKg === 0 ? (
                          <span className="text-amber-600 font-bold">0 kg (No Milk)</span>
                        ) : (
                          formatKg(d.quantityKg)
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers text-slate-600">
                        {formatINR(d.pricePerKg)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-numbers font-black text-slate-900">
                        {formatINR(d.charge)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 italic">
                        {d.note || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Monthly Bills Tab */}
      {activeTab === 'bills' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between no-print">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 uppercase">Select Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {monthOptions.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-slate-800 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
            </button>
          </div>

          {/* Printable Monthly Bill */}
          {monthlyBill && (
            <div className="printable-bill bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-md max-w-4xl mx-auto">
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{DAIRY_NAME}</h2>
                  <p className="text-xs text-slate-600 mt-1">{DAIRY_TAGLINE}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{DAIRY_LOCATION} • {DAIRY_PHONE}</p>
                </div>
                <div className="sm:text-right text-xs">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold uppercase rounded mb-2">
                    Monthly Milk Bill
                  </span>
                  <div>Billing Month: <strong>{formatMonthYear(monthlyBill.monthStr)}</strong></div>
                  <div>Bill Date: {formatDateIndian(getTodayKolkata())}</div>
                </div>
              </div>

              {/* Bill To */}
              <div className="py-4 border-b border-slate-200 flex justify-between items-center text-sm">
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase block">Customer</span>
                  <div className="font-bold text-slate-900">{customerRecord.name}</div>
                  {customerRecord.phone && <div className="text-xs text-slate-500">{customerRecord.phone}</div>}
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-bold uppercase block mb-1">Status</span>
                  <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${
                    monthlyBill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {monthlyBill.status}
                  </span>
                </div>
              </div>

              {/* Summary Totals */}
              <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
                <div className="w-72 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Total Milk Quantity:</span>
                    <strong>{formatKg(monthlyBill.totalKg)}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Month Charges:</span>
                    <strong>{formatINR(monthlyBill.totalMilkCharges)}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Previous Outstanding:</span>
                    <strong>{formatINR(monthlyBill.previousOutstandingBalance)}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700">
                    <span>Payments Received:</span>
                    <strong>-{formatINR(monthlyBill.totalPaymentsInMonth)}</strong>
                  </div>
                  <div className="flex justify-between py-2 border-t-2 border-slate-900 text-base font-black">
                    <span>FINAL AMOUNT DUE:</span>
                    <span className="text-rose-600 font-mono-numbers">{formatINR(monthlyBill.finalAmountDue)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Payment Ledger Tab */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              Account Transaction Statement & Running Balance
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Debit (+) Charge</th>
                  <th className="py-3 px-4 text-right">Credit (−) Payment</th>
                  <th className="py-3 px-4 text-right">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatDateIndian(tx.date)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        tx.type === 'delivery' 
                          ? 'bg-blue-100 text-blue-800' 
                          : tx.type === 'payment'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {tx.type === 'delivery' ? 'Milk Delivery' : tx.type === 'payment' ? 'Payment' : 'Adjustment'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers text-rose-600 font-semibold">
                      {tx.effect === 'debit' ? `+${formatINR(tx.amount)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers text-emerald-600 font-semibold">
                      {tx.effect === 'credit' ? `-${formatINR(tx.amount)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-numbers font-black text-slate-900">
                      {formatINR(tx.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Pay via UPI / QR Tab */}
      {activeTab === 'pay' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs max-w-xl mx-auto">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900">
              Pay Milk Bill via UPI
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Scan QR code with Google Pay, PhonePe, Paytm, or BHIM UPI
            </p>

            {/* UPI QR Display */}
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl inline-block shadow-inner">
              <svg className="w-48 h-48 mx-auto" viewBox="0 0 100 100" fill="currentColor">
                {/* Clean realistic QR code illustration */}
                <rect width="100" height="100" fill="#ffffff" />
                <path d="M10 10h30v30h-30zM15 15h20v20h-20zM60 10h30v30h-30zM65 15h20v20h-20zM10 60h30v30h-30zM15 65h20v20h-20z" fill="#0f172a" />
                <path d="M22 22h6v6h-6zM72 22h6v6h-6zM22 72h6v6h-6z" fill="#16a34a" />
                <path d="M45 10h5v15h-5zM45 35h5v20h-5zM10 45h20v5h-20zM35 45h15v5h-15zM60 45h30v5h-30zM60 55h10v10h-10zM80 55h10v15h-10zM45 60h10v5h-10zM45 70h5v20h-5zM60 75h15v5h-15zM80 75h10v15h-10zM60 85h15v5h-15z" fill="#0f172a" />
              </svg>
              <div className="mt-2 text-xs font-mono font-bold text-slate-700">
                UPI ID: drsanjay.dairy@upi
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              Amount Due: <strong className="font-mono-numbers text-sm">{formatINR(ledger.currentBalance)}</strong>
            </div>
          </div>

          {/* Form to submit payment reference */}
          <form onSubmit={handleOnlinePaymentSubmit} className="mt-6 space-y-4 pt-6 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Amount Paid (₹)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                required
                value={upiAmount || (ledger.currentBalance > 0 ? ledger.currentBalance : '')}
                onChange={(e) => setUpiAmount(e.target.value)}
                placeholder="Amount in ₹"
                className="w-full px-3 py-2 text-sm font-mono-numbers font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                UPI App / Method
              </label>
              <select
                value={upiMethod}
                onChange={(e) => setUpiMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="UPI (GPay / PhonePe / Paytm)">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Google Pay">Google Pay</option>
                <option value="PhonePe">PhonePe</option>
                <option value="Paytm">Paytm</option>
                <option value="Bank Transfer">Bank Transfer / IMPS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                UPI Ref Number / UTR <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={upiRefNumber}
                onChange={(e) => setUpiRefNumber(e.target.value)}
                placeholder="e.g. 482910482910"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 font-mono-numbers focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
            >
              Submit Payment Reference
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
