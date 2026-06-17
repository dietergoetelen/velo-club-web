import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { castVote, removeBucketOption, closeBucketNow } from '@/lib/actions/buckets';
import { RoutePreview } from '@/components/route-preview';
import { AddRouteToBucket } from './add-route-to-bucket';
import { PickWinnerButton } from './pick-winner-button';
import type { BucketOption, BucketVote, Club, ClubMember, PersonalRoute, RouteBucket } from '@/lib/types';

const PALETTE = ['#FBBF24', '#F472B6', '#34D399', '#8B5CF6'] as const;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('nl-BE', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

interface OptionView {
  id:        string;
  route:     PersonalRoute | null;
  addedBy:   string;
  votes:     number;
  isMine:    boolean;     // current user voted for this
}

export default async function BucketPage({
  params,
}: {
  params: Promise<{ slug: string; bucketId: string }>;
}) {
  const { slug, bucketId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const t  = await getTranslations('buckets');
  const pb = await getAuthenticatedPB();

  const club = await pb.collection('clubs').getFirstListItem<Club>(`slug = "${slug}"`).catch(() => null);
  if (!club) notFound();

  const bucket = await pb.collection('route_buckets').getOne<RouteBucket>(bucketId).catch(() => null);
  if (!bucket || bucket.club !== club!.id) notFound();

  const myMembership = await pb.collection('club_members')
    .getFirstListItem<ClubMember>(`club = "${club!.id}" && user = "${user.id}"`)
    .catch(() => null);
  const isMember  = !!myMembership;
  const isCaptain = myMembership?.role === 'captain';

  const [options, votes] = await Promise.all([
    pb.collection('bucket_options').getFullList<BucketOption>({ filter: `bucket = "${bucketId}"`, sort: 'created' }).catch(() => [] as BucketOption[]),
    pb.collection('bucket_votes').getFullList<BucketVote>({ filter: `bucket = "${bucketId}"` }).catch(() => [] as BucketVote[]),
  ]);

  const voteCounts = new Map<string, number>();
  for (const v of votes) voteCounts.set(v.option, (voteCounts.get(v.option) ?? 0) + 1);
  const myVote = votes.find(v => v.user === user.id)?.option ?? null;

  const views: OptionView[] = await Promise.all(options.map(async o => ({
    id:      o.id,
    route:   await pb.collection('personal_routes').getOne<PersonalRoute>(o.route).catch(() => null),
    addedBy: o.added_by,
    votes:   voteCounts.get(o.id) ?? 0,
    isMine:  myVote === o.id,
  })));
  // Sort by name (stable) — deliberately NOT by vote count, so casting a vote
  // never reshuffles the cards under the user.
  views.sort((a, b) =>
    (a.route?.name ?? '').localeCompare(b.route?.name ?? '', 'nl-BE', { sensitivity: 'base' }),
  );

  const isOpen     = bucket.status === 'open';
  const totalVotes = votes.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href={`/clubs/${slug}`} className="eyebrow mb-3 inline-flex items-center gap-1.5 hover:text-accent transition-colors">
          ← {club!.name}
        </Link>
        <h1 className="font-heading font-black text-3xl text-ink tracking-tight leading-tight">{t('title')}</h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-sm">
          <span className="text-ink-soft">{t('rideOn', { when: formatDateTime(bucket.ride_date) })}</span>
          {isOpen ? (
            <span className="font-black text-ink">{t('closesAt', { when: formatDateTime(bucket.closes_at) })}</span>
          ) : (
            <span className="badge-neutral">{t('closedBadge')}</span>
          )}
        </div>
      </div>

      {/* Resolved winner banner */}
      {!isOpen && bucket.winning_route && bucket.created_ride && (
        <div className="card p-5">
          <p className="eyebrow mb-1">{t('winnerHeading')}</p>
          <Link href={`/clubs/${slug}/rides/${bucket.created_ride}`} className="font-heading font-black text-ink text-lg hover:text-accent transition-colors">
            {views.find(v => v.route?.id === bucket.winning_route)?.route?.name ?? t('winnerFallback')} →
          </Link>
        </div>
      )}
      {!isOpen && !bucket.winning_route && (
        <div className="card p-5">
          <p className="text-ink-soft text-sm">{isCaptain ? t('tieCaptain') : t('tieMember')}</p>
        </div>
      )}

      {/* Add a candidate */}
      {isOpen && isMember && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">{t('addHint')}</p>
          <AddRouteToBucket clubId={club!.id} bucketId={bucketId} slug={slug} />
        </div>
      )}

      {/* Options */}
      {views.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-ink-soft text-sm">{t('noOptions')}</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {views.map((o, i) => {
            const accent = PALETTE[i % PALETTE.length];
            const canDecide = isCaptain && (isOpen || !bucket.winning_route);
            return (
              <li key={o.id} className="card overflow-hidden">
                {o.route && (
                  <div className="rounded-t-[inherit] overflow-hidden" style={{ borderBottom: '2px solid var(--line)' }}>
                    <RoutePreview coordinates={o.route.coordinates} accent={accent} className="w-full h-auto block" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-heading font-black text-ink text-lg leading-tight">
                        {o.route?.name ?? t('routeGone')}
                      </p>
                      {o.route && (
                        <p className="text-sm text-ink-soft tabular-nums mt-0.5">
                          {o.route.distance_km} km · {o.route.elevation_m} m ↑
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-heading font-black text-ink text-2xl tabular-nums leading-none">{o.votes}</p>
                      <p className="text-[10px] font-black text-ink-soft uppercase tracking-wide">{t('votesLabel')}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    {isOpen && isMember && (
                      <form action={castVote}>
                        <input type="hidden" name="bucketId" value={bucketId} />
                        <input type="hidden" name="optionId" value={o.id} />
                        <input type="hidden" name="slug"     value={slug} />
                        <button type="submit" className={o.isMine ? 'btn-secondary text-sm' : 'btn-primary text-sm'}>
                          {o.isMine ? t('voted') : t('vote')}
                        </button>
                      </form>
                    )}

                    {canDecide && o.route && (
                      <PickWinnerButton
                        bucketId={bucketId}
                        routeId={o.route.id}
                        slug={slug}
                        routeName={o.route.name}
                      />
                    )}

                    {isOpen && (o.addedBy === user.id || isCaptain) && (
                      <form action={removeBucketOption} className="ml-auto">
                        <input type="hidden" name="optionId" value={o.id} />
                        <input type="hidden" name="bucketId" value={bucketId} />
                        <input type="hidden" name="slug"     value={slug} />
                        <button type="submit" className="text-xs font-bold text-ink-soft hover:text-accent transition-colors px-2 py-1">
                          {t('remove')}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Captain: close now */}
      {isOpen && isCaptain && views.length > 0 && (
        <form action={closeBucketNow}>
          <input type="hidden" name="bucketId" value={bucketId} />
          <input type="hidden" name="slug"     value={slug} />
          <button type="submit" className="btn-primary w-full">{t('closeNow')}</button>
          <p className="text-xs text-ink-soft mt-2 text-center">{t('closeNowHint', { count: totalVotes })}</p>
        </form>
      )}
    </div>
  );
}
