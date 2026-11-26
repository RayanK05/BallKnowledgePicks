const express = require("express");
const db = require("../db");
const router = express.Router();

// GET /api/games?team=ID&from=YYYY-MM-DD&to=YYYY-MM-DD  (all optional)
router.get("/games", async (req, res) => {
  try {
    const { team, from, to } = req.query;

    const conditions = []; // pieces of the WHERE clause
    const params = []; // values for $1, $2, ...

    if (team) {
      params.push(team);
      conditions.push(`(g.home_team_id = $${params.length} OR g.away_team_id = $${params.length})`);
    }
    if (from) {
      params.push(from);
      conditions.push(`g.game_date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`g.game_date <= $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await db.query(
      `SELECT g.game_id, g.game_date, g.tipoff, g.home_score, g.away_score, g.winner_id,
              g.home_team_id, ht.team_name AS home_team,
              g.away_team_id, at.team_name AS away_team
       FROM games g
       JOIN teams ht ON g.home_team_id = ht.team_id
       JOIN teams at ON g.away_team_id = at.team_id
       ${where}
       ORDER BY g.game_date`,
      params,
    );

    res.json({ ok: true, games: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
