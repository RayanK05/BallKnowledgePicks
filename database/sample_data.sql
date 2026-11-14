TRUNCATE notifications, user_followed_teams, group_members, groups,
         predictions, games, teams, users RESTART IDENTITY CASCADE;

INSERT INTO users (user_id, username, email, user_score) VALUES
    (1,  'James Wilson',      'james.wilson@example.com',      20),
    (2,  'Michael Johnson',   'michael.johnson@example.com',   10),
    (3,  'Daniel Thompson',   'daniel.thompson@example.com',   20),
    (4,  'Christopher Brown', 'christopher.brown@example.com', 10),
    (5,  'Matthew Davis',     'matthew.davis@example.com',      0),
    (6,  'Anthony Martinez',  'anthony.martinez@example.com',  10),
    (7,  'Ryan Anderson',     'ryan.anderson@example.com',      0),
    (8,  'Brandon Taylor',    'brandon.taylor@example.com',     0),
    (9,  'Kevin Robinson',    'kevin.robinson@example.com',     0),
    (10, 'Nathan Walker',     'nathan.walker@example.com',      0);

INSERT INTO teams (team_id, team_name) VALUES
    (1,  'Toronto Raptors'),
    (2,  'Los Angeles Lakers'),
    (3,  'Boston Celtics'),
    (4,  'Golden State Warriors'),
    (5,  'New York Knicks'),
    (6,  'Miami Heat'),
    (7,  'Oklahoma City Thunder'),
    (8,  'Milwaukee Bucks'),
    (9,  'Denver Nuggets'),
    (10, 'Dallas Mavericks');

INSERT INTO games (game_id, home_team_id, away_team_id, game_date, winner_id, home_score, away_score) VALUES
    (1,  1,  2,  '2026-10-20', 1,  115, 102),
    (2,  3,  4,  '2026-10-21', 3,  121, 108),
    (3,  5,  6,  '2026-10-22', 5,  110, 104),
    (4,  7,  8,  '2026-10-23', 7,  118, 109),
    (5,  9,  10, '2026-10-24', 9,  124, 113),
    (6,  2,  3,  '2026-10-25', 2,  117, 111),
    (7,  4,  1,  '2026-10-26', 4,  120, 106),
    (8,  6,  7,  '2026-10-27', 6,  112, 105),
    (9,  8,  9,  '2026-10-28', 8,  116, 110),
    (10, 10, 5,  '2026-10-29', 10, 119, 107);

INSERT INTO predictions (prediction_id, user_id, game_id, predicted_winner_id) VALUES
    (1,  1, 1, 1),
    (2,  1, 2, 3),
    (3,  1, 3, 6),
    (4,  2, 1, 2),
    (5,  2, 4, 7),
    (6,  3, 2, 3),
    (7,  3, 5, 9),
    (8,  4, 3, 5),
    (9,  5, 4, 8),
    (10, 6, 5, 9);

INSERT INTO groups (group_id, group_name) VALUES
    (1,  'Raptors Nation'),
    (2,  'Lakers Fans'),
    (3,  'Celtics Crew'),
    (4,  'Warriors Dynasty'),
    (5,  'Knicks Community'),
    (6,  'Heat Culture'),
    (7,  'Thunder Fans'),
    (8,  'Bucks Nation'),
    (9,  'Nuggets Fans'),
    (10, 'NBA Predictions League');

INSERT INTO group_members (group_id, user_id) VALUES
    (1,  1),
    (1,  2),
    (1,  3),
    (1,  4),
    (2,  5),
    (2,  6),
    (3,  7),
    (4,  8),
    (5,  9),
    (10, 10);

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

INSERT INTO notifications (notification_id, user_id, team_id, game_id, alert_type, is_read) VALUES
    (1,  1, 2, 1, 'loss',     FALSE),
    (2,  2, 2, 1, 'loss',     FALSE),
    (3,  3, 3, 2, 'win',      FALSE),
    (4,  4, 1, 1, 'win',      FALSE),
    (5,  5, 5, 3, 'game_day', FALSE),
    (6,  6, 6, 3, 'loss',     FALSE),
    (7,  7, 7, 4, 'win',      FALSE),
    (8,  1, 3, 2, 'win',      FALSE),
    (9,  2, 3, 2, 'win',      FALSE),
    (10, 3, 2, 6, 'game_day', FALSE);
