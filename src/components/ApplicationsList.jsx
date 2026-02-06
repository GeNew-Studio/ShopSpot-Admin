import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  FileText, Clock, CheckCircle, XCircle, BarChart3,
  Search, RefreshCw, Eye
} from 'lucide-react'

export default function ApplicationsList({ admin }) {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [filter])

  const fetchData = async () => {
    try {
      // Fetch stats
      const { data: statsData } = await supabase.rpc('admin_get_stats', {
        p_admin_id: admin.id
      })
      if (statsData?.success) {
        setStats(statsData.stats)
      }

      // Fetch applications
      const params = { p_admin_id: admin.id }
      if (filter !== 'all') {
        params.p_status = filter
      }

      const { data, error } = await supabase.rpc('admin_get_applications', params)

      if (error) throw error

      if (data?.success) {
        setApplications(data.applications || [])
      }
    } catch (err) {
      console.error('Error fetching applications:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle size={14} />
      case 'rejected': return <XCircle size={14} />
      default: return <Clock size={14} />
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading applications...</p>
      </div>
    )
  }

  return (
    <div className="detail-page">
      <div className="page-header">
        <h1>Applications</h1>
        <p>Review and manage business verification applications</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-header">
            <span className="stat-label">Total</span>
            <div className="stat-icon">
              <BarChart3 size={18} />
            </div>
          </div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card stat-pending">
          <div className="stat-header">
            <span className="stat-label">Pending</span>
            <div className="stat-icon">
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-value">{stats.pending}</div>
        </div>
        <div className="stat-card stat-approved">
          <div className="stat-header">
            <span className="stat-label">Approved</span>
            <div className="stat-icon">
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="stat-value">{stats.approved}</div>
        </div>
        <div className="stat-card stat-rejected">
          <div className="stat-header">
            <span className="stat-label">Rejected</span>
            <div className="stat-icon">
              <XCircle size={18} />
            </div>
          </div>
          <div className="stat-value">{stats.rejected}</div>
        </div>
      </div>

      {/* Filters + Refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="filter-tabs">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'rejected', label: 'Rejected' }
          ].map(tab => (
            <button
              key={tab.key}
              className={`filter-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button className="btn-ghost" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {/* Applications Table */}
      <div className="applications-table">
        <div className="table-header">
          <span>Business Name</span>
          <span>Owner</span>
          <span>Address</span>
          <span>Status</span>
          <span>Date</span>
          <span>Action</span>
        </div>

        {applications.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <h3>No applications found</h3>
            <p>
              {filter === 'all'
                ? 'No business applications have been submitted yet.'
                : `No ${filter} applications at this time.`}
            </p>
          </div>
        ) : (
          applications.map(app => (
            <div
              key={app.id}
              className="table-row"
              onClick={() => navigate(`/applications/${app.id}`)}
            >
              <span className="business-name">{app.business_name}</span>
              <span className="owner-name">{app.owner_name}</span>
              <span className="address">{app.address}</span>
              <span>
                <span className={`status-badge ${app.status}`}>
                  {getStatusIcon(app.status)}
                  {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                </span>
              </span>
              <span className="date">{formatDate(app.created_at)}</span>
              <span>
                <button
                  className="review-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/applications/${app.id}`)
                  }}
                >
                  <Eye size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Review
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
