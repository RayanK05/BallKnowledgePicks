const FinishedGame = ({ game, myPick }) => {
  return (
    <p>
      Final: {game.away_team} {game.away_score} – {game.home_score} {game.home_team}
      {myPick !== undefined &&
        (myPick.predicted_winner_id === game.winner_id ? " ✅ Correct +10" : " ❌ Wrong")}
    </p>
  );
};

export default FinishedGame;
