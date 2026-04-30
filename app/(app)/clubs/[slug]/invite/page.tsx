import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import type { Club, ClubMember } from '@/lib/types';
import { InviteForm } from './invite-form';

export default async function InvitePage({ params }: { params: Promise<{ slug: string }> }) {
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
    .getFirstListItem<ClubMember>(`club = "${club.id}" && user = "${user.id}"`)
    .catch(() => null);

  if (!membership || membership.role !== 'captain') redirect(`/clubs/${slug}`);

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Invite a member</h1>
      <p className="text-slate-500 text-sm mb-6">
        to <span className="font-medium text-slate-700">{club.name}</span>
      </p>
      <InviteForm clubId={club.id} />
    </div>
  );
}
