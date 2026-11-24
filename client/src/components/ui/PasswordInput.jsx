import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./Input.module.css";

function PasswordInput({ id, label, value, onChange, helper, ...rest }) {
  const [show, setShow] = useState(false);

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.passwordWrap}>
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.input}
          {...rest}
        />
        <button
          type="button"
          className={styles.eyeButton}
          onClick={() => setShow(!show)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {helper && <p className={styles.helper}>{helper}</p>}
    </div>
  );
}

export default PasswordInput;
