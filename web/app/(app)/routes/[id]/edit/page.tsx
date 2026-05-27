import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { EditPersonalRoute } from './edit-personal-route';
import type { PersonalRoute } from '@/lib/types';

export default async function EditPersonalRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const pb = await getAuthenticatedPB();

  let route: PersonalRoute;
  try {
    route = await pb.collection('personal_routes').getOne<PersonalRoute>(id);
  } catch {
    notFound();
  }

  // Only the owner can edit; non-owners get bounced to the detail view.
  if (route.user !== user.id) redirect(`/routes/${id}`);

  return (
    <EditPersonalRoute
      routeId={route.id}
      initialName={route.name}
      coordinates={route.coordinates}
      elevation={route.elevation_m}
    />
  );
}
