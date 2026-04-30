import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { approveJoinRequest, rejectJoinRequest } from '@/lib/actions/clubs';
import { JoinRequestForm } from './join-request-form';
import type { Club, ClubMember, JoinRequest } from '@/lib/types';

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

  const myMembership  = members.find(m => m.user === user.id);
  const isCaptain     = myMembership?.role === 'captain';
  const isMember      = !!myMembership;

  // Check if user already has a pending request
  const myRequest = !isMember
    ? await pb.collection('join_requests')
        .getFirstListItem<JoinRequest>(`club = "${club.id}" && user = "${user.id}" && status = "pending"`)
        .catch(() => null)
    : null;

  // Captain: fetch pending join requests
  const pendingRequests = isCaptain
    ? await pb.collection('join_requests').getFullList<JoinRequest>({
        filter: `club = "${club.id}" && status = "pending"`,
      }).catch(() => [])
    : [];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">{club.name}</h1>
          {club.description && (
            <p className="text-ink-muted mt-1">{club.description}</p>
          )}
        </div>
        {isCaptain && (
          <Link href={`/clubs/${slug}/settings`} className="btn-secondary text-xs px-3 py-2 shrink-0">
            Settings
          </Link>
        )}
      </div>

      {/* Non-member: join request */}
      {!isMember && (
        <div className="card p-6 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-ink">Want to ride with {club.name}?</p>
            <p className="text-sm text-ink-muted mt-0.5">
              {myRequest
                ? 'Your request is pending — the captain will review it shortly.'
                : 'Send a join request to the captain.'}
            </p>
          </div>
          {!myRequest && <JoinRequestForm clubId={club.id} slug={slug} />}
          {myRequest  && <span className="badge-neutral shrink-0">Pending</span>}
        </div>
      )}

      {/* Captain: pending requests */}
      {isCaptain && pendingRequests.length > 0 && (
        <section>
          <p className="eyebrow mb-3">Join requests · {pendingRequests.length}</p>
          <div className="card divide-y divide-line">
            {pendingRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-ink">{req.user_name || req.user_email}</p>
                  {req.user_name && req.user_email && (
                    <p className="text-xs text-ink-faint mt-0.5">{req.user_email}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <form action={approveJoinRequest}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="hidden" name="clubId"    value={club.id} />
                    <input type="hidden" name="slug"      value={slug} />
                    <button type="submit" className="btn-primary text-xs px-3 py-2">
                      Approve
                    </button>
                  </form>
                  <form action={rejectJoinRequest}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="hidden" name="clubId"    value={club.id} />
                    <input type="hidden" name="slug"      value={slug} />
                    <button type="submit" className="btn-secondary text-xs px-3 py-2">
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Members */}
      <section>
        <p className="eyebrow mb-3">Members · {members.length}</p>
        <div className="card divide-y divide-line">
          {members.map(m => (
            <div key={m.id} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <p className="text-sm font-medium text-ink">{m.user_name || m.user_email}</p>
                {m.user_name && m.user_email && (
                  <p className="text-xs text-ink-faint mt-0.5">{m.user_email}</p>
                )}
              </div>
              {m.role === 'captain'
                ? <span className="badge-brand">captain</span>
                : <span className="badge-neutral">member</span>
              }
            </div>
          ))}
        </div>
      </section>

      {/* Upcoming rides */}
      <section>
        <p className="eyebrow mb-3">Upcoming rides</p>
        <div className="card p-8 text-center text-ink-faint text-sm">
          No rides planned yet.
          {isCaptain && (
            <span className="block mt-1 text-ink-muted">Route planning coming soon.</span>
          )}
        </div>
      </section>

    </div>
  );
}
