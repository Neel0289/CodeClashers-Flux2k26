import { motion } from 'framer-motion'

export default function Button({ children, className = '', ...props }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`rounded-[12px] bg-accent px-4 py-2 font-semibold text-white transition hover:bg-accent-dark ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
