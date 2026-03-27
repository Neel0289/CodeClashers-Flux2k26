import PageShell from '../../components/shared/PageShell'
import ListingForm from '../../components/farmer/ListingForm'

export default function FarmerListingNewPage() {
  return (
    <PageShell title="Add New Listing">
      <ListingForm onSubmit={(e) => e.preventDefault()} />
    </PageShell>
  )
}
