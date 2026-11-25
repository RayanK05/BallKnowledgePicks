const express = require("express");
const db = require("../db");
const router = express.Router();

// TEMP: reads games from the DB
router.get("/games", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT g.game_id, g.game_date, g.home_score, g.away_score, g.winner_id,
             g.home_team_id, ht.team_name AS home_team,
             g.away_team_id, at.team_name AS away_team
      FROM games g
      JOIN teams ht ON g.home_team_id = ht.team_id
      JOIN teams at ON g.away_team_id = at.team_id
      ORDER BY g.game_date
    `);
    res.json({ ok: true, games: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
