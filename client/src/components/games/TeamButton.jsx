import { Check } from "lucide-react";
import styles from "./TeamButton.module.css";

const TeamButton = ({ name, side, picked, onClick, disabled }) => {
  return (
    <button
      className={`${styles.team} ${picked ? styles.picked : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={styles.name}>{name}</span>
      <span className={styles.side}>
        {picked ? (
          <>
            <Check size={14} /> Your pick
          </>
        ) : (
          side
        )}
      </span>
    </button>
  );
};

export default TeamButton;
