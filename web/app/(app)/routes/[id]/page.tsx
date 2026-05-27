import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser, getAuthenticatedPB } from '@/lib/session';
import { RouteDetailLayout } from '@/components/route-detail-layout';
import { DeletePersonalRouteButton } from './delete-button';
import type { PersonalRoute } from '@/lib/types';

export default async function PersonalRouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const t  = await getTranslations('routes.detail');
  const pb = await getAuthenticatedPB();

  let route: PersonalRoute;
  try {
    route = await pb.collection('personal_routes').getOne<PersonalRoute>(id);
  } catch {
    notFound();
  }

  // Owner-only metadata: fetch the owner's display name so non-owners can see
  // who made the route. PB users.viewRule allows this for authenticated users.
  const owner = await pb.collection('users').getOne(route.user).catch(() => null);
  const ownerName =
    (owner?.['name']     as string | undefined)
    ?? (owner?.['username'] as string | undefined)
    ?? (owner?.['email']    as string | undefined)
    ?? '';

  const isOwner = route.user === user.id;

  return (
    <RouteDetailLayout
      coordinates={route.coordinates}
      title={
        <>
          <Link
            href="/dashboard"
            className="eyebrow mb-3 inline-flex items-center gap-1.5 hover:text-accent transition-colors"
          >
            {t('back')}
          </Link>
          <h1 className="font-heading font-black text-2xl text-ink tracking-tight leading-tight">
            {route.name}
          </h1>
          {ownerName && !isOwner && (
            <p className="text-ink-soft text-xs mt-1.5">
              {t('by', { name: ownerName })}
            </p>
          )}
        </>
      }
      details={
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-xl p-4"
              style={{ border: '2px solid var(--line)', backgroundColor: '#ffffff', boxShadow: '4px 4px 0px var(--line)' }}
            >
              <p className="field-label mb-1">{t('distance')}</p>
              <p className="font-heading font-black text-2xl text-ink">{route.distance_km}</p>
              <p className="text-xs text-ink-soft font-medium">{t('distanceUnit')}</p>
            </div>
            <div
              className="rounded-xl p-4"
              style={{ border: '2px solid var(--line)', backgroundColor: '#ffffff', boxShadow: '4px 4px 0px var(--line)' }}
            >
              <p className="field-label mb-1">{t('elevation')}</p>
              <p className="font-heading font-black text-2xl text-ink">{route.elevation_m}</p>
              <p className="text-xs text-ink-soft font-medium">{t('elevationUnit')}</p>
            </div>
          </div>

          {/* GPX export */}
          <div>
            <a
              href={`/routes/${route.id}/gpx`}
              download
              className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--amber)',
                border:          '2px solid var(--ink)',
                boxShadow:       '3px 3px 0px var(--ink)',
                color:           'var(--ink)',
                textDecoration:  'none',
              }}
            >
              {t('downloadGpx')}
            </a>
          </div>

          {/* Owner-only actions */}
          {isOwner && (
            <div className="pt-2 space-y-2">
              <Link
                href={`/routes/${route.id}/edit`}
                className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'white',
                  border:          '2px solid var(--ink)',
                  boxShadow:       '3px 3px 0px var(--ink)',
                  color:           'var(--ink)',
                  textDecoration:  'none',
                }}
              >
                {t('edit')}
              </Link>
              <DeletePersonalRouteButton routeId={route.id} routeName={route.name} />
            </div>
          )}
        </>
      }
    />
  );
}
