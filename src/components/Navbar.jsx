import React, { useState } from 'react';
import { 
  Milk, 
  LayoutDashboard, 
  CalendarPlus, 
  Users, 
  Receipt, 
  CreditCard, 
  BookOpenText, 
  HardDriveDownload,
  Menu,
  X,
  LogOut,
  User,
  ShieldCheck
} from 'lucide-react';
import { DAIRY_NAME } from '../utils/constants';
import { formatDateIndian, getTodayKolkata, formatINR } from '../utils/formatters';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  totalDue = 0,
  currentUser = null,
  onLogout
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const todayDate = getTodayKolkata();

  const isSeller = currentUser?.role === 'seller';

  const sellerNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'daily-entry', label: 'Daily Milk Entry', icon: CalendarPlus },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'ledger', label: 'Customer Ledger', icon: BookOpenText },
    { id: 'billing', label: 'Monthly Billing', icon: Receipt },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'backup', label: 'Backup & Data', icon: HardDriveDownload },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs no-print backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Brand Logo & Name */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/20">
              <Milk className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                  {DAIRY_NAME}
                </span>
                <span className={`hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                  isSeller 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-teal-50 text-teal-700 border-teal-200'
                }`}>
                  {isSeller ? 'Seller Portal' : 'Customer Portal'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                Milk Management & Billing • IST ({formatDateIndian(todayDate)})
              </p>
            </div>
          </div>

          {/* Desktop Navigation for Seller */}
          {isSeller && (
            <nav className="hidden lg:flex items-center gap-1">
              {sellerNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-700/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Header Controls: User Profile & Total Due */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Quick Total Due Display on Desktop for Seller */}
            {isSeller && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Total Due:</span>
                <span className={`text-xs font-black font-mono-numbers ${totalDue > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {formatINR(totalDue)}
                </span>
              </div>
            )}

            {/* User Profile Pill & Logout */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2">
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/30"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {currentUser.role}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-100 space-y-2 animate-in slide-in-from-top-2 duration-200">
            {/* User Info in Mobile */}
            {currentUser && (
              <div className="px-4 py-2 bg-slate-50 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">{currentUser.name}</div>
                  <div className="text-xs text-slate-500 capitalize">{currentUser.role} Account</div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 font-bold text-xs rounded-lg"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}

            {isSeller && sellerNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {isSeller && (
              <div className="pt-2 px-4 flex items-center justify-between text-xs border-t border-slate-100">
                <span className="text-slate-500 font-semibold">Total Outstanding Due:</span>
                <span className={`font-mono-numbers font-black ${totalDue > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                  {formatINR(totalDue)}
                </span>
              </div>
            )}

            <div className="px-4 text-[11px] text-slate-400 font-medium">
              Asia/Kolkata Standard Time • {formatDateIndian(todayDate)}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
