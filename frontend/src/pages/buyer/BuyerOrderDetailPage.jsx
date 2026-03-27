import OrderTimeline from '../../components/buyer/OrderTimeline'
import PageShell from '../../components/shared/PageShell'

export default function BuyerOrderDetailPage() {
  return (
    <PageShell title="Order Tracking">
      <OrderTimeline status="picked_up" />
    </PageShell>
  )
}
