import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function Sidebar({ items }) {
  const location = useLocation()
  return (
    <aside className="w-64 rounded-2xl border border-border bg-surface p-3">
      {items.map((item) => {
        const active = location.pathname === item.to
        return (
          <Link key={item.to} to={item.to} className="relative mb-1 block rounded-lg px-3 py-2 text-sm text-text-muted">
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-lg bg-accent/20"
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              />
            )}
            <span className="relative z-10">{item.label}</span>
          </Link>
        )
      })}
    </aside>
  )
}
