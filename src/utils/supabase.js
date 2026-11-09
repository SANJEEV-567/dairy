import { createClient } from '@supabase/supabase-js';

const CONFIG_STORAGE_KEY = 'dsk_dairy_supabase_config_v1';

// Production Supabase instance for Dr. Sanjay Kumar Dairy
const DEFAULT_PRODUCTION_URL = 'https://zgnlxwxongevnsvhhzzv.supabase.co';
const DEFAULT_PRODUCTION_ANON_KEY = 'sb_publishable_XuZKt_HOdPssdKsV3UPL-g_GproNpjB';

/**
 * Get Supabase configuration from environment variables or local overrides
 */
export function getSupabaseConfig() {
  const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  const nodeEnv = typeof process !== 'undefined' && process.env ? process.env : {};
  const envUrl = metaEnv.VITE_SUPABASE_URL || nodeEnv.VITE_SUPABASE_URL;
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY || nodeEnv.VITE_SUPABASE_ANON_KEY;

  if (envUrl && envKey && !envUrl.includes('your-project-id')) {
    return {
      url: envUrl.trim(),
      anonKey: envKey.trim(),
      source: 'env'
    };
  }

  // Fallback to local configuration saved via setup UI
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CONFIG_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.url && parsed?.anonKey) {
        return {
          url: parsed.url.trim(),
          anonKey: parsed.anonKey.trim(),
          source: 'local'
        };
      }
    }
  } catch (e) {
    console.error("Error reading local Supabase config:", e);
  }

  // Automatic connection to Dr. Sanjay Kumar Dairy Supabase instance in browser runtime
  if (typeof window !== 'undefined' && DEFAULT_PRODUCTION_URL && DEFAULT_PRODUCTION_ANON_KEY) {
    return {
      url: DEFAULT_PRODUCTION_URL,
      anonKey: DEFAULT_PRODUCTION_ANON_KEY,
      source: 'default'
    };
  }

  return {
    url: '',
    anonKey: '',
    source: 'none'
  };
}

/**
 * Check if a valid Supabase backend is configured
 */
export function isSupabaseConfigured() {
  const config = getSupabaseConfig();
  return Boolean(
    config.url && 
    config.anonKey && 
    config.url.startsWith('https://') &&
    config.anonKey.length > 20
  );
}

/**
 * Save custom Supabase credentials from in-app setup assistant
 */
export function saveCustomSupabaseConfig(url, anonKey) {
  try {
    if (!url || !anonKey) {
      localStorage.removeItem(CONFIG_STORAGE_KEY);
      return false;
    }
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({
      url: url.trim(),
      anonKey: anonKey.trim(),
      configuredAt: new Date().toISOString()
    }));
    return true;
  } catch (e) {
    console.error("Error saving Supabase config:", e);
    return false;
  }
}

/**
 * Reset custom configuration
 */
export function clearCustomSupabaseConfig() {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
}

let supabaseInstance = null;
let currentConfigKey = '';

/**
 * Get or initialize the Supabase client
 */
export function getSupabaseClient() {
  const config = getSupabaseConfig();
  const configKey = `${config.url}_${config.anonKey}`;

  if (!isSupabaseConfigured()) {
    return null;
  }

  if (supabaseInstance && currentConfigKey === configKey) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      }
    });
    currentConfigKey = configKey;
    return supabaseInstance;
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
    return null;
  }
}

