import { motion } from 'framer-motion'

export default function Button({ children, className = '', variant = 'default', ...props }) {
  const type = props.type || 'button'
  const isClay = variant === 'clay'

  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`${isClay ? 'clay-button active:scale-95' : 'rounded-[12px] transition hover:bg-accent-dark'} bg-accent px-4 py-2 font-semibold ${!/\btext-(white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|accent|text|bg|surface)\b/.test(className) ? 'text-white' : ''} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
