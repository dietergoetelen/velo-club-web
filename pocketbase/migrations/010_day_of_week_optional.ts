import PocketBase from 'pocketbase';

/**
 * PocketBase rejects `0` for `required: true` number fields ("Cannot be blank").
 * day_of_week uses 0=Sunday, so we drop `required` at the DB level — the server
 * action validates the range.
 */
export async function up(pb: PocketBase) {
  const col = await pb.collections.getOne('club_schedules');
  const fields = (col.fields as Array<Record<string, unknown>>) ?? [];
  const next = fields.map(f =>
    f['name'] === 'day_of_week' ? { ...f, required: false } : f,
  );
  await pb.collections.update(col.id, { fields: next });
  console.log('    updated club_schedules.day_of_week (required=false)');
}
