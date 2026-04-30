import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import type { Club, ClubMember } from '@/lib/types';

export default async function ClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user      = await getCurrentUser();
  if (!user) redirect('/login');

  const pb = await getAuthenticatedPB();

  let club: Club;
  try {
    club = await pb.collection('clubs').getFirstListItem<Club>(`slug = "${slug}"`);
  } catch {
    notFound();
  }

  const members = await pb.collection('club_members').getFullList<ClubMember>({
    filter: `club = "${club.id}"`,
    sort:   'role',
  });

  const myMembership = members.find(m => m.user === user.id);
  const isCaptain    = myMembership?.role === 'captain';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{club.name}</h1>
          {club.description && (
            <p className="text-slate-500 mt-1">{club.description}</p>
          )}
        </div>
        {isCaptain && (
          <Link
            href={`/clubs/${slug}/invite`}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Invite member
          </Link>
        )}
      </div>

      {/* Members */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Members ({members.length})
        </h2>
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{m.user_name || m.user_email}</p>
                {m.user_name && m.user_email && (
                  <p className="text-xs text-slate-400">{m.user_email}</p>
                )}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                m.role === 'captain'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming rides — Phase 3 placeholder */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Upcoming rides
        </h2>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
          No rides planned yet.
          {isCaptain && (
            <p className="mt-1">Route planning coming in the next update.</p>
          )}
        </div>
      </section>
    </div>
  );
}
