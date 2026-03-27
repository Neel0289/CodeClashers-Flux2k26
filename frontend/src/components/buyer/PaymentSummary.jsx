import Card from '../shared/Card'

export default function PaymentSummary({ payment }) {
  return (
    <Card>
      <p>Produce: Rs {payment.produce_amount}</p>
      <p>Logistics: Rs {payment.logistics_fee}</p>
      <p>Platform fee: Rs {payment.platform_fee}</p>
      <p className="font-semibold">Total: Rs {payment.total_amount}</p>
    </Card>
  )
}
