import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { CreateBucketForm } from './create-bucket-form';
import type { Club } from '@/lib/types';

export default async function NewBucketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const pb   = await getAuthenticatedPB();
  const club = await pb.collection('clubs').getFirstListItem<Club>(`slug = "${slug}"`).catch(() => null);
  if (!club) notFound();

  // Captain-only — bounce members back to the club.
  const captain = await pb.collection('club_members')
    .getFirstListItem(`club = "${club.id}" && user = "${user.id}" && role = "captain"`)
    .catch(() => null);
  if (!captain) redirect(`/clubs/${slug}`);

  return <CreateBucketForm clubId={club.id} slug={slug} />;
}
