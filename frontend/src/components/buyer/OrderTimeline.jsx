import Timeline from '../shared/Timeline'

const steps = ['Confirmed', 'Logistics Assigned', 'Picked Up', 'In Transit', 'Delivered']

export default function OrderTimeline({ status }) {
  const map = {
    confirmed: 0,
    logistics_assigned: 1,
    picked_up: 2,
    in_transit: 3,
    delivered: 4,
    completed: 4,
  }
  return <Timeline steps={steps} current={map[status] ?? 0} />
}
