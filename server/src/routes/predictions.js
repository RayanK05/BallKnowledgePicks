const express = require('express');
const db = require('../db');
const authenticateToken = require('../authenticateToken')

const router = express.Router();

router.post('/predictions', authenticateToken, async (req, res) => {

    try{
        const user_id = req.user.user_id
        const {game_id, predicted_winner_id } = req.body;

        const result = await db.query(
        `INSERT INTO PREDICTIONS (user_id, game_id, predicted_winner_id)
        VALUES ($1, $2, $3)
        RETURNING *`,
      [user_id, game_id, predicted_winner_id]
    ); 
        res.status(201).json({ ok: true, prediction: result.rows[0] });

    }catch(err){
        if (err.code === '23505') {
            return res.status(409).json({ ok: false, error: 'You already picked this game' });
        }
        if (err.code === '23503') {
            return res.status(400).json({ ok: false, error: 'Invalid game or team' });
        }       
           
        res.status(500).json({ ok: false, error: err.message });
    }
    
})


// UPDATE: change an existing pick
router.put('/predictions/:gameId', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const game_id = req.params.gameId;          // from the URL
    const { predicted_winner_id } = req.body;

    const result = await db.query(
      `UPDATE PREDICTIONS
       SET predicted_winner_id = $1
       WHERE user_id = $2 AND game_id = $3
       RETURNING *`,
      [predicted_winner_id, user_id, game_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'No pick found for this game' });
    }

    res.json({ ok: true, prediction: result.rows[0] });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ ok: false, error: 'Invalid team' });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});


// Get: get predicitions
router.get('/predictions', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const result = await db.query(
      `SELECT predicted_winner_id, game_id
        FROM predictions
        WHERE user_id = $1`,
      [user_id]
    );

    res.json({ ok: true, prediction: result.rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE: remove a pick
router.delete('/predictions/:gameId', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const game_id = req.params.gameId;

    const result = await db.query(
      `DELETE FROM PREDICTIONS
       WHERE user_id = $1 AND game_id = $2
       RETURNING *`,
      [user_id, game_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'No pick found for this game' });
    }

    res.json({ ok: true, deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;