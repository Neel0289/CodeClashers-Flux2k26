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

import { getLogisticsRequests, pickupRequest, quoteRequest } from '../../api/logistics'
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
  if (String(value || '') === 'picked_up') {
    return 'Shipped'
  }
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

  const handleMarkShipped = async (requestId) => {
    setRequestError('')
    setRequestMessage('')
    setRequestActionLoadingId(requestId)
    try {
      const { data } = await pickupRequest(requestId)
      setRequests((prev) => prev.map((item) => (item.id === requestId ? data : item)))
      setRequestMessage('Shipment status updated. Buyer and farmer can now see this order as shipped.')
    } catch (err) {
      setRequestError(err?.response?.data?.detail || 'Could not mark this order as shipped.')
    } finally {
      setRequestActionLoadingId(null)
    }
  }

  return (
    <div className="min-h-screen farm-bg pb-12">
      <PageShell
        title={
          <div className="flex items-center gap-2">
            <span className="text-3xl">🚚</span>
            <span>Logistics Dashboard</span>
          </div>
        }
        actions={
          <div className="flex gap-2">
            <Button onClick={() => navigate('/logistics/profile')} className="bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-white transition-colors">
              My Profile
            </Button>
            <Button onClick={handleLogout}>Logout</Button>
          </div>
        }
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Card variant="clay">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-100 p-2 rounded-xl text-emerald-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary">Logistics Profile</h2>
            </div>
            <div className="space-y-3 text-sm text-text-primary">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <span className="text-text-muted">Name</span>
                <span className="font-semibold">{user?.first_name || '-'}</span>
              </div>
              <div className="space-y-3 pt-2">
                <p className="font-semibold text-text-muted uppercase text-xs tracking-wider">Managed Vehicles</p>
                <div className="space-y-3">
                  {profileVehicles.map((vehicle, index) => {
                    const states = Array.isArray(vehicle?.operating_states) ? vehicle.operating_states : []
                    const capacity = vehicle?.max_weight_capacity ?? vehicle?.max_weight_kg ?? 0
                    return (
                      <div key={`vehicle-${index}`} className="clay-input rounded-2xl p-4 bg-white/50 border border-emerald-50">
                        <div className="flex justify-between mb-2">
                          <span className="bg-emerald-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Vehicle #{index + 1}</span>
                          <span className="font-bold text-emerald-700">{formatStatus(vehicle?.vehicle_type || '-')}</span>
                        </div>
                        {vehicle?.vehicle_number && (
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-text-muted">Number:</span>
                            <span className="font-medium">{vehicle.vehicle_number}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-text-muted">Capacity:</span>
                          <span className="font-medium text-emerald-600">{capacity} kg</span>
                        </div>
                        <div className="text-xs">
                          <span className="text-text-muted block mb-1">Operating States:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {states.length ? states.map((s) => (
                              <span key={s} className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-medium border border-emerald-200">{s}</span>
                            )) : <span className="text-text-muted italic">-</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>
  
          <Card variant="clay">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-sky-100 p-2 rounded-xl text-sky-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary">Performance Summary</h2>
            </div>
            <div className="space-y-4 text-sm text-text-primary">
              <div className="grid grid-cols-2 gap-4">
                <div className="clay-input rounded-2xl p-4 text-center">
                  <p className="text-xs text-text-muted uppercase font-bold tracking-tight mb-1">Rating</p>
                  <p className="text-3xl font-black text-sky-700">{Number(profile.rating || 0).toFixed(1)} <span className="text-sm font-normal text-text-muted">/ 5.0</span></p>
                </div>
                <div className="clay-input rounded-2xl p-4 text-center">
                  <p className="text-xs text-text-muted uppercase font-bold tracking-tight mb-1">Deliveries</p>
                  <p className="text-3xl font-black text-emerald-700">{profile.total_deliveries || 0}</p>
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-text-muted">Email</span>
                  <span className="font-medium truncate max-w-[180px]">{user?.email || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Phone</span>
                  <span className="font-medium">{user?.phone || '-'}</span>
                </div>
              </div>
            </div>
          </Card>
  
          <Card variant="clay" className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-amber-100 p-2 rounded-xl text-amber-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary">Analytics Insights</h2>
            </div>
  
            <div className="mb-8 grid gap-4 md:grid-cols-3">
              <div className="clay-card bg-emerald-600 p-5 text-white rounded-[24px]">
                <p className="text-[10px] uppercase font-black tracking-widest opacity-80 mb-1">Total Revenue</p>
                <p className="text-3xl font-black tracking-tighter">{formatInr(totalRevenue)}</p>
              </div>
              <div className="clay-card bg-sky-600 p-5 text-white rounded-[24px]">
                <p className="text-[10px] uppercase font-black tracking-widest opacity-80 mb-1">Incoming Requests</p>
                <p className="text-3xl font-black tracking-tighter">{totalRequestCount}</p>
              </div>
              <div className="clay-card bg-violet-600 p-5 text-white rounded-[24px]">
                <p className="text-[10px] uppercase font-black tracking-widest opacity-80 mb-1">Top Destination</p>
                <p className="text-xl font-black tracking-tight truncate">{topDestination}</p>
              </div>
            </div>
  
            <div className="grid gap-6 md:grid-cols-2">
              <div className="clay-input rounded-[28px] p-6 bg-white/40 border border-white/60">
                <h3 className="text-sm font-bold text-text-primary mb-1 uppercase tracking-tight">Revenue Breakdown</h3>
                <p className="text-[10px] text-text-muted mb-4 uppercase font-medium">Status-wise quoted fee distribution</p>
                <div className="h-64">
                  {revenueChartData.labels.length > 0 ? (
                    <Bar data={revenueChartData} options={revenueChartOptions} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-text-muted italic text-sm">No revenue data available.</div>
                  )}
                </div>
              </div>
  
              <div className="clay-input rounded-[28px] p-6 bg-white/40 border border-white/60">
                <h3 className="text-sm font-bold text-text-primary mb-1 uppercase tracking-tight">Top Routes</h3>
                <p className="text-[10px] text-text-muted mb-4 uppercase font-medium">Frequent destination cities</p>
                <div className="h-64">
                  {placesChartData.labels.length > 0 ? (
                    <Doughnut data={placesChartData} options={placesChartOptions} />
                  ) : (
                    <div className="h-full flex items-center justify-center text-text-muted italic text-sm">No destination data available.</div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card variant="clay" className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-100 p-2 rounded-xl text-orange-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary">Incoming Logistics Requests</h2>
            </div>
            
            {requestError && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">{requestError}</div>}
            {requestMessage && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium">{requestMessage}</div>}
            
            {requestsLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-2"></div>
                <p className="text-sm text-text-muted">Loading requests...</p>
              </div>
            )}
            
            {!requestsLoading && requests.length === 0 && (
              <div className="text-center py-12 clay-input rounded-3xl bg-white/30 border-dashed border-2 border-border">
                <p className="text-text-muted italic">No requests available right now.</p>
              </div>
            )}
            
            {!requestsLoading && requests.length > 0 && (
              <div className="grid gap-4">
                {requests.slice(0, 10).map((request) => (
                  <div
                    key={request.id}
                    onClick={() => handleSelectRequest(request)}
                    className={`group relative overflow-hidden rounded-[24px] border transition-all duration-300 cursor-pointer ${
                      Number(selectedRequestId) === Number(request.id) 
                        ? 'border-emerald-500 shadow-lg ring-1 ring-emerald-500 bg-emerald-50/50' 
                        : 'border-border bg-white hover:border-emerald-300 hover:shadow-md'
                    }`}
                  >
                    <div className="p-5 md:p-6">
                      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${Number(selectedRequestId) === Number(request.id) ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'} transition-colors`}>
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          </div>
                          <div>
                            <h3 className="text-2xl font-black tracking-tight text-text-primary">Order #{request.order}</h3>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{request.product_name || 'Agri Product'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={request.status} />
                          <Button
                            variant="clay"
                            onClick={(e) => { e.stopPropagation(); handleGenerateLogisticsInvoice(request); }}
                            className="rounded-full bg-emerald-700 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white"
                          >
                            Invoice
                          </Button>
                        </div>
                      </div>

                      <div className="mb-4 rounded-[20px] border border-white/80 bg-white/70 px-4 py-3 shadow-inner">
                        <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                          <div className="md:border-r md:border-emerald-100">
                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-text-muted">Quantity</p>
                            <p className="text-3xl font-black text-emerald-700 leading-none">{request.order_quantity || request.weight_kg}<span className="ml-1 text-sm font-bold text-text-muted">kg</span></p>
                          </div>
                          <div className="md:border-r md:border-emerald-100">
                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-text-muted">Value</p>
                            <p className="text-3xl font-black text-emerald-700 leading-none">₹{request.order_agreed_price || '-'}</p>
                          </div>
                          <div className="md:border-r md:border-emerald-100">
                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-text-muted">Farmer</p>
                            <p className="truncate text-xl font-black text-text-primary">{request.farmer_name || '-'}</p>
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-text-muted">Contact</p>
                            <p className="text-xl font-black text-text-primary">{request.farmer_phone || '-'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <div className="rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-700">📍 {request.pickup_city}</div>
                          <span className="text-lg font-bold text-text-muted">→</span>
                          <div className="rounded-full bg-emerald-100 px-4 py-2 font-semibold text-emerald-800">🎯 {request.drop_city}</div>
                        </div>

                        {request.status === 'pending' && (
                          <Button
                            variant="clay"
                            disabled={requestActionLoadingId === request.id}
                            onClick={(e) => { e.stopPropagation(); openQuoteModal(request); }}
                            className="rounded-full bg-emerald-700 px-5 py-2.5 text-white font-bold"
                          >
                            {requestActionLoadingId === request.id ? 'Sending...' : 'Send Price Quote'}
                          </Button>
                        )}
                        {request.status === 'quoted' && (
                          <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2">
                            <div className="text-right">
                              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Our Quote</p>
                              <p className="text-lg font-black text-amber-700">₹{request.quoted_fee || '-'}</p>
                            </div>
                            <div className="h-8 w-px bg-amber-200" />
                            <p className="text-xs font-bold text-amber-600 animate-pulse">Decision Pending</p>
                          </div>
                        )}
                        {request.status === 'accepted' && (
                          <Button
                            variant="clay"
                            disabled={requestActionLoadingId === request.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkShipped(request.id)
                            }}
                            className="rounded-full bg-sky-700 px-5 py-2.5 text-white font-bold"
                          >
                            {requestActionLoadingId === request.id ? 'Updating...' : 'Mark as Shipped'}
                          </Button>
                        )}
                        {request.status === 'picked_up' && (
                          <div className="flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-bold text-sky-700">
                            <span>🚚</span> Shipment already marked
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
  
          <Card variant="clay" className="md:col-span-2 overflow-hidden border-none">
            <div className="bg-gradient-to-r from-sky-600 to-emerald-600 p-6 -mx-8 -mt-8 mb-8">
              <div className="flex items-center gap-4 text-white">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md shadow-inner">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A2 2 0 013 15.485V6.447a2 2 0 011.106-1.789l5.447-2.724a2 2 0 011.894 0l5.447 2.724A2 2 0 0118 6.447v9.038a2 2 0 01-1.106 1.789l-5.447 2.724a2 2 0 01-1.894 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v18m0-18l9 6m-9 6l9 6" /></svg>
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">Interactive Route Planner</h2>
                  <p className="text-white/80 text-xs font-bold uppercase tracking-widest">Optimize your transport logistics</p>
                </div>
              </div>
            </div>
            
            <div className="grid gap-6">
              <div className="clay-input rounded-3xl p-5 bg-sky-50/50 border border-sky-100/50 backdrop-blur-sm shadow-sm ring-1 ring-sky-200/30">
                <p className="text-xs text-sky-700 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-sky-500 animate-pulse"></span>
                  Dynamic Route Mapping
                </p>
                <p className="text-[11px] text-sky-600/80 font-medium">Route auto-fills from selected requests. Click anywhere on the map to set custom waypoints.</p>
                {mapAddressLoading && <div className="mt-2 flex items-center gap-2 text-xs text-sky-600 font-bold"><div className="animate-spin h-3 w-3 border-b-2 border-sky-600 rounded-full"></div> Resolving location coordinates...</div>}
              </div>
  
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-sky-400 to-emerald-400 rounded-[40px] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative h-[420px] overflow-hidden rounded-[36px] bg-white border-8 border-white shadow-2xl">
                  <MapContainer
                    key={`${routeDraft.start?.lat || 's0'}-${routeDraft.end?.lat || 'e0'}`}
                    center={routeDraft.start ? [routeDraft.start.lat, routeDraft.start.lon] : INDIA_CENTER}
                    zoom={routeDraft.start ? 7 : 5}
                    scrollWheelZoom
                    className="h-full w-full z-0"
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    />
                    <RouteMapPicker onPick={handleMapPick} />
                    {routeDraft.start && (
                      <CircleMarker
                        center={[routeDraft.start.lat, routeDraft.start.lon]}
                        radius={12}
                        pathOptions={{ color: '#2563eb', fillColor: '#fff', fillOpacity: 1, weight: 6 }}
                      />
                    )}
                    {routeDraft.end && (
                      <CircleMarker
                        center={[routeDraft.end.lat, routeDraft.end.lon]}
                        radius={12}
                        pathOptions={{ color: '#059669', fillColor: '#fff', fillOpacity: 1, weight: 6 }}
                      />
                    )}
                    {routeDraft.start && routeDraft.end && (
                      <Polyline
                        positions={[
                          [routeDraft.start.lat, routeDraft.start.lon],
                          [routeDraft.end.lat, routeDraft.end.lon],
                        ]}
                        pathOptions={{ color: '#0f766e', weight: 8, dashArray: '1, 15', lineCap: 'round', opacity: 0.8 }}
                      />
                    )}
                  </MapContainer>
                  
                  {/* Floating Route Info Overlay */}
                  <div className="absolute right-6 bottom-6 flex flex-col gap-3 z-[1000]">
                    <div className="clay-card bg-white/95 backdrop-blur-xl p-4 shadow-2xl border border-white/50 w-64 transform transition-all hover:scale-105">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-emerald-100 p-2 rounded-xl text-emerald-700">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        </div>
                        <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">Logistics Metrics</p>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Distance</span>
                          <span className="text-xl font-black text-emerald-600">{routeDistanceKm ? `${routeDistanceKm.toFixed(1)} KM` : '--'}</span>
                        </div>
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Est. Fuel</span>
                          <span className="text-lg font-black text-slate-700">{routeDistanceKm ? `~${(routeDistanceKm / 15).toFixed(1)} L` : '--'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
  
              <div className="grid gap-6 md:grid-cols-2">
                <div className="clay-input rounded-[28px] p-6 bg-gradient-to-br from-white to-slate-50 border border-slate-200/50 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-sky-50 p-2 rounded-xl text-sky-600 border border-sky-100">
                      <span className="text-xl">📍</span>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Departure</p>
                  </div>
                  <p className="text-xl font-black text-slate-800 leading-tight">
                    {routeDraft.start ? `${routeDraft.start.city || '-'}, ${routeDraft.start.state || '-'}` : 'Selecting on map...'}
                  </p>
                </div>
                <div className="clay-input rounded-[28px] p-6 bg-gradient-to-br from-white to-sky-50/30 border border-emerald-100 shadow-sm transition-all hover:shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600 border border-emerald-100">
                      <span className="text-xl">🎯</span>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Destination</p>
                  </div>
                  <p className="text-xl font-black text-emerald-700 leading-tight">
                    {routeDraft.end ? `${routeDraft.end.city || '-'}, ${routeDraft.end.state || '-'}` : 'Selecting on map...'}
                  </p>
                </div>
              </div>
            </div>
  
            {routeError && <div className="mt-8 p-4 bg-red-50 border-2 border-red-100 text-red-700 rounded-3xl text-sm font-bold flex items-center gap-3 animate-bounce">
              <span className="text-xl text-red-500">⚠️</span> {routeError}
            </div>}
          </Card>
        </div>
  
        {quoteModalRequest && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-emerald-950/40 backdrop-blur-xl px-4 p-8">
            <div className="clay-card w-full max-w-lg rounded-[48px] bg-white/90 backdrop-blur-2xl p-10 shadow-[0_32px_80px_-16px_rgba(16,185,129,0.3)] border border-white/80 animate-in fade-in zoom-in duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8">
                <button onClick={closeQuoteModal} className="text-slate-300 hover:text-red-500 transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="flex items-center gap-6 mb-10">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-[24px] text-white shadow-xl shadow-emerald-500/20">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">Financial Bid</h2>
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mt-1 italic">Order Reference: #{quoteModalRequest.order}</p>
                </div>
              </div>
  
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="clay-input rounded-3xl p-5 bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Logistics Route</p>
                  <p className="text-sm font-black text-slate-700 truncate">{quoteModalRequest.pickup_city} → {quoteModalRequest.drop_city}</p>
                </div>
                <div className="clay-input rounded-3xl p-5 bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Payload Qty</p>
                  <p className="text-sm font-black text-emerald-700">{quoteModalRequest.order_quantity || request.weight_kg} KG</p>
                </div>
              </div>
  
              <div className="mb-10 relative group">
                <label className="mb-3 block text-xs font-black text-slate-400 uppercase tracking-widest px-4">Proposed Quoted Fee</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                    <span className="text-4xl font-black text-emerald-600/30">₹</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quoteValue}
                    onChange={(event) => setQuoteValue(event.target.value)}
                    className="clay-input w-full rounded-3xl border-none bg-emerald-50 p-8 pl-16 text-5xl font-black text-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-emerald-100 appearance-none"
                    placeholder="000"
                    autoFocus
                  />
                  <div className="absolute bottom-4 right-6 text-[10px] font-black text-emerald-600/50 uppercase">Per Shipment</div>
                </div>
              </div>
  
              <div className="flex gap-6">
                <Button 
                  variant="clay" 
                  onClick={closeQuoteModal} 
                  className="flex-1 bg-slate-100 text-slate-500 font-black py-5 rounded-[24px] active:scale-95 transition-transform"
                >
                  Discard Offer
                </Button>
                <Button 
                  variant="clay" 
                  onClick={handleSendQuote} 
                  disabled={requestActionLoadingId === quoteModalRequest.id}
                  className="flex-1 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white font-black py-5 rounded-[24px] shadow-xl shadow-emerald-500/30 active:scale-95 transition-transform"
                >
                  {requestActionLoadingId === quoteModalRequest.id ? 'Processing...' : 'Submit Quote'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </PageShell>
    </div>
  )
}
