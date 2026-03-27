import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Check, Clock, MessageSquare, MapPin, Package, CreditCard, Camera } from 'lucide-react'

const tabs = [
  {
    label: 'List Produce',
    points: ['Add inventory with photos', 'Set quantity and pricing', 'Publish instantly'],
    mockup: (
      <div className="space-y-4">
        <div className="flex gap-4 border-b border-border pb-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-surface-2 text-text-muted">
            <Camera size={24} />
          </div>
          <div className="flex-grow space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-surface-2" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-border p-2 text-sm text-text-muted">Quantity: 500kg</div>
          <div className="rounded-md border border-border p-2 text-sm text-text-muted">Price: Rs 25/kg</div>
        </div>
        <div className="rounded-md bg-accent px-4 py-2 text-center text-sm font-bold text-white shadow-sm">Publish Listing</div>
      </div>
    ),
  },
  {
    label: 'Negotiate Price',
    points: ['Start with buyer offers', 'Counter in chat thread', 'Lock final amount'],
    mockup: (
      <div className="space-y-4">
        <div className="max-w-[80%] rounded-lg bg-surface-2 p-3 text-sm">
          <p className="font-bold text-text-primary">Buyer: Rajesh</p>
          <p>I can offer Rs 22/kg for the entire lot. Interested?</p>
        </div>
        <div className="ml-auto max-w-[80%] rounded-lg bg-accent/10 p-3 text-sm text-right">
          <p className="font-bold text-accent">You</p>
          <p>Market rate is Rs 28/kg. How about Rs 26/kg?</p>
        </div>
        <div className="flex justify-center gap-2 pt-2">
          <div className="rounded-full border border-accent px-4 py-1 text-xs font-bold text-accent">Accept Rs 26</div>
          <div className="rounded-full bg-accent px-4 py-1 text-xs font-bold text-white">Counter</div>
        </div>
      </div>
    ),
  },
  {
    label: 'Find Logistics',
    points: ['State-based matching', 'Weight-capacity filters', 'Quote comparison'],
    mockup: (
      <div className="space-y-3">
        {[
          { icon: MapPin, name: 'Tata Ace (Available)', dist: '2.5 km', price: 'Rs 1,200', score: 4.8 },
          { icon: MapPin, name: 'Mahindra Bolero', dist: '5.2 km', price: 'Rs 1,800', score: 4.9 },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3 transition hover:border-accent">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-surface-2 p-2 text-accent-bright"><item.icon size={16} /></div>
              <div>
                <p className="text-sm font-bold">{item.name}</p>
                <p className="text-[10px] text-text-muted">{item.dist} · ⭐ {item.score}</p>
              </div>
            </div>
            <p className="text-sm font-bold text-accent">{item.price}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: 'Track Orders',
    points: ['Live timeline events', 'Status sync by role', 'Delivery milestones'],
    mockup: (
      <div className="space-y-4 py-2">
        {[
          { step: 'Order Placed', time: '10:30 AM', done: true },
          { step: 'Pickup Assigned', time: '11:15 AM', done: true },
          { step: 'In Transit', time: 'Heading to Delhi', active: true },
          { step: 'Delivery Confirmed', time: 'Pending' },
        ].map((item, i) => (
          <div key={i} className="relative flex items-center gap-4 pl-6">
            <div className={`absolute left-0 top-1/2 h-full w-[2px] -translate-y-1/2 ${i === 3 ? 'hidden' : 'bg-border'}`} />
            <div className={`absolute left-[-4px] top-1.5 h-2 w-2 rounded-full ${item.done ? 'bg-accent' : item.active ? 'bg-accent animate-ping' : 'bg-border'}`} />
            <div className="flex-grow border-b border-border/50 pb-2">
              <p className={`text-sm font-bold ${item.done || item.active ? 'text-text-primary' : 'text-text-muted'}`}>{item.step}</p>
              <p className="text-xs text-text-muted">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    label: 'Release Payment',
    points: ['Escrow safety', 'Buyer confirmation', 'Auto split payouts'],
    mockup: (
      <div className="flex flex-col items-center justify-center space-y-4 text-center py-6">
        <div className="relative h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center text-accent">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin-slow"
          />
          <Check size={40} />
        </div>
        <div>
          <p className="font-bold text-text-primary">Payment Released</p>
          <p className="text-sm text-text-muted">Rs 14,000 transferred to your wallet</p>
        </div>
        <div className="rounded-lg bg-surface-2 px-6 py-2 text-xs font-semibold text-text-muted border border-border">View Transaction ID: #KB-9921</div>
      </div>
    ),
  },
]

export default function FeatureTabs() {
  const [active, setActive] = useState(0)
  const tab = tabs[active]

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8 flex flex-wrap justify-center gap-x-8 gap-y-4">
        {tabs.map((t, idx) => (
          <button
            key={t.label}
            onClick={() => setActive(idx)}
            className={`transition-all duration-300 relative pb-2 text-sm font-medium ${
              active === idx ? 'text-accent font-bold scale-105' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {t.label}
            {active === idx && (
              <motion.div
                layoutId="activeTab"
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={tab.label}
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -20, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="grid gap-12 md:grid-cols-5 items-center"
        >
          <div className="md:col-span-2">
            <h3 className="mb-4 text-4xl font-display text-text-primary">{tab.label}</h3>
            <div className="space-y-3">
              {tab.points.map((point) => (
                <div key={point} className="flex items-center gap-2 group">
                  <div className="h-1 w-1 rounded-full bg-accent transition-all group-hover:w-3" />
                  <p className="text-lg text-text-muted">{point}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="rounded-[24px] border border-border bg-white p-8 text-text-primary shadow-xl ring-1 ring-black/5">
              {tab.mockup}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
