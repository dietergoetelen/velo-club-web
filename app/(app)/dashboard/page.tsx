import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getMembership, getAuthenticatedPB } from '@/lib/session';
import type { Club } from '@/lib/types';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const membership = await getMembership(user.id);

  if (membership) {
    const pb   = await getAuthenticatedPB();
    const club = await pb.collection('clubs').getOne<Club>(membership.club).catch(() => null);
    if (club) redirect(`/clubs/${club.slug}`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-sm w-full">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">No club yet</h2>
        <p className="text-slate-500 text-sm mb-6">
          Create your own club or ask a captain to send you an invitation link.
        </p>
        <Link
          href="/clubs/new"
          className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          Create a club
        </Link>
      </div>
    </div>
  );
}
