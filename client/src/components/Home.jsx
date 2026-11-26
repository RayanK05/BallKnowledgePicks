import { useState } from "react";
import "./Home.css";

function Home() {
    const username = "Test User";
    const score = 240;
    const rank = 3;

    const upcomingGames = [
        { id: 1, home: "Lakers", away: "Celtics", date: "Nov 25" },
        { id: 2, home: "Raptors", away: "Knicks", date: "Nov 25" },
        { id: 3, home: "Warriors", away: "Bulls", date: "Nov 26" }
    ];

    const recentResults = [
        { id: 1, game: "Celtics vs Heat", score: "121 - 108", correct: true },
        { id: 2, game: "Lakers vs Suns", score: "102 - 114", correct: false },
        { id: 3, game: "Raptors vs Nets", score: "115 - 109", correct: true }
    ];

    const followedTeams = [
        { id: 1, name: "Toronto Raptors", nextGame: "vs Knicks" },
        { id: 2, name: "Los Angeles Lakers", nextGame: "vs Celtics" }
    ];

    const [picks, setPicks] = useState({});

    function makePick(gameId, team) {
        setPicks(previous => ({
            ...previous,
            [gameId]: team
        }));
    }

    return (
        <main className="home-dashboard">

            <section className="home-welcome">
                <p className="home-label">YOUR DASHBOARD</p>

                <h1>Welcome back, {username}!</h1>

                <p>Ready to make your next winning pick?</p>

                <div className="home-stats">
                    <div className="home-stat">
                        <span>Total Score</span>
                        <h2>{score}</h2>
                    </div>

                    <div className="home-stat">
                        <span>Global Rank</span>
                        <h2>#{rank}</h2>
                    </div>
                </div>
            </section>

            <div className="home-grid">

                <section className="home-card">
                    <h2>Make Your Picks</h2>
                    <p className="home-muted">Upcoming games</p>

                    {upcomingGames.map(game => (
                        <div className="home-game" key={game.id}>
                            <p className="home-muted">{game.date}</p>

                            <div className="home-matchup">
                                <button
                                    className={picks[game.id] === game.home ? "home-selected" : ""}
                                    onClick={() => makePick(game.id, game.home)}
                                >
                                    {game.home}
                                </button>

                                <span>VS</span>

                                <button
                                    className={picks[game.id] === game.away ? "home-selected" : ""}
                                    onClick={() => makePick(game.id, game.away)}
                                >
                                    {game.away}
                                </button>
                            </div>

                            {picks[game.id] && (
                                <p className="home-pick-confirmation">
                                    Your pick: {picks[game.id]}
                                </p>
                            )}
                        </div>
                    ))}
                </section>

                <section className="home-card">
                    <h2>Your Recent Results</h2>

                    {recentResults.map(result => (
                        <div className="home-result" key={result.id}>
                            <p>{result.game}</p>
                            <h3>{result.score}</h3>

                            <span className={result.correct ? "home-correct" : "home-incorrect"}>
                                {result.correct
                                    ? "✓ Correct prediction"
                                    : "✕ Incorrect prediction"}
                            </span>
                        </div>
                    ))}
                </section>

            </div>

            <section className="home-card home-teams">
                <h2>Your Teams</h2>

                <div className="home-team-grid">
                    {followedTeams.map(team => (
                        <div className="home-team" key={team.id}>
                            <h3>{team.name}</h3>
                            <p>Next game: {team.nextGame}</p>
                        </div>
                    ))}
                </div>
            </section>

        </main>
    );
}

export default Home;