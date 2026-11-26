-- Ball Knowledge Picks mock data (matches schema.sql)
-- WARNING: this empties every table first.

TRUNCATE notifications, user_followed_teams, group_members, groups,
         predictions, games, teams, users RESTART IDENTITY CASCADE;

INSERT INTO users (username, email, user_score, role, password_hash) VALUES
    ('James Wilson',      'james.wilson@example.com',      20, 'user', '$2b$10$cJbQUXlEbAYyB45NXmBkku/nEw43SUIeClzBaNBo6WrMJyIitRyWi'),
    ('Michael Johnson',   'michael.johnson@example.com',   10, 'user', '$2b$10$cJbQUXlEbAYyB45NXmBkku/nEw43SUIeClzBaNBo6WrMJyIitRyWi'),
    ('Daniel Thompson',   'daniel.thompson@example.com',   20, 'user', '$2b$10$cJbQUXlEbAYyB45NXmBkku/nEw43SUIeClzBaNBo6WrMJyIitRyWi'),
    ('Christopher Brown', 'christopher.brown@example.com', 10, 'user', '$2b$10$cJbQUXlEbAYyB45NXmBkku/nEw43SUIeClzBaNBo6WrMJyIitRyWi'),
    ('Matthew Davis',     'matthew.davis@example.com',      0, 'user', '$2b$10$cJbQUXlEbAYyB45NXmBkku/nEw43SUIeClzBaNBo6WrMJyIitRyWi'),
    ('Anthony Martinez',  'anthony.martinez@example.com',  10, 'user', '$2b$10$cJbQUXlEbAYyB45NXmBkku/nEw43SUIeClzBaNBo6WrMJyIitRyWi'),
    ('Ryan Anderson',     'ryan.anderson@example.com',      0, 'user', '$2b$10$cJbQUXlEbAYyB45NXmBkku/nEw43SUIeClzBaNBo6WrMJyIitRyWi'),
    ('Brandon Taylor',    'brandon.taylor@example.com',     0, 'user', '$2b$10$cJbQUXlEbAYyB45NXmBkku/nEw43SUIeClzBaNBo6WrMJyIitRyWi'),
    ('Kevin Robinson',    'kevin.robinson@example.com',     0, 'user', '$2b$10$cJbQUXlEbAYyB45NXmBkku/nEw43SUIeClzBaNBo6WrMJyIitRyWi'),
    ('Nathan Walker',     'nathan.walker@example.com',      0, 'user', '$2b$10$cJbQUXlEbAYyB45NXmBkku/nEw43SUIeClzBaNBo6WrMJyIitRyWi');

INSERT INTO teams (team_id, team_name) VALUES
    (1,  'Atlanta Hawks'),
    (2,  'Boston Celtics'),
    (3,  'Brooklyn Nets'),
    (4,  'Charlotte Hornets'),
    (5,  'Chicago Bulls'),
    (6,  'Cleveland Cavaliers'),
    (7,  'Dallas Mavericks'),
    (8,  'Denver Nuggets'),
    (9,  'Detroit Pistons'),
    (10, 'Golden State Warriors'),
    (11, 'Houston Rockets'),
    (12, 'Indiana Pacers'),
    (13, 'LA Clippers'),
    (14, 'Los Angeles Lakers'),
    (15, 'Memphis Grizzlies'),
    (16, 'Miami Heat'),
    (17, 'Milwaukee Bucks'),
    (18, 'Minnesota Timberwolves'),
    (19, 'New Orleans Pelicans'),
    (20, 'New York Knicks'),
    (21, 'Oklahoma City Thunder'),
    (22, 'Orlando Magic'),
    (23, 'Philadelphia 76ers'),
    (24, 'Phoenix Suns'),
    (25, 'Portland Trail Blazers'),
    (26, 'Sacramento Kings'),
    (27, 'San Antonio Spurs'),
    (28, 'Toronto Raptors'),
    (29, 'Utah Jazz'),
    (30, 'Washington Wizards');

-- teams were inserted with explicit ids, so move the sequence past them
SELECT setval(pg_get_serial_sequence('teams', 'team_id'), (SELECT MAX(team_id) FROM teams));

-- external_id is left NULL (the API seed fills it in); tipoff is 7:30 PM Eastern (EDT, UTC-4)
-- only get games from the api

INSERT INTO predictions (user_id, game_id, predicted_winner_id) VALUES
    (1, 1, 1),
    (1, 2, 3),
    (1, 3, 6),
    (2, 1, 2),
    (2, 4, 7),
    (3, 2, 3),
    (3, 5, 9),
    (4, 3, 5),
    (5, 4, 8),
    (6, 5, 9);

INSERT INTO groups (group_name) VALUES
    ('Raptors Nation'),
    ('Lakers Fans'),
    ('Celtics Crew'),
    ('Warriors Dynasty'),
    ('Knicks Community'),
    ('Heat Culture'),
    ('Thunder Fans'),
    ('Bucks Nation'),
    ('Nuggets Fans'),
    ('NBA Predictions League');

-- every group has at least one admin (the first member listed for each)
INSERT INTO group_members (group_id, user_id, role) VALUES
    (1,  1,  'admin'),
    (1,  2,  'member'),
    (1,  3,  'member'),
    (1,  4,  'member'),
    (2,  5,  'admin'),
    (2,  6,  'member'),
    (3,  7,  'admin'),
    (4,  8,  'admin'),
    (5,  9,  'admin'),
    (6,  2,  'admin'),
    (7,  3,  'admin'),
    (8,  4,  'admin'),
    (9,  5,  'admin'),
    (10, 10, 'admin');

INSERT INTO user_followed_teams (user_id, team_id, notifications_on) VALUES
    (1, 2, TRUE),
    (1, 3, TRUE),
    (2, 2, TRUE),
    (2, 3, TRUE),
    (3, 2, TRUE),
    (3, 3, TRUE),
    (4, 1, TRUE),
    (5, 5, TRUE),
    (6, 6, TRUE),
    (7, 7, TRUE);

INSERT INTO notifications (user_id, team_id, game_id, alert_type, is_read) VALUES
    (1, 2, 1, 'loss',     FALSE),
    (2, 2, 1, 'loss',     FALSE),
    (3, 3, 2, 'win',      FALSE),
    (4, 1, 1, 'win',      FALSE),
    (5, 5, 3, 'game_day', FALSE),
    (6, 6, 3, 'loss',     FALSE),
    (7, 7, 4, 'win',      FALSE),
    (1, 3, 2, 'win',      FALSE),
    (2, 3, 2, 'win',      FALSE),
    (3, 2, 6, 'game_day', FALSE);

-- Sanity check (run on its own): user_score should equal 10 points per correct pick.
-- This should return no rows.
-- SELECT u.user_id, u.user_score, COALESCE(c.correct, 0) * 10 AS expected
-- FROM users u
-- LEFT JOIN (
--   SELECT p.user_id, COUNT(*) AS correct
--   FROM predictions p
--   JOIN games g ON g.game_id = p.game_id
--   WHERE p.predicted_winner_id = g.winner_id
--   GROUP BY p.user_id
-- ) c ON c.user_id = u.user_id
-- WHERE u.user_score <> COALESCE(c.correct, 0) * 10;