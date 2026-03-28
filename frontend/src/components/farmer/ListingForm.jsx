import { useEffect, useMemo, useState } from 'react'

import { getMarketCommodities, getMarketPrices } from '../../api/marketPrices'
import useAuth from '../../hooks/useAuth'
import Button from '../shared/Button'
import Input from '../shared/Input'

export default function ListingForm({ onSubmit }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [basePriceValue, setBasePriceValue] = useState('')
  const [commodities, setCommodities] = useState([])
  const [marketHint, setMarketHint] = useState(null)

  useEffect(() => {
    getMarketCommodities()
      .then(({ data }) => setCommodities(Array.isArray(data?.commodities) ? data.commodities : []))
      .catch(() => setCommodities([]))
  }, [])

  const matchedCommodity = useMemo(() => {
    const query = nameValue.trim().toLowerCase()
    if (!query) return null
    const exact = commodities.find((item) => item.toLowerCase() === query)
    if (exact) return exact
    return commodities.find((item) => item.toLowerCase().includes(query) || query.includes(item.toLowerCase())) || null
  }, [commodities, nameValue])

  useEffect(() => {
    if (!matchedCommodity) {
      setMarketHint(null)
      return
    }
    getMarketPrices({ commodity: matchedCommodity, state: user?.profile?.state })
      .then(({ data }) => {
        const rows = Array.isArray(data?.results) ? data.results : []
        setMarketHint(rows[0] || null)
      })
      .catch(() => setMarketHint(null))
  }, [matchedCommodity, user?.profile?.state])

  const modalPerKg = marketHint ? Number(marketHint.modal_price || 0) / 100 : 0
  const myPrice = Number(basePriceValue || 0)
  const diffPct = modalPerKg > 0 && myPrice > 0 ? ((myPrice - modalPerKg) / modalPerKg) * 100 : 0

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Input name="name" placeholder="Product name" value={nameValue} onChange={(event) => setNameValue(event.target.value)} />
      <Input name="category" placeholder="Category" />
      <Input name="base_price" type="number" placeholder="Base price" value={basePriceValue} onChange={(event) => setBasePriceValue(event.target.value)} />
      {marketHint ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Today's market rate: Rs {Number(marketHint.modal_price).toFixed(2)}/Quintal (approx. Rs {modalPerKg.toFixed(2)}/kg)
          {myPrice > 0 ? (
            <p className="mt-1 text-xs">
              Your price is {Math.abs(diffPct).toFixed(1)}% {diffPct >= 0 ? 'above' : 'below'} market.
            </p>
          ) : null}
        </div>
      ) : null}
      <Input name="quantity_available" type="number" placeholder="Quantity" />

      <div className="rounded-xl border border-border bg-surface p-3">
        <button type="button" onClick={() => setOpen((prev) => !prev)} className="w-full text-left text-sm font-semibold text-accent">
          Check Market Price {open ? '-' : '+'}
        </button>
        {open ? (
          <div className="mt-3">
            <p className="text-xs text-text-muted">Commodity suggestions:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {commodities.slice(0, 10).map((item) => (
                <button key={item} type="button" className="rounded-full bg-surface-2 px-2 py-1 text-xs" onClick={() => setNameValue(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <Button className="bg-accent-bright text-bg" type="submit">Save Listing</Button>
    </form>
  )
}
