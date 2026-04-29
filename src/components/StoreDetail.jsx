import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import { addCoupon } from '../lib/couponUtils'
import {
  ArrowLeft, Building, Tag, Plus, Trash2, Crown, Clock,
  AlertCircle, CheckCircle, Sparkles, ShoppingCart, QrCode, Eye,
  Upload, X, Store, Utensils, ShoppingBag, Briefcase, Pencil
} from 'lucide-react'

const INDUSTRY_OPTIONS = {
  clothing: { label: 'Clothing & Fashion', typeLabel: 'Type of clothing', types: [
    { value: 'mens', label: "Men's Fashion" }, { value: 'womens', label: "Women's Fashion" },
    { value: 'kids', label: 'Kids & Baby' }, { value: 'sportswear', label: 'Activewear & Sports' },
    { value: 'shoes', label: 'Shoes & Footwear' }, { value: 'accessories', label: 'Accessories' },
    { value: 'mixed', label: 'Mixed/Department' }, { value: 'other', label: 'Others' }
  ]},
  food: { label: 'Restaurant & Food', typeLabel: 'Type of cuisine', types: [
    { value: 'korean', label: 'Korean' }, { value: 'chinese', label: 'Chinese' },
    { value: 'japanese', label: 'Japanese' }, { value: 'western', label: 'Western/American' },
    { value: 'italian', label: 'Italian' }, { value: 'fast_food', label: 'Fast Food' },
    { value: 'cafe', label: 'Cafe & Bakery' }, { value: 'dessert', label: 'Dessert & Ice Cream' },
    { value: 'southeast_asian', label: 'Southeast Asian' }, { value: 'indian', label: 'Indian' },
    { value: 'other', label: 'Others' }
  ]},
  supermarket: { label: 'Supermarket & Grocery', typeLabel: 'Store type', types: [
    { value: 'general_supermarket', label: 'General Supermarket' }, { value: 'convenience', label: 'Convenience Store' },
    { value: 'fresh_produce', label: 'Fresh Produce' }, { value: 'organic', label: 'Organic & Health' },
    { value: 'frozen', label: 'Frozen Goods' }, { value: 'other', label: 'Others' }
  ]},
  pharmacy: { label: 'Pharmacy & Health', typeLabel: 'Focus area', types: [
    { value: 'pharmacy', label: 'Pharmacy/Drugstore' }, { value: 'supplements', label: 'Vitamins & Supplements' },
    { value: 'medical_supplies', label: 'Medical Supplies' }, { value: 'optics', label: 'Optical/Eyewear' },
    { value: 'other', label: 'Others' }
  ]},
  electronics: { label: 'Electronics', typeLabel: 'Product type', types: [
    { value: 'mobile', label: 'Mobile & Accessories' }, { value: 'computers', label: 'Computers & IT' },
    { value: 'appliances', label: 'Home Appliances' }, { value: 'gaming', label: 'Gaming & Consoles' },
    { value: 'other', label: 'Others' }
  ]},
  services: { label: 'Services', typeLabel: 'Service type', types: [
    { value: 'spa', label: 'Spa & Wellness' }, { value: 'cleaning', label: 'Cleaning Services' },
    { value: 'repair', label: 'Repair Services' }, { value: 'laundry', label: 'Laundry & Dry Cleaning' },
    { value: 'other', label: 'Others' }
  ]},
  hotel_travel: { label: 'Hotel & Travel', typeLabel: 'Business type', types: [
    { value: 'theme_park', label: 'Theme Park' }, { value: 'hotel', label: 'Hotel' },
    { value: 'other', label: 'Others' }
  ]},
  beauty_spa: { label: 'Beauty & Spa', typeLabel: 'Service type', types: [
    { value: 'makeup', label: 'Makeup' }, { value: 'nails', label: 'Nails' },
    { value: 'spas', label: 'Spas' }, { value: 'hair', label: 'Hair' },
    { value: 'brows_lashes', label: 'Brows & Lashes' }, { value: 'massage', label: 'Massage' },
    { value: 'face_skin', label: 'Face & Skin' }, { value: 'other', label: 'Others' }
  ]},
  pet: { label: 'Pet', typeLabel: 'Business type', types: [
    { value: 'pet_store', label: 'Pet Store' }, { value: 'other', label: 'Others' }
  ]},
  baby_kids: { label: 'Baby & Kids', typeLabel: 'Business type', types: [
    { value: 'kids_baby', label: 'Kids & Baby' }, { value: 'other', label: 'Others' }
  ]},
  entertainment: { label: 'Entertainment', typeLabel: 'Business type', types: [
    { value: 'gaming', label: 'Gaming & Consoles' }, { value: 'other', label: 'Others' }
  ]},
  luxury: { label: 'Luxury', typeLabel: 'Business type', types: [
    { value: 'accessories', label: 'Accessories' }, { value: 'other', label: 'Others' }
  ]}
}

const WEEKDAYS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' }, { value: 7, label: 'Sun' }
]

const defaultForm = {
  coupon_name: '',
  discount_type: 'percentage',
  discount_value: '',
  expiration_date: '',
  noExpirationDate: false,
  is_active: true,
  conditions: '',
  industry: '',
  type: '',
  customIndustryType: '',
  coupon_usage_type: 'view_only',
  custom_qr_url: '',
  product_price: '',
  offer_type: 'regular',
  valid_weekdays: [],
  is_exclusive: false
}

export default function StoreDetail({ admin }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [store, setStore] = useState(null)
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [showAddCoupon, setShowAddCoupon] = useState(false)
  const [editingCouponId, setEditingCouponId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState(defaultForm)
  const [useCouponsTable, setUseCouponsTable] = useState(true)
  const [qrSource, setQrSource] = useState('auto')
  const [qrPreviewUrl, setQrPreviewUrl] = useState(null)
  const [uploadingQr, setUploadingQr] = useState(false)
  const qrFileRef = useRef(null)

  useEffect(() => {
    fetchStore()
  }, [id])

  useEffect(() => {
    if (formData.coupon_usage_type === 'qr_scan' && qrSource === 'auto' && showAddCoupon) {
      const data = formData.coupon_name
        ? `${window.location.origin}?coupon=${encodeURIComponent(formData.coupon_name)}`
        : `${window.location.origin}?coupon=preview`
      QRCode.toDataURL(data, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then(url => setQrPreviewUrl(url))
        .catch(() => setQrPreviewUrl(null))
    } else {
      setQrPreviewUrl(null)
    }
  }, [formData.coupon_usage_type, formData.coupon_name, qrSource, showAddCoupon])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const val = type === 'checkbox' ? checked : value
    setFormData(prev => {
      const updates = { [name]: val }
      if (name === 'industry') {
        updates.type = ''
        updates.customIndustryType = ''
      }
      return { ...prev, ...updates }
    })
  }

  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File must be under 5MB.' })
      return
    }
    setUploadingQr(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${admin.id}/qr_${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('certificates').upload(fileName, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(fileName)
      setFormData(prev => ({ ...prev, custom_qr_url: publicUrl }))
      setMessage({ type: 'success', text: 'QR image uploaded.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setUploadingQr(false)
    }
  }

  const fetchStore = async () => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      if (data) {
        setStore(data)
        await fetchCoupons()
      } else {
        setStore(null)
        setMessage({ type: 'error', text: 'Store not found' })
      }
    } catch (err) {
      setStore(null)
      setMessage({ type: 'error', text: err.message || 'Store not found' })
    } finally {
      setLoading(false)
    }
  }

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('shop_id', id)
        .order('created_at', { ascending: false })

      if (!error) {
        setCoupons(data || [])
        setUseCouponsTable(true)
      } else {
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_get_store_coupons', {
          p_admin_id: admin.id,
          p_store_id: id
        })
        if (!rpcError && rpcData?.success) {
          const list = rpcData.coupons || []
          setCoupons(list.map(c => ({
            ...c,
            coupon_name: c.coupon_name || c.code,
            conditions: c.conditions || c.description || '',
            discount_type: c.discount_type === 'percent' ? 'percentage' : (c.discount_type || 'fixed'),
            expiration_date: c.expiration_date ?? c.expires_at,
            coupon_usage_type: c.coupon_usage_type || 'view_only',
            is_exclusive: c.is_exclusive ?? c.is_exclusive_partner ?? false
          })))
          setUseCouponsTable(false)
        } else {
          setCoupons([])
        }
      }
    } catch {
      setCoupons([])
    }
  }

  const validate = (asDraft = false) => {
    if (!asDraft) {
      if (!formData.coupon_name?.trim()) {
        setMessage({ type: 'error', text: 'Coupon name is required.' })
        return false
      }
      if (!formData.noExpirationDate && !formData.expiration_date?.trim()) {
        setMessage({ type: 'error', text: 'Expiration date is required (or check "No expiration date").' })
        return false
      }
      if (!formData.industry?.trim()) {
        setMessage({ type: 'error', text: 'Industry is required.' })
        return false
      }
      if (!formData.type?.trim() && !(formData.type === 'other' && formData.customIndustryType?.trim())) {
        setMessage({ type: 'error', text: 'Type is required.' })
        return false
      }
      if (formData.discount_type !== 'bogo') {
        const val = parseFloat(formData.discount_value)
        if (isNaN(val) || val < 0) {
          setMessage({ type: 'error', text: 'Please enter a valid discount value (≥ 0).' })
          return false
        }
        if (formData.discount_type === 'percentage' && val > 100) {
          setMessage({ type: 'error', text: 'Percentage cannot exceed 100%.' })
          return false
        }
      }
      if (formData.coupon_usage_type === 'add_to_cart') {
        const p = parseFloat(formData.product_price)
        if (isNaN(p) || p < 0) {
          setMessage({ type: 'error', text: 'Product price is required for Add to Cart.' })
          return false
        }
      }
      if (formData.offer_type === 'special' && (!formData.valid_weekdays || formData.valid_weekdays.length === 0)) {
        setMessage({ type: 'error', text: 'Select at least one valid weekday for special offers.' })
        return false
      }
    }
    return true
  }

  const handleAddCoupon = async (e, asDraft = false) => {
    e.preventDefault()
    if (!validate(asDraft)) return

    const finalType = formData.type === 'other' && formData.customIndustryType
      ? formData.customIndustryType
      : formData.type
    const expirationDate = formData.noExpirationDate
      ? null
      : (formData.expiration_date?.trim() || null)
    const discountVal = formData.discount_type === 'bogo'
      ? 1
      : (parseFloat(formData.discount_value) || (asDraft ? 0 : NaN))
    const productPrice = formData.coupon_usage_type === 'add_to_cart'
      ? (parseFloat(formData.product_price) || null)
      : null
    const offerType = formData.offer_type || 'regular'
    const validWeekdays = offerType === 'special' && Array.isArray(formData.valid_weekdays) && formData.valid_weekdays.length > 0
      ? formData.valid_weekdays
      : null
    const couponName = (formData.coupon_name || '').trim() || (asDraft ? '(Draft)' : formData.coupon_name)

    if (!asDraft && formData.discount_type !== 'bogo' && (isNaN(discountVal) || discountVal < 0)) {
      setMessage({ type: 'error', text: 'Discount value is required.' })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      await addCoupon(supabase, admin, {
        shop_id: id,
        coupon_name: couponName,
        discount_type: formData.discount_type,
        discount_value: formData.discount_type === 'bogo' ? 1 : (Number.isFinite(discountVal) ? discountVal : 0),
        expiration_date: expirationDate,
        is_active: asDraft ? false : formData.is_active,
        conditions: formData.conditions || null,
        industry: formData.industry || null,
        type: (finalType && finalType.trim()) || null,
        coupon_usage_type: formData.coupon_usage_type || 'view_only',
        custom_qr_url: formData.coupon_usage_type === 'qr_scan' ? (formData.custom_qr_url || null) : null,
        product_price: productPrice,
        offer_type: offerType,
        valid_weekdays: validWeekdays,
        is_exclusive: formData.is_exclusive
      })

      setMessage({ type: 'success', text: asDraft ? 'Coupon saved as draft.' : 'Coupon added successfully!' })
      setShowAddCoupon(false)
      setFormData(defaultForm)
      setQrSource('auto')
      fetchStore()
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to add coupon' })
    } finally {
      setSubmitting(false)
    }
  }

  const resetCouponForm = () => {
    setShowAddCoupon(false)
    setEditingCouponId(null)
    setFormData(defaultForm)
    setQrSource('auto')
  }

  const normalizeDateForInput = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  }

  const handleStartEditCoupon = (coupon) => {
    const currentTypeOptions = INDUSTRY_OPTIONS[coupon.industry]?.types || []
    const knownType = currentTypeOptions.some(opt => opt.value === coupon.type)
    const isOtherType = coupon.type === 'other' || (!knownType && !!coupon.type)
    setEditingCouponId(coupon.id)
    setShowAddCoupon(true)
    setQrSource(coupon.custom_qr_url ? 'upload' : 'auto')
    setFormData({
      coupon_name: coupon.coupon_name || '',
      discount_type: coupon.discount_type || 'percentage',
      discount_value: coupon.discount_type === 'bogo' ? '1' : String(coupon.discount_value ?? ''),
      expiration_date: normalizeDateForInput(coupon.expiration_date),
      noExpirationDate: !coupon.expiration_date,
      is_active: !!coupon.is_active,
      conditions: coupon.conditions || '',
      industry: coupon.industry || '',
      type: isOtherType ? 'other' : (coupon.type || ''),
      customIndustryType: isOtherType && coupon.type !== 'other' ? coupon.type : '',
      coupon_usage_type: coupon.coupon_usage_type || 'view_only',
      custom_qr_url: coupon.custom_qr_url || '',
      product_price: coupon.product_price == null ? '' : String(coupon.product_price),
      offer_type: coupon.offer_type || 'regular',
      valid_weekdays: Array.isArray(coupon.valid_weekdays) ? coupon.valid_weekdays : [],
      is_exclusive: !!coupon.is_exclusive
    })
  }

  const handleUpdateCoupon = async (e) => {
    e.preventDefault()
    if (!editingCouponId) return
    if (!validate(false)) return

    const finalType = formData.type === 'other' && formData.customIndustryType
      ? formData.customIndustryType
      : formData.type
    const expirationDate = formData.noExpirationDate
      ? null
      : (formData.expiration_date?.trim() || null)
    const discountVal = formData.discount_type === 'bogo'
      ? 1
      : parseFloat(formData.discount_value)
    const productPrice = formData.coupon_usage_type === 'add_to_cart'
      ? (parseFloat(formData.product_price) || null)
      : null
    const offerType = formData.offer_type || 'regular'
    const validWeekdays = offerType === 'special' && Array.isArray(formData.valid_weekdays) && formData.valid_weekdays.length > 0
      ? formData.valid_weekdays
      : null

    if (formData.discount_type !== 'bogo' && (isNaN(discountVal) || discountVal < 0)) {
      setMessage({ type: 'error', text: 'Discount value is required.' })
      return
    }

    const updatePayload = {
      coupon_name: (formData.coupon_name || '').trim(),
      discount_type: formData.discount_type,
      discount_value: formData.discount_type === 'bogo' ? 1 : discountVal,
      expiration_date: expirationDate,
      is_active: formData.is_active,
      conditions: formData.conditions || null,
      industry: formData.industry || null,
      type: (finalType && finalType.trim()) || null,
      coupon_usage_type: formData.coupon_usage_type || 'view_only',
      custom_qr_url: formData.coupon_usage_type === 'qr_scan' ? (formData.custom_qr_url || null) : null,
      product_price: productPrice,
      offer_type: offerType,
      valid_weekdays: validWeekdays,
      is_exclusive: !!formData.is_exclusive
    }

    const normalizeDbDate = (value) => {
      if (!value) return null
      if (typeof value === 'string') return value.slice(0, 10)
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return null
      return d.toISOString().slice(0, 10)
    }

    const verifyCouponPersisted = (row) => {
      if (!row) return { ok: false, reason: 'Coupon not found after save.' }
      const expected = {
        coupon_name: updatePayload.coupon_name || null,
        discount_type: updatePayload.discount_type || null,
        discount_value: Number(updatePayload.discount_value),
        expiration_date: updatePayload.expiration_date || null,
        conditions: updatePayload.conditions || null,
        is_active: !!updatePayload.is_active,
        is_exclusive: !!updatePayload.is_exclusive
      }
      const actual = {
        coupon_name: row.coupon_name || null,
        discount_type: row.discount_type || null,
        discount_value: Number(row.discount_value),
        expiration_date: normalizeDbDate(row.expiration_date),
        conditions: row.conditions || null,
        is_active: !!row.is_active,
        is_exclusive: !!row.is_exclusive
      }
      const sameNumber = Number.isFinite(expected.discount_value) && Number.isFinite(actual.discount_value)
        ? Math.abs(expected.discount_value - actual.discount_value) < 0.000001
        : expected.discount_value === actual.discount_value
      const ok =
        expected.coupon_name === actual.coupon_name &&
        expected.discount_type === actual.discount_type &&
        sameNumber &&
        expected.expiration_date === actual.expiration_date &&
        expected.conditions === actual.conditions &&
        expected.is_active === actual.is_active &&
        expected.is_exclusive === actual.is_exclusive
      if (ok) return { ok: true, reason: '' }
      return {
        ok: false,
        reason: `Saved row mismatch. DB now has name="${actual.coupon_name}", type="${actual.discount_type}", value=${actual.discount_value}, expiration=${actual.expiration_date || 'null'}.`
      }
    }

    setSubmitting(true)
    setMessage(null)
    try {
      if (useCouponsTable) {
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_update_coupon', {
          p_admin_id: admin.id,
          p_coupon_id: editingCouponId,
          p_coupon_name: updatePayload.coupon_name,
          p_discount_type: updatePayload.discount_type,
          p_discount_value: updatePayload.discount_value,
          p_expiration_date: updatePayload.expiration_date,
          p_is_active: updatePayload.is_active,
          p_conditions: updatePayload.conditions,
          p_industry: updatePayload.industry,
          p_type: updatePayload.type,
          p_coupon_usage_type: updatePayload.coupon_usage_type,
          p_custom_qr_url: updatePayload.custom_qr_url,
          p_product_price: updatePayload.product_price,
          p_offer_type: updatePayload.offer_type,
          p_valid_weekdays: updatePayload.valid_weekdays,
          p_is_exclusive: updatePayload.is_exclusive
        })
        if (rpcError) throw rpcError
        if (!rpcData?.success) {
          throw new Error(rpcData?.error || 'No coupon record was updated. Please refresh and try again.')
        }
      } else {
        if (updatePayload.discount_type === 'bogo') {
          throw new Error('BOGO is not supported for this coupon source. Use percentage or fixed amount.')
        }
        const { data, error } = await supabase.rpc('admin_update_store_coupon', {
          p_admin_id: admin.id,
          p_coupon_id: editingCouponId,
          p_code: updatePayload.coupon_name,
          p_description: updatePayload.conditions,
          p_discount_type: updatePayload.discount_type === 'percentage' ? 'percent' : 'fixed',
          p_discount_value: updatePayload.discount_value,
          p_expires_at: updatePayload.expiration_date,
          p_is_exclusive_partner: !!updatePayload.is_exclusive
        })
        if (error) throw error
        if (!data?.success) throw new Error(data?.error || 'Failed to update coupon')
      }

      const { data: verifyRows, error: verifyError } = await supabase
        .from('coupons')
        .select('id, coupon_name, discount_type, discount_value, expiration_date, conditions, is_active, is_exclusive, updated_at')
        .eq('id', editingCouponId)
        .limit(1)
      if (verifyError) throw verifyError
      const verification = verifyCouponPersisted(verifyRows?.[0] || null)
      if (!verification.ok) {
        throw new Error(`Supabase verification failed. ${verification.reason}`)
      }

      const savedAt = verifyRows?.[0]?.updated_at
        ? new Date(verifyRows[0].updated_at).toLocaleString('en-US')
        : 'just now'
      setMessage({ type: 'success', text: `Coupon updated and verified in Supabase (${savedAt}).` })
      resetCouponForm()
      fetchStore()
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update coupon' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveCoupon = async (couponId) => {
    if (!confirm('Remove this coupon?')) return

    try {
      if (useCouponsTable) {
        const { error } = await supabase.from('coupons').delete().eq('id', couponId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.rpc('admin_remove_store_coupon', {
          p_admin_id: admin.id,
          p_coupon_id: couponId
        })
        if (error) throw error
        if (!data?.success) throw new Error(data?.error || 'Failed to remove')
      }
      setMessage({ type: 'success', text: 'Coupon removed.' })
      fetchStore()
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to remove coupon' })
    }
  }

  const toggleWeekday = (value) => {
    setFormData(f => ({
      ...f,
      valid_weekdays: f.valid_weekdays.includes(value)
        ? f.valid_weekdays.filter(d => d !== value)
        : [...f.valid_weekdays, value].sort((a, b) => a - b)
    }))
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading store...</p>
      </div>
    )
  }

  if (!store) {
    return (
      <div className="detail-page">
        <button className="back-link" onClick={() => navigate('/stores')}>
          <ArrowLeft size={18} /> Back to Stores
        </button>
        {message && (
          <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <AlertCircle size={18} />
            {message.text}
          </div>
        )}
        <div className="empty-state">
          <AlertCircle size={48} />
          <h3>Store not found</h3>
          <p>The store may not exist or may not be approved yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="detail-page">
      <button className="back-link" onClick={() => navigate('/stores')}>
        <ArrowLeft size={18} /> Back to Stores
      </button>

      <div className="detail-header">
        <h1>{store.store_name}</h1>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="detail-grid">
        {/* Left Column: Store Information */}
        <div>
          <div className="detail-card">
            <h2><Building size={18} /> Store Information</h2>
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Store Name</span>
                <span className="info-value">{store.store_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Description</span>
                <span className="info-value">{store.description || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Contact</span>
                <span className="info-value">{store.contact_info || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Address</span>
                <span className="info-value">{store.location}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Industry</span>
                <span className="info-value">{store.industry || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Created</span>
                <span className="info-value">{formatDate(store.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="detail-card coupons-card">
            <div className="coupons-header">
              <h2><Tag size={18} /> Coupons</h2>
              <button
                className="btn-primary"
                onClick={() => {
                  const nextOpen = !showAddCoupon
                  setShowAddCoupon(nextOpen)
                  if (nextOpen) {
                    setEditingCouponId(null)
                    setFormData(defaultForm)
                    setQrSource('auto')
                  } else {
                    resetCouponForm()
                  }
                }}
              >
                <Plus size={18} />
                {showAddCoupon ? 'Close' : 'Add Coupon'}
              </button>
            </div>

            {showAddCoupon && (
              <form className="add-coupon-form coupon-manager-form" onSubmit={editingCouponId ? handleUpdateCoupon : (e) => handleAddCoupon(e, false)}>
                <div className="form-group">
                  <label>Coupon Name <span className="required">*</span></label>
                  <input
                    type="text"
                    name="coupon_name"
                    placeholder="e.g. SAVE20"
                    value={formData.coupon_name}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Coupon Usage Type <span className="required">*</span></label>
                  <div className="usage-type-grid">
                    <label className={`usage-type-option ${formData.coupon_usage_type === 'qr_scan' ? 'selected' : ''}`}>
                      <input type="radio" name="coupon_usage_type" value="qr_scan" checked={formData.coupon_usage_type === 'qr_scan'} onChange={handleChange} />
                      <div className="usage-type-icon"><QrCode size={24} /></div>
                      <div className="usage-type-text">
                        <strong>QR Scan</strong>
                        <small>Customer scans QR at store</small>
                      </div>
                    </label>
                    <label className={`usage-type-option ${formData.coupon_usage_type === 'add_to_cart' ? 'selected' : ''}`}>
                      <input type="radio" name="coupon_usage_type" value="add_to_cart" checked={formData.coupon_usage_type === 'add_to_cart'} onChange={handleChange} />
                      <div className="usage-type-icon"><ShoppingCart size={24} /></div>
                      <div className="usage-type-text">
                        <strong>Add to Cart</strong>
                        <small>Product with fixed price</small>
                      </div>
                    </label>
                    <label className={`usage-type-option ${formData.coupon_usage_type === 'view_only' ? 'selected' : ''}`}>
                      <input type="radio" name="coupon_usage_type" value="view_only" checked={formData.coupon_usage_type === 'view_only'} onChange={handleChange} />
                      <div className="usage-type-icon"><Eye size={24} /></div>
                      <div className="usage-type-text">
                        <strong>View Only</strong>
                        <small>Display only, no redeem</small>
                      </div>
                    </label>
                  </div>
                </div>

                {formData.coupon_usage_type === 'qr_scan' && (
                  <div className="form-group qr-section">
                    <label>QR Code</label>
                    <div className="qr-source-toggle">
                      <button type="button" className={`qr-source-btn ${qrSource === 'auto' ? 'active' : ''}`} onClick={() => { setQrSource('auto'); setFormData(f => ({ ...f, custom_qr_url: '' })) }}>
                        <QrCode size={16} /> Auto-generate
                      </button>
                      <button type="button" className={`qr-source-btn ${qrSource === 'upload' ? 'active' : ''}`} onClick={() => setQrSource('upload')}>
                        <Upload size={16} /> Upload custom
                      </button>
                    </div>
                    {qrSource === 'auto' && (
                      <div className="qr-auto-section">
                        <div className="qr-auto-preview">
                          {qrPreviewUrl ? <img src={qrPreviewUrl} alt="QR Preview" className="qr-auto-img" /> : <div className="qr-auto-placeholder"><QrCode size={40} /></div>}
                        </div>
                        <p className="qr-auto-hint">{formData.coupon_name ? 'QR will link to coupon redemption' : 'Enter coupon name for QR preview'}</p>
                      </div>
                    )}
                    {qrSource === 'upload' && (
                      <div className="qr-upload-inner">
                        <p className="qr-upload-hint">PNG or JPG, up to 5MB</p>
                        {formData.custom_qr_url ? (
                          <div className="qr-preview-box">
                            <img src={formData.custom_qr_url} alt="Custom QR" className="qr-preview-img" />
                            <button type="button" className="btn-secondary btn-sm" onClick={() => setFormData(f => ({ ...f, custom_qr_url: '' }))}>
                              <X size={14} /> Remove
                            </button>
                          </div>
                        ) : (
                          <div className="qr-upload-area" onClick={() => qrFileRef.current?.click()}>
                            <input ref={qrFileRef} type="file" accept="image/*" onChange={handleQrUpload} style={{ display: 'none' }} />
                            <Upload size={24} />
                            <span>{uploadingQr ? 'Uploading...' : 'Upload QR image'}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {formData.coupon_usage_type === 'add_to_cart' && (
                  <div className="form-group">
                    <label>Product Price <span className="required">*</span></label>
                    <input type="number" name="product_price" value={formData.product_price} onChange={handleChange} placeholder="9.99" min="0" step="0.01" className="form-input" />
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label>Discount Type <span className="required">*</span></label>
                    <select name="discount_type" value={formData.discount_type} onChange={handleChange} className="form-input">
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                      <option value="bogo">BOGO</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Discount Value <span className="required">*</span></label>
                    <input
                      type="number"
                      name="discount_value"
                      value={formData.discount_type === 'bogo' ? '1' : formData.discount_value}
                      onChange={handleChange}
                      placeholder={formData.discount_type === 'percentage' ? '20' : formData.discount_type === 'fixed' ? '10.00' : '1'}
                      min="0"
                      step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Industry <span className="required">*</span></label>
                    <div className="input-icon">
                      <Store size={18} />
                      <select name="industry" value={formData.industry} onChange={handleChange} className="form-input">
                        <option value="">Select industry</option>
                        {Object.entries(INDUSTRY_OPTIONS).map(([key, { label }]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>{INDUSTRY_OPTIONS[formData.industry]?.typeLabel || 'Type'} <span className="required">*</span></label>
                    <div className="input-icon">
                      {formData.industry === 'food' ? <Utensils size={18} /> : formData.industry === 'clothing' ? <ShoppingBag size={18} /> : <Briefcase size={18} />}
                      <select name="type" value={formData.type} onChange={handleChange} className="form-input" disabled={!formData.industry}>
                        <option value="">Select type</option>
                        {INDUSTRY_OPTIONS[formData.industry]?.types.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    {formData.type === 'other' && (
                      <div className="input-icon" style={{ marginTop: 10 }}>
                        <Store size={18} />
                        <input type="text" value={formData.customIndustryType} onChange={e => setFormData(f => ({ ...f, customIndustryType: e.target.value }))} placeholder="Specify business type" className="form-input" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Offer Type</label>
                  <div className="offer-type-toggle">
                    <button type="button" className={`offer-type-btn ${formData.offer_type === 'special' ? 'active' : ''}`} onClick={() => setFormData(f => ({ ...f, offer_type: 'special', valid_weekdays: f.valid_weekdays || [] }))}>
                      {formData.offer_type === 'special' && <CheckCircle size={14} />} Special
                    </button>
                    <button type="button" className={`offer-type-btn ${formData.offer_type === 'regular' ? 'active' : ''}`} onClick={() => setFormData(f => ({ ...f, offer_type: 'regular', valid_weekdays: [] }))}>
                      {formData.offer_type === 'regular' && <CheckCircle size={14} />} Regular
                    </button>
                  </div>
                </div>

                {formData.offer_type === 'special' && (
                  <div className="form-group">
                    <label>Valid Weekdays <span className="required">*</span></label>
                    <p className="weekday-hint">Select days this offer is valid</p>
                    <div className="weekday-buttons">
                      {WEEKDAYS.map(({ value, label }) => (
                        <button key={value} type="button" className={`weekday-btn ${formData.valid_weekdays.includes(value) ? 'selected' : ''}`} onClick={() => toggleWeekday(value)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Expiration Date {!formData.noExpirationDate && <span className="required">*</span>}</label>
                  <label className="checkbox-label" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={formData.noExpirationDate}
                      onChange={e => {
                        const checked = e.target.checked
                        setFormData(f => ({ ...f, noExpirationDate: checked, expiration_date: checked ? '' : f.expiration_date }))
                      }}
                    />
                    No expiration date
                  </label>
                  <input type="date" name="expiration_date" value={formData.expiration_date} onChange={handleChange} className="form-input" disabled={formData.noExpirationDate} style={formData.noExpirationDate ? { opacity: 0.6 } : {}} />
                </div>

                <div className="form-group">
                  <label>Conditions</label>
                  <textarea name="conditions" value={formData.conditions} onChange={handleChange} placeholder="Terms and conditions..." className="form-input form-textarea" rows={3} />
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
                    Active (visible to customers)
                  </label>
                </div>

                <div className="exclusive-partner-toggle">
                  <label className="toggle-label">
                    <input type="checkbox" checked={formData.is_exclusive} onChange={e => setFormData(f => ({ ...f, is_exclusive: e.target.checked }))} className="toggle-checkbox" />
                    <span className="toggle-text"><Sparkles size={16} /> Set as <strong>Exclusive Partner</strong> coupon</span>
                  </label>
                  <p className="toggle-hint">Exclusive partner coupons are highlighted on the main website.</p>
                </div>

                <div className="form-actions modal-actions">
                  <button type="button" className="btn-secondary" onClick={resetCouponForm}>Cancel</button>
                  {!editingCouponId && (
                    <button type="button" className="btn-secondary btn-draft" onClick={(e) => handleAddCoupon(e, true)} disabled={submitting}>
                      {submitting ? 'Saving...' : 'Save as Draft'}
                    </button>
                  )}
                  <button type="submit" className="btn-success" disabled={submitting}>
                    {submitting ? (editingCouponId ? 'Updating...' : 'Adding...') : (editingCouponId ? 'Update Coupon' : 'Add Coupon')}
                  </button>
                </div>
              </form>
            )}

            {!showAddCoupon && coupons.length === 0 && (
              <div className="empty-coupons">
                <Tag size={32} />
                <p>No coupons yet. Add one to get started.</p>
              </div>
            )}

            {coupons.length > 0 && (
              <div className="coupons-list">
                {coupons.map(c => (
                  <div
                    key={c.id}
                    className={`coupon-item ${c.is_exclusive ? 'exclusive' : ''} ${isExpired(c.expiration_date) ? 'expired' : ''}`}
                  >
                    <div className="coupon-main">
                      <div className="coupon-code">
                        {c.is_exclusive && <Crown size={14} title="Exclusive Partner" />}
                        <code>{c.coupon_name}</code>
                      </div>
                      <div className="coupon-discount">{formatDiscount(c)}</div>
                      {c.conditions && <div className="coupon-desc">{c.conditions}</div>}
                      {c.expiration_date && (
                        <div className="coupon-expiry">
                          <Clock size={12} />
                          {isExpired(c.expiration_date) ? 'Expired' : `Expires ${formatDate(c.expiration_date)}`}
                        </div>
                      )}
                      <div className="coupon-meta">
                        {c.coupon_usage_type === 'view_only' && <Eye size={12} />}
                        {c.coupon_usage_type === 'qr_scan' && <QrCode size={12} />}
                        {c.coupon_usage_type === 'add_to_cart' && <ShoppingCart size={12} />}
                        <span>{c.coupon_usage_type}</span>
                      </div>
                    </div>
                    <div className="coupon-actions">
                      <button
                        className="coupon-edit"
                        onClick={() => handleStartEditCoupon(c)}
                        title="Edit coupon"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="coupon-remove"
                        onClick={() => handleRemoveCoupon(c.id)}
                        title="Remove coupon"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
