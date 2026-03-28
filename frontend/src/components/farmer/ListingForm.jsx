import { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, Leaf, TrendingUp } from 'lucide-react'

import { getMarketCommodities, getMarketPrices } from '../../api/marketPrices'
import useAuth from '../../hooks/useAuth'
import Button from '../shared/Button'
import VoiceFormAssistant from './VoiceFormAssistant'

const UNITS = [
  { value: 'kg', label: 'KG' },
  { value: 'ton', label: 'Ton' },
  { value: 'piece', label: 'Piece' },
]

export default function ListingForm({ onSubmit }) {
  const { user } = useAuth()
  const [showVoice, setShowVoice] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    base_price: '',
    quantity_available: '',
    unit: 'kg',
  })

  const [commodities, setCommodities] = useState([])
  const [marketHint, setMarketHint] = useState(null)
  const formRef = useRef(null)

  useEffect(() => {
    getMarketCommodities()
      .then(({ data }) => setCommodities(Array.isArray(data?.commodities) ? data.commodities : []))
      .catch(() => setCommodities([]))
  }, [])

  const handleVoiceFill = (voiceData) => {
    setFormData((prev) => ({
      ...prev,
      ...(voiceData.name ? { name: voiceData.name } : {}),
      ...(voiceData.description ? { description: voiceData.description } : {}),
      ...(voiceData.price ? { base_price: voiceData.price } : {}),
      ...(voiceData.qty ? { quantity_available: voiceData.qty } : {}),
    }))
    setShowVoice(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'quantity_available') {
      if (value === '') {
        setFormData((prev) => ({ ...prev, quantity_available: '' }))
      } else {
        setFormData((prev) => ({ ...prev, quantity_available: String(Math.max(0, Number(value))) }))
      }
      return
    }

    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const matchedCommodity = useMemo(() => {
    const query = formData.name.trim().toLowerCase()
    if (!query) return null
    return commodities.find((item) => item.toLowerCase() === query || item.toLowerCase().includes(query)) || null
  }, [commodities, formData.name])

  useEffect(() => {
    if (!matchedCommodity) {
      setMarketHint(null)
      return
    }
    getMarketPrices({ commodity: matchedCommodity, state: user?.profile?.state })
      .then(({ data }) => setMarketHint(data?.results?.[0] || null))
      .catch(() => setMarketHint(null))
  }, [matchedCommodity, user?.profile?.state])

  const modalPerKg = marketHint ? Number(marketHint.modal_price || 0) / 100 : 0
  const myPrice = Number(formData.base_price || 0)
  const diffPct = modalPerKg > 0 && myPrice > 0 ? ((myPrice - modalPerKg) / modalPerKg) * 100 : 0

  const labelCls = "block text-sm font-bold text-[#2E7D32] mb-1.5"
  const inputCls = "w-full rounded-xl border border-border bg-white px-4 py-2.5 text-text-primary transition-all focus:border-accent focus:ring-1 focus:ring-accent outline-none placeholder:text-text-muted/50"

  return (
    <div ref={formRef} className="space-y-6 max-w-2xl mx-auto">
      {/* Voice Assistant Toggle */}
      <button
        type="button"
        onClick={() => setShowVoice((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#2E7D32]/40 bg-[#2E7D32]/5 px-6 py-4 text-sm font-bold text-[#2E7D32] transition hover:bg-[#2E7D32]/10 active:scale-95"
      >
        <Mic size={20} />
        {showVoice ? 'Hide Voice Assistant' : '🎙 Speak to Add Item'}
      </button>

      {showVoice && <VoiceFormAssistant onFill={handleVoiceFill} onClose={() => setShowVoice(false)} />}

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="grid gap-6 bg-white p-8 rounded-3xl border border-border shadow-sm">
        <div className="flex items-center gap-2 pb-2 border-b border-border mb-2">
          <Leaf className="text-[#2E7D32]" size={20} />
          <h3 className="font-black text-[#2E7D32] uppercase tracking-tight">Product Details</h3>
        </div>

        <div>
           <label className={labelCls}>Product Name</label>
           <input name="name" list="commodities" value={formData.name} onChange={handleChange} placeholder="e.g., Tomato" className={inputCls} required />
           <datalist id="commodities">
             {commodities.slice(0, 20).map(c => <option key={c} value={c} />)}
           </datalist>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Describe your product..." rows={3} className={`${inputCls} resize-none`} required />
        </div>

        <div className="grid gap-4 grid-cols-3">
          <div className="col-span-1">
            <label className={labelCls}>Price (₹)/kg</label>
            <input name="base_price" type="number" step="0.01" value={formData.base_price} onChange={handleChange} placeholder="0.00" className={inputCls} required />
          </div>
          <div className="col-span-1">
            <label className={labelCls}>Quantity</label>
            <input name="quantity_available" type="number" min="0" value={formData.quantity_available} onChange={handleChange} placeholder="0" className={inputCls} required />
          </div>
          <div className="col-span-1">
            <label className={labelCls}>Unit</label>
            <select name="unit" value={formData.unit} onChange={handleChange} className={inputCls}>
              {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>

        {marketHint && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 animate-in fade-in slide-in-from-top-2 duration-300">
            <TrendingUp size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">Market Analysis</p>
              <p className="mt-1 text-sm font-medium">
                Standard rate: ₹{(Number(marketHint.modal_price)/100).toFixed(2)}/kg
                {myPrice > 0 && (
                  <span className={`ml-2 font-bold ${diffPct > 10 ? 'text-red-600' : 'text-emerald-700'}`}>
                    ({Math.abs(diffPct).toFixed(1)}% {diffPct >= 0 ? 'above' : 'below'})
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        <Button className="bg-[#2E7D32] text-white py-4 text-lg font-black shadow-lg shadow-[#2E7D32]/20 border-none hover:bg-[#1B5E20]" type="submit">
          SAVE LISTING
        </Button>
      </form>
    </div>
  )
}
