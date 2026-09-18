import { supabase } from './supabase.js';

// Get current session user (or null)
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Get current session (includes user + metadata)
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Sign up a new user
export async function signUp(email, password, name) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role: 'student' },
    },
  });
}

// Log in
export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

// Log out
export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

// Redirect to login if not authenticated
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session.user;
}

// Redirect to home if already authenticated (for login/signup pages)
export async function redirectIfAuthed() {
  const session = await getSession();
  if (session) {
    window.location.href = 'index.html';
  }
}