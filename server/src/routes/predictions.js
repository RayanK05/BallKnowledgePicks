const express = require("express");
const db = require("../db");
const authenticateToken = require("../authenticateToken");

const router = express.Router();

async function validatePick(game_id, predicted_winner_id) {
  const game = await db.query(
    `SELECT home_team_id, away_team_id, winner_id,
          tipoff IS NOT NULL AND tipoff <= NOW() AS locked
   FROM games WHERE game_id = $1`,
    [game_id],
  );

  if (game.rows.length === 0) {
    return { status: 404, error: "Game not found" };
  }

  const g = game.rows[0];

  if (g.winner_id !== null || g.locked) {
    return { status: 400, error: "Picks are closed for this game" };
  }

  if (predicted_winner_id !== g.home_team_id && predicted_winner_id !== g.away_team_id) {
    return { status: 400, error: "That team is not playing in this game" };
  }

  return null; // all good
}

//POST: Create a pick
router.post("/predictions", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const game_id = Number(req.body.game_id);
    const predicted_winner_id = Number(req.body.predicted_winner_id);

    const invalid = await validatePick(game_id, predicted_winner_id);
    if (invalid) {
      return res.status(invalid.status).json({ ok: false, error: invalid.error });
    }

    const result = await db.query(
      `INSERT INTO PREDICTIONS (user_id, game_id, predicted_winner_id)
        VALUES ($1, $2, $3)
        RETURNING *`,
      [user_id, game_id, predicted_winner_id],
    );
    res.status(201).json({ ok: true, prediction: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ ok: false, error: "You already picked this game" });
    }
    if (err.code === "23503") {
      return res.status(400).json({ ok: false, error: "Invalid game or team" });
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

// UPDATE: change an existing pick
router.put("/predictions/:gameId", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const game_id = Number(req.params.gameId);
    const predicted_winner_id = Number(req.body.predicted_winner_id);

    const invalid = await validatePick(game_id, predicted_winner_id);
    if (invalid) {
      return res.status(invalid.status).json({ ok: false, error: invalid.error });
    }

    const result = await db.query(
      `UPDATE PREDICTIONS
       SET predicted_winner_id = $1
       WHERE user_id = $2 AND game_id = $3
       RETURNING *`,
      [predicted_winner_id, user_id, game_id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "No pick found for this game" });
    }

    res.json({ ok: true, prediction: result.rows[0] });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(400).json({ ok: false, error: "Invalid team" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Get: get predicitions
router.get("/predictions", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const result = await db.query(
      `SELECT predicted_winner_id, game_id
        FROM predictions
        WHERE user_id = $1`,
      [user_id],
    );

    res.json({ ok: true, predictions: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE: remove a pick
// DELETE: remove a pick (only before tip-off)
router.delete("/predictions/:gameId", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const game_id = Number(req.params.gameId);

    const game = await db.query(
      `SELECT winner_id,
              tipoff IS NOT NULL AND tipoff <= NOW() AS locked
       FROM games WHERE game_id = $1`,
      [game_id],
    );

    if (game.rows.length > 0 && (game.rows[0].winner_id !== null || game.rows[0].locked)) {
      return res.status(400).json({ ok: false, error: "Picks are closed for this game" });
    }

    const result = await db.query(
      `DELETE FROM PREDICTIONS
       WHERE user_id = $1 AND game_id = $2
       RETURNING *`,
      [user_id, game_id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "No pick found for this game" });
    }

    res.json({ ok: true, deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// READ: summary stats for the logged-in user
router.get("/predictions/stats", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    // 1. score
    const scoreResult = await db.query("SELECT user_score FROM users WHERE user_id = $1", [
      user_id,
    ]);
    const score = scoreResult.rows[0].user_score;

    // 2. rank: how many users have a higher score, plus 1
    const rankResult = await db.query(
      "SELECT COUNT(*) + 1 AS rank FROM users WHERE user_score > $1",
      [score],
    );

    // 3. total users
    const totalResult = await db.query("SELECT COUNT(*) AS total FROM users");

    // 4. accuracy: reuse the Phase II view
    const accuracyResult = await db.query(
      `SELECT correct_predictions, total_predictions, accuracy_percentage
       FROM UserPredictionAccuracy
       WHERE user_id = $1`,
      [user_id],
    );

    // 5. pending picks: picks on games that haven't finished
    const pendingResult = await db.query(
      `SELECT COUNT(*) AS pending
       FROM predictions p
       JOIN games g ON p.game_id = g.game_id
       WHERE p.user_id = $1 AND g.winner_id IS NULL`,
      [user_id],
    );

    // the view has no row if you have no finished picks yet
    const acc = accuracyResult.rows[0];

    res.json({
      ok: true,
      stats: {
        score,
        rank: Number(rankResult.rows[0].rank),
        total_users: Number(totalResult.rows[0].total),
        correct: acc ? Number(acc.correct_predictions) : 0,
        graded: acc ? Number(acc.total_predictions) : 0,
        accuracy: acc ? Number(acc.accuracy_percentage) : 0,
        pending: Number(pendingResult.rows[0].pending),
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
