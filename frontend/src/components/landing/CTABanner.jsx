import Button from '../shared/Button'
import Input from '../shared/Input'

export default function CTABanner() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="rounded-[12px] border border-border bg-surface p-10 text-text-primary shadow-card">
        <h2 className="mb-4 font-display text-4xl">Ready to cut out the middleman?</h2>
        <div className="flex flex-col gap-3 md:flex-row">
          <Input placeholder="Enter your email" />
          <Button>Join Free</Button>
        </div>
      </div>
    </section>
  )
}
