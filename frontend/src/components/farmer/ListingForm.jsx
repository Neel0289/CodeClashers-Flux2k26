import Button from '../shared/Button'
import Input from '../shared/Input'

export default function ListingForm({ onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <Input name="name" placeholder="Product name" />
      <Input name="category" placeholder="Category" />
      <Input name="base_price" type="number" placeholder="Base price" />
      <Input name="quantity_available" type="number" placeholder="Quantity" />
      <Button className="bg-accent-bright text-bg" type="submit">Save Listing</Button>
    </form>
  )
}
