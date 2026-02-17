import Link from 'next/link'

const LINKS = [
  { href: '/o-nama', label: 'O nama' },
  { href: '/impressum', label: 'Impressum' },
  { href: '/privatnost', label: 'Privatnost' },
  { href: '/uslovi', label: 'Uslovi' },
  { href: '/kontakt', label: 'Kontakt' },
  { href: '/marketing', label: 'Marketing' },
]

export function StaticNav({ current }: { current: string }) {
  return (
    <nav className="sba-static-nav" aria-label="Stranice">
      <div className="sba-static-nav-inner">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="sba-static-nav-link"
            aria-current={l.href === current ? 'page' : undefined}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
