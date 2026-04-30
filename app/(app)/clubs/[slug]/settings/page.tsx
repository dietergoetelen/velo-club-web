import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { fileUrl } from '@/lib/pocketbase';
import { SettingsForm } from './settings-form';
import { SchedulesSection } from './schedules-section';
import type { Club, ClubMember, ClubSchedule } from '@/lib/types';

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

  const schedules = club.schedules_enabled
    ? await pb.collection('club_schedules').getFullList<ClubSchedule>({
        filter: `club = "${club.id}"`,
        sort:   'day_of_week,time',
      }).catch(() => [])
    : [];

  return (
    <div className="max-w-lg mx-auto space-y-8">

      <div>
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

      {club.schedules_enabled && (
        <SchedulesSection clubId={club.id} slug={slug} schedules={schedules} />
      )}
    </div>
  );
}
