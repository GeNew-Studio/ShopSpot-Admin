import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { INDUSTRY_OPTIONS } from '../lib/industryOptions'
import GoogleMapsLocationPicker from './GoogleMapsLocationPicker'
import ShopMediaFields from './ShopMediaFields'
import {
  uploadShopLogo,
  uploadShopBanners,
  saveShopMedia
} from '../lib/shopMediaUtils'
import {
  Store, RefreshCw, Tag, ChevronDown, Search, X, Plus,
  CheckCircle, AlertCircle
} from 'lucide-react'

const defaultCreateForm = () => ({
  brandMode: 'new',
  business_account_id: '',
  store_name: '',
  location: '',
  contact_info: '',
  description: '',
  industry: '',
  industry_type: '',
  customIndustryType: '',
  latitude: null,
  longitude: null,
  google_place_id: null
})

function deriveBusinessName(storeName) {
  if (!storeName) return 'Unknown'
  const normalized = String(storeName).trim().replace(/\s+/g, ' ')
  const dashSplit = normalized.split(/\s[-—–]\s/)
  if (dashSplit.length > 1) return dashSplit[0].trim()
  const parenSplit = normalized.split('(')
  if (parenSplit.length > 1) return parenSplit[0].trim()
  const commaSplit = normalized.split(',')
  if (commaSplit.length > 1) return commaSplit[0].trim()
  return normalized
}

const SHOP_ID_CHUNK = 100
const STORE_COUPON_RPC_CONCURRENCY = 10

/**
 * Coupons linked to a shop via `shop_id` or shared across locations with `assigned_shop_ids`
 * (same semantics as the consumer app / couponUtils).
 */
async function fetchCouponsForShopIds(shopIds) {
  if (!shopIds.length) return []
  const rows = []
  for (let i = 0; i < shopIds.length; i += SHOP_ID_CHUNK) {
    const chunk = shopIds.slice(i, i + SHOP_ID_CHUNK)
    const idsCsv = chunk.join(',')
    const overlap = `{${chunk.join(',')}}`

    let { data, error } = await supabase
      .from('coupons')
      .select('id, shop_id, coupon_name, assigned_shop_ids')
      .or(`shop_id.in.(${idsCsv}),assigned_shop_ids.ov.${overlap}`)

    if (error) {
      const fallback = await supabase
        .from('coupons')
        .select('id, shop_id, coupon_name, assigned_shop_ids')
        .in('shop_id', chunk)
      data = fallback.data
      error = fallback.error
    }
    if (error) throw error
    rows.push(...(data || []))
  }
  return rows
}

/** Legacy partner rows in `store_coupons` (StoreDetail RPC path). */
async function fetchStoreCouponsForShopIds(supabase, admin, shopIds) {
  if (!shopIds.length) return []
  const rows = []
  for (let i = 0; i < shopIds.length; i += SHOP_ID_CHUNK) {
    const chunk = shopIds.slice(i, i + SHOP_ID_CHUNK)
    const { data, error } = await supabase
      .from('store_coupons')
      .select('id, store_id')
      .in('store_id', chunk)

    if (!error) {
      rows.push(...(data || []))
      continue
    }

    if (!admin?.id) continue

    for (let j = 0; j < chunk.length; j += STORE_COUPON_RPC_CONCURRENCY) {
      const slice = chunk.slice(j, j + STORE_COUPON_RPC_CONCURRENCY)
      const batch = await Promise.all(
        slice.map(async (storeId) => {
          const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_store_coupons', {
            p_admin_id: admin.id,
            p_store_id: storeId
          })
          if (rpcError || !rpcData?.success) return []
          return (rpcData.coupons || []).map(c => ({ id: c.id, store_id: storeId }))
        })
      )
      for (const part of batch) rows.push(...part)
    }
  }
  return rows
}

function couponAppliesToShopIds(row, shopIdSet) {
  if (row.shop_id && shopIdSet.has(row.shop_id)) return true
  const assigned = row.assigned_shop_ids
  if (!Array.isArray(assigned) || assigned.length === 0) return false
  return assigned.some(sid => shopIdSet.has(sid))
}

export default function StoresList({ admin }) {
  const navigate = useNavigate()
  const [stores, setStores] = useState([])
  const [accountCoupons, setAccountCoupons] = useState([])
  const [accountStoreCoupons, setAccountStoreCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedBusiness, setExpandedBusiness] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState(defaultCreateForm)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createMessage, setCreateMessage] = useState(null)
  const [createLogoFile, setCreateLogoFile] = useState(null)
  const [createBannerFiles, setCreateBannerFiles] = useState([])
  const [createMediaUploading, setCreateMediaUploading] = useState(false)

  useEffect(() => {
    fetchStores()
  }, [admin?.id])

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const list = data || []
      setStores(list)

      if (list.length > 0) {
        const shopIds = list.map(s => s.id)
        const [couponRows, storeCouponRows] = await Promise.all([
          fetchCouponsForShopIds(shopIds),
          fetchStoreCouponsForShopIds(supabase, admin, shopIds)
        ])
        setAccountCoupons(couponRows)
        setAccountStoreCoupons(storeCouponRows)
      } else {
        setAccountCoupons([])
        setAccountStoreCoupons([])
      }
    } catch (err) {
      console.error('Error fetching stores:', err)
      setStores([])
      setAccountCoupons([])
      setAccountStoreCoupons([])
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

  const handleCreateFieldChange = (e) => {
    const { name, value } = e.target
    setCreateForm(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'industry') {
        next.industry_type = ''
        next.customIndustryType = ''
      }
      return next
    })
    setCreateMessage(null)
  }

  const handleMapLocationChange = ({ lat, lng, formattedAddress, placeId }) => {
    setCreateForm(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      google_place_id: placeId,
      location: formattedAddress?.trim() ? formattedAddress.trim() : prev.location
    }))
    setCreateMessage(null)
  }

  const handleCreateStore = async (e) => {
    e.preventDefault()
    if (!admin?.id) {
      setCreateMessage({ type: 'error', text: 'You must be signed in to create a store.' })
      return
    }

    const name = createForm.store_name.trim()
    const location = createForm.location.trim()
    if (!name) {
      setCreateMessage({ type: 'error', text: 'Store name is required.' })
      return
    }
    if (!location) {
      setCreateMessage({ type: 'error', text: 'Address is required.' })
      return
    }
    if (!createForm.industry?.trim()) {
      setCreateMessage({ type: 'error', text: 'Industry is required for map and category filters.' })
      return
    }
    if (!createForm.industry_type?.trim()) {
      setCreateMessage({ type: 'error', text: 'Type is required.' })
      return
    }
    if (createForm.brandMode === 'existing' && !createForm.business_account_id) {
      setCreateMessage({ type: 'error', text: 'Select an existing business to add another location.' })
      return
    }
    let resolvedType = createForm.industry_type.trim()
    if (resolvedType === 'other') {
      const custom = createForm.customIndustryType.trim()
      if (!custom) {
        setCreateMessage({ type: 'error', text: 'Please describe the type when you choose "Others".' })
        return
      }
      resolvedType = custom
    }

    const lat = createForm.latitude
    const lng = createForm.longitude
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
      setCreateMessage({ type: 'error', text: 'Choose a location using the Google Map search or by clicking on the map.' })
      return
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setCreateMessage({ type: 'error', text: 'Coordinates are out of range.' })
      return
    }

    setCreateSubmitting(true)
    setCreateMessage(null)

    try {
      const { data, error } = await supabase.rpc('admin_create_shop', {
        p_admin_id: admin.id,
        p_store_name: name,
        p_location: location,
        p_industry: createForm.industry.trim(),
        p_industry_type: resolvedType,
        p_latitude: lat,
        p_longitude: lng,
        p_contact_info: createForm.contact_info.trim() || null,
        p_description: createForm.description.trim() || null,
        p_google_place_id: createForm.google_place_id?.trim() || null,
        p_business_account_id:
          createForm.brandMode === 'existing' && createForm.business_account_id
            ? createForm.business_account_id
            : null
      })

      if (error) throw error

      if (!data?.success) {
        setCreateMessage({ type: 'error', text: data?.error || 'Could not create store.' })
        return
      }

      const shopId = data.shop_id

      if (shopId && (createLogoFile || createBannerFiles.length > 0)) {
        setCreateMediaUploading(true)
        try {
          let logoUrl = null
          let bannerUrls = []
          if (createLogoFile) {
            logoUrl = await uploadShopLogo(supabase, admin.id, shopId, createLogoFile)
          }
          if (createBannerFiles.length > 0) {
            bannerUrls = await uploadShopBanners(supabase, admin.id, shopId, createBannerFiles)
          }
          await saveShopMedia(supabase, admin, shopId, { logoUrl, bannerUrls })
        } catch (mediaErr) {
          setCreateMessage({
            type: 'error',
            text: `Store created, but images failed to upload: ${mediaErr.message || 'Unknown error'}`
          })
          setCreateLogoFile(null)
          setCreateBannerFiles([])
          setCreateMediaUploading(false)
          await fetchStores()
          navigate(`/stores/${shopId}`)
          return
        } finally {
          setCreateMediaUploading(false)
        }
      }

      setCreateForm(defaultCreateForm())
      setCreateLogoFile(null)
      setCreateBannerFiles([])
      setShowCreateForm(false)
      setCreateMessage(null)
      await fetchStores()
      if (shopId) navigate(`/stores/${shopId}`)
    } catch (err) {
      setCreateMessage({ type: 'error', text: err.message || 'Could not create store.' })
    } finally {
      setCreateSubmitting(false)
    }
  }

  const businessAccountOptions = useMemo(() => {
    const map = new Map()
    for (const store of stores) {
      if (!store.business_account_id) continue
      if (map.has(store.business_account_id)) continue
      const sample = stores.find(s => s.business_account_id === store.business_account_id)
      const count = stores.filter(s => s.business_account_id === store.business_account_id).length
      map.set(store.business_account_id, {
        id: store.business_account_id,
        label: deriveBusinessName(sample?.store_name),
        locationCount: count
      })
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [stores])

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

  const couponCountByBusiness = useMemo(() => {
    const map = new Map()
    for (const { businessName, locations } of businessGroups) {
      const shopIdSet = new Set(locations.map(s => s.id))
      const distinct = new Set()
      for (const row of accountCoupons) {
        if (!row?.id) continue
        if (!couponAppliesToShopIds(row, shopIdSet)) continue
        distinct.add(`coupons:${row.id}`)
      }
      for (const row of accountStoreCoupons) {
        if (!row?.id || !shopIdSet.has(row.store_id)) continue
        distinct.add(`store_coupons:${row.id}`)
      }
      map.set(businessName, distinct.size)
    }
    return map
  }, [businessGroups, accountCoupons, accountStoreCoupons])

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setShowCreateForm(v => !v)
              setCreateMessage(null)
            }}
          >
            <Plus size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {showCreateForm ? 'Close form' : 'Add store'}
          </button>
          <button className="btn-ghost" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="detail-card" style={{ marginBottom: 24 }}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}><Store size={18} style={{ verticalAlign: 'middle', marginRight: 8 }} />Create a new store</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
            New rows are written to <code style={{ fontSize: '0.85em' }}>shops</code> with your account as owner for permissions.
            Pick the storefront on the map so the pin and address match Google's data; industry drives discovery categories.
          </p>
          {createMessage && (
            <div className={`alert ${createMessage.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
              {createMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {createMessage.text}
            </div>
          )}
          <form className="add-coupon-form" onSubmit={handleCreateStore}>
            <div className="form-group">
              <label>Business</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400, cursor: 'pointer' }}>
                  <input type="radio" name="brandMode" value="new" checked={createForm.brandMode === 'new'} onChange={handleCreateFieldChange} />
                  New business (creates a new brand account)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400, cursor: 'pointer' }}>
                  <input type="radio" name="brandMode" value="existing" checked={createForm.brandMode === 'existing'} onChange={handleCreateFieldChange} disabled={businessAccountOptions.length === 0} />
                  Add location to existing business
                </label>
              </div>
              {createForm.brandMode === 'existing' && (
                <select name="business_account_id" className="form-input" style={{ marginTop: 10 }} value={createForm.business_account_id} onChange={handleCreateFieldChange}>
                  <option value="">Select business…</option>
                  {businessAccountOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label} ({opt.locationCount} location{opt.locationCount === 1 ? '' : 's'})</option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-group">
              <label>Store name <span className="required">*</span></label>
              <input
                type="text"
                name="store_name"
                className="form-input"
                value={createForm.store_name}
                onChange={handleCreateFieldChange}
                placeholder="e.g. Cafe Nova – Central"
              />
            </div>
            <ShopMediaFields
              pendingLogoFile={createLogoFile}
              pendingBannerFiles={createBannerFiles}
              onPendingLogoFileChange={setCreateLogoFile}
              onPendingBannerFilesChange={setCreateBannerFiles}
              onError={(text) => setCreateMessage({ type: 'error', text })}
              disabled={createSubmitting}
              uploading={createMediaUploading}
            />
            <div className="form-group">
              <label>Location on map <span className="required">*</span></label>
              <GoogleMapsLocationPicker
                latitude={createForm.latitude}
                longitude={createForm.longitude}
                onLocationChange={handleMapLocationChange}
                disabled={createSubmitting}
              />
            </div>
            <div className="form-group">
              <label>Address (from map; you can edit) <span className="required">*</span></label>
              <input
                type="text"
                name="location"
                className="form-input"
                value={createForm.location}
                onChange={handleCreateFieldChange}
                placeholder="Filled when you search or click the map"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Industry <span className="required">*</span></label>
                <select
                  name="industry"
                  className="form-input"
                  value={createForm.industry}
                  onChange={handleCreateFieldChange}
                >
                  <option value="">Select industry</option>
                  {Object.entries(INDUSTRY_OPTIONS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>
                  {(createForm.industry && INDUSTRY_OPTIONS[createForm.industry]?.typeLabel) || 'Type'}{' '}
                  <span className="required">*</span>
                </label>
                <select
                  name="industry_type"
                  className="form-input"
                  value={createForm.industry_type}
                  onChange={handleCreateFieldChange}
                  disabled={!createForm.industry}
                >
                  <option value="">{createForm.industry ? 'Select type' : 'Choose industry first'}</option>
                  {(INDUSTRY_OPTIONS[createForm.industry]?.types || []).map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            {createForm.industry_type === 'other' && (
              <div className="form-group">
                <label>Custom type <span className="required">*</span></label>
                <input
                  type="text"
                  name="customIndustryType"
                  className="form-input"
                  value={createForm.customIndustryType}
                  onChange={handleCreateFieldChange}
                  placeholder="Describe the cuisine or specialty"
                />
              </div>
            )}
            <div className="form-group">
              <label>Contact (optional)</label>
              <input
                type="text"
                name="contact_info"
                className="form-input"
                value={createForm.contact_info}
                onChange={handleCreateFieldChange}
                placeholder="Phone or email"
              />
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <textarea
                name="description"
                className="form-input"
                rows={3}
                value={createForm.description}
                onChange={handleCreateFieldChange}
                placeholder="Short blurb for discovery"
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="submit" className="btn-primary" disabled={createSubmitting || createMediaUploading}>
                {createSubmitting || createMediaUploading ? 'Saving…' : 'Save store'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={createSubmitting || createMediaUploading}
                onClick={() => {
                  setCreateForm(defaultCreateForm())
                  setCreateLogoFile(null)
                  setCreateBannerFiles([])
                  setCreateMessage(null)
                }}
              >
                Reset fields
              </button>
            </div>
          </form>
        </div>
      )}

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
            <h3>No stores yet</h3>
            <p>Use <strong>Add store</strong> above to create one in the database, or approve businesses under Applications—they will show up here and on the public map.</p>
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
            const couponCount = couponCountByBusiness.get(businessName) ?? 0
            return (
              <div key={businessName} className="business-group">
                <button
                  type="button"
                  className="business-group-header"
                  onClick={() => setExpandedBusiness(prev => (prev === businessName ? null : businessName))}
                >
                  <span className="business-group-title">
                    {businessName}{' '}
                    <span className="business-group-count">
                      {locations.length} location{locations.length === 1 ? '' : 's'}
                      {' · '}
                      {couponCount} coupon{couponCount === 1 ? '' : 's'}
                    </span>
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
