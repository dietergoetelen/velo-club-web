// PocketBase record base
export interface PBRecord {
  id:      string;
  created: string;
  updated: string;
}

// ── Collections ───────────────────────────────────────────────────────────────

export interface Club extends PBRecord {
  name:              string;
  description:       string;
  slug:              string;
  avatar:            string;  // file name; '' when no avatar
  schedules_enabled: boolean;
  start_lat:         number;  // 0 when unset
  start_lng:         number;  // 0 when unset
}

export function hasClubStart(club: Pick<Club, 'start_lat' | 'start_lng'>): boolean {
  return club.start_lat !== 0 || club.start_lng !== 0;
}

export interface ClubSchedule extends PBRecord {
  club:        string;  // Club.id
  label:       string;  // free text — e.g. "A", "B", "Social"
  day_of_week: number;  // 0 = Sunday … 6 = Saturday
  time:        string;  // "HH:MM"
}

export interface ClubMember extends PBRecord {
  club:   string;  // Club.id
  user:   string;  // PB user id
  role:   'captain' | 'member';
  points: number;
}

export interface JoinRequest extends PBRecord {
  club:   string;
  user:   string;
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * One reusable invite link per club. The captain shares /join/<token>;
 * regenerating rotates the token in place (invalidating the old link). Stored
 * in a superuser-only collection and resolved server-side so tokens never hit
 * the public API.
 */
export interface Invite extends PBRecord {
  token:      string;
  club:       string;  // Club.id
  created_by: string;  // PB user id
}

export interface Route extends PBRecord {
  club:        string;  // relation → Club.id
  created_by:  string;  // relation → PB user id
  name:        string;
  date:        string;  // ISO date — the Sunday this ride is for
  distance_km: number;
  elevation_m: number;
  surface:     'all' | 'road' | 'gravel';
  coordinates: [number, number][]; // [lat, lng][]
  status:      'proposed' | 'confirmed' | 'completed' | 'cancelled';
  schedule:    string;  // ClubSchedule.id; '' when none
}

export interface Vote extends PBRecord {
  route: string; // relation → Route.id
  user:  string; // relation → PB user id
  going: boolean;
}

/**
 * Route bucket — a captain-opened poll for picking the next ride's route.
 * Members add candidate routes (from the personal-route library) and cast one
 * vote each; when it closes (deadline cron, or the captain early/overriding)
 * the winning route + `ride_date` spawn the actual club ride.
 */
export interface RouteBucket extends PBRecord {
  club:          string;            // Club.id
  ride_date:     string;            // ISO — when the chosen ride happens
  closes_at:     string;            // ISO — voting deadline
  status:        'open' | 'closed';
  created_by:    string;            // PB user id (captain)
  winning_route: string;            // PersonalRoute.id; '' until resolved
  created_ride:  string;            // Route.id of the spawned ride; '' until resolved
}

export interface BucketOption extends PBRecord {
  bucket:   string;  // RouteBucket.id
  route:    string;  // PersonalRoute.id (the candidate)
  added_by: string;  // PB user id
}

export interface BucketVote extends PBRecord {
  bucket: string;  // RouteBucket.id
  option: string;  // BucketOption.id
  user:   string;  // PB user id
}

export interface Attendance extends PBRecord {
  route: string; // relation → Route.id
  user:  string; // relation → PB user id
}

/**
 * Idempotency log for automated ride reminders. One row per (ride, stage):
 * the reminder cron claims a stage by creating the row, and the unique
 * (route, stage) index guarantees a ride is never reminded twice for the
 * same stage — even if the hourly job overlaps or retries.
 */
export type ReminderStage = 't24' | 't2';

export interface ReminderLog extends PBRecord {
  route: string;        // relation → Route.id
  stage: ReminderStage;
}

/**
 * Web Push subscription. One row per browser/device per user — a single user
 * can have several if they're logged in on phone + desktop. Endpoint is
 * globally unique (it's the push service's address for that device).
 */
export interface PushSubscriptionRecord extends PBRecord {
  user:     string;   // relation → PB user id
  endpoint: string;
  p256dh:   string;
  auth:     string;
}

/**
 * Personal routes — routes attached to a user instead of a club. Used for
 * drafts/experiments outside of any planned club ride. Visible to any
 * authenticated user; only the owner can mutate.
 */
export interface PersonalRoute extends PBRecord {
  user:        string;   // relation → PB user id (owner)
  name:        string;
  distance_km: number;
  elevation_m: number;
  coordinates: [number, number][]; // [lat, lng][]
}

// UI currently exposes just ❤️. The `emoji` column on ride_reactions is a
// free-text field, so re-introducing more reactions is just a matter of
// extending this union + array.
export type ReactionEmoji = '❤️';

export const REACTION_EMOJIS: readonly ReactionEmoji[] = ['❤️'];

export interface RideReaction extends PBRecord {
  route: string;         // relation → Route.id
  user:  string;         // relation → PB user id
  emoji: ReactionEmoji;
}

// ── Route planner ─────────────────────────────────────────────────────────────

export interface RideRoute {
  // 'a' | 'b' | 'c' for the three generated loop variants; freeform string
  // (e.g. `manual-<timestamp>`) for the manual editor's session key so React
  // remounts the editor on each re-entry instead of recycling stale state.
  id:          string;
  label:       string;
  color:       string;
  distance:    number;              // km, 1 decimal
  elevation:   number;              // m, integer
  coordinates: [number, number][];  // [lat, lng] — Leaflet order
  // Quality debug info
  score:       number;              // 0..100; 100 = no detected pinch
  lollipopM:   number;              // raw pinch path-distance (m); 0 = clean
}
