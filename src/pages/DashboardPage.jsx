import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import ApplicationsList from '../components/ApplicationsList'
import ApplicationDetail from '../components/ApplicationDetail'
import StoresList from '../components/StoresList'
import StoreDetail from '../components/StoreDetail'

export default function DashboardPage({ admin, onLogout }) {
  return (
    <div className="dashboard-layout">
      <Sidebar admin={admin} onLogout={onLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/applications" replace />} />
          <Route path="/applications" element={<ApplicationsList admin={admin} />} />
          <Route path="/applications/:id" element={<ApplicationDetail admin={admin} />} />
          <Route path="/stores" element={<StoresList admin={admin} />} />
          <Route path="/stores/:id" element={<StoreDetail admin={admin} />} />
        </Routes>
      </main>
    </div>
  )
}
