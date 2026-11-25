import styles from "./ScoreSummary.module.css";

const ScoreSummary = ({ stats }) => {
  return (
    <div className={styles.bar}>
      <div className={styles.stat}>
        <span className={styles.label}>Your total score</span>
        <span className={styles.value}>
          {stats.score} <small>pts</small>
        </span>
      </div>

      {/* TODO: hard-coded for now */}
      <div className={styles.stat}>
        <span className={styles.label}>Global rank</span>
        <span className={`${styles.value} ${styles.accent}`}>
          {stats.rank} <small>of {stats.total_users}</small>
        </span>
      </div>

      <div className={styles.stat}>
        <span className={styles.label}>Accuracy</span>
        <span className={styles.value}>
          {stats.accuracy}%{" "}
          <small>
            {stats.correct} of {stats.graded}
          </small>
        </span>
      </div>

      {/* <div className={styles.stat}>
        <span className={styles.label}>This week</span>
        <span className={`${styles.value} ${styles.positive}`}>+20</span>
      </div> */}
    </div>
  );
};

export default ScoreSummary;
