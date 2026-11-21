const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');           
const app = express();
app.use(express.json());

const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);

app.use(session({
  store: new pgSession({
    pool: db,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24,
  },
}));


function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ ok: false, error: 'Please log in' });
  }
  next();
}

async function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ ok: false, error: 'Please log in' });
  }
  try {
    // check the database, not the cookie, so role changes take effect immediately
    const result = await db.query('SELECT role FROM USERS WHERE user_id = $1', [req.session.userId]);
    if (result.rows[0]?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Admins only' });
    }
    next();
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
}

// test route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Ball Knowledge Picks!' });
});

app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) FROM USERS');
    res.json({ ok: true, users: result.rows[0].count });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// login route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM USERS WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    req.session.userId = user.user_id;
    req.session.role = user.role;
    if (!isMatch) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }
    res.json({ ok: true, user: { id: user.user_id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});


// register route: creates a new user
app.post('/api/register', async (req, res) => {
  try {
    const {username, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO USERS (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING username, email, role`,
      [username, email, hash]
    ); 

    res.status(201).json({ ok: true, user: result.rows[0] });

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// get the current logged-in user
app.get('/api/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ ok: false, error: 'Not logged in' });
  }
  try {
    const result = await db.query(
      'SELECT user_id, username, email, role, user_score FROM USERS WHERE user_id = $1',
      [req.session.userId]
    );
    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// log out
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ ok: false, error: 'Could not log out' });
    res.clearCookie('connect.sid');
    res.json({ ok: true, message : 'Logged out' });
  });
});

app.get('/api/admin/test', requireAdmin, (req, res) => {
  res.json({ ok: true, message: 'Welcome, admin' });
});


app.listen(3000, () => console.log('Running on http://localhost:3000'));