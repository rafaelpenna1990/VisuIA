// lib/db.js
//
// SQLite database — the entire backend's source of truth for users and
// credits. Uses Node's BUILT-IN `node:sqlite` module (stable since Node 23,
// available in your Node 24) instead of better-sqlite3 — no native C++
// compilation needed.
//
// IMPORTANT: the database connection is created LAZILY (only on the first
// real request), not when this file is imported. Next.js's build step
// analyzes every API route in parallel worker processes — if we opened the
// SQLite file at import time, multiple build workers would fight over the
// same file and fail with "database is locked". Lazy init avoids touching
// the filesystem at all during build.

import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db');

let _db = null;

function getDb() {
  if (_db) return _db;

  // Ensure the data directory exists (SQLite won't create it for you)
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // The actual file gets opened here, inside getDb() — only ever called
  // from a real request handler, never during Next.js's build-time route
  // analysis. Importing the DatabaseSync class above is harmless; it's
  // opening the file that caused the lock contention during build.
  _db = new DatabaseSync(DB_PATH);
  _db.exec('PRAGMA journal_mode = WAL');

  _db.exec(`
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
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      stripe_session_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS generations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      model TEXT NOT NULL,
      kind TEXT NOT NULL,
      cost_credits REAL NOT NULL,
      status TEXT NOT NULL,
      output_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  return _db;
}

function withTransaction(fn) {
  const db = getDb();
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
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export function getUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function createUser(email, passwordHash) {
  const info = getDb().prepare(
    'INSERT INTO users (email, password_hash, credits_balance) VALUES (?, ?, ?)'
  ).run(email, passwordHash, Number(process.env.SIGNUP_FREE_CREDITS || 0));
  return getUserById(Number(info.lastInsertRowid));
}

export function chargeCredits(userId, amount, description) {
  return withTransaction(() => {
    const user = getUserById(userId);
    if (!user) throw new Error('Usuário não encontrado');
    if (user.credits_balance < amount) {
      const err = new Error('Créditos insuficientes');
      err.code = 'INSUFFICIENT_CREDITS';
      throw err;
    }
    getDb().prepare('UPDATE users SET credits_balance = credits_balance - ? WHERE id = ?').run(amount, userId);
    getDb().prepare(
      'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
    ).run(userId, 'generation', -amount, description);
  });
}

export function refundCredits(userId, amount, description) {
  return withTransaction(() => {
    getDb().prepare('UPDATE users SET credits_balance = credits_balance + ? WHERE id = ?').run(amount, userId);
    getDb().prepare(
      'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
    ).run(userId, 'refund', amount, description);
  });
}

export function addCredits(userId, amount, description, stripeSessionId) {
  return withTransaction(() => {
    getDb().prepare('UPDATE users SET credits_balance = credits_balance + ? WHERE id = ?').run(amount, userId);
    getDb().prepare(
      'INSERT INTO transactions (user_id, type, amount, description, stripe_session_id) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, 'topup', amount, description, stripeSessionId || null);
  });
}

export function logGeneration(userId, model, kind, costCredits, status, outputUrl) {
  getDb().prepare(
    'INSERT INTO generations (user_id, model, kind, cost_credits, status, output_url) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, model, kind, costCredits, status, outputUrl || null);
}

export default getDb;