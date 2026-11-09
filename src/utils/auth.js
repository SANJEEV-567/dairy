import { loadFromStorage, saveToStorage, generateId } from './storage.js';
import { STORAGE_KEYS } from './constants.js';

export const AUTH_STORAGE_KEYS = {
  CURRENT_USER: 'dsk_dairy_auth_user_v1',
  SELLERS: 'dsk_dairy_sellers_v1',
  CUSTOMER_ACCOUNTS: 'dsk_dairy_customer_auth_v1',
};

// Default seed seller account if none exist
const DEFAULT_SELLER = {
  id: 'seller_drsanjay',
  name: 'Dr. Sanjay Kumar',
  email: 'drsanjay@dairy.com',
  passwordHash: 'dairy123', // plain for demo/local storage simulation
  role: 'seller',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  createdAt: '2026-01-01T00:00:00.000Z'
};

/**
 * Initialize auth accounts storage
 */
export function initAuth() {
  const sellers = loadFromStorage(AUTH_STORAGE_KEYS.SELLERS, []);
  if (sellers.length === 0) {
    saveToStorage(AUTH_STORAGE_KEYS.SELLERS, [DEFAULT_SELLER]);
  }
}

/**
 * Get currently logged-in user
 */
export function getCurrentUser() {
  return loadFromStorage(AUTH_STORAGE_KEYS.CURRENT_USER, null);
}

/**
 * Set current session
 */
export function setCurrentUser(user) {
  if (user) {
    saveToStorage(AUTH_STORAGE_KEYS.CURRENT_USER, user);
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
  }
}

/**
 * Login with Email and Password
 */
export function loginWithEmail(email, password, role = 'seller') {
  initAuth();
  const cleanEmail = email.trim().toLowerCase();

  if (role === 'seller') {
    const sellers = loadFromStorage(AUTH_STORAGE_KEYS.SELLERS, [DEFAULT_SELLER]);
    const seller = sellers.find(s => s.email.toLowerCase() === cleanEmail);

    if (!seller) {
      return { success: false, error: 'Seller account not found with this email.' };
    }

    if (seller.passwordHash !== password) {
      return { success: false, error: 'Incorrect password for seller account.' };
    }

    const sessionUser = {
      id: seller.id,
      name: seller.name,
      email: seller.email,
      role: 'seller',
      avatar: seller.avatar || null,
      provider: 'email',
      loginTime: new Date().toISOString()
    };

    setCurrentUser(sessionUser);
    return { success: true, user: sessionUser };
  } else {
    // Customer login
    const customerAccounts = loadFromStorage(AUTH_STORAGE_KEYS.CUSTOMER_ACCOUNTS, []);
    const account = customerAccounts.find(a => a.email.toLowerCase() === cleanEmail);

    if (!account) {
      return { 
        success: false, 
        error: 'No customer account found with this email. Please sign up or contact Dr. Sanjay Kumar Dairy.' 
      };
    }

    if (account.passwordHash !== password) {
      return { success: false, error: 'Incorrect password for customer account.' };
    }

    // Link with real customer directory record if available
    const customers = loadFromStorage(STORAGE_KEYS.CUSTOMERS, []);
    const linkedCustomer = customers.find(c => 
      c.id === account.customerId || 
      (c.phone && account.phone && c.phone === account.phone) ||
      c.name.toLowerCase() === account.name.toLowerCase()
    );

    const sessionUser = {
      id: account.id,
      customerId: linkedCustomer ? linkedCustomer.id : account.customerId,
      name: linkedCustomer ? linkedCustomer.name : account.name,
      email: account.email,
      phone: account.phone || (linkedCustomer ? linkedCustomer.phone : ''),
      role: 'customer',
      avatar: account.avatar || null,
      provider: 'email',
      loginTime: new Date().toISOString()
    };

    setCurrentUser(sessionUser);
    return { success: true, user: sessionUser };
  }
}

/**
 * Register a new account
 */
export function registerAccount({ name, email, password, role = 'customer', phone = '', address = '', usualQuantityKg = 1.0, usualPricePerKg = 60 }) {
  initAuth();
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (role === 'seller') {
    const sellers = loadFromStorage(AUTH_STORAGE_KEYS.SELLERS, [DEFAULT_SELLER]);
    if (sellers.some(s => s.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'A seller account with this email already exists.' };
    }

    const newSeller = {
      id: generateId('seller'),
      name: cleanName,
      email: cleanEmail,
      passwordHash: password,
      role: 'seller',
      avatar: null,
      createdAt: new Date().toISOString()
    };

    sellers.push(newSeller);
    saveToStorage(AUTH_STORAGE_KEYS.SELLERS, sellers);

    const sessionUser = {
      id: newSeller.id,
      name: newSeller.name,
      email: newSeller.email,
      role: 'seller',
      avatar: null,
      provider: 'email',
      loginTime: new Date().toISOString()
    };
    setCurrentUser(sessionUser);
    return { success: true, user: sessionUser };
  } else {
    // Customer registration
    const customerAccounts = loadFromStorage(AUTH_STORAGE_KEYS.CUSTOMER_ACCOUNTS, []);
    if (customerAccounts.some(a => a.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'A customer account with this email already exists. Please log in.' };
    }

    // Check if customer already exists in dairy customer directory by phone or name
    const customers = loadFromStorage(STORAGE_KEYS.CUSTOMERS, []);
    let linkedCustomer = customers.find(c => 
      (phone && c.phone && c.phone === phone) || 
      c.name.toLowerCase() === cleanName.toLowerCase()
    );

    // If not existing, automatically add to dairy's customer directory!
    if (!linkedCustomer) {
      linkedCustomer = {
        id: generateId('cust'),
        name: cleanName,
        phone: phone.trim(),
        address: address.trim(),
        usualQuantityKg: Number(usualQuantityKg) || 1.0,
        usualPricePerKg: Number(usualPricePerKg) || 60.0,
        notes: 'Signed up online via customer portal',
        status: 'active',
        createdAt: new Date().toISOString()
      };
      customers.push(linkedCustomer);
      saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
    }

    const newCustomerAccount = {
      id: generateId('cust_auth'),
      customerId: linkedCustomer.id,
      name: cleanName,
      email: cleanEmail,
      phone: phone.trim(),
      address: address.trim(),
      passwordHash: password,
      role: 'customer',
      avatar: null,
      createdAt: new Date().toISOString()
    };

    customerAccounts.push(newCustomerAccount);
    saveToStorage(AUTH_STORAGE_KEYS.CUSTOMER_ACCOUNTS, customerAccounts);

    const sessionUser = {
      id: newCustomerAccount.id,
      customerId: linkedCustomer.id,
      name: linkedCustomer.name,
      email: newCustomerAccount.email,
      phone: linkedCustomer.phone,
      role: 'customer',
      avatar: null,
      provider: 'email',
      loginTime: new Date().toISOString()
    };

    setCurrentUser(sessionUser);
    return { success: true, user: sessionUser };
  }
}

/**
 * Login / Register with Google
 */
export function loginWithGoogleAuth(googleUser, role = 'seller') {
  initAuth();
  const cleanEmail = googleUser.email.trim().toLowerCase();
  const cleanName = googleUser.name.trim();

  if (role === 'seller') {
    const sellers = loadFromStorage(AUTH_STORAGE_KEYS.SELLERS, [DEFAULT_SELLER]);
    let seller = sellers.find(s => s.email.toLowerCase() === cleanEmail);

    if (!seller) {
      seller = {
        id: generateId('seller'),
        name: cleanName,
        email: cleanEmail,
        passwordHash: 'google_oauth_authorized',
        role: 'seller',
        avatar: googleUser.picture || null,
        provider: 'google',
        createdAt: new Date().toISOString()
      };
      sellers.push(seller);
      saveToStorage(AUTH_STORAGE_KEYS.SELLERS, sellers);
    }

    const sessionUser = {
      id: seller.id,
      name: seller.name,
      email: seller.email,
      role: 'seller',
      avatar: googleUser.picture || seller.avatar || null,
      provider: 'google',
      loginTime: new Date().toISOString()
    };

    setCurrentUser(sessionUser);
    return { success: true, user: sessionUser };
  } else {
    // Customer Google Login
    const customerAccounts = loadFromStorage(AUTH_STORAGE_KEYS.CUSTOMER_ACCOUNTS, []);
    let account = customerAccounts.find(a => a.email.toLowerCase() === cleanEmail);

    const customers = loadFromStorage(STORAGE_KEYS.CUSTOMERS, []);
    let linkedCustomer = customers.find(c => 
      (account && c.id === account.customerId) || 
      c.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (!linkedCustomer) {
      linkedCustomer = {
        id: generateId('cust'),
        name: cleanName,
        phone: '',
        address: '',
        usualQuantityKg: 1.0,
        usualPricePerKg: 60.0,
        notes: 'Signed up via Google Account',
        status: 'active',
        createdAt: new Date().toISOString()
      };
      customers.push(linkedCustomer);
      saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
    }

    if (!account) {
      account = {
        id: generateId('cust_auth'),
        customerId: linkedCustomer.id,
        name: cleanName,
        email: cleanEmail,
        passwordHash: 'google_oauth_authorized',
        role: 'customer',
        avatar: googleUser.picture || null,
        provider: 'google',
        createdAt: new Date().toISOString()
      };
      customerAccounts.push(account);
      saveToStorage(AUTH_STORAGE_KEYS.CUSTOMER_ACCOUNTS, customerAccounts);
    }

    const sessionUser = {
      id: account.id,
      customerId: linkedCustomer.id,
      name: linkedCustomer.name,
      email: account.email,
      phone: linkedCustomer.phone,
      role: 'customer',
      avatar: googleUser.picture || account.avatar || null,
      provider: 'google',
      loginTime: new Date().toISOString()
    };

    setCurrentUser(sessionUser);
    return { success: true, user: sessionUser };
  }
}

/**
 * Logout current user
 */
export function logout() {
  setCurrentUser(null);
}
