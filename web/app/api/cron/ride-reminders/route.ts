import { getAdminPocketBase } from '@/lib/pocketbase';
import { sendDueRideReminders } from '@/lib/reminders';

/**
 * Reminder tick. Shared-secret gated (only the PB cron knows CRON_SECRET) and
 * idempotent at the reminder_log layer, so an accidental extra call is
 * harmless. Returns the per-stage send breakdown for observability.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('x-cron-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const pb      = await getAdminPocketBase();
    const summary = await sendDueRideReminders(pb);
    return Response.json({ ok: true, ...summary });
  } catch (err) {
    console.error('[cron/ride-reminders]', err);
    return new Response('Internal Error', { status: 500 });
  }
}
