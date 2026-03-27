import Button from '../shared/Button'
import Card from '../shared/Card'

export default function LogisticsPartnerCard({ partner, onSelect }) {
  return (
    <Card>
      <p>{partner.partner_name}</p>
      <p className="text-sm text-text-muted">{partner.vehicle_type} | {partner.max_weight_kg}kg</p>
      <Button className="mt-3 bg-accent-bright text-bg" onClick={() => onSelect(partner.id)}>Send Request</Button>
    </Card>
  )
}
