// admin/js/supabase-client.js

// Loaded via CDN import map in HTML
const SUPABASE_URL = "__SUPABASE_URL__"; // Replace with actual URL
const SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__"; // Replace with actual key

let _supabase = null;

export function getSupabase() {
  if (!_supabase) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

export function getSupabaseUrl() {
  return SUPABASE_URL;
}
