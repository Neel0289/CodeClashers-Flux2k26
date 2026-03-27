import { useParams } from 'react-router-dom'

import OfferForm from '../../components/buyer/OfferForm'
import PageShell from '../../components/shared/PageShell'

export default function BuyerProductDetailPage() {
  const { id } = useParams()
  return (
    <PageShell title={`Product ${id}`}>
      <OfferForm onSubmit={(e) => e.preventDefault()} />
    </PageShell>
  )
}
