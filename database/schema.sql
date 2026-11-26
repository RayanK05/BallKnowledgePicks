-- Ball Knowledge Picks schema
-- WARNING: this drops every table first, so it wipes all data. Re-seed afterward.

DROP TABLE IF EXISTS NOTIFICATIONS, USER_FOLLOWED_TEAMS, GROUP_MEMBERS, GROUPS,
    PREDICTIONS, GAMES, TEAMS, USERS CASCADE;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE USERS (
    user_id        SERIAL        PRIMARY KEY,
    username       VARCHAR(30)   NOT NULL UNIQUE,
    email          VARCHAR(255)  NOT NULL UNIQUE,
    user_score     INT           NOT NULL DEFAULT 0 CHECK (user_score >= 0),
    role           VARCHAR(20)   NOT NULL DEFAULT 'user',
    password_hash  VARCHAR(255)  NOT NULL,
    CONSTRAINT chk_user_roles  CHECK (role IN ('user', 'admin', 'guest')),
    CONSTRAINT chk_users_email CHECK (email LIKE '%_@_%._%')
);

CREATE TABLE TEAMS (
    team_id    SERIAL       PRIMARY KEY,
    team_name  VARCHAR(60)  NOT NULL UNIQUE
);

CREATE TABLE GAMES (
    game_id       SERIAL       PRIMARY KEY,
    external_id   TEXT         UNIQUE,              -- the sports API's game id
    home_team_id  INT          NOT NULL REFERENCES TEAMS(team_id),
    away_team_id  INT          NOT NULL REFERENCES TEAMS(team_id),
    game_date     DATE         NOT NULL,
    tipoff        TIMESTAMPTZ,
    winner_id     INT          REFERENCES TEAMS(team_id),
    home_score    INT          CHECK (home_score >= 0),
    away_score    INT          CHECK (away_score >= 0),
    CONSTRAINT chk_games_two_teams CHECK (home_team_id <> away_team_id),
    CONSTRAINT chk_games_winner    CHECK (winner_id IN (home_team_id, away_team_id)),
    CONSTRAINT uq_games_matchup    UNIQUE (home_team_id, away_team_id, game_date)
);

CREATE TABLE PREDICTIONS (
    prediction_id        SERIAL  PRIMARY KEY,
    user_id              INT     NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
    game_id              INT     NOT NULL REFERENCES GAMES(game_id) ON DELETE CASCADE,
    predicted_winner_id  INT     NOT NULL REFERENCES TEAMS(team_id),
    CONSTRAINT uq_predictions_one_pick UNIQUE (user_id, game_id)
);

CREATE TABLE GROUPS (
    group_id    SERIAL       PRIMARY KEY,
    group_name  VARCHAR(30)  NOT NULL
);

CREATE TABLE GROUP_MEMBERS (
    group_id  INT          NOT NULL REFERENCES GROUPS(group_id) ON DELETE CASCADE,
    user_id   INT          NOT NULL REFERENCES USERS(user_id)   ON DELETE CASCADE,
    role      VARCHAR(10)  NOT NULL DEFAULT 'member',
    PRIMARY KEY (group_id, user_id),
    CONSTRAINT chk_group_members_role CHECK (role IN ('member', 'admin'))
);

CREATE TABLE USER_FOLLOWED_TEAMS (
    user_id           INT      NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
    team_id           INT      NOT NULL REFERENCES TEAMS(team_id) ON DELETE CASCADE,
    notifications_on  BOOLEAN  NOT NULL DEFAULT TRUE,
    PRIMARY KEY (user_id, team_id)
);

CREATE TABLE NOTIFICATIONS (
    notification_id  SERIAL       PRIMARY KEY,
    user_id          INT          NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
    team_id          INT          NOT NULL REFERENCES TEAMS(team_id) ON DELETE CASCADE,
    game_id          INT          NOT NULL REFERENCES GAMES(game_id) ON DELETE CASCADE,
    alert_type       VARCHAR(20)  NOT NULL,
    is_read          BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_notifications_type CHECK (alert_type IN ('win', 'loss', 'game_day')),
    CONSTRAINT uq_notifications_user_game_team_type UNIQUE (user_id, game_id, team_id, alert_type)
);

-- ============================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================

-- Create a notification for each follower of a team in a game that just got a winner
CREATE OR REPLACE FUNCTION notify_game_final() RETURNS trigger AS $$
BEGIN
  INSERT INTO notifications (user_id, game_id, team_id, alert_type)
  SELECT f.user_id,
         NEW.game_id,
         f.team_id,
         CASE WHEN f.team_id = NEW.winner_id THEN 'win' ELSE 'loss' END
  FROM user_followed_teams f
  WHERE f.team_id IN (NEW.home_team_id, NEW.away_team_id)
    AND f.notifications_on = TRUE
  ON CONFLICT (user_id, game_id, team_id, alert_type) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_final_notify
AFTER UPDATE OF winner_id ON games
FOR EACH ROW
WHEN (OLD.winner_id IS NULL AND NEW.winner_id IS NOT NULL)
EXECUTE FUNCTION notify_game_final();

-- Live event: someone submitted or edited a pick
CREATE OR REPLACE FUNCTION notify_prediction_change() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('db_events', json_build_object(
    'type', 'prediction',
    'user_id', NEW.user_id,
    'game_id', NEW.game_id,
    'predicted_winner_id', NEW.predicted_winner_id,
    'username', (SELECT username FROM users WHERE user_id = NEW.user_id),
    'operation', TG_OP                      -- 'INSERT' or 'UPDATE'
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER predictions_notify
AFTER INSERT OR UPDATE ON predictions
FOR EACH ROW EXECUTE FUNCTION notify_prediction_change();

-- Live event: a game just got its winner
CREATE OR REPLACE FUNCTION notify_game_final_event() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('db_events', json_build_object(
    'type', 'game_final', 'game_id', NEW.game_id
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_final_event
AFTER UPDATE OF winner_id ON games
FOR EACH ROW
WHEN (OLD.winner_id IS NULL AND NEW.winner_id IS NOT NULL)
EXECUTE FUNCTION notify_game_final_event();

-- Live event: a user's score changed
CREATE OR REPLACE FUNCTION notify_score_change() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('db_events', json_build_object(
    'type', 'score',
    'user_id', NEW.user_id,
    'user_score', NEW.user_score
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_score_notify
AFTER UPDATE OF user_score ON users
FOR EACH ROW
WHEN (OLD.user_score IS DISTINCT FROM NEW.user_score)
EXECUTE FUNCTION notify_score_change();

-- Live event: someone joined or left a group
CREATE OR REPLACE FUNCTION notify_group_member_change() RETURNS trigger AS $$
DECLARE
  rec group_members;
BEGIN
  -- DELETE has no NEW row, so read from OLD there
  IF TG_OP = 'DELETE' THEN rec := OLD; ELSE rec := NEW; END IF;

  PERFORM pg_notify('db_events', json_build_object(
    'type', 'group_member',
    'operation', TG_OP,                     -- 'INSERT' = joined, 'DELETE' = left
    'group_id', rec.group_id,
    'user_id', rec.user_id,
    'username', (SELECT username FROM users WHERE user_id = rec.user_id)
  )::text);

  RETURN NULL;                              -- ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER group_members_notify
AFTER INSERT OR DELETE ON group_members
FOR EACH ROW EXECUTE FUNCTION notify_group_member_change();

-- Recalculate scores (10 points per correct pick) for everyone who picked this game
CREATE OR REPLACE FUNCTION recalc_scores_for_game() RETURNS trigger AS $$
BEGIN
  UPDATE users u
  SET user_score = (
    SELECT COUNT(*) * 10
    FROM predictions p
    JOIN games g ON p.game_id = g.game_id
    WHERE p.user_id = u.user_id
      AND p.predicted_winner_id = g.winner_id
  )
  WHERE u.user_id IN (
    SELECT user_id FROM predictions WHERE game_id = NEW.game_id
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_score_on_result_update
AFTER UPDATE OF winner_id ON games
FOR EACH ROW
WHEN (NEW.winner_id IS DISTINCT FROM OLD.winner_id)
EXECUTE FUNCTION recalc_scores_for_game();