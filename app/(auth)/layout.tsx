export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[420px_1fr]">

      {/* Brand panel — desktop only */}
      <div className="hidden lg:flex flex-col justify-between bg-shell px-12 py-14">
        <p className="font-black text-xl tracking-tight text-white">
          Velo<span className="text-brand">Club</span>
        </p>
        <div>
          <p className="text-4xl font-black text-white leading-[1.1] tracking-tight">
            Your cycling<br />club, organised.
          </p>
          <p className="mt-4 text-white/45 text-sm leading-relaxed">
            Plan routes, coordinate group rides,<br />and manage your crew — all in one place.
          </p>
        </div>
        <p className="text-xs text-white/20">© 2025 VeloClub</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile wordmark */}
          <div className="text-center mb-8 lg:hidden">
            <p className="font-black text-2xl tracking-tight text-ink">
              Velo<span className="text-brand">Club</span>
            </p>
          </div>
          {children}
        </div>
      </div>

    </div>
  );
}
