import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

const tabs = [
  ['List Produce', ['Add inventory with photos', 'Set quantity and pricing', 'Publish instantly']],
  ['Negotiate Price', ['Start with buyer offers', 'Counter in chat thread', 'Lock final amount']],
  ['Find Logistics', ['State-based matching', 'Weight-capacity filters', 'Quote comparison']],
  ['Track Orders', ['Live timeline events', 'Status sync by role', 'Delivery milestones']],
  ['Release Payment', ['Escrow safety', 'Buyer confirmation', 'Auto split payouts']],
]

export default function FeatureTabs() {
  const [active, setActive] = useState(0)
  const tab = tabs[active]

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-6 flex flex-wrap gap-4">
        {tabs.map(([label], idx) => (
          <button key={label} onClick={() => setActive(idx)} className={`border-b-2 pb-2 ${active === idx ? 'border-accent-bright text-text-primary' : 'border-transparent text-text-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={tab[0]}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          className="grid gap-5 md:grid-cols-2"
        >
          <div>
            <h3 className="mb-3 text-3xl font-display">{tab[0]}</h3>
            {tab[1].map((point) => <p key={point} className="mb-2 text-text-muted">- {point}</p>)}
          </div>
          <div className="rounded-[12px] border border-border bg-surface p-6 text-text-primary shadow-card">Interactive mockup panel</div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
