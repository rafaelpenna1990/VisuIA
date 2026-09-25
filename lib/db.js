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

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      stripe_subscription_id TEXT UNIQUE NOT NULL,
      stripe_customer_id TEXT NOT NULL,
      plan TEXT NOT NULL,
      status TEXT NOT NULL,
      current_period_end TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS processed_webhook_events (
      stripe_event_id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      promo_amount_cents INTEGER,
      tokens INTEGER NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: async-job columns, added after generations already existed
  // in production. ALTER TABLE ADD COLUMN has no "IF NOT EXISTS" in SQLite,
  // so check first — this runs on every cold start but only alters once.
  const genCols = _db.prepare("PRAGMA table_info(generations)").all().map(c => c.name);
  if (!genCols.includes('request_id')) {
    _db.exec("ALTER TABLE generations ADD COLUMN request_id TEXT");
  }
  if (!genCols.includes('estimate_brl')) {
    _db.exec("ALTER TABLE generations ADD COLUMN estimate_brl REAL");
  }
  if (!genCols.includes('error_message')) {
    _db.exec("ALTER TABLE generations ADD COLUMN error_message TEXT");
  }

  // Migration: social login. password_hash stays NOT NULL in the original
  // schema, so Google-only accounts get password_hash = '' instead of
  // NULL — simpler than rebuilding the table, and login-by-password
  // already refuses empty hashes (see getUserByEmail usage in the login
  // route) so it can't be used to sign in anyway.
  const userCols = _db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes('google_id')) {
    _db.exec("ALTER TABLE users ADD COLUMN google_id TEXT");
    _db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL");
  }
  if (!userCols.includes('facebook_id')) {
    _db.exec("ALTER TABLE users ADD COLUMN facebook_id TEXT");
    _db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id) WHERE facebook_id IS NOT NULL");
  }

  // Migration: 7-day free trial. first_charge_done tracks whether this
  // subscription has ever actually been billed yet — the first invoice
  // after the trial grants (plan tokens − trial bonus) instead of the
  // full plan amount, since the person already got the trial bonus
  // up front. Every invoice after that is a normal renewal.
  const subCols = _db.prepare("PRAGMA table_info(subscriptions)").all().map(c => c.name);
  if (!subCols.includes('first_charge_done')) {
    _db.exec("ALTER TABLE subscriptions ADD COLUMN first_charge_done INTEGER NOT NULL DEFAULT 0");
  }

  // Migration: strikethrough "was" price for the admin promo-price feature,
  // added after the plans table already existed in production.
  const planCols = _db.prepare("PRAGMA table_info(plans)").all().map(c => c.name);
  if (!planCols.includes('promo_amount_cents')) {
    _db.exec("ALTER TABLE plans ADD COLUMN promo_amount_cents INTEGER");
  }

  // Seed default settings and plans on first run, from the values that
  // were previously hardcoded — the admin panel edits these afterward,
  // this only fills them in once if the tables are empty.
  const settingsCount = _db.prepare('SELECT COUNT(*) AS n FROM settings').get().n;
  if (settingsCount === 0) {
    const defaults = {
      usd_to_brl: process.env.USD_TO_BRL || '5.30',
      price_markup: process.env.PRICE_MARKUP || '7',
      trial_bonus_tokens: '500',
      signup_free_credits: process.env.SIGNUP_FREE_CREDITS || '0',
    };
    const insertSetting = _db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(defaults)) insertSetting.run(k, String(v));
  }

  // Cache-busting counter for admin-uploaded logo/carousel files — bumped
  // on every upload so <img> tags across the site can append ?v=N and get
  // the new file immediately instead of a cached old one. Added as its
  // own check (not just in the block above) so it also gets created for
  // installs where `settings` already had other rows.
  if (getSetting('assets_version', null) === null) {
    setSetting('assets_version', '1');
  }

  // Editable promo banner text — same "own check" reasoning as
  // assets_version above, so existing installs get it too.
  if (getSetting('promo_text', null) === null) {
    setSetting('promo_text', '🎁 7 dias grátis + 500 VisuTokens de bônus só por assinar');
  }

  // Editable homepage hero title/subtitle. The title supports a simple
  // **wrap like this** markup to highlight part of it in the brand color
  // (parsed client-side — see lib/useHeroContent.js).
  if (getSetting('hero_title', null) === null) {
    setSetting('hero_title', 'Sua ideia vira imagem, vídeo ou cena de cinema **em segundos.**');
  }
  if (getSetting('hero_subtitle', null) === null) {
    setSetting('hero_subtitle', 'Escolha abaixo o que você quer criar e já comece a mexer nas opções — sem precisar de software caro.');
  }

  // Where the floating support-bubble contact form sends messages —
  // editable in /admin, no redeploy needed to change it.
  if (getSetting('support_email', null) === null) {
    setSetting('support_email', '');
  }

  // One-time fee charged upfront to start a subscription trial (in
  // addition to the trial itself) — 0 means the trial stays fully free.
  // Editable in /admin.
  if (getSetting('trial_entry_fee_cents', null) === null) {
    setSetting('trial_entry_fee_cents', '0');
  }

  // Model kill-switch — admin can disable a specific Muapi model (e.g.
  // during an outage on their end) without a code change or redeploy.
  if (getSetting('disabled_models', null) === null) {
    setSetting('disabled_models', '[]');
  }

  const plansCount = _db.prepare('SELECT COUNT(*) AS n FROM plans').get().n;
  if (plansCount === 0) {
    const insertPlan = _db.prepare(
      'INSERT INTO plans (id, name, amount_cents, tokens, display_order) VALUES (?, ?, ?, ?, ?)'
    );
    insertPlan.run('basico', 'Básico', 2900, 2900, 1);
    insertPlan.run('pro', 'Pro', 7900, 8700, 2);
    insertPlan.run('premium', 'Premium', 19900, 23880, 3);
  }

  // Indexes — added after the tables already existed in production, so
  // every one of these uses IF NOT EXISTS. Without them, login, loading
  // the studio, and viewing a user's history all did a full table scan;
  // with hundreds of users and thousands of generations, that's the
  // difference between an instant response and a very noticeable delay.
  _db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
    CREATE INDEX IF NOT EXISTS idx_users_facebook_id ON users(facebook_id);
    CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
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

export function getUserByGoogleId(googleId) {
  return getDb().prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);
}

export function getUserByFacebookId(facebookId) {
  return getDb().prepare('SELECT * FROM users WHERE facebook_id = ?').get(facebookId);
}

export function getUserById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function createUser(email, passwordHash) {
  const info = getDb().prepare(
    'INSERT INTO users (email, password_hash, credits_balance) VALUES (?, ?, ?)'
  ).run(email, passwordHash, Number(getSetting('signup_free_credits', process.env.SIGNUP_FREE_CREDITS || 0)));
  return getUserById(Number(info.lastInsertRowid));
}

// Google-only account — no password, identified by google_id. Same free
// starting balance as a normal signup.
export function createUserWithGoogle(email, googleId) {
  const info = getDb().prepare(
    'INSERT INTO users (email, password_hash, credits_balance, google_id) VALUES (?, ?, ?, ?)'
  ).run(email, '', Number(getSetting('signup_free_credits', process.env.SIGNUP_FREE_CREDITS || 0)), googleId);
  return getUserById(Number(info.lastInsertRowid));
}

// Someone who signed up with email+password before is now using "Continue
// with Google" for the first time with the same email — attach the
// google_id to their existing account instead of creating a duplicate.
export function linkGoogleToUser(userId, googleId) {
  getDb().prepare('UPDATE users SET google_id = ? WHERE id = ?').run(googleId, userId);
  return getUserById(userId);
}

// Same pattern as Google — no password, identified by facebook_id.
export function createUserWithFacebook(email, facebookId) {
  const info = getDb().prepare(
    'INSERT INTO users (email, password_hash, credits_balance, facebook_id) VALUES (?, ?, ?, ?)'
  ).run(email, '', Number(getSetting('signup_free_credits', process.env.SIGNUP_FREE_CREDITS || 0)), facebookId);
  return getUserById(Number(info.lastInsertRowid));
}

export function linkFacebookToUser(userId, facebookId) {
  getDb().prepare('UPDATE users SET facebook_id = ? WHERE id = ?').run(facebookId, userId);
  return getUserById(userId);
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

export function logGeneration(userId, model, kind, costCredits, status, outputUrl, errorMessage) {
  getDb().prepare(
    'INSERT INTO generations (user_id, model, kind, cost_credits, status, output_url, error_message) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(userId, model, kind, costCredits, status, outputUrl || null, errorMessage ? String(errorMessage).slice(0, 500) : null);
}

// ── Async generation jobs ──────────────────────────────────────────────
// Used by /api/generate (creates the job) and /api/generate/poll (checks
// and settles it). Keeping this as its own small set of functions makes
// the "only charge once" guarantee explicit: settleGeneration only acts
// when the job is still 'pending', so a poll that arrives twice (e.g. two
// browser tabs, or a retry) can't double-charge or double-refund.

export function createPendingGeneration(userId, model, kind, requestId, estimateBRL) {
  const info = getDb().prepare(
    'INSERT INTO generations (user_id, model, kind, cost_credits, status, request_id, estimate_brl) VALUES (?, ?, ?, 0, ?, ?, ?)'
  ).run(userId, model, kind, 'pending', requestId, estimateBRL);
  return Number(info.lastInsertRowid);
}

export function getGenerationById(id) {
  return getDb().prepare('SELECT * FROM generations WHERE id = ?').get(id);
}

// Marks a pending job completed and does the true-up charge (refund the
// estimate, charge the real cost). No-op if the job isn't 'pending' anymore
// — that's what makes repeated polls safe.
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
    // else: balance dropped below the real cost between steps — still
    // deliver the result the user already paid the estimate for, log the
    // shortfall via the transaction history for reconciliation.

    getDb().prepare(
      'UPDATE generations SET status = ?, cost_credits = ?, output_url = ? WHERE id = ?'
    ).run('completed', realChargeBRL, outputUrl || null, id);

    return getGenerationById(id);
  });
}

// Marks a pending job failed and refunds the estimate in full. No-op if the
// job isn't 'pending' anymore.
export function settleGenerationFailure(id, errorMessage) {
  return withTransaction(() => {
    const job = getGenerationById(id);
    if (!job || job.status !== 'pending') return job;

    getDb().prepare('UPDATE users SET credits_balance = credits_balance + ? WHERE id = ?')
      .run(job.estimate_brl, job.user_id);
    getDb().prepare(
      'INSERT INTO transactions (user_id, type, amount, description) VALUES (?, ?, ?, ?)'
    ).run(job.user_id, 'refund', job.estimate_brl, 'estorno — geração falhou');

    getDb().prepare('UPDATE generations SET status = ?, error_message = ? WHERE id = ?')
      .run('failed', errorMessage ? String(errorMessage).slice(0, 500) : null, id);
    return getGenerationById(id);
  });
}

// For the /leads admin page — every signed-up user, newest first, with
// their current balance. No password hash included.
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

// ── Subscriptions ──────────────────────────────────────────────────────

// Webhook idempotency: Stripe can (and does) redeliver the same event more
// than once. Every handler checks this first and skips if already seen —
// this is what stops a redelivered "invoice.paid" from granting the
// monthly tokens twice.
export function wasWebhookEventProcessed(stripeEventId) {
  return !!getDb().prepare('SELECT 1 FROM processed_webhook_events WHERE stripe_event_id = ?').get(stripeEventId);
}

export function markWebhookEventProcessed(stripeEventId) {
  getDb().prepare('INSERT OR IGNORE INTO processed_webhook_events (stripe_event_id) VALUES (?)').run(stripeEventId);
}

// Created once, right after Stripe confirms the subscription checkout.
// Created once, right after Stripe confirms the subscription checkout.
// Every new subscription starts with a 7-day trial, so status is always
// 'trialing' here — the webhook flips it to 'active' via
// markFirstChargeDone() once the first real charge goes through.
export function createSubscription(userId, stripeSubscriptionId, stripeCustomerId, plan) {
  getDb().prepare(
    'INSERT INTO subscriptions (user_id, stripe_subscription_id, stripe_customer_id, plan, status) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, stripeSubscriptionId, stripeCustomerId, plan, 'trialing');
}

export function getSubscriptionByStripeId(stripeSubscriptionId) {
  return getDb().prepare('SELECT * FROM subscriptions WHERE stripe_subscription_id = ?').get(stripeSubscriptionId);
}

// The one the user sees in /conta — their most recent active, trialing,
// or canceling-but-not-yet-ended subscription, if any.
export function getActiveSubscriptionForUser(userId) {
  return getDb().prepare(
    "SELECT * FROM subscriptions WHERE user_id = ? AND status IN ('trialing', 'active', 'canceling') ORDER BY created_at DESC LIMIT 1"
  ).get(userId);
}

export function updateSubscriptionStatus(stripeSubscriptionId, status) {
  getDb().prepare(
    "UPDATE subscriptions SET status = ?, updated_at = datetime('now') WHERE stripe_subscription_id = ?"
  ).run(status, stripeSubscriptionId);
}

// Called from the invoice.paid webhook handler — marks that this
// subscription has now been actually charged at least once, so the NEXT
// invoice.paid grants the full plan amount instead of (plan − trial bonus).
export function markFirstChargeDone(stripeSubscriptionId) {
  getDb().prepare(
    "UPDATE subscriptions SET first_charge_done = 1, status = 'active', updated_at = datetime('now') WHERE stripe_subscription_id = ? AND status = 'trialing'"
  ).run(stripeSubscriptionId);
}

export default getDb;

// ── Settings (admin-editable business config) ───────────────────────────

export function getSetting(key, fallback) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

export function getAllSettings() {
  const rows = getDb().prepare('SELECT key, value FROM settings').all();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

export function setSetting(key, value) {
  getDb().prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
  ).run(key, String(value));
}

// Called after every successful admin upload (logo or carousel) — the
// site's <img>/<video> tags append ?v=<this> so the browser fetches the
// new file immediately instead of showing a cached old one.
export function bumpAssetsVersion() {
  const current = Number(getSetting('assets_version', '1'));
  setSetting('assets_version', String(current + 1));
  return current + 1;
}

// ── Plans (admin-editable subscription tiers) ────────────────────────────

export function getAllPlans() {
  return getDb().prepare('SELECT * FROM plans ORDER BY display_order ASC').all();
}

export function getPlanById(id) {
  return getDb().prepare('SELECT * FROM plans WHERE id = ?').get(id);
}

export function updatePlan(id, { name, amount_cents, tokens, promo_amount_cents }) {
  getDb().prepare(
    "UPDATE plans SET name = ?, amount_cents = ?, tokens = ?, promo_amount_cents = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(name, amount_cents, tokens, promo_amount_cents ?? null, id);
}

// ── Admin: user management ───────────────────────────────────────────────

// Simple search by email substring — used by the admin panel, not
// exposed publicly.
export function searchUsers(query, limit = 25, offset = 0) {
  const q = `%${query || ''}%`;
  return getDb().prepare(
    'SELECT id, email, credits_balance, created_at, google_id, facebook_id FROM users WHERE email LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).all(q, limit, offset);
}

export function countUsers(query) {
  const q = `%${query || ''}%`;
  return getDb().prepare('SELECT COUNT(*) AS n FROM users WHERE email LIKE ?').get(q).n;
}

// Used by the Excel export — no pagination, every matching user at once.
export function searchAllUsers(query) {
  const q = `%${query || ''}%`;
  return getDb().prepare(
    'SELECT id, email, credits_balance, created_at, google_id, facebook_id FROM users WHERE email LIKE ? ORDER BY created_at DESC'
  ).all(q);
}

// Signed up but never started a subscription (trialing/active/canceling)
// — the audience for a "come back and subscribe" re-engagement email.
export function getUsersWithoutActiveSubscription() {
  return getDb().prepare(`
    SELECT u.id, u.email, u.created_at
    FROM users u
    WHERE NOT EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = u.id AND s.status IN ('trialing', 'active', 'canceling')
    )
    ORDER BY u.created_at DESC
  `).all();
}

// Marketing audiences — each returns { id, email, created_at }[]. Used by
// the admin Marketing tab so Rafael can pick who a campaign goes to.
// Powers the admin "Erros" tab — every failed generation from the last
// 7 days, newest first, with the user's email so a pattern (or a single
// angry customer) is easy to spot.
// Powers the admin "Erros" tab — failed generations with the user's
// email so a pattern (or a single angry customer) is easy to spot.
// With no date, the last 7 days; with a specific "YYYY-MM-DD" date,
// just that one day (server's local day boundaries).
export function getRecentFailures({ days = 7, date } = {}) {
  const db = getDb();
  if (date) {
    return db.prepare(`
      SELECT g.id, g.model, g.kind, g.error_message, g.created_at, u.email AS user_email
      FROM generations g
      JOIN users u ON u.id = g.user_id
      WHERE g.status = 'failed' AND date(g.created_at) = date(?)
      ORDER BY g.created_at DESC
    `).all(date);
  }
  return db.prepare(`
    SELECT g.id, g.model, g.kind, g.error_message, g.created_at, u.email AS user_email
    FROM generations g
    JOIN users u ON u.id = g.user_id
    WHERE g.status = 'failed' AND g.created_at >= datetime('now', ?)
    ORDER BY g.created_at DESC
  `).all(`-${days} days`);
}

export function getDisabledModels() {
  try {
    return JSON.parse(getSetting('disabled_models', '[]'));
  } catch {
    return [];
  }
}

export function setDisabledModels(ids) {
  setSetting('disabled_models', JSON.stringify(Array.isArray(ids) ? ids : []));
}

export function getUsersBySegment(segment) {
  const db = getDb();
  switch (segment) {
    case 'all':
      return db.prepare('SELECT id, email, created_at FROM users ORDER BY created_at DESC').all();
    case 'active_subscription':
      return db.prepare(`
        SELECT DISTINCT u.id, u.email, u.created_at
        FROM users u
        JOIN subscriptions s ON s.user_id = u.id
        WHERE s.status IN ('trialing', 'active', 'canceling')
        ORDER BY u.created_at DESC
      `).all();
    case 'canceled_subscription':
      return db.prepare(`
        SELECT DISTINCT u.id, u.email, u.created_at
        FROM users u
        JOIN subscriptions s ON s.user_id = u.id
        WHERE s.status = 'canceled'
          AND NOT EXISTS (
            SELECT 1 FROM subscriptions s2
            WHERE s2.user_id = u.id AND s2.status IN ('trialing', 'active', 'canceling')
          )
        ORDER BY u.created_at DESC
      `).all();
    case 'no_subscription':
    default:
      return getUsersWithoutActiveSubscription();
  }
}

export function getUserTransactions(userId, limit = 100) {
  return getDb().prepare(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(userId, limit);
}

export function getUserGenerations(userId, limit = 100) {
  return getDb().prepare(
    'SELECT * FROM generations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(userId, limit);
}

export function getUserSubscriptionHistory(userId) {
  return getDb().prepare(
    'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC'
  ).all(userId);
}

export function adminSetPassword(userId, passwordHash) {
  getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
}
