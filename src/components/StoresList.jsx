import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Store, RefreshCw, Tag, ChevronDown, Search, X
} from 'lucide-react'

export default function StoresList({ admin }) {
  const navigate = useNavigate()
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedBusiness, setExpandedBusiness] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setStores(data || [])
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
    setExpandedBusiness(null)
    fetchStores()
  }

  const deriveBusinessName = (storeName) => {
    if (!storeName) return 'Unknown'
    const normalized = String(storeName).trim().replace(/\s+/g, ' ')

    // Common patterns:
    // - "KFC - Downtown"
    // - "KFC (Downtown)"
    // - "KFC, Downtown"
    const dashSplit = normalized.split(/\s[-—–]\s/)
    if (dashSplit.length > 1) return dashSplit[0].trim()

    const parenSplit = normalized.split('(')
    if (parenSplit.length > 1) return parenSplit[0].trim()

    const commaSplit = normalized.split(',')
    if (commaSplit.length > 1) return commaSplit[0].trim()

    return normalized
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const businessGroups = useMemo(() => {
    const map = new Map()
    for (const store of stores) {
      const key = deriveBusinessName(store.store_name)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(store)
    }

    // Sort businesses alphabetically; sort each business's locations by most recently updated.
    const groups = Array.from(map.entries()).map(([businessName, list]) => ({
      businessName,
      locations: list.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    }))

    groups.sort((a, b) => a.businessName.localeCompare(b.businessName))
    return groups
  }, [stores])

  useEffect(() => {
    // Open the first business group by default so the page is usable immediately.
    if (!loading && businessGroups.length > 0 && expandedBusiness == null && !searchQuery.trim()) {
      setExpandedBusiness(businessGroups[0].businessName)
    }
  }, [loading, businessGroups, expandedBusiness, searchQuery])

  const filteredBusinessGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return businessGroups

    return businessGroups
      .map(group => {
        const businessMatch = group.businessName.toLowerCase().includes(q)
        const matchingLocations = businessMatch
          ? group.locations
          : group.locations.filter(loc =>
              String(loc.store_name || '').toLowerCase().includes(q) ||
              String(loc.location || '').toLowerCase().includes(q)
            )
        if (matchingLocations.length === 0) return null
        return { businessName: group.businessName, locations: matchingLocations }
      })
      .filter(Boolean)
  }, [businessGroups, searchQuery])

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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div className="partner-search-box" style={{ maxWidth: 380 }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by business or location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="partner-search-clear"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button className="btn-ghost" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {stores.length === 0 ? (
        <div className="applications-table stores-table">
          <div className="table-header">
            <span>Store Name</span>
            <span>Contact</span>
            <span>Address</span>
            <span>Date</span>
            <span>Action</span>
          </div>
          <div className="empty-state" style={{ padding: 60 }}>
            <Store size={48} />
            <h3>No approved stores yet</h3>
            <p>Approved business applications will appear here. Visit Applications to review pending applications.</p>
          </div>
        </div>
      ) : (
        <div className="stores-business-groups">
          {filteredBusinessGroups.length === 0 ? (
            <div className="applications-table stores-table">
              <div className="table-header">
                <span>Store Name</span>
                <span>Contact</span>
                <span>Address</span>
                <span>Date</span>
                <span>Action</span>
              </div>
              <div className="empty-state" style={{ padding: 60 }}>
                <Store size={48} />
                <h3>No matches</h3>
                <p>Try a different business or location name.</p>
              </div>
            </div>
          ) : filteredBusinessGroups.map(({ businessName, locations }) => {
            const isOpen = expandedBusiness === businessName
            return (
              <div key={businessName} className="business-group">
                <button
                  type="button"
                  className="business-group-header"
                  onClick={() => setExpandedBusiness(prev => (prev === businessName ? null : businessName))}
                >
                  <span className="business-group-title">
                    {businessName} <span className="business-group-count">{locations.length} location{locations.length === 1 ? '' : 's'}</span>
                  </span>
                  <ChevronDown size={16} className={`business-group-chevron ${isOpen ? 'open' : ''}`} />
                </button>

                {isOpen && (
                  <div className="applications-table stores-table business-locations-table">
                    <div className="table-header">
                      <span>Store Name</span>
                      <span>Contact</span>
                      <span>Address</span>
                      <span>Date</span>
                      <span>Action</span>
                    </div>
                    {locations.map(store => (
                      <div
                        key={store.id}
                        className="table-row"
                        onClick={() => navigate(`/stores/${store.id}`)}
                      >
                        <span className="business-name">{store.store_name}</span>
                        <span className="owner-name">{store.contact_info || '—'}</span>
                        <span className="address">{store.location}</span>
                        <span className="date">{formatDate(store.updated_at || store.created_at)}</span>
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
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
