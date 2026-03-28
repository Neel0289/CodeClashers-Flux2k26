import { useState, useEffect } from 'react'
import Button from '../shared/Button'
import Card from '../shared/Card'
import { CATEGORIES, PRODUCT_OPTIONS } from './productCatalog'

const DEFAULT_CATEGORY = 'vegetables'
const getFirstProduct = (category) => PRODUCT_OPTIONS[category]?.[0] || ''

const UNITS = [
  { value: 'kg', label: 'KG' },
  { value: 'ton', label: 'Ton' },
  { value: 'piece', label: 'Piece' },
]

export default function EditProductModal({ isOpen, onClose, onSubmit, loading, product }) {
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

  useEffect(() => {
    if (product && isOpen) {
      const nextCategory = product.category || DEFAULT_CATEGORY
      const options = PRODUCT_OPTIONS[nextCategory] || []
      const nextName = options.includes(product.name) ? product.name : (product.name || getFirstProduct(nextCategory))
      setFormData({
        name: nextName,
        description: product.description || '',
        category: nextCategory,
        base_price: product.base_price || '',
        quantity_available: product.quantity_available || '',
        unit: product.unit || 'kg',
        harvest_date: product.harvest_date || '',
      })
    }
  }, [product, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'quantity_available') {
      if (value === '') {
        setFormData((prev) => ({ ...prev, quantity_available: '' }))
      } else {
        setFormData((prev) => ({ ...prev, quantity_available: String(Math.max(0, Number(value))) }))
      }
      setError('')
      return
    }

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

    if (
      !formData.name
      || !formData.description
      || !formData.base_price
      || !formData.quantity_available
      || !formData.harvest_date
    ) {
      setError('All fields are required.')
      return
    }

    if (Number(formData.base_price) <= 0 || Number(formData.quantity_available) <= 0) {
      setError('Price and stock must be greater than 0.')
      return
    }

    await onSubmit(formData)
  }

  if (!isOpen) return null

  const nameOptions = PRODUCT_OPTIONS[formData.category] || []
  const showCurrentValueOption = Boolean(formData.name) && !nameOptions.includes(formData.name)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-accent">Edit Food Item</h2>
          <button
            onClick={onClose}
            className="text-2xl text-text-muted hover:text-text transition-colors"
          >
            ×
          </button>
        </div>

        {error && <div className="mb-4 rounded-[12px] bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Product Name</label>
              <select
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-[12px] border border-border bg-white px-3 py-2 text-text transition-colors focus:border-accent focus:outline-none"
              >
                {showCurrentValueOption && (
                  <option value={formData.name}>{formData.name}</option>
                )}
                {nameOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full rounded-[12px] border border-border bg-white px-3 py-2 text-text transition-colors focus:border-accent focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your product..."
              rows="3"
              className="w-full rounded-[12px] border border-border bg-white px-4 py-2 text-text transition-colors focus:border-accent focus:outline-none"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Price per KG (₹)</label>
              <input
                type="number"
                step="0.01"
                name="base_price"
                value={formData.base_price}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full rounded-[12px] border border-border bg-white px-4 py-2 text-text transition-colors focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Current Stock (KG)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="quantity_available"
                value={formData.quantity_available}
                onChange={handleChange}
                placeholder="0.00"
                className="w-full rounded-[12px] border border-border bg-white px-4 py-2 text-text transition-colors focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Harvest Date</label>
            <input
              type="date"
              name="harvest_date"
              value={formData.harvest_date}
              onChange={handleChange}
              className="w-full rounded-[12px] border border-border bg-white px-4 py-2 text-text transition-colors focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} className="bg-gray-300 text-gray-800 hover:bg-gray-400">
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
