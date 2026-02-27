import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Store, Search, RefreshCw, Eye, Tag
} from 'lucide-react'

export default function StoresList({ admin }) {
  const navigate = useNavigate()
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_applications', {
        p_admin_id: admin.id,
        p_status: 'approved'
      })

      if (error) throw error

      if (data?.success) {
        setStores(data.applications || [])
      }
    } catch (err) {
      console.error('Error fetching stores:', err)
      setStores([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchStores()
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading stores...</p>
      </div>
    )
  }

  return (
    <div className="detail-page">
      <div className="page-header">
        <h1>Stores</h1>
        <p>Manage approved businesses and their exclusive partner coupons</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn-ghost" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      <div className="applications-table stores-table">
        <div className="table-header">
          <span>Business Name</span>
          <span>Owner</span>
          <span>Address</span>
          <span>Approved</span>
          <span>Action</span>
        </div>

        {stores.length === 0 ? (
          <div className="empty-state">
            <Store size={48} />
            <h3>No approved stores yet</h3>
            <p>Approved business applications will appear here. Visit Applications to review pending applications.</p>
          </div>
        ) : (
          stores.map(store => (
            <div
              key={store.id}
              className="table-row"
              onClick={() => navigate(`/stores/${store.id}`)}
            >
              <span className="business-name">{store.business_name}</span>
              <span className="owner-name">{store.owner_name}</span>
              <span className="address">{store.address}</span>
              <span className="date">{formatDate(store.reviewed_at || store.created_at)}</span>
              <span>
                <button
                  className="review-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/stores/${store.id}`)
                  }}
                >
                  <Tag size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Manage Coupons
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
