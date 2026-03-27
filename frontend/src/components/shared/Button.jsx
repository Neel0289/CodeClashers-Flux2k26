import { motion } from 'framer-motion'

export default function Button({ children, className = '', ...props }) {
  const type = props.type || 'button'

  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`rounded-[12px] bg-accent px-4 py-2 font-semibold transition hover:bg-accent-dark ${!className.includes('text-') ? 'text-white' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
