import { motion } from 'framer-motion'

import Button from '../shared/Button'

const words = 'From Farm to Table. Without the Middleman.'.split(' ')

export default function Hero() {
  return (
    <section className="relative mx-auto mt-6 grid max-w-6xl gap-8 rounded-[12px] bg-[linear-gradient(135deg,#2E7D32,#66BB6A)] px-8 py-16 text-white shadow-card md:grid-cols-2">
      <div>
        <span className="mb-5 inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1 text-sm">500+ farms · 1,200+ buyers</span>
        <motion.h1
          className="mb-4 text-5xl font-display leading-tight md:text-6xl"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden"
          animate="show"
        >
          {words.map((word) => (
            <motion.span key={word} variants={{ hidden: { y: 30, opacity: 0 }, show: { y: 0, opacity: 1 } }} className="mr-2 inline-block">
              {word}
            </motion.span>
          ))}
        </motion.h1>
        <p className="mb-6 text-white/90">KhetBazar connects farmers directly to restaurants and stores - with negotiation, smart logistics matching, and escrow payments.</p>
        <div className="flex gap-3">
          <Button>I'm a Farmer</Button>
          <Button>I'm a Buyer</Button>
        </div>
      </div>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 120 }}
        className="relative rounded-[12px] border border-border bg-white p-6 text-text-primary shadow-card"
      >
        <div className="absolute -left-10 top-8 h-40 w-40 rounded-full bg-accent/20 blur-3xl" style={{ animation: 'orbFloat 20s ease-in-out infinite alternate' }} />
        <div className="absolute -right-6 bottom-6 h-32 w-32 rounded-full bg-accent/25 blur-3xl" style={{ animation: 'orbFloat 20s ease-in-out infinite alternate', animationDelay: '1.5s' }} />
        <p className="mb-3">New Order - 500kg Tomatoes</p>
        <p className="mb-3">Negotiation accepted - Rs 28/kg</p>
        <p className="mb-3">Logistics matched - Gujarat to Maharashtra</p>
        <p>Rs 14,000 in escrow</p>
      </motion.div>
    </section>
  )
}
