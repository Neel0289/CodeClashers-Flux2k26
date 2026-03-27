import PageShell from '../../components/shared/PageShell'
import ListingForm from '../../components/farmer/ListingForm'

export default function FarmerListingEditPage() {
  return (
    <PageShell title="Edit Listing">
      <ListingForm onSubmit={(e) => e.preventDefault()} />
    </PageShell>
  )
}
