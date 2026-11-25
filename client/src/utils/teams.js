// turns a team id into that team's name, using the two teams in this game
export function teamName(game, teamId) {
  return teamId === game.home_team_id ? game.home_team : game.away_team;
}
