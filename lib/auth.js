// lib/auth.js
//
// Minimal email+password auth using an httpOnly JWT cookie. No third-party
// auth provider needed to launch. Swap for NextAuth/Clerk later if you want
// social login — the rest of the backend only cares about `getSessionUser()`.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getUserById } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = 'session';

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET não configurado — defina no .env antes de rodar em produção');
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function createSessionToken(userId) {
  return jwt.sign({ uid: userId }, JWT_SECRET || 'dev-secret-troque-isso', { expiresIn: '30d' });
}

export async function setSessionCookie(token) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

// Call this at the top of any protected API route.
// Returns the user row, or null if not authenticated.
export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET || 'dev-secret-troque-isso');
    return getUserById(payload.uid) || null;
  } catch {
    return null;
  }
}
