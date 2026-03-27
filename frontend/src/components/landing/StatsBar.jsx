import useCountUp from '../../hooks/useCountUp'
import useInView from '../../hooks/useInView'

const stats = [
  ['Farmers', 500],
  ['Transactions', 10],
  ['On-time Delivery', 98],
  ['Buyers', 1200],
]

function StatItem({ label, target, inView }) {
  const value = useCountUp(target, inView)
  return <div><p className="text-3xl font-bold text-accent-bright">{value}+</p><p className="text-sm text-text-muted">{label}</p></div>
}

export default function StatsBar() {
  const { ref, inView } = useInView()
  return (
    <section ref={ref} className="mx-auto grid max-w-6xl grid-cols-2 gap-4 rounded-[12px] border border-border bg-surface px-6 py-10 text-text-primary shadow-card md:grid-cols-4">
      {stats.map(([label, value]) => <StatItem key={label} label={label} target={value} inView={inView} />)}
    </section>
  )
}
