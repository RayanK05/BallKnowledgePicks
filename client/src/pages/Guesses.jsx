/**
 * @typedef {Object} Game
 * @property {number} game_id
 * @property {string} game_date
 * @property {number} home_team_id
 * @property {string} home_team
 * @property {number} away_team_id
 * @property {string} away_team
 * @property {number|null} home_score
 * @property {number|null} away_score
 * @property {number|null} winner_id   null = not played yet
 */

/**
 * @typedef {Object} Prediction
 * @property {number} game_id              the game this pick is for
 * @property {number} predicted_winner_id  the team_id the user picked
 */

import { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import styles from "./Guesses.module.css";
import GameCard from "../components/games/GameCard.jsx";
import ScoreSummary from "../components/games/ScoreSummary.jsx";
import FilterBar from "../components/games/FilterBar.jsx";
import { gameStatus } from "../utils/games.js";

// a date N days from today, as "YYYY-MM-DD" (local time)
function daysFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}

const Guesses = () => {
  const [games, setGames] = useState([]);
  const [picks, setPicks] = useState([]);
  // const [score, setScore] = useState(null);
  const [teams, setTeams] = useState([]); // options for the team dropdown
  const [team, setTeam] = useState(""); // selected team_id ("" = all)
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState(daysFromToday(-7));
  const [to, setTo] = useState(daysFromToday(7));
  const [pickFilter, setPickFilter] = useState("all"); // "all" | "picked" | "unpicked"

  const shownGames = games
    .filter((game) => status === "all" || gameStatus(game) === status)
    .filter((game) => {
      if (pickFilter === "all") return true;
      const picked = picks.some((p) => p.game_id === game.game_id);
      return pickFilter === "picked" ? picked : !picked;
    });
  const loggedIn = !!localStorage.getItem("token");

  async function load() {
    const query = new URLSearchParams();
    if (team) query.set("team", team);
    if (from) query.set("from", from);
    if (to) query.set("to", to);

    const gamesData = await apiFetch(`/api/games?${query}`);
    setGames(gamesData.games || []);

    if (loggedIn) {
      const picksData = await apiFetch("/api/predictions");
      setPicks(picksData.predictions || []);

      // const meData = await apiFetch("/api/me");
      // if (meData.ok) setScore(meData.user.user_score);

      const statsData = await apiFetch("/api/predictions/stats");
      if (statsData.ok) setStats(statsData.stats);
    }
  }

  function handlePick(game, teamId, myPick) {
    if (myPick === undefined) {
      makePick(game.game_id, teamId);
    } else {
      changePick(game.game_id, teamId);
    }
  }

  useEffect(() => {
    apiFetch("/api/teams").then((data) => setTeams(data.teams || []));
  }, []);

  useEffect(() => {
    load();
  }, [team, from, to]);

  // CREATE a pick
  async function makePick(gameId, teamId) {
    const data = await apiFetch("/api/predictions", {
      method: "POST",
      body: JSON.stringify({ game_id: gameId, predicted_winner_id: teamId }),
    });
    console.log("POST result:", data);
    load();
  }

  // UPDATE a pick
  async function changePick(gameId, teamId) {
    const data = await apiFetch(`/api/predictions/${gameId}`, {
      method: "PUT",
      body: JSON.stringify({ predicted_winner_id: teamId }),
    });
    console.log("PUT result:", data);
    load();
  }

  // DELETE a pick
  async function removePick(gameId) {
    const data = await apiFetch(`/api/predictions/${gameId}`, {
      method: "DELETE",
    });
    console.log("DELETE result:", data);
    load();
  }

  //split games into tabs
  const upcomingGames = games.filter((g) => g.winner_id === null);
  const finishedGames = games.filter((g) => g.winner_id !== null).reverse(); // newest first
  //const shownGames = tab === "upcoming" ? upcomingGames : finishedGames;

  const pickedCount = upcomingGames.filter((g) =>
    picks.some((p) => p.game_id === g.game_id),
  ).length;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}> Games & Pick'em ({games.length})</h1>
      <h2 className={styles.subtitle}>Pick the winner before tipoff</h2>
      {stats && <ScoreSummary stats={stats} />}
      <FilterBar
        teams={teams}
        team={team}
        onTeamChange={setTeam}
        from={from}
        onFromChange={setFrom}
        to={to}
        onToChange={setTo}
        status={status}
        onStatusChange={setStatus}
        pickFilter={pickFilter}
        onPickFilterChange={setPickFilter}
      />
      <div className={styles.list}>
        {shownGames.map((game) => (
          <GameCard
            key={game.game_id}
            game={game}
            myPick={picks.find((p) => p.game_id === game.game_id)}
            onPick={handlePick}
            onRemove={removePick}
          />
        ))}
      </div>
    </div>
  );
};

export default Guesses;
