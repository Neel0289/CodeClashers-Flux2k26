export default function Card({ children, className = '', variant = 'default' }) {
  const baseClass = variant === 'clay' ? 'clay-card' : 'rounded-[12px] border border-border bg-surface text-text-primary shadow-card'
  return <div className={`${baseClass} p-5 ${className}`}>{children}</div>
}
