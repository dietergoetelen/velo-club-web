'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const AVATAR_COLORS = ['#FBBF24', '#F472B6', '#34D399', '#8B5CF6'] as const;
const PODIUM        = ['var(--amber)', 'var(--pink)', 'var(--mint)'] as const;

function getInitials(nameOrEmail: string) {
  return (nameOrEmail || '?')
    .split(/[\s@.]+/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('');
}

// Pre-resolved on the server (names, avatar file URLs), so this component
// only has to switch years and render.
export interface LeaderboardRow {
  user:      string;
  name:      string;
  avatarUrl: string;  // '' when no avatar
  rides:     number;
  km:        number;
}

export interface LeaderboardYear {
  year: number;
  rows: LeaderboardRow[];
}

/**
 * Season leaderboard with a year switcher. `years` arrives newest first and
 * only contains years that have data, so the default selection is the most
 * recent season — normally the current year.
 */
export function ClubLeaderboard({
  years,
  currentUserId,
}: {
  years:         LeaderboardYear[];
  currentUserId: string;
}) {
  const t = useTranslations('clubs.detail');
  const [selected, setSelected] = useState(years[0]?.year);
  const current = years.find(y => y.year === selected);

  return (
    <div>
      {years.length > 1 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {years.map(y => {
            const isSelected = y.year === selected;
            return (
              <button
                key={y.year}
                type="button"
                onClick={() => setSelected(y.year)}
                className="px-3 py-1 rounded-full text-xs font-black tabular-nums cursor-pointer transition-colors"
                style={isSelected ? {
                  backgroundColor: 'var(--ink)',
                  border:          '2px solid var(--ink)',
                  color:           '#ffffff',
                } : {
                  backgroundColor: '#ffffff',
                  border:          '2px solid var(--line)',
                  color:           'var(--ink-soft)',
                }}
              >
                {y.year}
              </button>
            );
          })}
        </div>
      )}

      <div className="card overflow-hidden">
        {current?.rows.map((row, i) => {
          const podium = PODIUM[i];
          return (
            <div
              key={row.user}
              className="flex items-center gap-4 px-6 py-4"
              style={i !== 0 ? { borderTop: '2px solid var(--line)' } : undefined}
            >
              <span
                className="w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 tabular-nums"
                style={podium ? {
                  backgroundColor: podium,
                  border:    '2px solid var(--ink)',
                  boxShadow: '2px 2px 0px var(--ink)',
                  color:     'var(--ink)',
                } : { color: 'var(--ink-soft)' }}
              >
                {i + 1}
              </span>

              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black overflow-hidden shrink-0"
                style={{
                  backgroundColor: row.avatarUrl ? '#fff' : AVATAR_COLORS[i % AVATAR_COLORS.length],
                  border:    '2px solid var(--ink)',
                  boxShadow: '2px 2px 0px var(--ink)',
                  color:     'var(--ink)',
                }}
              >
                {row.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(row.name)
                )}
              </div>

              <p className="font-bold text-ink flex-1 min-w-0 truncate">
                {row.name}
                {row.user === currentUserId && (
                  <span className="text-ink-soft font-medium"> {t('leaderboardYou')}</span>
                )}
              </p>

              <div className="text-right shrink-0">
                <p className="font-heading font-black text-ink text-lg leading-tight tabular-nums">
                  {Math.round(row.km).toLocaleString('nl-BE')}
                  <span className="font-bold text-xs text-ink-soft ml-1">km</span>
                </p>
                <p className="text-xs text-ink-soft tabular-nums">
                  {t('leaderboardRides', { count: row.rides })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
