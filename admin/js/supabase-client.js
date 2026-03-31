// admin/js/supabase-client.js

// Loaded via CDN script tag in HTML — may not be available immediately
const SUPABASE_URL = "https://fcqywjpdjcsbcpnnfckw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_bcQeMDWPM4AHj-43w2HtYg_78Lg55Pl";

let _supabase = null;
let _ready = null;

function waitForSupabase() {
  if (_ready) return _ready;
  if (window.supabase) {
    _ready = Promise.resolve();
    return _ready;
  }
  _ready = new Promise((resolve) => {
    const check = setInterval(() => {
      if (window.supabase) {
        clearInterval(check);
        resolve();
      }
    }, 10);
  });
  return _ready;
}

export async function getSupabase() {
  await waitForSupabase();
  if (!_supabase) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

export function getSupabaseUrl() {
  return SUPABASE_URL;
}
