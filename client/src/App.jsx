import { useState } from 'react'
import StatsPage from './pages/StatsPage'

function App() {
  // Temporary until the team adds a router: /stats shows the Stats page
  if (window.location.pathname === '/stats') {
    return <StatsPage />
  }

  return (
    <>
      <div>
        <h1>Ball Knowledge Picks</h1>
      </div>
    </>
  )
}

export default App
