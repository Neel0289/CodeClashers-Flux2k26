import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { createOrder } from '../../api/orders'
import { createOrderCheckout, verifyOrderCheckout } from '../../api/payments'
import FakeGooglePayModal from '../../components/shared/FakeGooglePayModal'
import { getProduct } from '../../api/products'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'
import PageShell from '../../components/shared/PageShell'

export default function BuyerProductDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState('1')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [googlePayCheckout, setGooglePayCheckout] = useState(null)
  const [googlePayProcessing, setGooglePayProcessing] = useState(false)
  const [pendingOrderId, setPendingOrderId] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')

    getProduct(id)
      .then(({ data }) => {
        if (mounted) {
          setProduct(data)
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Unable to load product details.')
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [id])

  const totalAmount = useMemo(() => {
    const qty = Number(quantity)
    const basePrice = Number(product?.base_price || 0)
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(basePrice)) {
      return 0
    }
    return basePrice * qty
  }, [product, quantity])

  const handlePlaceOrderAndPay = async () => {
    setError('')
    setSubmitting(true)

    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Enter a valid quantity.')
      setSubmitting(false)
      return
    }

    try {
      const { data: order } = await createOrder({ product: Number(id), quantity: qty })
      const { data: checkout } = await createOrderCheckout(order.id)
      setPendingOrderId(order.id)
      setGooglePayCheckout(checkout)
      setGooglePayProcessing(false)
      setSubmitting(false)
    } catch (err) {
      const detail = err?.response?.data?.detail
      const data = err?.response?.data
      const firstValidationError = data && typeof data === 'object'
        ? Object.values(data).find((value) => typeof value === 'string' || (Array.isArray(value) && value.length > 0))
        : null
      const normalizedValidationError = Array.isArray(firstValidationError) ? firstValidationError[0] : firstValidationError
      setError(detail || normalizedValidationError || 'Unable to place order right now. Please try again.')
      setSubmitting(false)
    }
  }

  const cancelGooglePay = () => {
    setGooglePayCheckout(null)
    setGooglePayProcessing(false)
    setPendingOrderId(null)
    setError('Payment was cancelled before completion.')
  }

  const confirmGooglePay = async (payload) => {
    if (!pendingOrderId || !googlePayCheckout?.checkout_token) return

    setGooglePayProcessing(true)
    setError('')
    try {
      await verifyOrderCheckout(pendingOrderId, {
        checkout_token: googlePayCheckout.checkout_token,
        gpay_reference: payload.gpay_reference,
        upi_id: payload.upi_id,
      })
      setGooglePayCheckout((prev) => (prev ? { ...prev, status: 'success' } : prev))
      setGooglePayProcessing(false)
      setTimeout(() => {
        setGooglePayCheckout(null)
        navigate(`/buyer/orders/${pendingOrderId}`)
      }, 1200)
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(detail || 'Payment could not be completed. Please try again.')
      setGooglePayProcessing(false)
    }
  }

  if (loading) {
    return <PageShell title="Product Details">Loading product...</PageShell>
  }

  return (
    <PageShell title={product?.name || `Product ${id}`}>
      <div className="grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2">
        <div className="grid gap-2">
          <p className="text-sm text-text-muted">Farmer Location</p>
          <p className="text-base text-text-primary">{product?.city}, {product?.state}</p>
          <p className="text-sm text-text-muted">Price set by farmer</p>
          <p className="text-xl font-semibold text-accent-bright">Rs {product?.base_price}/{product?.unit}</p>
          <p className="text-sm text-text-muted">Available: {product?.quantity_available} {product?.unit}</p>
        </div>

        <div className="grid gap-3">
          <Input
            name="quantity"
            type="number"
            min="1"
            step="0.1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="Quantity"
          />
          <div className="rounded-xl border border-border bg-white p-3">
            <p className="text-sm text-text-muted">Order Total (farmer price)</p>
            <p className="text-2xl font-semibold text-text-primary">Rs {totalAmount.toFixed(2)}</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="button" onClick={handlePlaceOrderAndPay} disabled={submitting} className={submitting ? 'opacity-70' : ''}>
            {submitting ? 'Processing...' : 'Place Order & Pay'}
          </Button>
        </div>
      </div>

      <FakeGooglePayModal
        isOpen={Boolean(googlePayCheckout)}
        checkout={googlePayCheckout}
        processing={googlePayProcessing}
        error={error}
        onCancel={cancelGooglePay}
        onConfirm={confirmGooglePay}
      />
    </PageShell>
  )
}
