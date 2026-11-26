import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import Teams from "./components/Teams";
import Home from "./components/Home";
import Groups from "./components/Groups";
import Admin from "./components/admin";
import Notifications from "./components/Notifications";

import Register from "./components/register";
import AuthPage from "./pages/AuthPage";
import StatsPage from "./pages/StatsPage";
import Guesses from "./pages/Guesses";

import ProtectedRoute from "./ProtectedRoute";
import { apiFetch } from "./api";

import "./App.css";

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem("token");

  const [user, setUser] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [authChecked, setAuthChecked] = useState(false);

  const isGuest = !user || user.role === "guest";

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      if (!token) {
        setUser(null);
        setNotificationCount(0);
        setAuthChecked(true);
        return;
      }

      const result = await apiFetch("/api/me");

      if (cancelled) return;

      if (result.ok && result.user) {
        setUser(result.user);

        const notifications = await apiFetch(
          "/api/notifications/unread"
        );

        if (!cancelled) {
          setNotificationCount(
            notifications.ok ? Number(notifications.count || 0) : 0
          );
        }
      } else {
        setUser(null);
        setNotificationCount(0);
      }

      if (!cancelled) {
        setAuthChecked(true);
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, [token, location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setNotificationCount(0);
    setAuthChecked(true);

    navigate("/Login");
  };

  return (
    <>
      <nav className="main-navbar">
        <Link to="/" className="nav-logo">
          BallKnowledgePicks
        </Link>

        <div className="nav-links">
          <Link to="/">Home</Link>

          {!isGuest && (
            <>
              <Link to="/Guesses">Games</Link>
              <Link to="/Teams">Teams</Link>
              <Link to="/Groups">Groups</Link>
              <Link to="/stats">Stats</Link>

              {user.role === "admin" && (
                <Link to="/Admin">Admin</Link>
              )}
            </>
          )}
        </div>

        <div className="nav-user">
          {!isGuest ? (
            <>
              <Link
                to="/Notifications"
                className="nav-notification"
                aria-label="Notifications"
              >
                🔔
                {notificationCount > 0 && (
                  <span className="notification-badge">
                    {notificationCount}
                  </span>
                )}
              </Link>

              <span className="nav-username">
                {user.username}
              </span>

              <button
                className="nav-logout"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/Login">Login</Link>

              <Link
                to="/Register"
                className="nav-signup"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/Login" element={<AuthPage />} />
        <Route path="/Register" element={<Register />} />
        <Route path="/stats" element={<StatsPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/Teams" element={<Teams />} />
          <Route path="/Groups" element={<Groups />} />
          <Route path="/Guesses" element={<Guesses />} />
          <Route
            path="/Notifications"
            element={<Notifications />}
          />

          <Route
            path="/Admin"
            element={
              !authChecked ? (
                <p>Loading...</p>
              ) : user?.role === "admin" ? (
                <Admin />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Route>

        <Route
          path="/Games"
          element={<Navigate to="/Guesses" replace />}
        />

        {/* Page not found */}
        <Route path="*" element={<p>Page not found</p>} />
      </Routes>
    </>
  );
}

export default App;