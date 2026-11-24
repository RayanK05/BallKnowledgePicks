// Stats & Leaderboard API (Task 6)
//
//   GET /api/stats/charts                        data for the Chart.js charts
//   GET /api/stats/leaderboard?search=&limit=    global leaderboard + username search (SQL ILIKE)
//   GET /api/stats/leaderboard/export?format=csv|pdf&search=
//   GET /api/stats/views                         list of the 10 views (key, title, description)
//   GET /api/stats/views/:key                    one view's rows as JSON
//   GET /api/stats/views/:key/export?format=csv|pdf
//
// Everything here is read-only, so guests (no session) are allowed, matching the
// permission matrix ("Stats & Leaderboard: guest = read only").
// Mount in server/src/server.js, after the session middleware:
//   app.use('/api/stats', require('./routes/stats'));

const express = require('express');
const pool = require('../db'); // Rayan's server/src/db.js (pg Pool)
const { VIEWS, VIEWS_BY_KEY } = require('./statsViews');
const { sendCsv, sendPdf, formatCell } = require('./exporters');

const router = express.Router();

// If Postgres restarts or drops an idle connection, pg emits 'error' on the
// pool; with no listener that event crashes the whole Node process. Log it
// instead: the next query reconnects, or returns a 503 below.
// (Best place for this is db.js; added here so the server survives either way.)
if (!pool.listenerCount('error')) {
  pool.on('error', (err) => console.error('[db] idle client error:', err.code || err.message));
}

const MAX_SEARCH_LEN = 30; // USERS.username is VARCHAR(30)
const EXPORT_FORMATS = new Set(['csv', 'pdf']);

// ---------- helpers ----------
function badRequest(res, message) {
  return res.status(400).json({ ok: false, error: message });
}

// Validates ?search=. Returns { pattern } or { error }.
// The user's text is escaped so % and _ are matched literally, then wrapped in %...%
// and passed as a bind parameter ($1) to ILIKE, so the filtering happens in SQL.
function parseSearch(raw) {
  if (raw === undefined) return { pattern: null };
  if (typeof raw !== 'string') return { error: 'search must be a single string' };
  const term = raw.trim();
  if (term.length > MAX_SEARCH_LEN) {
    return { error: `search must be at most ${MAX_SEARCH_LEN} characters` };
  }
  if (term === '') return { pattern: null };
  return { pattern: `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%` };
}

function parseLimit(raw, fallback, max) {
  if (raw === undefined) return { limit: fallback };
  if (!/^\d+$/.test(String(raw))) return { error: 'limit must be a positive whole number' };
  const n = Number(raw);
  if (n < 1 || n > max) return { error: `limit must be between 1 and ${max}` };
  return { limit: n };
}

function parseFormat(raw) {
  const f = String(raw || '').toLowerCase();
  return EXPORT_FORMATS.has(f) ? f : null;
}

// Global ranking is computed BEFORE the search filter, so searching "james"
// still shows James's real global rank (e.g. #1 of 10), not #1 of 1.
const LEADERBOARD_SQL = `
  SELECT lb.rank,
         lb.username,
         COALESCE(a.correct_predictions, 0)::int AS correct_predictions,
         COALESCE(a.total_predictions, 0)::int   AS completed_predictions,
         lb.user_score,
         lb.user_id,
         lb.total_users
  FROM (
    SELECT user_id,
           username,
           user_score,
           RANK()   OVER (ORDER BY user_score DESC)::int AS rank,
           COUNT(*) OVER ()::int                         AS total_users
    FROM UserLeaderboard
  ) lb
  LEFT JOIN UserPredictionAccuracy a ON a.user_id = lb.user_id
  WHERE ($1::text IS NULL OR lb.username ILIKE $1)
  ORDER BY lb.rank ASC, lb.username ASC
  LIMIT $2`;

async function queryLeaderboard(pattern, limit) {
  const { rows } = await pool.query(LEADERBOARD_SQL, [pattern, limit]);
  return rows;
}

async function queryView(def) {
  // def.view and def.orderBy come from the whitelist, never from the request.
  const result = await pool.query(`SELECT * FROM ${def.view} ORDER BY ${def.orderBy}`);
  // DATE columns -> plain 'YYYY-MM-DD' strings so the UI shows no timezone shift
  const rows = result.rows.map((r) => {
    const out = {};
    for (const [k, v] of Object.entries(r)) out[k] = v instanceof Date ? formatCell(v) : v;
    return out;
  });
  return { columns: result.fields.map((f) => f.name), rows };
}

// ---------- charts ----------
router.get('/charts', async (req, res, next) => {
  try {
    const [accuracy, followed] = await Promise.all([
      pool.query(`
        SELECT user_id,
               username,
               accuracy_percentage::float AS accuracy,
               correct_predictions::int   AS correct,
               total_predictions::int     AS total
        FROM UserPredictionAccuracy
        ORDER BY accuracy_percentage DESC, username ASC`),
      pool.query(`
        SELECT team_name, total_followers::int AS followers
        FROM MostFollowedTeams
        ORDER BY total_followers DESC, team_name ASC
        LIMIT 10`),
    ]);
    res.json({
      ok: true,
      accuracy: accuracy.rows,
      mostFollowedTeams: followed.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ---------- leaderboard ----------
router.get('/leaderboard', async (req, res, next) => {
  const { pattern, error } = parseSearch(req.query.search);
  if (error) return badRequest(res, error);
  const lim = parseLimit(req.query.limit, 50, 100);
  if (lim.error) return badRequest(res, lim.error);

  try {
    const rows = await queryLeaderboard(pattern, lim.limit);
    res.json({ ok: true, search: req.query.search?.trim() || '', count: rows.length, rows });
  } catch (err) {
    next(err);
  }
});

router.get('/leaderboard/export', async (req, res, next) => {
  const format = parseFormat(req.query.format);
  if (!format) return badRequest(res, 'format must be csv or pdf');
  const { pattern, error } = parseSearch(req.query.search);
  if (error) return badRequest(res, error);

  try {
    const rows = await queryLeaderboard(pattern, 10000);
    const columns = ['rank', 'username', 'correct_predictions', 'completed_predictions', 'user_score'];
    const term = req.query.search?.trim();
    if (format === 'csv') return sendCsv(res, 'leaderboard', columns, rows);
    return sendPdf(res, 'leaderboard', {
      title: 'Global Leaderboard',
      description: term ? `Users matching "${term}"` : 'All users ranked by score',
      columns,
      rows,
    });
  } catch (err) {
    next(err);
  }
});

// ---------- the 10 views ----------
router.get('/views', (req, res) => {
  res.json({ ok: true, views: VIEWS.map(({ key, view, title, description }) => ({ key, view, title, description })) });
});

router.get('/views/:key', async (req, res, next) => {
  const def = VIEWS_BY_KEY.get(req.params.key);
  if (!def) return res.status(404).json({ ok: false, error: `Unknown view "${req.params.key}"` });
  try {
    const { columns, rows } = await queryView(def);
    res.json({
      ok: true,
      key: def.key,
      view: def.view,
      title: def.title,
      description: def.description,
      columns,
      rows,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/views/:key/export', async (req, res, next) => {
  const def = VIEWS_BY_KEY.get(req.params.key);
  if (!def) return res.status(404).json({ ok: false, error: `Unknown view "${req.params.key}"` });
  const format = parseFormat(req.query.format);
  if (!format) return badRequest(res, 'format must be csv or pdf');

  try {
    const { columns, rows } = await queryView(def);
    if (format === 'csv') return sendCsv(res, def.view, columns, rows);
    return sendPdf(res, def.view, { title: def.title, description: def.description, columns, rows });
  } catch (err) {
    next(err);
  }
});

// ---------- error handling for this router ----------
// Database unreachable -> 503 instead of a generic 500. Anything else goes on
// to the app-wide error middleware.
const DB_DOWN_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', '57P01', '57P03', '08006', '08001']);
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  if (res.headersSent) return next(err); // e.g. failed mid-way through a PDF stream
  if (DB_DOWN_CODES.has(err.code)) {
    console.error('[stats] database unavailable:', err.code);
    return res.status(503).json({ ok: false, error: 'The database is unavailable. Please try again shortly.' });
  }
  if (err.code === '42P01') {
    // undefined_table: a view hasn't been created in this database
    console.error('[stats] missing view:', err.message);
    return res.status(500).json({ ok: false, error: 'A required database view is missing. Run the views SQL script.' });
  }
  return next(err);
});

module.exports = router;
