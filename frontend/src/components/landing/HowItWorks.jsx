import { motion } from 'framer-motion'

const steps = [
  'Farmer lists produce with price and details',
  'Buyer negotiates directly, no middleman',
  'Logistics delivers, payment releases automatically',
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="mb-10 text-center font-display text-4xl">Simple for everyone</h2>
      <svg className="mb-8 h-8 w-full" viewBox="0 0 100 8">
        <motion.path
          d="M0 4 H100"
          stroke="#2E7D32"
          strokeWidth="1"
          fill="none"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4 }}
        />
      </svg>
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="grid gap-4 md:grid-cols-3">
        {steps.map((step, idx) => (
          <motion.div key={step} variants={{ hidden: { y: 30, opacity: 0 }, show: { y: 0, opacity: 1 } }} className="rounded-[12px] border border-border bg-surface p-4 text-text-primary shadow-card">
            <p className="mb-2 text-accent-bright">Step {idx + 1}</p>
            <p>{step}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
