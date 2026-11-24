import { useState } from "react";
import TextInput from "./ui/TextInput.jsx";
import PasswordInput from "./ui/PasswordInput.jsx";
import styles from "./login.module.css";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    if (!username || !email || !password) {
      setMessage("Please fill in all fields");
      return;
    }
    if (username.length > 30) {
      setMessage("Username must be 30 characters or less");
      return;
    }
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters");
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (data.ok) {
      setMessage(`Account created for ${data.user.username}! You can log in now.`);
    } else {
      setMessage(data.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <TextInput
        id="reg-username"
        label="Username"
        value={username}
        onChange={setUsername}
        placeholder="e.g. buckets_23"
        autoComplete="username"
        helper="Up to 30 characters"
      />

      <TextInput
        id="reg-email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@school.edu"
        autoComplete="email"
      />

      <PasswordInput
        id="reg-password"
        label="Password"
        value={password}
        onChange={setPassword}
        placeholder="Create a password"
        autoComplete="new-password"
        helper="At least 8 characters"
      />

      <button type="submit" className={styles.submit}>
        Create account
      </button>

      {message && <p className="error">{message}</p>}
    </form>
  );
};

export default Register;
