// Whitelist of the 10 database views the Stats page can show.
// Clients only ever send the `key`; the SQL view name comes from here, so a
// user-supplied string never ends up in a query (no SQL injection).
// `orderBy` is fixed per view so tables and exports come out in a stable order.

const VIEWS = [
  {
    key: 'user-leaderboard',
    view: 'UserLeaderboard',
    title: 'User Leaderboard',
    description: 'Every registered user and their total prediction score.',
    orderBy: 'user_score DESC, username ASC',
  },
  {
    key: 'user-prediction-accuracy',
    view: 'UserPredictionAccuracy',
    title: 'User Prediction Accuracy',
    description: 'Correct picks out of completed-game picks, as a percentage, per user.',
    orderBy: 'accuracy_percentage DESC, correct_predictions DESC, username ASC',
  },
  {
    key: 'user-game-predictions',
    view: 'UserGamePredictions',
    title: 'User Game Predictions',
    description: 'Each pick: who made it, which game, the game date and the predicted winner.',
    orderBy: 'game_date ASC, game_id ASC, username ASC',
  },
  {
    key: 'most-active-predictors',
    view: 'MostActivePredictors',
    title: 'Most Active Predictors',
    description: 'Users who made more picks than at least one other user (uses > ANY).',
    orderBy: 'total_predictions DESC, username ASC',
  },
  {
    key: 'above-average-group-predictors',
    view: 'AboveAverageGroupPredictors',
    title: 'Above-Average Group Predictors',
    description: "Members who made more picks than their group's average (correlated subquery).",
    orderBy: 'group_id ASC, total_predictions DESC',
  },
  {
    key: 'games-and-predictions',
    view: 'GamesAndPredictions',
    title: 'Games and Predictions',
    description: 'All games alongside their picks, including games with no picks (FULL OUTER JOIN).',
    orderBy: 'game_id ASC NULLS LAST, prediction_id ASC NULLS LAST',
  },
  {
    key: 'game-prediction-statistics',
    view: 'GamePredictionStatistics',
    title: 'Game Prediction Statistics',
    description: 'Number of picks submitted for each game.',
    orderBy: 'game_date ASC, game_id ASC',
  },
  {
    key: 'most-followed-teams',
    view: 'MostFollowedTeams',
    title: 'Most Followed Teams',
    description: 'Each NBA team and how many users follow it.',
    orderBy: 'total_followers DESC, team_name ASC',
  },
  {
    key: 'lakers-and-celtics-followers',
    view: 'LakersAndCelticsFollowers',
    title: 'Lakers and Celtics Followers',
    description: 'Users who follow both the Lakers and the Celtics (INTERSECT).',
    orderBy: 'user_id ASC',
  },
  {
    key: 'group-membership-summary',
    view: 'GroupMembershipSummary',
    title: 'Group Membership Summary',
    description: 'Each prediction group and its number of members.',
    orderBy: 'total_members DESC, group_name ASC',
  },
];

const VIEWS_BY_KEY = new Map(VIEWS.map((v) => [v.key, v]));

module.exports = { VIEWS, VIEWS_BY_KEY };
