const express = require('express');
const db = require('./db');           
const app = express();

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Ball Knowledge Picks!' });
});


app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) FROM users');
    res.json({ ok: true, users: result.rows[0].count });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use('/api/stats', require('./routes/stats'));

app.listen(3000, () => console.log('Running on http://localhost:3000'));