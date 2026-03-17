/**
 * Shared coupon logic matching main website CouponManager.
 * Used when admin adds coupons on behalf of a store.
 */

/**
 * @param {object} supabase - Supabase client
 * @param {object} admin - { id } admin user
 * @param {object} payload - coupon payload
 * @param {string} payload.shop_id - store/shop id
 * @param {string} payload.coupon_name
 * @param {string} payload.discount_type - 'percentage' | 'fixed' | 'bogo'
 * @param {number} payload.discount_value
 * @param {string|null} payload.expiration_date
 * @param {boolean} [payload.is_active=true]
 * @param {string|null} [payload.conditions]
 * @param {string|null} [payload.industry]
 * @param {string|null} [payload.type]
 * @param {string} [payload.coupon_usage_type='view_only'] - 'view_only' | 'qr_scan' | 'add_to_cart'
 * @param {string|null} [payload.custom_qr_url]
 * @param {number|null} [payload.product_price]
 * @param {string} [payload.offer_type='regular'] - 'regular' | 'special'
 * @param {number[]|null} [payload.valid_weekdays]
 * @param {boolean} [payload.is_exclusive=false] - admin-only flag for exclusive partner coupons
 */
export async function addCoupon(supabase, admin, payload) {
  const {
    shop_id,
    coupon_name,
    discount_type,
    discount_value,
    expiration_date = null,
    is_active = true,
    conditions = null,
    industry = null,
    type = null,
    coupon_usage_type = 'view_only',
    custom_qr_url = null,
    product_price = null,
    offer_type = 'regular',
    valid_weekdays = null,
    is_exclusive = false
  } = payload

  const discountVal =
    discount_type === 'bogo'
      ? 1
      : (parseFloat(discount_value) || 0)

  const productPrice =
    coupon_usage_type === 'add_to_cart'
      ? (parseFloat(product_price) || null)
      : null

  const expirationDate =
    expiration_date?.trim() ? expiration_date.trim() : null

  const validWeekdays =
    offer_type === 'special' && Array.isArray(valid_weekdays) && valid_weekdays.length > 0
      ? valid_weekdays
      : null

  const customQrUrl =
    coupon_usage_type === 'qr_scan' ? (custom_qr_url || null) : null

  const row = {
    shop_id,
    assigned_shop_ids: [shop_id],
    coupon_group_id: null,
    coupon_name: (coupon_name || '').trim(),
    discount_type: discount_type || 'percentage',
    discount_value: discountVal,
    expiration_date: expirationDate,
    user_id: admin.id,
    is_active,
    conditions: conditions || null,
    industry: industry || null,
    type: (type && type.trim()) || null,
    coupon_usage_type,
    custom_qr_url: customQrUrl,
    product_price: productPrice,
    offer_type: offer_type || 'regular',
    valid_weekdays: validWeekdays
  }
  row.is_exclusive = !!is_exclusive
  const rows = [row]

  const { error } = await supabase.from('coupons').insert(rows)
  if (error) throw error
}
