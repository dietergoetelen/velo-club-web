import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { logout } from '@/lib/actions/auth';

function initials(nameOrEmail: string) {
  return nameOrEmail
    .split(/[\s@.]+/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const displayName = user.name || user.email.split('@')[0];

  return (
    <div className="min-h-screen bg-canvas">

      <header className="sticky top-0 z-10 bg-shell border-b border-shell-line">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">

          <Link href="/dashboard" className="font-black text-lg tracking-tight text-white select-none">
            Velo<span className="text-brand">Club</span>
          </Link>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: 'var(--brand)' }}
              >
                {initials(user.name || user.email)}
              </div>
              <span className="hidden sm:block text-sm font-medium text-white/60 leading-none">
                {displayName}
              </span>
            </div>

            <form action={logout}>
              <button
                type="submit"
                className="text-xs text-white/35 hover:text-white/75 transition-colors cursor-pointer leading-none"
              >
                Sign out
              </button>
            </form>
          </div>

        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {children}
      </main>

    </div>
  );
}
