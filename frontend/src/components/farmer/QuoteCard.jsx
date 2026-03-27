import Button from '../shared/Button'
import Card from '../shared/Card'

export default function QuoteCard({ quote, onAccept }) {
  return (
    <Card>
      <p>{quote.logistics_partner_name}</p>
      <p className="text-sm text-text-muted">Quoted Fee: Rs {quote.quoted_fee}</p>
      <Button className="mt-3 bg-accent-bright text-bg" onClick={() => onAccept(quote.id)}>Accept Quote</Button>
    </Card>
  )
}
