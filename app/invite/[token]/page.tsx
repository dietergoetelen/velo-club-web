import { notFound, redirect } from 'next/navigation';
import { getAdminPocketBase } from '@/lib/pocketbase';
import { getCurrentUser } from '@/lib/session';
import { InviteClient } from './invite-client';
import type { Club } from '@/lib/types';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pb        = await getAdminPocketBase();

  let invitation;
  try {
    invitation = await pb.collection('invitations').getFirstListItem(`token = "${token}"`);
  } catch {
    notFound();
  }

  if (invitation.accepted) {
    redirect('/dashboard');
  }

  const expires = new Date(invitation.expires);
  if (expires < new Date()) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-sm w-full text-center">
          <p className="text-slate-600">This invitation has expired. Ask your captain for a new one.</p>
        </div>
      </main>
    );
  }

  const club    = await pb.collection('clubs').getOne<Club>(invitation.club);
  const user    = await getCurrentUser();

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">VeloClub</h1>
        <p className="text-center text-slate-500 mb-8">
          You've been invited to join <span className="font-semibold text-slate-900">{club.name}</span>
        </p>
        <InviteClient
          inviteToken={token}
          email={invitation.email as string}
          loggedInUser={user}
        />
      </div>
    </main>
  );
}
