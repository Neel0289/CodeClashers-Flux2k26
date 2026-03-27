import { motion } from 'framer-motion'
import { useState } from 'react'

const plans = [
  ['Basic', 0],
  ['Farmer Pro', 499],
  ['Business', 999],
]

export default function Pricing() {
  const [annual, setAnnual] = useState(false)
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-4xl">Pricing</h2>
        <button onClick={() => setAnnual((v) => !v)} className="rounded-full border border-border px-4 py-2 text-sm">{annual ? 'Annual' : 'Monthly'}</button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map(([name, price], idx) => (
          <motion.div layout key={name} className={`rounded-[12px] border bg-surface p-5 text-text-primary shadow-card ${idx === 1 ? 'border-accent-bright shadow-glow' : 'border-border'}`}>
            <p className="mb-2 text-text-muted">{name}</p>
            <p className="text-3xl font-bold">Rs {annual ? price * 10 : price}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
