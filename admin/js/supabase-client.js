// admin/js/supabase-client.js

const SUPABASE_URL = "https://fcqywjpdjcsbcpnnfckw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjcXl3anBkamNzYmNwbm5mY2t3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5OTE2MzUsImV4cCI6MjA5MDU2NzYzNX0.J4QYy5N_rPiRN0NF9TAQU119QOnDjIm8W73jUDpi3c8";

let _supabase = null;

export function getSupabase() {
  if (!_supabase) {
    if (!window.supabase) {
      throw new Error('Supabase SDK not loaded — check CDN script tag');
    }
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

export function getSupabaseUrl() {
  return SUPABASE_URL;
}
