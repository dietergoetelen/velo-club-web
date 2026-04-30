/**
 * Creates all PocketBase collections.
 * Run once after first PocketBase start:
 *   bash pocketbase/pocketbase.sh setup
 *
 * Requires POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD in .env.local
 */

import PocketBase from 'pocketbase';

const pb = new PocketBase(process.env.POCKETBASE_URL ?? 'http://localhost:8090');

async function upsertCollection(name: string, body: Record<string, unknown>) {
  const existing = await pb.collections.getList(1, 200);
  const found = existing.items.find(c => c.name === name);
  if (found) {
    console.log(`  skip  ${name} (already exists)`);
    return found;
  }
  const result = await pb.collections.create({ name, ...body });
  console.log(`  created ${name}`);
  return result;
}

async function main() {
  await pb.collection('_superusers').authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL ?? 'admin@local.be',
    process.env.POCKETBASE_ADMIN_PASSWORD ?? '1qAZ@Wsx#Edc',
  );

  console.log('Setting up collections…\n');

  // ── clubs ──────────────────────────────────────────────────────────────────
  await upsertCollection('clubs', {
    type: 'base',
    fields: [
      { name: 'name',        type: 'text',  required: true },
      { name: 'description', type: 'text',  required: false },
      { name: 'slug',        type: 'text',  required: true },
    ],
    listRule:   "@request.auth.id != ''",
    viewRule:   "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: '',
  });

  // ── club_members ───────────────────────────────────────────────────────────
  await upsertCollection('club_members', {
    type: 'base',
    fields: [
      { name: 'club',       type: 'text',   required: true },
      { name: 'user',       type: 'text',   required: true },
      { name: 'user_name',  type: 'text',   required: false },
      { name: 'user_email', type: 'email',  required: false },
      {
        name: 'role', type: 'select', required: true,
        values: ['captain', 'member'], maxSelect: 1,
      },
      { name: 'points', type: 'number', required: false },
    ],
    listRule:   "@request.auth.id != ''",
    viewRule:   "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });

  // ── invitations ────────────────────────────────────────────────────────────
  await upsertCollection('invitations', {
    type: 'base',
    fields: [
      { name: 'club',     type: 'text',  required: true },
      { name: 'email',    type: 'email', required: true },
      { name: 'token',    type: 'text',  required: true },
      { name: 'accepted', type: 'bool',  required: false },
      { name: 'expires',  type: 'date',  required: true },
    ],
    listRule:   "@request.auth.id != ''",
    viewRule:   '',
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });

  // ── routes ─────────────────────────────────────────────────────────────────
  await upsertCollection('routes', {
    type: 'base',
    fields: [
      { name: 'club',        type: 'text',   required: true },
      { name: 'created_by',  type: 'text',   required: true },
      { name: 'name',        type: 'text',   required: true },
      { name: 'date',        type: 'date',   required: true },
      { name: 'distance_km', type: 'number', required: true },
      { name: 'elevation_m', type: 'number', required: false },
      {
        name: 'surface', type: 'select', required: true,
        values: ['all', 'road', 'gravel'], maxSelect: 1,
      },
      { name: 'coordinates', type: 'json',   required: true },
      {
        name: 'status', type: 'select', required: true,
        values: ['proposed', 'confirmed', 'completed', 'cancelled'], maxSelect: 1,
      },
    ],
    listRule:   "@request.auth.id != ''",
    viewRule:   "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });

  // ── votes ──────────────────────────────────────────────────────────────────
  await upsertCollection('votes', {
    type: 'base',
    fields: [
      { name: 'route', type: 'text', required: true },
      { name: 'user',  type: 'text', required: true },
      { name: 'going', type: 'bool', required: true },
    ],
    listRule:   "@request.auth.id != ''",
    viewRule:   "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id = user",
    deleteRule: "@request.auth.id = user",
  });

  console.log('\nDone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
