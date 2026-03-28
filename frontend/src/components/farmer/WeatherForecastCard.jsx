import { motion } from 'framer-motion'
import { Cloud, CloudDrizzle, CloudLightning, CloudRain, CloudSnow, RefreshCcw, Sun } from 'lucide-react'

import Button from '../shared/Button'

const iconMap = {
  Sun,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudLightning,
  CloudSnow,
}

const actionClass = {
  green: 'border-emerald-500 bg-emerald-50',
  amber: 'border-amber-500 bg-amber-50',
  red: 'border-red-500 bg-red-50',
  gray: 'border-slate-500 bg-slate-50',
}

export default function WeatherForecastCard({ weather, error, loading, onRefresh, onOpenApplyModal }) {
  const condition = weather?.condition || ['Unknown', 'mild', 'Cloud']
  const recommendation = weather?.price_recommendation
  const Icon = iconMap[condition[2]] || Cloud
  const animatePulse = ['storm', 'rain'].includes(condition[1])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border bg-[#3d2f2a] p-5 text-slate-100"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-300">Tomorrow's Weather</p>
          <p className="font-display text-2xl">{weather ? `${weather.city}, ${weather.state}` : (error ? 'Weather unavailable' : 'Loading location...')}</p>
        </div>
        <Button type="button" className="bg-white/10 text-white hover:bg-white/20" onClick={onRefresh}>
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error ? <p className="mt-2 text-xs text-amber-200">{error}</p> : null}

      <div className="mt-4 flex items-center gap-3">
        <motion.div animate={animatePulse ? { scale: [1, 1.05, 1] } : {}} transition={{ repeat: Infinity, duration: 3 }}>
          <Icon className="h-9 w-9 text-emerald-200" />
        </motion.div>
        <div>
          <p className="font-display text-3xl">{condition[0]}</p>
          <p className="text-xs text-slate-300">{new Date(Date.now() + 86400000).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
      </div>

      <motion.div
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        initial="hidden"
        animate="show"
        className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4"
      >
        {[
          ['Max Temp', `${weather?.temp_max ?? '--'} C`],
          ['Min Temp', `${weather?.temp_min ?? '--'} C`],
          ['Rain', `${weather?.precipitation_mm ?? '--'} mm`],
          ['Wind', `${weather?.wind_speed ?? '--'} km/h`],
        ].map(([label, value]) => (
          <motion.div key={label} variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }} className="rounded-lg bg-white/10 p-2">
            <p className="text-xs text-slate-300">{label}</p>
            <p className="font-semibold">{value}</p>
          </motion.div>
        ))}
      </motion.div>

      {recommendation ? (
        <div className={`mt-4 rounded-xl border-l-4 p-3 ${actionClass[recommendation.color] || actionClass.gray} text-slate-900`}>
          <p className="text-lg font-bold">{recommendation.action}</p>
          <span className="mt-1 inline-block rounded-full bg-white px-2 py-1 text-xs font-semibold">{recommendation.suggested_change}</span>
          <p className="mt-2 text-sm">{recommendation.reason}</p>
          <Button className="mt-3" onClick={onOpenApplyModal}>Apply Suggested Change</Button>
        </div>
      ) : null}

      <p className="mt-4 text-[11px] text-slate-300">Price suggestions are AI-generated estimates based on weather patterns. Always use your own judgement.</p>
    </motion.div>
  )
}
