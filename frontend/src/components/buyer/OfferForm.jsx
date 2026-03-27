import Button from '../shared/Button'
import Input from '../shared/Input'

export default function OfferForm({ onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-border bg-surface p-4">
      <Input name="quantity" type="number" placeholder="Quantity" />
      <Input name="offered_price" type="number" placeholder="Offered price per unit" />
      <Input name="message" placeholder="Optional message" />
      <Button type="submit">Submit Offer</Button>
    </form>
  )
}
