import Button from '../shared/Button'
import Input from '../shared/Input'

export default function QuoteForm({ onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Input name="quoted_fee" type="number" placeholder="Delivery fee" />
      <Button className="bg-accent-bright text-bg" type="submit">Submit Quote</Button>
    </form>
  )
}
