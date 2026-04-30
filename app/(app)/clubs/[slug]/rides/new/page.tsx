import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { RidePlanner } from './ride-planner';
import type { Club, ClubMember } from '@/lib/types';

export default async function NewRidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const pb = await getAuthenticatedPB();

  let club: Club;
  try {
    club = await pb.collection('clubs').getFirstListItem<Club>(`slug = "${slug}"`);
  } catch {
    notFound();
  }

  const membership = await pb.collection('club_members')
    .getFirstListItem<ClubMember>(
      `club = "${club.id}" && user = "${user.id}" && role = "captain"`,
    )
    .catch(() => null);

  if (!membership) redirect(`/clubs/${slug}`);

  return <RidePlanner clubId={club.id} slug={slug} clubName={club.name} />;
}
