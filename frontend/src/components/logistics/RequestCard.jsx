import Card from '../shared/Card'

export default function RequestCard({ request }) {
  return (
    <Card>
      <p>{request.crop_description}</p>
      <p className="text-sm text-text-muted">{request.pickup_city}, {request.pickup_state} {'->'} {request.drop_city}, {request.drop_state}</p>
    </Card>
  )
}
