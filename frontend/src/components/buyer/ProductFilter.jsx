import Input from '../shared/Input'

export default function ProductFilter({ filters, setFilters }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-surface p-4 md:grid-cols-4">
      <Input placeholder="Category" value={filters.category || ''} onChange={(e) => setFilters({ ...filters, category: e.target.value })} />
      <Input placeholder="State" value={filters.state || ''} onChange={(e) => setFilters({ ...filters, state: e.target.value })} />
      <Input placeholder="Min price" value={filters.min_price || ''} onChange={(e) => setFilters({ ...filters, min_price: e.target.value })} />
      <Input placeholder="Max price" value={filters.max_price || ''} onChange={(e) => setFilters({ ...filters, max_price: e.target.value })} />
    </div>
  )
}
