import { motion } from 'framer-motion'
import { Leaf, Store, Truck } from 'lucide-react'

import Card from '../shared/Card'

const roles = [
  { icon: Leaf, name: 'Farmer', bg: 'bg-surface-2', points: ['List crops', 'Negotiate pricing', 'Assign logistics'] },
  { icon: Store, name: 'Buyer', bg: 'bg-brown text-white', points: ['Browse produce', 'Offer prices', 'Pay escrow'] },
  { icon: Truck, name: 'Logistics Partner', bg: 'bg-surface', points: ['Get requests', 'Quote delivery', 'Track jobs'] },
]

export default function RoleCards() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="mb-8 text-center font-display text-4xl">Built for every link in the chain</h2>
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="grid gap-4 md:grid-cols-3">
        {roles.map((role) => (
          <motion.div key={role.name} whileHover={{ y: -6 }}>
            <Card className={`${role.bg} transition hover:shadow-glow`}>
              <role.icon className={`mb-3 ${role.bg.includes('brown') ? 'text-white' : 'text-accent-bright'}`} />
              <h3 className="mb-2 text-xl">{role.name}</h3>
              {role.points.map((point) => <p key={point} className={`text-sm ${role.bg.includes('brown') ? 'text-white/80' : 'text-text-muted'}`}>- {point}</p>)}
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
