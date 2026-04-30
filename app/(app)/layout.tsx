import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getMembership, getAuthenticatedPB } from '@/lib/session';
import { logout } from '@/lib/actions/auth';
import type { Club } from '@/lib/types';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const membership = await getMembership(user.id);
  let club: Club | null = null;

  if (membership) {
    const pb = await getAuthenticatedPB();
    club = await pb.collection('clubs').getOne<Club>(membership.club).catch(() => null);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-bold text-slate-900">
              VeloClub
            </Link>
            {club && (
              <Link
                href={`/clubs/${club.slug}`}
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                {club.name}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{user.name || user.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                Sign out
              </button>
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
