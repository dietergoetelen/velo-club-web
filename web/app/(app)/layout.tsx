import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { fileUrl } from '@/lib/pocketbase';
import { logout } from '@/lib/actions/auth';
import { Footer } from '@/components/footer';

function getInitials(nameOrEmail: string) {
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
    <div className="min-h-screen flex flex-col">

      <header className="sticky top-0 z-20 bg-accent" style={{ borderBottom: '2px solid var(--ink)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

          <Link href="/dashboard" className="flex items-center gap-2 select-none">
            <span className="font-heading font-black text-xl text-white tracking-tight">
              Pace<span className="text-amber">line</span>
            </span>
            <span
              className="w-2.5 h-2.5 rounded-full bg-pink"
              style={{ border: '2px solid rgba(255,255,255,0.6)' }}
            />
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/profile" className="flex items-center gap-3 group" aria-label="Edit your profile">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden text-xs font-black text-ink shrink-0"
                style={{
                  backgroundColor: user.avatar ? 'transparent' : 'var(--amber)',
                  border: '2px solid rgba(255,255,255,0.8)',
                  boxShadow: '2px 2px 0px rgba(0,0,0,0.25)',
                }}
              >
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fileUrl('users', user.id, user.avatar, '100x100')}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(user.name || user.email)
                )}
              </div>
              <span className="hidden sm:block text-sm font-bold text-white/70 group-hover:text-white font-heading transition-colors">
                {displayName}
              </span>
            </Link>

            <form action={logout}>
              <button type="submit" className="btn-nav">Sign out</button>
            </form>
          </div>

        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-10">
        {children}
      </main>

      <Footer />

    </div>
  );
}
