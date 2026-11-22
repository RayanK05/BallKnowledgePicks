import React from "react";
import { useState } from "react";
import TextInput from "./ui/TextInput.jsx";
import PasswordInput from "./ui/PasswordInput.jsx";
import styles from "./Login.module.css";

const Register = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email || !password) {
      setMessage("Please enter your email and password");
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (data.ok) {
      setMessage(`You have registered, ${data.user.username} with email ${data.user.email}!`);
    } else {
      setMessage(data.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <TextInput
        id="username"
        label="Username"
        value={username}
        onChange={setUsername}
        placeholder="e.g. JohnDoe1"
        autoComplette="username"
      />

      <TextInput
        id="email"
        label="Email Address"
        value={email}
        onChange={setEmail}
        placeholder="e.g. John.Doe@mail.com"
        autoComplette="email"
      />

      <PasswordInput
        id="password"
        label="Password "
        value={password}
        onChange={setPassword}
        placeholder="Enter password"
      />

      <button type="submit" className={styles.submit}>
        Register
      </button>

      <p>{message}</p>
    </form>
  );
};

export default Register;
