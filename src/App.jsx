import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('shopspot_admin')
    if (stored) {
      try {
        setAdmin(JSON.parse(stored))
      } catch {
        localStorage.removeItem('shopspot_admin')
      }
    }
    setLoading(false)
  }, [])

  const handleLogin = (adminData) => {
    setAdmin(adminData)
    localStorage.setItem('shopspot_admin', JSON.stringify(adminData))
  }

  const handleLogout = () => {
    setAdmin(null)
    localStorage.removeItem('shopspot_admin')
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={admin ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />}
      />
      <Route
        path="/*"
        element={admin ? <DashboardPage admin={admin} onLogout={handleLogout} /> : <Navigate to="/login" />}
      />
    </Routes>
  )
}
