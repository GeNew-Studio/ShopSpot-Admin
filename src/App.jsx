import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

function userToAdmin(user) {
  if (!user) return null
  return {
    id: user.id,
    email: user.email,
    display_name: user.user_metadata?.full_name || user.user_metadata?.display_name || user.email
  }
}

async function checkIsAdmin(email) {
  const { data, error } = await supabase.rpc('is_admin', { check_email: email })
  if (error) {
    console.error('Admin check failed:', error)
    return false
  }
  return data === true
}

export default function App() {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let initialCheckDone = false

    const handleSession = async (session) => {
      if (!session?.user) {
        setAdmin(null)
        setLoading(false)
        return
      }
      try {
        const isAdmin = await checkIsAdmin(session.user.email)
        if (isAdmin) {
          setAdmin(userToAdmin(session.user))
          setAuthError('')
        } else {
          await supabase.auth.signOut()
          setAdmin(null)
          setAuthError('Access denied. Your account is not authorized as an admin.')
        }
      } catch (err) {
        console.error('Auth check error:', err)
        setAdmin(null)
        setAuthError('Something went wrong verifying your access. Please try again.')
      }
      setLoading(false)
    }

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        await handleSession(session)
      } catch (err) {
        console.error('Init auth error:', err)
        setLoading(false)
      }
      initialCheckDone = true
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!initialCheckDone) return
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true)
        await handleSession(session)
      } else if (event === 'SIGNED_OUT') {
        setAdmin(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setAdmin(null)
    setAuthError('')
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Verifying access...</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={admin ? <Navigate to="/" /> : <LoginPage error={authError} />}
      />
      <Route
        path="/*"
        element={admin ? <DashboardPage admin={admin} onLogout={handleLogout} /> : <Navigate to="/login" />}
      />
    </Routes>
  )
}
