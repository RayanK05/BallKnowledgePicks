const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');           
const app = express();
app.use(express.json());

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
    if (!isMatch) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }
    res.json({ ok: true, user: { id: user.user_id, username: user.username, email: user.email } });
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


app.listen(3000, () => console.log('Running on http://localhost:3000'));