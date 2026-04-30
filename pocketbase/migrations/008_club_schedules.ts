import PocketBase from 'pocketbase';
import { createCollectionIfMissing } from '../migrate';

export async function up(pb: PocketBase) {
  await createCollectionIfMissing(pb, 'club_schedules', {
    type: 'base',
    fields: [
      { name: 'club',  type: 'text', required: true },
      { name: 'label', type: 'text', required: true },
      {
        // NOTE: not required — PocketBase rejects 0 for required number fields.
        // The server action validates the 0..6 range.
        name: 'day_of_week', type: 'number', required: false,
        min: 0, max: 6, onlyInt: true,
      },
      { name: 'time', type: 'text', required: true }, // "HH:MM"
    ],
    listRule:   "@request.auth.id != ''",
    viewRule:   "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });
}
