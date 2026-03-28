const colorMap = {
  confirmed: 'bg-accent/30 text-accent-bright',
  logistics_pending: 'bg-brown/30 text-brown-light',
  logistics_assigned: 'bg-accent/30 text-accent-bright',
  picked_up: 'bg-brown/30 text-brown-light',
  shipped: 'bg-brown/30 text-brown-light',
  in_transit: 'bg-brown/30 text-brown-light',
  delivered: 'bg-accent/30 text-accent-bright',
  completed: 'bg-accent/40 text-text-primary',
}

export default function StatusBadge({ status }) {
  const normalizedStatus = status === 'picked_up' ? 'shipped' : status
  const label = String(normalizedStatus || '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
  return <span className={`rounded-full px-3 py-1 text-xs ${colorMap[normalizedStatus] || 'bg-surface-2 text-text-muted'}`}>{label}</span>
}
