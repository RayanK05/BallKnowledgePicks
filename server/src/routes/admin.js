const express = require("express");
const db = require("../db");
const authenticateToken = require("../authenticateToken");

const router = express.Router();

// Verify that the authenticated user is an administrator
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

// Error handling wrapper
const wrap = fn => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

function badRequest(message) {
    return Object.assign(new Error(message), {
        status: 400
    });
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
        throw Object.assign(new Error("Record not found"), {
            status: 404
        });
    }

    return result.rows[0];
}

// Execute related SQL queries as one transaction
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

// Recalculate scores after game results change
async function updateUserScores(client) {
    await client.query(`
        UPDATE users u
        SET user_score = (
            SELECT COUNT(*) * 10
            FROM predictions p
            JOIN games g ON g.game_id = p.game_id
            WHERE p.user_id = u.user_id
            AND p.predicted_winner_id = g.winner_id
        )
    `);
}

// Validate game information and calculate winner
function getGameValues(body) {
    const home = validateId(body.home_team_id);
    const away = validateId(body.away_team_id);

    if (home === away) {
        throw badRequest("Select two different teams");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.game_date || "")) {
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
// TEAM MANAGEMENT
// ================================

// Add team
router.post("/teams", wrap(async (req, res) => {
    const teamName = validateName(req.body.team_name);

    const result = await db.query(`
        INSERT INTO teams (team_name)
        VALUES ($1)
        RETURNING *
    `, [teamName]);

    res.status(201).json({
        ok: true,
        team: result.rows[0]
    });
}));

// Edit team
router.put("/teams/:id", wrap(async (req, res) => {
    const teamId = validateId(req.params.id);
    const teamName = validateName(req.body.team_name);

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

// Delete team
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
            WHERE home_team_id = $1 OR away_team_id = $1

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

    res.json({ ok: true });
}));

// ================================
// GAME MANAGEMENT
// ================================

// Add game
router.post("/games", wrap(async (req, res) => {
    const values = getGameValues(req.body);

    const result = await db.query(`
        INSERT INTO games (
            home_team_id,
            away_team_id,
            game_date,
            tipoff,
            home_score,
            away_score,
            winner_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `, values);

    res.status(201).json({
        ok: true,
        game: result.rows[0]
    });
}));

// Edit game and update results
router.put("/games/:id", wrap(async (req, res) => {
    const gameId = validateId(req.params.id);
    const values = getGameValues(req.body);

    const game = await transaction(async client => {

        const oldGame = findRecord(await client.query(`
            SELECT *
            FROM games
            WHERE game_id = $1
            FOR UPDATE
        `, [gameId]));

        // Do not change participating teams after predictions exist
        if (
            oldGame.home_team_id !== values[0] ||
            oldGame.away_team_id !== values[1]
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

// Delete game
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

    res.json({ ok: true });
}));

// ================================
// NBA API SYNCHRONIZATION
// ================================

let syncing = false;

router.post("/sync", wrap(async (req, res) => {

    if (syncing) {
        return res.status(409).json({
            ok: false,
            error: "Synchronization already running"
        });
    }

    if (!process.env.BASKETBALLAPI) {
        throw badRequest("Basketball API key is missing");
    }

    syncing = true;

    try {
        const season = Number(req.body.season);

        if (
            !Number.isInteger(season) ||
            season < 1946 ||
            season > 2100
        ) {
            throw badRequest("Invalid season");
        }

        const games = [];
        let cursor;

        // Retrieve games from the basketball API
        do {
            const url = new URL(
                "https://api.balldontlie.io/v1/games"
            );

            url.searchParams.set("seasons[]", season);
            url.searchParams.set("per_page", "100");

            if (cursor) {
                url.searchParams.set("cursor", cursor);
            }

            let response;

            for (let attempt = 0; attempt < 5; attempt++) {
                response = await fetch(url, {
                    headers: {
                        Authorization: process.env.BASKETBALLAPI
                    },
                    signal: AbortSignal.timeout(30000)
                });

                if (response.status !== 429) {
                    break;
                }

                await new Promise(resolve =>
                    setTimeout(resolve, 15000)
                );
            }

            if (!response.ok) {
                throw new Error(
                    `Basketball API error: ${response.status}`
                );
            }

            const data = await response.json();

            games.push(...data.data);

            cursor = data.meta?.next_cursor;

            if (cursor) {
                await new Promise(resolve =>
                    setTimeout(resolve, 12500)
                );
            }

        } while (cursor);

        const result = await transaction(async client => {

            let teamsAdded = 0;
            let gamesAdded = 0;
            let gamesUpdated = 0;

            const teamCache = new Map();

            async function getTeamId(team) {
                const teamName = validateName(team.full_name);

                if (teamCache.has(teamName)) {
                    return teamCache.get(teamName);
                }

                const inserted = await client.query(`
                    INSERT INTO teams (team_name)
                    VALUES ($1)
                    ON CONFLICT (team_name) DO NOTHING
                    RETURNING team_id
                `, [teamName]);

                teamsAdded += inserted.rowCount;

                let teamId = inserted.rows[0]?.team_id;

                if (!teamId) {
                    const existing = await client.query(`
                        SELECT team_id
                        FROM teams
                        WHERE team_name = $1
                    `, [teamName]);

                    teamId = existing.rows[0].team_id;
                }

                teamCache.set(teamName, teamId);

                return teamId;
            }

            for (const game of games) {

                const homeId = await getTeamId(game.home_team);
                const awayId = await getTeamId(game.visitor_team);

                const finished =
                    /^final/i.test(game.status || "") &&
                    Number.isInteger(game.home_team_score) &&
                    Number.isInteger(game.visitor_team_score) &&
                    game.home_team_score !== game.visitor_team_score;

                const homeScore = finished
                    ? game.home_team_score
                    : null;

                const awayScore = finished
                    ? game.visitor_team_score
                    : null;

                const winner = finished
                    ? homeScore > awayScore
                        ? homeId
                        : awayId
                    : null;

                const values = [
                    homeId,
                    awayId,
                    String(game.date).slice(0, 10),
                    game.datetime || null,
                    homeScore,
                    awayScore,
                    winner
                ];

                const inserted = await client.query(`
                    INSERT INTO games (
                        home_team_id,
                        away_team_id,
                        game_date,
                        tipoff,
                        home_score,
                        away_score,
                        winner_id
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (
                        home_team_id,
                        away_team_id,
                        game_date
                    ) DO NOTHING
                    RETURNING game_id
                `, values);

                gamesAdded += inserted.rowCount;

                if (!inserted.rowCount) {

                    const updated = await client.query(`
                        UPDATE games
                        SET
                            tipoff = COALESCE($4, tipoff),
                            home_score = CASE
                                WHEN $7::int IS NULL THEN home_score
                                ELSE $5
                            END,
                            away_score = CASE
                                WHEN $7::int IS NULL THEN away_score
                                ELSE $6
                            END,
                            winner_id = COALESCE($7, winner_id)
                        WHERE home_team_id = $1
                        AND away_team_id = $2
                        AND game_date = $3
                    `, values);

                    gamesUpdated += updated.rowCount;
                }
            }

            await updateUserScores(client);

            return {
                teams_added: teamsAdded,
                games_added: gamesAdded,
                games_updated: gamesUpdated,
                last_sync: new Date().toISOString()
            };
        });

        res.json({
            ok: true,
            ...result
        });

    } finally {
        syncing = false;
    }
}));

// Handle database and validation errors
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
        (databaseErrors.includes(err.code) ? 400 : 500);

    let message = err.status
        ? err.message
        : "Database or synchronization request failed";

    if (err.code === "23505") {
        message = "Duplicate record";
    }

    if (err.code === "23503") {
        message = "Record is referenced or team does not exist";
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