import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'

import Button from '../shared/Button'

function getMidpointFromRange(rangeText) {
  const matches = String(rangeText || '').match(/-?\d+/g)
  if (!matches || matches.length === 0) return 0
  if (matches.length === 1) return Number(matches[0])
  return (Number(matches[0]) + Number(matches[1])) / 2
}

export default function ApplyPriceModal({ open, listings, suggestedChange, onClose, onApply }) {
  const [selected, setSelected] = useState([])
  const pct = useMemo(() => getMidpointFromRange(suggestedChange), [suggestedChange])

  if (!open) return null

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]))
  }

  const apply = () => {
    onApply({ selected, pct })
    setSelected([])
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl rounded-2xl border border-border bg-white p-5"
      >
        <h3 className="font-display text-2xl">Apply Suggested Change</h3>
        <p className="mt-1 text-sm text-text-muted">Suggested change: {suggestedChange || '0%'} (midpoint {pct}%)</p>

        <div className="mt-4 max-h-72 space-y-2 overflow-auto">
          {listings.map((listing) => {
            const current = Number(listing.base_price || 0)
            const next = current + (current * pct) / 100
            return (
              <label key={listing.id} className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">{listing.name}</p>
                  <p className="text-xs text-text-muted">Current: Rs {current.toFixed(2)} {'->'} Suggested: Rs {next.toFixed(2)}</p>
                </div>
                <input type="checkbox" checked={selected.includes(listing.id)} onChange={() => toggle(listing.id)} />
              </label>
            )
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <Button className="bg-surface-2 text-text-primary" onClick={onClose}>Cancel</Button>
          <Button onClick={apply}>Apply to Selected</Button>
        </div>
      </motion.div>
    </div>
  )
}
