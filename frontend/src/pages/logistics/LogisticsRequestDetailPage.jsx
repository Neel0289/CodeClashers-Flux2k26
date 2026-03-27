import PageShell from '../../components/shared/PageShell'
import QuoteForm from '../../components/logistics/QuoteForm'

export default function LogisticsRequestDetailPage() {
  return (
    <PageShell title="View and Quote">
      <QuoteForm onSubmit={(e) => e.preventDefault()} />
    </PageShell>
  )
}
