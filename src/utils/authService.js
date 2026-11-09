import { getSupabaseClient, isSupabaseConfigured } from './supabase.js';
import { AUTHORIZED_SELLER_EMAIL, STORAGE_KEYS } from './constants.js';

export const MASTER_SELLER_PASSWORD = "Sanjeev@123";
const SESSION_STORAGE_KEY = 'dsk_seller_session';
const CUSTOM_PASSWORD_KEY = 'dsk_seller_custom_pass';

/**
 * Resolve the seller's user ID so existing dairy records are preserved
 */
export function getSellerUserId() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'seller_dsk_dairy_master';
  }
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.user?.id) return parsed.user.id;
    }

    // Inspect if records already exist under an existing scoped key
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.CUSTOMERS + '_')) {
        const id = key.replace(STORAGE_KEYS.CUSTOMERS + '_', '');
        if (id && id !== 'undefined' && id !== 'null') {
          return id;
        }
      }
    }
  } catch (e) {
    // Ignore storage parse errors
  }
  return 'seller_dsk_dairy_master';
}

/**
 * Direct Seller Sign-In:
 * Allows the Seller (sanjeevkumarxcg@gmail.com) to log in directly with password "Sanjeev@123"
 * without blocking on backend verification.
 */
export async function signInUser({ email, password }) {
  const cleanEmail = email ? email.trim().toLowerCase() : '';

  // 1. Strict single-seller email verification
  if (cleanEmail !== AUTHORIZED_SELLER_EMAIL.toLowerCase()) {
    return {
      success: false,
      error: `Access denied. Only the authorized Dairy Seller (${AUTHORIZED_SELLER_EMAIL}) is permitted to access this system.`
    };
  }

  if (!password) {
    return { success: false, error: "Please enter your password." };
  }

  // 2. Validate password against Master Password or custom saved password
  let customPass = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    customPass = localStorage.getItem(CUSTOM_PASSWORD_KEY);
  }

  const isPasswordValid = password === MASTER_SELLER_PASSWORD || (customPass && password === customPass);

  if (!isPasswordValid) {
    return {
      success: false,
      error: "Incorrect password. Please enter the valid Seller password."
    };
  }

  // 3. Construct authenticated seller profile
  const sellerId = getSellerUserId();
  const sellerUser = {
    id: sellerId,
    email: AUTHORIZED_SELLER_EMAIL,
    name: 'Dr. Sanjay Kumar',
    role: 'seller',
    provider: 'local',
    emailConfirmed: true
  };

  // 4. Save session to local storage for persistent authentication across browser refreshes
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        user: sellerUser,
        loginTime: new Date().toISOString()
      }));
    } catch (e) {
      console.warn("Could not save seller session to localStorage:", e);
    }
  }

  // 5. Optional non-blocking background connection to Supabase if configured
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.signInWithPassword({ email: cleanEmail, password: password })
        .then(({ data }) => {
          if (data?.user?.id && typeof window !== 'undefined' && window.localStorage) {
            const updatedUser = {
              ...sellerUser,
              id: data.user.id,
              provider: 'supabase'
            };
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
              user: updatedUser,
              loginTime: new Date().toISOString()
            }));
          }
        })
        .catch(() => {
          // Never block or fail the login if backend is unreachable
        });
    }
  }

  return {
    success: true,
    user: sellerUser,
    session: { user: sellerUser }
  };
}

/**
 * Public sign-up is permanently disabled.
 */
export async function signUpUser() {
  return {
    success: false,
    error: "Public registration is disabled. This system is restricted to the single authorized Dairy Seller."
  };
}

/**
 * Send password reset email strictly for the authorized Seller account
 */
export async function sendPasswordResetEmail(email) {
  const cleanEmail = email ? email.trim().toLowerCase() : '';

  if (cleanEmail !== AUTHORIZED_SELLER_EMAIL.toLowerCase()) {
    return {
      success: false,
      error: `Access denied. Password reset is only available for the authorized Dairy Seller (${AUTHORIZED_SELLER_EMAIL}).`
    };
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/#reset-password`
        });
      } catch (e) {
        // Fall back gracefully
      }
    }
  }

  return {
    success: true,
    message: `Password reset instructions have been recorded for ${cleanEmail}. Master password "Sanjeev@123" is always available for instant login.`
  };
}

/**
 * Update seller password
 */
export async function updateUserPassword(newPassword) {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(CUSTOM_PASSWORD_KEY, newPassword);
    } catch (e) {}
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.updateUser({ password: newPassword }).catch(() => {});
    }
  }

  return { 
    success: true, 
    message: "Password updated successfully. You can log in using your new password or Sanjeev@123." 
  };
}

/**
 * Securely sign out the seller
 */
export async function signOutUser() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {}
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.signOut().catch(() => {});
    }
  }

  return { success: true };
}

/**
 * Check and get current session on app load
 */
export async function getActiveSession() {
  // 1. Check local persistent session
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.user?.email?.toLowerCase() === AUTHORIZED_SELLER_EMAIL.toLowerCase()) {
          return parsed.user;
        }
      }
    } catch (e) {}
  }

  // 2. Check Supabase session if configured
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          const user = data.session.user;
          if (user.email?.toLowerCase() === AUTHORIZED_SELLER_EMAIL.toLowerCase()) {
            return {
              id: user.id,
              email: user.email,
              name: user?.user_metadata?.name || 'Dr. Sanjay Kumar',
              role: 'seller',
              avatar: user?.user_metadata?.avatar_url || null,
              emailConfirmed: true,
              provider: 'supabase'
            };
          }
        }
      } catch (e) {}
    }
  }

  return null;
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuthChanges(callback) {
  if (!isSupabaseConfigured()) return () => {};
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = session.user;
      if (user.email?.toLowerCase() !== AUTHORIZED_SELLER_EMAIL.toLowerCase()) {
        callback(event, null);
        return;
      }
      callback(event, {
        id: user.id,
        email: user.email,
        name: user?.user_metadata?.name || 'Dr. Sanjay Kumar',
        role: 'seller',
        avatar: user?.user_metadata?.avatar_url || null,
        emailConfirmed: true,
        provider: 'supabase'
      });
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}

export async function signInWithGoogleOAuth() {
  return { success: false, error: "Google sign-in has been disabled." };
}

export async function signInWithGoogleCredential() {
  return { success: false, error: "Google sign-in has been disabled." };
}

export async function linkCustomerAccountByCode() {
  return { success: false, error: "Customer accounts are disabled." };
}
