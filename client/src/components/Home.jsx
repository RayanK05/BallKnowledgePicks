import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import "./Home.css";

function formatDate(game) {
    const date = String(game.game_date).slice(0, 10);

    return new Date(date + "T12:00:00").toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
}

function isUpcoming(game) {
    const today = new Date();

    const localDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    return game.winner_id == null &&
        (game.tipoff
            ? new Date(game.tipoff) > today
            : String(game.game_date).slice(0, 10) >= localDate);
}

function Home() {

    const [user, setUser] = useState(null);
    const [games, setGames] = useState([]);
    const [teams, setTeams] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [followedTeams, setFollowedTeams] = useState([]);
    const [stats, setStats] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const token = localStorage.getItem("token");

    const isGuest = !user || user.role === "guest";

    async function loadDashboard() {

        setLoading(true);
        setError("");

        try {

            const [gamesData, teamsData] = await Promise.all([
                apiFetch("/api/games"),
                apiFetch("/api/teams")
            ]);

            if (!gamesData.ok || !teamsData.ok) {
                throw new Error(
                    gamesData.error ||
                    teamsData.error ||
                    "Unable to load dashboard."
                );
            }

            setGames(gamesData.games || []);
            setTeams(teamsData.teams || []);

            setUser(null);
            setPredictions([]);
            setStats(null);
            setFollowedTeams([]);

            if (token) {

                const userData = await apiFetch("/api/me");

                if (!userData.ok) {
                    throw new Error(
                        userData.error || "Unable to load account."
                    );
                }

                setUser(userData.user);

                if (
                    userData.user &&
                    userData.user.role !== "guest"
                ) {

                    const results = await Promise.allSettled([
                        apiFetch("/api/predictions"),
                        apiFetch("/api/predictions/stats"),
                        apiFetch("/api/followData")
                    ]);

                    const predictionData = results[0].value;
                    const statsData = results[1].value;
                    const followData = results[2].value;

                    if (predictionData?.ok) {
                        setPredictions(
                            predictionData.predictions || []
                        );
                    }

                    if (statsData?.ok) {
                        setStats(statsData.stats);
                    }

                    if (followData?.ok) {
                        setFollowedTeams(
                            followData.following || []
                        );
                    }

                    if (results.some(result =>
                        result.status === "rejected" ||
                        !result.value?.ok
                    )) {
                        setError(
                            "Some personalized dashboard information could not be loaded."
                        );
                    }
                }
            }

        } catch (err) {

            setError(err.message);

        } finally {

            setLoading(false);

        }
    }

    useEffect(() => {
        loadDashboard();
    }, [token]);

    // Upcoming games

    const upcomingGames = games
        .filter(isUpcoming)
        .sort((a, b) =>
            new Date(a.tipoff || a.game_date) -
            new Date(b.tipoff || b.game_date)
        );

    // Match predictions with their corresponding games

    const predictionsByGame = new Map(
        predictions.map(prediction => [
            Number(prediction.game_id),
            prediction
        ])
    );

    // Completed games

    const completedGames = games
        .filter(game => game.winner_id != null)
        .sort((a, b) =>
            new Date(b.game_date) -
            new Date(a.game_date)
        );

    const recentResults = completedGames.slice(0, 5);

    // Recent user predictions

    const recentPredictions = completedGames
        .filter(game =>
            predictionsByGame.has(Number(game.game_id))
        )
        .slice(0, 5);

    // Followed teams

    const userTeams = teams.filter(team =>
        followedTeams.some(follow =>
            Number(follow.team_id) === Number(team.team_id)
        )
    );

    function getNextGame(teamId) {

        return upcomingGames.find(game =>
            Number(game.home_team_id) === Number(teamId) ||
            Number(game.away_team_id) === Number(teamId)
        );
    }

    // Render completed game results

    function renderResult(game, showPrediction = false) {

        const prediction = predictionsByGame.get(
            Number(game.game_id)
        );

        const homeWon =
            Number(game.winner_id) === Number(game.home_team_id);

        const correct =
            prediction &&
            Number(prediction.predicted_winner_id) ===
            Number(game.winner_id);

        return (
            <div className="home-result" key={game.game_id}>

                <div className="home-game-header">

                    <span>{formatDate(game)}</span>

                    <span className="home-badge home-final">
                        FINAL
                    </span>

                </div>

                <div className={
                    `home-score-row ${homeWon ? "home-winner" : ""}`
                }>

                    <span>{game.home_team}</span>

                    <strong>
                        {game.home_score ?? "—"}
                    </strong>

                </div>

                <div className={
                    `home-score-row ${!homeWon ? "home-winner" : ""}`
                }>

                    <span>{game.away_team}</span>

                    <strong>
                        {game.away_score ?? "—"}
                    </strong>

                </div>

                {showPrediction && prediction && (
                    <div className={
                        correct
                            ? "home-correct"
                            : "home-incorrect"
                    }>

                        {correct
                            ? "✓ Correct prediction"
                            : "✕ Incorrect prediction"}

                    </div>
                )}

            </div>
        );
    }

    return (
        <main className="home-dashboard">

            {/* Welcome section */}

            <section className="home-welcome">

                <p className="home-label">
                    BALL KNOWLEDGE PICKS
                </p>

                <h1>
                    {loading
                        ? "Welcome!"
                        : isGuest
                            ? "Welcome, Guest!"
                            : `Welcome, ${user.username}!`}
                </h1>

                <p className="home-description">

                    {isGuest
                        ? "Explore upcoming basketball games, view recent results and create an account to start making predictions."
                        : "Follow your favourite teams, predict game outcomes and compete with your friends."}

                </p>

                <div className="home-actions">

                    {/* Registered users only */}

                    {!isGuest && (
                        <Link
                            to="/Guesses"
                            className="home-primary-link"
                        >
                            Explore Games
                        </Link>
                    )}

                    {/* Guests only */}

                    {isGuest && (
                        <Link
                            to="/Register"
                            className="home-primary-link"
                        >
                            Create Account
                        </Link>
                    )}

                </div>

            </section>

            {/* User statistics - registered users only */}

            {!isGuest && (

                <div className="home-stats">

                    <div className="home-stat">

                        <span>TOTAL SCORE</span>

                        <h2>
                            {stats?.score ?? user.user_score ?? 0}
                        </h2>

                        <p>Points earned</p>

                    </div>

                    <div className="home-stat">

                        <span>GLOBAL RANK</span>

                        <h2>
                            {stats?.rank != null
                                ? `#${stats.rank}`
                                : "—"}
                        </h2>

                        <p>
                            {stats?.total_users != null
                                ? `Out of ${stats.total_users} users`
                                : "Leaderboard ranking"}
                        </p>

                    </div>

                    <div className="home-stat">

                        <span>FOLLOWED TEAMS</span>

                        <h2>{userTeams.length}</h2>

                        <p>Your favourite teams</p>

                    </div>

                </div>

            )}

            {/* Error handling */}

            {error && (

                <section className="home-error" role="alert">

                    <p>{error}</p>

                    <button onClick={loadDashboard}>
                        Try Again
                    </button>

                </section>

            )}

            {/* Loading state */}

            {loading ? (

                <section className="home-card">

                    <h2>Loading dashboard...</h2>

                    <p className="home-muted">
                        Retrieving information from the database.
                    </p>

                </section>

            ) : (

                <>

                    <div className="home-grid">

                        {/* Upcoming games - visible to everyone */}

                        <section className="home-card">

                            <div className="home-section-header">

                                <div>

                                    <h2>Upcoming Games</h2>

                                    <p className="home-muted">
                                        What's coming up next
                                    </p>

                                </div>

                                <span className="home-count">
                                    {upcomingGames.length}
                                </span>

                            </div>

                            <div className="home-game-list">

                                {upcomingGames.length === 0 && (

                                    <p className="home-empty">
                                        No upcoming games available.
                                    </p>

                                )}

                                {upcomingGames.slice(0, 5).map(game => (

                                    <div
                                        className="home-game"
                                        key={game.game_id}
                                    >

                                        <div className="home-game-header">

                                            <span>
                                                {formatDate(game)}
                                            </span>

                                            <span className="home-badge">
                                                UPCOMING
                                            </span>

                                        </div>

                                        <div className="home-matchup">

                                            <div className="home-matchup-team">

                                                <strong>
                                                    {game.home_team}
                                                </strong>

                                                <span>HOME</span>

                                            </div>

                                            <span className="home-versus">
                                                VS
                                            </span>

                                            <div className="home-matchup-team">

                                                <strong>
                                                    {game.away_team}
                                                </strong>

                                                <span>AWAY</span>

                                            </div>

                                        </div>

                                    </div>

                                ))}

                            </div>

                            {/* Registered users only */}

                            {!isGuest && (

                                <Link
                                    to="/Guesses"
                                    className="home-view-all"
                                >
                                    View all games →
                                </Link>

                            )}

                        </section>

                        {/* Recent results - visible to everyone */}

                        <section className="home-card">

                            <div className="home-section-header">

                                <div>

                                    <h2>Recent Results</h2>

                                    <p className="home-muted">
                                        Latest completed games
                                    </p>

                                </div>

                            </div>

                            <div className="home-game-list">

                                {recentResults.length === 0 && (

                                    <p className="home-empty">
                                        No completed games yet.
                                    </p>

                                )}

                                {recentResults.map(game =>
                                    renderResult(game)
                                )}

                            </div>

                            {/* Registered users only */}

                            {!isGuest && (

                                <Link
                                    to="/Guesses"
                                    className="home-view-all"
                                >
                                    View all results →
                                </Link>

                            )}

                        </section>

                    </div>

                    {/* Personal prediction history */}

                    {!isGuest && (

                        <section className="home-card home-full-section">

                            <div className="home-section-header">

                                <div>

                                    <h2>Your Recent Predictions</h2>

                                    <p className="home-muted">
                                        Your last five completed picks
                                    </p>

                                </div>

                            </div>

                            {recentPredictions.length === 0 && (

                                <p className="home-empty">
                                    No completed predictions yet.
                                </p>

                            )}

                            <div className="home-team-grid">

                                {recentPredictions.map(game =>
                                    renderResult(game, true)
                                )}

                            </div>

                            <Link
                                to="/stats"
                                className="home-view-all"
                            >
                                View statistics →
                            </Link>

                        </section>

                    )}

                    {/* Followed teams - registered users only */}

                    {!isGuest && (

                        <section className="home-card home-full-section">

                            <div className="home-section-header">

                                <div>

                                    <h2>Your Teams</h2>

                                    <p className="home-muted">
                                        Keep up with your favourite teams
                                    </p>

                                </div>

                            </div>

                            {userTeams.length === 0 && (

                                <p className="home-empty">
                                    You are not following any teams yet.
                                </p>

                            )}

                            <div className="home-team-grid">

                                {userTeams.map(team => {

                                    const nextGame = getNextGame(
                                        team.team_id
                                    );

                                    return (

                                        <div
                                            className="home-team"
                                            key={team.team_id}
                                        >

                                            <h3>{team.team_name}</h3>

                                            {nextGame ? (

                                                <>

                                                    <p>
                                                        Next game: vs{" "}
                                                        {
                                                            Number(nextGame.home_team_id) ===
                                                            Number(team.team_id)
                                                                ? nextGame.away_team
                                                                : nextGame.home_team
                                                        }
                                                    </p>

                                                    <p className="home-muted">
                                                        {formatDate(nextGame)}
                                                    </p>

                                                </>

                                            ) : (

                                                <p className="home-muted">
                                                    No upcoming games
                                                </p>

                                            )}

                                        </div>

                                    );
                                })}

                            </div>

                            <Link
                                to="/Teams"
                                className="home-view-all"
                            >
                                Explore teams →
                            </Link>

                        </section>

                    )}

                </>

            )}

        </main>
    );
}

export default Home;