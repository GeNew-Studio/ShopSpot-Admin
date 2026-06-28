export const SHOP_IMAGE_BUCKET = 'logos'
export const SHOP_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export function validateShopImageFile(file) {
  if (!file) return 'No file selected.'
  if (!file.type.startsWith('image/')) return 'Please upload an image file.'
  if (file.size > SHOP_IMAGE_MAX_BYTES) return 'Image must be under 5MB.'
  return null
}

export async function uploadShopImage(supabase, adminId, shopId, file, kind) {
  const validationError = validateShopImageFile(file)
  if (validationError) throw new Error(validationError)

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const fileName = `${adminId}/shops/${shopId}/${kind}_${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(SHOP_IMAGE_BUCKET).upload(fileName, file, {
    cacheControl: '3600',
    upsert: false
  })
  if (error) throw error

  const { data: { publicUrl } } = supabase.storage.from(SHOP_IMAGE_BUCKET).getPublicUrl(fileName)
  return publicUrl
}

export async function uploadShopLogo(supabase, adminId, shopId, file) {
  return uploadShopImage(supabase, adminId, shopId, file, 'logo')
}

export async function uploadShopBanners(supabase, adminId, shopId, files) {
  const list = Array.from(files || [])
  const urls = []
  for (const file of list) {
    urls.push(await uploadShopImage(supabase, adminId, shopId, file, 'banner'))
  }
  return urls
}

export function normalizeBannerUrls(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  return [value].filter(Boolean)
}

export async function saveShopMedia(supabase, admin, shopId, { logoUrl, bannerUrls }) {
  const banners = normalizeBannerUrls(bannerUrls)
  const { data, error } = await supabase.rpc('admin_update_shop', {
    p_admin_id: admin.id,
    p_shop_id: shopId,
    p_logo_url: logoUrl || null,
    p_banner_urls: banners.length > 0 ? banners : null
  })
  if (error) throw error
  if (!data?.success) throw new Error(data?.error || 'Could not save store images.')
  return data
}
