import Card from '../shared/Card'

export default function ListingCard({ item }) {
  return (
    <Card>
      <p className="text-lg">{item.name}</p>
      <p className="text-sm text-text-muted">{item.category} - {item.city}, {item.state}</p>
    </Card>
  )
}
