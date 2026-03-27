import { motion } from 'framer-motion'

import Avatar from '../shared/Avatar'

const testimonials = [
  ['KhetBazar improved our margins and speed.', 'Anita Sharma', 'Buyer, Delhi'],
  ['Direct negotiation made pricing transparent.', 'Rakesh Patel', 'Farmer, Gujarat'],
  ['Consistent delivery requests every week.', 'Imran Khan', 'Logistics, Maharashtra'],
]

export default function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="mb-6 font-display text-4xl">Testimonials</h2>
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="grid gap-4 md:grid-cols-3">
        {testimonials.map(([quote, name, meta]) => (
          <motion.div key={name} variants={{ hidden: { y: 30, opacity: 0 }, show: { y: 0, opacity: 1 } }} className="rounded-[12px] border border-border bg-brown-surface p-5 text-text-primary shadow-card transition hover:-translate-y-1">
            <p className="mb-3 text-brown-light">★★★★★</p>
            <p className="mb-3">{quote}</p>
            <div className="flex items-center gap-2">
              <Avatar src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200" alt={name} />
              <div><p>{name}</p><p className="text-xs text-text-muted">{meta}</p></div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
