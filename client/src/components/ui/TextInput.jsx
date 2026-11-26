import styles from "./Input.module.css";

function TextInput({ id, label, type = "text", value, onChange, helper, ...rest }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.input}
        {...rest}
      />
      {helper && <p className={styles.helper}>{helper}</p>}
    </div>
  );
}

export default TextInput;
