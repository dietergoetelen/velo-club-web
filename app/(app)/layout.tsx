import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { logout } from '@/lib/actions/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-canvas">

      <header className="sticky top-0 z-10 bg-surface border-b border-line">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-bold text-ink tracking-tight">
            Velo<span className="text-brand">Club</span>
          </Link>
          <div className="flex items-center gap-1">
            <span className="hidden sm:block text-sm text-ink-muted px-2">
              {user.name || user.email}
            </span>
            <form action={logout}>
              <button type="submit" className="btn-ghost text-xs px-3 py-2">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>

    </div>
  );
}
