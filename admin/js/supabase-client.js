// admin/js/supabase-client.js

// Loaded via CDN import map in HTML
const SUPABASE_URL = "https://fcqywjpdjcsbcpnnfckw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bcQeMDWPM4AHj-43w2HtYg_78Lg55Pl";

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
