import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { fileUrl } from '@/lib/pocketbase';
import { approveJoinRequest, rejectJoinRequest, promoteToCaptain } from '@/lib/actions/clubs';
import { JoinRequestForm } from './join-request-form';
import { type StackedUser } from '@/components/avatar-stack';
import { ClubIntro } from '@/components/club-intro';
import { RideCard } from '@/components/ride-card';
import { startOfTodayIso } from '@/lib/dates';
import { compareSchedules } from '@/lib/schedules';
import type { Attendance, Club, ClubMember, ClubSchedule, JoinRequest, ReactionEmoji, RideReaction, Route } from '@/lib/types';
import { REACTION_EMOJIS } from '@/lib/types';

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

export default async function ClubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user      = await getCurrentUser();
  if (!user) redirect('/login');

  const tDetail  = await getTranslations('clubs.detail');
  const tMembers = await getTranslations('clubs.members');

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

  // Upcoming = anything on or after today's Brussels midnight, so a ride
  // that started this morning stays here all day and only flips to "past"
  // at midnight. Past rides live on a separate page; we just need a count.
  // `requestKey: null` opts out of the PB JS SDK's auto-cancellation —
  // without it the two parallel routes queries cancel each other.
  const cutoff = startOfTodayIso();
  const [rides, pastList] = await Promise.all([
    pb.collection('routes').getFullList<Route>({
      filter:     `club = "${club.id}" && status != "cancelled" && date >= "${cutoff}"`,
      sort:       'date',
      requestKey: null,
    }).catch(() => []),
    pb.collection('routes').getList(1, 1, {
      filter:     `club = "${club.id}" && status != "cancelled" && date < "${cutoff}"`,
      requestKey: null,
    }).catch(() => null),
  ]);
  const pastCount = pastList?.totalItems ?? 0;

  const rideIdFilter = rides.length > 0
    ? rides.map(r => `route = "${r.id}"`).join(' || ')
    : '';

  const [attendances, reactions] = rides.length > 0
    ? await Promise.all([
        pb.collection('attendances').getFullList<Attendance>({
          filter:     rideIdFilter,
          requestKey: null,
        }).catch(() => []),
        pb.collection('ride_reactions').getFullList<RideReaction>({
          filter:     rideIdFilter,
          requestKey: null,
        }).catch(() => []),
      ])
    : [[], []] as [Attendance[], RideReaction[]];

  // Fetch user details for members + pending requests + attendees
  const userIds = [...new Set([
    ...members.map(m => m.user),
    ...pendingRequests.map(r => r.user),
    ...attendances.map(a => a.user),
  ])];
  const usersById: Record<string, { name: string; username: string; email: string; avatar: string }> = {};
  await Promise.all(
    userIds.map(id =>
      pb.collection('users').getOne(id)
        .then(u => {
          usersById[id] = {
            name:     u['name']     as string,
            username: u['username'] as string,
            email:    u['email']    as string,
            avatar:   (u['avatar']  as string) ?? '',
          };
        })
        .catch(() => {}),
    ),
  );

  const attendeesByRide = new Map<string, StackedUser[]>();
  for (const a of attendances) {
    const u = usersById[a.user];
    if (!u) continue;
    const list = attendeesByRide.get(a.route) ?? [];
    list.push({
      id:     a.user,
      name:   u.name || u.username || u.email,
      avatar: u.avatar,
    });
    attendeesByRide.set(a.route, list);
  }

  function emptyReactionCounts(): Record<ReactionEmoji, number> {
    return REACTION_EMOJIS.reduce((acc, e) => { acc[e] = 0; return acc; }, {} as Record<ReactionEmoji, number>);
  }
  const reactionCountsByRide = new Map<string, Record<ReactionEmoji, number>>();
  const myReactionByRide     = new Map<string, ReactionEmoji>();
  for (const r of reactions) {
    if (!(REACTION_EMOJIS as readonly string[]).includes(r.emoji)) continue;
    const counts = reactionCountsByRide.get(r.route) ?? emptyReactionCounts();
    counts[r.emoji] += 1;
    reactionCountsByRide.set(r.route, counts);
    if (r.user === user.id) myReactionByRide.set(r.route, r.emoji);
  }


  const schedules = club.schedules_enabled
    ? (await pb.collection('club_schedules').getFullList<ClubSchedule>({
        filter: `club = "${club.id}"`,
      }).catch(() => [])).sort(compareSchedules)
    : [];

  const accent        = clubAccent(club.id);
  const scheduleById  = new Map(schedules.map(s => [s.id, s]));

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
              alt={tDetail('avatarAlt', { name: club.name })}
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

        <div className="flex items-center justify-between gap-4 max-w-xl">
          <h1 className="font-heading font-black text-4xl md:text-5xl text-ink tracking-tight leading-[1.1]">
            {club.name}
          </h1>

          {isCaptain && (
            <Link href={`/clubs/${slug}/settings`} className="btn-secondary text-sm shrink-0">
              {tDetail('settingsLink')}
            </Link>
          )}
          {isMember && !isCaptain && (
            <span className="badge-neutral shrink-0">{tDetail('memberBadge')}</span>
          )}
        </div>

        {club.description && club.description.trim() && (
          <div className="mt-6 max-w-2xl">
            <ClubIntro markdown={club.description} />
          </div>
        )}
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
            {tDetail('joinTitle', { name: club.name })}
          </p>
          <p className="text-ink-soft text-sm mt-2 mb-6">
            {myRequest
              ? tDetail('joinSubtitlePending')
              : tDetail('joinSubtitle')}
          </p>
          {!myRequest && <JoinRequestForm clubId={club.id} slug={slug} />}
          {myRequest  && <span className="badge-neutral">{tDetail('joinPendingBadge')}</span>}
        </div>
      )}

      {/* ── Captain: pending join requests ────────────────────────────── */}
      {isCaptain && pendingRequests.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <p className="eyebrow">{tDetail('joinRequestsHeading')}</p>
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
                    <button type="submit" className="btn-primary text-xs px-4 py-2">{tDetail('approve')}</button>
                  </form>
                  <form action={rejectJoinRequest}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="hidden" name="clubId"    value={club.id} />
                    <input type="hidden" name="slug"      value={slug} />
                    <button type="submit" className="btn-secondary text-xs px-4 py-2">{tDetail('decline')}</button>
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
            <p className="eyebrow">{tDetail('upcomingRides')}</p>
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
              {tDetail('planRide')}
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
            <p className="font-heading font-bold text-lg text-ink">{tDetail('noRidesTitle')}</p>
            {isCaptain && (
              <p className="text-ink-soft text-sm mt-1.5">
                {tDetail.rich('noRidesHint', {
                  link: (chunks) => <span className="font-bold text-accent">{chunks}</span>,
                })}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {rides.map((ride, i) => (
              <RideCard
                key={ride.id}
                ride={ride}
                slug={slug}
                index={i}
                scheduleLabel={scheduleById.get(ride.schedule)?.label.trim()}
                attendees={attendeesByRide.get(ride.id) ?? []}
                reactionCounts={reactionCountsByRide.get(ride.id) ?? emptyReactionCounts()}
                currentUserReaction={myReactionByRide.get(ride.id) ?? null}
                canReact={isMember}
              />
            ))}
          </div>
        )}

        {pastCount > 0 && (
          <div className="mt-6 text-center">
            <Link
              href={`/clubs/${slug}/rides/past`}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft hover:text-accent transition-colors"
            >
              {tDetail('viewPastRides', { count: pastCount })}
            </Link>
          </div>
        )}
      </section>

      {/* ── Members ────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <p className="eyebrow">{tMembers('heading')}</p>
          <span
            className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center"
            style={{ backgroundColor: 'var(--mint)', border: '2px solid var(--ink)', boxShadow: '2px 2px 0px var(--ink)', color: 'var(--ink)' }}
          >
            {members.length}
          </span>
        </div>
        <div className="card p-6">
          <ul className="flex flex-wrap gap-5">
            {members.map((m, i) => {
              const u             = usersById[m.user];
              const displayName   = u?.name || u?.username || u?.email || tMembers('fallbackName');
              const isThisCaptain = m.role === 'captain';
              const canPromote    = isCaptain && !isThisCaptain && m.user !== user.id;

              return (
                <li key={m.id} className="flex flex-col items-center gap-2 w-28">
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black overflow-hidden shrink-0"
                      style={{
                        backgroundColor: u?.avatar ? '#fff' : AVATAR_COLORS[i % AVATAR_COLORS.length],
                        border:    '2px solid var(--ink)',
                        boxShadow: isThisCaptain
                          ? '3px 3px 0px var(--amber), 5px 5px 0px var(--ink)'
                          : '2px 2px 0px var(--ink)',
                        color:     'var(--ink)',
                      }}
                    >
                      {u?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fileUrl('users', m.user, u.avatar, '100x100')}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(displayName)
                      )}
                    </div>

                    {isThisCaptain && (
                      <span
                        aria-label={tMembers('captainAria')}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black pointer-events-none"
                        style={{ backgroundColor: 'var(--amber)', border: '2px solid var(--ink)', color: 'var(--ink)' }}
                      >
                        ★
                      </span>
                    )}
                  </div>

                  <p
                    className="text-xs font-bold text-ink text-center leading-tight w-full truncate"
                    title={displayName}
                  >
                    {displayName}
                  </p>

                  {canPromote && (
                    <form action={promoteToCaptain} className="w-full">
                      <input type="hidden" name="memberId" value={m.id} />
                      <input type="hidden" name="clubId"   value={club.id} />
                      <input type="hidden" name="slug"     value={slug} />
                      <button
                        type="submit"
                        className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] font-black"
                        style={{ backgroundColor: 'var(--amber)', border: '2px solid var(--ink)', boxShadow: '2px 2px 0px var(--ink)', color: 'var(--ink)' }}
                      >
                        <span aria-hidden>★</span>
                        <span>{tMembers('makeCaptain')}</span>
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

    </div>
  );
}
