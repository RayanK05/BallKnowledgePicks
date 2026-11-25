import styles from "./UpcomingGame.module.css";
import { teamName } from "../../utils/teams.js";

const UpcomingGame = ({ game, myPick, onPick, onRemove }) => {
  const pickedId = myPick?.predicted_winner_id; // undefined if no pick

  return (
    <div>
      <button onClick={() => onPick(game, game.away_team_id, myPick)}>{game.away_team}</button>
      <button onClick={() => onPick(game, game.home_team_id, myPick)}>{game.home_team}</button>
      {myPick !== undefined && <button onClick={() => onRemove(game.game_id)}>Delete Pick</button>}
      <p>Your pick: {pickedId === undefined ? "none" : teamName(game, pickedId)}</p>
    </div>
  );
};

export default UpcomingGame;
