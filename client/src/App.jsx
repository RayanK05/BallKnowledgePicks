import { Routes, Route, Link, useNavigate } from "react-router-dom";

import Teams from "./components/Teams";
import Home from "./components/Home";
import Groups from "./components/Groups";
import Admin from "./components/admin";

import Register from "./components/register";
import AuthPage from "./pages/AuthPage";
import StatsPage from "./pages/StatsPage";
import Guesses from "./pages/Guesses";

import ProtectedRoute from "./ProtectedRoute";

function App() {// for report provide the db code allongside a result
  const isAuthenticated = localStorage.getItem('token');
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/Login");
  };

  return (
    <>
      {isAuthenticated && (
        <>
          <nav>
            <Link to="/">Home</Link> |<Link to="/Teams">Teams</Link> |
            <Link to="/Groups">Groups</Link> |<Link to="/stats">Stats</Link> |
            <Link to="/Guesses">Guess</Link> |<button onClick={handleLogout}>Logout</button>
          </nav>
        </>
      )}

      <Routes>
        {/* Public routes */}
        <Route path="/Login" element={<AuthPage />} />
        <Route path="/Register" element={<Register />} />
        <Route path="/stats" element={<StatsPage />} />

        {/* Temporary development preview routes */}
        {import.meta.env.DEV && (
          <>
            <Route path="/home-preview" element={<Home />} />
            <Route path="/admin-preview" element={<Admin />} />
          </>
        )}

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/Teams" element={<Teams />} />
          <Route path="/Groups" element={<Groups />} />
          <Route path="/Guesses" element={<Guesses />} />
        </Route>

        {/* Page not found */}
        <Route path="*" element={<p>Page not found</p>} />
      </Routes>
    </>
  );
}

export default App;