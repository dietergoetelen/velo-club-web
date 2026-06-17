'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { getToken, getCurrentUser } from '@/lib/session';
import { getPBWithToken } from '@/lib/pocketbase';
import { sendPushToUsers } from '@/lib/push';
import { resolveBucket } from '@/lib/buckets';
import type { BucketOption, BucketVote, Club, ClubMember, RouteBucket } from '@/lib/types';

// ── helpers ──────────────────────────────────────────────────────────────────

async function authed() {
  const token = await getToken();
  const user  = await getCurrentUser();
  if (!token || !user) redirect('/login');
  return { pb: getPBWithToken(token!), user: user! };
}

async function isMember(pb: ReturnType<typeof getPBWithToken>, clubId: string, userId: string) {
  return pb.collection('club_members')
    .getFirstListItem<ClubMember>(`club = "${clubId}" && user = "${userId}"`)
    .catch(() => null);
}

function bucketPath(slug: string, id: string) {
  return `/clubs/${slug}/buckets/${id}`;
}

// ── create (captain) ───────────────────────────────────────────────────────────

export async function createBucket(_prev: string | null, form: FormData): Promise<string | null> {
  const clubId     = form.get('clubId')     as string;
  const slug       = form.get('slug')       as string;
  const rideDate   = form.get('rideDate')   as string;
  const rideTime   = form.get('rideTime')   as string;
  const closesDate = form.get('closesDate') as string;
  const closesTime = form.get('closesTime') as string;

  const t = await getTranslations('errors');
  if (!rideDate || !rideTime)     return t('bucketRideDateRequired');
  if (!closesDate || !closesTime) return t('bucketClosesRequired');

  const rideAt   = `${rideDate} ${rideTime}:00.000Z`;
  const closesAt = `${closesDate} ${closesTime}:00.000Z`;
  if (new Date(closesAt).getTime() >= new Date(rideAt).getTime()) {
    return t('bucketClosesBeforeRide');
  }

  const { pb, user } = await authed();
  const captain = await pb.collection('club_members')
    .getFirstListItem(`club = "${clubId}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  if (!captain) return t('captainOnlyBucket');

  let bucketId: string;
  try {
    const created = await pb.collection('route_buckets').create<RouteBucket>({
      club:          clubId,
      ride_date:     rideAt,
      closes_at:     closesAt,
      status:        'open',
      created_by:    user.id,
      winning_route: '',
      created_ride:  '',
    });
    bucketId = created.id;
  } catch (err) {
    console.error('[createBucket]', err);
    return t('bucketCreateFailed');
  }

  // Invite the club to vote.
  try {
    const members = await pb.collection('club_members')
      .getFullList<ClubMember>({ filter: `club = "${clubId}" && user != "${user.id}"` })
      .catch(() => []);
    const memberIds = members.map(m => m.user);
    if (memberIds.length > 0) {
      const club  = await pb.collection('clubs').getOne<Club>(clubId).catch(() => null);
      const tPush = await getTranslations('push');
      await sendPushToUsers(memberIds, {
        title: club?.name ?? 'Zoesh',
        body:  tPush('bucketOpenBody'),
        url:   bucketPath(slug, bucketId),
        tag:   `bucket-${bucketId}`,
      });
    }
  } catch (err) {
    console.error('[createBucket] push failed', err);
  }

  redirect(bucketPath(slug, bucketId));
}

// ── add candidate route (any member) ────────────────────────────────────────────

export async function addBucketOption(form: FormData): Promise<void> {
  const bucketId = form.get('bucketId') as string;
  const slug     = form.get('slug')     as string;
  const routeId  = form.get('routeId')  as string;

  const { pb, user } = await authed();
  const bucket = await pb.collection('route_buckets').getOne<RouteBucket>(bucketId).catch(() => null);
  if (!bucket || bucket.status !== 'open') redirect(`/clubs/${slug}`);
  if (!(await isMember(pb, bucket!.club, user.id))) redirect(`/clubs/${slug}`);

  await pb.collection('bucket_options')
    .create({ bucket: bucketId, route: routeId, added_by: user.id })
    .catch(() => null);  // unique (bucket, route) makes a duplicate add a no-op

  revalidatePath(bucketPath(slug, bucketId));
}

export async function removeBucketOption(form: FormData): Promise<void> {
  const optionId = form.get('optionId') as string;
  const bucketId = form.get('bucketId') as string;
  const slug     = form.get('slug')     as string;

  const { pb, user } = await authed();
  const bucket = await pb.collection('route_buckets').getOne<RouteBucket>(bucketId).catch(() => null);
  if (!bucket || bucket.status !== 'open') redirect(bucketPath(slug, bucketId));

  const option = await pb.collection('bucket_options').getOne<BucketOption>(optionId).catch(() => null);
  if (!option) redirect(bucketPath(slug, bucketId));

  // The person who added it, or the captain, may remove it.
  const captain = await pb.collection('club_members')
    .getFirstListItem(`club = "${bucket!.club}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  if (option!.added_by !== user.id && !captain) redirect(bucketPath(slug, bucketId));

  // Drop the option and any votes pointing at it.
  const votes = await pb.collection('bucket_votes')
    .getFullList<BucketVote>({ filter: `option = "${optionId}"` }).catch(() => []);
  await Promise.all(votes.map(v => pb.collection('bucket_votes').delete(v.id).catch(() => null)));
  await pb.collection('bucket_options').delete(optionId).catch(() => null);

  revalidatePath(bucketPath(slug, bucketId));
}

// ── vote (any member, one each) ─────────────────────────────────────────────────

export async function castVote(form: FormData): Promise<void> {
  const bucketId = form.get('bucketId') as string;
  const optionId = form.get('optionId') as string;
  const slug     = form.get('slug')     as string;

  const { pb, user } = await authed();
  const bucket = await pb.collection('route_buckets').getOne<RouteBucket>(bucketId).catch(() => null);
  if (!bucket || bucket.status !== 'open') redirect(bucketPath(slug, bucketId));
  if (!(await isMember(pb, bucket!.club, user.id))) redirect(`/clubs/${slug}`);

  const option = await pb.collection('bucket_options').getOne<BucketOption>(optionId).catch(() => null);
  if (!option || option.bucket !== bucketId) redirect(bucketPath(slug, bucketId));

  // One vote per member — move it if they already voted.
  const existing = await pb.collection('bucket_votes')
    .getFirstListItem<BucketVote>(`bucket = "${bucketId}" && user = "${user.id}"`)
    .catch(() => null);
  if (existing) {
    await pb.collection('bucket_votes').update(existing.id, { option: optionId }).catch(() => null);
  } else {
    await pb.collection('bucket_votes').create({ bucket: bucketId, option: optionId, user: user.id }).catch(() => null);
  }

  revalidatePath(bucketPath(slug, bucketId));
}

// ── close / decide (captain) ─────────────────────────────────────────────────────

export async function closeBucketNow(form: FormData): Promise<void> {
  const bucketId = form.get('bucketId') as string;
  const slug     = form.get('slug')     as string;
  await captainResolve(bucketId, slug);
}

export async function pickWinner(form: FormData): Promise<void> {
  const bucketId = form.get('bucketId') as string;
  const slug     = form.get('slug')     as string;
  const routeId  = form.get('routeId')  as string;
  await captainResolve(bucketId, slug, routeId);
}

async function captainResolve(bucketId: string, slug: string, forcedRoute?: string): Promise<void> {
  const { pb, user } = await authed();
  const bucket = await pb.collection('route_buckets').getOne<RouteBucket>(bucketId).catch(() => null);
  if (!bucket) redirect(`/clubs/${slug}`);

  const captain = await pb.collection('club_members')
    .getFirstListItem(`club = "${bucket!.club}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  if (!captain) redirect(bucketPath(slug, bucketId));

  const { rideId } = await resolveBucket(pb, bucket!, forcedRoute);

  revalidatePath(bucketPath(slug, bucketId));
  revalidatePath(`/clubs/${slug}`);
  if (rideId) redirect(`/clubs/${slug}/rides/${rideId}`);
  redirect(bucketPath(slug, bucketId));
}
