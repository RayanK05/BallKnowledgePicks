const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('./db');           
const authenticateToken = require('./authenticateToken');
const app = express();
app.use(express.json());

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

    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ ok: true, token, user: { id: user.user_id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

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

app.post('/api/follow', authenticateToken, async (req, res) => {
  try {
    const { user_id, team_id } = req.body;

    // Check if user already follows the team
    const existing = await db.query(
      `SELECT * FROM USER_FOLLOWED_TEAMS
       WHERE user_id = $1 AND team_id = $2`,
      [user_id, team_id]
    );

    if (existing.rows.length > 0) {
      // Already following -> Unfollow
      await db.query(
        `DELETE FROM USER_FOLLOWED_TEAMS
         WHERE user_id = $1 AND team_id = $2`,
        [user_id, team_id]
      );

      return res.json({
        ok: true,
        following: false,
        message: 'Team unfollowed'
      });
    }

    const result = await db.query(
      `INSERT INTO USER_FOLLOWED_TEAMS (user_id, team_id)
       VALUES ($1, $2)`,
      [user_id, team_id]
    ); 


    res.status(201).json({
      ok: true,
      following: true,
      message: 'Team followed'
    });

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/followData', authenticateToken, async (req, res) => {
  try{
    const user_id = req.user.user_id;
    const followedteams = await db.query(
      `SELECT * FROM USER_FOLLOWED_TEAMS
       WHERE user_id = $1`,
      [user_id]
    );

    return res.json({
      ok: true,
      user_id: user_id,
      following: followedteams.rows
    });
    
  }catch(err){
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.patch('/api/notification', authenticateToken, async (req, res) => {
  try{
    const user_id = req.user.user_id;
    const { team_id } = req.body;

    const result = await db.query(
      `UPDATE USER_FOLLOWED_TEAMS
       SET notifications_on = NOT notifications_on
       WHERE user_id = $1 AND team_id = $2
       RETURNING notifications_on`,
      [user_id, team_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'You are not following this team.'
      });
    }

    return res.json({
      ok: true,
      notifications_on: result.rows[0].notifications_on
    });
    
  }catch(err){
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.patch('/api/notification', authenticateToken, async (req, res) => {
  try{
    const user_id = req.user.user_id;
    const { team_id } = req.body;

    const result = await db.query(
      `UPDATE USER_FOLLOWED_TEAMS
       SET notifications_on = NOT notifications_on
       WHERE user_id = $1 AND team_id = $2
       RETURNING notifications_on`,
      [user_id, team_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'You are not following this team.'
      });
    }

    return res.json({
      ok: true,
      notifications_on: result.rows[0].notifications_on
    });
    
  }catch(err){
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/joinGroup', authenticateToken, async (req, res) => {
  try{
    const user_id = req.user.user_id;
    const { team_id } = req.body;

    const result = await db.query(
      ``,
      [user_id, team_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'You are not following this team.'
      });
    }

    return res.json({
      ok: true,
      notifications_on: result.rows[0].notifications_on
    });
    
  }catch(err){
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/leaveGroup', authenticateToken, async (req, res) => {
  try{
    const user_id = req.user.user_id;
    const { team_id } = req.body;

    const result = await db.query(
      ``,
      [user_id, team_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'You are not following this team.'
      });
    }

    return res.json({
      ok: true,
      notifications_on: result.rows[0].notifications_on
    });
    
  }catch(err){
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/createGroup', authenticateToken, async (req, res) => {
  try{
    const user_id = req.user.user_id;
    const { team_id } = req.body;

    const result = await db.query(
      ``,
      [user_id, team_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'You are not following this team.'
      });
    }

    return res.json({
      ok: true,
      notifications_on: result.rows[0].notifications_on
    });
    
  }catch(err){
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/deleteGroup', authenticateToken, async (req, res) => {
  try{
    const user_id = req.user.user_id;
    const { team_id } = req.body;

    const result = await db.query(
      ``,
      [user_id, team_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'You are not following this team.'
      });
    }

    return res.json({
      ok: true,
      notifications_on: result.rows[0].notifications_on
    });
    
  }catch(err){
    res.status(500).json({ ok: false, error: err.message });
  }
});




app.listen(3000, () => console.log('Running on http://localhost:3000'));