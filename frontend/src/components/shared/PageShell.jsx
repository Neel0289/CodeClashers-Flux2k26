export default function PageShell({ title, children }) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 font-display text-4xl">{title}</h1>
      {children}
    </main>
  )
}
