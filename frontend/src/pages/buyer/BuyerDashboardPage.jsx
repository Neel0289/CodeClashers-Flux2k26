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

      <Card className="mt-4 border-red-200 bg-red-50/60">
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
              <div key={alert.id} className="rounded-[12px] border border-red-200 bg-white px-3 py-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {alert.farmer_name} wants to sell {alert.product_name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {Number(alert.quantity_kg || 0).toFixed(1)} kg
                      {alert.price_per_kg ? ` | ₹${alert.price_per_kg}/kg` : ''}
                    </p>
                    {alert.note ? <p className="mt-1 text-xs text-text-primary">{alert.note}</p> : null}
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => openSellFastBuyModal(alert)}
                        disabled={!alert.product || Number(alert.quantity_kg || 0) <= 0}
                        className="rounded-[8px] bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {!alert.product ? 'Direct buy unavailable' : 'Buy Now (No Bargaining)'}
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-text-muted">
                    {new Date(alert.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
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
                      {order.status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => handleGenerateInvoice(order)}
                          className="mt-2 rounded-[8px] bg-accent px-2 py-1 text-xs font-semibold text-white hover:opacity-90"
                        >
                          Invoice
                        </button>
                      )}
                      {order.buyer_review_submitted ? (
                        <p className="mt-1 text-xs font-medium text-emerald-700">Farmer review submitted.</p>
                      ) : order.buyer_can_review ? (
                        <button
                          type="button"
                          onClick={() => openReviewModal(order, 'farmer')}
                          className="mt-2 rounded-[8px] bg-emerald-700 px-2 py-1 text-xs text-white hover:bg-emerald-800"
                        >
                          Review Farmer
                        </button>
                      ) : (order.status === 'delivered' || order.status === 'completed') ? (
                        <p className="mt-1 text-xs text-amber-700">Farmer review window closed (3 days after delivery).</p>
                      ) : null}

                      {(() => {
                        const reviewableLogistics = getReviewableLogisticsForOrder(order.id)
                        const deliveryDone = order.status === 'delivered' || order.status === 'completed'

                        if (!reviewableLogistics) return null

                        if (order.buyer_logistics_review_submitted) {
                          return <p className="mt-1 text-xs font-medium text-blue-700">Logistics review submitted.</p>
                        }

                        if (order.buyer_can_review_logistics) {
                          return (
                            <button
                              type="button"
                              onClick={() => openReviewModal(order, 'logistics', reviewableLogistics)}
                              className="mt-2 rounded-[8px] bg-blue-700 px-2 py-1 text-xs text-white hover:bg-blue-800"
                            >
                              Review Logistics Partner
                            </button>
                          )
                        }

                        if (deliveryDone) {
                          return <p className="mt-1 text-xs text-amber-700">Logistics review window closed (3 days after delivery).</p>
                        }

                        return null
                      })()}
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <p className="mb-4 text-lg font-semibold">Logistics</p>
          {loading && <p className="text-sm text-text-muted">Loading logistics...</p>}
          {!loading && recentLogistics.length === 0 && <p className="text-sm text-text-muted">No logistics updates yet.</p>}
          {!loading && recentLogistics.length > 0 && (
            <div className="space-y-3">
              {recentLogistics.map((request) => {
                const linkedOrder = orders.find((order) => Number(order.id) === Number(request.order))
                const packageSize = Number(request.weight_kg || linkedOrder?.quantity || 0)
                const hasInvoice = Number(request.quoted_fee || 0) > 0

                return (
                  <div key={request.id} className="rounded-[12px] border border-border px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">Package size: {packageSize.toFixed(1)} kg</p>
                        <p className="text-xs text-text-muted">
                          Provider: {request.logistics_partner_name || `Partner #${request.logistics_partner}`}
                        </p>
                        <p className="text-xs text-text-muted">
                          Route: {request.pickup_city || '-'}, {request.pickup_state || '-'} to {request.drop_city || '-'}, {request.drop_state || '-'}
                        </p>
                        <p className="text-xs text-text-muted">Fee: ₹{request.quoted_fee || '0.00'}</p>
                        <p className="text-xs text-text-muted">Order: #{request.order}</p>
                        {hasInvoice && linkedOrder && ['confirmed', 'delivered'].includes(linkedOrder.status) && (
                          <button
                            type="button"
                            onClick={() => handleGenerateLogisticInvoice(linkedOrder)}
                            className="mt-2 rounded-[8px] bg-emerald-700 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
                          >
                            Logistic Invoice
                          </button>
                        )}
                      </div>
                      <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-text-primary">{formatStatus(request.status)}</span>
                    </div>
                  </div>
                )
              })}
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

                  {canBuyerAct(item) && (
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
                  {['open', 'countered'].includes(item.status) && !canBuyerAct(item) && (
                    <p className="mt-2 text-xs text-text-muted">Waiting for farmer response.</p>
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
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">What are you looking for?</label>
            <select
              value={selectedCategory}
              onChange={(event) => {
                setSelectedCategory(event.target.value)
                setSelectedItem('all')
              }}
              className="w-full rounded-[12px] border border-border bg-white px-3 py-2 text-text-primary"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{formatStatus(category)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">Which item?</label>
            <select
              value={selectedItem}
              onChange={(event) => setSelectedItem(event.target.value)}
              className="w-full rounded-[12px] border border-border bg-white px-3 py-2 text-text-primary"
            >
              <option value="all">All Items</option>
              {itemOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
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

            {showOrderAnimation && (
              <div className="mt-4 rounded-[12px] border border-emerald-200 bg-emerald-50/70 px-3 py-3 text-center">
                <div className="mx-auto coin-loader" />
                <p className="mt-2 text-sm font-medium text-emerald-800">{orderAnimationMessage}</p>
              </div>
            )}

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

      {sellFastBuyTarget && (
        <div className="fixed inset-0 z-[1120] flex items-center justify-center bg-black/45 p-4">
          <Card className="w-full max-w-md">
            <p className="text-xl font-semibold text-red-700">Buy Emergency Alert</p>
            <p className="mt-2 text-sm text-text-primary">
              {sellFastBuyTarget.farmer_name} selling {sellFastBuyTarget.product_name}
            </p>
            <p className="text-sm text-text-muted">
              Available: {Number(sellFastBuyTarget.quantity_kg || 0).toFixed(1)} kg
              {sellFastBuyTarget.price_per_kg ? ` | Fixed price: ₹${sellFastBuyTarget.price_per_kg}/kg` : ''}
            </p>
            <p className="mt-1 text-xs text-red-700">No bargaining is allowed for emergency purchases.</p>

            <form onSubmit={submitSellFastBuy} className="mt-4 space-y-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">Quantity (kg)</label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={sellFastBuyQuantity}
                  onChange={(event) => setSellFastBuyQuantity(event.target.value)}
                  placeholder="Enter quantity in kg"
                  required
                />
              </div>

              {sellFastBuyError ? <p className="text-sm text-red-600">{sellFastBuyError}</p> : null}

              <div className="flex gap-2">
                <Button type="button" onClick={closeSellFastBuyModal} className="bg-surface-2 text-text-primary hover:bg-surface-2">
                  Cancel
                </Button>
                <Button type="submit" disabled={sellFastBuyLoading}>
                  {sellFastBuyLoading ? 'Processing...' : 'Continue To Pay'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {reviewTarget && (
        <div className="fixed inset-0 z-[1150] flex items-center justify-center bg-black/45 p-4">
          <Card className="w-full max-w-md">
            <p className="text-xl font-semibold text-accent">
              {reviewTarget.target === 'logistics' ? 'Rate Logistics Partner' : 'Rate Farmer'}
            </p>
            <p className="mt-2 text-sm text-text-muted">
              Order #{reviewTarget.order.id} • {reviewTarget.order.product_name}
            </p>
            {reviewTarget.target === 'logistics' ? (
              <p className="mt-1 text-xs text-text-muted">
                Partner: {reviewTarget.logisticsRequest?.logistics_partner_name || `Partner #${reviewTarget.logisticsRequest?.logistics_partner || ''}`}
              </p>
            ) : null}
            <form onSubmit={submitReview} className="mt-4 space-y-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">Rating (1 to 5)</label>
                <select
                  value={reviewRating}
                  onChange={(event) => setReviewRating(event.target.value)}
                  className="w-full rounded-[12px] border border-border bg-white px-3 py-2 text-text-primary"
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={String(value)}>{value}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">Comment (optional)</label>
                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  rows={3}
                  className="w-full rounded-[12px] border border-border bg-white px-3 py-2 text-text-primary"
                  placeholder={
                    reviewTarget.target === 'logistics'
                      ? 'Share your delivery experience with the logistics partner'
                      : 'Share your experience with the farmer'
                  }
                />
              </div>

              {reviewError ? <p className="text-sm text-red-600">{reviewError}</p> : null}

              <div className="flex gap-2">
                <Button type="button" onClick={closeReviewModal} className="bg-surface-2 text-text-primary hover:bg-surface-2">
                  Cancel
                </Button>
                <Button type="submit" disabled={reviewSubmitting}>
                  {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </form>
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
    </>
  )
}
