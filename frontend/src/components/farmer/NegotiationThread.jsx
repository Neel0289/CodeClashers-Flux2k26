import { motion } from 'framer-motion'

export default function NegotiationThread({ messages = [] }) {
  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <motion.div
          key={msg.id}
          initial={{ x: msg.side === 'right' ? 30 : -30, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`max-w-md rounded-2xl p-3 ${msg.side === 'right' ? 'ml-auto bg-accent/30' : 'bg-brown/25'}`}
        >
          <p className="text-sm">Rs {msg.offered_price}</p>
          <p className="text-xs text-text-muted">{msg.message}</p>
        </motion.div>
      ))}
    </div>
  )
}
