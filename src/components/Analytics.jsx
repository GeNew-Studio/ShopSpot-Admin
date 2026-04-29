import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart3, Store, Tag, RefreshCw, Users,
  MousePointerClick, Layers, ShoppingCart, Eye
} from 'lucide-react'

const TIME_RANGES = [
  { key: 'all', label: 'All Time' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' }
]

function dateCutoff(key) {
  if (key === 'all') return null
  const d = new Date()
  d.setDate(d.getDate() - parseInt(key))
  return d.toISOString()
}

export default function Analytics() {
  const [couponClicks, setCouponClicks] = useState([])
  const [storeClicks, setStoreClicks] = useState([])
  const [couponViewers, setCouponViewers] = useState([])
  const [coupons, setCoupons] = useState([])
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [range, setRange] = useState('all')
  const [tab, setTab] = useState('coupons')

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const [clicks, sClicks, viewers, cpns, shps] = await Promise.all([
        supabase.from('coupon_hits').select('coupon_id, shop_id, category, user_id, created_at'),
        supabase.from('store_hits').select('shop_id, user_id, created_at'),
        supabase.from('coupon_history').select('coupon_id, user_id, viewed_at'),
        supabase.from('coupons').select('id, coupon_name, shop_id, industry, type, coupon_usage_type'),
        supabase.from('shops').select('id, store_name, industry, industry_type')
      ])
      setCouponClicks(clicks.data || [])
      setStoreClicks(sClicks.data || [])
      setCouponViewers(viewers.data || [])
      setCoupons(cpns.data || [])
      setShops(shps.data || [])
    } catch (e) {
      console.error('Analytics load error:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const refresh = () => { setRefreshing(true); load() }

  const shopMap = useMemo(() => Object.fromEntries(shops.map(s => [s.id, s])), [shops])
  const couponMap = useMemo(() => Object.fromEntries(coupons.map(c => [c.id, c])), [coupons])
  const cutoff = useMemo(() => dateCutoff(range), [range])

  const fClicks = useMemo(() =>
    cutoff ? couponClicks.filter(h => h.created_at >= cutoff) : couponClicks,
  [couponClicks, cutoff])

  const fStoreClicks = useMemo(() =>
    cutoff ? storeClicks.filter(h => h.created_at >= cutoff) : storeClicks,
  [storeClicks, cutoff])

  const fViewers = useMemo(() =>
    cutoff ? couponViewers.filter(h => h.viewed_at >= cutoff) : couponViewers,
  [couponViewers, cutoff])

  const couponStats = useMemo(() => {
    const clickCounts = {}
    fClicks.forEach(h => {
      if (h.coupon_id) clickCounts[h.coupon_id] = (clickCounts[h.coupon_id] || 0) + 1
    })

    const userSets = {}
    fViewers.forEach(h => {
      if (!h.coupon_id) return
      if (!userSets[h.coupon_id]) userSets[h.coupon_id] = new Set()
      if (h.user_id) userSets[h.coupon_id].add(h.user_id)
    })

    const ids = new Set([...Object.keys(clickCounts), ...Object.keys(userSets)])
    return Array.from(ids).map(id => {
      const c = couponMap[id]
      const s = c ? shopMap[c.shop_id] : null
      return {
        id,
        clicks: clickCounts[id] || 0,
        users: userSets[id]?.size || 0,
        name: c?.coupon_name || 'Deleted coupon',
        store: s?.store_name || 'Unknown',
        industry: c?.industry || '—',
        type: c?.type || '—'
      }
    }).sort((a, b) => b.clicks - a.clicks)
  }, [fClicks, fViewers, couponMap, shopMap])

  const storeStats = useMemo(() => {
    const data = {}
    fStoreClicks.forEach(h => {
      if (!h.shop_id) return
      if (!data[h.shop_id]) data[h.shop_id] = { clicks: 0, users: new Set() }
      data[h.shop_id].clicks++
      if (h.user_id) data[h.shop_id].users.add(h.user_id)
    })
    return Object.entries(data).map(([id, d]) => {
      const s = shopMap[id]
      return {
        id,
        clicks: d.clicks,
        users: d.users.size,
        name: s?.store_name || 'Unknown',
        industry: s?.industry || '—',
        type: s?.industry_type || '—'
      }
    }).sort((a, b) => b.clicks - a.clicks)
  }, [fStoreClicks, shopMap])

  const categoryStats = useMemo(() => {
    const counts = {}
    fClicks.forEach(h => {
      const cat = h.category || couponMap[h.coupon_id]?.industry || 'uncategorized'
      counts[cat] = (counts[cat] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, clicks]) => ({ name, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
  }, [fClicks, couponMap])

  const typeStats = useMemo(() => {
    const counts = {}
    fClicks.forEach(h => {
      const t = couponMap[h.coupon_id]?.type || 'unknown'
      counts[t] = (counts[t] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, clicks]) => ({ name, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
  }, [fClicks, couponMap])

  const totalClicks = fClicks.length
  const totalStoreClicks = fStoreClicks.length
  const totalBusinesses = shops.length
  const totalUniqueViewers = useMemo(() => new Set(fViewers.map(h => h.user_id).filter(Boolean)).size, [fViewers])
  const totalUniqueStoreVisitors = useMemo(() => new Set(fStoreClicks.map(h => h.user_id).filter(Boolean)).size, [fStoreClicks])
  const totalUsers = useMemo(() => {
    const userIds = new Set()
    fClicks.forEach(h => h.user_id && userIds.add(h.user_id))
    fStoreClicks.forEach(h => h.user_id && userIds.add(h.user_id))
    fViewers.forEach(h => h.user_id && userIds.add(h.user_id))
    return userIds.size
  }, [fClicks, fStoreClicks, fViewers])
  const weeklyActiveUsers = useMemo(() => {
    const weekCutoff = dateCutoff('7d')
    const activeUsers = new Set()

    couponClicks.forEach(h => {
      if (h.user_id && h.created_at >= weekCutoff) activeUsers.add(h.user_id)
    })

    storeClicks.forEach(h => {
      if (h.user_id && h.created_at >= weekCutoff) activeUsers.add(h.user_id)
    })

    couponViewers.forEach(h => {
      if (h.user_id && h.viewed_at >= weekCutoff) activeUsers.add(h.user_id)
    })

    return activeUsers.size
  }, [couponClicks, storeClicks, couponViewers])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading analytics...</p>
      </div>
    )
  }

  const maxOf = (arr, key) => arr.length > 0 ? Math.max(...arr.map(i => i[key]), 1) : 1

  return (
    <div className="detail-page">
      <div className="page-header">
        <h1><BarChart3 size={24} /> Analytics</h1>
        <p>Track coupon clicks, unique viewers, store visits, and category performance</p>
      </div>

      <div className="ana-toolbar">
        <div className="ana-range">
          {TIME_RANGES.map(r => (
            <button key={r.key} className={`filter-tab ${range === r.key ? 'active' : ''}`} onClick={() => setRange(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
        <button className="btn-ghost" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={16} className={refreshing ? 'spinning' : ''} /> Refresh
        </button>
      </div>

      <div className="ana-cards">
        <div className="ana-card">
          <div className="ana-card-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            <Store size={20} />
          </div>
          <div>
            <div className="ana-card-val">{totalBusinesses}</div>
            <div className="ana-card-lbl">Total Businesses</div>
          </div>
        </div>
        <div className="ana-card">
          <div className="ana-card-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
            <Users size={20} />
          </div>
          <div>
            <div className="ana-card-val">{totalUsers}</div>
            <div className="ana-card-lbl">Total Users</div>
          </div>
        </div>
        <div className="ana-card">
          <div className="ana-card-icon" style={{ background: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
            <MousePointerClick size={20} />
          </div>
          <div>
            <div className="ana-card-val">{totalClicks}</div>
            <div className="ana-card-lbl">Total Coupon Clicks</div>
          </div>
        </div>
        <div className="ana-card">
          <div className="ana-card-icon" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            <Users size={20} />
          </div>
          <div>
            <div className="ana-card-val">{totalUniqueViewers}</div>
            <div className="ana-card-lbl">Unique Coupon Viewers</div>
          </div>
        </div>
        <div className="ana-card">
          <div className="ana-card-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
            <Store size={20} />
          </div>
          <div>
            <div className="ana-card-val">{totalStoreClicks}</div>
            <div className="ana-card-lbl">Total Store Clicks</div>
          </div>
        </div>
        <div className="ana-card">
          <div className="ana-card-icon" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
            <Eye size={20} />
          </div>
          <div>
            <div className="ana-card-val">{totalUniqueStoreVisitors}</div>
            <div className="ana-card-lbl">Unique Store Visitors</div>
          </div>
        </div>
        <div className="ana-card">
          <div className="ana-card-icon" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
            <Users size={20} />
          </div>
          <div>
            <div className="ana-card-val">{weeklyActiveUsers}</div>
            <div className="ana-card-lbl">Weekly Active Users</div>
          </div>
        </div>
      </div>

      <div className="ana-tabs">
        {[
          { key: 'coupons', icon: <Tag size={16} />, label: 'Coupons' },
          { key: 'stores', icon: <Store size={16} />, label: 'Stores' },
          { key: 'categories', icon: <Layers size={16} />, label: 'Categories' }
        ].map(t => (
          <button key={t.key} className={`ana-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'coupons' && (
        <div className="ana-fade">
          {couponStats.length === 0 ? (
            <EmptyState icon={<Tag size={40} />} title="No coupon data yet" desc="Click data will appear once customers interact with coupons." />
          ) : (
            <div className="ana-table">
              <div className="ana-thead ana-coupon-grid">
                <span>Coupon</span><span>Store</span><span>Industry</span><span>Type</span><span>Users</span><span>Clicks</span>
              </div>
              {couponStats.map(r => (
                <div key={r.id} className="ana-trow ana-coupon-grid">
                  <span className="ana-primary">{r.name}</span>
                  <span className="ana-secondary">{r.store}</span>
                  <span><span className="ana-badge">{r.industry}</span></span>
                  <span><span className="ana-badge">{r.type}</span></span>
                  <span className="ana-bar-cell">
                    <Bar value={r.users} max={maxOf(couponStats, 'users')} color="var(--color-info)" />
                  </span>
                  <span className="ana-bar-cell">
                    <Bar value={r.clicks} max={maxOf(couponStats, 'clicks')} color="var(--color-primary)" />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'stores' && (
        <div className="ana-fade">
          {storeStats.length === 0 ? (
            <EmptyState icon={<Store size={40} />} title="No store data yet" desc="Visit data will appear once customers open store pages." />
          ) : (
            <div className="ana-table">
              <div className="ana-thead ana-store-grid">
                <span>Store</span><span>Industry</span><span>Type</span><span>Users</span><span>Visits</span>
              </div>
              {storeStats.map(r => (
                <div key={r.id} className="ana-trow ana-store-grid">
                  <span className="ana-primary">{r.name}</span>
                  <span><span className="ana-badge">{r.industry}</span></span>
                  <span><span className="ana-badge">{r.type}</span></span>
                  <span className="ana-bar-cell">
                    <Bar value={r.users} max={maxOf(storeStats, 'users')} color="var(--color-info)" />
                  </span>
                  <span className="ana-bar-cell">
                    <Bar value={r.clicks} max={maxOf(storeStats, 'clicks')} color="var(--color-primary)" />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'categories' && (
        <div className="ana-fade">
          <div className="ana-panels">
            <BreakdownPanel title="By Industry" icon={<Layers size={16} />} data={categoryStats} color="var(--color-primary)" />
            <BreakdownPanel title="By Type" icon={<Tag size={16} />} data={typeStats} color="var(--color-success)" />
          </div>
        </div>
      )}

      <div className="ana-integration-note">
        <h4>Integration</h4>
        <p>To track every click, call these from your customer app:</p>
        <code>await supabase.rpc('log_coupon_click', {'{'} p_coupon_id: couponId {'}'})</code>
        <code>await supabase.rpc('log_store_click', {'{'} p_shop_id: shopId {'}'})</code>
      </div>
    </div>
  )
}

function Bar({ value, max, color }) {
  return (
    <>
      <div className="ana-bar-track">
        <div className="ana-bar-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <span className="ana-bar-num">{value}</span>
    </>
  )
}

function EmptyState({ icon, title, desc }) {
  return (
    <div className="ana-empty">
      {icon}
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  )
}

function BreakdownPanel({ title, icon, data, color }) {
  const max = data.length > 0 ? Math.max(...data.map(d => d.clicks), 1) : 1
  return (
    <div className="ana-panel">
      <h3 className="ana-panel-title">{icon} {title}</h3>
      {data.length === 0 ? (
        <div className="ana-empty-sm"><p>No data yet.</p></div>
      ) : (
        <div className="ana-bd-list">
          {data.map(d => (
            <div key={d.name} className="ana-bd-row">
              <span className="ana-bd-label">{d.name}</span>
              <div className="ana-bar-track">
                <div className="ana-bar-fill" style={{ width: `${(d.clicks / max) * 100}%`, background: color }} />
              </div>
              <span className="ana-bar-num">{d.clicks}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
