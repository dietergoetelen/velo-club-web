import Link from 'next/link';

const NAV = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Clubs',     href: '/clubs'     },
  { label: 'Profile',   href: '/profile'   },
];

export function Footer() {
  return (
    <footer
      className="relative mt-24 bg-accent text-white overflow-hidden"
      style={{ borderTop: '2px solid var(--ink)' }}
    >
      <span
        aria-hidden
        className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-amber"
        style={{ border: '2px solid var(--ink)', boxShadow: 'var(--shadow-pop)' }}
      />
      <span
        aria-hidden
        className="absolute top-12 right-24 w-10 h-10 bg-mint"
        style={{ border: '2px solid var(--ink)', transform: 'rotate(18deg)' }}
      />
      <span
        aria-hidden
        className="absolute -bottom-10 right-1/3 w-24 h-24 rounded-full bg-pink"
        style={{ border: '2px solid var(--ink)' }}
      />

      <div className="relative max-w-6xl mx-auto px-6 py-14">

        <div className="grid gap-10 md:grid-cols-[2fr_1fr]">

          <div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 select-none">
              <span className="font-heading font-black text-2xl tracking-tight">
                Pace<span className="text-amber">line</span>
              </span>
              <span
                className="w-3 h-3 rounded-full bg-pink"
                style={{ border: '2px solid rgba(255,255,255,0.7)' }}
              />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
              Plan rides, ride together, log the miles. Built for clubs that
              prefer the long way home.
            </p>
          </div>

          <div>
            <p className="eyebrow text-white/60 mb-4">Explore</p>
            <ul className="space-y-2">
              {NAV.map(item => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm font-bold text-white/75 hover:text-amber transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div
          className="mt-12 pt-6"
          style={{ borderTop: '2px dashed rgba(255,255,255,0.25)' }}
        >
          <p className="text-xs text-white/55">
            © {new Date().getFullYear()} Paceline · Made with two wheels and a tailwind.
          </p>
        </div>

      </div>
    </footer>
  );
}
