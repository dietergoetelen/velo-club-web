import PocketBase from 'pocketbase';

export async function up(pb: PocketBase) {
  // ── 1. Make username unique on the users collection ──────────────────────
  const usersCol = await pb.collections.getOne('users');
  const usernameField = (usersCol.fields as Record<string, unknown>[])
    .find(f => f['name'] === 'username');

  if (usernameField && !usernameField['unique']) {
    const updatedFields = (usersCol.fields as Record<string, unknown>[]).map(f =>
      f['name'] === 'username' ? { ...f, unique: true } : f,
    );
    await pb.collections.update(usersCol.id, { fields: updatedFields });
    console.log('    updated users.username → unique');
  } else {
    console.log('    skip    users.username (already unique)');
  }

  // ── 2. Allow any authenticated user to view any user (needed for expand) ─
  await pb.collections.update(usersCol.id, {
    viewRule: "@request.auth.id != ''",
  });
  console.log('    updated users.viewRule → any authenticated user');

  // ── 3. Remove user_name / user_email from club_members ───────────────────
  const membersCol = await pb.collections.getOne('club_members');
  const memberFields = (membersCol.fields as Record<string, unknown>[]).filter(
    f => f['name'] !== 'user_name' && f['name'] !== 'user_email',
  );
  await pb.collections.update(membersCol.id, { fields: memberFields });
  console.log('    removed club_members.user_name, club_members.user_email');

  // ── 4. Remove user_name / user_email from join_requests ──────────────────
  const reqCol = await pb.collections.getOne('join_requests');
  const reqFields = (reqCol.fields as Record<string, unknown>[]).filter(
    f => f['name'] !== 'user_name' && f['name'] !== 'user_email',
  );
  await pb.collections.update(reqCol.id, { fields: reqFields });
  console.log('    removed join_requests.user_name, join_requests.user_email');
}
