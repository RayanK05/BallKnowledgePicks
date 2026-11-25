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

const Guesses = () => {
  const [games, setGames] = useState([]);
  const [picks, setPicks] = useState([]);
  const [tab, setTab] = useState("upcoming");
  const [error, setError] = useState("");

  const loggedIn = !!localStorage.getItem("token");

  async function load() {
    const gamesData = await apiFetch("/api/games");
    setGames(gamesData.games || []);

    if (loggedIn) {
      const picksData = await apiFetch("/api/predictions");
      setPicks(picksData.predictions || []);
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
    load();
  }, []);

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
  const shownGames = tab === "upcoming" ? upcomingGames : finishedGames;

  const pickedCount = upcomingGames.filter((g) =>
    picks.some((p) => p.game_id === g.game_id),
  ).length;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}> Games & Pick'em ({games.length})</h1>

      <div className={styles.list}>
        {games.map((game) => (
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
