import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, RefreshCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { compareMarketPrice, getMarketCommodities, getMarketPrices } from '../../api/marketPrices'
import { updateProduct, getProducts } from '../../api/products'
import { getTomorrowWeather } from '../../api/weather'
import ApplyPriceModal from '../../components/farmer/ApplyPriceModal'
import MarketPriceCard from '../../components/farmer/MarketPriceCard'
import WeatherForecastCard from '../../components/farmer/WeatherForecastCard'
import Button from '../../components/shared/Button'
import Input from '../../components/shared/Input'
import PageShell from '../../components/shared/PageShell'
import Sidebar from '../../components/shared/Sidebar'
import useAuth from '../../hooks/useAuth'

const states = ['Gujarat', 'Maharashtra', 'Punjab', 'Uttar Pradesh', 'Karnataka', 'Tamil Nadu', 'Rajasthan', 'Haryana', 'Madhya Pradesh', 'Andhra Pradesh', 'West Bengal']
const chips = ['All', 'Tomato', 'Onion', 'Potato', 'Wheat', 'Rice', 'Chilli']

export default function MarketIntelligence({ embedded = false }) {
  const { user } = useAuth()
  const [prices, setPrices] = useState([])
  const [commodities, setCommodities] = useState([])
  const [listings, setListings] = useState([])
  const [weather, setWeather] = useState(null)
  const [weatherError, setWeatherError] = useState('')
  const [loadingPrices, setLoadingPrices] = useState(true)
  const [loadingWeather, setLoadingWeather] = useState(false)
  const [errorPrices, setErrorPrices] = useState('')
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState(user?.profile?.state || 'Gujarat')
  const [activeChip, setActiveChip] = useState('All')
  const [compareByProductId, setCompareByProductId] = useState({})
  const [priceEditTarget, setPriceEditTarget] = useState(null)
  const [priceEditValue, setPriceEditValue] = useState('')
  const [applyOpen, setApplyOpen] = useState(false)

  const sidebarItems = [
    { to: '/farmer/dashboard', label: 'Dashboard', icon: 'Home' },
    { to: '/farmer/market-intelligence', label: 'Market Intelligence', icon: 'BarChart2', badge: 'LIVE' },
  ]

  const loadPrices = async () => {
    setLoadingPrices(true)
    setErrorPrices('')
    try {
      const commodity = activeChip !== 'All' ? activeChip : undefined
      const { data } = await getMarketPrices({ commodity, state: stateFilter })
      setPrices(Array.isArray(data?.results) ? data.results : [])
    } catch {
      setErrorPrices('Unable to fetch live prices. Showing last known data.')
      setPrices([])
    } finally {
      setLoadingPrices(false)
    }
  }

  const loadWeather = async () => {
    setLoadingWeather(true)
    setWeatherError('')
    try {
      const { data } = await getTomorrowWeather()
      setWeather(data)
    } catch (err) {
      setWeather(null)
      const detail = err?.response?.data?.detail
      setWeatherError(detail || 'Unable to fetch weather right now.')
    } finally {
      setLoadingWeather(false)
    }
  }

  useEffect(() => {
    loadPrices()
  }, [activeChip, stateFilter])

  useEffect(() => {
    Promise.allSettled([getMarketCommodities(), getProducts(), getTomorrowWeather()]).then(([commoditiesRes, listingsRes, weatherRes]) => {
      if (commoditiesRes.status === 'fulfilled') {
        setCommodities(Array.isArray(commoditiesRes.value.data?.commodities) ? commoditiesRes.value.data.commodities : [])
      }
      if (listingsRes.status === 'fulfilled') {
        setListings(Array.isArray(listingsRes.value.data) ? listingsRes.value.data : [])
      }
      if (weatherRes.status === 'fulfilled') {
        setWeather(weatherRes.value.data)
        setWeatherError('')
      } else {
        const detail = weatherRes.reason?.response?.data?.detail
        setWeather(null)
        setWeatherError(detail || 'Unable to fetch weather right now.')
      }
    })
  }, [])

  const filteredPrices = useMemo(() => {
    return prices.filter((row) => row.commodity.toLowerCase().includes(search.trim().toLowerCase()))
  }, [prices, search])

  const chipValues = useMemo(() => {
    const dynamic = commodities.slice(0, 6)
    return Array.from(new Set([...chips, ...dynamic]))
  }, [commodities])

  const listingByCommodity = useMemo(() => {
    const map = new Map()
    for (const listing of listings) {
      const key = String(listing.name || '').trim().toLowerCase()
      if (!map.has(key)) {
        map.set(key, listing)
      }
    }
    return map
  }, [listings])

  const handleCompare = async (price, listing) => {
    try {
      const { data } = await compareMarketPrice({ commodity: price.commodity, state: price.state, my_price: listing.base_price })
      setCompareByProductId((prev) => ({ ...prev, [listing.id]: data }))
    } catch {
      setCompareByProductId((prev) => ({ ...prev, [listing.id]: null }))
    }
  }

  const openUpdateModal = (listing) => {
    setPriceEditTarget(listing)
    setPriceEditValue(String(listing.base_price || ''))
  }

  const saveUpdatedPrice = async () => {
    if (!priceEditTarget) return
    const newPrice = Number(priceEditValue)
    if (!Number.isFinite(newPrice) || newPrice <= 0) return

    await updateProduct(priceEditTarget.id, {
      ...priceEditTarget,
      base_price: newPrice,
    })

    setListings((prev) => prev.map((row) => (row.id === priceEditTarget.id ? { ...row, base_price: newPrice } : row)))
    setPriceEditTarget(null)
    setPriceEditValue('')
  }

  const applySuggestedChange = async ({ selected, pct }) => {
    const selectedListings = listings.filter((row) => selected.includes(row.id))
    for (const listing of selectedListings) {
      const current = Number(listing.base_price || 0)
      const next = Number((current + (current * pct) / 100).toFixed(2))
      await updateProduct(listing.id, { ...listing, base_price: next })
    }
    const { data } = await getProducts()
    setListings(Array.isArray(data) ? data : [])
    setApplyOpen(false)
  }

  const content = (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="flex items-center gap-2 text-xl font-semibold"><CalendarDays className="h-5 w-5" /> Today's Mandi Prices</p>
              <p className="text-xs text-text-muted">{new Date().toLocaleDateString('en-IN')}</p>
              <p className="mt-1 text-xs font-medium text-emerald-700">All prices shown are for 100 kg (1 Quintal).</p>
            </div>
            <Button type="button" onClick={loadPrices} className="px-3"><RefreshCcw className="h-4 w-4" /></Button>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search commodity" />
            <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} className="w-full rounded-[12px] border border-border bg-white px-3 py-2 text-text-primary">
              {states.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {chipValues.map((chip) => (
              <motion.button
                key={chip}
                layout
                type="button"
                onClick={() => setActiveChip(chip)}
                className={`rounded-full px-3 py-1 text-sm ${activeChip === chip ? 'bg-accent text-white' : 'bg-surface-2 text-text-primary'}`}
              >
                {chip}
              </motion.button>
            ))}
          </div>

          {errorPrices ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
              {errorPrices}
              <button type="button" onClick={loadPrices} className="ml-2 underline">Refresh</button>
            </div>
          ) : null}

          {loadingPrices ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-36 rounded-xl border border-border shimmer-skeleton" />
              ))}
            </div>
          ) : filteredPrices.length === 0 ? (
            <div className="mt-4 rounded-xl border border-border bg-white p-5 text-center text-sm text-text-muted">
              No prices found for today. Try a different state or commodity.
            </div>
          ) : (
            <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="show" className="mt-4 grid gap-3 md:grid-cols-2">
              {filteredPrices.map((price) => {
                const listing = listingByCommodity.get(String(price.commodity || '').toLowerCase())
                return (
                  <MarketPriceCard
                    key={`${price.commodity}-${price.state}-${price.market}`}
                    price={price}
                    listing={listing}
                    compareResult={listing ? compareByProductId[listing.id] : null}
                    onCompare={() => listing && handleCompare(price, listing)}
                    onUpdatePrice={() => listing && openUpdateModal(listing)}
                  />
                )
              })}
            </motion.div>
          )}
        </section>

        <section>
          <WeatherForecastCard weather={weather} error={weatherError} loading={loadingWeather} onRefresh={loadWeather} onOpenApplyModal={() => setApplyOpen(true)} />
        </section>
      </div>

      <ApplyPriceModal
        open={applyOpen}
        listings={listings.filter((row) => row.is_available)}
        suggestedChange={weather?.price_recommendation?.suggested_change}
        onClose={() => setApplyOpen(false)}
        onApply={applySuggestedChange}
      />
    </div>
  )

  return (
    <>
      {embedded ? (
        content
      ) : (
        <PageShell title="Market Intelligence">
          <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
            <Sidebar items={sidebarItems} />
            {content}
          </div>
        </PageShell>
      )}

      <AnimatePresence>
        {priceEditTarget ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm rounded-xl border border-border bg-white p-4">
              <p className="font-semibold">Update Price: {priceEditTarget.name}</p>
              <Input value={priceEditValue} onChange={(event) => setPriceEditValue(event.target.value)} type="number" placeholder="New price" />
              <div className="mt-3 flex gap-2">
                <Button className="bg-surface-2 text-text-primary" onClick={() => setPriceEditTarget(null)}>Cancel</Button>
                <Button onClick={saveUpdatedPrice}>Save</Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
