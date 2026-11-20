import { Routes, Route, Link } from "react-router-dom";
import Teams from "./Teams"
import Home from "./Home";
import Groups from "./Groups";


function App() {// for report provide the db code allongside a result
  
  return (
    <>
      <nav>
        <Link to="/">Home</Link> | <Link to="/Teams">Teams</Link> | <Link to="/Groups">Groups</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Teams" element={<Teams />} />
        <Route path="/Groups" element={<Groups />} />
        <Route path="*" element={<p>Page not found</p>} />
      </Routes>
    </>
  )
}

export default App
