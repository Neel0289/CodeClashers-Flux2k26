import PageShell from '../../components/shared/PageShell'
import NegotiationThread from '../../components/farmer/NegotiationThread'

const messages = [
  { id: 1, side: 'left', offered_price: 24, message: 'Can we do 24?' },
  { id: 2, side: 'right', offered_price: 27, message: 'Counter 27.' },
]

export default function FarmerNegotiationDetailPage() {
  return (
    <PageShell title="Negotiation Detail">
      <NegotiationThread messages={messages} />
    </PageShell>
  )
}
