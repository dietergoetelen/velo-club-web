import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { fileUrl } from '@/lib/pocketbase';
import { approveJoinRequest, rejectJoinRequest, promoteToCaptain } from '@/lib/actions/clubs';
import { JoinRequestForm } from './join-request-form';
import type { Club, ClubMember, JoinRequest, Route } from '@/lib/types';

const PALETTE = ['#FBBF24', '#F472B6', '#34D399', '#8B5CF6'] as const;
function clubAccent(id: string) { return PALETTE[id.charCodeAt(0) % 4]; }

const AVATAR_COLORS = ['#FBBF24', '#F472B6', '#34D399', '#8B5CF6'] as const;

function getInitials(nameOrEmail: string) {
  return (nameOrEmail || '?')
    .split(/[\s@.]+/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export default async function ClubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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
  const isMember     = !!myMembership;

  const myRequest = !isMember
    ? await pb.collection('join_requests')
        .getFirstListItem<JoinRequest>(
          `club = "${club.id}" && user = "${user.id}" && status = "pending"`,
        )
        .catch(() => null)
    : null;

  const pendingRequests = isCaptain
    ? await pb.collection('join_requests').getFullList<JoinRequest>({
        filter: `club = "${club.id}" && status = "pending"`,
      }).catch(() => [])
    : [];

  // Fetch user details for members + pending requests (viewRule allows this after migration 003)
  const userIds = [...new Set([
    ...members.map(m => m.user),
    ...pendingRequests.map(r => r.user),
  ])];
  const usersById: Record<string, { name: string; username: string; email: string }> = {};
  await Promise.all(
    userIds.map(id =>
      pb.collection('users').getOne(id)
        .then(u => { usersById[id] = { name: u['name'] as string, username: u['username'] as string, email: u['email'] as string }; })
        .catch(() => {}),
    ),
  );

  const rides = await pb.collection('routes').getFullList<Route>({
    filter: `club = "${club.id}" && status != "cancelled"`,
    sort:   'date',
  }).catch(() => []);

  const accent = clubAccent(club.id);

  return (
    <div className="space-y-10">

      {/* ── Club header ────────────────────────────────────────────────── */}
      <div className="relative">
        <div
          className="absolute -top-4 right-0 w-40 h-40 rounded-full hidden sm:flex items-center justify-center overflow-hidden font-heading font-black text-5xl text-ink"
          style={{
            backgroundColor: club.avatar ? 'transparent' : accent,
            border:    '2px solid var(--ink)',
            boxShadow: '5px 5px 0px var(--ink)',
            animation: 'float 8s ease-in-out infinite',
          }}
          aria-hidden={club.avatar ? undefined : true}
        >
          {club.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl('clubs', club.id, club.avatar, '400x400')}
              alt={`${club.name} avatar`}
              className="w-full h-full object-cover"
            />
          ) : (
            getInitials(club.name)
          )}
        </div>
        <div
          aria-hidden="true"
          className="absolute top-16 right-36 w-10 h-10 rounded-xl hidden sm:block"
          style={{
            backgroundColor: 'var(--pink)',
            border:    '2px solid var(--ink)',
            boxShadow: '2px 2px 0px var(--ink)',
            transform: 'rotate(20deg)',
            animation: 'float-reverse 6s ease-in-out infinite 1s',
          }}
        />

        <div className="flex items-start justify-between gap-4 max-w-xl">
          <div>
            <h1 className="font-heading font-black text-4xl md:text-5xl text-ink tracking-tight leading-[1.1]">
              {club.name}
            </h1>
            {club.description && (
              <p className="mt-3 text-ink-soft text-base">{club.description}</p>
            )}
            <div className="mt-5 flex gap-2 flex-wrap">
              {isCaptain && <span className="badge-brand">captain</span>}
              {isMember && !isCaptain && <span className="badge-neutral">member</span>}
            </div>
          </div>

          {isCaptain && (
            <Link href={`/clubs/${slug}/settings`} className="btn-secondary text-sm shrink-0">
              ⚙ Settings
            </Link>
          )}
        </div>
      </div>

      {/* ── Non-member: join request ───────────────────────────────────── */}
      {!isMember && (
        <div className="card p-8 text-center">
          <div className="flex justify-center items-end gap-3 mb-5" aria-hidden="true">
            <div className="w-10 h-10 rounded-full" style={{ backgroundColor: accent, border: '2px solid var(--ink)', boxShadow: '3px 3px 0px var(--ink)' }} />
            <div className="w-12 h-12 rounded-xl" style={{ backgroundColor: 'var(--pink)', border: '2px solid var(--ink)', boxShadow: '3px 3px 0px var(--ink)', transform: 'rotate(12deg)' }} />
            <div className="w-8 h-8 rounded-full" style={{ backgroundColor: 'var(--mint)', border: '2px solid var(--ink)', boxShadow: '2px 2px 0px var(--ink)' }} />
          </div>
          <p className="font-heading font-bold text-xl text-ink">
            Want to ride with {club.name}?
          </p>
          <p className="text-ink-soft text-sm mt-2 mb-6">
            {myRequest
              ? 'Your request is pending — the captain will review it shortly.'
              : 'Send a join request to the captain.'}
          </p>
          {!myRequest && <JoinRequestForm clubId={club.id} slug={slug} />}
          {myRequest  && <span className="badge-neutral">Request pending…</span>}
        </div>
      )}

      {/* ── Captain: pending join requests ────────────────────────────── */}
      {isCaptain && pendingRequests.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <p className="eyebrow">Join requests</p>
            <span
              className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center"
              style={{ backgroundColor: 'var(--pink)', border: '2px solid var(--ink)', boxShadow: '2px 2px 0px var(--ink)' }}
            >
              {pendingRequests.length}
            </span>
          </div>
          <div className="card overflow-hidden">
            {pendingRequests.map((req, index) => (
              <div
                key={req.id}
                className="flex items-center justify-between px-6 py-5 gap-4"
                style={index !== 0 ? { borderTop: '2px solid var(--line)' } : undefined}
              >
                <div>
                  <p className="font-bold text-ink">{usersById[req.user]?.name || usersById[req.user]?.username}</p>
                  <p className="text-xs text-ink-soft mt-0.5">{usersById[req.user]?.email}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <form action={approveJoinRequest}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="hidden" name="clubId"    value={club.id} />
                    <input type="hidden" name="slug"      value={slug} />
                    <button type="submit" className="btn-primary text-xs px-4 py-2">Approve</button>
                  </form>
                  <form action={rejectJoinRequest}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="hidden" name="clubId"    value={club.id} />
                    <input type="hidden" name="slug"      value={slug} />
                    <button type="submit" className="btn-secondary text-xs px-4 py-2">Decline</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Upcoming rides ─────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <p className="eyebrow">Upcoming rides</p>
            {rides.length > 0 && (
              <span
                className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--amber)',
                  border:    '2px solid var(--ink)',
                  boxShadow: '2px 2px 0px var(--ink)',
                  color:     'var(--ink)',
                }}
              >
                {rides.length}
              </span>
            )}
          </div>
          {isCaptain && (
            <Link href={`/clubs/${slug}/rides/new`} className="btn-primary text-sm">
              + Plan a ride
            </Link>
          )}
        </div>

        {rides.length === 0 ? (
          <div className="card p-10 text-center">
            <div className="flex justify-center mb-5" aria-hidden="true">
              <div className="relative">
                <div className="w-20 h-20 rounded-full" style={{ backgroundColor: 'var(--amber)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0px var(--ink)' }} />
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full" style={{ backgroundColor: 'var(--pink)', border: '2px solid var(--ink)' }} />
              </div>
            </div>
            <p className="font-heading font-bold text-lg text-ink">No rides planned yet.</p>
            {isCaptain && (
              <p className="text-ink-soft text-sm mt-1.5">
                Hit <span className="font-bold text-accent">+ Plan a ride</span> to get one on the calendar!
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {rides.map((ride, i) => (
              <Link
                key={ride.id}
                href={`/clubs/${slug}/rides/${ride.id}`}
                className="card p-5 flex items-center gap-5 card-link"
                style={{ textDecoration: 'none' }}
              >
                {/* Color dot */}
                <div
                  className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center font-heading font-black text-lg"
                  style={{
                    backgroundColor: PALETTE[i % PALETTE.length],
                    border:    '2px solid var(--ink)',
                    boxShadow: '3px 3px 0px var(--ink)',
                    color:     'var(--ink)',
                  }}
                  aria-hidden="true"
                >
                  🚴
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-heading font-black text-ink text-base leading-snug truncate">
                    {ride.name}
                  </p>
                  <p className="text-ink-soft text-sm mt-0.5">
                    {formatDate(ride.date)} · {formatTime(ride.date)} · {ride.distance_km} km · {ride.elevation_m} m ↑
                  </p>
                </div>

                <span
                  className="badge-neutral shrink-0 capitalize"
                  style={ride.status === 'confirmed' ? {
                    backgroundColor: 'color-mix(in srgb, var(--mint), white 80%)',
                    borderColor:     'var(--mint)',
                    color:           'color-mix(in srgb, var(--mint), black 40%)',
                  } : undefined}
                >
                  {ride.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Members ────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <p className="eyebrow">Members</p>
          <span
            className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center"
            style={{ backgroundColor: 'var(--mint)', border: '2px solid var(--ink)', boxShadow: '2px 2px 0px var(--ink)', color: 'var(--ink)' }}
          >
            {members.length}
          </span>
        </div>
        <div className="card overflow-hidden">
          {members.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-6 py-4 gap-4"
              style={i !== 0 ? { borderTop: '2px solid var(--line)' } : undefined}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                  style={{
                    backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                    border:    '2px solid var(--ink)',
                    boxShadow: '2px 2px 0px var(--ink)',
                    color:     'var(--ink)',
                  }}
                >
                  {getInitials(usersById[m.user]?.name || usersById[m.user]?.username || '?')}
                </div>
                <div>
                  <p className="font-bold text-sm text-ink">{usersById[m.user]?.name || usersById[m.user]?.username}</p>
                  <p className="text-xs text-ink-soft mt-0.5">{usersById[m.user]?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {m.role === 'captain'
                  ? <span className="badge-brand">captain</span>
                  : <span className="badge-neutral">member</span>
                }
                {isCaptain && m.role !== 'captain' && m.user !== user.id && (
                  <form action={promoteToCaptain}>
                    <input type="hidden" name="memberId" value={m.id} />
                    <input type="hidden" name="clubId"   value={club.id} />
                    <input type="hidden" name="slug"     value={slug} />
                    <button type="submit" className="btn-secondary text-xs px-3 py-1.5">
                      Make captain
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
