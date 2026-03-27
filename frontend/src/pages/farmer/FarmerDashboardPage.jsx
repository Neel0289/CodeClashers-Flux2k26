import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getNegotiations, respondNegotiation } from '../../api/negotiations'
import { getOrders } from '../../api/orders'
import { createProduct, updateProduct, deleteProduct, getProducts } from '../../api/products'
import AddProductModal from '../../components/farmer/AddProductModal'
import EditProductModal from '../../components/farmer/EditProductModal'
import Button from '../../components/shared/Button'
import Card from '../../components/shared/Card'
import PageShell from '../../components/shared/PageShell'
import StatusBadge from '../../components/shared/StatusBadge'
import useAuth from '../../hooks/useAuth'

function formatStatus(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export default function FarmerDashboardPage() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [products, setProducts] = useState([])
  const [negotiations, setNegotiations] = useState([])
  const [orders, setOrders] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [counterPrices, setCounterPrices] = useState({})
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const loadDashboard = async () => {
    setLoading(true)
    setError('')
    const [productsRes, negotiationsRes, ordersRes] = await Promise.allSettled([
      getProducts(),
      getNegotiations(),
      getOrders(),
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

    if (productsRes.status === 'rejected' && negotiationsRes.status === 'rejected') {
      setError('Could not load dashboard data. Please refresh.')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadDashboard()
  }, [])

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

  const recentListings = useMemo(() => products.slice(0, 5), [products])
  const recentNegotiations = useMemo(() => negotiations.slice(0, 5), [negotiations])
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <PageShell
        title="Farmer Dashboard"
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setIsModalOpen(true)}>+ Add Food Item</Button>
            <Button onClick={handleLogout} className="bg-gray-400 hover:bg-gray-500">
              Logout
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-4">
              <p className="text-sm text-text-muted">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-accent">{stat.value}</p>
            </Card>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card>
            <p className="mb-4 text-lg font-semibold">Active Listings</p>
            {deleteError && <div className="mb-3 rounded-[12px] bg-red-50 p-2 text-xs text-red-600">{deleteError}</div>}
            {loading && <p className="text-sm text-text-muted">Loading listings...</p>}
            {!loading && recentListings.length === 0 && <p className="text-sm text-text-muted">No listings yet.</p>}
            {!loading && recentListings.length > 0 && (
              <div className="space-y-3">
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
          </Card>

          <Card>
            <p className="mb-4 text-lg font-semibold">Recent Negotiations</p>
            {loading && <p className="text-sm text-text-muted">Loading negotiations...</p>}
            {!loading && recentNegotiations.length === 0 && (
              <p className="text-sm text-text-muted">No negotiations yet.</p>
            )}
            {!loading && recentNegotiations.length > 0 && (
              <div className="space-y-3">
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

                    {['open', 'countered'].includes(negotiation.status) && (
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
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <p className="mb-4 text-lg font-semibold">Incoming Orders</p>
            {loading && <p className="text-sm text-text-muted">Loading orders...</p>}
            {!loading && recentOrders.length === 0 && (
              <p className="text-sm text-text-muted">No orders yet.</p>
            )}
            {!loading && recentOrders.length > 0 && (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-[12px] border border-border px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">Customer: {order.buyer_name || `Buyer #${order.buyer}`}</p>
                        <p className="text-xs text-text-muted">Wants: {order.product_name || `Product #${order.product}`}</p>
                        <p className="text-xs text-text-muted">How much: {order.quantity} kg</p>
                        <p className="text-xs text-text-muted">Order value: ₹{order.agreed_price}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </PageShell>

      <AddProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddProduct} loading={isSubmitting} />

      <EditProductModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSubmit={handleEditProduct} loading={isSubmitting} product={editingProduct} />
    </>
  )
}
