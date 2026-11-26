import styles from "./FilterBar.module.css";

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
  pickFilter,
  onPickFilterChange,
}) => {
  return (
    <div className={styles.bar}>
      {/* Team */}
      <label className={`${styles.field} ${styles.wide}`}>
        <span className={styles.label}>Team</span>
        <select
          className={styles.control}
          value={team}
          onChange={(e) => onTeamChange(e.target.value)}
        >
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.team_id} value={t.team_id}>
              {t.team_name}
            </option>
          ))}
        </select>
      </label>

      {/* Dates */}
      <label className={styles.field}>
        <span className={styles.label}>From</span>
        <input
          className={styles.control}
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>To</span>
        <input
          className={styles.control}
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
        />
      </label>

      {/* Status */}
      <label className={styles.field}>
        <span className={styles.label}>Status</span>
        <select
          className={styles.control}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="all">All</option>
          <option value="upcoming">Upcoming</option>
          <option value="live">Live</option>
          <option value="final">Final</option>
        </select>
      </label>

      {/* My picks */}
      <label className={styles.field}>
        <span className={styles.label}>My picks</span>
        <select
          className={styles.control}
          value={pickFilter}
          onChange={(e) => onPickFilterChange(e.target.value)}
        >
          <option value="all">All</option>
          <option value="picked">Picked</option>
          <option value="unpicked">Not picked</option>
        </select>
      </label>
    </div>
  );
};

export default FilterBar;
