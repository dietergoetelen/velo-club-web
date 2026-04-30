import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { fileUrl } from '@/lib/pocketbase';
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
    <div className="max-w-lg mx-auto">

      <div className="mb-8">
        <p className="eyebrow mb-2">Settings</p>
        <h1 className="font-heading font-black text-4xl text-ink tracking-tight">
          {club.name}
        </h1>
        <p className="text-ink-soft mt-1">Only you (the captain) can edit these.</p>
      </div>

      <SettingsForm
        club={club}
        avatarUrl={club.avatar ? fileUrl('clubs', club.id, club.avatar, '400x400') : undefined}
      />
    </div>
  );
}
