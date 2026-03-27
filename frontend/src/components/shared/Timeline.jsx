import { motion } from 'framer-motion'

export default function Timeline({ steps, current }) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const active = i <= current
        return (
          <div key={step} className="relative flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${active ? 'bg-accent-bright' : 'bg-border'}`} />
            <span className={active ? 'text-text-primary' : 'text-text-muted'}>{step}</span>
            {i < steps.length - 1 && (
              <motion.div
                className="absolute left-1.5 top-5 h-8 w-0.5 bg-accent"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: active ? 1 : 0 }}
                style={{ originY: 0 }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
