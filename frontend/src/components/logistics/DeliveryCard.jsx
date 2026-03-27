import Button from '../shared/Button'
import Card from '../shared/Card'

export default function DeliveryCard({ delivery, onPickup, onDeliver }) {
  return (
    <Card>
      <p>{delivery.crop_description}</p>
      <div className="mt-3 flex gap-3">
        <Button onClick={() => onPickup(delivery.id)}>Mark as Picked Up</Button>
        <Button onClick={() => onDeliver(delivery.id)}>Mark as Delivered</Button>
      </div>
    </Card>
  )
}
