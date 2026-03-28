export default function PageShell({ title, actions, children }) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl text-accent flex items-center gap-3">
          {title}
        </h1>
        {actions ? <div>{actions}</div> : null}
      </div>
      {children}
    </main>
  )
}
