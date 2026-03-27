import { useEffect, useState } from 'react'

import { getProducts } from '../../api/products'
import ProductCard from '../../components/buyer/ProductCard'
import ProductFilter from '../../components/buyer/ProductFilter'
import PageShell from '../../components/shared/PageShell'

export default function BuyerCatalogPage() {
  const [filters, setFilters] = useState({})
  const [products, setProducts] = useState([])

  useEffect(() => {
    getProducts(filters).then(({ data }) => setProducts(data))
  }, [filters])

  return (
    <PageShell title="Product Catalog">
      <ProductFilter filters={filters} setFilters={setFilters} />
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </PageShell>
  )
}
