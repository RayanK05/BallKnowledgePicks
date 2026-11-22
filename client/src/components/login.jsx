import { useState } from "react";
import TextInput from "./ui/TextInput.jsx";
import PasswordInput from "./ui/PasswordInput.jsx";
import styles from "./Login.module.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email || !password) {
      setMessage("Please enter your email and password");
      return;
    }

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.ok) {
      setMessage(`Welcome, ${data.user.username}!`);
    } else {
      setMessage(data.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <TextInput
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@school.edu"
        autoComplete="email"
      />

      <PasswordInput
        id="password"
        label="Password"
        value={password}
        onChange={setPassword}
        placeholder="Enter your password"
        autoComplete="current-password"
      />

      <button type="submit" className={styles.submit}>
        Log in
      </button>

      {message && <p>{message}</p>}
    </form>
  );
}

export default Login;
