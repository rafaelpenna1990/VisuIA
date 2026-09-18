// lib/db.js
//
// SQLite database — the entire backend's source of truth for users and
// credits. Uses Node's BUILT-IN `node:sqlite` module (stable since Node 23,
// available in your Node 24) instead of better-sqlite3 — no native C++
// compilation, no Python, no Visual Studio Build Tools needed on Windows.
//
// SQLite is enough for launch/validation traffic (hundreds of users). If you
// outgrow it later, swap this file for a Postgres client and keep the same
// function signatures — nothing outside this file needs to change.

import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db');

// Ensure the data directory exists (SQLite won't create it for you)
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    credits_balance REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,              -- 'topup' | 'generation' | 'refund'
    amount REAL NOT NULL,            -- positive = credited, negative = debited
    description TEXT,
    stripe_session_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    model TEXT NOT NULL,
    kind TEXT NOT NULL,              -- 'image' | 'i2i' | 'video' | 'i2v' | 'lipsync'
    cost_credits REAL NOT NULL,
    status TEXT NOT NULL,            -- 'completed' | 'failed'
    output_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// node:sqlite doesn't have better-sqlite3's db.transaction() helper, so we
// wrap BEGIN/COMMIT/ROLLBACK by hand. Same atomicity guarantee: if fn()
// throws partway through, everything it did is rolled back.
function withTransaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function getUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function createUser(email, passwordHash) {
  const info = db.prepare(
    'INSERT INTO users (email, password_hash, credits_balance) VALUES (?, ?, ?)'
  ).run(email, passwordHash, Number(process.env.SIGNUP_FREE_CREDITS || 0));
  return getUserById(Number(info.lastInsertRowid));
}

// Atomically checks balance and deducts — throws if insufficient. Wrapped in
// a transaction so two simultaneous requests from the same user can't both
// pass the balance check and overdraw the wallet.
export function chargeCredits(userId, amount, description) {
  return withTransaction(() => {
    const user = getUserById(userId);
    if (!user) throw new Error('Usuário não encontrado');
    if (user.credits_balance < amount) {
      const err = new Error('Créditos insuficientes');
      err.code = 'INSUFFICIENT_CREDITS';
      throw err;
    }
    db.prepare('UPDATE users SET credits_balance = credits_balance - ? WHERE id = ?').run(amount, userId);
    db.prepare(
      'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
    ).run(userId, 'generation', -amount, description);
  });
}

export function refundCredits(userId, amount, description) {
  return withTransaction(() => {
    db.prepare('UPDATE users SET credits_balance = credits_balance + ? WHERE id = ?').run(amount, userId);
    db.prepare(
      'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
    ).run(userId, 'refund', amount, description);
  });
}

export function addCredits(userId, amount, description, stripeSessionId) {
  return withTransaction(() => {
    db.prepare('UPDATE users SET credits_balance = credits_balance + ? WHERE id = ?').run(amount, userId);
    db.prepare(
      'INSERT INTO transactions (user_id, type, amount, description, stripe_session_id) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, 'topup', amount, description, stripeSessionId || null);
  });
}

export function logGeneration(userId, model, kind, costCredits, status, outputUrl) {
  db.prepare(
    'INSERT INTO generations (user_id, model, kind, cost_credits, status, output_url) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, model, kind, costCredits, status, outputUrl || null);
}

export default db;
