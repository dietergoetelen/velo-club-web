import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getAdminPocketBase, fileUrl } from '@/lib/pocketbase';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { joinViaInvite } from '@/lib/actions/invites';
import type { Club, Invite } from '@/lib/types';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--bg, #fffef7)' }}>
      <div className="card p-8 sm:p-10 w-full max-w-md text-center">{children}</div>
    </div>
  );
}

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations('clubs.join');

  // Resolve the token server-side with admin auth — the invites table is
  // superuser-only so tokens never leak to the public API.
  const admin  = await getAdminPocketBase().catch(() => null);
  const invite = admin
    ? await admin.collection('invites')
        .getFirstListItem<Invite>(admin.filter('token = {:token}', { token }))
        .catch(() => null)
    : null;
  const club = invite
    ? await admin!.collection('clubs').getOne<Club>(invite.club).catch(() => null)
    : null;

  if (!club) {
    return (
      <Shell>
        <h1 className="font-heading font-black text-2xl text-ink mb-2">{t('invalidTitle')}</h1>
        <p className="text-ink-soft text-sm mb-6">{t('invalidBody')}</p>
        <Link href="/dashboard" className="btn-secondary text-sm">{t('toDashboard')}</Link>
      </Shell>
    );
  }

  const user = await getCurrentUser();

  // Already a member → straight into the club.
  if (user) {
    const pb = await getAuthenticatedPB();
    const member = await pb.collection('club_members')
      .getFirstListItem(`club = "${club.id}" && user = "${user.id}"`)
      .catch(() => null);
    if (member) redirect(`/clubs/${club.slug}`);
  }

  const next = `/join/${encodeURIComponent(token)}`;

  return (
    <Shell>
      <div
        className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center overflow-hidden font-heading font-black text-2xl text-ink"
        style={{ backgroundColor: club.avatar ? '#fff' : 'var(--amber)', border: '2px solid var(--ink)', boxShadow: '4px 4px 0px var(--ink)' }}
      >
        {club.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl('clubs', club.id, club.avatar, '200x200')} alt="" className="w-full h-full object-cover" />
        ) : (
          club.name.slice(0, 2).toUpperCase()
        )}
      </div>

      <p className="eyebrow mb-1">{t('eyebrow')}</p>
      <h1 className="font-heading font-black text-3xl text-ink mb-2 tracking-tight">{club.name}</h1>

      {user ? (
        <>
          <p className="text-ink-soft text-sm mb-6">{t('loggedInBody', { name: club.name })}</p>
          <form action={joinViaInvite}>
            <input type="hidden" name="token" value={token} />
            <button type="submit" className="btn-primary w-full">{t('joinButton')}</button>
          </form>
        </>
      ) : (
        <>
          <p className="text-ink-soft text-sm mb-6">{t('loggedOutBody', { name: club.name })}</p>
          <div className="space-y-2">
            <Link href={`/register?next=${encodeURIComponent(next)}`} className="btn-primary w-full block">
              {t('createAccount')}
            </Link>
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-secondary w-full block">
              {t('signIn')}
            </Link>
          </div>
        </>
      )}
    </Shell>
  );
}
