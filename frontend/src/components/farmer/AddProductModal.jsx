import { useState } from 'react'
import { X } from 'lucide-react'
import Button from '../shared/Button'
import Card from '../shared/Card'
import { CATEGORIES, PRODUCT_OPTIONS } from './productCatalog'
import VoiceFormAssistant from './VoiceFormAssistant'

const DEFAULT_CATEGORY = 'vegetables'
const getFirstProduct = (category) => PRODUCT_OPTIONS[category]?.[0] || ''

const UNITS = [
  { value: 'kg', label: 'KG' },
  { value: 'ton', label: 'Ton' },
  { value: 'piece', label: 'Piece' },
]

export default function AddProductModal({ isOpen, onClose, onSubmit, loading }) {
  const [formData, setFormData] = useState({
    name: getFirstProduct(DEFAULT_CATEGORY),
    description: '',
    category: DEFAULT_CATEGORY,
    base_price: '',
    quantity_available: '',
    unit: 'kg',
    harvest_date: '',
  })
  const [error, setError] = useState('')

  // Auto-fill from VoiceFormAssistant
  const handleVoiceFill = (voiceData) => {
    setFormData((prev) => ({
      ...prev,
      ...(voiceData.category ? { category: voiceData.category } : {}),
      ...(voiceData.name ? { name: voiceData.name } : {}),
      ...(voiceData.description ? { description: voiceData.description } : {}),
      ...(voiceData.price ? { base_price: voiceData.price } : {}),
      ...(voiceData.qty ? { quantity_available: voiceData.qty } : {}),
    }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      if (name === 'category') {
        return {
          ...prev,
          category: value,
          name: getFirstProduct(value),
        }
      }
      return { ...prev, [name]: value }
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.name || !formData.description || !formData.base_price || !formData.quantity_available || !formData.harvest_date) {
      setError('All fields are required.')
      return
    }

    await onSubmit(formData)
    setFormData({
      name: getFirstProduct(DEFAULT_CATEGORY),
      description: '',
      category: DEFAULT_CATEGORY,
      base_price: '',
      quantity_available: '',
      unit: 'kg',
      harvest_date: '',
    })
  }

  if (!isOpen) return null

  const labelCls = "block text-sm font-bold text-[#2E7D32] mb-1.5"
  const inputCls = "w-full rounded-xl border border-border bg-white px-4 py-2.5 text-text-primary transition-all focus:border-accent focus:ring-1 focus:ring-accent outline-none placeholder:text-text-muted/60"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-3xl shadow-2xl p-0 border-none">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white px-8 py-6 border-b border-border flex items-center justify-between">
          <h2 className="text-2xl font-black text-[#2E7D32] tracking-tight">Add New Product</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-2 transition-colors">
            <X size={24} className="text-text-muted" />
          </button>
        </div>

        <div className="p-8">
          {error && <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600 font-medium flex items-center gap-2">⚠️ {error}</div>}

          {/* Voice Assistant Card at top */}
          <div className="mb-8">
            <VoiceFormAssistant onFill={handleVoiceFill} onClose={onClose} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category & Name Row */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className={labelCls}>Category</label>
                <select name="category" value={formData.category} onChange={handleChange} className={inputCls}>
                  {CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Product Name</label>
                <select name="name" value={formData.name} onChange={handleChange} className={inputCls}>
                  {(PRODUCT_OPTIONS[formData.category] || []).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>

            {/* Description Row */}
            <div>
              <label className={labelCls}>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your product (e.g. Fresh organic tomatoes from our farm)..."
                rows="3"
                className={`${inputCls} resize-none`}
                required
              />
            </div>

            {/* Price, Qty, Unit Row */}
            <div className="grid gap-4 grid-cols-3">
              <div className="col-span-1">
                <label className={labelCls}>Price (₹) per kg</label>
                <input type="number" step="0.01" name="base_price" value={formData.base_price} onChange={handleChange} placeholder="0.00" className={inputCls} required />
              </div>
              <div className="col-span-1">
                <label className={labelCls}>Quantity</label>
                <input type="number" step="1" name="quantity_available" value={formData.quantity_available} onChange={handleChange} placeholder="0" className={inputCls} required />
              </div>
              <div className="col-span-1">
                <label className={labelCls}>Unit</label>
                <select name="unit" value={formData.unit} onChange={handleChange} className={inputCls}>
                  {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>

            {/* Harvest Date Row */}
            <div>
              <label className={labelCls}>Harvest Date</label>
              <input type="date" name="harvest_date" value={formData.harvest_date} onChange={handleChange} className={inputCls} required />
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-4 pt-4 border-t border-border mt-8">
              <Button type="button" onClick={onClose} className="bg-surface-2 text-text-primary px-8 hover:bg-border transition-all">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 bg-[#2E7D32] text-white py-4 text-lg font-bold shadow-lg shadow-[#2E7D32]/20 hover:bg-[#1B5E20] transition-all">
                {loading ? 'Adding...' : 'Add Product to Listing'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
