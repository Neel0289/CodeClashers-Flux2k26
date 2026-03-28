import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useNavigate } from 'react-router-dom'

import { createNegotiation, getNegotiations, respondNegotiation } from '../../api/negotiations'
import { buySellFastAlert, getSellFastAlerts } from '../../api/alerts'
import { getLogisticsRequests } from '../../api/logistics'
import { createOrder, getOrders } from '../../api/orders'
import { createOrderCheckout, verifyOrderCheckout } from '../../api/payments'
import { getProducts } from '../../api/products'
import { createReview } from '../../api/reviews'
import Button from '../../components/shared/Button'
import BuyerFarmerChatWidget from '../../components/shared/BuyerFarmerChatWidget'
import Card from '../../components/shared/Card'
import FakeGooglePayModal from '../../components/shared/FakeGooglePayModal'
import Input from '../../components/shared/Input'
import PageShell from '../../components/shared/PageShell'
import StatusBadge from '../../components/shared/StatusBadge'
import useAuth from '../../hooks/useAuth'
import { openInvoiceWindow } from '../../utils/invoice'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const DEFAULT_CENTER = [22.9734, 78.6569]
const NEARBY_RADIUS_KM = 300
const DEMO_REVIEWS_STORAGE_KEY = 'khetbazaar_demo_reviews'

const geocodeCache = new Map()

function saveDemoReview(review) {
  if (typeof window === 'undefined') return
  try {
    const existing = JSON.parse(window.localStorage.getItem(DEMO_REVIEWS_STORAGE_KEY) || '[]')
    const next = [review, ...existing].slice(0, 30)
    window.localStorage.setItem(DEMO_REVIEWS_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore storage failures for demo-only data.
  }
}

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
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedItem, setSelectedItem] = useState('all')
  const [orderingId, setOrderingId] = useState(null)
  const [orderProduct, setOrderProduct] = useState(null)
  const [orderQuantity, setOrderQuantity] = useState('')
  const [orderMode, setOrderMode] = useState('direct')
  const [offerPerKg, setOfferPerKg] = useState('')
  const [orderFormError, setOrderFormError] = useState('')
  const [showOrderAnimation, setShowOrderAnimation] = useState(false)
  const [orderAnimationMessage, setOrderAnimationMessage] = useState('Preparing your order...')
  const [googlePayCheckout, setGooglePayCheckout] = useState(null)
  const [googlePayProcessing, setGooglePayProcessing] = useState(false)
  const [googlePayError, setGooglePayError] = useState('')
  const [counterOffers, setCounterOffers] = useState({})
  const [negotiationActionId, setNegotiationActionId] = useState(null)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const [demoReviewSubmitted, setDemoReviewSubmitted] = useState(false)
  const [logisticsRequests, setLogisticsRequests] = useState([])
  const [sellFastAlerts, setSellFastAlerts] = useState([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [sellFastBuyTarget, setSellFastBuyTarget] = useState(null)
  const [sellFastBuyQuantity, setSellFastBuyQuantity] = useState('')
  const [sellFastBuyError, setSellFastBuyError] = useState('')
  const [sellFastBuyLoading, setSellFastBuyLoading] = useState(false)
  const pendingGooglePayActionRef = useRef(null)

  const loadSellFastAlerts = async ({ silent = false } = {}) => {
    if (!silent) {
      setAlertsLoading(true)
    }
    try {
      const { data } = await getSellFastAlerts()
      setSellFastAlerts(Array.isArray(data) ? data : [])
    } catch {
      if (!silent) {
        setSellFastAlerts([])
      }
    } finally {
      if (!silent) {
        setAlertsLoading(false)
      }
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      const [ordersRes, negotiationsRes, productsRes, logisticsRes] = await Promise.allSettled([
        getOrders(),
        getNegotiations(),
        getProducts(),
        getLogisticsRequests(),
      ])

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
      if (logisticsRes.status === 'fulfilled') {
        setLogisticsRequests(Array.isArray(logisticsRes.value.data) ? logisticsRes.value.data : [])
      } else {
        setLogisticsRequests([])
      }

      if (ordersRes.status === 'rejected' && negotiationsRes.status === 'rejected') {
        setError('Could not load dashboard data. Please refresh.')
      }
      setLoading(false)
    }

    load()
    loadSellFastAlerts()
  }, [])

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadSellFastAlerts({ silent: true })
    }, 7000)
    return () => clearInterval(intervalId)
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

  const categoryOptions = useMemo(() => {
    const set = new Set()
    for (const product of farmerProducts) {
      if (product.category) set.add(product.category)
    }
    return Array.from(set)
  }, [farmerProducts])

  const itemOptions = useMemo(() => {
    const names = new Set()
    for (const product of farmerProducts) {
      const categoryMatch = selectedCategory === 'all' || product.category === selectedCategory
      if (categoryMatch && product.name) {
        names.add(product.name)
      }
    }
    return Array.from(names)
  }, [farmerProducts, selectedCategory])

  const filteredFarmerProducts = useMemo(() => {
    return farmerProducts.filter((product) => {
      const categoryMatch = selectedCategory === 'all' || product.category === selectedCategory
      const itemMatch = selectedItem === 'all' || product.name === selectedItem
      return categoryMatch && itemMatch
    })
  }, [farmerProducts, selectedCategory, selectedItem])

  const nearbyFarmers = useMemo(() => {
    if (!buyerCoords) return []
    const grouped = new Map()
    const rows = filteredFarmerProducts.filter((item) => item.city && item.state)

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
  }, [buyerCoords, filteredFarmerProducts])

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

  const recentOrders = useMemo(() => {
    const rows = orders.slice(0, 5)
    if (!import.meta.env.DEV) return rows

    const hasReviewable = rows.some((order) => order.buyer_can_review)
    if (hasReviewable) return rows

    const demoOrder = {
      id: 'demo-review-order',
      farmer: rows[0]?.farmer || 0,
      farmer_name: 'Demo Farmer',
      product_name: 'Demo Crop',
      quantity: 10,
      agreed_price: '999.00',
      status: 'delivered',
      buyer_can_review: !demoReviewSubmitted,
      buyer_review_submitted: demoReviewSubmitted,
      __demoReview: true,
    }
    return [demoOrder, ...rows].slice(0, 5)
  }, [orders, demoReviewSubmitted])

  const recentLogistics = useMemo(() => {
    return [...logisticsRequests]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5)
  }, [logisticsRequests])

  const logisticsReviewByOrder = useMemo(() => {
    const map = new Map()
    for (const request of logisticsRequests) {
      const orderId = Number(request?.order)
      if (!Number.isFinite(orderId)) continue
      if (!['accepted', 'picked_up', 'delivered'].includes(String(request?.status || ''))) continue
      if (!map.has(orderId)) {
        map.set(orderId, request)
      }
    }
    return map
  }, [logisticsRequests])

  const getReviewableLogisticsForOrder = (orderId) => {
    return logisticsReviewByOrder.get(Number(orderId)) || null
  }

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

  const getLatestMessage = (negotiation) => {
    if (!Array.isArray(negotiation?.messages) || negotiation.messages.length === 0) return null
    return negotiation.messages[negotiation.messages.length - 1]
  }

  const canBuyerAct = (negotiation) => {
    if (!['open', 'countered'].includes(negotiation.status)) return false
    const latest = getLatestMessage(negotiation)
    if (!latest) return true
    return Number(latest.sender) !== Number(user?.id)
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

  const reloadDashboardData = async () => {
    const [ordersRes, negotiationsRes, productsRes] = await Promise.allSettled([getOrders(), getNegotiations(), getProducts()])
    if (ordersRes.status === 'fulfilled') {
      setOrders(Array.isArray(ordersRes.value.data) ? ordersRes.value.data : [])
    }
    if (negotiationsRes.status === 'fulfilled') {
      setNegotiations(Array.isArray(negotiationsRes.value.data) ? negotiationsRes.value.data : [])
    }
    if (productsRes.status === 'fulfilled') {
      setFarmerProducts(Array.isArray(productsRes.value.data) ? productsRes.value.data : [])
    }
  }

  const openGooglePayForOrder = async (order) => {
    const { data: checkout } = await createOrderCheckout(order.id)

    return new Promise((resolve, reject) => {
      pendingGooglePayActionRef.current = { resolve, reject }
      setGooglePayError('')
      setGooglePayProcessing(false)
      setGooglePayCheckout({ ...checkout, order_id: order.id })
    })
  }

  const closeGooglePayModal = () => {
    setGooglePayProcessing(false)
    setGooglePayError('')
    setGooglePayCheckout(null)
  }

  const cancelGooglePay = () => {
    const pending = pendingGooglePayActionRef.current
    pendingGooglePayActionRef.current = null
    closeGooglePayModal()
    if (pending?.reject) {
      pending.reject(new Error('Payment was cancelled before completion.'))
    }
  }

  const confirmGooglePay = async (payload) => {
    if (!googlePayCheckout?.order_id) return

    setGooglePayProcessing(true)
    setGooglePayError('')

    try {
      await verifyOrderCheckout(googlePayCheckout.order_id, {
        checkout_token: googlePayCheckout.checkout_token,
        gpay_reference: payload.gpay_reference,
        upi_id: payload.upi_id,
      })
      setGooglePayCheckout((prev) => (prev ? { ...prev, status: 'success' } : prev))
      setGooglePayProcessing(false)
      const pending = pendingGooglePayActionRef.current
      pendingGooglePayActionRef.current = null
      setTimeout(() => {
        closeGooglePayModal()
        pending?.resolve?.()
      }, 1200)
    } catch (err) {
      const detail = err?.response?.data?.detail
      setGooglePayError(detail || 'Payment could not be completed. Please try again.')
      setGooglePayProcessing(false)
    }
  }

  const closeOrderForm = () => {
    setOrderProduct(null)
    setOrderQuantity('')
    setOrderMode('direct')
    setOfferPerKg('')
    setOrderFormError('')
    setShowOrderAnimation(false)
    setOrderAnimationMessage('Preparing your order...')
  }

  const openSellFastBuyModal = (alert) => {
    setSellFastBuyTarget(alert)
    setSellFastBuyQuantity('')
    setSellFastBuyError('')
    setError('')
  }

  const closeSellFastBuyModal = () => {
    setSellFastBuyTarget(null)
    setSellFastBuyQuantity('')
    setSellFastBuyError('')
    setSellFastBuyLoading(false)
  }

  const submitSellFastBuy = async (event) => {
    event.preventDefault()
    if (!sellFastBuyTarget) return

    const quantity = Number(sellFastBuyQuantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setSellFastBuyError('Please enter a valid quantity in kg.')
      return
    }

    if (quantity > Number(sellFastBuyTarget.quantity_kg || 0)) {
      setSellFastBuyError(`Requested quantity exceeds alert stock (${Number(sellFastBuyTarget.quantity_kg || 0).toFixed(1)} kg).`)
      return
    }

    if (!sellFastBuyTarget.product) {
      setSellFastBuyError('This alert does not have a linked listing for direct purchase.')
      return
    }

    setSellFastBuyLoading(true)
    setSellFastBuyError('')
    setError('')
    try {
      const { data: order } = await buySellFastAlert(sellFastBuyTarget.id, { quantity })
      await openGooglePayForOrder(order)
      await reloadDashboardData()
      await loadSellFastAlerts({ silent: true })
      closeSellFastBuyModal()
    } catch (err) {
      const detail = err?.response?.data?.detail
      setSellFastBuyError(detail || err?.message || 'Could not complete emergency purchase. Please try again.')
    } finally {
      setSellFastBuyLoading(false)
    }
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
    setShowOrderAnimation(true)
    setOrderAnimationMessage(orderMode === 'direct' ? 'Creating order...' : 'Submitting negotiation...')
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
        const { data: order } = await createOrder({ product: orderProduct.id, quantity })
        setOrderAnimationMessage('Opening Google Pay...')
        await openGooglePayForOrder(order)
        setOrderAnimationMessage('Payment successful. Finalizing order...')
      }

      await reloadDashboardData()
      closeOrderForm()
    } catch (err) {
      const detail = err?.response?.data?.detail
      const data = err?.response?.data
      const firstValidationError = data && typeof data === 'object'
        ? Object.values(data).find((value) => typeof value === 'string' || (Array.isArray(value) && value.length > 0))
        : null
      const normalizedValidationError = Array.isArray(firstValidationError) ? firstValidationError[0] : firstValidationError
      const transportMessage = err?.message
      const msg = detail || normalizedValidationError || transportMessage || 'Could not place order. Please try again.'
      setOrderFormError(msg)
      setShowOrderAnimation(false)
    } finally {
      setOrderingId(null)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleGenerateInvoice = (order) => {
    openInvoiceWindow({
      invoicePrefix: 'BINV',
      orderId: order?.id,
      invoiceDate: order?.created_at ? new Date(order.created_at) : new Date(),
      title: 'KhetBazaar Invoice',
      subtitle: 'Buyer order invoice',
      sellerLabel: 'Seller (Farmer)',
      sellerName: order?.farmer_name || `Farmer #${order?.farmer || ''}`,
      sellerAddress: `${order?.pickup_city || order?.farmer_city || ''}, ${order?.pickup_state || order?.farmer_state || ''}`,
      buyerLabel: 'Buyer',
      buyerName: user?.first_name || user?.username || 'Buyer',
      buyerAddress: `${order?.drop_city || order?.buyer_city || ''}, ${order?.drop_state || order?.buyer_state || ''}`,
      itemLabel: 'Crop',
      itemName: order?.product_name || `Order #${order?.id || ''}`,
      quantity: order?.quantity,
      total: order?.agreed_price,
    })
  }

  const handleGenerateLogisticInvoice = (order) => {
    const matchedRequest = logisticsRequests.find(
      (request) => Number(request.order) === Number(order.id) && Number(request.quoted_fee || 0) > 0,
    )

    if (!matchedRequest) {
      setError('Logistic invoice is not available for this order yet.')
      return
    }

    const routeText = `${matchedRequest.pickup_city || '-'}, ${matchedRequest.pickup_state || '-'} -> ${matchedRequest.drop_city || '-'}, ${matchedRequest.drop_state || '-'}`

    openInvoiceWindow({
      invoicePrefix: 'BLINV',
      orderId: order?.id,
      invoiceDate: matchedRequest?.created_at ? new Date(matchedRequest.created_at) : new Date(),
      title: 'KhetBazaar Logistics Invoice',
      subtitle: 'Buyer logistics invoice',
      sellerLabel: 'Service Provider (Logistics)',
      sellerName: matchedRequest?.logistics_partner_name || `Partner #${matchedRequest?.logistics_partner || ''}`,
      sellerAddress: routeText,
      buyerLabel: 'Buyer',
      buyerName: user?.first_name || user?.username || 'Buyer',
      buyerAddress: `${matchedRequest?.drop_city || order?.buyer_city || ''}, ${matchedRequest?.drop_state || order?.buyer_state || ''}`,
      itemLabel: 'Service',
      itemName: `Logistics for ${order?.product_name || `Order #${order?.id}`}`,
      quantity: matchedRequest?.weight_kg || order?.quantity || 0,
      total: matchedRequest?.quoted_fee || 0,
      extraRows: [
        { label: 'Order', value: `#${order?.id || ''}` },
        { label: 'Route', value: routeText },
      ],
    })
  }

  const openReviewModal = (order, target = 'farmer', logisticsRequest = null) => {
    setReviewTarget({
      order,
      target,
      logisticsRequest,
    })
    setReviewRating('5')
    setReviewComment('')
    setReviewError('')
  }

  const closeReviewModal = () => {
    setReviewTarget(null)
    setReviewRating('5')
    setReviewComment('')
    setReviewError('')
  }

  const submitReview = async (event) => {
    event.preventDefault()
    if (!reviewTarget) return

    const rating = Number(reviewRating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setReviewError('Please select a rating between 1 and 5.')
      return
    }

    setReviewSubmitting(true)
    setReviewError('')
    try {
      if (reviewTarget.order.__demoReview) {
        saveDemoReview({
          id: `demo-${Date.now()}`,
          order: reviewTarget.order.id,
          reviewer: user?.id || null,
          reviewer_name: user?.name || user?.username || 'Demo Buyer',
          reviewee: reviewTarget.target === 'logistics'
            ? (reviewTarget.logisticsRequest?.logistics_partner || 0)
            : (reviewTarget.order.farmer || 0),
          rating,
          comment: reviewComment,
          created_at: new Date().toISOString(),
          product_name: reviewTarget.order.product_name || 'Demo Crop',
          order_quantity: reviewTarget.order.quantity || 0,
          order_value: reviewTarget.order.agreed_price || '0.00',
          __demoReview: true,
        })
        setDemoReviewSubmitted(true)
        closeReviewModal()
        return
      }

      await createReview({
        order_id: reviewTarget.order.id,
        review_target: reviewTarget.target,
        rating,
        comment: reviewComment,
      })
      await reloadDashboardData()
      closeReviewModal()
    } catch (err) {
      setReviewError(err?.response?.data?.detail || 'Could not submit review.')
    } finally {
      setReviewSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen farm-bg pb-12">
      <PageShell
        title={
          <div className="flex items-center gap-2">
            <span className="text-3xl">🧺</span>
            <span>Buyer Dashboard</span>
          </div>
        }
      actions={
        <div className="flex gap-2">
          <Button onClick={() => navigate('/buyer/profile')} className="bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-white transition-colors">
            My Profile
          </Button>
          <Button onClick={handleLogout}>Logout</Button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card variant="clay" key={stat.label} className="p-6">
            <p className="text-sm font-medium text-text-muted">{stat.label}</p>
            <p className="mt-2 text-4xl font-extrabold text-accent">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card variant="clay" className="mt-6 bg-red-50/30 border-none shadow-[12px_12px_24px_0_rgba(220,38,38,0.1),_inset_-8px_-8px_12px_0_rgba(220,38,38,0.05),_inset_8px_8px_12px_0_rgba(255,255,255,0.8)]">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-lg font-semibold text-red-700">Emergency Sell Fast Alerts</p>
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Live Buyers Feed
          </span>
        </div>
        {alertsLoading && <p className="text-sm text-text-muted">Loading alerts...</p>}
        {!alertsLoading && sellFastAlerts.length === 0 && (
          <p className="text-sm text-text-muted">No urgent sell alerts right now.</p>
        )}
        {!alertsLoading && sellFastAlerts.length > 0 && (
          <div className="space-y-2">
            {sellFastAlerts.slice(0, 4).map((alert) => (
              <div key={alert.id} className="clay-card !rounded-[32px] bg-white/70 backdrop-blur-sm p-5 shadow-sm border border-white/80 group">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-xl group-hover:scale-125 transition-transform duration-500">🔥</span>
                       <p className="text-sm font-black text-slate-800 tracking-tight leading-tight uppercase">
                        {alert.product_name}
                      </p>
                    </div>
                    <div className="clay-input !rounded-[16px] px-3 py-2 bg-red-50/30 border-red-100/30 mb-3">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Source Partner</p>
                       <p className="text-xs font-bold text-red-700 leading-none">{alert.farmer_name}</p>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Direct Price</p>
                        <p className="text-lg font-black text-red-700 leading-none">₹{alert.price_per_kg}<span className="text-[10px] text-slate-400 font-sans">/kg</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Available</p>
                        <p className="text-sm font-black text-slate-700 leading-none">{Number(alert.quantity_kg || 0).toFixed(1)} kg</p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={() => openSellFastBuyModal(alert)}
                      disabled={!alert.product || Number(alert.quantity_kg || 0) <= 0}
                      variant="clay"
                      className="w-full !rounded-[16px] !py-2.5 !bg-gradient-to-br from-red-600 to-red-700 !text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                    >
                      {!alert.product ? 'Offline' : 'Buy Now'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card variant="clay">
          <p className="mb-6 text-xl font-bold text-text-primary">Recent Orders</p>
          {loading && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="coin-loader mb-4" />
              <p className="text-sm font-medium text-text-muted">Fetching your orders...</p>
            </div>
          )}
          {!loading && recentOrders.length === 0 && (
            <Card variant="clay" className="bg-slate-50/50 p-8 text-center">
              <p className="text-3xl mb-2">📦</p>
              <p className="text-sm font-medium text-text-muted">No orders yet. Start exploring the catalog!</p>
            </Card>
          )}
          {!loading && recentOrders.length > 0 && (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="clay-card !rounded-[24px] bg-white/60 p-5 shadow-sm transition-all hover:bg-white">
                  {/* Header with Farmer Info and Status Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-xl shadow-inner">
                        👤
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary leading-tight">
                          {order.farmer_name || `Farmer #${order.farmer}`}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Farmer</p>
                      </div>
                    </div>
                    <span className={`clay-card !rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                      order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      order.status === 'delivered' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  {/* Order Details in a recessed well */}
                  <div className="clay-input !rounded-[16px] mb-4 bg-slate-50/40 p-3 ring-0">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-black/5">
                      <p className="text-xs font-medium text-text-muted">Product</p>
                      <p className="text-xs font-bold text-text-primary">{order.product_name || `Order #${order.id}`}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-text-muted">Quantity</p>
                        <p className="text-sm font-black">{order.quantity} kg</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-text-muted">Total Price</p>
                        <p className="text-sm font-black text-accent">₹{order.agreed_price}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {order.status === 'confirmed' && (
                      <Button
                        variant="clay"
                        onClick={() => handleGenerateInvoice(order)}
                        className="flex-1 py-2 text-xs font-bold uppercase tracking-tight"
                      >
                        📄 Invoice
                      </Button>
                    )}
                    {order.buyer_review_submitted ? (
                      <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700">
                        <span>✅</span> Farmer review submitted
                      </div>
                    ) : order.buyer_can_review ? (
                      <Button
                        variant="clay"
                        onClick={() => openReviewModal(order, 'farmer')}
                        className="flex-1 border-emerald-700 bg-emerald-700 py-2 text-white text-xs font-bold uppercase tracking-tight hover:bg-emerald-800"
                      >
                        ⭐ Review Farmer
                      </Button>
                    ) : (order.status === 'delivered' || order.status === 'completed') ? (
                      <p className="w-full text-center text-[10px] font-medium text-amber-700 italic">
                        Review window closed
                      </p>
                    ) : null}

                    {(() => {
                      const reviewableLogistics = getReviewableLogisticsForOrder(order.id)
                      const deliveryDone = order.status === 'delivered' || order.status === 'completed'
                      if (!reviewableLogistics) return null

                      if (order.buyer_logistics_review_submitted) {
                        return (
                          <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-[10px] font-bold text-blue-700">
                            <span>✅</span> Logistics review submitted
                          </div>
                        )
                      }

                      if (order.buyer_can_review_logistics) {
                        return (
                          <Button
                            variant="clay"
                            onClick={() => openReviewModal(order, 'logistics', reviewableLogistics)}
                            className="flex-1 border-blue-700 bg-blue-700 py-2 text-white text-xs font-bold uppercase tracking-tight hover:bg-blue-800"
                          >
                            🚛 Review Logistics
                          </Button>
                        )
                      }

                      if (deliveryDone) {
                        return <p className="mt-1 text-xs text-center w-full text-amber-700">Logistics review window closed</p>
                      }

                      return null
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card variant="clay">
          <p className="mb-6 text-xl font-bold text-text-primary">Logistics Updates</p>
          {loading && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="coin-loader mb-4" />
              <p className="text-sm font-medium text-text-muted">Fetching logistics...</p>
            </div>
          )}
          {!loading && recentLogistics.length === 0 && (
            <Card variant="clay" className="bg-slate-50/50 p-8 text-center text-sm font-medium text-text-muted">
              No logistics updates yet.
            </Card>
          )}
          {!loading && recentLogistics.length > 0 && (
            <div className="space-y-4">
              {recentLogistics.map((request) => {
                const linkedOrder = orders.find((order) => Number(order.id) === Number(request.order))
                const packageSize = Number(request.weight_kg || linkedOrder?.quantity || 0)
                const hasInvoice = Number(request.quoted_fee || 0) > 0

                return (
                  <div key={request.id} className="clay-card !rounded-[24px] bg-white/60 p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xl shadow-inner">
                          🚛
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-primary leading-tight line-clamp-1">
                            {request.logistics_partner_name || `Partner #${request.logistics_partner}`}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Logistics Partner</p>
                        </div>
                      </div>
                      <span className="clay-card !rounded-full bg-surface-2 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-text-primary shadow-sm">
                        {formatStatus(request.status)}
                      </span>
                    </div>

                    <div className="clay-input !rounded-[16px] mb-4 bg-slate-50/40 p-3 ring-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] uppercase font-bold text-text-muted">Route</p>
                        <p className="text-[11px] font-bold text-text-primary text-right">
                          {request.pickup_city || '-'} → {request.drop_city || '-'}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-t border-black/5 pt-2">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-text-muted">Size</p>
                          <p className="text-sm font-black">{packageSize.toFixed(1)} kg</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-text-muted">Fee</p>
                          <p className="text-sm font-black text-blue-600">₹{request.quoted_fee || '0.00'}</p>
                        </div>
                      </div>
                    </div>

                    {hasInvoice && linkedOrder && ['confirmed', 'delivered', 'completed'].includes(linkedOrder.status) && (
                      <Button
                        variant="clay"
                        onClick={() => handleGenerateLogisticInvoice(linkedOrder)}
                        className="w-full border-blue-700 bg-blue-700 py-2 text-white text-xs font-bold uppercase tracking-tight hover:bg-blue-800"
                      >
                        📄 Logistic Invoice
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card variant="clay">
          <p className="mb-6 text-xl font-bold text-text-primary">Recent Negotiations</p>
          {loading && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="coin-loader mb-4" />
              <p className="text-sm font-medium text-text-muted">Fetching negotiations...</p>
            </div>
          )}
          {!loading && recentNegotiations.length === 0 && (
            <Card variant="clay" className="bg-slate-50/50 p-8 text-center text-sm font-medium text-text-muted">
              No negotiations yet.
            </Card>
          )}
          {!loading && recentNegotiations.length > 0 && (
            <div className="space-y-4">
              {recentNegotiations.map((item) => (
                <div key={item.id} className="clay-card !rounded-[24px] bg-white/60 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-xl shadow-inner">
                        🤝
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text-primary leading-tight line-clamp-1">
                          {item.farmer_name || `Farmer #${item.farmer}`}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Farmer</p>
                      </div>
                    </div>
                    <span className={`clay-card !rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                      item.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                      item.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="clay-input !rounded-[16px] mb-4 bg-slate-50/40 p-3 ring-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] uppercase font-bold text-text-muted">Product</p>
                      <p className="text-[11px] font-bold text-text-primary text-right">{item.product_name || `Negotiation #${item.id}`}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-black/5 pt-2">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-text-muted">Quantity</p>
                        <p className="text-sm font-black">{item.quantity} kg</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-text-muted">Negotiated Price</p>
                        <p className="text-sm font-black text-amber-600">₹{getLatestOfferPerKg(item).toFixed(2)}/kg</p>
                      </div>
                    </div>
                  </div>

                  {canBuyerAct(item) && (
                    <div className="flex flex-col gap-4">
                      <div className="relative">
                        <Input
                          variant="clay"
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={counterOffers[item.id] || ''}
                          onChange={(e) => setCounterOffers((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="Re-bid rate..."
                          className="w-full !rounded-[20px] !p-4 !text-sm font-black text-slate-800 !bg-slate-50 !border-none !ring-1 !ring-slate-200 focus:!ring-amber-500 transition-all shadow-inner"
                        />
                        <button
                          disabled={negotiationActionId === item.id}
                          onClick={() => handleNegotiationAction(item, 'counter')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-[14px] shadow-md shadow-amber-500/20 active:scale-95 transition-transform"
                        >
                          Counter
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          variant="clay"
                          disabled={negotiationActionId === item.id}
                          onClick={() => handleNegotiationAction(item, 'accept')}
                          className="!py-3.5 !bg-gradient-to-br from-emerald-600 to-emerald-700 !text-white !rounded-[20px] text-[11px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                          Confirm Deal
                        </Button>
                        <Button
                          variant="clay"
                          disabled={negotiationActionId === item.id}
                          onClick={() => handleNegotiationAction(item, 'reject')}
                          className="!py-3.5 !bg-slate-100 !text-slate-500 !rounded-[20px] text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  )}
                  {['open', 'countered'].includes(item.status) && !canBuyerAct(item) && (
                    <div className="rounded-lg bg-slate-50 p-2 text-center text-[10px] font-medium text-text-muted italic">
                      Waiting for farmer response...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card variant="clay" className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-lg font-semibold">Nearby Farmers Map (OpenStreetMap)</p>
          <p className="text-sm text-text-muted">Radius: {NEARBY_RADIUS_KM} km</p>
        </div>
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="relative group">
            <label className="mb-3 block text-xs font-black text-slate-400 uppercase tracking-widest px-4">Category Discovery</label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(event) => {
                  setSelectedCategory(event.target.value)
                  setSelectedItem('all')
                }}
                className="clay-input w-full !rounded-[24px] !p-6 !text-sm font-black text-slate-700 !bg-white/60 backdrop-blur-md border border-white/80 shadow-inner focus:!ring-accent/20 appearance-none"
              >
                <option value="all">🌾 All Farm Produce</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{formatStatus(category)}</option>
                ))}
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
          <div className="relative group">
            <label className="mb-3 block text-xs font-black text-slate-400 uppercase tracking-widest px-4">Item Selection</label>
            <div className="relative">
              <select
                value={selectedItem}
                onChange={(event) => setSelectedItem(event.target.value)}
                className="clay-input w-full !rounded-[24px] !p-6 !text-sm font-black text-slate-700 !bg-white/60 backdrop-blur-md border border-white/80 shadow-inner focus:!ring-accent/20 appearance-none"
              >
                <option value="all">🛒 All Available Items</option>
                {itemOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
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
                    <Popup className="clay-popup-custom">
                      <div className="min-w-[240px] p-2">
                        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
                          <div className="bg-amber-100 p-2 rounded-xl text-amber-700 shadow-inner">
                            <span className="text-xl">👩‍🌾</span>
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 leading-tight">{marker.farmerName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{marker.city}, {marker.state}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          {marker.products.map((product) => (
                            <div key={product.id} className="clay-input !rounded-[24px] p-4 bg-slate-50 border border-slate-100/50 shadow-sm overflow-hidden relative group">
                              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="text-2xl">📦</span>
                              </div>
                              <div className="mb-2">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">{formatStatus(product.category)}</p>
                                <p className="font-black text-slate-800 leading-none mb-1">{product.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 italic">Fresh from {product.harvest_date || 'farm'}</p>
                              </div>
                              
                              <div className="flex items-end justify-between mb-4">
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Price</p>
                                  <p className="text-lg font-black text-emerald-700 leading-none">₹{product.base_price}<span className="text-[10px] text-slate-400">/kg</span></p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Stock</p>
                                  <p className="text-sm font-black text-slate-700 leading-none">{product.quantity_available} kg</p>
                                </div>
                              </div>
                              
                              <Button
                                type="button"
                                variant="clay"
                                disabled={orderingId === product.id}
                                onClick={() => handlePlaceOrder(product)}
                                className="w-full !rounded-[16px] !py-2.5 !bg-gradient-to-br from-emerald-600 to-emerald-700 !text-white text-[11px] font-black uppercase tracking-widest shadow-md shadow-emerald-500/20 active:scale-95"
                              >
                                {orderingId === product.id ? 'Loading...' : 'Negotiate / Order'}
                              </Button>
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-slate-50 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            📍 {marker.distanceKm.toFixed(1)} km from your location
                          </p>
                        </div>
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
          <Card variant="clay" className="mt-6 border-red-300 bg-red-50 text-red-700">
            <p>{error}</p>
          </Card>
        )}
      </PageShell>

      {orderProduct && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-emerald-950/40 backdrop-blur-xl px-4 p-8">
          <Card variant="clay" className="w-full max-w-lg rounded-[48px] bg-white/95 backdrop-blur-3xl p-0 shadow-[0_32px_80px_-16px_rgba(46,125,50,0.3)] border border-white/80 animate-in fade-in zoom-in duration-500 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 p-8 text-white relative">
              <div className="absolute top-0 right-0 p-6">
                <button onClick={closeOrderForm} className="text-white/60 hover:text-white transition-colors bg-white/10 p-2 rounded-xl backdrop-blur-md">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-6">
                <div className="bg-white/20 p-4 rounded-[24px] shadow-inner backdrop-blur-md border border-white/20">
                  <span className="text-4xl">🌱</span>
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight leading-tight">Secure Trade</h2>
                  <p className="text-green-100 text-[11px] font-black uppercase tracking-widest mt-1 opacity-80">Direct Transaction & Negotiation</p>
                </div>
              </div>
            </div>

            <div className="p-10 space-y-8">
              {/* Product Info Card */}
              <div className="clay-input !rounded-[32px] p-6 bg-emerald-50/50 border border-emerald-100/50 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Authentic Produce</p>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{orderProduct.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Standard Rate</p>
                  <p className="text-xl font-black text-emerald-700">₹{orderProduct.base_price}<span className="text-xs font-bold text-slate-400 font-sans">/kg</span></p>
                </div>
              </div>

              {showOrderAnimation && (
                <div className="rounded-[28px] border-2 border-emerald-200 bg-emerald-100/30 p-6 text-center animate-pulse">
                  <div className="mx-auto coin-loader scale-75 mb-3" />
                  <p className="text-sm font-black text-emerald-800 uppercase tracking-tight">{orderAnimationMessage}</p>
                </div>
              )}

              <form onSubmit={submitOrderForm} className="space-y-8">
                {/* Mode Selector */}
                <div>
                  <label className="mb-4 block text-xs font-black text-slate-400 uppercase tracking-widest px-2">Select Transaction Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setOrderMode('direct')}
                      className={`relative overflow-hidden rounded-[24px] p-5 text-left transition-all duration-300 border-2 ${
                        orderMode === 'direct' 
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                          : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-emerald-200'
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Option 1</p>
                      <p className="text-lg font-black leading-tight">Direct Buy</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderMode('negotiate')}
                      className={`relative overflow-hidden rounded-[24px] p-5 text-left transition-all duration-300 border-2 ${
                        orderMode === 'negotiate' 
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                          : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-emerald-200'
                      }`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Option 2</p>
                      <p className="text-lg font-black leading-tight">Negotiate</p>
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="relative group">
                    <label className="mb-3 block text-xs font-black text-slate-400 uppercase tracking-widest px-2">Order Quantity</label>
                    <div className="relative">
                      <Input
                        variant="clay"
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={orderQuantity}
                        onChange={(event) => setOrderQuantity(event.target.value)}
                        placeholder="0.0"
                        className="!rounded-[24px] !p-6 !text-3xl font-black text-slate-800 !bg-slate-50 !border-none !ring-1 !ring-slate-200 focus:!ring-emerald-500 transition-all"
                        required
                      />
                      <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">KG</span>
                    </div>
                    <p className="mt-2 text-[10px] font-bold text-emerald-600 px-2 uppercase tracking-tight">Available: {orderProduct.quantity_available} kg</p>
                  </div>

                  {orderMode === 'negotiate' && (
                    <div className="relative group animate-in slide-in-from-right duration-300">
                      <label className="mb-3 block text-xs font-black text-slate-400 uppercase tracking-widest px-2">Your Offer</label>
                      <div className="relative">
                        <Input
                          variant="clay"
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={offerPerKg}
                          onChange={(event) => setOfferPerKg(event.target.value)}
                          placeholder="0.0"
                          className="!rounded-[24px] !p-6 !text-3xl font-black text-emerald-600 !bg-emerald-50 !border-none !ring-1 !ring-emerald-200 focus:!ring-emerald-500 transition-all"
                          required
                        />
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-emerald-300">₹</span>
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-400 uppercase">/KG</span>
                      </div>
                      <p className="mt-2 text-[10px] font-bold text-slate-400 px-2 uppercase tracking-tight italic">Market Avg: ₹{orderProduct.base_price}</p>
                    </div>
                  )}
                </div>

                {orderFormError && <div className="p-4 bg-red-50 border-2 border-red-100 text-red-700 rounded-3xl text-[11px] font-black uppercase tracking-widest text-center">{orderFormError}</div>}
                
                <div className="flex gap-6 pt-4">
                  <Button type="button" onClick={closeOrderForm} variant="clay" className="flex-1 !bg-slate-100 !text-slate-500 font-black py-5 !rounded-[24px] active:scale-95 transition-transform">
                    Cancel
                  </Button>
                  <Button type="submit" variant="clay" disabled={orderingId === orderProduct.id} className="flex-1 !bg-gradient-to-br from-emerald-600 to-emerald-700 !text-white font-black py-5 !rounded-[24px] shadow-xl shadow-emerald-500/30 active:scale-95 transition-transform">
                    {orderingId === orderProduct.id ? 'Processing...' : (orderMode === 'negotiate' ? 'Send Bid' : 'Pay Now')}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {sellFastBuyTarget && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-red-950/40 backdrop-blur-xl px-4 p-8">
          <Card variant="clay" className="w-full max-w-lg rounded-[48px] bg-white/95 backdrop-blur-3xl p-0 shadow-[0_32px_80px_-16px_rgba(220,38,38,0.3)] border border-white/80 animate-in fade-in zoom-in duration-500 overflow-hidden">
            {/* Urgent Header */}
            <div className="bg-gradient-to-br from-red-600 to-red-800 p-8 text-white relative">
              <div className="absolute top-0 right-0 p-6">
                <button onClick={closeSellFastBuyModal} className="text-white/60 hover:text-white transition-colors bg-white/10 p-2 rounded-xl backdrop-blur-md">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-6">
                <div className="bg-white/20 p-4 rounded-[24px] shadow-inner backdrop-blur-md border border-white/20">
                  <span className="text-4xl animate-pulse">🔥</span>
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight leading-tight">Emergency Buy</h2>
                  <p className="text-red-100 text-[11px] font-black uppercase tracking-widest mt-1 opacity-80 italic">Verified Priority Transaction</p>
                </div>
              </div>
            </div>

            <div className="p-10 space-y-8">
              {/* Product Info Card */}
              <div className="clay-input !rounded-[32px] p-6 bg-red-50/50 border border-red-100/50 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Direct from {sellFastBuyTarget.farmer_name}</p>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{sellFastBuyTarget.product_name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fixed Rate</p>
                  <p className="text-xl font-black text-red-700">₹{sellFastBuyTarget.price_per_kg}<span className="text-xs font-bold text-slate-400 font-sans">/kg</span></p>
                </div>
              </div>

              <form onSubmit={submitSellFastBuy} className="space-y-8">
                <div className="relative group">
                  <label className="mb-3 block text-xs font-black text-slate-400 uppercase tracking-widest px-4 font-sans">Required Quantity</label>
                  <div className="relative">
                    <Input
                      variant="clay"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={sellFastBuyQuantity}
                      onChange={(event) => setSellFastBuyQuantity(event.target.value)}
                      placeholder="0.0"
                      className="!rounded-[24px] !p-6 !text-4xl font-black text-slate-800 !bg-slate-50 !border-none !ring-1 !ring-slate-200 focus:!ring-red-500 transition-all"
                      required
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">KG UNIT</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between px-2">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight">Limit: {Number(sellFastBuyTarget.quantity_kg || 0).toFixed(1)} kg</p>
                    <p className="text-[10px] font-bold text-red-700/60 uppercase tracking-tight">* No bargaining allowed</p>
                  </div>
                </div>

                {sellFastBuyError && <div className="p-4 bg-red-50 border-2 border-red-100 text-red-700 rounded-3xl text-[11px] font-black uppercase tracking-widest text-center animate-shake">{sellFastBuyError}</div>}
                
                <div className="flex gap-6 pt-4">
                  <Button type="button" onClick={closeSellFastBuyModal} variant="clay" className="flex-1 !bg-slate-100 !text-slate-500 font-black py-5 !rounded-[24px] active:scale-95 transition-transform">
                    Cancel
                  </Button>
                  <Button type="submit" variant="clay" disabled={sellFastBuyLoading} className="flex-1 !bg-gradient-to-br from-red-600 to-red-700 !text-white font-black py-5 !rounded-[24px] shadow-xl shadow-red-500/30 active:scale-95 transition-transform">
                    {sellFastBuyLoading ? 'Authorizing...' : 'Pay with G-Pay'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {reviewTarget && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/40 backdrop-blur-xl px-4 p-8">
          <Card variant="clay" className="w-full max-w-lg rounded-[48px] bg-white/95 backdrop-blur-3xl p-0 shadow-[0_32px_80px_-16px_rgba(46,125,50,0.3)] border border-white/80 animate-in fade-in zoom-in duration-500 overflow-hidden">
            {/* Review Header */}
            <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-8 text-white relative">
              <div className="absolute top-0 right-0 p-6">
                <button onClick={closeReviewModal} className="text-white/60 hover:text-white transition-colors bg-white/10 p-2 rounded-xl backdrop-blur-md">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex items-center gap-6">
                <div className="bg-white/20 p-4 rounded-[24px] shadow-inner backdrop-blur-md border border-white/20">
                  <span className="text-4xl text-amber-400">⭐</span>
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight leading-tight">Client Feedback</h2>
                  <p className="text-slate-300 text-[11px] font-black uppercase tracking-widest mt-1 opacity-80 italic">Order Ref: #{reviewTarget.order.id}</p>
                </div>
              </div>
            </div>

            <div className="p-10 space-y-8">
              {/* Target Summary Card */}
              <div className="clay-input !rounded-[32px] p-6 bg-slate-50 border border-slate-100 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Feedback Target</p>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">
                    {reviewTarget.target === 'logistics' ? 'Logistics Partner' : 'Certified Farmer'}
                  </h3>
                </div>
                <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 italic font-black text-slate-400 text-xs">
                  {reviewTarget.order.product_name}
                </div>
              </div>

              <form onSubmit={submitReview} className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="mb-4 block text-xs font-black text-slate-400 uppercase tracking-widest px-2">Global Rating</label>
                    <div className="grid grid-cols-5 gap-2">
                       {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReviewRating(String(value))}
                          className={`aspect-square rounded-2xl flex items-center justify-center text-xl transition-all border-2 ${
                            Number(reviewRating) >= value
                              ? 'bg-amber-100 border-amber-400 text-amber-600 shadow-sm'
                              : 'bg-slate-50 border-slate-100 text-slate-300'
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-4 block text-xs font-black text-slate-400 uppercase tracking-widest px-2">Dropdown Pick</label>
                    <select
                      value={reviewRating}
                      onChange={(event) => setReviewRating(event.target.value)}
                      className="clay-input w-full !rounded-[20px] !p-4 !text-sm font-black text-slate-700 !bg-slate-50 border-none ring-1 ring-slate-200"
                    >
                      {[5, 4, 3, 2, 1].map((value) => (
                        <option key={value} value={String(value)}>{value} Stars {value >= 4 ? ' - Highly Recommended' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-4 block text-xs font-black text-slate-400 uppercase tracking-widest px-2">Detailed experience</label>
                  <textarea
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    rows={4}
                    className="clay-input w-full !rounded-[32px] !p-6 !text-sm font-black text-slate-800 !bg-slate-50 !border-none !ring-1 !ring-slate-200 focus:!ring-slate-400 transition-all placeholder:text-slate-300"
                    placeholder={
                      reviewTarget.target === 'logistics'
                        ? 'Write about transport quality, timing, and professionalism...'
                        : 'Write about produce quality, communication, and overall trade...'
                    }
                  />
                </div>

                {reviewError && <div className="p-4 bg-red-50 border-2 border-red-100 text-red-700 rounded-3xl text-[11px] font-black uppercase tracking-widest text-center">{reviewError}</div>}
                
                <div className="flex gap-6 pt-4">
                  <Button type="button" onClick={closeReviewModal} variant="clay" className="flex-1 !bg-slate-100 !text-slate-500 font-black py-5 !rounded-[24px] active:scale-95 transition-transform">
                    Discard
                  </Button>
                  <Button type="submit" variant="clay" disabled={reviewSubmitting} className="flex-1 !bg-gradient-to-br from-slate-600 to-slate-800 !text-white font-black py-5 !rounded-[24px] shadow-xl shadow-slate-500/30 active:scale-95 transition-transform">
                    {reviewSubmitting ? 'Registering...' : 'Publish Review'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      <FakeGooglePayModal
        isOpen={Boolean(googlePayCheckout)}
        checkout={googlePayCheckout}
        processing={googlePayProcessing}
        error={googlePayError}
        onCancel={cancelGooglePay}
        onConfirm={confirmGooglePay}
      />

      <BuyerFarmerChatWidget />
    </div>
  )
}
