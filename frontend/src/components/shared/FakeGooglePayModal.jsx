import { useMemo, useState } from 'react'

import Button from './Button'
import Card from './Card'

function formatAmount(amount, currency = 'INR') {
  const normalized = Number(amount || 0)
  if (!Number.isFinite(normalized)) return '0.00'

  const value = currency === 'INR' ? normalized / 100 : normalized
  return value.toFixed(2)
}

export default function FakeGooglePayModal({
  isOpen,
  checkout,
  processing,
  error,
  onCancel,
  onConfirm,
}) {
  const [upiId, setUpiId] = useState('buyer@okaxis')

  const amountLabel = useMemo(
    () => formatAmount(checkout?.amount, checkout?.currency),
    [checkout?.amount, checkout?.currency],
  )

  if (!isOpen || !checkout) return null

  const isSuccess = checkout?.status === 'success'

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-sm overflow-hidden border border-border bg-white p-0 shadow-2xl">
        <div className="bg-gradient-to-r from-[#e8f0fe] via-[#f8f9fa] to-[#e6f4ea] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5f6368]">Google Pay Demo</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-bold text-[#1a73e8] shadow-sm">G</div>
            <p className="text-lg font-bold text-[#202124]">Pay with Google Pay</p>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-xl border border-border bg-surface px-3 py-2">
            <p className="text-xs text-text-muted">Merchant</p>
            <p className="font-semibold text-text-primary">{checkout.name || 'KhetBazaar'}</p>
            <p className="text-xs text-text-muted">{checkout.description || 'Order payment'}</p>
          </div>

          <div className="rounded-xl border border-border bg-white px-3 py-2">
            <p className="text-xs text-text-muted">Amount</p>
            <p className="text-2xl font-bold text-[#202124]">
              Rs {amountLabel}
            </p>
            <p className="text-xs text-text-muted">UPI Secure Payment</p>
          </div>

          {!isSuccess && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">Pay from UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(event) => setUpiId(event.target.value)}
                  placeholder="name@okbank"
                  className="w-full rounded-[12px] border border-border bg-white px-3 py-2 text-text-primary outline-none focus:border-accent"
                  disabled={processing}
                />
              </div>

              <div className="rounded-xl bg-[#f1f3f4] px-3 py-2">
                <p className="text-xs text-[#5f6368]">Linked accounts</p>
                <p className="text-sm font-medium text-[#202124]">HDFC Bank •• 1024</p>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={onCancel}
                  className="bg-surface-2 text-text-primary hover:bg-surface-2"
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => onConfirm({
                    upi_id: upiId,
                    gpay_reference: `GPD-${Date.now()}`,
                  })}
                  disabled={processing}
                  className="flex-1 bg-[#1a73e8] text-white hover:bg-[#1557b0]"
                >
                  {processing ? 'Processing...' : `Pay Rs ${amountLabel}`}
                </Button>
              </div>
            </>
          )}

          {isSuccess && (
            <div className="rounded-xl border border-[#c8e6c9] bg-[#e8f5e9] px-4 py-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#34a853] text-xl text-white">✓</div>
              <p className="mt-2 text-lg font-bold text-[#1b5e20]">Payment Successful</p>
              <p className="text-sm text-[#2e7d32]">Your order payment has been confirmed.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
