import PocketBase from 'pocketbase';
import { ensureField } from '../migrate';

export async function up(pb: PocketBase) {
  // Optional. Treat (0, 0) as "unset" — no real club is at the equator/prime meridian.
  // PocketBase rejects 0 for required number fields, so these stay optional.
  await ensureField(pb, 'clubs', { name: 'start_lat', type: 'number', required: false });
  await ensureField(pb, 'clubs', { name: 'start_lng', type: 'number', required: false });
}
