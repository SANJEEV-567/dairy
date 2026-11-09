import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Milk, IndianRupee, FileText, AlertCircle } from 'lucide-react';
import { roundToTwo } from '../utils/formatters';

export default function CustomerModal({
  isOpen,
  customerToEdit = null,
  onSave,
  onClose
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [usualQuantityKg, setUsualQuantityKg] = useState('1.0');
  const [usualPricePerKg, setUsualPricePerKg] = useState('60');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('active');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name || '');
      setPhone(customerToEdit.phone || '');
      setAddress(customerToEdit.address || '');
      setUsualQuantityKg((customerToEdit.usualQuantityKg || 1).toString());
      setUsualPricePerKg((customerToEdit.usualPricePerKg || 60).toString());
      setNotes(customerToEdit.notes || '');
      setStatus(customerToEdit.status || 'active');
      setOpeningBalance('0'); // Existing customers already have their balance tracked in ledger
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setUsualQuantityKg('1.0');
      setUsualPricePerKg('60');
      setNotes('');
      setStatus('active');
      setOpeningBalance('0');
    }
    setErrors({});
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = "Customer name is required";
    }

    const qty = parseFloat(usualQuantityKg);
    if (isNaN(qty) || qty < 0) {
      newErrors.usualQuantityKg = "Quantity must be a positive number (kg)";
    }

    const price = parseFloat(usualPricePerKg);
    if (isNaN(price) || price < 0) {
      newErrors.usualPricePerKg = "Price must be a positive number (₹/kg)";
    }

    if (!customerToEdit) {
      const openBal = parseFloat(openingBalance);
      if (isNaN(openBal)) {
        newErrors.openingBalance = "Invalid opening balance";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const customerData = {
      id: customerToEdit ? customerToEdit.id : undefined,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      usualQuantityKg: roundToTwo(parseFloat(usualQuantityKg)),
      usualPricePerKg: roundToTwo(parseFloat(usualPricePerKg)),
      notes: notes.trim(),
      status: status,
      openingBalance: !customerToEdit ? roundToTwo(parseFloat(openingBalance) || 0) : 0
    };

    onSave(customerData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {customerToEdit ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <p className="text-xs text-slate-500">
              {customerToEdit
                ? 'Update customer details and default daily milk preferences'
                : 'Enter customer contact info and usual daily delivery defaults'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Customer Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 ${
                  errors.name
                    ? 'border-rose-400 ring-rose-200'
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
                }`}
              />
            </div>
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>

          {/* Phone & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Delivery Address (Optional)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. House #14, Sector 3"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-200"
                />
              </div>
            </div>
          </div>

          {/* Usual Daily Milk Quantity & Rate */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-extrabold uppercase text-slate-700 tracking-wider block">
              Default Daily Milk Settings
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Usual Daily Milk Quantity (kg)
                </label>
                <div className="relative">
                  <Milk className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    placeholder="1.0"
                    value={usualQuantityKg}
                    onChange={(e) => setUsualQuantityKg(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-sm font-mono-numbers font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-200"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    kg
                  </span>
                </div>
                {errors.usualQuantityKg && (
                  <p className="text-xs text-rose-500 mt-1">{errors.usualQuantityKg}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Usual Price per kg (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="60"
                    value={usualPricePerKg}
                    onChange={(e) => setUsualPricePerKg(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm font-mono-numbers font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:border-emerald-500 focus:ring-emerald-200"
                  />
                </div>
                {errors.usualPricePerKg && (
                  <p className="text-xs text-rose-500 mt-1">{errors.usualPricePerKg}</p>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              These values make your daily entry lightning fast. You can adjust the quantity or rate on any specific day without affecting other days. Changing this here will <strong>never alter past deliveries or past monthly bills</strong>.
            </p>
          </div>

          {/* Opening Balance (Only shown when adding new customer) */}
          {!customerToEdit && (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Previous Outstanding Balance (Optional)
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="1"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono-numbers rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:border-emerald-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                If this customer already owes you money before using this system, enter it here.
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
              Customer Notes (Optional)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows="2"
                placeholder="e.g. Leave milk at doorstep, doorbell once..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Status Toggle (Active / Inactive) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-sm font-bold text-slate-800 block">Customer Status</span>
              <span className="text-xs text-slate-500">
                Inactive customers won't show in the daily milk entry sheet, but their historical bills and ledger are safely preserved.
              </span>
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs"
            >
              {customerToEdit ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
