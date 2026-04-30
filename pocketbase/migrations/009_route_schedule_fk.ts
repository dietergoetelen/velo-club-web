import PocketBase from 'pocketbase';
import { ensureField } from '../migrate';

export async function up(pb: PocketBase) {
  await ensureField(pb, 'routes', {
    name:     'schedule',
    type:     'text',
    required: false,
  });
}
