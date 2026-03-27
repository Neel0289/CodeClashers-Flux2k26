import DeliveryCard from '../../components/logistics/DeliveryCard'
import PageShell from '../../components/shared/PageShell'

const sample = { id: 1, crop_description: 'Tomatoes 500kg' }

export default function LogisticsDeliveriesPage() {
  return (
    <PageShell title="Active Deliveries">
      <DeliveryCard delivery={sample} onPickup={() => {}} onDeliver={() => {}} />
    </PageShell>
  )
}
