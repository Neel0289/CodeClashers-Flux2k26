import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Minus, TrendingDown, TrendingUp } from 'lucide-react'

const iconMap = {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
}

const colorMap = {
  green: 'border-emerald-500 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-500 bg-amber-50 text-amber-800',
  red: 'border-red-500 bg-red-50 text-red-800',
  gray: 'border-slate-400 bg-slate-50 text-slate-700',
}

export default function PriceCompareVerdict({ result, onUpdatePrice }) {
  return (
    <AnimatePresence>
      {result ? (
        <motion.div
          key="compare-verdict"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={`mt-3 rounded-xl border-l-4 p-3 ${colorMap[result.verdict.color] || colorMap.gray}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide">{result.verdict.verdict}</p>
              <p className="mt-1 text-sm">{result.verdict.suggestion}</p>
              <p className="mt-1 text-xs opacity-80">
                Market modal: Rs {result.market_modal} | Your price: Rs {result.your_price} ({result.difference_pct > 0 ? '+' : ''}{result.difference_pct}%)
              </p>
            </div>
            <div>
              {(() => {
                const Icon = iconMap[result.verdict.icon] || Minus
                return <Icon className="h-5 w-5" />
              })()}
            </div>
          </div>
          <button
            type="button"
            onClick={onUpdatePrice}
            className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
          >
            Update My Price
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
