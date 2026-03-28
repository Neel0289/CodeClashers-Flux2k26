import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import Card from '../shared/Card'

export default function DashboardMarketWidget({ prices = [] }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">Market Pulse</p>
          <Link to="/farmer/market-intelligence" className="text-xs font-semibold text-accent">View All Prices {'->'}</Link>
        </div>
        <div className="mt-3 space-y-2">
          {prices.slice(0, 3).map((row) => {
            const trendUp = typeof row.previous_modal_price === 'number' ? row.modal_price >= row.previous_modal_price : null
            return (
              <div key={`${row.commodity}-${row.market}`} className="flex items-center justify-between rounded-lg bg-surface-2 p-2">
                <p className="font-medium">{row.commodity}</p>
                <div className="flex items-center gap-1 text-sm font-semibold">
                  Rs {row.modal_price}
                  {trendUp !== null ? (
                    trendUp ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <ArrowDownRight className="h-4 w-4 text-red-600" />
                  ) : null}
                </div>
              </div>
            )
          })}
          {prices.length === 0 ? <p className="text-sm text-text-muted">No market data yet.</p> : null}
        </div>
      </Card>
    </motion.div>
  )
}
