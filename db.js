import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || './db/outreach.sqlite';

let _db;

export function getDb() {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  return _db;
}

export function initDb() {
  const db = getDb();
  const schema = readFileSync(join(__dirname, '../db/schema.sql'), 'utf8');
  db.exec(schema);
  seedTemplates(db);
  seedSettings(db);
}

function seedTemplates(db) {
  const count = db.prepare('SELECT COUNT(*) as c FROM templates').get().c;
  if (count > 0) return;

  const now = new Date().toISOString();
  const insert = db.prepare('INSERT INTO templates (name, type, body, updated_at) VALUES (?, ?, ?, ?)');

  insert.run(
    'Inbound Reply',
    'inbound',
    `Subject: Re: [GAME] — indie.io

Hey [FIRST_NAME],

Thanks for reaching out — we had a look at [GAME] and really like what you're building.

[IF STORE_URL:]  • [STORE_PLATFORM]: [STORE_URL]
[/IF][IF PITCH_DECK_URL:]  • Pitch deck: [PITCH_DECK_URL]
[/IF]
At indie.io we can help with:
  • Localization — JP, KR, DE, BR handled in-house
  • Forecasting — data-backed revenue modeling pre-launch
  • Upscaling — amplifying your existing momentum
  • Distribution — PC-first network and Steam relationships
[IF CONSOLE_INTEREST:]  • Console porting — via our Redhaven partnership
[/IF]
Regardless of where things land on a publishing deal, here's $200 toward our tool suite:
  [CREDIT_LINK_URL]

Would love to hop on a call. What does your schedule look like?

— [REP_NAME], indie.io`,
    now
  );

  insert.run(
    'Public Reply',
    'public_reply',
    `Hey [USERNAME] — we do exactly this at indie.io. [TOOL_MENTION] handled in-house. Happy to share more if you want to DM.`,
    now
  );

  insert.run(
    'DM',
    'dm',
    `Hey [USERNAME],

Saw your post in [SOURCE_DETAIL] — sounds like you're at an interesting stage[IF GAME: with [GAME]][/IF].

We work with indie studios at exactly this point. Happy to share what we do at indie.io if you're open to it — no pressure.

— [REP_NAME], indie.io`,
    now
  );
}

function seedSettings(db) {
  const upsert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  upsert.run('rep_name', process.env.REP_NAME || 'James');
  upsert.run('credit_link_url', process.env.CREDIT_LINK_URL || 'https://indie.io/credit');
}

// ── Inbound helpers ──────────────────────────────────────────────────────────

export function insertInbound(row) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO inbound (
      received_at, full_name, studio, email, country, team_size, game,
      store_url, store_platform, wishlist_count, pitch_deck_url, has_pitch_deck,
      funding_required, console_interest, how_they_heard, free_text_notes, raw_email
    ) VALUES (
      @received_at, @full_name, @studio, @email, @country, @team_size, @game,
      @store_url, @store_platform, @wishlist_count, @pitch_deck_url, @has_pitch_deck,
      @funding_required, @console_interest, @how_they_heard, @free_text_notes, @raw_email
    )
  `);
  return stmt.run(row);
}

export function getAllInbound() {
  return getDb().prepare('SELECT * FROM inbound WHERE dismissed = 0 OR dismissed IS NULL ORDER BY received_at DESC').all();
}

export function getInboundById(id) {
  return getDb().prepare('SELECT * FROM inbound WHERE id = ?').get(id);
}

export function markInboundSent(id, bodySent) {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE inbound SET draft_sent = 1, sent_at = ? WHERE id = ?').run(now, id);
  return now;
}

export function markInboundDismissed(id) {
  getDb().prepare('UPDATE inbound SET dismissed = 1 WHERE id = ?').run(id);
}

// ── Signal helpers ───────────────────────────────────────────────────────────

export function insertSignal(row) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO signals (
      detected_at, source, source_detail, author, content, url,
      keywords_matched, heat, public_reply_draft, dm_draft
    ) VALUES (
      @detected_at, @source, @source_detail, @author, @content, @url,
      @keywords_matched, @heat, @public_reply_draft, @dm_draft
    )
  `);
  return stmt.run(row);
}

export function signalExistsByUrl(url) {
  return !!getDb().prepare('SELECT 1 FROM signals WHERE url = ?').get(url);
}

export function signalExistsByAuthorChannelWindow(author, sourceDetail, windowMs) {
  const since = new Date(Date.now() - windowMs).toISOString();
  return !!getDb()
    .prepare('SELECT 1 FROM signals WHERE author = ? AND source_detail = ? AND detected_at > ?')
    .get(author, sourceDetail, since);
}

export function getAllSignals(filters = {}) {
  let q = 'SELECT * FROM signals WHERE dismissed = 0';
  const params = [];
  if (filters.source) { q += ' AND source = ?'; params.push(filters.source); }
  if (filters.heat)   { q += ' AND heat = ?';   params.push(filters.heat); }
  q += ' ORDER BY detected_at DESC';
  return getDb().prepare(q).all(...params);
}

export function getSignalById(id) {
  return getDb().prepare('SELECT * FROM signals WHERE id = ?').get(id);
}

export function markSignalReplySent(id) {
  getDb().prepare('UPDATE signals SET public_reply_sent = 1 WHERE id = ?').run(id);
}

export function markSignalDmSent(id) {
  getDb().prepare('UPDATE signals SET dm_sent = 1 WHERE id = ?').run(id);
}

export function markSignalDismissed(id) {
  getDb().prepare('UPDATE signals SET dismissed = 1 WHERE id = ?').run(id);
}

// ── Template helpers ─────────────────────────────────────────────────────────

export function getAllTemplates() {
  return getDb().prepare('SELECT * FROM templates ORDER BY id').all();
}

export function getTemplateById(id) {
  return getDb().prepare('SELECT * FROM templates WHERE id = ?').get(id);
}

export function getTemplateByType(type) {
  return getDb().prepare('SELECT * FROM templates WHERE type = ? LIMIT 1').get(type);
}

export function updateTemplate(id, body) {
  getDb().prepare('UPDATE templates SET body = ?, updated_at = ? WHERE id = ?')
    .run(body, new Date().toISOString(), id);
}

// ── Send log helpers ─────────────────────────────────────────────────────────

export function insertSendLog(row) {
  const db = getDb();
  db.prepare(`
    INSERT INTO send_log (sent_at, type, recipient, source_id, body_sent)
    VALUES (@sent_at, @type, @recipient, @source_id, @body_sent)
  `).run(row);
}

export function getSentToday() {
  const today = new Date().toISOString().split('T')[0];
  return getDb().prepare("SELECT COUNT(*) as c FROM send_log WHERE sent_at LIKE ?").get(`${today}%`).c;
}

export function getRecentActivity(limit = 10) {
  return getDb().prepare('SELECT * FROM send_log ORDER BY sent_at DESC LIMIT ?').all(limit);
}

// ── Settings helpers ─────────────────────────────────────────────────────────

export function getSetting(key) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

export function setSetting(key, value) {
  getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}

export function getAllSettings() {
  const rows = getDb().prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

// ── Overview ─────────────────────────────────────────────────────────────────

export function getOverview() {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  return {
    inbound_pending: db.prepare('SELECT COUNT(*) as c FROM inbound WHERE draft_sent = 0').get().c,
    inbound_total:   db.prepare('SELECT COUNT(*) as c FROM inbound').get().c,
    signals_hot:     db.prepare("SELECT COUNT(*) as c FROM signals WHERE heat = 'hot' AND dismissed = 0").get().c,
    signals_total:   db.prepare('SELECT COUNT(*) as c FROM signals WHERE dismissed = 0').get().c,
    sent_today:      db.prepare("SELECT COUNT(*) as c FROM send_log WHERE sent_at LIKE ?").get(`${today}%`).c,
    top_signals:     db.prepare("SELECT * FROM signals WHERE heat = 'hot' AND dismissed = 0 ORDER BY detected_at DESC LIMIT 5").all(),
    recent_activity: db.prepare('SELECT * FROM send_log ORDER BY sent_at DESC LIMIT 10').all(),
  };
}
