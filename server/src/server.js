const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const db = require("./db");
const authenticateToken  = require("./authenticateToken");
const app = express();
app.use(express.json());
const http = require("http");
const { Server } = require("socket.io");
const createEventListener = require("./webSocket");

const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "http://localhost:5173" } });
const PORT = process.env.PORT;
httpServer.listen(PORT);

let isSeeding = false;

const BASE = "https://api.balldontlie.io/v1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const season = 2026;

const predictionsRouter = require("./routes/predictions");
const gamesRouter = require("./routes/games");

const notificationRouter = require("./routes/notification");

app.use("/api", predictionsRouter);
app.use("/api", gamesRouter);

app.use("/api", notificationRouter);


app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Ball Knowledge Picks!" });
});

app.get("/api/teams", async (req, res) => {
  try {
    const result = await db.query("SELECT team_id, team_name FROM teams ORDER BY team_name");
    res.json({ ok: true, teams: result.rows });
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
    if (res.status === 429) {
      await sleep(15000);
      continue;
    }

    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }

  throw new Error("Maximum API retry attempts exceeded");
};

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
};

//this will get the past present and future games present in the DB
const seedGames = async () => {
  const result = await getGames();
  let count = 0;

  for (const g of result) {
    const isFinal = g.status_state === "final";
    if (g.postponed && !isFinal) continue; // skip postponed games, a new date will show up as its own game

    const homeScore = isFinal ? g.home_team_score : null;
    const awayScore = isFinal ? g.visitor_team_score : null;
    const winnerId = isFinal
      ? g.home_team_score > g.visitor_team_score
        ? g.home_team.id
        : g.visitor_team.id
      : null;

    await db.query(
    `INSERT INTO games (external_id, home_team_id, away_team_id, game_date, tipoff, winner_id, home_score, away_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (external_id) DO UPDATE SET
      tipoff     = EXCLUDED.tipoff,
      winner_id  = COALESCE(games.winner_id, EXCLUDED.winner_id),
      home_score = COALESCE(EXCLUDED.home_score, games.home_score),
      away_score = COALESCE(EXCLUDED.away_score, games.away_score)`,
      [
        String(g.id),
        g.home_team.id,
        g.visitor_team.id,
        g.date,
        g.datetime,
        winnerId,
        homeScore,
        awayScore,
      ]
    );

    count++;
  }

  return count;
};

// login route
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query("SELECT * FROM USERS WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const token = jwt.sign({ user_id: user.user_id }, process.env.JWT_SECRET, { expiresIn: "2h" });

    res.json({
      ok: true,
      token,
      user: { id: user.user_id, username: user.username, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO USERS (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING username, email, role`,
      [username, email, hash],
    );

    res.status(201).json({ ok: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/follow", authenticateToken, async (req, res) => {
  try {
    const { user_id, team_id } = req.body;

    // Check if user already follows the team
    const existing = await db.query(
      `SELECT * FROM USER_FOLLOWED_TEAMS
       WHERE user_id = $1 AND team_id = $2`,
      [user_id, team_id],
    );

    if (existing.rows.length > 0) {
      // Already following -> Unfollow
      await db.query(
        `DELETE FROM USER_FOLLOWED_TEAMS
         WHERE user_id = $1 AND team_id = $2`,
        [user_id, team_id],
      );

      return res.json({
        ok: true,
        following: false,
        message: "Team unfollowed",
      });
    }

    const result = await db.query(
      `INSERT INTO USER_FOLLOWED_TEAMS (user_id, team_id)
       VALUES ($1, $2)`,
      [user_id, team_id],
    );

    res.status(201).json({
      ok: true,
      following: true,
      message: "Team followed",
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/followData", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const followedteams = await db.query(
      `SELECT * FROM USER_FOLLOWED_TEAMS
       WHERE user_id = $1`,
      [user_id],
    );

    return res.json({
      ok: true,
      user_id: user_id,
      following: followedteams.rows,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/joinGroup", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { group_id } = req.body;

    if (!Number.isInteger(group_id)) {
      return res.status(400).json({ ok: false, message: "Invalid group id." });
    }

    const result = await db.query(
      `INSERT INTO group_members (group_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (group_id, user_id) DO NOTHING
       RETURNING group_id`,
      [group_id, user_id],
    );

    // no row back means they were already a member, so nothing was inserted
    if (result.rows.length === 0) {
      return res.json({ ok: true, alreadyMember: true });
    }

    return res.status(201).json({ ok: true, alreadyMember: false });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(404).json({ ok: false, message: "Group not found." });
    }
    return res.status(500).json({ ok: false, error: err.message });
  }
});


app.post("/api/leaveGroup", authenticateToken, async (req, res) => {
  const user_id = req.user.user_id;
  const group_id = Number(req.body.group_id);

  if (!Number.isInteger(group_id)) {
    return res.status(400).json({
      ok: false,
      message: "Invalid group id."
    });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // Check whether the leaving user is an admin
    const memberResult = await client.query(
      `SELECT role
       FROM group_members
       WHERE group_id = $1 AND user_id = $2
       FOR UPDATE`,
      [group_id, user_id]
    );

    if (memberResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        ok: false,
        message: "You are not a member of this group."
      });
    }

    const isAdmin = memberResult.rows[0].role === "admin";

    // If admin is leaving, promote another member
    if (isAdmin) {
      const nextAdmin = await client.query(
        `SELECT user_id
         FROM group_members
         WHERE group_id = $1 AND user_id <> $2
         ORDER BY user_id ASC
         LIMIT 1
         FOR UPDATE`,
        [group_id, user_id]
      );

      if (nextAdmin.rows.length > 0) {
        await client.query(
          `UPDATE group_members
           SET role = 'admin'
           WHERE group_id = $1 AND user_id = $2`,
          [group_id, nextAdmin.rows[0].user_id]
        );
      }
    }

    // Remove the leaving user
    await client.query(
      `DELETE FROM group_members
       WHERE group_id = $1 AND user_id = $2`,
      [group_id, user_id]
    );

    // If no members remain, delete the group
    const remainingMembers = await client.query(
      `SELECT COUNT(*) 
       FROM group_members
       WHERE group_id = $1`,
      [group_id]
    );

    const groupDeleted = Number(remainingMembers.rows[0].count) === 0;

    if (groupDeleted) {
      await client.query(
        `DELETE FROM groups WHERE group_id = $1`,
        [group_id]
      );
    }

    await client.query("COMMIT");

    // Remove leaving user's sockets from the group room
    for (const [, socket] of io.sockets.sockets) {
      if (socket.userId === user_id) {
        socket.leave(`group_${group_id}`);
      }
    }

    // Broadcast event to remaining group members
    io.to(`group_${group_id}`).emit("group_event", {
      type: groupDeleted ? "group_deleted" : "left_group",
      groupId: group_id,
      user_id
    });

    return res.json({
      ok: true,
      group_id,
      group_deleted: groupDeleted
    });

  } catch (err) {
    await client.query("ROLLBACK");

    return res.status(500).json({
      ok: false,
      error: err.message
    });
  } finally {
    client.release();
  }
});

// the groups the logged-in user belongs to
app.get("/api/myGroups", authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT g.group_id, g.group_name, gm.role
       FROM group_members gm
       JOIN groups g ON g.group_id = gm.group_id
       WHERE gm.user_id = $1
       ORDER BY g.group_name`,
      [req.user.user_id],
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// leaderboard: correct picks per member, best first
app.get("/api/groups/:groupId/leaderboard", authenticateToken, async (req, res) => {
  const groupId = Number(req.params.groupId);
  try {
    const { rows } = await db.query(
      `SELECT
          u.user_id,
          u.username,
          u.user_score,
          COALESCE(upa.accuracy_percentage, 0) AS accuracy_percentage
      FROM group_members gm
      JOIN users u
          ON u.user_id = gm.user_id
      LEFT JOIN UserPredictionAccuracy upa
          ON upa.user_id = u.user_id
      WHERE gm.group_id = $1
      ORDER BY u.user_score DESC, u.username`,
      [groupId],
    );
    res.json(rows);
  } catch (err) {
    console.error("Leaderboard failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// create a group and add the creator as its first member
app.post("/api/createGroup", authenticateToken, async (req, res) => {
  const name = (req.body.group_name ?? "").trim();
  if (!name || name.length > 30)
    return res.status(400).json({ error: "Name must be 1-30 characters" });

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "INSERT INTO groups (group_name) VALUES ($1) RETURNING group_id, group_name",
      [name],
    );
    await client.query("INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, 'admin')", [
      rows[0].group_id,
      req.user.user_id,
    ]);
    await client.query("COMMIT");
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.post("/api/deleteGroup", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const group_id = Number(req.body.group_id);
    if (!Number.isInteger(group_id)) {
      return res.status(400).json({ ok: false, message: "Invalid group id." });
    }

    const result = await db.query(
      // add user roles
      `DELETE FROM groups
       WHERE group_id = $1
         AND EXISTS (
           SELECT 1 FROM group_members
           WHERE group_id = $1 AND user_id = $2 AND role = 'admin'
         )
       RETURNING group_id`,
      [group_id, user_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Group not found, or you are not an admin of it." });
    }

    const room = `group_${group_id}`;

    // 1. tell everyone in the room so their screens can clear
    io.to(room).emit("groupUpdate", { type: "group_deleted", groupId: group_id });

    // 2. then remove every socket from the room
    io.in(room).socketsLeave(room);

    return res.json({ ok: true, group_id });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

const runSeedGames = async () => {
  if (isSeeding) return;

  isSeeding = true;

  try {
    const n = await seedGames();
    console.log(`Seeded ${n} games`);
  } catch (err) {
    console.error("Seed failed:", err);
  } finally {
    isSeeding = false;
  }
};

runSeedGames();

setInterval(runSeedGames, 60 * 60 * 1000); //check once an hour for the scheduled games to see if they are completed

// check the token on every socket connection
io.use((socket, next) => {
  try {
    const payload = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
    socket.userId = payload.user_id ?? payload.id; // match the field your login route puts in the token
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  socket.on("joinGroup", async (groupId, ack) => {
    try {
      const { rowCount } = await db.query(
        "SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2",
        [groupId, socket.userId],
      );
      if (!rowCount) return ack?.({ ok: false });
      socket.join(`group_${groupId}`);
      ack?.({ ok: true });
    } catch {
      ack?.({ ok: false });
    }
  });

  socket.on("leaveGroup", (groupId) => socket.leave(`group_${groupId}`));
});

createEventListener(io).start();
app.get("/api/me", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT user_id, username, email, role, user_score FROM USERS WHERE user_id = $1",
      [req.user.user_id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }
    res.json({ ok: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use("/api/stats", require("./routes/stats"));
app.use("/api/admin", require("./routes/admin"));

// Manually trigger a sync from the Admin panel
app.post("/api/sync", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT role FROM users WHERE user_id = $1",
      [req.user.user_id]
    );

    if (result.rows[0]?.role !== "admin") {
      return res.status(403).json({ ok: false, error: "Admin access required" });
    }

    if (isSeeding) {
      return res.status(409).json({ ok: false, error: "Sync already running" });
    }

    runSeedGames();
    res.json({ ok: true, message: "Sync started" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(3000, () => console.log("Running on http://localhost:3000"));