import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'

function Dashboard() {
  function handleSignOut() {
    localStorage.removeItem('crypto_alert_token')
    window.location.assign('/login')
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-panel" aria-labelledby="dashboard-title">
        <p className="eyebrow">CryptoAlert</p>
        <h1 id="dashboard-title">Dashboard</h1>
        <p>Authentication is active. Price, watchlist, and alert views will attach here.</p>
        <button type="button" className="secondary-button" onClick={handleSignOut}>
          Sign out
        </button>
      </section>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
