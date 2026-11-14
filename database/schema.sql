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
    winner_id     INT     REFERENCES TEAMS(team_id),
    home_score    INT     CHECK (home_score >= 0),
    away_score    INT     CHECK (away_score >= 0),
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
