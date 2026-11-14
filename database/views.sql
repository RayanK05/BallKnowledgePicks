-- =====================================================================
-- Ball Knowledge Picks: the 10 views from Phase II, Part C (PostgreSQL)
-- Run AFTER schema.sql and sample_data.sql.
-- Re-runnable: CREATE OR REPLACE updates a view that already exists.
-- =====================================================================


-- View 1: join of at least three tables
-- Each user's predictions with the game date and the team they picked.
CREATE OR REPLACE VIEW UserGamePredictions AS
SELECT
    U.username,
    G.game_id,
    G.game_date,
    T.team_name AS predicted_winner
FROM USERS U
JOIN PREDICTIONS P ON U.user_id = P.user_id
JOIN GAMES G       ON P.game_id = G.game_id
JOIN TEAMS T       ON P.predicted_winner_id = T.team_id;


-- View 2: nested query with ANY and GROUP BY
-- Users who made more predictions than at least one other user.
CREATE OR REPLACE VIEW MostActivePredictors AS
SELECT
    U.user_id,
    U.username,
    COUNT(P.prediction_id) AS total_predictions
FROM USERS U
JOIN PREDICTIONS P ON U.user_id = P.user_id
GROUP BY U.user_id, U.username
HAVING COUNT(P.prediction_id) > ANY (
    SELECT COUNT(P2.prediction_id)
    FROM PREDICTIONS P2
    GROUP BY P2.user_id
);


-- View 3: correlated nested query
-- Users who made more predictions than the average member of their group.
CREATE OR REPLACE VIEW AboveAverageGroupPredictors AS
SELECT
    U.user_id,
    U.username,
    GM.group_id,
    COUNT(P.prediction_id) AS total_predictions
FROM USERS U
JOIN GROUP_MEMBERS GM  ON U.user_id = GM.user_id
LEFT JOIN PREDICTIONS P ON U.user_id = P.user_id
GROUP BY U.user_id, U.username, GM.group_id
HAVING COUNT(P.prediction_id) > (
    SELECT COUNT(P2.prediction_id)::NUMERIC / NULLIF(COUNT(DISTINCT GM2.user_id), 0)
    FROM GROUP_MEMBERS GM2
    LEFT JOIN PREDICTIONS P2 ON GM2.user_id = P2.user_id
    WHERE GM2.group_id = GM.group_id
);


-- View 4: FULL JOIN
-- All games alongside their predictions, including games nobody picked.
CREATE OR REPLACE VIEW GamesAndPredictions AS
SELECT
    G.game_id,
    G.game_date,
    P.prediction_id,
    P.user_id,
    P.predicted_winner_id
FROM GAMES G
FULL OUTER JOIN PREDICTIONS P ON G.game_id = P.game_id;


-- View 5: nested query with a set operation (INTERSECT)
-- Users who follow both the Los Angeles Lakers and the Boston Celtics.
CREATE OR REPLACE VIEW LakersAndCelticsFollowers AS
SELECT
    U.user_id,
    U.username
FROM USERS U
WHERE U.user_id IN (
    SELECT UFT.user_id
    FROM USER_FOLLOWED_TEAMS UFT
    JOIN TEAMS T ON UFT.team_id = T.team_id
    WHERE T.team_name = 'Los Angeles Lakers'
    INTERSECT
    SELECT UFT.user_id
    FROM USER_FOLLOWED_TEAMS UFT
    JOIN TEAMS T ON UFT.team_id = T.team_id
    WHERE T.team_name = 'Boston Celtics'
);


-- View 6: leaderboard of users by their score
CREATE OR REPLACE VIEW UserLeaderboard AS
SELECT
    U.user_id,
    U.username,
    U.user_score
FROM USERS U;


-- View 7: number of followers per team
CREATE OR REPLACE VIEW MostFollowedTeams AS
SELECT
    T.team_id,
    T.team_name,
    COUNT(UFT.user_id) AS total_followers
FROM TEAMS T
LEFT JOIN USER_FOLLOWED_TEAMS UFT ON T.team_id = UFT.team_id
GROUP BY T.team_id, T.team_name;


-- View 8: number of members per group
CREATE OR REPLACE VIEW GroupMembershipSummary AS
SELECT
    G.group_id,
    G.group_name,
    COUNT(GM.user_id) AS total_members
FROM GROUPS G
LEFT JOIN GROUP_MEMBERS GM ON G.group_id = GM.group_id
GROUP BY G.group_id, G.group_name;


-- View 9: number of predictions per game
CREATE OR REPLACE VIEW GamePredictionStatistics AS
SELECT
    G.game_id,
    G.game_date,
    COUNT(P.prediction_id) AS total_predictions
FROM GAMES G
LEFT JOIN PREDICTIONS P ON G.game_id = P.game_id
GROUP BY G.game_id, G.game_date;


-- View 10: each user's prediction accuracy on completed games
CREATE OR REPLACE VIEW UserPredictionAccuracy AS
SELECT
    U.user_id,
    U.username,
    COUNT(P.prediction_id) AS total_predictions,
    COUNT(CASE WHEN P.predicted_winner_id = G.winner_id THEN 1 END) AS correct_predictions,
    ROUND(
        COUNT(CASE WHEN P.predicted_winner_id = G.winner_id THEN 1 END) * 100.0
        / NULLIF(COUNT(P.prediction_id), 0),
        2
    ) AS accuracy_percentage
FROM USERS U
JOIN PREDICTIONS P ON U.user_id = P.user_id
JOIN GAMES G       ON P.game_id = G.game_id
WHERE G.winner_id IS NOT NULL
GROUP BY U.user_id, U.username;