// import styles from "./FilterBar.module.css";

// TODO: hard-coded for now, later load from /api/teams

const FilterBar = ({
  status,
  onStatusChange,
  from,
  onFromChange,
  to,
  onToChange,
  teams,
  team,
  onTeamChange,
}) => {
  return (
    <div>
      {/* Team */}
      <label>
        Team
        <select value={team} onChange={(e) => onTeamChange(e.target.value)}>
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.team_id} value={t.team_id}>
              {t.team_name}
            </option>
          ))}
        </select>
      </label>

      {/* Dates */}
      <label>
        From
        <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} />
      </label>

      <label>
        To
        <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} />
      </label>

      {/* Status */}
      <label>
        Status
        <select value={status} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="all">All</option>
          <option value="upcoming">Upcoming</option>
          <option value="live">Live</option>
          <option value="final">Final</option>
        </select>
      </label>
    </div>
  );
};

export default FilterBar;
