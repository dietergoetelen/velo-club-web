import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { PersonalRouteEditor } from './personal-route-editor';

export default async function NewPersonalRoutePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <PersonalRouteEditor />;
}
