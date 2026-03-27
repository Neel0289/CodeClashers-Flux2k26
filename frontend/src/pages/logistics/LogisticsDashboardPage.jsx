import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, useMapEvents } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'

import { getLogisticsRequests, quoteRequest } from '../../api/logistics'
import Button from '../../components/shared/Button'
import Card from '../../components/shared/Card'
import PageShell from '../../components/shared/PageShell'
import StatusBadge from '../../components/shared/StatusBadge'
import useAuth from '../../hooks/useAuth'

const INDIA_CENTER = [22.9734, 78.6569]
const geocodeCache = new Map()

function RouteMapPicker({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

function formatStatus(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function LogisticsDashboardPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const profile = user?.profile || {}
  const operatingStates = Array.isArray(profile.operating_states) ? profile.operating_states : []
  const [routeDraft, setRouteDraft] = useState({ start: null, end: null })
  const [mapAddressLoading, setMapAddressLoading] = useState(false)
  const [routeError, setRouteError] = useState('')
  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestActionLoadingId, setRequestActionLoadingId] = useState(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [requestError, setRequestError] = useState('')
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [quoteModalRequest, setQuoteModalRequest] = useState(null)
  const [quoteValue, setQuoteValue] = useState('')

  useEffect(() => {
    const loadDashboard = async () => {
      setRequestsLoading(true)
      try {
        const requestsRes = await getLogisticsRequests()

        setRequests(Array.isArray(requestsRes.data) ? requestsRes.data : [])
      } catch {
        setRequests([])
      } finally {
        setRequestsLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const geocodeLocation = async (query) => {
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
    const result = { lat: Number(first.lat), lon: Number(first.lon) }
    geocodeCache.set(query, result)
    return result
  }

  const applyRouteFromRequest = async (request) => {
    if (!request) return

    const pickupCity = request.pickup_city
    const pickupState = request.pickup_state
    const dropCity = request.drop_city
    const dropState = request.drop_state
    if (!pickupCity || !pickupState || !dropCity || !dropState) return

    setMapAddressLoading(true)
    try {
      const [startCoords, endCoords] = await Promise.all([
        geocodeLocation(`${pickupCity}, ${pickupState}, India`),
        geocodeLocation(`${dropCity}, ${dropState}, India`),
      ])

      setRouteDraft({
        start: {
          lat: startCoords?.lat || INDIA_CENTER[0],
          lon: startCoords?.lon || INDIA_CENTER[1],
          city: pickupCity,
          state: pickupState,
        },
        end: {
          lat: endCoords?.lat || INDIA_CENTER[0],
          lon: endCoords?.lon || INDIA_CENTER[1],
          city: dropCity,
          state: dropState,
        },
      })
    } finally {
      setMapAddressLoading(false)
    }
  }

  useEffect(() => {
    const applyDefaultRouteFromRequest = async () => {
      const defaultRequest = requests.find((item) => ['pending', 'quoted', 'accepted'].includes(item.status))
      if (!defaultRequest) return
      setSelectedRequestId(defaultRequest.id)
      await applyRouteFromRequest(defaultRequest)
    }

    if (requests.length > 0 && !selectedRequestId) {
      applyDefaultRouteFromRequest()
    }
  }, [requests])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const reverseGeocodeAddress = async (lat, lon) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    )
    if (!response.ok) return { city: '', state: '' }
    const data = await response.json()
    const address = data?.address || {}
    return {
      city: address.city || address.town || address.village || address.county || '',
      state: address.state || '',
    }
  }

  const handleMapPick = async (lat, lon) => {
    setRouteError('')
    setMapAddressLoading(true)
    try {
      const resolved = await reverseGeocodeAddress(lat, lon)
      const point = {
        lat,
        lon,
        city: resolved.city,
        state: resolved.state,
      }
      // Click flow: 1st click sets start, 2nd sets end, 3rd starts a new route.
      setRouteDraft((prev) => {
        if (!prev.start || (prev.start && prev.end)) {
          return { start: point, end: null }
        }
        return { ...prev, end: point }
      })
    } catch {
      setRouteError('Could not resolve map location. Please try another point.')
    } finally {
      setMapAddressLoading(false)
    }
  }

  const handleSelectRequest = async (request) => {
    setSelectedRequestId(request.id)
    setRouteError('')
    await applyRouteFromRequest(request)
  }

  const openQuoteModal = (request) => {
    setQuoteModalRequest(request)
    setQuoteValue(request?.quoted_fee ? String(request.quoted_fee) : '')
    setRequestError('')
    setRequestMessage('')
  }

  const closeQuoteModal = () => {
    setQuoteModalRequest(null)
    setQuoteValue('')
  }

  const handleSendQuote = async () => {
    if (!quoteModalRequest) return
    const fee = Number(quoteValue)
    if (!Number.isFinite(fee) || fee <= 0) {
      setRequestError('Please enter a valid logistics price.')
      return
    }

    const requestId = quoteModalRequest.id
    setRequestError('')
    setRequestMessage('')
    setRequestActionLoadingId(requestId)
    try {
      const { data } = await quoteRequest(requestId, { quoted_fee: fee })
      setRequests((prev) => prev.map((item) => (item.id === requestId ? data : item)))
      setRequestMessage('Quote sent to farmer. Waiting for farmer accept/decline.')
      closeQuoteModal()
    } catch (err) {
      setRequestError(err?.response?.data?.detail || 'Could not send quote.')
    } finally {
      setRequestActionLoadingId(null)
    }
  }

  return (
    <PageShell
      title="Logistics Dashboard"
      actions={<Button onClick={handleLogout}>Logout</Button>}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="mb-4 text-lg font-semibold">Logistics Profile</p>
          <div className="space-y-2 text-sm text-text-primary">
            <p><span className="font-medium">Name:</span> {user?.first_name || '-'}</p>
            <p><span className="font-medium">Vehicle Type:</span> {profile.vehicle_type || '-'}</p>
            <p><span className="font-medium">Max Weight Capacity:</span> {profile.max_weight_kg || 0} kg</p>
            <p><span className="font-medium">Operating States:</span> {operatingStates.length ? operatingStates.join(', ') : '-'}</p>
          </div>
        </Card>

        <Card>
          <p className="mb-4 text-lg font-semibold">Performance</p>
          <div className="space-y-2 text-sm text-text-primary">
            <p><span className="font-medium">Rating:</span> {Number(profile.rating || 0).toFixed(1)}</p>
            <p><span className="font-medium">Total Deliveries:</span> {profile.total_deliveries || 0}</p>
            <p><span className="font-medium">Account Email:</span> {user?.email || '-'}</p>
            <p><span className="font-medium">Phone:</span> {user?.phone || '-'}</p>
          </div>
        </Card>

        <Card className="md:col-span-2">
          <p className="mb-4 text-lg font-semibold">Incoming Logistics Requests</p>
          {requestError && <p className="mb-2 text-sm text-red-600">{requestError}</p>}
          {requestMessage && <p className="mb-2 text-sm text-green-700">{requestMessage}</p>}
          {requestsLoading && <p className="text-sm text-text-muted">Loading requests...</p>}
          {!requestsLoading && requests.length === 0 && (
            <p className="text-sm text-text-muted">No requests available right now.</p>
          )}
          {!requestsLoading && requests.length > 0 && (
            <div className="space-y-3">
              {requests.slice(0, 10).map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => handleSelectRequest(request)}
                  className={`w-full rounded-[12px] border px-3 py-2 text-left transition-colors ${Number(selectedRequestId) === Number(request.id) ? 'border-emerald-600 bg-emerald-50' : 'border-border hover:border-emerald-300'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm text-text-primary">
                      <p className="font-medium">Farmer: {request.farmer_name || '-'}</p>
                      <p className="text-xs text-text-muted">Phone: {request.farmer_phone || '-'}</p>
                      <p className="text-xs text-text-muted">Order: #{request.order} | Product: {request.product_name || '-'}</p>
                      <p className="text-xs text-text-muted">Qty: {request.order_quantity || request.weight_kg} kg | Value: ₹{request.order_agreed_price || '-'}</p>
                      <p className="text-xs text-text-muted">
                        Route: {request.pickup_city}, {request.pickup_state} {'->'} {request.drop_city}, {request.drop_state}
                      </p>
                      <p className="text-xs text-text-muted">Request Type: {formatStatus(request.status)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={request.status} />
                      {request.status === 'pending' && (
                        <Button
                          type="button"
                          disabled={requestActionLoadingId === request.id}
                          onClick={() => openQuoteModal(request)}
                          className="bg-emerald-700 hover:bg-emerald-800"
                        >
                          {requestActionLoadingId === request.id ? 'Sending...' : 'Send Price Quote'}
                        </Button>
                      )}
                      {request.status === 'quoted' && (
                        <div className="text-right">
                          <p className="text-xs font-medium text-amber-700">Quoted: ₹{request.quoted_fee || '-'}</p>
                          <p className="text-xs font-medium text-blue-700">Farmer Decision Pending</p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="md:col-span-2">
          <p className="mb-4 text-lg font-semibold">Add Route</p>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-text-muted">
              Pickup/drop are auto-filled from the selected request route. Click any request above to change map route.{mapAddressLoading ? ' Resolving address...' : ''}
            </p>
          </div>

          <div className="mt-3 h-72 overflow-hidden rounded-[12px] border border-border">
            <MapContainer
              key={`${routeDraft.start?.lat || 's0'}-${routeDraft.end?.lat || 'e0'}`}
              center={routeDraft.start ? [routeDraft.start.lat, routeDraft.start.lon] : INDIA_CENTER}
              zoom={routeDraft.start ? 7 : 5}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              />
              <RouteMapPicker onPick={handleMapPick} />
              {routeDraft.start && (
                <CircleMarker
                  center={[routeDraft.start.lat, routeDraft.start.lon]}
                  radius={8}
                  pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.85 }}
                />
              )}
              {routeDraft.end && (
                <CircleMarker
                  center={[routeDraft.end.lat, routeDraft.end.lon]}
                  radius={8}
                  pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.85 }}
                />
              )}
              {routeDraft.start && routeDraft.end && (
                <Polyline
                  positions={[
                    [routeDraft.start.lat, routeDraft.start.lon],
                    [routeDraft.end.lat, routeDraft.end.lon],
                  ]}
                  pathOptions={{ color: '#0f766e', weight: 4 }}
                />
              )}
            </MapContainer>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 text-sm text-text-primary">
            <div>
              <p className="font-medium">Starting Point</p>
              <p>{routeDraft.start ? `${routeDraft.start.city || '-'}, ${routeDraft.start.state || '-'}` : 'Not selected'}</p>
            </div>
            <div>
              <p className="font-medium">Ending Point</p>
              <p>{routeDraft.end ? `${routeDraft.end.city || '-'}, ${routeDraft.end.state || '-'}` : 'Not selected'}</p>
            </div>
          </div>

          {routeError && <p className="mt-2 text-sm text-red-600">{routeError}</p>}
          <p className="mt-3 text-xs text-text-muted">Start/end are selected automatically from map clicks for route preview.</p>
        </Card>
      </div>

      {quoteModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-md rounded-[14px] bg-white p-5 shadow-xl">
            <p className="text-lg font-semibold text-text-primary">Send Logistics Price Quote</p>
            <p className="mt-1 text-sm text-text-muted">
              Order #{quoteModalRequest.order} | Route: {quoteModalRequest.pickup_city}, {quoteModalRequest.pickup_state} {'->'} {quoteModalRequest.drop_city}, {quoteModalRequest.drop_state}
            </p>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-text-primary">Price for logistics service (₹)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={quoteValue}
                onChange={(event) => setQuoteValue(event.target.value)}
                className="w-full rounded-[10px] border border-border px-3 py-2 text-text-primary"
                placeholder="Enter price"
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={closeQuoteModal} className="bg-gray-200 text-text-primary hover:bg-gray-300">
                Cancel
              </Button>
              <Button type="button" onClick={handleSendQuote} disabled={requestActionLoadingId === quoteModalRequest.id}>
                {requestActionLoadingId === quoteModalRequest.id ? 'Sending...' : 'Send Quote'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
