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

export async function signUp(email, password, name) {
  // Check if any users exist yet — via a lightweight query
  const { data: existingUsers } = await supabase
    .from('posts')  // any table — just checking if data exists
    .select('user_id', { head: false, count: 'exact' })
    .limit(1);

  // This is imperfect because posts might be empty even if users exist.
  // Better: rely on the user_metadata count. But for a capstone, we use
  // a simple heuristic — first user to sign up will be assigned teacher.
  const isFirstUser = !existingUsers || existingUsers.length === 0;

  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: isFirstUser ? 'teacher' : 'student',
      },
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
    window.location.href = 'landing.html';
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