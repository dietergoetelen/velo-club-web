import 'server-only';
import PocketBase from 'pocketbase';

const PB_URL = process.env.POCKETBASE_URL ?? 'http://localhost:8090';

export function getPocketBase(): PocketBase {
  return new PocketBase(PB_URL);
}

export function getPBWithToken(token: string): PocketBase {
  const pb = getPocketBase();
  pb.authStore.save(token, null);
  return pb;
}

export async function getAdminPocketBase(): Promise<PocketBase> {
  const pb = getPocketBase();
  await pb.collection('_superusers').authWithPassword(
    process.env.POCKETBASE_ADMIN_EMAIL!,
    process.env.POCKETBASE_ADMIN_PASSWORD!,
  );
  return pb;
}
