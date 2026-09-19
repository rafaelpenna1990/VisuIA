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

  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

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

  const genCols = _db.prepare("PRAGMA table_info(generations)").all().map(c => c.name);
  if (!genCols.includes('request_id')) {
    _db.exec("ALTER TABLE generations ADD COLUMN request_id TEXT");
  }
  if (!genCols.includes('estimate_brl')) {
    _db.exec("ALTER TABLE generations ADD COLUMN estimate_brl REAL");
  }

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

export function createPendingGeneration(userId, model, kind, requestId, estimateBRL) {
  const info = getDb().prepare(
    'INSERT INTO generations (user_id, model, kind, cost_credits, status, request_id, estimate_brl) VALUES (?, ?, ?, 0, ?, ?, ?)'
  ).run(userId, model, kind, 'pending', requestId, estimateBRL);
  return Number(info.lastInsertRowid);
}

export function getGenerationById(id) {
  return getDb().prepare('SELECT * FROM generations WHERE id = ?').get(id);
}

export function settleGenerationSuccess(id, realChargeBRL, outputUrl) {
  return withTransaction(() => {
    const job = getGenerationById(id);
    if (!job || job.status !== 'pending') return job;

    getDb().prepare('UPDATE users SET credits_balance = credits_balance + ? WHERE id = ?')
      .run(job.estimate_brl, job.user_id);
    getDb().prepare(
      'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
    ).run(job.user_id, 'refund', job.estimate_brl, 'estorno da pré-cobrança estimada');

    const user = getUserById(job.user_id);
    if (user.credits_balance >= realChargeBRL) {
      getDb().prepare('UPDATE users SET credits_balance = credits_balance - ? WHERE id = ?')
        .run(realChargeBRL, job.user_id);
      getDb().prepare(
        'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
      ).run(job.user_id, 'generation', -realChargeBRL, `${job.model} — cobrança real`);
    }

    getDb().prepare(
      'UPDATE generations SET status = ?, cost_credits = ?, output_url = ? WHERE id = ?'
    ).run('completed', realChargeBRL, outputUrl || null, id);

    return getGenerationById(id);
  });
}

export function settleGenerationFailure(id) {
  return withTransaction(() => {
    const job = getGenerationById(id);
    if (!job || job.status !== 'pending') return job;

    getDb().prepare('UPDATE users SET credits_balance = credits_balance + ? WHERE id = ?')
      .run(job.estimate_brl, job.user_id);
    getDb().prepare(
      'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
    ).run(job.user_id, 'refund', job.estimate_brl, 'estorno — geração falhou');

    getDb().prepare('UPDATE generations SET status = ? WHERE id = ?').run('failed', id);
    return getGenerationById(id);
  });
}

export function listUsers() {
  return getDb().prepare(
    'SELECT id, email, credits_balance, created_at FROM users ORDER BY created_at DESC'
  ).all();
}

// For the "Meus Projetos" gallery page — every completed generation
// belonging to one user, newest first.
export function listGenerationsForUser(userId, limit = 200) {
  return getDb().prepare(
    "SELECT id, model, kind, output_url, created_at FROM generations WHERE user_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT ?"
  ).all(userId, limit);
}

export default getDb;