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
export async function signUpUser({ email, password, name, role = 'seller', phone = '', address = '', usualQuantityKg = 1.0 }) {
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

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          name: cleanName,
          role: role,
          phone: phone.trim(),
          address: address.trim(),
          usual_quantity_kg: Number(usualQuantityKg) || 1.0
        }
      }
    });

    if (error) {
      return { success: false, error: normalizeAuthError(error) };
    }

    const user = data.user;
    const session = data.session;
    // If confirmation is required, session will be null and confirmed_at will be null
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

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: name,
        role: role,
        phone: user?.user_metadata?.phone || '',
        address: user?.user_metadata?.address || '',
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
export async function signInWithGoogleOAuth(role = 'seller') {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      notConfigured: true,
      error: "Authentication backend is not connected. Please configure your Supabase Project URL and Public Anon Key."
    };
  }

  const supabase = getSupabaseClient();

  try {
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
    return {
      id: user.id,
      email: user.email,
      name: user?.user_metadata?.name || user.email.split('@')[0],
      role: user?.user_metadata?.role || 'seller',
      phone: user?.user_metadata?.phone || '',
      address: user?.user_metadata?.address || '',
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
 */
export function subscribeToAuthChanges(callback) {
  if (!isSupabaseConfigured()) return () => {};
  const supabase = getSupabaseClient();
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      const user = session.user;
      callback(event, {
        id: user.id,
        email: user.email,
        name: user?.user_metadata?.name || user.email.split('@')[0],
        role: user?.user_metadata?.role || 'seller',
        phone: user?.user_metadata?.phone || '',
        address: user?.user_metadata?.address || '',
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
