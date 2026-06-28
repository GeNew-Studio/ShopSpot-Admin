import { useRef } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { validateShopImageFile } from '../lib/shopMediaUtils'

export default function ShopMediaFields({
  logoUrl = '',
  bannerUrls = [],
  pendingLogoFile = null,
  pendingBannerFiles = [],
  onLogoUrlChange,
  onBannerUrlsChange,
  onPendingLogoFileChange,
  onPendingBannerFilesChange,
  onError,
  disabled = false,
  uploading = false
}) {
  const logoInputRef = useRef(null)
  const bannerInputRef = useRef(null)

  const banners = Array.isArray(bannerUrls) ? bannerUrls : []
  const pendingBanners = Array.isArray(pendingBannerFiles) ? pendingBannerFiles : []

  const handleLogoPick = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const err = validateShopImageFile(file)
    if (err) {
      onError?.(err)
      return
    }
    onPendingLogoFileChange?.(file)
    onLogoUrlChange?.('')
  }

  const handleBannerPick = (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    for (const file of files) {
      const err = validateShopImageFile(file)
      if (err) {
        onError?.(err)
        return
      }
    }
    onPendingBannerFilesChange?.([...pendingBanners, ...files])
  }

  const removePendingLogo = () => onPendingLogoFileChange?.(null)

  const removePendingBanner = (index) => {
    onPendingBannerFilesChange?.(pendingBanners.filter((_, i) => i !== index))
  }

  const removeSavedBanner = (index) => {
    onBannerUrlsChange?.(banners.filter((_, i) => i !== index))
  }

  const logoPreview = pendingLogoFile ? URL.createObjectURL(pendingLogoFile) : logoUrl

  return (
    <div className="shop-media-fields">
      <div className="form-group">
        <label>Store logo (optional)</label>
        <p className="qr-upload-hint">Square PNG or JPG, up to 5MB</p>
        {logoPreview ? (
          <div className="shop-media-preview-row">
            <img src={logoPreview} alt="Store logo preview" className="shop-media-logo-preview" />
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={disabled || uploading}
              onClick={() => {
                if (pendingLogoFile) removePendingLogo()
                else onLogoUrlChange?.('')
              }}
            >
              <X size={14} /> Remove
            </button>
          </div>
        ) : (
          <div
            className="qr-upload-area"
            onClick={() => !disabled && !uploading && logoInputRef.current?.click()}
          >
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoPick}
              style={{ display: 'none' }}
              disabled={disabled || uploading}
            />
            <Upload size={24} />
            <span>{uploading ? 'Uploading…' : 'Upload logo'}</span>
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Store banners (optional)</label>
        <p className="qr-upload-hint">Wide images for the storefront. You can add multiple.</p>
        {(banners.length > 0 || pendingBanners.length > 0) && (
          <div className="shop-media-banner-grid">
            {banners.map((url, index) => (
              <div key={`saved-${url}-${index}`} className="shop-media-banner-item">
                <img src={url} alt={`Banner ${index + 1}`} className="shop-media-banner-img" />
                <button
                  type="button"
                  className="shop-media-banner-remove"
                  disabled={disabled || uploading}
                  onClick={() => removeSavedBanner(index)}
                  title="Remove banner"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {pendingBanners.map((file, index) => (
              <div key={`pending-${file.name}-${index}`} className="shop-media-banner-item">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`New banner ${index + 1}`}
                  className="shop-media-banner-img"
                />
                <button
                  type="button"
                  className="shop-media-banner-remove"
                  disabled={disabled || uploading}
                  onClick={() => removePendingBanner(index)}
                  title="Remove banner"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div
          className="qr-upload-area"
          onClick={() => !disabled && !uploading && bannerInputRef.current?.click()}
        >
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleBannerPick}
            style={{ display: 'none' }}
            disabled={disabled || uploading}
          />
          <ImageIcon size={24} />
          <span>{uploading ? 'Uploading…' : 'Add banner images'}</span>
        </div>
      </div>
    </div>
  )
}
