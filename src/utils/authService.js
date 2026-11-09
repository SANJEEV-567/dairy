import { getSupabaseClient, isSupabaseConfigured, getSupabaseConfig } from './supabase.js';

/**
 * Format auth errors into human-friendly messages
 */
function normalizeAuthError(error) {
  if (!error) return "An unexpected error occurred. Please try again.";
  const msg = error.message || String(error);

  if (msg.toLowerCase().includes('invalid login credentials')) {
    return "Incorrect email or password. Please check your credentials and try again.";
  }
  if (msg.toLowerCase().includes('email not confirmed')) {
    return "Your email has not been verified yet. Please check your inbox for the confirmation link.";
  }
  if (msg.toLowerCase().includes('user already registered')) {
    return "An account with this email address already exists. Please sign in instead.";
  }
  if (msg.toLowerCase().includes('password should be at least')) {
    return "Password is too weak. Please use at least 6 characters.";
  }
  if (msg.toLowerCase().includes('rate limit')) {
    return "Too many requests. Please wait a few moments before trying again.";
  }
  if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
    return "Network error: Unable to connect to authentication server. Check your connection or Supabase URL.";
  }
  return msg;
}

/**
 * Sign up a new user (Seller or Customer) with real email & password
 */
export async function signUpUser({ email, password, name, role = 'seller', customerCode = '' }) {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      notConfigured: true,
      error: "Authentication backend is not connected. Please configure your Supabase Project URL and Public Anon Key."
    };
  }

  const supabase = getSupabaseClient();
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanCode = customerCode ? customerCode.trim().toUpperCase() : '';

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          name: cleanName,
          role: role,
          customer_code: cleanCode
        }
      }
    });

    if (error) {
      return { success: false, error: normalizeAuthError(error) };
    }

    const user = data.user;
    const session = data.session;
    // Real email verification check: only confirmed if provider explicitly confirms it
    const needsEmailVerification = Boolean(user && !user.confirmed_at && !session);

    return {
      success: true,
      user,
      session,
      needsEmailVerification,
      role
    };
  } catch (err) {
    return { success: false, error: normalizeAuthError(err) };
  }
}

/**
 * Sign in existing user with real email & password
 */
export async function signInUser({ email, password }) {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      notConfigured: true,
      error: "Authentication backend is not connected. Please configure your Supabase Project URL and Public Anon Key."
    };
  }

  const supabase = getSupabaseClient();
  const cleanEmail = email.trim().toLowerCase();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    if (error) {
      return { success: false, error: normalizeAuthError(error) };
    }

    const user = data.user;
    const role = user?.user_metadata?.role || 'seller';
    const name = user?.user_metadata?.name || user.email.split('@')[0];
    const customerCode = user?.user_metadata?.customer_code || '';

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: name,
        role: role,
        customerCode: customerCode,
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
 * Sign in using Google OAuth through Supabase
 */
export async function signInWithGoogleOAuth(role = 'seller', customerCode = '') {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      notConfigured: true,
      error: "Authentication backend is not connected. Please configure your Supabase Project URL and Public Anon Key."
    };
  }

  const supabase = getSupabaseClient();

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem('dsk_pending_auth_role', role);
      if (customerCode) {
        sessionStorage.setItem('dsk_pending_customer_code', customerCode.trim().toUpperCase());
      }
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) {
      return { success: false, error: normalizeAuthError(error) };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: normalizeAuthError(err) };
  }
}

/**
 * Sign in using Google ID Token / Credential from Google Identity Services API
 */
export async function signInWithGoogleCredential(idToken, role = 'seller', customerCode = '') {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      notConfigured: true,
      error: "Authentication backend is not connected."
    };
  }

  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken
    });

    if (error) {
      return { success: false, error: normalizeAuthError(error) };
    }

    const user = data.user;
    let userRole = user?.user_metadata?.role || role;
    let code = user?.user_metadata?.customer_code || customerCode;

    // Save metadata if not present
    if (!user?.user_metadata?.role) {
      await supabase.auth.updateUser({
        data: { role: userRole, customer_code: code }
      }).catch(() => {});
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user?.user_metadata?.full_name || user?.user_metadata?.name || user.email.split('@')[0],
        role: userRole,
        customerCode: code || '',
        avatar: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null,
        emailConfirmed: true,
        provider: 'google'
      },
      session: data.session
    };
  } catch (err) {
    return { success: false, error: normalizeAuthError(err) };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email) {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      notConfigured: true,
      error: "Authentication backend is not connected. Please configure your Supabase Project URL and Public Anon Key."
    };
  }

  const supabase = getSupabaseClient();
  const cleanEmail = email.trim().toLowerCase();

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
 * Update user password after clicking reset link
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

    return { success: true, message: "Password updated successfully. You can now use your new password." };
  } catch (err) {
    return { success: false, error: normalizeAuthError(err) };
  }
}

/**
 * Sign out user
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
 */
export async function getActiveSession() {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseClient();
  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session?.user) return null;

    const user = data.session.user;
    let role = user?.user_metadata?.role;
    let customerCode = user?.user_metadata?.customer_code;

    // Check if there was a pending role/code from Google OAuth redirect
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const pendingRole = sessionStorage.getItem('dsk_pending_auth_role');
      const pendingCode = sessionStorage.getItem('dsk_pending_customer_code');

      if (pendingRole && (!role || role !== pendingRole)) {
        role = pendingRole;
        supabase.auth.updateUser({ data: { role: pendingRole } }).catch(() => {});
      }
      if (pendingCode && !customerCode) {
        customerCode = pendingCode;
        supabase.auth.updateUser({ data: { customer_code: pendingCode } }).catch(() => {});
      }
      sessionStorage.removeItem('dsk_pending_auth_role');
      sessionStorage.removeItem('dsk_pending_customer_code');
    }

    const isGoogle = user.app_metadata?.provider === 'google';
    const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user.email.split('@')[0];
    const avatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

    return {
      id: user.id,
      email: user.email,
      name: displayName,
      role: role || 'seller',
      customerCode: customerCode || '',
      avatar: avatar,
      emailConfirmed: Boolean(user.confirmed_at || user.email_confirmed_at || isGoogle),
      provider: user.app_metadata?.provider || 'email'
    };
  } catch (e) {
    console.error("Error retrieving session:", e);
    return null;
  }
}

/**
 * Link an authenticated customer user account to a dairy customer record using seller-issued code
 */
export async function linkCustomerAccountByCode(customerCode) {
  if (!isSupabaseConfigured()) {
    return { success: false, notConfigured: true, error: "Backend not connected." };
  }
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase.rpc('link_customer_account', {
      p_customer_code: customerCode.trim().toUpperCase()
    });
    if (error) return { success: false, error: normalizeAuthError(error) };
    return data;
  } catch (err) {
    return { success: false, error: normalizeAuthError(err) };
  }
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuthChanges(callback) {
  if (!isSupabaseConfigured()) return () => {};
  const supabase = getSupabaseClient();
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      const user = session.user;
      let role = user?.user_metadata?.role;
      let customerCode = user?.user_metadata?.customer_code;

      if (typeof window !== 'undefined' && window.sessionStorage) {
        const pendingRole = sessionStorage.getItem('dsk_pending_auth_role');
        const pendingCode = sessionStorage.getItem('dsk_pending_customer_code');
        if (pendingRole && !role) role = pendingRole;
        if (pendingCode && !customerCode) customerCode = pendingCode;
      }

      const isGoogle = user.app_metadata?.provider === 'google';
      const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user.email.split('@')[0];
      const avatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

      callback(event, {
        id: user.id,
        email: user.email,
        name: displayName,
        role: role || 'seller',
        customerCode: customerCode || '',
        avatar: avatar,
        emailConfirmed: Boolean(user.confirmed_at || user.email_confirmed_at || isGoogle),
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
