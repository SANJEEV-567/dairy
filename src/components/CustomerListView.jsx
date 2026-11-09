import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  UserX, 
  UserCheck, 
  BookOpenText, 
  Wallet, 
  Phone, 
  MapPin, 
  FileText,
  AlertCircle,
  KeyRound,
  Copy,
  Check
} from 'lucide-react';
import { formatINR, formatKg } from '../utils/formatters';
import { getCustomerBalance } from '../utils/calculations';

export default function CustomerListView({
  customers = [],
  deliveries = [],
  payments = [],
  adjustments = [],
  onOpenAddCustomer,
  onOpenEditCustomer,
  onToggleCustomerStatus,
  onOpenCustomerLedger,
  onOpenRecordPayment
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'all', 'active', 'inactive'
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.customerCode && c.customerCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return c.status !== 'inactive';
    if (statusFilter === 'inactive') return c.status === 'inactive';
    return true;
  });

  const activeCount = customers.filter(c => c.status !== 'inactive').length;
  const inactiveCount = customers.filter(c => c.status === 'inactive').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header bar */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Customer Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your milk buyers, delivery preferences, rates, and active accounts
          </p>
        </div>

        <button
          onClick={onOpenAddCustomer}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === 'active'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === 'inactive'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inactive ({inactiveCount})
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === 'all'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({customers.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Customer Cards Grid */}
      {customers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No Customers Added Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Add each customer once with their preferred daily quantity in kg and rate in ₹.
          </p>
          <button
            onClick={onOpenAddCustomer}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add First Customer</span>
          </button>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
          No customers found matching "{searchTerm}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => {
            const isInactive = customer.status === 'inactive';
            const balance = getCustomerBalance(customer.id, deliveries, payments, adjustments);

            return (
              <div
                key={customer.id}
                className={`bg-white rounded-2xl border transition-all duration-200 p-5 shadow-xs flex flex-col justify-between ${
                  isInactive
                    ? 'border-slate-200 bg-slate-50/50 opacity-75'
                    : 'border-slate-200/80 hover:border-emerald-300'
                }`}
              >
                <div>
                  {/* Top Bar: Name & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 flex-wrap">
                        <span>{customer.name}</span>
                        {customer.customerCode && (
                          <button
                            type="button"
                            onClick={() => handleCopyCode(customer.customerCode)}
                            title="Click to copy Customer Code for buyer portal"
                            className="inline-flex items-center gap-1 font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 transition-colors"
                          >
                            <KeyRound className="w-3 h-3 text-emerald-600" />
                            <span>{customer.customerCode}</span>
                            {copiedCode === customer.customerCode ? (
                              <Check className="w-3 h-3 text-emerald-700" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 text-slate-400" />
                            )}
                          </button>
                        )}
                        {isInactive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                            Deactivated
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        )}
                      </h3>
                      {customer.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.address && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{customer.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Usual Setting */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Usual Daily Milk:</span>
                      <span className="font-mono-numbers font-bold text-slate-800">
                        {formatKg(customer.usualQuantityKg)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Usual Price:</span>
                      <span className="font-mono-numbers font-bold text-slate-800">
                        {formatINR(customer.usualPricePerKg)}/kg
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500 font-medium">Default Daily Charge:</span>
                      <span className="font-mono-numbers font-bold text-emerald-700">
                        {formatINR(customer.usualQuantityKg * customer.usualPricePerKg)}
                      </span>
                    </div>
                  </div>

                  {/* Notes if any */}
                  {customer.notes && (
                    <div className="mt-3 flex items-start gap-1.5 text-xs text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                      <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{customer.notes}</span>
                    </div>
                  )}

                  {/* Running Balance */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Current Running Balance:
                    </span>
                    <span
                      className={`font-mono-numbers font-bold text-base ${
                        balance > 0
                          ? 'text-rose-600'
                          : balance < 0
                          ? 'text-emerald-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {formatINR(balance)}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenCustomerLedger(customer)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5 transition-colors"
                      title="View complete transaction ledger"
                    >
                      <BookOpenText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ledger</span>
                    </button>

                    <button
                      onClick={() => onOpenRecordPayment(customer)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors"
                      title="Record payment received"
                    >
                      <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pay</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenEditCustomer(customer)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Edit customer details"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onToggleCustomerStatus(customer)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isInactive
                          ? 'text-emerald-600 hover:bg-emerald-50'
                          : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                      }`}
                      title={isInactive ? "Reactivate customer" : "Deactivate customer (preserves history)"}
                    >
                      {isInactive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
