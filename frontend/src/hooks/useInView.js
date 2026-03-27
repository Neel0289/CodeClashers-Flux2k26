import { useInView as useIOInView } from 'react-intersection-observer'

export default function useInView(options = { triggerOnce: true, threshold: 0.2 }) {
  return useIOInView(options)
}
