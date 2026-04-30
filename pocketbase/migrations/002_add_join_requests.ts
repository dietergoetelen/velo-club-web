import PocketBase from 'pocketbase';
import { createCollectionIfMissing, ensureField } from '../migrate';

export async function up(pb: PocketBase) {
  // Denormalize user identity onto club_members to avoid expand on text fields
  await ensureField(pb, 'club_members', { name: 'user_name',  type: 'text',  required: false });
  await ensureField(pb, 'club_members', { name: 'user_email', type: 'email', required: false });

  await createCollectionIfMissing(pb, 'join_requests', {
    type: 'base',
    fields: [
      { name: 'club',       type: 'text',  required: true },
      { name: 'user',       type: 'text',  required: true },
      { name: 'user_name',  type: 'text',  required: false },
      { name: 'user_email', type: 'email', required: false },
      {
        name: 'status', type: 'select', required: true,
        values: ['pending', 'approved', 'rejected'], maxSelect: 1,
      },
    ],
    listRule:   "@request.auth.id != ''",
    viewRule:   "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });
}
