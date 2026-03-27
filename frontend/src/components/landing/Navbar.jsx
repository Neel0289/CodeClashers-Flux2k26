import { Menu, Leaf } from 'lucide-react'
import { motion, useScroll } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import Button from '../shared/Button'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { scrollY } = useScroll()

  useEffect(() => scrollY.on('change', (v) => setScrolled(v > 60)), [scrollY])

  const links = ['How It Works', 'For Farmers', 'For Buyers', 'Pricing']

  return (
    <motion.nav className={`sticky top-0 z-30 border-b border-transparent px-6 py-4 transition ${scrolled ? 'border-border bg-white/5 backdrop-blur-md' : ''}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-2xl"><Leaf />KhetBazar</Link>
        <div className="hidden items-center gap-6 md:flex">
          {links.map((label) => <a key={label} className="text-sm text-text-muted" href="#">{label}</a>)}
          <Link to="/login"><Button className="border border-border bg-transparent text-text-primary hover:bg-surface-2 hover:text-text-primary">Login</Button></Link>
          <Link to="/register"><Button>Get Started</Button></Link>
        </div>
        <button className="md:hidden" onClick={() => setMobileOpen((v) => !v)}><Menu /></button>
      </div>
      {mobileOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-40 bg-bg/95 p-10 md:hidden">
          {links.map((label, i) => (
            <motion.a key={label} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.08 }} className="mb-5 block text-2xl" href="#">{label}</motion.a>
          ))}
        </motion.div>
      )}
    </motion.nav>
  )
}
