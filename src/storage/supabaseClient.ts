import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
      return (import.meta as any).env[key];
    }
  } catch (_) {}

  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (_) {}

  return undefined;
};

export const sanitizeSupabaseUrl = (url?: string): string => {
  if (!url) return '';
  let cleaned = url.trim();
  // Limpia /rest/v1/ si el usuario copió el endpoint completo de Data API
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  // Limpia barras finales
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
};

const rawUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseUrl = sanitizeSupabaseUrl(rawUrl);
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY')?.trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl !== '' &&
    !supabaseUrl.includes('tu-proyecto.supabase.co') &&
    supabaseAnonKey &&
    supabaseAnonKey !== '' &&
    supabaseAnonKey !== 'tu-anon-key-aqui'
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey!)
  : null;
