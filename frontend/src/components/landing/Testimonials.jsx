import { useMemo } from 'react'
import { motion } from 'framer-motion'

import Avatar from '../shared/Avatar'

const testimonialPool = [
  {
    quote: 'We reduced spoilage by 18% after using forecast alerts for daily buying.',
    name: 'Neha Verma',
    meta: 'Wholesale Buyer, Delhi',
    rating: '★★★★★',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200',
  },
  {
    quote: 'Bulk orders now close in one chat thread instead of five phone calls.',
    name: 'Arjun Mehta',
    meta: 'Retail Buyer, Jaipur',
    rating: '★★★★☆',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
  },
  {
    quote: 'Farm-gate pricing is visible in minutes, so negotiations feel fair on both sides.',
    name: 'Rakesh Solanki',
    meta: 'Farmer, Gujarat',
    rating: '★★★★★',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
  },
  {
    quote: 'Delivery slots are predictable now, and my drivers spend less time waiting.',
    name: 'Imran Shaikh',
    meta: 'Logistics Partner, Maharashtra',
    rating: '★★★★★',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200',
  },
  {
    quote: 'I discovered two new institutional buyers within my first week.',
    name: 'Pooja Nair',
    meta: 'Vegetable Producer, Kerala',
    rating: '★★★★☆',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
  },
  {
    quote: 'The payment timeline is clear, so I can plan inventory without stress.',
    name: 'Vikram Yadav',
    meta: 'Trader, Uttar Pradesh',
    rating: '★★★★★',
    avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200',
  },
]

function pickRandomTestimonials(list, count) {
  const shuffled = [...list].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export default function Testimonials() {
  const testimonials = useMemo(() => pickRandomTestimonials(testimonialPool, 3), [])

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="mb-6 font-display text-4xl">Testimonials</h2>
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={{ show: { transition: { staggerChildren: 0.08 } } }} className="grid gap-4 md:grid-cols-3">
        {testimonials.map(({ quote, name, meta, rating, avatar }) => (
          <motion.div key={name} variants={{ hidden: { y: 30, opacity: 0 }, show: { y: 0, opacity: 1 } }} className="rounded-[12px] border border-border bg-brown-surface p-5 text-text-primary shadow-card transition hover:-translate-y-1">
            <p className="mb-3 text-brown-light">{rating}</p>
            <p className="mb-3">{quote}</p>
            <div className="flex items-center gap-2">
              <Avatar src={avatar} alt={name} />
              <div><p>{name}</p><p className="text-xs text-text-muted">{meta}</p></div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
