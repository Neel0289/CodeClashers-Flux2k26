import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart2, Home, Package, Truck } from 'lucide-react'

const iconMap = {
  Home,
  BarChart2,
  Package,
  Truck,
}

export default function Sidebar({ items }) {
  const location = useLocation()
  return (
    <aside className="w-64 rounded-2xl border border-border bg-surface p-3">
      {items.map((item) => {
        const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
        const Icon = iconMap[item.icon]
        return (
          <Link key={item.to} to={item.to} className="relative mb-1 block rounded-lg px-3 py-2 text-sm text-text-muted">
            {active && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-lg bg-accent/20"
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              />
            )}
            {active && <motion.span layoutId="sidebar-left-indicator" className="absolute bottom-1 left-0 top-1 w-1 rounded-r bg-accent" />}
            <span className="relative z-10 flex items-center gap-2">
              {Icon ? <Icon className="h-4 w-4" /> : null}
              <span>{item.label}</span>
              {item.badge ? <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{item.badge}</span> : null}
            </span>
          </Link>
        )
      })}
    </aside>
  )
}
