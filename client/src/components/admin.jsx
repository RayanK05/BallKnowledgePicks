import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import "./admin.css";

const emptyGame = {
    home_team_id: "",
    away_team_id: "",
    game_date: "",
    tipoff: "",
    home_score: "",
    away_score: ""
};

function Admin() {
    const [teams, setTeams] = useState([]);
    const [games, setGames] = useState([]);
    const [summary, setSummary] = useState({});

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [allowed, setAllowed] = useState(false);

    const [teamName, setTeamName] = useState("");
    const [editingTeam, setEditingTeam] = useState(null);

    const [gameForm, setGameForm] = useState(null);
    const [editingGame, setEditingGame] = useState(null);

    const [gameSearch, setGameSearch] = useState("");
    const [teamSearch, setTeamSearch] = useState("");

    const [syncResult, setSyncResult] = useState(null);

    const [roleUsername, setRoleUsername] = useState("");
    const [selectedRole, setSelectedRole] = useState("user");

    // ================================
    // BACKEND REQUESTS
    // ================================

    async function request(url, options) {
        const result = await apiFetch(url, options);

        if (!result.ok) {
            throw new Error(result.error || "Request failed");
        }

        return result;
    }

    async function loadDashboard() {
        const summaryData = await request("/api/admin/summary");

        setAllowed(true);

        const [teamsData, gamesData] = await Promise.all([
            request("/api/admin/teams"),
            request("/api/admin/games")
        ]);

        setTeams(teamsData.teams ?? []);
        setGames(gamesData.games ?? []);
        setSummary(summaryData.summary ?? {});
    }

    useEffect(() => {
        loadDashboard()
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    async function performAction(callback) {
        setBusy(true);
        setError("");
        setMessage("");

        try {
            await callback();

            setMessage("Changes saved to database.");

            await loadDashboard();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    function writeRequest(url, method, body) {
        return request(url, {
            method,
            ...(body ? {
                body: JSON.stringify(body)
            } : {})
        });
    }

    // ================================
    // USER ROLE MANAGEMENT
    // ================================

    async function saveRole(e) {
        e.preventDefault();

        const username = roleUsername.trim();

        if (!username) {
            setError("Enter a username.");
            return;
        }

        if (!window.confirm(
            `Change ${username}'s role to ${selectedRole}?`
        )) {
            return;
        }

        setBusy(true);
        setError("");
        setMessage("");

        try {
            const result = await writeRequest(
                "/api/admin/users/role",
                "PATCH",
                {
                    username,
                    role: selectedRole
                }
            );

            setMessage(result.message);
            setRoleUsername("");
            setSelectedRole("user");

            // Redirect if the current admin demotes themselves.
            if (result.self_demoted) {
                window.location.href = "/";
                return;
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    // ================================
    // TEAM FUNCTIONS
    // ================================

    function saveTeam(e) {
        e.preventDefault();

        performAction(async () => {
            const url = editingTeam
                ? `/api/admin/teams/${editingTeam}`
                : "/api/admin/teams";

            await writeRequest(
                url,
                editingTeam ? "PUT" : "POST",
                { team_name: teamName }
            );

            setTeamName("");
            setEditingTeam(null);
        });
    }

    function editTeam(team) {
        setEditingTeam(team.team_id);
        setTeamName(team.team_name);
    }

    function deleteTeam(teamId) {
        if (!window.confirm("Delete this team?")) {
            return;
        }

        performAction(() =>
            writeRequest(
                `/api/admin/teams/${teamId}`,
                "DELETE"
            )
        );
    }

    // ================================
    // GAME FUNCTIONS
    // ================================

    function saveGame(e) {
        e.preventDefault();

        performAction(async () => {
            const url = editingGame
                ? `/api/admin/games/${editingGame}`
                : "/api/admin/games";

            await writeRequest(
                url,
                editingGame ? "PUT" : "POST",
                {
                    ...gameForm,
                    tipoff: gameForm.tipoff
                        ? new Date(gameForm.tipoff).toISOString()
                        : null
                }
            );

            setGameForm(null);
            setEditingGame(null);
        });
    }

    function editGame(game) {
        setEditingGame(game.game_id);

        let tipoff = "";

        if (game.tipoff) {
            const date = new Date(game.tipoff);

            tipoff = new Date(
                date.getTime() -
                date.getTimezoneOffset() * 60000
            ).toISOString().slice(0, 16);
        }

        setGameForm({
            ...game,
            game_date: String(game.game_date).slice(0, 10),
            tipoff,
            home_score: game.home_score ?? "",
            away_score: game.away_score ?? ""
        });
    }

    function deleteGame(gameId) {
        if (!window.confirm(
            "Delete this game and its associated predictions? User scores will be recalculated."
        )) {
            return;
        }

        performAction(() =>
            writeRequest(
                `/api/admin/games/${gameId}`,
                "DELETE"
            )
        );
    }

    function updateGameForm(field, value) {
        setGameForm(previous => ({
            ...previous,
            [field]: value
        }));
    }

    // ================================
    // MATTHEW'S API SYNCHRONIZATION
    // ================================

    async function synchronizeData() {
        setBusy(true);
        setError("");
        setMessage("");

        try {
            // Calls the existing shared backend endpoint.
            // Matthew's runSeedGames() handles synchronization.

            const result = await writeRequest(
                "/api/sync",
                "POST"
            );

            setSyncResult({
                message: result.message || "Sync started",
                started_at: new Date().toISOString()
            });

            setMessage(
                "Synchronization started. This may take a few minutes."
            );

        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    // Refresh records after background synchronization.

    async function refreshData() {
        setBusy(true);
        setError("");
        setMessage("");

        try {
            await loadDashboard();

            setMessage("Database records refreshed.");

        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    // ================================
    // SEARCH AND FILTERING
    // ================================

    const filteredGames = games.filter(game =>
        `${game.home_team} ${game.away_team} ${game.game_date}`
            .toLowerCase()
            .includes(gameSearch.toLowerCase())
    );

    const filteredTeams = teams.filter(team =>
        team.team_name
            .toLowerCase()
            .includes(teamSearch.toLowerCase())
    );

    // ================================
    // LOADING AND ACCESS CONTROL
    // ================================

    if (loading) {
        return (
            <main className="admin-dashboard">
                <h1>Loading administration...</h1>
            </main>
        );
    }

    if (!allowed) {
        return (
            <main className="admin-dashboard">
                <h1>Admin access required</h1>
                <p role="alert">{error}</p>
            </main>
        );
    }

    return (
        <main className="admin-dashboard">

            {/* Dashboard header */}

            <header className="admin-header">
                <p className="admin-label">
                    ADMINISTRATION
                </p>

                <h1>Admin Dashboard</h1>

                <p>
                    Manage teams, games and live database records.
                </p>
            </header>

            {/* Error and success messages */}

            {error && (
                <p className="admin-error" role="alert">
                    {error}
                </p>
            )}

            {message && (
                <p className="admin-success" role="status">
                    {message}
                </p>
            )}

            {/* Dashboard statistics */}

            <div className="admin-stats">

                <div className="admin-card">
                    <span>Total Users</span>
                    <h2>{summary.users ?? "—"}</h2>
                </div>

                <div className="admin-card">
                    <span>Total Teams</span>
                    <h2>{summary.teams ?? "—"}</h2>
                </div>

                <div className="admin-card">
                    <span>Total Games</span>
                    <h2>{summary.games ?? "—"}</h2>
                </div>

                <div className="admin-card">
                    <span>Completed Games</span>
                    <h2>{summary.completed ?? "—"}</h2>
                </div>

            </div>

            {/* API Synchronization */}

            <section className="admin-card">

                <div className="admin-section-header">

                    <div>
                        <h2>API Synchronization</h2>

                        <p>
                            Synchronize NBA teams and games
                            with the basketball API.
                        </p>
                    </div>

                    <div className="admin-actions">

                        <button
                            className="admin-primary"
                            disabled={busy}
                            onClick={synchronizeData}
                        >
                            Sync Data
                        </button>

                        <button
                            disabled={busy}
                            onClick={refreshData}
                        >
                            Refresh Data
                        </button>

                    </div>

                </div>

                <div className="admin-sync-info">

                    <span>
                        Status: {
                            syncResult
                                ? syncResult.message
                                : "No sync requested this session"
                        }
                    </span>

                    <span>
                        Last sync requested: {
                            syncResult
                                ? new Date(
                                    syncResult.started_at
                                ).toLocaleString()
                                : "Not yet requested"
                        }
                    </span>

                </div>

                <p className="admin-muted">
                    Synchronization runs in the background.
                    Wait a few minutes, then click Refresh Data
                    to retrieve updated database records.
                </p>

                {busy && (
                    <p className="admin-muted">
                        Request in progress...
                    </p>
                )}

            </section>

            {/* Edit Role */}

            <section className="admin-card">

                <h2>Edit Role</h2>

                <p className="admin-muted">
                    Promote or demote a user by entering their
                    username. At least one administrator must
                    remain in the system.
                </p>

                <form
                    className="admin-form"
                    onSubmit={saveRole}
                >

                    <label htmlFor="role-username">
                        Username
                    </label>

                    <input
                        id="role-username"
                        required
                        maxLength={30}
                        placeholder="Enter username"
                        value={roleUsername}
                        onChange={e =>
                            setRoleUsername(e.target.value)
                        }
                    />

                    <label htmlFor="selected-role">
                        Role
                    </label>

                    <select
                        id="selected-role"
                        value={selectedRole}
                        onChange={e =>
                            setSelectedRole(e.target.value)
                        }
                    >

                        <option value="user">
                            User
                        </option>

                        <option value="admin">
                            Admin
                        </option>

                    </select>

                    <div className="admin-actions">

                        <button
                            type="submit"
                            className="admin-primary"
                            disabled={
                                busy || !roleUsername.trim()
                            }
                        >
                            Update Role
                        </button>

                    </div>

                </form>

            </section>

            {/* Games Manager */}

            <section className="admin-card">

                <div className="admin-section-header">

                    <h2>Games Manager</h2>

                    <button
                        className="admin-primary"
                        disabled={busy}
                        onClick={() => {
                            setEditingGame(null);

                            setGameForm({
                                ...emptyGame
                            });
                        }}
                    >
                        + Add Game
                    </button>

                </div>

                {gameForm && (

                    <form
                        className="admin-form"
                        onSubmit={saveGame}
                    >

                        <h3>
                            {editingGame
                                ? "Edit Game"
                                : "Add Game"}
                        </h3>

                        <label>Home Team</label>

                        <select
                            required
                            value={gameForm.home_team_id}
                            onChange={e =>
                                updateGameForm(
                                    "home_team_id",
                                    e.target.value
                                )
                            }
                        >

                            <option value="">
                                Select home team
                            </option>

                            {teams.map(team => (
                                <option
                                    key={team.team_id}
                                    value={team.team_id}
                                >
                                    {team.team_name}
                                </option>
                            ))}

                        </select>

                        <label>Away Team</label>

                        <select
                            required
                            value={gameForm.away_team_id}
                            onChange={e =>
                                updateGameForm(
                                    "away_team_id",
                                    e.target.value
                                )
                            }
                        >

                            <option value="">
                                Select away team
                            </option>

                            {teams.map(team => (
                                <option
                                    key={team.team_id}
                                    value={team.team_id}
                                >
                                    {team.team_name}
                                </option>
                            ))}

                        </select>

                        <label>Game Date</label>

                        <input
                            required
                            type="date"
                            value={gameForm.game_date}
                            onChange={e =>
                                updateGameForm(
                                    "game_date",
                                    e.target.value
                                )
                            }
                        />

                        <label>Tipoff Time</label>

                        <input
                            type="datetime-local"
                            value={gameForm.tipoff}
                            onChange={e =>
                                updateGameForm(
                                    "tipoff",
                                    e.target.value
                                )
                            }
                        />

                        <label>
                            Home Score
                            (leave blank if unfinished)
                        </label>

                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={gameForm.home_score}
                            onChange={e =>
                                updateGameForm(
                                    "home_score",
                                    e.target.value
                                )
                            }
                        />

                        <label>
                            Away Score
                            (leave blank if unfinished)
                        </label>

                        <input
                            type="number"
                            min="0"
                            step="1"
                            value={gameForm.away_score}
                            onChange={e =>
                                updateGameForm(
                                    "away_score",
                                    e.target.value
                                )
                            }
                        />

                        <div className="admin-actions">

                            <button
                                type="submit"
                                className="admin-primary"
                                disabled={busy}
                            >
                                Save Game
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setGameForm(null);
                                    setEditingGame(null);
                                }}
                            >
                                Cancel
                            </button>

                        </div>

                    </form>

                )}

                <input
                    className="admin-search"
                    placeholder="Search games..."
                    value={gameSearch}
                    onChange={e =>
                        setGameSearch(e.target.value)
                    }
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

                                <tr key={game.game_id}>

                                    <td>
                                        {game.home_team}
                                        {" vs "}
                                        {game.away_team}
                                    </td>

                                    <td>
                                        {String(
                                            game.game_date
                                        ).slice(0, 10)}
                                    </td>

                                    <td>
                                        {game.home_score ?? "—"}
                                        {" - "}
                                        {game.away_score ?? "—"}
                                    </td>

                                    <td>

                                        <span className={
                                            game.winner_id != null
                                                ? "admin-final"
                                                : "admin-upcoming"
                                        }>
                                            {game.winner_id != null
                                                ? "Final"
                                                : "Unfinished"}
                                        </span>

                                    </td>

                                    <td>
                                        {game.winner_id == null
                                            ? "—"
                                            : Number(game.winner_id) ===
                                              Number(game.home_team_id)
                                                ? game.home_team
                                                : game.away_team}
                                    </td>

                                    <td>

                                        <div className="admin-actions">

                                            <button
                                                disabled={busy}
                                                onClick={() =>
                                                    editGame(game)
                                                }
                                            >
                                                Edit
                                            </button>

                                            <button
                                                disabled={busy}
                                                className="admin-delete"
                                                onClick={() =>
                                                    deleteGame(
                                                        game.game_id
                                                    )
                                                }
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
                        <p className="admin-muted">
                            No games found.
                        </p>
                    )}

                </div>

            </section>

            {/* Teams Manager */}

            <section className="admin-card">

                <h2>Teams Manager</h2>

                <form
                    className="admin-team-form"
                    onSubmit={saveTeam}
                >

                    <input
                        required
                        maxLength={60}
                        placeholder="Enter team name"
                        value={teamName}
                        onChange={e =>
                            setTeamName(e.target.value)
                        }
                    />

                    <button
                        type="submit"
                        className="admin-primary"
                        disabled={busy}
                    >
                        {editingTeam
                            ? "Save Team"
                            : "+ Add Team"}
                    </button>

                    {editingTeam && (

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
                    onChange={e =>
                        setTeamSearch(e.target.value)
                    }
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

                                <tr key={team.team_id}>

                                    <td>{team.team_id}</td>

                                    <td>{team.team_name}</td>

                                    <td>

                                        <div className="admin-actions">

                                            <button
                                                disabled={busy}
                                                onClick={() =>
                                                    editTeam(team)
                                                }
                                            >
                                                Edit
                                            </button>

                                            <button
                                                disabled={busy}
                                                className="admin-delete"
                                                onClick={() =>
                                                    deleteTeam(
                                                        team.team_id
                                                    )
                                                }
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
                        <p className="admin-muted">
                            No teams found.
                        </p>
                    )}

                </div>

            </section>

        </main>
    );
}

export default Admin;