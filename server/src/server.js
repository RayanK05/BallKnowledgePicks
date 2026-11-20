const express = require('express');
const db = require('./db');           
const app = express();

const BASE = "https://api.balldontlie.io/v1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const season = 2026;

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Ball Knowledge Picks!' });
});


app.get('/api/teams', async (req, res) => {
  try {
    const result = await db.query('SELECT team_id, team_name FROM teams ORDER BY team_name');
    res.json({ ok: true, users: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

//this will get the past present and future games present in the DB
app.get('/api/games', async (req, res) => {
  try {
    const result = await getGames();
    res.json({ ok: true, games: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// connect to the basketball API and add teams and the games to the data base one time
// add games for one season check every day for winner_id
const getBasketBallAPI = async (path, params) => {
  const { season, per_page, cursor } = params;

  const url = new URL(`${BASE}${path}`);
  url.searchParams.append("seasons[]", season);
  url.searchParams.set("per_page", per_page);
  if (cursor) url.searchParams.set("cursor", cursor);

  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: process.env.BASKETBALLAPI },
    });
    if (res.status === 429) { await sleep(15000); continue; }
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }

  throw new Error("Maximum API retry attempts exceeded");
}

//put games in the data base 
const getGames = async () => {
  const all = [];
  let cursor;

  do {
    const body = await getBasketBallAPI("/games", { season, per_page: 100, cursor });
    all.push(...body.data);
    cursor = body.meta?.next_cursor;
    await sleep(12500); // free tier: 5 requests/minute
  } while (cursor);

  return all;
}

//check once a day for the scheduled games to see if they are completed


// users can follow one team + will receive notifications on win and loss updates from the followed team



app.listen(3000, () => console.log('Running on http://localhost:3000'));