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

export interface Attendance extends PBRecord {
  route: string; // relation → Route.id
  user:  string; // relation → PB user id
}

// ── Route planner ─────────────────────────────────────────────────────────────

export interface RideRoute {
  id:          'a' | 'b' | 'c';
  label:       string;
  color:       string;
  distance:    number;              // km, 1 decimal
  elevation:   number;              // m, integer
  coordinates: [number, number][];  // [lat, lng] — Leaflet order
}
