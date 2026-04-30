import PocketBase from 'pocketbase';

export async function up(pb: PocketBase) {
  const clubsCol = await pb.collections.getOne('clubs');

  const fields = (clubsCol.fields as Record<string, unknown>[]).map(f => {
    if (f['name'] === 'name' || f['name'] === 'slug') {
      return { ...f, unique: true };
    }
    return f;
  });

  await pb.collections.update(clubsCol.id, { fields });
  console.log('    updated clubs.name → unique');
  console.log('    updated clubs.slug → unique');
}
