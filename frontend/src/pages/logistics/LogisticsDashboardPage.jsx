import { useEffect, useMemo, useState } from 'react'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js'
import { CircleMarker, MapContainer, Polyline, TileLayer, useMapEvents } from 'react-leaflet'
import { Bar, Doughnut } from 'react-chartjs-2'
import { useNavigate } from 'react-router-dom'

import { getLogisticsRequests, quoteRequest } from '../../api/logistics'
import Button from '../../components/shared/Button'
import Card from '../../components/shared/Card'
import PageShell from '../../components/shared/PageShell'
import StatusBadge from '../../components/shared/StatusBadge'
import useAuth from '../../hooks/useAuth'
import { openInvoiceWindow } from '../../utils/invoice'

const INDIA_CENTER = [22.9734, 78.6569]
const geocodeCache = new Map()

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend)

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

function calculateDistanceKm(start, end) {
  if (!start || !end) return null

  const toRad = (value) => (value * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRad(end.lat - start.lat)
  const dLon = toRad(end.lon - start.lon)
  const lat1 = toRad(start.lat)
  const lat2 = toRad(end.lat)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1) * Math.cos(lat2)
    * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusKm * c
}

const formatInr = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(Number(value || 0))

export default function LogisticsDashboardPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  const profile = user?.profile || {}
  const operatingStates = Array.isArray(profile.operating_states) ? profile.operating_states : []
  const profileVehicles = useMemo(() => {
    const vehicles = Array.isArray(profile.vehicles) ? profile.vehicles : []
    if (vehicles.length > 0) return vehicles

    // Backward compatibility for old profiles that still store one vehicle.
    return [
      {
        vehicle_type: profile.vehicle_type || '',
        max_weight_capacity: profile.max_weight_kg || 0,
        operating_states: operatingStates,
        vehicle_number: '',
      },
    ]
  }, [profile.vehicles, profile.vehicle_type, profile.max_weight_kg, operatingStates])
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

  const routeDistanceKm = useMemo(
    () => calculateDistanceKm(routeDraft.start, routeDraft.end),
    [routeDraft.start, routeDraft.end],
  )

  const revenueChartData = useMemo(() => {
    const totalsByStatus = new Map()

    requests.forEach((request) => {
      const status = formatStatus(request.status)
      const quotedFee = Number(request.quoted_fee || 0)
      if (!Number.isFinite(quotedFee) || quotedFee <= 0) return
      totalsByStatus.set(status, (totalsByStatus.get(status) || 0) + quotedFee)
    })

    const labels = Array.from(totalsByStatus.keys())
    const values = labels.map((label) => Number(totalsByStatus.get(label) || 0))

    return {
      labels,
      datasets: [
        {
          label: 'Revenue (INR)',
          data: values,
          backgroundColor: ['#16a34a', '#2563eb', '#f59e0b', '#14b8a6', '#8b5cf6'],
          borderRadius: 8,
        },
      ],
    }
  }, [requests])

  const totalRevenue = useMemo(
    () => requests.reduce((sum, request) => sum + (Number(request.quoted_fee) || 0), 0),
    [requests],
  )
  const totalRequestCount = requests.length

  const placesChartData = useMemo(() => {
    const ordersPerPlace = new Map()

    requests.forEach((request) => {
      const place = `${request.drop_city || 'Unknown'}, ${request.drop_state || 'Unknown'}`
      const current = ordersPerPlace.get(place) || new Set()
      current.add(Number(request.order))
      ordersPerPlace.set(place, current)
    })

    const sorted = Array.from(ordersPerPlace.entries())
      .map(([place, orderIds]) => ({ place, count: orderIds.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    return {
      labels: sorted.map((row) => row.place),
      datasets: [
        {
          label: 'Orders',
          data: sorted.map((row) => row.count),
          backgroundColor: ['#15803d', '#0f766e', '#1d4ed8', '#f59e0b', '#7c3aed', '#db2777'],
          borderWidth: 0,
        },
      ],
    }
  }, [requests])

  const topDestination = useMemo(
    () => (placesChartData.labels[0] ? String(placesChartData.labels[0]) : 'N/A'),
    [placesChartData.labels],
  )

  const revenueChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 900,
      easing: 'easeOutQuart',
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#4b5563',
          font: { size: 12, weight: 600 },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.24)',
          borderDash: [4, 4],
        },
        ticks: {
          color: '#6b7280',
          font: { size: 11 },
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.92)',
        titleColor: '#f9fafb',
        bodyColor: '#e5e7eb',
        cornerRadius: 10,
        padding: 10,
        callbacks: {
          label: (context) => `Revenue: ${formatInr(context.parsed.y)}`,
        },
      },
    },
  }), [])

  const placesChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeOutCubic',
    },
    cutout: '54%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#374151',
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 10,
          padding: 14,
          font: { size: 12, weight: 600 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        cornerRadius: 10,
        padding: 10,
        callbacks: {
          label: (context) => `${context.label}: ${context.parsed} orders`,
        },
      },
    },
  }), [])

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

  const handleGenerateLogisticsInvoice = (request) => {
    const totalValue = Number(request?.quoted_fee || request?.order_agreed_price || 0)
    const quantityValue = Number(request?.order_quantity || request?.weight_kg || 0)
    const routeText = `${request?.pickup_city || '-'}, ${request?.pickup_state || '-'} -> ${request?.drop_city || '-'}, ${request?.drop_state || '-'}`

    openInvoiceWindow({
      invoicePrefix: 'LINV',
      orderId: request?.order || request?.id,
      invoiceDate: request?.created_at ? new Date(request.created_at) : new Date(),
      title: 'KhetBazaar Logistics Invoice',
      subtitle: 'One-click logistics invoice',
      sellerLabel: 'Service Provider (Logistics)',
      sellerName: user?.first_name || user?.username || 'Logistics Partner',
      sellerAddress: routeText,
      buyerLabel: 'Farmer',
      buyerName: request?.farmer_name || 'Farmer',
      buyerAddress: `${request?.pickup_city || ''}, ${request?.pickup_state || ''}`,
      itemLabel: 'Service',
      itemName: `Logistics for ${request?.product_name || 'order'}`,
      quantity: quantityValue,
      total: totalValue,
      extraRows: [
        { label: 'Request Type', value: formatStatus(request?.status) },
        { label: 'Route', value: routeText },
      ],
    })
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
            <div className="space-y-2">
              <p><span className="font-medium">Vehicles:</span></p>
              <div className="space-y-2">
                {profileVehicles.map((vehicle, index) => {
                  const states = Array.isArray(vehicle?.operating_states) ? vehicle.operating_states : []
                  const capacity = vehicle?.max_weight_capacity ?? vehicle?.max_weight_kg ?? 0
                  return (
                    <div key={`vehicle-${index}`} className="rounded-[10px] border border-border bg-surface-2 px-3 py-2">
                      <p><span className="font-medium">#{index + 1}</span> {formatStatus(vehicle?.vehicle_type || '-')}</p>
                      {vehicle?.vehicle_number ? (
                        <p><span className="font-medium">Vehicle Number:</span> {vehicle.vehicle_number}</p>
                      ) : null}
                      <p><span className="font-medium">Max Weight Capacity:</span> {capacity} kg</p>
                      <p><span className="font-medium">Operating States:</span> {states.length ? states.join(', ') : '-'}</p>
                    </div>
                  )
                })}
              </div>
            </div>
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
          <p className="mb-4 text-lg font-semibold">Analytics</p>
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-3 py-2">
              <p className="text-xs uppercase tracking-wider text-emerald-700">Total Revenue</p>
              <p className="text-lg font-bold text-emerald-900">{formatInr(totalRevenue)}</p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white px-3 py-2">
              <p className="text-xs uppercase tracking-wider text-sky-700">Incoming Requests</p>
              <p className="text-lg font-bold text-sky-900">{totalRequestCount}</p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white px-3 py-2">
              <p className="text-xs uppercase tracking-wider text-violet-700">Top Destination</p>
              <p className="text-base font-bold text-violet-900">{topDestination}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[12px] border border-border bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
              <p className="text-sm font-medium text-text-primary">Total Revenue by Request Status</p>
              <p className="text-xs text-text-muted">Status-wise quoted fee breakdown</p>
              <div className="mt-3 h-64">
                {revenueChartData.labels.length > 0 ? (
                  <Bar
                    data={revenueChartData}
                    options={revenueChartOptions}
                  />
                ) : (
                  <p className="text-sm text-text-muted">No revenue data available yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-[12px] border border-border bg-gradient-to-b from-white to-slate-50 p-4 shadow-sm">
              <p className="text-sm font-medium text-text-primary">Places With Most Orders</p>
              <p className="text-xs text-text-muted">Based on unique order destinations</p>
              <div className="mt-3 h-64">
                {placesChartData.labels.length > 0 ? (
                  <Doughnut
                    data={placesChartData}
                    options={placesChartOptions}
                  />
                ) : (
                  <p className="text-sm text-text-muted">No destination data available yet.</p>
                )}
              </div>
            </div>
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
                <div
                  key={request.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectRequest(request)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleSelectRequest(request)
                    }
                  }}
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
                      <Button
                        type="button"
                        onClick={() => handleGenerateLogisticsInvoice(request)}
                        className="bg-accent px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                      >
                        Invoice
                      </Button>
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
                </div>
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

          <div className="mt-2 text-sm text-text-primary">
            <p className="font-medium">Approx Distance Between Places</p>
            <p>{routeDistanceKm ? `~${routeDistanceKm.toFixed(1)} km` : 'Approx distance will appear once both points are selected.'}</p>
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
