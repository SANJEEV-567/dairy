import { getSupabaseClient, isSupabaseConfigured } from './supabase.js';
import { AUTHORIZED_SELLER_EMAIL } from './constants.js';

/**
 * Format auth errors into human-friendly messages
 */
function normalizeAuthError(error) {
  if (!error) return "An unexpected error occurred. Please try again.";
  const msg = error.message || String(error);

  if (msg.toLowerCase().includes('invalid login credentials')) {
    return "Incorrect password. Please verify your password and try again.";
  }
  if (msg.toLowerCase().includes('email not confirmed')) {
    return "Email verification required. In Supabase Dashboard under Authentication > Providers > Email, turn OFF 'Confirm email' for instant login.";
  }
  if (msg.toLowerCase().includes('user already registered')) {
    return "An account with this email address already exists.";
  }
  if (msg.toLowerCase().includes('password should be at least')) {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (msg.toLowerCase().includes('rate limit')) {
    return "Too many attempts. Please wait a few moments before trying again.";
  }
  if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
    return "Network error: Unable to connect to authentication server. Check your connection or Supabase URL.";
  }
  return msg;
}

/**
 * Single Authorized Seller Sign-In with real email & password
 * Strictly permits only AUTHORIZED_SELLER_EMAIL
 */
export async function signInUser({ email, password }) {
  const cleanEmail = email ? email.trim().toLowerCase() : '';

  // 1. Strict single-seller authorization check
  if (cleanEmail !== AUTHORIZED_SELLER_EMAIL.toLowerCase()) {
    return {
      success: false,
      error: `Access denied. Only the authorized Dairy Seller (${AUTHORIZED_SELLER_EMAIL}) is permitted to access this system.`
    };
  }

  if (!password) {
    return { success: false, error: "Please enter your password." };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      notConfigured: true,
      error: "Authentication backend is not connected. Please configure your Supabase Project URL and Public Anon Key."
    };
  }

  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    if (error) {
      return { success: false, error: normalizeAuthError(error) };
    }

    const user = data.user;

    // 2. Extra verification: Ensure returned authenticated account matches the authorized seller
    if (!user || user.email?.toLowerCase() !== AUTHORIZED_SELLER_EMAIL.toLowerCase()) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: `Access denied. Only the authorized Dairy Seller (${AUTHORIZED_SELLER_EMAIL}) is permitted to access this system.`
      };
    }

    const name = user?.user_metadata?.name || 'Dr. Sanjay Kumar';

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: name,
        role: 'seller',
        avatar: user?.user_metadata?.avatar_url || null,
        emailConfirmed: Boolean(user.confirmed_at || user.email_confirmed_at),
        provider: user.app_metadata?.provider || 'email'
      },
      session: data.session
    };
  } catch (err) {
    return { success: false, error: normalizeAuthError(err) };
  }
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

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      notConfigured: true,
      error: "Authentication backend is not connected. Please configure your Supabase Project URL and Public Anon Key."
    };
  }

  const supabase = getSupabaseClient();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/#reset-password`
    });

    if (error) {
      return { success: false, error: normalizeAuthError(error) };
    }

    return {
      success: true,
      message: `Password reset instructions have been sent to ${cleanEmail}. Please check your inbox and spam folder.`
    };
  } catch (err) {
    return { success: false, error: normalizeAuthError(err) };
  }
}

/**
 * Update seller password after clicking reset link
 */
export async function updateUserPassword(newPassword) {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      notConfigured: true,
      error: "Authentication backend is not connected."
    };
  }

  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return { success: false, error: normalizeAuthError(error) };
    }

    return { 
      success: true, 
      message: "Password updated successfully. You can now log in with your new password." 
    };
  } catch (err) {
    return { success: false, error: normalizeAuthError(err) };
  }
}

/**
 * Securely sign out the seller
 */
export async function signOutUser() {
  if (!isSupabaseConfigured()) return { success: true };
  const supabase = getSupabaseClient();
  try {
    await supabase.auth.signOut();
    return { success: true };
  } catch (err) {
    console.error("Sign out error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Check and get current session on app load
 * Rejects and terminates any session that is not the single authorized seller
 */
export async function getActiveSession() {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session?.user) return null;

    const user = data.session.user;

    // Strict single-seller session check
    if (user.email?.toLowerCase() !== AUTHORIZED_SELLER_EMAIL.toLowerCase()) {
      await supabase.auth.signOut();
      return null;
    }

    const displayName = user?.user_metadata?.name || 'Dr. Sanjay Kumar';

    return {
      id: user.id,
      email: user.email,
      name: displayName,
      role: 'seller',
      avatar: user?.user_metadata?.avatar_url || null,
      emailConfirmed: Boolean(user.confirmed_at || user.email_confirmed_at),
      provider: user.app_metadata?.provider || 'email'
    };
  } catch (e) {
    console.error("Error retrieving session:", e);
    return null;
  }
}

/**
 * Subscribe to auth state changes
 * Automatically purges any unauthorized session
 */
export function subscribeToAuthChanges(callback) {
  if (!isSupabaseConfigured()) return () => {};
  const supabase = getSupabaseClient();
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = session.user;

      if (user.email?.toLowerCase() !== AUTHORIZED_SELLER_EMAIL.toLowerCase()) {
        await supabase.auth.signOut();
        callback(event, null);
        return;
      }

      const displayName = user?.user_metadata?.name || 'Dr. Sanjay Kumar';

      callback(event, {
        id: user.id,
        email: user.email,
        name: displayName,
        role: 'seller',
        avatar: user?.user_metadata?.avatar_url || null,
        emailConfirmed: Boolean(user.confirmed_at || user.email_confirmed_at),
        provider: user.app_metadata?.provider || 'email'
      });
    } else {
      callback(event, null);
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Google OAuth and Customer Linking stubs disabled in single-seller mode
 */
export async function signInWithGoogleOAuth() {
  return { success: false, error: "Google sign-in has been disabled. Please use your Seller email and password." };
}

export async function signInWithGoogleCredential() {
  return { success: false, error: "Google sign-in has been disabled." };
}

export async function linkCustomerAccountByCode() {
  return { success: false, error: "Customer accounts are disabled. This portal is for the Dairy Seller only." };
}
