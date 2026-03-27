export default function Modal({ open, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6">{children}</div>
    </div>
  )
}
