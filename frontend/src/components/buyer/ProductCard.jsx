import { Link } from 'react-router-dom'

import Card from '../shared/Card'

export default function ProductCard({ product }) {
  return (
    <Link to={`/buyer/products/${product.id}`}>
      <Card>
        <p className="text-lg">{product.name}</p>
        <p className="text-sm text-text-muted">{product.city}, {product.state}</p>
        <p className="text-accent-bright">Rs {product.base_price}/{product.unit}</p>
      </Card>
    </Link>
  )
}
