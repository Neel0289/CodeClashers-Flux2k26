export default function Badge({ children, className = '' }) {
  return <span className={`rounded-full bg-surface-2 px-3 py-1 text-xs text-text-muted ${className}`}>{children}</span>
}
