import Input from '../shared/Input'

export default function ProductFilter({ filters, setFilters }) {
  return (
    <div className="grid gap-4 rounded-[32px] border-none bg-white p-6 shadow-clay-card md:grid-cols-4">
      <Input variant="clay" placeholder="Category" value={filters.category || ''} onChange={(e) => setFilters({ ...filters, category: e.target.value })} />
      <Input variant="clay" placeholder="State" value={filters.state || ''} onChange={(e) => setFilters({ ...filters, state: e.target.value })} />
      <Input variant="clay" placeholder="Min price" value={filters.min_price || ''} onChange={(e) => setFilters({ ...filters, min_price: e.target.value })} />
      <Input variant="clay" placeholder="Max price" value={filters.max_price || ''} onChange={(e) => setFilters({ ...filters, max_price: e.target.value })} />
    </div>
  )
}
