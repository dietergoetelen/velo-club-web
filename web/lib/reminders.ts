import 'server-only';
import type PocketBase from 'pocketbase';
import { getTranslations } from 'next-intl/server';
import { sendPushToUsers } from './push';
import type { Attendance, Club, ClubMember, ReminderStage, Route } from './types';

/**
 * Automated ride reminders. Driven by the always-on PocketBase cron (the one
 * singleton in the stack), which POSTs to /api/cron/ride-reminders hourly;
 * this module is the brain that runs there.
 *
 * Two stages per ride, each fired at most once thanks to the `reminder_log`
 * unique (route, stage) lock:
 *
 *   t24  ~24h out  → "you in?" nudge to members who haven't RSVP'd yet
 *   t2   ~2h  out  → "ride soon" heads-up to confirmed attendees
 *
 * The hourly cadence means a ride falls inside exactly one run of each
 * window; the ±1h spread absorbs cron jitter without risking a miss.
 */

interface StageConfig {
  stage: ReminderStage;
  fromH: number;  // window start, hours from now
  toH:   number;  // window end,   hours from now
}

const STAGES: StageConfig[] = [
  { stage: 't24', fromH: 23, toH: 25 },
  { stage: 't2',  fromH: 1,  toH: 3  },
];

// Reminders only make sense for rides that are still going to happen.
const ACTIVE_STATUS = `status != "cancelled" && status != "completed"`;

type RideSlim = Pick<Route, 'id' | 'club' | 'name' | 'date'>;
const RIDE_FIELDS = 'id,club,name,date';

// PocketBase stores datetimes as "YYYY-MM-DD HH:MM:SS.sssZ" (space, not "T")
// and compares date filters as plain strings — so an ISO "T" operand silently
// fails any intra-day range (the space at index 10 sorts below "T"). Emit the
// space form so the bounds compare correctly.
function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3_600_000).toISOString().replace('T', ' ');
}

export interface ReminderStageResult {
  stage:      ReminderStage;
  ride:       string;
  recipients: number;
}

export interface ReminderRunSummary {
  ran:  string;               // ISO timestamp of this run
  sent: ReminderStageResult[];
}

/**
 * Find every ride due for a reminder, notify the right people, and record
 * what was sent. Safe to call repeatedly: the `reminder_log` claim makes each
 * (ride, stage) fire exactly once. Returns a per-stage breakdown so the first
 * production runs can be eyeballed from the cron response.
 */
export async function sendDueRideReminders(pb: PocketBase): Promise<ReminderRunSummary> {
  const tPush      = await getTranslations('push');
  const clubCache  = new Map<string, Club | null>();
  const sent: ReminderStageResult[] = [];

  const getClub = async (id: string): Promise<Club | null> => {
    if (clubCache.has(id)) return clubCache.get(id)!;
    const club = await pb.collection('clubs').getOne<Club>(id).catch(() => null);
    clubCache.set(id, club);
    return club;
  };

  for (const { stage, fromH, toH } of STAGES) {
    const from  = hoursFromNow(fromH);
    const to    = hoursFromNow(toH);
    const rides = await pb.collection('routes').getFullList<RideSlim>({
      filter:     `${ACTIVE_STATUS} && date >= "${from}" && date < "${to}"`,
      fields:     RIDE_FIELDS,
      requestKey: null,
    }).catch(() => [] as RideSlim[]);

    for (const ride of rides) {
      // Claim this (ride, stage) first — the unique index turns a duplicate
      // into a thrown error, so a failed create means "already handled, skip".
      // Claiming before sending means a push failure can't trigger a re-send
      // on the next run; for a reminder, silence beats double-notifying.
      const claimed = await pb.collection('reminder_log')
        .create({ route: ride.id, stage })
        .then(() => true)
        .catch(() => false);
      if (!claimed) continue;

      const club = await getClub(ride.club);
      if (!club) continue;

      const members = await pb.collection('club_members').getFullList<ClubMember>({
        filter:     `club = "${ride.club}"`,
        requestKey: null,
      }).catch(() => [] as ClubMember[]);

      const attendances = await pb.collection('attendances').getFullList<Attendance>({
        filter:     `route = "${ride.id}"`,
        requestKey: null,
      }).catch(() => [] as Attendance[]);
      const respondedIds = new Set(attendances.map(a => a.user));

      const recipientIds = stage === 't24'
        ? members.filter(m => !respondedIds.has(m.user)).map(m => m.user)  // non-responders
        : members.filter(m =>  respondedIds.has(m.user)).map(m => m.user); // confirmed attendees

      if (recipientIds.length === 0) {
        sent.push({ stage, ride: ride.id, recipients: 0 });
        continue;
      }

      const body = stage === 't24'
        ? tPush('reminderRsvpBody', { name: ride.name })
        : tPush('reminderSoonBody', { name: ride.name });

      await sendPushToUsers(recipientIds, {
        title: club.name,
        body,
        url:   `/clubs/${club.slug}/rides/${ride.id}`,
        tag:   `ride-${ride.id}-${stage}`,
      });

      sent.push({ stage, ride: ride.id, recipients: recipientIds.length });
    }
  }

  return { ran: new Date().toISOString(), sent };
}
