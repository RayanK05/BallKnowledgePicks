// turns a team id into that team's name, using the two teams in this game
import { teamName } from "../../utils/teams.js";
import { Check, X, Minus } from "lucide-react";
import styles from "./FinishedGame.module.css";

const FinishedGame = ({ game, myPick }) => {
  const winnerName = teamName(game, game.winner_id);
  const awayWon = game.winner_id === game.away_team_id;
  const homeWon = game.winner_id === game.home_team_id;

  let badge;
  if (myPick === undefined) {
    badge = (
      <span className={`${styles.badge} ${styles.noPick}`}>
        <Minus size={14} /> No pick
      </span>
    );
  } else if (myPick.predicted_winner_id === game.winner_id) {
    badge = (
      <span className={`${styles.badge} ${styles.correct}`}>
        <Check size={14} /> Correct +10
      </span>
    );
  } else {
    badge = (
      <span className={`${styles.badge} ${styles.wrong}`}>
        <X size={14} /> Wrong
      </span>
    );
  }

  return (
    <div className={styles.result}>
      <div className={styles.scoreLine}>
        <span className={awayWon ? styles.winner : styles.loser}>
          {game.away_team} <strong>{game.away_score}</strong>
        </span>
        <span className={styles.dash}>–</span>
        <span className={homeWon ? styles.winner : styles.loser}>
          <strong>{game.home_score}</strong> {game.home_team}
        </span>
      </div>

      <div className={styles.pick}>
        {myPick !== undefined && (
          <span className={styles.pickText}>
            Your pick: <strong>{winnerName}</strong>
          </span>
        )}
        {badge}
      </div>
    </div>
  );
};

export default FinishedGame;
