const colorMap = {
  confirmed: 'bg-accent/30 text-accent-bright',
  logistics_pending: 'bg-brown/30 text-brown-light',
  logistics_assigned: 'bg-accent/30 text-accent-bright',
  picked_up: 'bg-brown/30 text-brown-light',
  in_transit: 'bg-brown/30 text-brown-light',
  delivered: 'bg-accent/30 text-accent-bright',
  completed: 'bg-accent/40 text-text-primary',
}

export default function StatusBadge({ status }) {
  return <span className={`rounded-full px-3 py-1 text-xs ${colorMap[status] || 'bg-surface-2 text-text-muted'}`}>{status}</span>
}
