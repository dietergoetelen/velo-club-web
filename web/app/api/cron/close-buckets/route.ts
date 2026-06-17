import { getAdminPocketBase } from '@/lib/pocketbase';
import { resolveBucket } from '@/lib/buckets';
import type { RouteBucket } from '@/lib/types';

/**
 * Deadline tick for route buckets. Closes every open bucket past its
 * `closes_at` and spawns the winning ride (a tie just closes it, awaiting the
 * captain). Secret-gated; idempotent because resolving flips status to closed.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('x-cron-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const pb  = await getAdminPocketBase();
    // PB stores/compares datetimes with a space, not "T" — see lib/buckets.ts.
    const now = new Date().toISOString().replace('T', ' ');

    const due = await pb.collection('route_buckets').getFullList<RouteBucket>({
      filter:     `status = "open" && closes_at <= "${now}"`,
      requestKey: null,
    }).catch(() => [] as RouteBucket[]);

    const results = [];
    for (const bucket of due) {
      const { winner, rideId } = await resolveBucket(pb, bucket);
      results.push({ bucket: bucket.id, winner, ride: rideId });
    }

    return Response.json({ ok: true, closed: results.length, results });
  } catch (err) {
    console.error('[cron/close-buckets]', err);
    return new Response('Internal Error', { status: 500 });
  }
}
