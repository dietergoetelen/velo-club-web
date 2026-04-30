import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { SettingsForm } from './settings-form';
import type { Club, ClubMember } from '@/lib/types';

export default async function ClubSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user      = await getCurrentUser();
  if (!user) redirect('/login');

  const pb = await getAuthenticatedPB();

  let club: Club;
  try {
    club = await pb.collection('clubs').getFirstListItem<Club>(`slug = "${slug}"`);
  } catch {
    notFound();
  }

  const membership = await pb.collection('club_members')
    .getFirstListItem<ClubMember>(`club = "${club.id}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);

  if (!membership) redirect(`/clubs/${slug}`);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink tracking-tight">Club settings</h1>
        <p className="text-sm text-ink-muted mt-1">{club.name}</p>
      </div>
      <SettingsForm club={club} />
    </div>
  );
}
