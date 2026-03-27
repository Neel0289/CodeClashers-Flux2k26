import { useEffect, useState } from 'react'

export default function useCountUp(target, inView, duration = 2000) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) {
      return
    }

    const start = performance.now()
    const tick = (now) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(target * eased))
      if (progress < 1) {
        requestAnimationFrame(tick)
      }
    }

    requestAnimationFrame(tick)
  }, [target, inView, duration])

  return value
}
