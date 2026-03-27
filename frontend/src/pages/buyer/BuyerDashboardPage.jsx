import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useNavigate } from 'react-router-dom'

import { getNegotiations } from '../../api/negotiations'
import { getOrders } from '../../api/orders'
import { getProducts } from '../../api/products'
import Button from '../../components/shared/Button'
import Card from '../../components/shared/Card'
import PageShell from '../../components/shared/PageShell'
import StatusBadge from '../../components/shared/StatusBadge'
import useAuth from '../../hooks/useAuth'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const DEFAULT_CENTER = [22.9734, 78.6569]
const NEARBY_RADIUS_KM = 300

const geocodeCache = new Map()

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180
  const earthRadius = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadius * c
}

async function geocodeLocation(query) {
  if (!query) return null
  if (geocodeCache.has(query)) return geocodeCache.get(query)

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )
  if (!response.ok) return null
  const data = await response.json()
  const first = data?.[0]
  if (!first) {
    geocodeCache.set(query, null)
    return null
  }
  const result = {
    lat: Number(first.lat),
    lon: Number(first.lon),
  }
  geocodeCache.set(query, result)
  return result
}

function formatStatus(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function BuyerDashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState([])
  const [negotiations, setNegotiations] = useState([])
  const [farmerProducts, setFarmerProducts] = useState([])
  const [buyerCoords, setBuyerCoords] = useState(null)
  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      const [ordersRes, negotiationsRes, productsRes] = await Promise.allSettled([getOrders(), getNegotiations(), getProducts()])

      if (ordersRes.status === 'fulfilled') {
        setOrders(Array.isArray(ordersRes.value.data) ? ordersRes.value.data : [])
      }
      if (negotiationsRes.status === 'fulfilled') {
        setNegotiations(Array.isArray(negotiationsRes.value.data) ? negotiationsRes.value.data : [])
      }
      if (productsRes.status === 'fulfilled') {
        setFarmerProducts(Array.isArray(productsRes.value.data) ? productsRes.value.data : [])
      } else {
        setFarmerProducts([])
      }

      if (ordersRes.status === 'rejected' && negotiationsRes.status === 'rejected') {
        setError('Could not load dashboard data. Please refresh.')
      }
      setLoading(false)
    }

    load()
  }, [])

  useEffect(() => {
    const loadMapData = async () => {
      setMapLoading(true)
      setMapError('')

      const buyerState = user?.profile?.state
      const buyerCity = user?.profile?.city
      if (!buyerCity || !buyerState) {
        setMapError('Buyer location is missing in profile. Add state and city to view nearby farmers.')
        setMapLoading(false)
        return
      }

      const location = await geocodeLocation(`${buyerCity}, ${buyerState}, India`)
      if (!location) {
        setMapError('Could not map buyer location right now.')
        setMapLoading(false)
        return
      }

      setBuyerCoords(location)
      setMapLoading(false)
    }

    loadMapData()
  }, [user])

  const nearbyFarmers = useMemo(() => {
    if (!buyerCoords) return []
    const unique = new Map()
    const rows = farmerProducts
      .map((product) => ({
        ...product,
        key: `${product.city}|${product.state}|${product.farmer_name || product.farmer}`,
      }))
      .filter((item) => item.city && item.state)

    for (const row of rows) {
      if (!unique.has(row.key)) {
        unique.set(row.key, row)
      }
    }

    return Array.from(unique.values())
  }, [buyerCoords, farmerProducts])

  const [farmerMarkers, setFarmerMarkers] = useState([])

  useEffect(() => {
    const buildMarkers = async () => {
      if (!buyerCoords || nearbyFarmers.length === 0) {
        setFarmerMarkers([])
        return
      }

      const markers = []
      for (const farmer of nearbyFarmers.slice(0, 30)) {
        const coords = await geocodeLocation(`${farmer.city}, ${farmer.state}, India`)
        if (!coords) continue
        const distanceKm = haversineKm(buyerCoords.lat, buyerCoords.lon, coords.lat, coords.lon)
        if (distanceKm <= NEARBY_RADIUS_KM) {
          markers.push({
            id: `${farmer.id}-${farmer.city}-${farmer.state}`,
            farmerName: farmer.farmer_name || 'Farmer',
            city: farmer.city,
            state: farmer.state,
            productName: farmer.name,
            lat: coords.lat,
            lon: coords.lon,
            distanceKm,
          })
        }
      }
      setFarmerMarkers(markers)
    }

    buildMarkers()
  }, [buyerCoords, nearbyFarmers])

  const stats = useMemo(() => {
    const activeOrders = orders.filter((order) => !['completed', 'delivered'].includes(order.status)).length
    const completedOrders = orders.filter((order) => order.status === 'completed').length
    const openNegotiations = negotiations.filter((item) => ['open', 'countered'].includes(item.status)).length

    return [
      { label: 'Total Orders', value: orders.length },
      { label: 'Active Orders', value: activeOrders },
      { label: 'Open Negotiations', value: openNegotiations },
      { label: 'Completed Orders', value: completedOrders },
    ]
  }, [orders, negotiations])

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders])
  const recentNegotiations = useMemo(() => negotiations.slice(0, 5), [negotiations])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <PageShell
      title="Buyer Dashboard"
      actions={<Button onClick={handleLogout}>Logout</Button>}
    >
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-sm text-text-muted">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-accent">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <p className="mb-4 text-lg font-semibold">Recent Orders</p>
          {loading && <p className="text-sm text-text-muted">Loading orders...</p>}
          {!loading && recentOrders.length === 0 && <p className="text-sm text-text-muted">No orders yet.</p>}
          {!loading && recentOrders.length > 0 && (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-[12px] border border-border px-3 py-2">
                  <div>
                    <p className="font-medium">{order.product_name || `Order #${order.id}`}</p>
                    <p className="text-xs text-text-muted">Qty: {order.quantity} | Rs {order.agreed_price}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <p className="mb-4 text-lg font-semibold">Recent Negotiations</p>
          {loading && <p className="text-sm text-text-muted">Loading negotiations...</p>}
          {!loading && recentNegotiations.length === 0 && <p className="text-sm text-text-muted">No negotiations yet.</p>}
          {!loading && recentNegotiations.length > 0 && (
            <div className="space-y-3">
              {recentNegotiations.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-[12px] border border-border px-3 py-2">
                  <div>
                    <p className="font-medium">Negotiation #{item.id}</p>
                    <p className="text-xs text-text-muted">Quantity: {item.quantity}</p>
                  </div>
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-text-primary">{formatStatus(item.status)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold">Nearby Farmers Map (OpenStreetMap)</p>
          <p className="text-sm text-text-muted">Radius: {NEARBY_RADIUS_KM} km</p>
        </div>
        {mapLoading && <p className="text-sm text-text-muted">Loading map...</p>}
        {!mapLoading && mapError && <p className="text-sm text-red-600">{mapError}</p>}
        {!mapLoading && !mapError && (
          <>
            <div className="mb-3 flex flex-wrap gap-2 text-sm text-text-muted">
              <span className="rounded-full bg-surface-2 px-3 py-1">Nearby farmers: {farmerMarkers.length}</span>
              <span className="rounded-full bg-surface-2 px-3 py-1">Buyer: {user?.profile?.city}, {user?.profile?.state}</span>
            </div>
            <div className="h-[420px] overflow-hidden rounded-[12px] border border-border">
              <MapContainer
                center={[buyerCoords.lat, buyerCoords.lon]}
                zoom={7}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                />
                <Marker position={[buyerCoords.lat, buyerCoords.lon]}>
                  <Popup>
                    You are here<br />
                    {user?.profile?.city}, {user?.profile?.state}
                  </Popup>
                </Marker>
                {farmerMarkers.map((marker) => (
                  <Marker key={marker.id} position={[marker.lat, marker.lon]}>
                    <Popup>
                      <strong>{marker.farmerName}</strong><br />
                      {marker.productName}<br />
                      {marker.city}, {marker.state}<br />
                      {marker.distanceKm.toFixed(1)} km away
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            {farmerMarkers.length === 0 && (
              <p className="mt-3 text-sm text-text-muted">No nearby farmers found within {NEARBY_RADIUS_KM} km yet.</p>
            )}
          </>
        )}
      </Card>

      {error && (
        <Card className="mt-4 border-red-300 bg-red-50 text-red-700">
          <p>{error}</p>
        </Card>
      )}
    </PageShell>
  )
}
