import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser, getMemberships, getAuthenticatedPB } from '@/lib/session';
import { fileUrl } from '@/lib/pocketbase';
import { JoinRequestForm } from '@/app/(app)/clubs/[slug]/join-request-form';
import { markdownToPreview } from '@/lib/markdown';
import { PersonalRouteCard } from '@/components/personal-route-card';
import { PushNotificationsToggle } from '@/components/push-notifications-toggle';
import { ClubCard } from '@/components/club-card';
import { getNextRideForClub, type NextRide } from '@/lib/next-ride';
import type { Club, ClubMember, JoinRequest, PersonalRoute } from '@/lib/types';

function greetingKey(): 'greetingMorning' | 'greetingAfternoon' | 'greetingEvening' {
  const h = new Date().getHours();
  if (h < 12) return 'greetingMorning';
  if (h < 18) return 'greetingAfternoon';
  return 'greetingEvening';
}

/* Cycles through our four palette colors for club accent dots */
const ACCENT_COLORS = ['#FBBF24', '#F472B6', '#34D399', '#8B5CF6'] as const;

function getInitials(nameOrEmail: string) {
  return (nameOrEmail || '?')
    .split(/[\s@.]+/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('');
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const t = await getTranslations('dashboard');

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

  const myRoutes = await pb.collection('personal_routes')
    .getFullList<PersonalRoute>({
      filter: `user = "${user.id}"`,
      sort:   '-created',
    })
    .catch(() => []);

  const tRoutes = await getTranslations('routes.dashboard');

  // Soonest upcoming ride per club, keyed by club id (null when nothing's
  // coming up). Folded into each club card rather than its own section.
  const nextByClub = new Map<string, NextRide | null>(
    await Promise.all(
      myClubs.map(async club =>
        [club.id, await getNextRideForClub(pb, club.id, user.id)] as const,
      ),
    ),
  );

  const firstName = user.name?.split(' ')[0] || user.email.split('@')[0];

  return (
    <div className="space-y-16">

      {/* ── Hero greeting ─────────────────────────────────────────────── */}
      <div className="relative pt-4 pb-6">

        {/* Floating confetti shapes */}
        <div
          aria-hidden="true"
          className="absolute -top-2 right-0 w-44 h-44 rounded-full hidden sm:block"
          style={{
            backgroundColor: 'var(--amber)',
            border: '2px solid var(--ink)',
            boxShadow: '5px 5px 0px var(--ink)',
            animation: 'float 7s ease-in-out infinite',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute top-10 right-44 w-12 h-12 rounded-xl hidden sm:block"
          style={{
            backgroundColor: 'var(--pink)',
            border: '2px solid var(--ink)',
            boxShadow: '3px 3px 0px var(--ink)',
            transform: 'rotate(15deg)',
            animation: 'float-reverse 5s ease-in-out infinite 0.8s',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-2 right-28 w-8 h-8 rounded-full hidden sm:block"
          style={{
            backgroundColor: 'var(--mint)',
            border: '2px solid var(--ink)',
            animation: 'float 9s ease-in-out infinite 1.5s',
          }}
        />

        {/* Greeting text */}
        <div className="max-w-lg">
          <p className="eyebrow mb-3">{t(greetingKey())}</p>
          <h1 className="font-heading font-black text-5xl md:text-6xl text-ink tracking-tight leading-[1.05]">
            {firstName}<span className="text-accent">.</span>
          </h1>
          <p className="mt-4 text-ink-soft text-lg">
            {myClubs.length === 0
              ? t('introNoClubs')
              : t('introWithClubs', { count: myClubs.length })}
          </p>
        </div>
      </div>

      {/* ── Push notifications opt-in (vanishes once enabled — managed
            from the profile page from then on) ──────────────────────────── */}
      <PushNotificationsToggle hideWhenSubscribed />

      {/* ── My clubs (each tile carries the club's next ride + RSVP) ───── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <p className="eyebrow">{t('myClubsHeading')}</p>
            <span
              className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center"
              style={{
                backgroundColor: 'var(--accent)',
                border: '2px solid var(--ink)',
                boxShadow: '2px 2px 0px var(--ink)',
              }}
            >
              {myClubs.length}
            </span>
          </div>
          <Link href="/clubs/new" className="btn-primary">
            {t('newClub')}
          </Link>
        </div>

        {myClubs.length === 0 ? (
          <div className="card p-12 text-center">
            {/* Empty state shapes */}
            <div className="flex justify-center items-end gap-3 mb-6" aria-hidden="true">
              <div
                className="w-12 h-12 rounded-full"
                style={{ backgroundColor: 'var(--amber)', border: '2px solid var(--ink)', boxShadow: '3px 3px 0px var(--ink)' }}
              />
              <div
                className="w-14 h-14 rounded-xl"
                style={{ backgroundColor: 'var(--pink)', border: '2px solid var(--ink)', boxShadow: '3px 3px 0px var(--ink)', transform: 'rotate(10deg)' }}
              />
              <div
                className="w-10 h-10 rounded-full"
                style={{ backgroundColor: 'var(--mint)', border: '2px solid var(--ink)', boxShadow: '3px 3px 0px var(--ink)' }}
              />
            </div>
            <p className="font-heading font-bold text-xl text-ink">{t('noClubsTitle')}</p>
            <p className="text-ink-soft text-sm mt-1.5">{t('noClubsHint')}</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {myClubs.map((club, i) => (
              <ClubCard
                key={club.id}
                club={club}
                role={roleFor(club.id)}
                index={i}
                next={nextByClub.get(club.id) ?? null}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── My routes (personal, not tied to a club) ───────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <p className="eyebrow">{tRoutes('heading')}</p>
            <span
              className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center"
              style={{
                backgroundColor: 'var(--mint)',
                border:    '2px solid var(--ink)',
                boxShadow: '2px 2px 0px var(--ink)',
              }}
            >
              {myRoutes.length}
            </span>
          </div>
          <Link href="/routes/new" className="btn-primary">
            {tRoutes('newRoute')}
          </Link>
        </div>

        {myRoutes.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-ink-soft text-sm">{tRoutes('empty')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {myRoutes.map((route, i) => (
              <PersonalRouteCard key={route.id} route={route} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ── Discover clubs ────────────────────────────────────────────── */}
      {otherClubs.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <p className="eyebrow">{t('discoverHeading')}</p>
            <span
              className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center"
              style={{
                backgroundColor: 'var(--pink)',
                border: '2px solid var(--ink)',
                boxShadow: '2px 2px 0px var(--ink)',
              }}
            >
              {otherClubs.length}
            </span>
          </div>

          <div className="card overflow-hidden">
            {otherClubs.map((club, index) => {
              const isPending = pendingClubIds.has(club.id);
              const accent    = ACCENT_COLORS[index % ACCENT_COLORS.length];
              return (
                // Stacks on mobile so long club names never fight the join
                // button for one row; side by side again from sm up.
                <div
                  key={club.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 sm:px-6 py-4 sm:py-5"
                  style={index !== 0 ? { borderTop: '2px solid var(--line)' } : undefined}
                >
                  <Link
                    href={`/clubs/${club.slug}`}
                    className="flex items-center gap-3.5 min-w-0 flex-1 group"
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center font-black text-sm overflow-hidden shrink-0"
                      style={{
                        backgroundColor: club.avatar ? '#ffffff' : accent,
                        border:    '2px solid var(--ink)',
                        boxShadow: '2px 2px 0px var(--ink)',
                        color:     'var(--ink)',
                      }}
                    >
                      {club.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={fileUrl('clubs', club.id, club.avatar, '100x100')}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(club.name)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-ink truncate group-hover:text-accent transition-colors duration-200">
                        {club.name}
                      </p>
                      {club.description && (
                        <p className="text-sm text-ink-soft mt-0.5 truncate">{markdownToPreview(club.description)}</p>
                      )}
                    </div>
                  </Link>
                  <div className="shrink-0 self-start sm:self-auto">
                    {isPending
                      ? <span className="badge-neutral">{t('pendingBadge')}</span>
                      : <JoinRequestForm clubId={club.id} slug={club.slug} small />
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}
