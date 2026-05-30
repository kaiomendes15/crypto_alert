import { Navigate, Outlet } from 'react-router-dom'

function ProtectedRoute() {
  const token = localStorage.getItem('crypto_alert_token')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
