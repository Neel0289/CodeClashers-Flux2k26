import Button from '../shared/Button'
import Input from '../shared/Input'

export default function OfferForm({ onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-[32px] border-none bg-white p-6 shadow-clay-card">
      <Input variant="clay" name="quantity" type="number" placeholder="Quantity" />
      <Input variant="clay" name="offered_price" type="number" placeholder="Offered price per unit" />
      <Input variant="clay" name="message" placeholder="Optional message" />
      <Button variant="clay" type="submit">Submit Offer</Button>
    </form>
  )
}
