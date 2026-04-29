import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  Crown, Search, RefreshCw, Tag, Clock, Eye, QrCode,
  ShoppingCart, Store, X, ChevronDown
} from 'lucide-react'

export default function PartnerCoupons({ admin }) {
  const navigate = useNavigate()
  const [coupons, setCoupons] = useState([])
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedShopId, setSelectedShopId] = useState('')
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [couponsRes, shopsRes] = await Promise.all([
        supabase
          .from('coupons')
          .select('*')
          .eq('is_exclusive', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('shops')
          .select('id, store_name')
          .order('store_name', { ascending: true })
      ])

      if (couponsRes.error) throw couponsRes.error
      if (shopsRes.error) throw shopsRes.error

      setCoupons(couponsRes.data || [])
      setShops(shopsRes.data || [])
    } catch (err) {
      console.error('Error fetching partner coupons:', err)
      setCoupons([])
      setShops([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const shopMap = useMemo(() => {
    const map = {}
    shops.forEach(s => { map[s.id] = s.store_name })
    return map
  }, [shops])

  const shopsWithCoupons = useMemo(() => {
    const ids = new Set(coupons.map(c => c.shop_id))
    return shops.filter(s => ids.has(s.id))
  }, [shops, coupons])

  const filtered = useMemo(() => {
    let list = coupons

    if (selectedShopId) {
      list = list.filter(c => c.shop_id === selectedShopId)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(c => {
        const shopName = (shopMap[c.shop_id] || '').toLowerCase()
        const couponName = (c.coupon_name || '').toLowerCase()
        return shopName.includes(q) || couponName.includes(q)
      })
    }

    return list
  }, [coupons, selectedShopId, searchQuery, shopMap])

  const formatDate = (dateStr) => {
    if (!dateStr) return 'No expiration'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  const formatDiscount = (c) => {
    if (c.discount_type === 'bogo') return 'BOGO'
    if (c.discount_type === 'percentage') return `${c.discount_value}% off`
    return `$${Number(c.discount_value).toFixed(2)} off`
  }

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const usageIcon = (type) => {
    if (type === 'qr_scan') return <QrCode size={13} />
    if (type === 'add_to_cart') return <ShoppingCart size={13} />
    return <Eye size={13} />
  }

  const usageLabel = (type) => {
    if (type === 'qr_scan') return 'QR Scan'
    if (type === 'add_to_cart') return 'Add to Cart'
    return 'View Only'
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading partner coupons...</p>
      </div>
    )
  }

  return (
    <div className="detail-page">
      <div className="page-header">
        <h1><Crown size={24} /> Partner Coupons</h1>
        <p>View all exclusive partner coupons across all shops</p>
      </div>

      <div className="partner-coupons-toolbar">
        <div className="partner-search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by shop or coupon name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="partner-search-clear" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="partner-shop-filter">
          <button
            className={`partner-shop-filter-btn ${selectedShopId ? 'active' : ''}`}
            onClick={() => setShopDropdownOpen(!shopDropdownOpen)}
          >
            <Store size={15} />
            <span>{selectedShopId ? shopMap[selectedShopId] : 'All Shops'}</span>
            <ChevronDown size={14} className={shopDropdownOpen ? 'rotated' : ''} />
          </button>
          {shopDropdownOpen && (
            <>
              <div className="partner-dropdown-backdrop" onClick={() => setShopDropdownOpen(false)} />
              <div className="partner-shop-dropdown">
                <button
                  className={`partner-shop-option ${!selectedShopId ? 'selected' : ''}`}
                  onClick={() => { setSelectedShopId(''); setShopDropdownOpen(false) }}
                >
                  All Shops
                  <span className="partner-shop-count">{coupons.length}</span>
                </button>
                {shopsWithCoupons.map(s => {
                  const count = coupons.filter(c => c.shop_id === s.id).length
                  return (
                    <button
                      key={s.id}
                      className={`partner-shop-option ${selectedShopId === s.id ? 'selected' : ''}`}
                      onClick={() => { setSelectedShopId(s.id); setShopDropdownOpen(false) }}
                    >
                      {s.store_name}
                      <span className="partner-shop-count">{count}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <button className="btn-ghost" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      <div className="partner-stats-row">
        <div className="partner-stat">
          <span className="partner-stat-value">{coupons.length}</span>
          <span className="partner-stat-label">Total Partner</span>
        </div>
        <div className="partner-stat">
          <span className="partner-stat-value">{coupons.filter(c => c.is_active && !isExpired(c.expiration_date)).length}</span>
          <span className="partner-stat-label">Active</span>
        </div>
        <div className="partner-stat">
          <span className="partner-stat-value">{coupons.filter(c => isExpired(c.expiration_date)).length}</span>
          <span className="partner-stat-label">Expired</span>
        </div>
        <div className="partner-stat">
          <span className="partner-stat-value">{shopsWithCoupons.length}</span>
          <span className="partner-stat-label">Shops</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="applications-table">
          <div className="empty-state">
            <Crown size={48} />
            <h3>No partner coupons found</h3>
            <p>
              {searchQuery || selectedShopId
                ? 'Try adjusting your search or filter.'
                : 'Mark coupons as "Exclusive Partner" when adding them to a store.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="applications-table partner-coupons-table">
          <div className="table-header">
            <span>Coupon</span>
            <span>Shop</span>
            <span>Discount</span>
            <span>Type</span>
            <span>Expiration</span>
            <span>Status</span>
          </div>
          {filtered.map(c => (
            <div
              key={c.id}
              className={`table-row ${isExpired(c.expiration_date) ? 'row-expired' : ''}`}
              onClick={() => navigate(`/stores/${c.shop_id}`)}
            >
              <span className="partner-coupon-name">
                <Crown size={14} className="partner-crown-icon" />
                <code>{c.coupon_name}</code>
              </span>
              <span className="partner-shop-name">{shopMap[c.shop_id] || 'Unknown'}</span>
              <span className="partner-discount">{formatDiscount(c)}</span>
              <span className="partner-usage">
                {usageIcon(c.coupon_usage_type)}
                {usageLabel(c.coupon_usage_type)}
              </span>
              <span className="partner-expiry">
                <Clock size={12} />
                {isExpired(c.expiration_date)
                  ? <span className="expired-text">Expired</span>
                  : formatDate(c.expiration_date)}
              </span>
              <span>
                {c.is_active && !isExpired(c.expiration_date)
                  ? <span className="status-badge approved">Active</span>
                  : isExpired(c.expiration_date)
                    ? <span className="status-badge rejected">Expired</span>
                    : <span className="status-badge pending">Inactive</span>
                }
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
