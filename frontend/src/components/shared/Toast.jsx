import { motion } from 'framer-motion'

export default function Toast({ toast, onClose }) {
  return (
    <motion.div
      initial={{ x: 140, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 140, opacity: 0 }}
      className="relative mb-2 w-80 overflow-hidden rounded-xl border border-border bg-surface p-3"
    >
      <p className="text-sm text-text-primary">{toast.message}</p>
      <motion.div
        className="mt-2 h-1 bg-accent-bright"
        initial={{ width: '100%' }}
        animate={{ width: 0 }}
        transition={{ duration: 4, ease: 'linear' }}
      />
      <button onClick={() => onClose(toast.id)} className="absolute right-2 top-2 text-xs text-text-muted">X</button>
    </motion.div>
  )
}
