const express = require('express');
const app = express();

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Ball Knowledge Picks!' });
});

app.get('/api/hello/:name', (req, res) => {
  res.json({ message: `Hello, ${req.params.name}!` });
});

app.listen(3000, () => console.log('Running on http://localhost:3000'));