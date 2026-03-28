export default function Input({ variant = 'default', ...props }) {
  const baseClass = variant === 'clay' ? 'clay-input' : 'focus-ring rounded-[12px] border border-border bg-white shadow-sm'
  return (
    <input
      className={`w-full px-4 py-2 text-text-primary ${baseClass}`}
      {...props}
    />
  )
}
