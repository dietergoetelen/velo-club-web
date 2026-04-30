export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-3xl font-bold tracking-tight text-ink">
            Velo<span className="text-brand">Club</span>
          </p>
          <p className="text-sm text-ink-muted mt-1">Your cycling club, organised</p>
        </div>
        {children}
      </div>
    </main>
  );
}
