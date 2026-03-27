import { useScroll, useTransform } from 'framer-motion'

export default function useScrollProgress() {
  const { scrollYProgress, scrollY } = useScroll()
  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])
  return { scrollY, progressWidth }
}
