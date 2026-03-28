import { Leaf } from 'lucide-react'

const cols = {
  Platform: ['How It Works', 'Pricing', 'Security'],
  'For Farmers': ['List Produce', 'Negotiate', 'Manage Orders'],
  'For Buyers': ['Browse Catalog', 'Track Orders', 'Review Partners'],
  Company: ['About', 'Contact', 'Careers'],
}

export default function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-5">
        <div>
          <p className="mb-2 flex items-center gap-2 text-2xl font-display"><Leaf />KhetBazar</p>
          <p className="text-sm text-text-muted">Connecting farms to tables, directly.</p>
        </div>
        {Object.entries(cols).map(([title, links]) => (
          <div key={title}>
            <p className="mb-3 font-semibold">{title}</p>
            {links.map((link) => <p key={link} className="mb-1 text-sm text-text-muted">{link}</p>)}
          </div>
        ))}
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-center text-sm text-text-muted">Copyright 2026 KhetBazar</p>
    </footer>
  )
}
