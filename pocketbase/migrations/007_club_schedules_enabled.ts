import PocketBase from 'pocketbase';
import { ensureField } from '../migrate';

export async function up(pb: PocketBase) {
  await ensureField(pb, 'clubs', {
    name:     'schedules_enabled',
    type:     'bool',
    required: false,
  });
}
