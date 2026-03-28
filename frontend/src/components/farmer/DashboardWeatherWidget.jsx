import { motion } from 'framer-motion'
import { Cloud, CloudLightning, CloudRain, Link as LinkIcon, Sun } from 'lucide-react'
import { Link } from 'react-router-dom'

import Card from '../shared/Card'

const iconMap = {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
}

const bgMap = {
  green: 'bg-emerald-50',
  amber: 'bg-amber-50',
  red: 'bg-red-50',
  gray: 'bg-slate-50',
}

export default function DashboardWeatherWidget({ weather }) {
  const recommendation = weather?.price_recommendation
  const condition = weather?.condition || ['Unknown', 'mild', 'Cloud']
  const Icon = iconMap[condition[2]] || Cloud

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className={recommendation ? bgMap[recommendation.color] || bgMap.gray : ''}>
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">Weather Alert</p>
          <Link to="/farmer/market-intelligence" className="text-xs font-semibold text-accent">View Details {'->'}</Link>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Icon className="h-5 w-5 text-accent" />
          <p className="font-medium">{condition[0]}</p>
        </div>
        <p className="mt-1 text-sm text-text-muted">{recommendation?.action || 'No recommendation yet'}</p>
      </Card>
    </motion.div>
  )
}
