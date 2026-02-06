import { useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, User, LogOut } from 'lucide-react'

export default function Sidebar({ admin, onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => location.pathname.startsWith(path)

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-dot">SS</div>
        <div>
          <h2>ShopSpot</h2>
          <span>Admin Panel</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-label">Navigation</div>
        <button
          className={`nav-item ${isActive('/applications') ? 'active' : ''}`}
          onClick={() => navigate('/applications')}
        >
          <FileText size={18} />
          Applications
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-admin">
          <div className="admin-avatar">
            <User size={18} />
          </div>
          <div className="admin-info">
            <div className="name">{admin.display_name || admin.username}</div>
            <div className="role">Administrator</div>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
