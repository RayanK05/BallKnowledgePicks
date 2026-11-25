export function gameStatus(game) {
  if (game.winner_id !== null) return "final";
  if (game.tipoff && new Date(game.tipoff) <= new Date()) return "live";
  return "upcoming";
}
