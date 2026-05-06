export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[440px_1fr]">

      {/* ── Brand panel — dark + full Memphis ── */}
      <div
        className="hidden lg:flex flex-col justify-between px-12 py-14 relative overflow-hidden"
        style={{ backgroundColor: 'var(--ink)', borderRight: '2px solid var(--ink)' }}
      >
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />

        {/* Floating shapes */}
        <div
          className="absolute top-16 right-10 w-36 h-36 rounded-full"
          style={{
            backgroundColor: 'var(--amber)',
            border: '2px solid rgba(255,255,255,0.15)',
            animation: 'float 7s ease-in-out infinite',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute top-48 right-20 w-14 h-14 rounded-xl rotate-12"
          style={{
            backgroundColor: 'var(--pink)',
            border: '2px solid rgba(255,255,255,0.15)',
            animation: 'float-reverse 5s ease-in-out infinite 1s',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-40 left-10 w-20 h-20 rounded-full"
          style={{
            backgroundColor: 'var(--mint)',
            border: '2px solid rgba(255,255,255,0.15)',
            animation: 'float 9s ease-in-out infinite 2s',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute bottom-20 right-12 w-10 h-10 rounded-lg rotate-45"
          style={{
            backgroundColor: 'var(--accent)',
            border: '2px solid rgba(255,255,255,0.15)',
            animation: 'float-reverse 6s ease-in-out infinite 0.5s',
          }}
          aria-hidden="true"
        />

        {/* Content */}
        <p className="font-heading font-black text-2xl text-white relative z-10 tracking-tight">
          Pace<span style={{ color: 'var(--amber)' }}>line</span>
        </p>

        <div className="relative z-10">
          <p className="font-heading font-black text-5xl text-white leading-[1.05] tracking-tight">
            Your cycling<br />club,<br />organised.
          </p>
          <p className="mt-5 text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Plan routes, coordinate group<br />
            rides, and manage your crew.
          </p>
        </div>

        <p className="text-xs relative z-10" style={{ color: 'rgba(255,255,255,0.18)' }}>
          © {new Date().getFullYear()} Paceline
        </p>
      </div>

      {/* ── Form panel ── */}
      <div className="flex flex-col items-center justify-center px-6 py-12 bg-paper relative">
        <div className="w-full max-w-sm relative z-10">
          {/* Mobile wordmark */}
          <div className="text-center mb-10 lg:hidden">
            <p className="font-heading font-black text-3xl text-ink">
              Pace<span className="text-accent">line</span>
            </p>
          </div>
          {children}
        </div>
      </div>

    </div>
  );
}
