DROP TABLE IF EXISTS NOTIFICATIONS, USER_FOLLOWED_TEAMS, GROUP_MEMBERS, GROUPS,
    PREDICTIONS, GAMES, TEAMS, USERS CASCADE;

CREATE TABLE USERS (
    user_id 	SERIAL 		PRIMARY KEY,
    username	VARCHAR(30) 	NOT NULL UNIQUE,
    email 	VARCHAR(255) 	NOT NULL UNIQUE,
    user_score 	INT NOT NULL 	DEFAULT 0 CHECK (user_score >= 0),
    role     VARCHAR(20) 	NOT NULL DEFAULT 'user',
    password_hash VARCHAR(255) NOT NULL,
    CONSTRAINT 	chk_user_roles CHECK (role IN ('user', 'admin', 'guest')),
    CONSTRAINT 	chk_users_email CHECK (email LIKE '%_@_%._%')
);

CREATE TABLE TEAMS (
    team_id    SERIAL       PRIMARY KEY,
    team_name  VARCHAR(60)  NOT NULL UNIQUE
); 

CREATE TABLE GAMES (
    game_id       SERIAL  PRIMARY KEY,
    home_team_id  INT     NOT NULL REFERENCES TEAMS(team_id),
    away_team_id  INT     NOT NULL REFERENCES TEAMS(team_id),
    game_date     DATE    NOT NULL,
    tipoff        TIMESTAMPTZ,
    winner_id     INT     REFERENCES TEAMS(team_id),
    home_score    INT     CHECK (home_score >= 0),
    away_score    INT     CHECK (away_score >= 0),
    CONSTRAINT chk_games_two_teams CHECK (home_team_id <> away_team_id),
    CONSTRAINT chk_games_winner    CHECK (winner_id IN (home_team_id, away_team_id)),
    CONSTRAINT uq_games_matchup    UNIQUE (home_team_id, away_team_id, game_date)
);

-- add id to games table
ALTER TABLE games ADD COLUMN external_id TEXT UNIQUE;

CREATE TABLE PREDICTIONS (
    prediction_id        SERIAL  PRIMARY KEY,
    user_id              INT     NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
    game_id              INT     NOT NULL REFERENCES GAMES(game_id) ON DELETE CASCADE,
    predicted_winner_id  INT     NOT NULL REFERENCES TEAMS(team_id),
    CONSTRAINT uq_predictions_one_pick UNIQUE (user_id, game_id)
);

CREATE TABLE GROUPS ( 
	group_id			SERIAL	PRIMARY KEY, 
	group_name 			VARCHAR(30)	NOT NULL
);

CREATE TABLE GROUP_MEMBERS (
    group_id  INT  NOT NULL REFERENCES Groups(group_id) ON DELETE CASCADE,
    user_id   INT  NOT NULL REFERENCES Users(user_id)   ON DELETE CASCADE,
    PRIMARY KEY (group_id, user_id)
); 


CREATE TABLE USER_FOLLOWED_TEAMS (
    user_id          INT      NOT NULL REFERENCES USERS(user_id) ON DELETE CASCADE,
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
    CONSTRAINT chk_notifications_type CHECK (alert_type IN ('win', 'loss', 'game_day'))
);

ALTER TABLE notifications
  ADD CONSTRAINT uq_notifications_user_game_team_type
  UNIQUE (user_id, game_id, team_id, alert_type);


-- create the trigger for game status changes
CREATE OR REPLACE FUNCTION public.notify_game_final()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
BEGIN
  INSERT INTO notifications (user_id, game_id, team_id, alert_type)
  SELECT f.user_id,
         NEW.game_id,
         f.team_id,
         CASE WHEN f.team_id = NEW.winner_id THEN 'win' ELSE 'loss' END
  FROM user_followed_teams f
  WHERE f.team_id IN (NEW.home_team_id, NEW.away_team_id)
  ON CONFLICT (user_id, game_id, team_id, alert_type) DO NOTHING;
  RETURN NEW;
END;
$BODY$;

ALTER FUNCTION public.notify_game_final()
    OWNER TO postgres;

DROP TRIGGER IF EXISTS predictions_notify ON predictions;
DROP TRIGGER IF EXISTS games_final_event ON games;

-- fires when someone submits or edits a pick (optional, see note below)
CREATE OR REPLACE FUNCTION notify_prediction_change() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('db_events', json_build_object(
    'type', 'prediction',
    'user_id', NEW.user_id,
    'game_id', NEW.game_id,
    'predicted_winner_id', NEW.predicted_winner_id,
    'username', (SELECT username FROM users WHERE user_id = NEW.user_id),
    'operation', TG_OP                     -- 'INSERT' or 'UPDATE'
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER predictions_notify
AFTER INSERT OR UPDATE ON predictions
FOR EACH ROW EXECUTE FUNCTION notify_prediction_change();

-- fires when a game gets its winner, which is when scores change
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

-- announce score changes
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

-- fire only when the value actually changes
DROP TRIGGER IF EXISTS users_score_notify ON users;
CREATE TRIGGER users_score_notify
AFTER UPDATE OF user_score ON users
FOR EACH ROW
WHEN (OLD.user_score IS DISTINCT FROM NEW.user_score)
EXECUTE FUNCTION notify_score_change();

CREATE OR REPLACE FUNCTION notify_group_member_change() RETURNS trigger AS $$
DECLARE
  rec group_members;
BEGIN
  -- DELETE has no NEW row, so read from OLD there
  IF TG_OP = 'DELETE' THEN rec := OLD; ELSE rec := NEW; END IF;

  PERFORM pg_notify('db_events', json_build_object(
    'type', 'group_member',
    'operation', TG_OP,                       -- 'INSERT' = joined, 'DELETE' = left
    'group_id', rec.group_id,
    'user_id', rec.user_id,
    'username', (SELECT username FROM users WHERE user_id = rec.user_id)
  )::text);

  RETURN NULL;   -- the return value is ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS group_members_notify ON group_members;
CREATE TRIGGER group_members_notify
AFTER INSERT OR DELETE ON group_members
FOR EACH ROW EXECUTE FUNCTION notify_group_member_change();
-- ACTION: recalculate scores for everyone who picked this game
CREATE OR REPLACE FUNCTION recalc_scores_for_game()
RETURNS TRIGGER AS $$
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


-- EVENT + CONDITION (update): a game's winner changed
DROP TRIGGER IF EXISTS trg_score_on_result_update ON games;
CREATE TRIGGER trg_score_on_result_update
AFTER UPDATE OF winner_id ON games
FOR EACH ROW
WHEN (NEW.winner_id IS DISTINCT FROM OLD.winner_id)
EXECUTE FUNCTION recalc_scores_for_game();
