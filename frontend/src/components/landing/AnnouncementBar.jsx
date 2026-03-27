import { motion } from 'framer-motion'
import { useState } from 'react'

export default function AnnouncementBar() {
  const [open, setOpen] = useState(true)
  if (!open) return null

  return (
    <motion.div
      initial={{ y: -60, opacity: 0, height: 0 }}
      animate={{ y: 0, opacity: 1, height: 'auto' }}
      exit={{ y: -60, opacity: 0, height: 0 }}
      className="flex items-center justify-center gap-3 bg-accent-bright px-4 py-2 text-sm font-semibold text-bg"
    >
      <span>New: AI-powered crop demand forecasting is live - Try free</span>
      <button onClick={() => setOpen(false)} className="rounded px-2">X</button>
    </motion.div>
  )
}
