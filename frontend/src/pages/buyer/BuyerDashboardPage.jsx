import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useNavigate } from 'react-router-dom'

import { createNegotiation, getNegotiations, respondNegotiation } from '../../api/negotiations'
import { createOrder, getOrders } from '../../api/orders'
import { getProducts } from '../../api/products'
import Button from '../../components/shared/Button'
import Card from '../../components/shared/Card'
import Input from '../../components/shared/Input'
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
  const [orderingId, setOrderingId] = useState(null)
  const [orderProduct, setOrderProduct] = useState(null)
  const [orderQuantity, setOrderQuantity] = useState('')
  const [orderMode, setOrderMode] = useState('direct')
  const [offerPerKg, setOfferPerKg] = useState('')
  const [orderFormError, setOrderFormError] = useState('')
  const [counterOffers, setCounterOffers] = useState({})
  const [negotiationActionId, setNegotiationActionId] = useState(null)

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
    const grouped = new Map()
    const rows = farmerProducts.filter((item) => item.city && item.state)

    for (const product of rows) {
      const key = String(product.farmer || `${product.city}|${product.state}|${product.farmer_name || 'unknown'}`)
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          farmer: product.farmer,
          farmerName: product.farmer_name || 'Farmer',
          city: product.city,
          state: product.state,
          farmer_latitude: product.farmer_latitude,
          farmer_longitude: product.farmer_longitude,
          products: [],
        })
      }
      grouped.get(key).products.push(product)
    }

    return Array.from(grouped.values())
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
        let coords = null
        if (typeof farmer.farmer_latitude === 'number' && typeof farmer.farmer_longitude === 'number') {
          coords = { lat: farmer.farmer_latitude, lon: farmer.farmer_longitude }
        } else {
          coords = await geocodeLocation(`${farmer.city}, ${farmer.state}, India`)
        }
        if (!coords) continue
        const distanceKm = haversineKm(buyerCoords.lat, buyerCoords.lon, coords.lat, coords.lon)
        if (distanceKm <= NEARBY_RADIUS_KM) {
          markers.push({
            id: `${farmer.farmer || farmer.key}-${farmer.city}-${farmer.state}`,
            farmerName: farmer.farmerName || 'Farmer',
            city: farmer.city,
            state: farmer.state,
            products: farmer.products,
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

  const getLatestOfferTotal = (negotiation) => {
    const latest = negotiation?.messages?.[negotiation.messages.length - 1]
    if (!latest) return Number(negotiation?.latest_offered_price || 0)
    return Number(latest.offered_price || negotiation?.latest_offered_price || 0)
  }

  const getLatestOfferPerKg = (negotiation) => {
    const total = getLatestOfferTotal(negotiation)
    const qty = Number(negotiation?.quantity || 0)
    if (!qty) return 0
    return total / qty
  }

  const handleNegotiationAction = async (negotiation, action) => {
    setError('')
    setNegotiationActionId(negotiation.id)
    try {
      if (action === 'counter') {
        const perKg = Number(counterOffers[negotiation.id])
        if (!Number.isFinite(perKg) || perKg <= 0) {
          setError('Please enter a valid counter price per kg.')
          setNegotiationActionId(null)
          return
        }
        const total = perKg * Number(negotiation.quantity)
        await respondNegotiation(negotiation.id, {
          action: 'counter',
          offered_price: total,
          message: `Buyer counter offer: ₹${perKg}/kg`,
        })
      } else if (action === 'accept') {
        await respondNegotiation(negotiation.id, {
          action: 'accept',
          offered_price: getLatestOfferTotal(negotiation),
        })
      } else {
        await respondNegotiation(negotiation.id, { action: 'reject' })
      }

      const [negotiationsRes, ordersRes] = await Promise.allSettled([getNegotiations(), getOrders()])
      if (negotiationsRes.status === 'fulfilled') {
        setNegotiations(Array.isArray(negotiationsRes.value.data) ? negotiationsRes.value.data : [])
      }
      if (ordersRes.status === 'fulfilled') {
        setOrders(Array.isArray(ordersRes.value.data) ? ordersRes.value.data : [])
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to update negotiation.')
    } finally {
      setNegotiationActionId(null)
    }
  }

  const handlePlaceOrder = (product) => {
    setOrderProduct(product)
    setOrderQuantity('')
    setOrderMode('direct')
    setOfferPerKg('')
    setOrderFormError('')
  }

  const closeOrderForm = () => {
    setOrderProduct(null)
    setOrderQuantity('')
    setOrderMode('direct')
    setOfferPerKg('')
    setOrderFormError('')
  }

  const submitOrderForm = async (event) => {
    event.preventDefault()
    if (!orderProduct) return

    const quantity = Number(orderQuantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setOrderFormError('Please enter a valid quantity in kg.')
      return
    }

    if (quantity > Number(orderProduct.quantity_available || 0)) {
      setOrderFormError(`Requested quantity exceeds available stock (${orderProduct.quantity_available} kg).`)
      return
    }

    let offeredPerKgValue = null
    if (orderMode === 'negotiate') {
      offeredPerKgValue = Number(offerPerKg)
      if (!Number.isFinite(offeredPerKgValue) || offeredPerKgValue <= 0) {
        setOrderFormError('Please enter a valid negotiation price per kg.')
        return
      }
    }

    setOrderingId(orderProduct.id)
    setOrderFormError('')
    setError('')
    try {
      if (orderMode === 'negotiate') {
        const offeredTotal = offeredPerKgValue * quantity
        await createNegotiation({
          product: orderProduct.id,
          quantity,
          offered_price: offeredTotal,
          message: `Negotiation request: ₹${offeredPerKgValue}/kg for ${quantity} kg.`,
        })
      } else {
        await createOrder({ product: orderProduct.id, quantity })
      }

      const [ordersRes, productsRes] = await Promise.allSettled([getOrders(), getProducts()])
      const negotiationsRes = await getNegotiations().catch(() => null)
      if (ordersRes.status === 'fulfilled') {
        setOrders(Array.isArray(ordersRes.value.data) ? ordersRes.value.data : [])
      }
      if (productsRes.status === 'fulfilled') {
        setFarmerProducts(Array.isArray(productsRes.value.data) ? productsRes.value.data : [])
      }
      if (negotiationsRes?.data) {
        setNegotiations(Array.isArray(negotiationsRes.data) ? negotiationsRes.data : [])
      }
      closeOrderForm()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Could not place order. Please try again.'
      setOrderFormError(msg)
    } finally {
      setOrderingId(null)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
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
                <div key={order.id} className="rounded-[12px] border border-border px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">Farmer: {order.farmer_name || `Farmer #${order.farmer}`}</p>
                      <p className="text-xs text-text-muted">Ordered: {order.product_name || `Order #${order.id}`}</p>
                      <p className="text-xs text-text-muted">How much: {order.quantity} kg</p>
                      <p className="text-xs text-text-muted">Negotiated price: ₹{order.agreed_price}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
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
                <div key={item.id} className="rounded-[12px] border border-border px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">Farmer: {item.farmer_name || `Farmer #${item.farmer}`}</p>
                      <p className="text-xs text-text-muted">Ordered: {item.product_name || `Negotiation #${item.id}`}</p>
                      <p className="text-xs text-text-muted">Quantity: {item.quantity} kg</p>
                      <p className="text-xs text-text-muted">Negotiated price: ₹{getLatestOfferPerKg(item).toFixed(2)}/kg</p>
                    </div>
                    <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-text-primary">{formatStatus(item.status)}</span>
                  </div>

                  {['open', 'countered'].includes(item.status) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={counterOffers[item.id] || ''}
                        onChange={(event) => setCounterOffers((prev) => ({ ...prev, [item.id]: event.target.value }))}
                        placeholder="Counter ₹/kg"
                        className="w-32 rounded-[8px] border border-border px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        disabled={negotiationActionId === item.id}
                        onClick={() => handleNegotiationAction(item, 'counter')}
                        className="rounded-[8px] bg-amber-500 px-2 py-1 text-xs text-white hover:bg-amber-600 disabled:opacity-60"
                      >
                        Counter
                      </button>
                      <button
                        type="button"
                        disabled={negotiationActionId === item.id}
                        onClick={() => handleNegotiationAction(item, 'accept')}
                        className="rounded-[8px] bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={negotiationActionId === item.id}
                        onClick={() => handleNegotiationAction(item, 'reject')}
                        className="rounded-[8px] bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        Decline
                      </button>
                    </div>
                  )}
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
                      {marker.city}, {marker.state}<br />
                      {marker.distanceKm.toFixed(1)} km away
                      <hr className="my-2" />
                      <div className="space-y-2">
                        {marker.products.map((product) => (
                          <div key={product.id} className="rounded border border-border p-2">
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs">Category: {formatStatus(product.category)}</p>
                            <p className="text-xs">Price: ₹{product.base_price}/kg</p>
                            <p className="text-xs">Stock: {product.quantity_available} kg</p>
                            <p className="text-xs">Harvest: {product.harvest_date || 'N/A'}</p>
                            {product.description && <p className="mt-1 text-xs">{product.description}</p>}
                            <button
                              type="button"
                              disabled={orderingId === product.id}
                              onClick={() => handlePlaceOrder(product)}
                              className="mt-2 rounded bg-accent px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              {orderingId === product.id ? 'Placing...' : 'Place Order'}
                            </button>
                          </div>
                        ))}
                      </div>
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

      {orderProduct && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/45 p-4">
          <Card className="w-full max-w-md">
            <p className="text-xl font-semibold text-accent">Place Order</p>
            <p className="mt-2 text-sm text-text-muted">{orderProduct.name}</p>
            <p className="text-sm text-text-muted">Price: ₹{orderProduct.base_price}/kg</p>
            <p className="text-sm text-text-muted">Available: {orderProduct.quantity_available} kg</p>

            <form onSubmit={submitOrderForm} className="mt-4 space-y-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">Order Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderMode('direct')}
                    className={`rounded-[10px] border px-3 py-2 text-sm ${orderMode === 'direct' ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-primary'}`}
                  >
                    Buy at listed price
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderMode('negotiate')}
                    className={`rounded-[10px] border px-3 py-2 text-sm ${orderMode === 'negotiate' ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-primary'}`}
                  >
                    Negotiate price
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">Quantity (kg)</label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={orderQuantity}
                  onChange={(event) => setOrderQuantity(event.target.value)}
                  placeholder="Enter quantity in kg"
                  required
                />
              </div>

              {orderMode === 'negotiate' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-text-primary">Your Offer (₹/kg)</label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={offerPerKg}
                    onChange={(event) => setOfferPerKg(event.target.value)}
                    placeholder="Enter your price per kg"
                    required
                  />
                </div>
              )}

              {orderFormError && <p className="text-sm text-red-600">{orderFormError}</p>}
              <div className="flex gap-2">
                <Button type="button" onClick={closeOrderForm} className="bg-surface-2 text-text-primary hover:bg-surface-2">
                  Cancel
                </Button>
                <Button type="submit" disabled={orderingId === orderProduct.id}>
                  {orderingId === orderProduct.id ? 'Submitting...' : (orderMode === 'negotiate' ? 'Send Negotiation' : 'Confirm Order')}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </>
  )
}
