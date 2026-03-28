import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, CalendarDays } from 'lucide-react'

import PriceCompareVerdict from './PriceCompareVerdict'

export default function MarketPriceCard({ price, listing, compareResult, onCompare, onUpdatePrice }) {
  const previous = price.previous_modal_price
  const hasTrend = typeof previous === 'number' && previous > 0
  const trendUp = hasTrend ? price.modal_price >= previous : null

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
      className="rounded-2xl border border-border bg-surface p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl">{price.commodity}</p>
          <p className="text-sm text-text-muted">{price.state} · {price.market || 'Market'}</p>
          <p className="mt-1 text-xs text-text-muted">{price.unit || 'Quintal'}</p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-xs text-text-muted">
            <CalendarDays className="h-3.5 w-3.5" />
            {String(price.price_date || '').slice(0, 10)}
          </div>
          {listing ? <p className="mt-2 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">My Listing</p> : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-white p-2">
          <p className="text-xs text-text-muted">Min</p>
          <p className="text-base font-semibold">Rs {price.min_price}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2">
          <p className="text-xs text-text-muted">Modal</p>
          <p className="text-lg font-bold text-accent-bright">Rs {price.modal_price}</p>
          {hasTrend ? (
            <div className={`mt-1 inline-flex items-center gap-1 text-xs ${trendUp ? 'text-emerald-700' : 'text-red-700'}`}>
              {trendUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              vs yesterday
            </div>
          ) : null}
        </div>
        <div className="rounded-lg bg-white p-2">
          <p className="text-xs text-text-muted">Max</p>
          <p className="text-base font-semibold">Rs {price.max_price}</p>
        </div>
      </div>

      {listing ? (
        <button
          type="button"
          onClick={onCompare}
          className="mt-3 rounded-lg border border-accent px-3 py-1.5 text-xs font-semibold text-accent"
        >
          Compare My Price
        </button>
      ) : null}

      <PriceCompareVerdict result={compareResult} onUpdatePrice={onUpdatePrice} />
    </motion.div>
  )
}
