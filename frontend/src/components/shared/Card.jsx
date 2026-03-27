export default function Card({ children, className = '' }) {
  return <div className={`rounded-[12px] border border-border bg-surface p-5 text-text-primary shadow-card ${className}`}>{children}</div>
}
