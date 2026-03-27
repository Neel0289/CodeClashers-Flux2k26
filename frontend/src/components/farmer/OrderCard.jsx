import Card from '../shared/Card'
import StatusBadge from '../shared/StatusBadge'

export default function OrderCard({ order }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <p>{order.product_name}</p>
        <StatusBadge status={order.status} />
      </div>
    </Card>
  )
}
