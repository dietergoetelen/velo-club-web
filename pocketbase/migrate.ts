/**
 * Migration runner.
 * Tracks applied migrations in pocketbase/data/migrations.json.
 *
 * Usage (via shell script):
 *   bash pocketbase/pocketbase.sh migrate
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PocketBase from 'pocketbase';

const __dirname     = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE    = path.join(__dirname, 'data', 'migrations.json');
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// ── state ──────────────────────────────────────────────────────────────────

function loadState(): { applied: string[] } {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); }
  catch { return { applied: [] }; }
}

function saveState(state: { applied: string[] }) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

// ── helpers exported for migration files ───────────────────────────────────

export async function createCollectionIfMissing(
  pb:   PocketBase,
  name: string,
  body: Record<string, unknown>,
) {
  const list = await pb.collections.getList(1, 200);
  if (list.items.find(c => c.name === name)) {
    console.log(`    skip    ${name} (already exists)`);
    return;
  }
  await pb.collections.create({ name, ...body });
  console.log(`    created ${name}`);
}

export async function ensureField(
  pb:             PocketBase,
  collectionName: string,
  field:          Record<string, unknown>,
) {
  const col      = await pb.collections.getOne(collectionName);
  const existing = (col.fields as Array<{ name: string }>) ?? [];
  if (existing.find(f => f.name === field['name'])) {
    console.log(`    skip    ${collectionName}.${field['name']} (already exists)`);
    return;
  }
  await pb.collections.update(col.id, { fields: [...existing, field] });
  console.log(`    added   ${collectionName}.${field['name']}`);
}

// ── runner ─────────────────────────────────────────────────────────────────

async function main() {
  const pb = new PocketBase(process.env.POCKETBASE_URL ?? 'http://localhost:8090');
  await pb.collection('_superusers').authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!,
  );

  const state = loadState();
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.ts'))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (state.applied.includes(file)) {
      console.log(`  skip  ${file}`);
      continue;
    }
    console.log(`  run   ${file}`);
    const mod = await import(path.join(MIGRATIONS_DIR, file));
    await mod.up(pb);
    state.applied.push(file);
    saveState(state);
    console.log(`  done  ${file}`);
    ran++;
  }

  console.log(ran === 0 ? '\nNothing to migrate.' : `\n${ran} migration(s) applied.`);
}

main().catch(err => { console.error(err); process.exit(1); });
