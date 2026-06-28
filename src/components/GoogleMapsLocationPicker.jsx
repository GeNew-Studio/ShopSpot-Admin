import { useCallback, useEffect, useRef, useState } from 'react'
import { Autocomplete, GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api'

/** Hong Kong — matches most existing ShopSpot pins; map starts here until you search or click. */
const DEFAULT_CENTER = { lat: 22.3193, lng: 114.1694 }
const MAP_CONTAINER_STYLE = { width: '100%', height: 280, borderRadius: 8 }

const LIBRARIES = Object.freeze(['places'])

function pickerFromGeocodeResult(result, lat, lng) {
  const addr =
    typeof result?.formatted_address === 'string' && result.formatted_address.trim()
      ? result.formatted_address.trim()
      : `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  return {
    lat,
    lng,
    formattedAddress: addr,
    placeId: result?.place_id || null,
  }
}

/** @param {{ apiKey: string, latitude: number | null, longitude: number | null, onLocationChange: (p: { lat: number, lng: number, formattedAddress: string, placeId: string | null }) => void, disabled?: boolean }} props */
function GoogleMapsLocationPickerInner({ apiKey, latitude, longitude, onLocationChange, disabled }) {
  const acRef = useRef(null)

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'shopspot-admin-gmaps-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  })

  const [center, setCenter] = useState(() =>
    latitude != null && longitude != null ? { lat: latitude, lng: longitude } : DEFAULT_CENTER,
  )

  useEffect(() => {
    if (latitude != null && longitude != null) {
      setCenter({ lat: latitude, lng: longitude })
    }
  }, [latitude, longitude])

  const resolveClickOrDrag = useCallback(
    (lat, lng, placeIdHint = null) => {
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        const primary = status === 'OK' ? results?.[0] : null
        const payload = pickerFromGeocodeResult(primary || null, lat, lng)
        if (placeIdHint) payload.placeId = placeIdHint
        onLocationChange(payload)
        setCenter({ lat, lng })
      })
    },
    [onLocationChange],
  )

  const onAutocompleteChanged = useCallback(() => {
    const ac = acRef.current
    const place = ac?.getPlace?.()
    const loc = place?.geometry?.location
    if (!loc) return
    const lat = loc.lat()
    const lng = loc.lng()
    const formattedAddress =
      typeof place.formatted_address === 'string' && place.formatted_address.trim()
        ? place.formatted_address.trim()
        : pickerFromGeocodeResult(null, lat, lng).formattedAddress

    onLocationChange({
      lat,
      lng,
      formattedAddress,
      placeId: place.place_id || null,
    })
    setCenter({ lat, lng })
  }, [onLocationChange])

  const markerPos =
    latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null

  if (loadError) {
    return (
      <div className="alert alert-error">
        Could not load Google Maps. Check the API key and that billing is enabled on the Cloud project.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div
        style={{
          ...MAP_CONTAINER_STYLE,
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '0.9rem',
        }}
      >
        Loading map…
      </div>
    )
  }

  return (
    <div>
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label>Search Google Maps</label>
        <Autocomplete
          onLoad={(ac) => {
            acRef.current = ac
          }}
          onUnmount={() => {
            acRef.current = null
          }}
          fields={['formatted_address', 'geometry', 'place_id']}
          onPlaceChanged={onAutocompleteChanged}
        >
          <input
            type="text"
            className="form-input"
            placeholder="Business or address…"
            disabled={disabled}
            autoComplete="off"
          />
        </Autocomplete>
        <small style={{ display: 'block', marginTop: 6, color: 'var(--color-text-muted)' }}>
          Pick a suggestion, or click the map (and drag the pin) to set the storefront location.
        </small>
      </div>

      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={markerPos ? 16 : 12}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
        clickableIcons={!disabled}
        onClick={(e) => {
          if (disabled) return
          const ll = e.latLng
          if (!ll) return
          const placeIdHint = typeof e.placeId === 'string' ? e.placeId : null
          resolveClickOrDrag(ll.lat(), ll.lng(), placeIdHint)
        }}
      >
        {markerPos && (
          <Marker
            position={markerPos}
            draggable={!disabled}
            onDragEnd={(dragEvent) => {
              const end = dragEvent.latLng
              if (!end) return
              resolveClickOrDrag(end.lat(), end.lng())
            }}
          />
        )}
      </GoogleMap>
    </div>
  )
}

/** Map + Places search: fills address and coordinates from Google geodata. */
export default function GoogleMapsLocationPicker(props) {
  const rawKey = typeof import.meta.env.VITE_GOOGLE_MAPS_API_KEY === 'string'
    ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY.trim()
    : ''

  if (!rawKey) {
    return (
      <div className="alert alert-error">
        Add <code style={{ fontSize: '0.85em' }}>VITE_GOOGLE_MAPS_API_KEY</code> to your{' '}
        <code style={{ fontSize: '0.85em' }}>.env</code> file (enable{' '}
        <strong>Maps JavaScript API</strong> and <strong>Places API</strong> for your Google Cloud project), then restart{' '}
        <code style={{ fontSize: '0.85em' }}>npm run dev</code>.
      </div>
    )
  }

  return <GoogleMapsLocationPickerInner {...props} apiKey={rawKey} />
}
