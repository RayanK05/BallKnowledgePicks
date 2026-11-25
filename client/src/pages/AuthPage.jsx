import { useState } from "react";
import { Clock, Trophy, Bell } from "lucide-react";
import Login from "../components/login.jsx";
import Register from "../components/register.jsx";
import styles from "./AuthPage.module.css";
import Logo from "../assets/logo2.svg";

const features = [
  { icon: Clock, text: "Make your picks before tip-off" },
  { icon: Trophy, text: "Climb the leaderboard with your friends" },
  { icon: Bell, text: "Never miss a game from your teams" },
];

const AuthPage = () => {
  const [tab, setTab] = useState("login");

  return (
    <div className={styles.page}>
      <div className={styles.brand}>
        {/* <svg
          className={styles.court}
          viewBox="0 0 600 760"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <line x1="0" y1="90" x2="600" y2="90" />
          <circle cx="300" cy="90" r="90" />
          <circle cx="300" cy="90" r="32" />
          <path d="M 40 760 L 40 600 A 260 260 0 0 1 560 600 L 560 760" />
          <rect x="190" y="500" width="220" height="260" />
          <circle cx="300" cy="500" r="90" />
          <line x1="270" y1="725" x2="330" y2="725" />
          <circle cx="300" cy="705" r="14" />
        </svg> */}

        {/* left side: app name, tagline, features */}
        <h1 className={styles.title}>
          Ball Knowledge
          <span className={styles.titleAccent}>Picks</span>
        </h1>

        <h2 className={styles.tagline}>Call every game before tip-off</h2>
        <p className={styles.description}>Features icnlude:</p>

        <ul className={styles.features}>
          {features.map(({ icon: Icon, text }) => (
            <li key={text} className={styles.feature}>
              <span className={styles.featureIcon}>
                <Icon size={18} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.formSide}>
        <div className={styles.formCard}>
          {/* tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === "login" ? styles.activeTab : ""}`}
              onClick={() => setTab("login")}
            >
              Log in
            </button>
            <button
              className={`${styles.tab} ${tab === "register" ? styles.activeTab : ""}`}
              onClick={() => setTab("register")}
            >
              Sign up
            </button>
          </div>

          {/* heading changes with the tab */}
          <h2 className={styles.formTitle}>
            {tab === "login" ? "Welcome back" : "Join the league"}
          </h2>
          <p className={styles.formSubtitle}>
            {tab === "login"
              ? "Log in to make your picks."
              : "Create an account to start making picks."}
          </p>

          {/* only one form shows at a time */}
          {tab === "login" ? <Login /> : <Register />}

          {/* divider + guest */}
          <div className={styles.divider}>or</div>
          <a href="/" className={styles.guestLink}>
            Continue as guest →
          </a>
          <p className={styles.guestHint}>Guests can view games but can't make picks.</p>
          <img src={Logo} className={styles.logo} alt="Description" />

        </div>
        
      </div>
    </div>
  );
};

export default AuthPage;
