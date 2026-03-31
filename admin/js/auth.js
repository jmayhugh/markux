// admin/js/auth.js
import { getSupabase } from "./supabase-client.js";

export async function signIn(email, password) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = getSupabase();
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

export async function getSession() {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}
