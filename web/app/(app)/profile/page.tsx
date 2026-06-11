import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { fileUrl } from '@/lib/pocketbase';
import { startOfTodayIso, startOfYearIso, currentYearBrussels } from '@/lib/dates';
import { userRiderTotals, type RiderTotals } from '@/lib/stats';
import { PushNotificationsToggle } from '@/components/push-notifications-toggle';
import { ProfileForm } from './profile-form';

function StatCard({ label, totals, ridesLabel }: {
  label:      string;
  totals:     RiderTotals;
  ridesLabel: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ border: '2px solid var(--line)', backgroundColor: '#ffffff', boxShadow: '4px 4px 0px var(--line)' }}
    >
      <p className="field-label mb-1">{label}</p>
      <p className="font-heading font-black text-2xl text-ink tabular-nums">
        {Math.round(totals.km).toLocaleString('nl-BE')}
        <span className="font-bold text-xs text-ink-soft ml-1">km</span>
      </p>
      <p className="text-xs text-ink-soft font-medium tabular-nums">{ridesLabel}</p>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const t = await getTranslations('profile');

  const pb = await getAuthenticatedPB();
  const { allTime, thisYear } = await userRiderTotals(pb, user.id, {
    since: startOfYearIso(),
    until: startOfTodayIso(),
  });

  const avatarUrl = user.avatar
    ? fileUrl('users', user.id, user.avatar, '400x400')
    : undefined;

  return (
    <div className="max-w-lg mx-auto space-y-10">

      <div>
        <p className="eyebrow mb-2">{t('eyebrow')}</p>
        <h1 className="font-heading font-black text-4xl text-ink tracking-tight">
          {user.name || user.email}
        </h1>
        <p className="text-ink-soft mt-1">{t('subtitle')}</p>
      </div>

      <section>
        <p className="eyebrow mb-4">{t('statsHeading')}</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label={t('statsThisYear', { year: currentYearBrussels() })}
            totals={thisYear}
            ridesLabel={t('statsRides', { count: thisYear.rides })}
          />
          <StatCard
            label={t('statsAllTime')}
            totals={allTime}
            ridesLabel={t('statsRides', { count: allTime.rides })}
          />
        </div>
      </section>

      <ProfileForm name={user.name} email={user.email} avatarUrl={avatarUrl} />

      {/* The component renders nothing on unsupported browsers (e.g. iOS
          Safari outside a PWA), so the heading lives inside it — no orphan
          title when the feature isn't available. */}
      <PushNotificationsToggle heading={t('notificationsHeading')} />
    </div>
  );
}
