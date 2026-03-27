const logos = ['Gujarat Agro', 'Maharashtra Farms', 'Punjab Harvest', 'Rajasthan Spices', 'Karnataka Organics', 'Tamil Nadu Fresh', 'Delhi Restaurants', 'Mumbai Hotels']

export default function LogoMarquee() {
  return (
    <section className="overflow-hidden py-10">
      <h3 className="mb-4 text-center text-text-muted">Trusted by farms and businesses across India</h3>
      <div className="flex w-[200%] animate-[marquee_30s_linear_infinite] gap-8">
        {[...logos, ...logos].map((logo, idx) => (
          <div key={`${logo}-${idx}`} className="rounded-full border border-border px-5 py-2 text-sm text-text-primary">{logo}</div>
        ))}
      </div>
    </section>
  )
}
