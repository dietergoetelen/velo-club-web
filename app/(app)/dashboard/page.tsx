import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getMemberships, getAuthenticatedPB } from '@/lib/session';
import { JoinRequestForm } from '@/app/(app)/clubs/[slug]/join-request-form';
import type { Club, ClubMember, JoinRequest } from '@/lib/types';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const pb          = await getAuthenticatedPB();
  const memberships = await getMemberships(user.id);
  const myClubIds   = new Set(memberships.map(m => m.club));

  const allClubs  = await pb.collection('clubs').getFullList<Club>({ sort: 'name' }).catch(() => []);
  const myClubs   = allClubs.filter(c => myClubIds.has(c.id));
  const otherClubs = allClubs.filter(c => !myClubIds.has(c.id));

  // Pending requests the user has already sent
  const myRequests = otherClubs.length
    ? await pb.collection('join_requests').getFullList<JoinRequest>({
        filter: `user = "${user.id}" && status = "pending"`,
      }).catch(() => [])
    : [];
  const pendingClubIds = new Set(myRequests.map(r => r.club));

  const roleFor = (clubId: string): ClubMember['role'] | undefined =>
    memberships.find(m => m.club === clubId)?.role;

  return (
    <div className="space-y-10">

      {/* My clubs */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <p className="eyebrow">My clubs · {myClubs.length}</p>
          <Link href="/clubs/new" className="btn-secondary text-xs px-3 py-2">
            + New club
          </Link>
        </div>

        {myClubs.length === 0 ? (
          <div className="card p-8 text-center text-ink-muted text-sm">
            You're not in any club yet — create one or request to join below.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {myClubs.map(club => (
              <Link
                key={club.id}
                href={`/clubs/${club.slug}`}
                className="card p-5 hover:border-line-mid transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-ink group-hover:text-brand transition-colors">
                    {club.name}
                  </p>
                  {roleFor(club.id) === 'captain'
                    ? <span className="badge-brand shrink-0">captain</span>
                    : <span className="badge-neutral shrink-0">member</span>
                  }
                </div>
                {club.description && (
                  <p className="text-sm text-ink-muted mt-1.5 line-clamp-2">{club.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Discover */}
      {otherClubs.length > 0 && (
        <section>
          <p className="eyebrow mb-4">Discover clubs</p>
          <div className="card divide-y divide-line">
            {otherClubs.map(club => {
              const isPending = pendingClubIds.has(club.id);
              return (
                <div key={club.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{club.name}</p>
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
