import { motion } from 'framer-motion'

import PageShell from '../../components/shared/PageShell'

export default function FarmerDashboardPage() {
  const cards = ['Active Listings', 'Open Negotiations', 'Pending Logistics', 'Earnings']
  return (
    <PageShell title="Farmer Dashboard">
      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <motion.div key={card} variants={{ hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } }} className="rounded-2xl border border-border bg-surface p-4">
            {card}
          </motion.div>
        ))}
      </motion.div>
    </PageShell>
  )
}
