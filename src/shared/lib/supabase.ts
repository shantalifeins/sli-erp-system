import WebSocket from 'ws';
if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : undefined) || (import.meta as any).env?.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : undefined) || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'placeholder_key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});
