const express = require("express");
const db = require("../db");
const authenticateToken = require("../authenticateToken");

const router = express.Router();

router.patch("/notification", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { team_id } = req.body;

    const result = await db.query(
      `UPDATE USER_FOLLOWED_TEAMS
       SET notifications_on = NOT notifications_on
       WHERE user_id = $1 AND team_id = $2
       RETURNING notifications_on`,
      [user_id, team_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "You are not following this team.",
      });
    }

    return res.json({
      ok: true,
      notifications_on: result.rows[0].notifications_on,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// users can follow one team + will receive notifications on win and loss updates from the followed team
router.get("/getNotification", authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const result = await db.query(
      `SELECT n.notification_id, n.alert_type, n.is_read,
              t.team_name AS followed_team,
              h.team_name AS home_team, a.team_name AS away_team,
              g.home_score, g.away_score, g.game_date
      FROM notifications n
      JOIN user_followed_teams u ON u.user_id = n.user_id AND u.team_id = n.team_id
      JOIN teams t ON t.team_id = n.team_id
      JOIN games g ON g.game_id = n.game_id
      JOIN teams h ON h.team_id = g.home_team_id
      JOIN teams a ON a.team_id = g.away_team_id
      WHERE n.user_id = $1
        AND u.notifications_on = TRUE
      ORDER BY n.notification_id DESC
      LIMIT 50`,
      [user_id],
    );

    return res.json({
      ok: true,
      notifications: result.rows,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const notification_id = Number(req.params.id);

    if (!Number.isInteger(notification_id)) {
      return res.status(400).json({ ok: false, message: 'Invalid notification id.' });
    }

    // the user_id condition means you can only delete your own notifications
    const result = await db.query(
      `DELETE FROM notifications
       WHERE notification_id = $1 AND user_id = $2
       RETURNING notification_id`,
      [notification_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'Notification not found.' });
    }

    return res.json({ ok: true, notification_id });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;