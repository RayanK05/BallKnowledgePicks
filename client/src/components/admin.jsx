import { useState } from "react";
import "./Admin.css";

function Admin() {
    const [teams, setTeams] = useState([
        { id: 1, name: "Toronto Raptors" },
        { id: 2, name: "Boston Celtics" },
        { id: 3, name: "Los Angeles Lakers" },
        { id: 4, name: "New York Knicks" }
    ]);

    const [games, setGames] = useState([
        {
            id: 1,
            home: "Toronto Raptors",
            away: "Boston Celtics",
            date: "2026-11-25",
            homeScore: 108,
            awayScore: 121,
            status: "Final"
        },
        {
            id: 2,
            home: "Los Angeles Lakers",
            away: "New York Knicks",
            date: "2026-11-26",
            homeScore: "",
            awayScore: "",
            status: "Upcoming"
        }
    ]);

    const [search, setSearch] = useState("");
    const [teamSearch, setTeamSearch] = useState("");
    const [teamName, setTeamName] = useState("");
    const [editingTeam, setEditingTeam] = useState(null);
    const [editingGame, setEditingGame] = useState(null);
    const [showGameForm, setShowGameForm] = useState(false);

    const emptyGame = {
        home: "",
        away: "",
        date: "",
        homeScore: "",
        awayScore: "",
        status: "Upcoming"
    };

    const [gameForm, setGameForm] = useState(emptyGame);

    function saveTeam(e) {
        e.preventDefault();

        if (!teamName.trim()) return;

        if (teams.some(team =>
            team.name.toLowerCase() === teamName.trim().toLowerCase()
            && team.id !== editingTeam
        )) {
            alert("This team already exists.");
            return;
        }

        if (editingTeam !== null) {
            const oldName = teams.find(
                team => team.id === editingTeam
            ).name;

            setTeams(previous => previous.map(team =>
                team.id === editingTeam
                    ? { ...team, name: teamName.trim() }
                    : team
            ));

            setGames(previous => previous.map(game => ({
                ...game,
                home: game.home === oldName
                    ? teamName.trim() : game.home,
                away: game.away === oldName
                    ? teamName.trim() : game.away
            })));
        } else {
            setTeams(previous => [
                ...previous,
                { id: Date.now(), name: teamName.trim() }
            ]);
        }

        setTeamName("");
        setEditingTeam(null);
    }

    function deleteTeam(team) {
        if (games.some(game =>
            game.home === team.name || game.away === team.name
        )) {
            alert("Cannot delete a team associated with a game.");
            return;
        }

        if (window.confirm("Delete this team?")) {
            setTeams(previous =>
                previous.filter(t => t.id !== team.id)
            );
        }
    }

    function saveGame(e) {
        e.preventDefault();

        if (gameForm.home === gameForm.away) {
            alert("Select two different teams.");
            return;
        }

        if (gameForm.status === "Final" &&
            (gameForm.homeScore === "" ||
             gameForm.awayScore === "" ||
             Number(gameForm.homeScore) === Number(gameForm.awayScore))) {
            alert("Enter valid final scores with a winning team.");
            return;
        }

        const savedGame = {
            ...gameForm,
            homeScore: gameForm.status === "Final"
                ? Number(gameForm.homeScore) : "",
            awayScore: gameForm.status === "Final"
                ? Number(gameForm.awayScore) : ""
        };

        if (editingGame !== null) {
            setGames(previous => previous.map(game =>
                game.id === editingGame
                    ? { ...savedGame, id: editingGame }
                    : game
            ));
        } else {
            setGames(previous => [
                ...previous,
                { ...savedGame, id: Date.now() }
            ]);
        }

        setGameForm(emptyGame);
        setEditingGame(null);
        setShowGameForm(false);
    }

    function editGame(game) {
        setGameForm({ ...game });
        setEditingGame(game.id);
        setShowGameForm(true);
    }

    function deleteGame(id) {
        if (window.confirm("Delete this game?")) {
            setGames(previous =>
                previous.filter(game => game.id !== id)
            );
        }
    }

    function updateGameForm(e) {
        setGameForm(previous => ({
            ...previous,
            [e.target.name]: e.target.value
        }));
    }

    const filteredGames = games.filter(game =>
        `${game.home} ${game.away} ${game.date} ${game.status}`
            .toLowerCase()
            .includes(search.toLowerCase())
    );

    const filteredTeams = teams.filter(team =>
        team.name.toLowerCase().includes(teamSearch.toLowerCase())
    );

    return (
        <main className="admin-dashboard">

            <header className="admin-header">
                <p className="admin-label">ADMINISTRATION</p>
                <h1>Admin Dashboard</h1>
                <p>Manage teams, games and application data.</p>
            </header>

            <div className="admin-stats">
                <div className="admin-card">
                    <span>Total Teams</span>
                    <h2>{teams.length}</h2>
                </div>

                <div className="admin-card">
                    <span>Total Games</span>
                    <h2>{games.length}</h2>
                </div>

                <div className="admin-card">
                    <span>Completed Games</span>
                    <h2>
                        {games.filter(g => g.status === "Final").length}
                    </h2>
                </div>
            </div>

            <section className="admin-card">
                <div className="admin-section-header">
                    <div>
                        <h2>API Synchronization</h2>
                        <p>Import NBA data from balldontlie.</p>
                    </div>

                    <button className="admin-primary" disabled>
                        Sync Data
                    </button>
                </div>

                <div className="admin-sync-info">
                    <span>Teams added: 0</span>
                    <span>Games added: 0</span>
                    <span>Last sync: Never</span>
                </div>

                <p className="admin-muted">
                    API synchronization is not connected yet.
                </p>
            </section>

            <section className="admin-card">

                <div className="admin-section-header">
                    <h2>Games Manager</h2>

                    <button
                        className="admin-primary"
                        onClick={() => {
                            setGameForm(emptyGame);
                            setEditingGame(null);
                            setShowGameForm(true);
                        }}
                    >
                        + Add Game
                    </button>
                </div>

                {showGameForm && (
                    <form className="admin-form" onSubmit={saveGame}>

                        <h3>
                            {editingGame !== null
                                ? "Edit Game" : "Add Game"}
                        </h3>

                        <label>Home Team</label>
                        <select
                            name="home"
                            value={gameForm.home}
                            onChange={updateGameForm}
                            required
                        >
                            <option value="">Select home team</option>
                            {teams.map(team => (
                                <option key={team.id} value={team.name}>
                                    {team.name}
                                </option>
                            ))}
                        </select>

                        <label>Away Team</label>
                        <select
                            name="away"
                            value={gameForm.away}
                            onChange={updateGameForm}
                            required
                        >
                            <option value="">Select away team</option>
                            {teams.map(team => (
                                <option key={team.id} value={team.name}>
                                    {team.name}
                                </option>
                            ))}
                        </select>

                        <label>Game Date</label>
                        <input
                            type="date"
                            name="date"
                            value={gameForm.date}
                            onChange={updateGameForm}
                            required
                        />

                        <label>Status</label>
                        <select
                            name="status"
                            value={gameForm.status}
                            onChange={updateGameForm}
                        >
                            <option>Upcoming</option>
                            <option>Final</option>
                        </select>

                        {gameForm.status === "Final" && (
                            <>
                                <label>Home Score</label>
                                <input
                                    type="number"
                                    min="0"
                                    name="homeScore"
                                    value={gameForm.homeScore}
                                    onChange={updateGameForm}
                                    required
                                />

                                <label>Away Score</label>
                                <input
                                    type="number"
                                    min="0"
                                    name="awayScore"
                                    value={gameForm.awayScore}
                                    onChange={updateGameForm}
                                    required
                                />
                            </>
                        )}

                        <div className="admin-actions">
                            <button className="admin-primary" type="submit">
                                Save Game
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowGameForm(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                <input
                    className="admin-search"
                    placeholder="Search games..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Matchup</th>
                                <th>Date</th>
                                <th>Score</th>
                                <th>Status</th>
                                <th>Winner</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredGames.map(game => (
                                <tr key={game.id}>
                                    <td>{game.home} vs {game.away}</td>
                                    <td>{game.date}</td>

                                    <td>
                                        {game.status === "Final"
                                            ? `${game.homeScore} - ${game.awayScore}`
                                            : "—"}
                                    </td>

                                    <td>
                                        <span className={
                                            game.status === "Final"
                                                ? "admin-final"
                                                : "admin-upcoming"
                                        }>
                                            {game.status}
                                        </span>
                                    </td>

                                    <td>
                                        {game.status === "Final"
                                            ? Number(game.homeScore) > Number(game.awayScore)
                                                ? game.home
                                                : game.away
                                            : "—"}
                                    </td>

                                    <td>
                                        <div className="admin-actions">
                                            <button onClick={() => editGame(game)}>
                                                Edit
                                            </button>

                                            <button
                                                className="admin-delete"
                                                onClick={() => deleteGame(game.id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredGames.length === 0 && (
                        <p className="admin-muted">No games found.</p>
                    )}
                </div>
            </section>

            <section className="admin-card">
                <h2>Teams Manager</h2>

                <form className="admin-team-form" onSubmit={saveTeam}>
                    <input
                        placeholder="Enter team name"
                        value={teamName}
                        onChange={e => setTeamName(e.target.value)}
                        required
                    />

                    <button className="admin-primary" type="submit">
                        {editingTeam !== null ? "Save Team" : "+ Add Team"}
                    </button>

                    {editingTeam !== null && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingTeam(null);
                                setTeamName("");
                            }}
                        >
                            Cancel
                        </button>
                    )}
                </form>

                <input
                    className="admin-search"
                    placeholder="Search teams..."
                    value={teamSearch}
                    onChange={e => setTeamSearch(e.target.value)}
                />

                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Team Name</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredTeams.map(team => (
                                <tr key={team.id}>
                                    <td>{team.id}</td>
                                    <td>{team.name}</td>
                                    <td>
                                        <div className="admin-actions">
                                            <button onClick={() => {
                                                setEditingTeam(team.id);
                                                setTeamName(team.name);
                                            }}>
                                                Edit
                                            </button>

                                            <button
                                                className="admin-delete"
                                                onClick={() => deleteTeam(team)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredTeams.length === 0 && (
                        <p className="admin-muted">No teams found.</p>
                    )}
                </div>
            </section>

        </main>
    );
}

export default Admin;