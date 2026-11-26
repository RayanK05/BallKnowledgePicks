import TeamButton from "./TeamButton.jsx";
import styles from "./UpcomingGame.module.css";

const UpcomingGame = ({ game, myPick, onPick, onRemove }) => {
  const pickedId = myPick?.predicted_winner_id; // undefined if no pick

  return (
    <div className={styles.matchup}>
      <TeamButton
        name={game.away_team}
        side="Away"
        picked={pickedId === game.away_team_id}
        onClick={() => onPick(game, game.away_team_id, myPick)}
      />

      <span className={styles.at}>@</span>

      <TeamButton
        name={game.home_team}
        side="Home"
        picked={pickedId === game.home_team_id}
        onClick={() => onPick(game, game.home_team_id, myPick)}
      />

      <div className={styles.actions}>
        {myPick !== undefined ? (
          <button className={styles.remove} onClick={() => onRemove(game.game_id)}>
            Remove pick
          </button>
        ) : (
          <span className={styles.hint}>Tap a team</span>
        )}
      </div>
    </div>
  );
};

export default UpcomingGame;
