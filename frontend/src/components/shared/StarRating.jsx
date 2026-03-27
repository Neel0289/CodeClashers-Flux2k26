import { Star } from 'lucide-react'

export default function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange?.(n)} type="button">
          <Star className={n <= value ? 'fill-brown-light text-brown-light' : 'text-text-muted'} size={18} />
        </button>
      ))}
    </div>
  )
}
