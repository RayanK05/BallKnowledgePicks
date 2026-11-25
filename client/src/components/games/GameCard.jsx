import UpcomingGame from "./UpcomingGame.jsx";
import FinishedGame from "./FinishedGame.jsx";
import styles from "./GameCard.module.css";

const GameCard = ({ game, myPick, onPick, onRemove }) => {
  const isFinished = game.winner_id !== null;
  const isLive = !isFinished && game.tipoff !== null && new Date(game.tipoff) <= new Date();

  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <span className={styles.date}>
          {game.tipoff ? new Date(game.tipoff).toLocaleString() : game.game_date.slice(0, 10)}
        </span>
        <span className={`${styles.tag} ${isFinished ? styles.final : styles.upcoming}`}>
          {isFinished ? "Final" : isLive ? "Live" : "Upcoming"}
        </span>
      </div>

      <div className={styles.body}>
        {isFinished ? (
          <FinishedGame game={game} myPick={myPick} />
        ) : (
          <UpcomingGame game={game} myPick={myPick} onPick={onPick} onRemove={onRemove} />
        )}
      </div>
    </div>
  );
};

export default GameCard;
