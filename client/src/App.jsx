import { Routes, Route, Link } from "react-router-dom";
import Teams from "./components/Teams";
import Home from "./components/Home";
import Groups from "./components/Groups";

import Login from "./components/login";
import Register from "./components/register";
import AuthPage from "./pages/AuthPage";
import StatsPage from "./pages/StatsPage";

import ProtectedRoute from "./ProtectedRoute";
import { useNavigate } from "react-router-dom";

function App() {
  // for report provide the db code allongside a result
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/Login");
  };

  return (
    <>
      <nav>
        <Link to="/">Home</Link> |<Link to="/Teams">Teams</Link> |<Link to="/Groups">Groups</Link> |<Link to="/stats">Stats</Link> |
        <button onClick={handleLogout}>Logout</button>
      </nav>

      <Routes>
        {/* Public routes */}
        <Route path="/Login" element={<AuthPage />} />
        <Route path="/Register" element={<Register />} />
        <Route path="/stats" element={<StatsPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/Teams" element={<Teams />} />
          <Route path="/Groups" element={<Groups />} />
        </Route>

        <Route path="*" element={<p>Page not found</p>} />
      </Routes>
    </>
  );
}

export default App;
