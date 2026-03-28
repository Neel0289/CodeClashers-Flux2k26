import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer } from 'react-leaflet'
import { useNavigate } from 'react-router-dom'

import { createLogisticsRequest, declineRequest, getLogisticsRequests, getPartners } from '../../api/logistics'
import { getNegotiations, respondNegotiation } from '../../api/negotiations'
import { getOrders, setOrderLocations } from '../../api/orders'
import { createLogisticsCheckout, verifyLogisticsCheckout } from '../../api/payments'
import { createProduct, updateProduct, deleteProduct, getProducts } from '../../api/products'
import { createReview, getReviews } from '../../api/reviews'
import { createSellFastAlert } from '../../api/alerts'
import AddProductModal from '../../components/farmer/AddProductModal'
import FarmerAIAssistant from '../../components/farmer/FarmerAIAssistant'
import FarmerInsightsCharts from '../../components/farmer/FarmerInsightsCharts'
import EditProductModal from '../../components/farmer/EditProductModal'
import Button from '../../components/shared/Button'
import BuyerFarmerChatWidget from '../../components/shared/BuyerFarmerChatWidget'
import Card from '../../components/shared/Card'
import FakeGooglePayModal from '../../components/shared/FakeGooglePayModal'
import PageShell from '../../components/shared/PageShell'
import StatusBadge from '../../components/shared/StatusBadge'
import useAuth from '../../hooks/useAuth'
import { openInvoiceWindow } from '../../utils/invoice'
import MarketIntelligence from './MarketIntelligence'

const DEMO_REVIEWS_STORAGE_KEY = 'khetbazaar_demo_reviews'

function formatStatus(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatReviewDate(value) {
  if (!value) return 'Recently'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return 'Recently'
  }
}

function getDemoReviewsForFarmer(farmerId) {
  if (typeof window === 'undefined' || !farmerId) return []
  try {
    const rows = JSON.parse(window.localStorage.getItem(DEMO_REVIEWS_STORAGE_KEY) || '[]')
    if (!Array.isArray(rows)) return []
    return rows.filter((item) => Number(item?.reviewee) === Number(farmerId))
  } catch {
    return []
  }
}

function seedDemoReviewForFarmer(farmerId) {
  if (typeof window === 'undefined' || !farmerId) return []
  try {
    const rows = JSON.parse(window.localStorage.getItem(DEMO_REVIEWS_STORAGE_KEY) || '[]')
    const list = Array.isArray(rows) ? rows : []
    const seeded = {
      id: `demo-seeded-${farmerId}`,
      order: 'demo-order-101',
      reviewer: 'demo-buyer-1',
      reviewer_name: 'Aarav Sharma',
      reviewee: Number(farmerId),
      rating: 5,
      comment: 'Excellent quality crop. Fresh produce arrived exactly as promised.',
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      product_name: 'Tomato',
      order_quantity: 100,
      order_value: '3200.00',
      __demoReview: true,
    }

    const next = [seeded, ...list].slice(0, 30)
    window.localStorage.setItem(DEMO_REVIEWS_STORAGE_KEY, JSON.stringify(next))
    return [seeded]
  } catch {
    return []
  }
}

const INDIA_CENTER = [22.9734, 78.6569]
const geocodeCache = new Map()

export default function FarmerDashboardPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [negotiations, setNegotiations] = useState([])
  const [orders, setOrders] = useState([])
  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [logisticsReviewTarget, setLogisticsReviewTarget] = useState(null)
  const [logisticsReviewRating, setLogisticsReviewRating] = useState('5')
  const [logisticsReviewComment, setLogisticsReviewComment] = useState('')
  const [logisticsReviewSubmitting, setLogisticsReviewSubmitting] = useState(false)
  const [logisticsReviewError, setLogisticsReviewError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [counterPrices, setCounterPrices] = useState({})
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [logisticsRequests, setLogisticsRequests] = useState([])
  const [bookingForm, setBookingForm] = useState({
    orderId: '',
  })
  const [partners, setPartners] = useState([])
  const [selectedPartnerId, setSelectedPartnerId] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [partnerSearchLoading, setPartnerSearchLoading] = useState(false)
  const [bookingMessage, setBookingMessage] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [quoteActionLoadingId, setQuoteActionLoadingId] = useState(null)
  const [googlePayCheckout, setGooglePayCheckout] = useState(null)
  const [googlePayProcessing, setGooglePayProcessing] = useState(false)
  const [googlePayError, setGooglePayError] = useState('')
  const [showPaymentAnimation, setShowPaymentAnimation] = useState(false)
  const [paymentAnimationMessage, setPaymentAnimationMessage] = useState('Preparing secure payment...')
  const [pickupCoords, setPickupCoords] = useState(null)
  const [dropCoords, setDropCoords] = useState(null)
  const [mapPreviewLoading, setMapPreviewLoading] = useState(false)
  const [requestingOrderId, setRequestingOrderId] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isSellFastModalOpen, setIsSellFastModalOpen] = useState(false)
  const [sellFastLoading, setSellFastLoading] = useState(false)
  const [sellFastError, setSellFastError] = useState('')
  const [sellFastSuccess, setSellFastSuccess] = useState('')
  const [sellFastForm, setSellFastForm] = useState({
    productId: '',
    quantityKg: '',
    pricePerKg: '',
    note: '',
  })
  const partnersSectionRef = useRef(null)
  const celebratedPaidOrdersRef = useRef(new Set())
  const knownOrderIdsRef = useRef(new Set())
  const hasPrimedOrderRefsRef = useRef(false)
  const paymentAnimationTimeoutRef = useRef(null)
  const pendingGooglePayActionRef = useRef(null)

  const triggerFarmerCoinAnimation = (message) => {
    if (paymentAnimationTimeoutRef.current) {
      clearTimeout(paymentAnimationTimeoutRef.current)
      paymentAnimationTimeoutRef.current = null
    }

    setPaymentAnimationMessage(message)
    setShowPaymentAnimation(true)
    paymentAnimationTimeoutRef.current = setTimeout(() => {
      setShowPaymentAnimation(false)
      paymentAnimationTimeoutRef.current = null
    }, 1900)
  }

  const loadDashboard = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true)
      setReviewsLoading(true)
    }
    setError('')
    const [productsRes, negotiationsRes, ordersRes, logisticsRes, reviewsRes] = await Promise.allSettled([
      getProducts(),
      getNegotiations(),
      getOrders(),
      getLogisticsRequests(),
      user?.id ? getReviews(user.id) : Promise.resolve({ data: [] }),
    ])

    if (productsRes.status === 'fulfilled') {
      setProducts(Array.isArray(productsRes.value.data) ? productsRes.value.data : [])
    }
    if (negotiationsRes.status === 'fulfilled') {
      setNegotiations(Array.isArray(negotiationsRes.value.data) ? negotiationsRes.value.data : [])
    }
    if (ordersRes.status === 'fulfilled') {
      setOrders(Array.isArray(ordersRes.value.data) ? ordersRes.value.data : [])
    }
    if (logisticsRes.status === 'fulfilled') {
      setLogisticsRequests(Array.isArray(logisticsRes.value.data) ? logisticsRes.value.data : [])
    }
    if (reviewsRes.status === 'fulfilled') {
      const apiReviews = Array.isArray(reviewsRes.value.data) ? reviewsRes.value.data : []
      let demoReviews = import.meta.env.DEV ? getDemoReviewsForFarmer(user?.id) : []
      if (import.meta.env.DEV && demoReviews.length === 0 && apiReviews.length === 0) {
        demoReviews = seedDemoReviewForFarmer(user?.id)
      }
      setReviews([...demoReviews, ...apiReviews])
    } else {
      let demoReviews = import.meta.env.DEV ? getDemoReviewsForFarmer(user?.id) : []
      if (import.meta.env.DEV && demoReviews.length === 0) {
        demoReviews = seedDemoReviewForFarmer(user?.id)
      }
      setReviews(demoReviews)
    }

    if (productsRes.status === 'rejected' && negotiationsRes.status === 'rejected') {
      setError('Could not load dashboard data. Please refresh.')
    }
    if (!silent) {
      setLoading(false)
      setReviewsLoading(false)
    }
  }

  const loadInitialPartners = async () => {
    try {
      const { data } = await getPartners({})
      const partnerRows = Array.isArray(data) ? data : []
      setPartners(partnerRows)
      setSelectedPartnerId('')
    } catch {
      setPartners([])
      setSelectedPartnerId('')
    }
  }

  useEffect(() => {
    loadDashboard()
    loadInitialPartners()
  }, [user?.id])

  useEffect(() => {
    const refreshDashboard = () => {
      loadDashboard({ silent: true })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshDashboard()
      }
    }

    const intervalId = setInterval(refreshDashboard, 6000)
    window.addEventListener('focus', refreshDashboard)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      window.removeEventListener('focus', refreshDashboard)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user?.id])

  useEffect(() => {
    return () => {
      if (paymentAnimationTimeoutRef.current) {
        clearTimeout(paymentAnimationTimeoutRef.current)
        paymentAnimationTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!Array.isArray(orders) || orders.length === 0) {
      return
    }

    if (!hasPrimedOrderRefsRef.current) {
      for (const order of orders) {
        knownOrderIdsRef.current.add(order.id)
        const isPaid = order.payment_status === 'escrow' || order.payment_status === 'released'
        if (isPaid) {
          celebratedPaidOrdersRef.current.add(order.id)
        }
      }
      hasPrimedOrderRefsRef.current = true
      return
    }

    const newlyArrivedOrders = orders.filter((order) => !knownOrderIdsRef.current.has(order.id))
    for (const order of newlyArrivedOrders) {
      knownOrderIdsRef.current.add(order.id)
    }

    const newlyPaidOrders = orders.filter((order) => {
      const isPaid = order.payment_status === 'escrow' || order.payment_status === 'released'
      return isPaid && !celebratedPaidOrdersRef.current.has(order.id)
    })

    if (newlyPaidOrders.length === 0) {
      if (newlyArrivedOrders.length > 0) {
        const firstNewOrder = newlyArrivedOrders[0]
        const buyerName = firstNewOrder?.buyer_name || 'Customer'
        const amount = Number(firstNewOrder?.agreed_price || 0)
        const suffix = newlyArrivedOrders.length > 1 ? ` (+${newlyArrivedOrders.length - 1} more)` : ''
        const orderPrefix = firstNewOrder?.is_emergency_order ? 'Emergency order' : 'New order'
        triggerFarmerCoinAnimation(`${orderPrefix} from ${buyerName}: ₹${amount.toFixed(2)}${suffix}`)
      }
      return
    }

    for (const paidOrder of newlyPaidOrders) {
      celebratedPaidOrdersRef.current.add(paidOrder.id)
    }

    const firstOrder = newlyPaidOrders[0]
    const buyerName = firstOrder?.buyer_name || 'Customer'
    const amount = Number(firstOrder?.agreed_price || 0)
    const suffix = newlyPaidOrders.length > 1 ? ` (+${newlyPaidOrders.length - 1} more)` : ''

    triggerFarmerCoinAnimation(`Payment received from ${buyerName}: ₹${amount.toFixed(2)}${suffix}`)
  }, [orders])

  const handleAddProduct = async (formData) => {
    setIsSubmitting(true)
    try {
      const payload = {
        ...formData,
        state: user?.profile?.state || '',
        city: user?.profile?.city || '',
      }
      await createProduct(payload)
      setIsModalOpen(false)
      await loadDashboard()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create product. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditProduct = async (formData) => {
    setIsSubmitting(true)
    try {
      const payload = {
        ...formData,
        state: user?.profile?.state || editingProduct?.state || '',
        city: user?.profile?.city || editingProduct?.city || '',
      }
      await updateProduct(editingProduct.id, payload)
      setIsEditModalOpen(false)
      setEditingProduct(null)
      await loadDashboard()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update product. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return

    setDeleteError('')
    try {
      await deleteProduct(productId)
      await loadDashboard()
    } catch (err) {
      setDeleteError(err.response?.data?.detail || 'Failed to delete product. Please try again.')
    }
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
    setIsEditModalOpen(true)
  }

  const getLatestOfferTotal = (negotiation) => {
    const latest = negotiation?.messages?.[negotiation.messages.length - 1]
    if (!latest) return Number(negotiation?.latest_offered_price || 0)
    return Number(latest.offered_price || negotiation?.latest_offered_price || 0)
  }

  const getLatestOfferPerKg = (negotiation) => {
    const total = getLatestOfferTotal(negotiation)
    const qty = Number(negotiation.quantity || 0)
    if (!qty) return 0
    return total / qty
  }

  const getLatestMessage = (negotiation) => {
    if (!Array.isArray(negotiation?.messages) || negotiation.messages.length === 0) return null
    return negotiation.messages[negotiation.messages.length - 1]
  }

  const canFarmerAct = (negotiation) => {
    if (!['open', 'countered'].includes(negotiation.status)) return false
    const latest = getLatestMessage(negotiation)
    if (!latest) return true
    return Number(latest.sender) !== Number(user?.id)
  }

  const handleNegotiationAction = async (negotiation, action) => {
    setError('')
    setActionLoadingId(negotiation.id)
    try {
      if (action === 'counter') {
        const counterPerKg = Number(counterPrices[negotiation.id])
        if (!Number.isFinite(counterPerKg) || counterPerKg <= 0) {
          setError('Please enter a valid counter price per kg.')
          setActionLoadingId(null)
          return
        }
        const total = counterPerKg * Number(negotiation.quantity)
        await respondNegotiation(negotiation.id, {
          action: 'counter',
          offered_price: total,
          message: `Farmer counter offer: ₹${counterPerKg}/kg`,
        })
      } else if (action === 'accept') {
        await respondNegotiation(negotiation.id, {
          action: 'accept',
          offered_price: getLatestOfferTotal(negotiation),
        })
      } else {
        await respondNegotiation(negotiation.id, { action: 'reject' })
      }

      await loadDashboard()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not update negotiation. Please try again.')
    } finally {
      setActionLoadingId(null)
    }
  }

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
    const coords = { lat: Number(first.lat), lon: Number(first.lon) }
    geocodeCache.set(query, coords)
    return coords
  }

  const resolveOrderRoute = (order) => {
    if (!order) return null

    const pickup_city = order.pickup_city || order.farmer_city || ''
    const pickup_state = order.pickup_state || order.farmer_state || ''
    const drop_city = order.drop_city || order.buyer_city || ''
    const drop_state = order.drop_state || order.buyer_state || ''

    return {
      pickup_city,
      pickup_state,
      drop_city,
      drop_state,
      pickup_latitude: order.farmer_latitude,
      pickup_longitude: order.farmer_longitude,
      drop_latitude: order.buyer_latitude,
      drop_longitude: order.buyer_longitude,
    }
  }

  useEffect(() => {
    const loadMapPreview = async () => {
      if (!bookingForm.orderId) {
        setPickupCoords(null)
        setDropCoords(null)
        return
      }

      const order = orders.find((item) => String(item.id) === String(bookingForm.orderId))
      const route = resolveOrderRoute(order)
      if (!route) {
        setPickupCoords(null)
        setDropCoords(null)
        return
      }

      setMapPreviewLoading(true)
      try {
        let pickup = null
        let drop = null

        if (typeof route.pickup_latitude === 'number' && typeof route.pickup_longitude === 'number') {
          pickup = { lat: route.pickup_latitude, lon: route.pickup_longitude }
        } else if (route.pickup_city && route.pickup_state) {
          pickup = await geocodeLocation(`${route.pickup_city}, ${route.pickup_state}, India`)
        }

        if (typeof route.drop_latitude === 'number' && typeof route.drop_longitude === 'number') {
          drop = { lat: route.drop_latitude, lon: route.drop_longitude }
        } else if (route.drop_city && route.drop_state) {
          drop = await geocodeLocation(`${route.drop_city}, ${route.drop_state}, India`)
        }

        setPickupCoords(pickup)
        setDropCoords(drop)
      } catch {
        setPickupCoords(null)
        setDropCoords(null)
      } finally {
        setMapPreviewLoading(false)
      }
    }

    loadMapPreview()
  }, [bookingForm.orderId, orders])

  const handleFindPartners = async (orderIdOverride = null) => {
    setBookingError('')
    setBookingMessage('')
    const targetOrderId = orderIdOverride || bookingForm.orderId
    if (!targetOrderId) {
      setBookingError('Please select an order first.')
      return
    }

    if (orderIdOverride) {
      setBookingForm((prev) => ({ ...prev, orderId: String(orderIdOverride) }))
    }

    const selectedOrder = orders.find((item) => String(item.id) === String(targetOrderId))
    const route = resolveOrderRoute(selectedOrder)
    if (!route?.pickup_state || !route?.pickup_city || !route?.drop_state || !route?.drop_city) {
      setBookingError('Default pickup/drop address is missing. Ensure farmer and customer profiles have city and state.')
      return
    }

    const derivedWeight = selectedOrder?.quantity

    setPartnerSearchLoading(true)
    try {
      await setOrderLocations(targetOrderId, {
        pickup_state: route.pickup_state,
        pickup_city: route.pickup_city,
        drop_state: route.drop_state,
        drop_city: route.drop_city,
      })

      const { data } = await getPartners({
        pickup_state: route.pickup_state,
        drop_state: route.drop_state,
        weight: derivedWeight || undefined,
      })

      const partnerRows = Array.isArray(data) ? data : []
      setPartners(partnerRows)
      setSelectedPartnerId('')
      if (partnerRows.length === 0) {
        setBookingError('No logistics partners found for the selected route/weight.')
      }
    } catch (err) {
      setBookingError(err?.response?.data?.detail || 'Could not find partners. Please try again.')
      setPartners([])
    } finally {
      setPartnerSearchLoading(false)
    }
  }

  const handleSelectOrderForLogistics = async (orderId) => {
    await handleFindPartners(orderId)
    requestAnimationFrame(() => {
      partnersSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleRequestLogistics = async () => {
    setBookingError('')
    setBookingMessage('')
    if (!bookingForm.orderId) {
      setBookingError('Please select an order first.')
      return
    }

    const order = orders.find((item) => String(item.id) === String(bookingForm.orderId))
    const route = resolveOrderRoute(order)
    if (!route?.pickup_state || !route?.pickup_city || !route?.drop_state || !route?.drop_city) {
      setBookingError('Cannot request logistics because default pickup/drop address is missing.')
      return
    }

    setBookingLoading(true)
    setRequestingOrderId(String(bookingForm.orderId))
    try {
      await setOrderLocations(bookingForm.orderId, {
        pickup_state: route.pickup_state,
        pickup_city: route.pickup_city,
        drop_state: route.drop_state,
        drop_city: route.drop_city,
      })

      const { data } = await createLogisticsRequest({
        order_id: bookingForm.orderId,
        logistics_partner_id: selectedPartnerId || undefined,
        crop_description: `Delivery for ${order?.product_name || 'order'} (${order?.quantity || 0} kg)`,
        weight_kg: Number(order?.quantity || 0),
      })
      const createdCount = Array.isArray(data) ? data.length : 0
      setBookingMessage(
        createdCount > 0
          ? `Logistics request sent to ${createdCount} partners.`
          : 'Logistics request sent successfully.',
      )
      setPartners([])
      setSelectedPartnerId('')
      await loadDashboard()
    } catch (err) {
      setBookingError(err?.response?.data?.detail || 'Could not send logistics request.')
    } finally {
      setBookingLoading(false)
      setRequestingOrderId(null)
    }
  }

  const openGooglePayForLogisticsQuote = async (requestId) => {
    const { data: checkoutData } = await createLogisticsCheckout(requestId)

    return new Promise((resolve, reject) => {
      pendingGooglePayActionRef.current = { resolve, reject }
      setGooglePayError('')
      setGooglePayProcessing(false)
      setGooglePayCheckout({ ...checkoutData, request_id: requestId })
    })
  }

  const closeGooglePayModal = () => {
    setGooglePayCheckout(null)
    setGooglePayProcessing(false)
    setGooglePayError('')
  }

  const cancelGooglePay = () => {
    const pending = pendingGooglePayActionRef.current
    pendingGooglePayActionRef.current = null
    closeGooglePayModal()
    pending?.reject?.(new Error('PAYMENT_CANCELLED'))
  }

  const confirmGooglePay = async (payload) => {
    if (!googlePayCheckout?.request_id) return

    setGooglePayProcessing(true)
    setGooglePayError('')
    try {
      await verifyLogisticsCheckout(googlePayCheckout.request_id, {
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

  const handleFarmerQuoteResponse = async (requestId, action) => {
    setBookingError('')
    setBookingMessage('')
    setQuoteActionLoadingId(requestId)
    try {
      if (action === 'accept') {
        setPaymentAnimationMessage('Preparing Google Pay...')
        setShowPaymentAnimation(true)
        await openGooglePayForLogisticsQuote(requestId)

        setBookingMessage('Payment successful. Logistics quote accepted.')
      } else {
        await declineRequest(requestId)
        setBookingMessage('Logistics quote declined. Please select another partner.')
      }
      await loadDashboard()
    } catch (err) {
      if (err?.message === 'PAYMENT_CANCELLED') {
        setBookingError('Payment cancelled. Logistics quote is still pending.')
      } else {
        setBookingError(err?.response?.data?.detail || err?.message || 'Could not update logistics quote status.')
      }
    } finally {
      setQuoteActionLoadingId(null)
      setShowPaymentAnimation(false)
    }
  }

  const stats = useMemo(() => {
    const activeListings = products.filter((p) => p.is_available).length
    const openNegotiations = negotiations.filter((n) => ['open', 'countered'].includes(n.status)).length
    const pendingLogistics = orders.filter((o) => !['shipped', 'delivered', 'completed'].includes(o.status)).length
    const earnings = orders
      .filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + (Number(o.agreed_price) || 0), 0)

    return [
      { label: 'Active Listings', value: activeListings },
      { label: 'Open Negotiations', value: openNegotiations },
      { label: 'Pending Logistics', value: pendingLogistics },
      { label: 'Earnings', value: `₹${earnings.toLocaleString()}` },
    ]
  }, [products, negotiations, orders])

  const recentListings = useMemo(() => products, [products])
  const recentNegotiations = useMemo(() => negotiations, [negotiations])
  const recentOrders = useMemo(() => orders, [orders])
  const recentReviews = useMemo(() => reviews.slice(0, 6), [reviews])
  const averageReviewRating = useMemo(() => {
    if (!reviews.length) return null
    const total = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0)
    return (total / reviews.length).toFixed(1)
  }, [reviews])
  const recentLogisticsRequests = useMemo(() => logisticsRequests.slice(0, 5), [logisticsRequests])
  const ordersById = useMemo(() => {
    const map = new Map()
    for (const order of orders) {
      map.set(Number(order.id), order)
    }
    return map
  }, [orders])
  const acceptedLogisticsCount = useMemo(
    () => logisticsRequests.filter((request) => request.status === 'accepted').length,
    [logisticsRequests],
  )
  const acceptedRequestOrderIds = useMemo(
    () => new Set(logisticsRequests.filter((request) => request.status === 'accepted').map((request) => Number(request.order))),
    [logisticsRequests],
  )
  const activeRequestOrderIds = useMemo(
    () => new Set(logisticsRequests.filter((request) => ['pending', 'quoted'].includes(request.status)).map((request) => Number(request.order))),
    [logisticsRequests],
  )
  const selectedOrder = useMemo(
    () => orders.find((item) => String(item.id) === String(bookingForm.orderId)) || null,
    [orders, bookingForm.orderId],
  )
  const selectedOrderRoute = useMemo(() => resolveOrderRoute(selectedOrder), [selectedOrder])

  const canRequestLogisticsForOrder = (order) => {
    return ['confirmed', 'logistics_pending'].includes(order.status)
      && !acceptedRequestOrderIds.has(Number(order.id))
      && !activeRequestOrderIds.has(Number(order.id))
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const handleGenerateInvoice = (order) => {
    const opened = openInvoiceWindow({
      invoicePrefix: 'INV',
      orderId: order?.id,
      invoiceDate: order?.created_at ? new Date(order.created_at) : new Date(),
      title: 'KhetBazaar Invoice',
      subtitle: 'One-click order invoice',
      sellerLabel: 'Seller (Farmer)',
      sellerName: user?.first_name || user?.username || 'Farmer',
      sellerAddress: `${order?.pickup_city || user?.profile?.city || ''}, ${order?.pickup_state || user?.profile?.state || ''}`,
      buyerLabel: 'Buyer',
      buyerName: order?.buyer_name || `Buyer #${order?.buyer || ''}`,
      buyerAddress: `${order?.drop_city || order?.buyer_city || ''}, ${order?.drop_state || order?.buyer_state || ''}`,
      itemLabel: 'Crop',
      itemName: order?.product_name || `Product #${order?.product || ''}`,
      quantity: order?.quantity,
      total: order?.agreed_price,
    })

    if (!opened) {
      setError('Could not open invoice window. Please allow popups and try again.')
    }
  }

  const handleGenerateLogisticsInvoice = (request) => {
    const routeText = `${request?.pickup_city || '-'}, ${request?.pickup_state || '-'} -> ${request?.drop_city || '-'}, ${request?.drop_state || '-'}`
    const opened = openInvoiceWindow({
      invoicePrefix: 'LINV',
      orderId: request?.order || request?.id,
      invoiceDate: request?.created_at ? new Date(request.created_at) : new Date(),
      title: 'KhetBazaar Logistics Invoice',
      subtitle: 'Farmer logistics invoice',
      sellerLabel: 'Service Provider (Logistics)',
      sellerName: request?.logistics_partner_name || `Partner #${request?.logistics_partner || ''}`,
      sellerAddress: routeText,
      buyerLabel: 'Farmer',
      buyerName: user?.first_name || user?.username || 'Farmer',
      buyerAddress: `${request?.pickup_city || user?.profile?.city || ''}, ${request?.pickup_state || user?.profile?.state || ''}`,
      itemLabel: 'Service',
      itemName: `Logistics for Order #${request?.order || ''}`,
      quantity: request?.weight_kg || request?.order_quantity || 0,
      total: request?.quoted_fee || 0,
      extraRows: [
        { label: 'Request Type', value: formatStatus(request?.status) },
        { label: 'Route', value: routeText },
      ],
    })

    if (!opened) {
      setError('Could not open invoice window. Please allow popups and try again.')
    }
  }

  const openLogisticsReviewModal = (request) => {
    const order = ordersById.get(Number(request?.order))
    if (!order) {
      setError('Could not find the linked order for this logistics request.')
      return
    }

    setLogisticsReviewTarget({
      request,
      order,
    })
    setLogisticsReviewRating('5')
    setLogisticsReviewComment('')
    setLogisticsReviewError('')
  }

  const closeLogisticsReviewModal = () => {
    setLogisticsReviewTarget(null)
    setLogisticsReviewRating('5')
    setLogisticsReviewComment('')
    setLogisticsReviewError('')
  }

  const submitLogisticsReview = async (event) => {
    event.preventDefault()
    if (!logisticsReviewTarget?.order) return

    const rating = Number(logisticsReviewRating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setLogisticsReviewError('Please select a rating between 1 and 5.')
      return
    }

    setLogisticsReviewSubmitting(true)
    setLogisticsReviewError('')
    try {
      await createReview({
        order_id: logisticsReviewTarget.order.id,
        review_target: 'logistics',
        rating,
        comment: logisticsReviewComment,
      })
      await loadDashboard()
      closeLogisticsReviewModal()
    } catch (err) {
      setLogisticsReviewError(err?.response?.data?.detail || 'Could not submit logistics review.')
    } finally {
      setLogisticsReviewSubmitting(false)
    }
  }

  const openSellFastModal = () => {
    setSellFastError('')
    setSellFastSuccess('')
    setSellFastForm({
      productId: products[0]?.id ? String(products[0].id) : '',
      quantityKg: products[0]?.quantity_available ? String(products[0].quantity_available) : '',
      pricePerKg: products[0]?.base_price ? String(products[0].base_price) : '',
      note: '',
    })
    setIsSellFastModalOpen(true)
  }

  const submitSellFastAlert = async (event) => {
    event.preventDefault()
    const quantityValue = Number(sellFastForm.quantityKg)
    const priceValue = sellFastForm.pricePerKg ? Number(sellFastForm.pricePerKg) : null

    if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
      setSellFastError('Enter a valid quantity in kg.')
      return
    }
    if (priceValue !== null && (!Number.isFinite(priceValue) || priceValue <= 0)) {
      setSellFastError('Enter a valid asking price per kg.')
      return
    }

    setSellFastLoading(true)
    setSellFastError('')
    try {
      await createSellFastAlert({
        product: sellFastForm.productId || null,
        quantity_kg: quantityValue,
        price_per_kg: priceValue,
        note: sellFastForm.note,
      })
      setSellFastSuccess('Emergency Sell Fast alert sent to all buyers.')
      setTimeout(() => setIsSellFastModalOpen(false), 700)
    } catch (err) {
      setSellFastError(err?.response?.data?.detail || 'Could not send sell fast alert.')
    } finally {
      setSellFastLoading(false)
    }
  }

  return (
    <>
      <PageShell
        title="Farmer Dashboard"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => navigate('/farmer/profile')} className="bg-accent/10 text-accent border border-accent/20 hover:bg-accent hover:text-white transition-colors">
              My Profile
            </Button>
            <Button onClick={() => setIsModalOpen(true)}>+ Add Food Item</Button>
            <Button onClick={openSellFastModal} className="bg-red-600 hover:bg-red-700">
              Emergency Sell Fast
            </Button>
            <Button onClick={handleLogout} className="bg-gray-400 hover:bg-gray-500">
              Logout
            </Button>
          </div>
        }
      >
        <div className="sticky top-3 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-[12px] border border-border bg-surface p-2">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`rounded-[10px] px-3 py-1.5 text-sm font-medium ${activeTab === 'dashboard' ? 'bg-accent text-white' : 'bg-surface-2 text-text-primary hover:bg-surface-3'}`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('market-intelligence')}
            className={`rounded-[10px] px-3 py-1.5 text-sm font-medium ${activeTab === 'market-intelligence' ? 'bg-accent text-white' : 'bg-surface-2 text-text-primary hover:bg-surface-3'}`}
          >
            Market Intelligence
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders-logistics')}
            className={`rounded-[10px] px-3 py-1.5 text-sm font-medium ${activeTab === 'orders-logistics' ? 'bg-accent text-white' : 'bg-surface-2 text-text-primary hover:bg-surface-3'}`}
          >
            Orders & Logistics
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              {stats.map((stat) => (
                <Card key={stat.label} className="p-4">
                  <p className="text-sm text-text-muted">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-accent">{stat.value}</p>
                </Card>
              ))}
            </div>
            <FarmerInsightsCharts
              products={products}
              orders={orders}
              negotiations={negotiations}
              logisticsRequests={logisticsRequests}
            />

            <div className="mt-6">
              <Card>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-lg font-semibold">Buyer Reviews</p>
                  {averageReviewRating && (
                    <p className="text-sm font-medium text-text-muted">
                      Avg rating: <span className="text-amber-600">{averageReviewRating} / 5</span>
                    </p>
                  )}
                </div>

                {reviewsLoading && <p className="text-sm text-text-muted">Loading reviews...</p>}
                {!reviewsLoading && recentReviews.length === 0 && (
                  <p className="text-sm text-text-muted">No buyer reviews yet.</p>
                )}

                {!reviewsLoading && recentReviews.length > 0 && (
                  <div className="space-y-3">
                    {recentReviews.map((review) => {
                      const ratingValue = Number(review.rating) || 0
                      const stars = `${'★'.repeat(ratingValue)}${'☆'.repeat(Math.max(0, 5 - ratingValue))}`

                      return (
                        <div key={review.id} className="rounded-[12px] border border-border px-3 py-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{review.reviewer_name || `Buyer #${review.reviewer}`}</p>
                              <p className="text-xs text-text-muted">
                                Order #{review.order} | {review.product_name || 'Product'} | {review.order_quantity || 0} kg
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-amber-600">{stars}</p>
                              <p className="text-xs text-text-muted">{formatReviewDate(review.created_at)}</p>
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-text-primary">{review.comment || 'No written feedback.'}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}

        {activeTab === 'market-intelligence' && (
          <div className="mt-4">
            <MarketIntelligence embedded />
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {activeTab === 'orders-logistics' && (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card>
            <p className="mb-4 text-lg font-semibold">Active Listings</p>
            {deleteError && <div className="mb-3 rounded-[12px] bg-red-50 p-2 text-xs text-red-600">{deleteError}</div>}
            {loading && <p className="text-sm text-text-muted">Loading listings...</p>}
            {!loading && recentListings.length === 0 && <p className="text-sm text-text-muted">No listings yet.</p>}
            {!loading && recentListings.length > 0 && (
              <div className="h-[23rem] space-y-3 overflow-y-auto pr-1">
                {recentListings.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-[12px] border border-border px-3 py-2"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-text-muted">
                        Stock: {product.quantity_available} kg | ₹{product.base_price}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={product.is_available ? 'available' : 'unavailable'} />
                      <button
                        onClick={() => openEditModal(product)}
                        className="rounded-[8px] bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="rounded-[8px] bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
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
          </Card>

          <Card>
            <p className="mb-4 text-lg font-semibold">Negotiated Orders</p>
            {loading && <p className="text-sm text-text-muted">Loading negotiations...</p>}
            {!loading && recentNegotiations.length === 0 && (
              <p className="text-sm text-text-muted">No negotiations yet.</p>
            )}
            {!loading && recentNegotiations.length > 0 && (
              <div className="h-[23rem] space-y-3 overflow-y-auto pr-1">
                {recentNegotiations.map((negotiation) => (
                  <div
                    key={negotiation.id}
                    className="rounded-[12px] border border-border px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">Customer: {negotiation.buyer_name || `Buyer #${negotiation.buyer}`}</p>
                        <p className="text-xs text-text-muted">Wants: {negotiation.product_name || `Product #${negotiation.product}`}</p>
                        <p className="text-xs text-text-muted">How much: {negotiation.quantity} kg</p>
                        <p className="text-xs text-text-muted">Negotiated price: ₹{getLatestOfferPerKg(negotiation).toFixed(2)}/kg</p>
                      </div>
                      <StatusBadge status={negotiation.status} />
                    </div>

                    {canFarmerAct(negotiation) && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={counterPrices[negotiation.id] || ''}
                            onChange={(event) => setCounterPrices((prev) => ({ ...prev, [negotiation.id]: event.target.value }))}
                            placeholder="Counter ₹/kg"
                            className="w-32 rounded-[8px] border border-border px-2 py-1 text-xs"
                          />
                          <button
                            type="button"
                            disabled={actionLoadingId === negotiation.id}
                            onClick={() => handleNegotiationAction(negotiation, 'counter')}
                            className="rounded-[8px] bg-amber-500 px-2 py-1 text-xs text-white hover:bg-amber-600 disabled:opacity-60"
                          >
                            Counter
                          </button>
                          <button
                            type="button"
                            disabled={actionLoadingId === negotiation.id}
                            onClick={() => handleNegotiationAction(negotiation, 'accept')}
                            className="rounded-[8px] bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={actionLoadingId === negotiation.id}
                            onClick={() => handleNegotiationAction(negotiation, 'reject')}
                            className="rounded-[8px] bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )}
                    {['open', 'countered'].includes(negotiation.status) && !canFarmerAct(negotiation) && (
                      <p className="mt-2 text-xs text-text-muted">Waiting for buyer response.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <p className="mb-4 text-lg font-semibold">Orders</p>
            {loading && <p className="text-sm text-text-muted">Loading orders...</p>}
            {!loading && recentOrders.length === 0 && (
              <p className="text-sm text-text-muted">No orders yet.</p>
            )}
            {!loading && recentOrders.length > 0 && (
              <div className="h-[23rem] space-y-3 overflow-y-auto pr-1">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-[12px] border border-border px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {order.is_emergency_order && (
                          <p className="mb-1 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                            Emergency Sell Fast Order
                          </p>
                        )}
                        <p className="font-medium">Customer: {order.buyer_name || `Buyer #${order.buyer}`}</p>
                        <p className="text-xs text-text-muted">Wants: {order.product_name || `Product #${order.product}`}</p>
                        <p className="text-xs text-text-muted">How much: {order.quantity} kg</p>
                        <p className="text-xs text-text-muted">Order value: ₹{order.agreed_price}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge status={order.status} />
                        {String(requestingOrderId) === String(order.id) && (
                          <p className="text-xs font-medium text-amber-700">Sending Request...</p>
                        )}
                        {String(requestingOrderId) !== String(order.id) && activeRequestOrderIds.has(Number(order.id)) && (
                          <p className="text-xs font-medium text-blue-700">Request Sent</p>
                        )}
                        {order.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleGenerateInvoice(order)}
                            className="rounded-[10px] bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                          >
                            Invoice
                          </button>
                        )}
                        {canRequestLogisticsForOrder(order) && (
                          <button
                            type="button"
                            onClick={() => handleSelectOrderForLogistics(order.id)}
                            disabled={partnerSearchLoading}
                            className="rounded-[8px] bg-emerald-700 px-2 py-1 text-xs text-white hover:bg-emerald-800 disabled:opacity-60"
                          >
                            {partnerSearchLoading && String(bookingForm.orderId) === String(order.id)
                              ? 'Loading...'
                              : 'Select Logistics'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <p className="mb-4 text-lg font-semibold">Request Logistics</p>

            <div className="grid gap-3">
              {!selectedOrder && (
                <p className="rounded-[12px] border border-border bg-surface-2 px-3 py-2 text-sm text-text-muted">
                  Click Select Logistics beside an order to continue.
                </p>
              )}
              {selectedOrder && (
                <div className="rounded-[12px] border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary">
                  <p className="font-medium">Selected Order: #{selectedOrder.id}</p>
                  <p>Customer: {selectedOrder.buyer_name || `Buyer #${selectedOrder.buyer}`} | Product: {selectedOrder.product_name}</p>
                  <p>Quantity: {selectedOrder.quantity} kg | Value: ₹{selectedOrder.agreed_price}</p>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm font-medium text-text-primary">Pickup Address (Default Farmer)</p>
                  <p className="rounded-[12px] border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary">
                    {selectedOrderRoute?.pickup_city && selectedOrderRoute?.pickup_state
                      ? `${selectedOrderRoute.pickup_city}, ${selectedOrderRoute.pickup_state}`
                      : 'Not available'}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-text-primary">Drop Address (Default Customer)</p>
                  <p className="rounded-[12px] border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary">
                    {selectedOrderRoute?.drop_city && selectedOrderRoute?.drop_state
                      ? `${selectedOrderRoute.drop_city}, ${selectedOrderRoute.drop_state}`
                      : 'Not available'}
                  </p>
                </div>
              </div>

              <div className="rounded-[12px] border border-border bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-text-primary">Pickup & Drop Route Preview</p>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  Route is automatically taken from farmer address (pickup) and customer address (drop).
                  {mapPreviewLoading ? ' | Loading map preview...' : ''}
                </p>
                <div className="mt-3 h-64 overflow-hidden rounded-[12px] border border-border">
                  {!showPaymentAnimation && (
                    <MapContainer
                      key={`${pickupCoords?.lat || 'p0'}-${dropCoords?.lat || 'd0'}-${bookingForm.orderId || 'none'}`}
                      center={pickupCoords ? [pickupCoords.lat, pickupCoords.lon] : INDIA_CENTER}
                      zoom={pickupCoords ? 7 : 5}
                      scrollWheelZoom
                      className="h-full w-full"
                    >
                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                      />
                      {pickupCoords && (
                        <CircleMarker
                          center={[pickupCoords.lat, pickupCoords.lon]}
                          radius={7}
                          pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.85 }}
                        />
                      )}
                      {dropCoords && (
                        <CircleMarker
                          center={[dropCoords.lat, dropCoords.lon]}
                          radius={7}
                          pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.85 }}
                        />
                      )}
                      {pickupCoords && dropCoords && (
                        <Polyline
                          positions={[
                            [pickupCoords.lat, pickupCoords.lon],
                            [dropCoords.lat, dropCoords.lon],
                          ]}
                          pathOptions={{ color: '#0f766e', weight: 4 }}
                        />
                      )}
                    </MapContainer>
                  )}
                  {showPaymentAnimation && (
                    <div className="flex h-full items-center justify-center bg-surface-2 text-sm text-text-muted">
                      Payment in progress... map hidden.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleFindPartners} disabled={partnerSearchLoading}>
                  {partnerSearchLoading ? 'Finding...' : 'Find Logistics For This Order'}
                </Button>
                <Button
                  type="button"
                  onClick={handleRequestLogistics}
                  disabled={bookingLoading || !selectedOrder}
                  className="bg-emerald-700 hover:bg-emerald-800"
                >
                  {bookingLoading
                    ? 'Sending Request...'
                    : selectedPartnerId
                      ? 'Request Selected Partner'
                      : 'Request All Matching Partners'}
                </Button>
              </div>
            </div>

            {bookingError && <p className="mt-3 text-sm text-red-600">{bookingError}</p>}
            {bookingMessage && <p className="mt-3 text-sm text-green-700">{bookingMessage}</p>}

            <div ref={partnersSectionRef} className="mt-4 space-y-2">
              <p className="text-sm font-medium text-text-primary">Available Partners</p>
              {partners.length === 0 && (
                <p className="text-xs text-text-muted">No logistics partners found for this default route yet.</p>
              )}
              {partners.map((partner) => (
                <button
                  key={partner.id}
                  type="button"
                  onClick={() => setSelectedPartnerId(String(partner.logistics_partner_id || partner.id))}
                  className={`w-full rounded-[10px] border p-2 text-left transition-colors ${String(selectedPartnerId) === String(partner.logistics_partner_id || partner.id) ? 'border-emerald-600 bg-emerald-50' : 'border-border hover:border-emerald-300'}`}
                >
                  <div className="text-xs text-text-primary">
                    <p className="font-medium">
                      {partner.partner_name}
                      {String(selectedPartnerId) === String(partner.logistics_partner_id || partner.id) ? ' (Selected)' : ''}
                    </p>
                    <p>Vehicle: {formatStatus(partner.vehicle_type)} | Max: {partner.max_weight_kg} kg</p>
                    <p>States: {(partner.operating_states || []).join(', ')}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <p className="mb-4 text-lg font-semibold">Requested Logistics</p>
            {acceptedLogisticsCount > 0 && (
              <p className="mb-2 text-sm text-green-700">
                {acceptedLogisticsCount} logistics request{acceptedLogisticsCount > 1 ? 's have' : ' has'} been accepted.
              </p>
            )}
            {recentLogisticsRequests.length === 0 && (
              <p className="text-sm text-text-muted">No logistics requests yet.</p>
            )}
            {recentLogisticsRequests.length > 0 && (
              <div className="space-y-3">
                {recentLogisticsRequests.map((request) => (
                  <div key={request.id} className="rounded-[12px] border border-border px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        {(() => {
                          const linkedOrder = ordersById.get(Number(request.order))
                          const deliveryDone = linkedOrder?.status === 'delivered' || linkedOrder?.status === 'completed'

                          if (!linkedOrder || !['accepted', 'picked_up', 'delivered'].includes(request.status)) {
                            return null
                          }

                          if (linkedOrder.farmer_logistics_review_submitted) {
                            return <p className="mb-1 text-xs font-medium text-blue-700">Logistics review submitted.</p>
                          }

                          if (linkedOrder.farmer_can_review_logistics) {
                            return (
                              <button
                                type="button"
                                onClick={() => openLogisticsReviewModal(request)}
                                className="mb-2 rounded-[8px] bg-blue-700 px-2 py-1 text-xs text-white hover:bg-blue-800"
                              >
                                Review Logistics Partner
                              </button>
                            )
                          }

                          if (deliveryDone) {
                            return <p className="mb-1 text-xs text-amber-700">Logistics review window closed (3 days after delivery).</p>
                          }

                          return null
                        })()}
                        <p className="font-medium">Partner: {request.logistics_partner_name || `#${request.logistics_partner}`}</p>
                        <p className="text-xs text-text-muted">Order: #{request.order} | Weight: {request.weight_kg} kg</p>
                        {request.quoted_fee && (
                          <p className="text-xs text-amber-700">Quoted Logistics Price: ₹{request.quoted_fee}</p>
                        )}
                        <p className="text-xs text-text-muted">Route: {request.pickup_city}, {request.pickup_state} {'->'} {request.drop_city}, {request.drop_state}</p>
                        {request.status === 'accepted' && (
                          <p className="text-xs text-green-700">This logistics partner accepted your request.</p>
                        )}
                        {(request.status === 'accepted' || request.quoted_fee) && (
                          <Button
                            type="button"
                            onClick={() => handleGenerateLogisticsInvoice(request)}
                            className="mt-2 bg-accent px-2 py-1 text-xs font-semibold text-white hover:opacity-90"
                          >
                            Invoice
                          </Button>
                        )}
                        {request.status === 'quoted' && (
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              disabled={quoteActionLoadingId === request.id}
                              onClick={() => handleFarmerQuoteResponse(request.id, 'accept')}
                              className="rounded-[8px] bg-green-700 px-2 py-1 text-xs text-white hover:bg-green-800 disabled:opacity-60"
                            >
                              {quoteActionLoadingId === request.id ? 'Saving...' : 'Accept Quote'}
                            </button>
                            <button
                              type="button"
                              disabled={quoteActionLoadingId === request.id}
                              onClick={() => handleFarmerQuoteResponse(request.id, 'decline')}
                              className="rounded-[8px] bg-red-700 px-2 py-1 text-xs text-white hover:bg-red-800 disabled:opacity-60"
                            >
                              {quoteActionLoadingId === request.id ? 'Saving...' : 'Decline Quote'}
                            </button>
                          </div>
                        )}
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
            </div>
          </>
        )}
      </PageShell>

      {showPaymentAnimation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-[16px] bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto coin-loader" />
            <p className="mt-4 text-lg font-semibold text-text-primary">Opening Google Pay</p>
            <p className="mt-1 text-sm text-text-muted">{paymentAnimationMessage}</p>
            <div className="mt-3 flex justify-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.2s]" />
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.1s]" />
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce" />
            </div>
          </div>
        </div>
      )}

      <AddProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddProduct} loading={isSubmitting} />

      <EditProductModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSubmit={handleEditProduct} loading={isSubmitting} product={editingProduct} />

      {logisticsReviewTarget && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/45 p-4">
          <Card className="w-full max-w-md">
            <p className="text-xl font-semibold text-accent">Rate Logistics Partner</p>
            <p className="mt-2 text-sm text-text-muted">
              Order #{logisticsReviewTarget.order.id} • {logisticsReviewTarget.order.product_name || 'Order'}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Partner: {logisticsReviewTarget.request?.logistics_partner_name || `Partner #${logisticsReviewTarget.request?.logistics_partner || ''}`}
            </p>

            <form onSubmit={submitLogisticsReview} className="mt-4 space-y-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-text-primary">Rating (1 to 5)</label>
                <select
                  value={logisticsReviewRating}
                  onChange={(event) => setLogisticsReviewRating(event.target.value)}
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
                  value={logisticsReviewComment}
                  onChange={(event) => setLogisticsReviewComment(event.target.value)}
                  rows={3}
                  className="w-full rounded-[12px] border border-border bg-white px-3 py-2 text-text-primary"
                  placeholder="Share your delivery experience with this logistics partner"
                />
              </div>

              {logisticsReviewError ? <p className="text-sm text-red-600">{logisticsReviewError}</p> : null}

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={closeLogisticsReviewModal}
                  className="bg-surface-2 text-text-primary hover:bg-surface-2"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={logisticsReviewSubmitting}>
                  {logisticsReviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {isSellFastModalOpen && (
        <div className="fixed inset-0 z-[1250] flex items-center justify-center bg-black/45 p-4">
          <Card className="w-full max-w-lg">
            <p className="text-xl font-semibold text-red-700">Emergency: Sell Fast Alert</p>
            <p className="mt-1 text-sm text-text-muted">This sends an urgent notification to all buyers.</p>

            <form onSubmit={submitSellFastAlert} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Crop Listing</label>
                <select
                  value={sellFastForm.productId}
                  onChange={(event) => setSellFastForm((prev) => ({ ...prev, productId: event.target.value }))}
                  className="w-full rounded-[10px] border border-border px-3 py-2"
                >
                  <option value="">General crops</option>
                  {products.map((product) => (
                    <option key={product.id} value={String(product.id)}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Quantity (kg)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={sellFastForm.quantityKg}
                    onChange={(event) => setSellFastForm((prev) => ({ ...prev, quantityKg: event.target.value }))}
                    className="w-full rounded-[10px] border border-border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Asking Price (₹/kg)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={sellFastForm.pricePerKg}
                    onChange={(event) => setSellFastForm((prev) => ({ ...prev, pricePerKg: event.target.value }))}
                    className="w-full rounded-[10px] border border-border px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Message to Buyers (optional)</label>
                <textarea
                  rows={3}
                  value={sellFastForm.note}
                  onChange={(event) => setSellFastForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Urgent sale today. Ready for immediate pickup."
                  className="w-full rounded-[10px] border border-border px-3 py-2"
                />
              </div>

              {sellFastError ? <p className="text-sm text-red-600">{sellFastError}</p> : null}
              {sellFastSuccess ? <p className="text-sm text-emerald-700">{sellFastSuccess}</p> : null}

              <div className="flex gap-2">
                <Button type="button" onClick={() => setIsSellFastModalOpen(false)} className="bg-surface-2 text-text-primary hover:bg-surface-2">
                  Cancel
                </Button>
                <Button type="submit" disabled={sellFastLoading} className="bg-red-600 hover:bg-red-700">
                  {sellFastLoading ? 'Sending...' : 'Send To All Buyers'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <BuyerFarmerChatWidget />
      <FarmerAIAssistant />
    </>
  )
}
