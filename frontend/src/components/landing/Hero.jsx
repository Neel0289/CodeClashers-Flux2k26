import { motion } from 'framer-motion'
import { Leaf, Mic, Bot, Search, MessageSquare, Zap, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

import Button from '../shared/Button'

const words = 'From Farm to Table. Without the Middleman.'.split(' ')

export default function Hero() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="relative mt-6 grid gap-8 rounded-[12px] bg-accent px-8 py-16 text-white shadow-card md:grid-cols-2">
        <div>
          <span className="mb-5 inline-flex rounded-full border border-white/30 bg-white/10 px-4 py-1 text-sm text-white">500+ farms · 1,200+ buyers</span>
          <motion.h1
            className="mb-4 text-5xl font-display leading-tight md:text-6xl text-white"
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
            <Button className="bg-white text-black hover:bg-white/90 hover:text-black font-bold">I'm a Farmer</Button>
            <Button className="bg-white text-black hover:bg-white/90 hover:text-black font-bold">I'm a Buyer</Button>
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
          <div className="relative z-10">
            <img
              src="https://www.shutterstock.com/image-vector/farmers-local-market-farm-vegetables-260nw-2596590131.jpg"
              alt="Fresh Agriculture"
              className="mb-4 h-48 w-full rounded-lg object-cover shadow-sm"
            />
            <div className="space-y-2">
              <p className="flex items-center gap-2 font-medium">
                <span className="h-2 w-2 rounded-full bg-accent"></span>
                Direct Farmer Negotiation
              </p>
              <p className="flex items-center gap-2 font-medium">
                <span className="h-2 w-2 rounded-full bg-accent"></span>
                Smart Logistics Matching
              </p>
              <p className="flex items-center gap-2 font-medium">
                <span className="h-2 w-2 rounded-full bg-accent"></span>
                Secure Escrow Payments
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* New Farmer & Buyer Sections */}
      <div className="mt-12 grid gap-10 grid-cols-1">
        {/* For Farmers */}
        <motion.div
          id="for-farmers"
          whileHover={{ y: -8, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
          className="flex flex-col rounded-[16px] border border-border bg-white p-8 shadow-card transition-all"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-full bg-accent/10 p-3 text-accent">
              <Leaf size={28} />
            </div>
            <span className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              <Bot size={14} /> AI Powered
            </span>
          </div>
          <h2 className="mb-2 text-3xl font-bold text-text-primary">For Farmers</h2>
          <p className="mb-6 text-text-muted">Sell your crops directly to buyers and get the best price.</p>
          
          <ul className="mb-2 space-y-4 flex-grow">
            <li className="flex items-center gap-3 text-text-primary">
              <Zap size={18} className="text-accent" />
              <span>Add products easily</span>
            </li>
            <li className="flex items-center gap-3 text-text-primary">
              <Mic size={18} className="text-accent" />
              <div className="flex flex-col">
                <span>Voice input in local language</span>
                <span className="text-[10px] uppercase tracking-wider text-accent font-bold">Voice Enabled</span>
              </div>
            </li>
            <li className="flex items-center gap-3 text-text-primary">
              <Sparkles size={18} className="text-accent" />
              <span>Get price suggestions</span>
            </li>
          </ul>
        </motion.div>

        {/* For Buyers */}
        <motion.div
          id="for-buyers"
          whileHover={{ y: -8, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
          className="flex flex-col rounded-[16px] border border-border bg-white p-8 shadow-card transition-all"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-full bg-brown/10 p-3 text-brown">
              <Search size={28} />
            </div>
            <span className="flex items-center gap-1 rounded-full bg-brown/10 px-3 py-1 text-xs font-semibold text-brown">
              <Bot size={14} /> Smart Matching
            </span>
          </div>
          <h2 className="mb-2 text-3xl font-bold text-text-primary">For Buyers</h2>
          <p className="mb-6 text-text-muted">Buy fresh crops directly from farmers at better prices.</p>
          
          <ul className="mb-2 space-y-4 flex-grow">
            <li className="flex items-center gap-3 text-text-primary">
              <Search size={18} className="text-brown" />
              <span>Browse nearby farmers</span>
            </li>
            <li className="flex items-center gap-3 text-text-primary">
              <MessageSquare size={18} className="text-brown" />
              <div className="flex flex-col">
                <span>Chat using voice/text</span>
                <span className="text-[10px] uppercase tracking-wider text-brown font-bold">Voice Enabled</span>
              </div>
            </li>
            <li className="flex items-center gap-3 text-text-primary">
              <Zap size={18} className="text-brown" />
              <span>Get fresh products faster</span>
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  )
}
