import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getMemberships, getAuthenticatedPB } from '@/lib/session';
import { JoinRequestForm } from '@/app/(app)/clubs/[slug]/join-request-form';
import type { Club, ClubMember, JoinRequest } from '@/lib/types';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const pb          = await getAuthenticatedPB();
  const memberships = await getMemberships(user.id);
  const myClubIds   = new Set(memberships.map(m => m.club));

  const allClubs   = await pb.collection('clubs').getFullList<Club>({ sort: 'name' }).catch(() => []);
  const myClubs    = allClubs.filter(c => myClubIds.has(c.id));
  const otherClubs = allClubs.filter(c => !myClubIds.has(c.id));

  const myRequests = otherClubs.length
    ? await pb.collection('join_requests').getFullList<JoinRequest>({
        filter: `user = "${user.id}" && status = "pending"`,
      }).catch(() => [])
    : [];
  const pendingClubIds = new Set(myRequests.map(r => r.club));

  const roleFor = (clubId: string): ClubMember['role'] | undefined =>
    memberships.find(m => m.club === clubId)?.role;

  const firstName = user.name?.split(' ')[0] || user.email.split('@')[0];

  return (
    <div className="space-y-12">

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-ink">
          {greeting()}, {firstName}
        </h1>
        <p className="text-ink-muted mt-1.5">
          {myClubs.length === 0
            ? 'Join a club or create your own to get started.'
            : `You're in ${myClubs.length} club${myClubs.length !== 1 ? 's' : ''}.`}
        </p>
      </div>

      {/* My clubs */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <p className="eyebrow">My clubs · {myClubs.length}</p>
          <Link href="/clubs/new" className="btn-secondary text-xs px-3 py-2">
            + New club
          </Link>
        </div>

        {myClubs.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-ink-muted text-sm">You're not in any club yet.</p>
            <p className="text-ink-faint text-xs mt-1">Create one or request to join below.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {myClubs.map(club => (
              <Link
                key={club.id}
                href={`/clubs/${club.slug}`}
                className="card-link p-6 group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-bold text-ink group-hover:text-brand transition-colors leading-snug">
                    {club.name}
                  </p>
                  {roleFor(club.id) === 'captain'
                    ? <span className="badge-brand shrink-0">captain</span>
                    : <span className="badge-neutral shrink-0">member</span>
                  }
                </div>
                <p className="text-sm text-ink-muted line-clamp-2 min-h-[1.25rem]">
                  {club.description || <span className="italic text-ink-faint">No description</span>}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Discover */}
      {otherClubs.length > 0 && (
        <section>
          <p className="eyebrow mb-5">Discover clubs · {otherClubs.length}</p>
          <div className="card divide-y divide-line">
            {otherClubs.map(club => {
              const isPending = pendingClubIds.has(club.id);
              return (
                <div key={club.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{club.name}</p>
                    {club.description && (
                      <p className="text-sm text-ink-muted mt-0.5 truncate">{club.description}</p>
                    )}
                  </div>
                  {isPending
                    ? <span className="badge-neutral shrink-0">Pending</span>
                    : <JoinRequestForm clubId={club.id} slug={club.slug} />
                  }
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
