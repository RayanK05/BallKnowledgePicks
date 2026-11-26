import { useEffect, useState } from "react";

import {
    Routes,
    Route,
    Link,
    Navigate,
    useNavigate,
    useLocation
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

    const [user, setUser] = useState(null);
    const [notificationCount, setNotificationCount] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);

    const token = localStorage.getItem("token");

    const isGuest = !user || user.role === "guest";

    useEffect(() => {

        let active = true;

        setUser(null);
        setNotificationCount(null);
        setAuthChecked(false);

        if (!token) {
            setAuthChecked(true);
            return;
        }

        async function loadUser() {

            try {

                const result = await apiFetch("/api/me");

                if (active) {
                    setUser(result.ok ? result.user : null);
                }

            } catch (err) {

                console.error(err);

            } finally {

                if (active) {
                    setAuthChecked(true);
                }

            }
        }

        async function loadNotifications() {

            try {

                const result = await apiFetch(
                    "/api/notifications/unread"
                );

                if (active && result.ok) {
                    setNotificationCount(result.count);
                }

            } catch (err) {

                console.error(err);

            }
        }

        loadUser();
        loadNotifications();

        return () => {
            active = false;
        };

    }, [token, location.pathname]);

    function handleLogout() {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setUser(null);
        setNotificationCount(null);

        navigate("/Login");
    }

    return (
        <>

            {/* Navigation bar */}

            <nav className="main-navbar">

                <Link to="/" className="nav-logo">
                    BallKnowledgePicks
                </Link>

                <div className="nav-links">

                    <Link to="/">Home</Link>

                    {/* Registered users and admins only */}

                    {!isGuest && (
                        <>

                            <Link to="/Guesses">
                                Games
                            </Link>

                            <Link to="/Teams">
                                Teams
                            </Link>

                            <Link to="/Groups">
                                Groups
                            </Link>

                            <Link to="/stats">
                                Stats
                            </Link>

                        </>
                    )}

                    {/* Admin navigation */}

                    {user?.role === "admin" && (
                        <Link to="/Admin">
                            Admin
                        </Link>
                    )}

                </div>

                {/* Account navigation */}

                <div className="nav-user">

                    {!isGuest ? (
                        <>

                            <Link
                                to="/Notifications"
                                aria-label="Notifications"
                                className="nav-notification"
                            >
                                🔔 {notificationCount ?? ""}
                            </Link>

                            <span className="nav-username">
                                {user.username}
                            </span>

                            <button onClick={handleLogout}>
                                Logout
                            </button>

                        </>
                    ) : (
                        <>

                            <Link to="/Login">
                                Login
                            </Link>

                            <Link to="/Register">
                                Sign Up
                            </Link>

                        </>
                    )}

                </div>

            </nav>

            {/* Website routes */}

            <Routes>

                {/* Public routes */}

                <Route
                    path="/"
                    element={<Home />}
                />

                <Route
                    path="/Login"
                    element={<AuthPage />}
                />

                <Route
                    path="/Register"
                    element={<Register />}
                />

                <Route
                    path="/Guesses"
                    element={<Guesses />}
                />

                <Route
                    path="/stats"
                    element={<StatsPage />}
                />

                <Route
                    path="/Games"
                    element={<Navigate to="/Guesses" replace />}
                />

                {/* Authenticated routes */}

                <Route element={<ProtectedRoute />}>

                    <Route
                        path="/Teams"
                        element={<Teams />}
                    />

                    <Route
                        path="/Groups"
                        element={<Groups />}
                    />

                    <Route
                        path="/Notifications"
                        element={<Notifications />}
                    />

                    {/* Admin-only route */}

                    <Route
                        path="/Admin"
                        element={
                            !authChecked
                                ? <p>Checking access...</p>
                                : user?.role === "admin"
                                    ? <Admin />
                                    : <Navigate to="/" replace />
                        }
                    />

                </Route>

                {/* Page not found */}

                <Route
                    path="*"
                    element={<p>Page not found</p>}
                />

            </Routes>

        </>
    );
}

export default App;