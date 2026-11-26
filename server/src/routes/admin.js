const express = require("express");
const db = require("../db");
const authenticateToken = require("../authenticateToken");

const router = express.Router();

// ================================
// ADMIN AUTHENTICATION
// ================================

// Verify that the authenticated user is an administrator.

router.use(authenticateToken, async (req, res, next) => {

    try {

        const result = await db.query(
            "SELECT role FROM users WHERE user_id = $1",
            [req.user.user_id]
        );

        if (result.rows[0]?.role !== "admin") {

            return res.status(403).json({
                ok: false,
                error: "Administrator access required"
            });

        }

        next();

    } catch (err) {

        next(err);

    }

});

// ================================
// HELPER FUNCTIONS
// ================================

// Error handling wrapper.

const wrap = fn => (req, res, next) =>
    Promise.resolve(
        fn(req, res, next)
    ).catch(next);

function badRequest(message) {

    return Object.assign(
        new Error(message),
        { status: 400 }
    );

}

function validateId(value) {

    const id = Number(value);

    if (!Number.isSafeInteger(id) || id <= 0) {

        throw badRequest("Invalid ID");

    }

    return id;
}

function validateName(value) {

    if (
        typeof value !== "string" ||
        !value.trim() ||
        value.trim().length > 60
    ) {

        throw badRequest("Enter a valid team name");

    }

    return value.trim();
}

function findRecord(result) {

    if (!result.rowCount) {

        throw Object.assign(
            new Error("Record not found"),
            { status: 404 }
        );

    }

    return result.rows[0];
}

// Execute related SQL queries as one transaction.

async function transaction(callback) {

    const client = await db.connect();

    try {

        await client.query("BEGIN");

        await client.query(
            "LOCK TABLE games IN SHARE ROW EXCLUSIVE MODE"
        );

        const result = await callback(client);

        await client.query("COMMIT");

        return result;

    } catch (err) {

        await client.query("ROLLBACK");

        throw err;

    } finally {

        client.release();

    }

}

// Recalculate scores after game results change.

async function updateUserScores(client) {

    await client.query(`

        UPDATE users u

        SET user_score = (

            SELECT COUNT(*) * 10

            FROM predictions p

            JOIN games g
                ON g.game_id = p.game_id

            WHERE p.user_id = u.user_id

            AND p.predicted_winner_id = g.winner_id

        )

    `);

}

// Validate game information and calculate winner.

function getGameValues(body) {

    const home = validateId(body.home_team_id);

    const away = validateId(body.away_team_id);

    if (home === away) {

        throw badRequest(
            "Select two different teams"
        );

    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(
        body.game_date || ""
    )) {

        throw badRequest("Enter a valid game date");

    }

    function parseScore(value) {

        if (value === "" || value == null) {

            return null;

        }

        const score = Number(value);

        if (
            !Number.isInteger(score) ||
            score < 0 ||
            score > 2147483647
        ) {

            throw badRequest("Invalid score");

        }

        return score;

    }

    const homeScore = parseScore(body.home_score);

    const awayScore = parseScore(body.away_score);

    if (
        (homeScore === null) !== (awayScore === null) ||
        (homeScore !== null && homeScore === awayScore)
    ) {

        throw badRequest(
            "Enter two different final scores or leave both blank"
        );

    }

    const winner = homeScore === null
        ? null
        : homeScore > awayScore
            ? home
            : away;

    return [

        home,
        away,
        body.game_date,
        body.tipoff || null,
        homeScore,
        awayScore,
        winner

    ];

}

// ================================
// ADMIN DASHBOARD STATISTICS
// ================================

router.get("/summary", wrap(async (req, res) => {

    const result = await db.query(`

        SELECT

            (SELECT COUNT(*) FROM users)::int AS users,

            (SELECT COUNT(*) FROM teams)::int AS teams,

            (SELECT COUNT(*) FROM games)::int AS games,

            (
                SELECT COUNT(*)
                FROM games
                WHERE winner_id IS NOT NULL
            )::int AS completed

    `);

    res.json({
        ok: true,
        summary: result.rows[0]
    });

}));

// ================================
// USER ROLE MANAGEMENT
// ================================

// Promote or demote an existing user by username.

router.patch("/users/role", wrap(async (req, res) => {

    const { username, role } = req.body;

    // Validate username.

    if (
        typeof username !== "string" ||
        !username.trim() ||
        username.trim().length > 30
    ) {

        throw badRequest("Enter a valid username");

    }

    // Only allow the supported account roles.

    if (!["admin", "user"].includes(role)) {

        throw badRequest("Invalid role");

    }

    const client = await db.connect();

    try {

        await client.query(
            "BEGIN ISOLATION LEVEL READ COMMITTED"
        );

        // Prevent simultaneous role changes from removing
        // every administrator in the system.

        await client.query(
            "LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE"
        );

        // Recheck that the requesting user is still an admin
        // after acquiring the database lock.

        const requester = await client.query(

            `SELECT role
             FROM users
             WHERE user_id = $1`,

            [req.user.user_id]

        );

        if (requester.rows[0]?.role !== "admin") {

            throw Object.assign(
                new Error("Administrator access required"),
                { status: 403 }
            );

        }

        // Find the target user by username.

        const result = await client.query(`

            SELECT
                user_id,
                username,
                role

            FROM users

            WHERE username = $1

        `, [username.trim()]);

        if (!result.rowCount) {

            throw Object.assign(
                new Error("Username not found"),
                { status: 404 }
            );

        }

        const user = result.rows[0];

        // Check that another administrator will remain
        // before allowing an administrator to be demoted.

        if (user.role === "admin" && role === "user") {

            const admins = await client.query(`

                SELECT COUNT(*)::int AS count

                FROM users

                WHERE role = 'admin'

            `);

            if (admins.rows[0].count <= 1) {

                throw badRequest(
                    "Cannot demote the last administrator"
                );

            }

        }

        // Update the user's role.

        const updated = await client.query(`

            UPDATE users

            SET role = $1

            WHERE user_id = $2

            RETURNING
                user_id,
                username,
                role

        `, [role, user.user_id]);

        await client.query("COMMIT");

        // Let the frontend know if the requesting admin
        // has successfully demoted themselves.

        const selfDemoted =
            Number(user.user_id) ===
            Number(req.user.user_id) &&
            role === "user";

        res.json({

            ok: true,

            user: updated.rows[0],

            self_demoted: selfDemoted,

            message: `${user.username}'s role is now ${role}.`

        });

    } catch (err) {

        await client.query("ROLLBACK");

        throw err;

    } finally {

        client.release();

    }

}));

// ================================
// TEAM MANAGEMENT
// ================================

// Retrieve teams directly from PostgreSQL.

router.get("/teams", wrap(async (req, res) => {

    const result = await db.query(`

        SELECT
            team_id,
            team_name

        FROM teams

        ORDER BY team_name

    `);

    res.json({
        ok: true,
        teams: result.rows
    });

}));

// Add team.

router.post("/teams", wrap(async (req, res) => {

    const teamName = validateName(
        req.body.team_name
    );

    const result = await db.query(`

        INSERT INTO teams (
            team_name
        )

        VALUES ($1)

        RETURNING *

    `, [teamName]);

    res.status(201).json({
        ok: true,
        team: result.rows[0]
    });

}));

// Edit team.

router.put("/teams/:id", wrap(async (req, res) => {

    const teamId = validateId(req.params.id);

    const teamName = validateName(
        req.body.team_name
    );

    const result = await db.query(`

        UPDATE teams

        SET team_name = $1

        WHERE team_id = $2

        RETURNING *

    `, [teamName, teamId]);

    res.json({
        ok: true,
        team: findRecord(result)
    });

}));

// Delete team.

router.delete("/teams/:id", wrap(async (req, res) => {

    const teamId = validateId(req.params.id);

    await transaction(async client => {

        findRecord(await client.query(`

            SELECT team_id

            FROM teams

            WHERE team_id = $1

            FOR UPDATE

        `, [teamId]));

        const references = await client.query(`

            SELECT 1 FROM games

            WHERE home_team_id = $1
            OR away_team_id = $1

            UNION ALL

            SELECT 1 FROM user_followed_teams

            WHERE team_id = $1

            UNION ALL

            SELECT 1 FROM notifications

            WHERE team_id = $1

            LIMIT 1

        `, [teamId]);

        if (references.rowCount) {

            throw badRequest(
                "Cannot delete a team associated with games, followers or notifications"
            );

        }

        await client.query(`

            DELETE FROM teams

            WHERE team_id = $1

        `, [teamId]);

    });

    res.json({
        ok: true
    });

}));

// ================================
// GAME MANAGEMENT
// ================================

// Retrieve games directly from PostgreSQL.

router.get("/games", wrap(async (req, res) => {

    const result = await db.query(`

        SELECT

            g.game_id,

            g.game_date,

            g.tipoff,

            g.home_team_id,

            g.away_team_id,

            g.home_score,

            g.away_score,

            g.winner_id,

            ht.team_name AS home_team,

            at.team_name AS away_team

        FROM games g

        JOIN teams ht
            ON g.home_team_id = ht.team_id

        JOIN teams at
            ON g.away_team_id = at.team_id

        ORDER BY
            g.game_date DESC,
            g.game_id DESC

    `);

    res.json({
        ok: true,
        games: result.rows
    });

}));

// Add game.

router.post("/games", wrap(async (req, res) => {

    const values = getGameValues(req.body);

    const game = await transaction(async client => {

        const result = await client.query(`

            INSERT INTO games (

                home_team_id,
                away_team_id,
                game_date,
                tipoff,
                home_score,
                away_score,
                winner_id

            )

            VALUES (
                $1, $2, $3, $4, $5, $6, $7
            )

            RETURNING *

        `, values);

        return result.rows[0];

    });

    res.status(201).json({
        ok: true,
        game
    });

}));

// Edit game and update results.

router.put("/games/:id", wrap(async (req, res) => {

    const gameId = validateId(req.params.id);

    const values = getGameValues(req.body);

    const game = await transaction(async client => {

        const oldGame = findRecord(
            await client.query(`

                SELECT *

                FROM games

                WHERE game_id = $1

                FOR UPDATE

            `, [gameId])
        );

        // Do not change participating teams
        // after predictions already exist.

        if (
            Number(oldGame.home_team_id) !== values[0] ||
            Number(oldGame.away_team_id) !== values[1]
        ) {

            const predictions = await client.query(`

                SELECT 1

                FROM predictions

                WHERE game_id = $1

                LIMIT 1

            `, [gameId]);

            if (predictions.rowCount) {

                throw badRequest(
                    "Cannot change teams after predictions exist"
                );

            }

        }

        const result = await client.query(`

            UPDATE games

            SET

                home_team_id = $1,

                away_team_id = $2,

                game_date = $3,

                tipoff = $4,

                home_score = $5,

                away_score = $6,

                winner_id = $7

            WHERE game_id = $8

            RETURNING *

        `, [...values, gameId]);

        await updateUserScores(client);

        return findRecord(result);

    });

    res.json({
        ok: true,
        game
    });

}));

// Delete game.

router.delete("/games/:id", wrap(async (req, res) => {

    const gameId = validateId(req.params.id);

    await transaction(async client => {

        findRecord(await client.query(`

            DELETE FROM games

            WHERE game_id = $1

            RETURNING game_id

        `, [gameId]));

        await updateUserScores(client);

    });

    res.json({
        ok: true
    });

}));

// ================================
// API SYNCHRONIZATION
// ================================

// Synchronization is handled by the shared
// POST /api/sync endpoint in the main backend.
//
// The Admin frontend calls that endpoint directly.
//
// Matthew's runSeedGames() function is responsible
// for retrieving and updating NBA data.
//
// No duplicate synchronization function is needed here.

// ================================
// ERROR HANDLING
// ================================

router.use((err, req, res, next) => {

    console.error(err);

    const databaseErrors = [

        "23503",
        "23505",
        "23514",
        "22007",
        "22008",
        "22P02"

    ];

    const status = err.status ||
        (
            databaseErrors.includes(err.code)
                ? 400
                : 500
        );

    let message = err.status
        ? err.message
        : "Database request failed";

    if (err.code === "23505") {

        message = "Duplicate record";

    }

    if (err.code === "23503") {

        message =
            "Record is referenced or team does not exist";

    }

    if (err.code === "23514") {

        message = "Database constraint failed";

    }

    res.status(status).json({
        ok: false,
        error: message
    });

});

module.exports = router;