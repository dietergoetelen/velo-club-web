'use client';

import { useState } from 'react';
import { JoinRequestForm } from '@/app/(app)/clubs/[slug]/join-request-form';
import { markdownToPreview } from '@/lib/markdown';
import type { Club } from '@/lib/types';

const INITIAL_LIMIT = 5;

export function DiscoverClubs({
  clubs,
  pendingClubIds,
}: {
  clubs:          Club[];
  pendingClubIds: Set<string>;
}) {
  const [query,    setQuery]    = useState('');
  const [showAll,  setShowAll]  = useState(false);

  const filtered = query.trim()
    ? clubs.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : clubs;

  const visible   = showAll || query.trim() ? filtered : filtered.slice(0, INITIAL_LIMIT);
  const hasMore   = !query.trim() && !showAll && filtered.length > INITIAL_LIMIT;

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <p className="eyebrow">Discover clubs</p>
        <span
          className="w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center"
          style={{
            backgroundColor: 'var(--pink)',
            border:    '2px solid var(--ink)',
            boxShadow: '2px 2px 0px var(--ink)',
          }}
        >
          {clubs.length}
        </span>
      </div>

      {/* Search */}
      <input
        type="search"
        placeholder="Search clubs…"
        value={query}
        onChange={e => { setQuery(e.target.value); setShowAll(false); }}
        className="field-input mb-4"
      />

      {filtered.length === 0 ? (
        <p className="text-ink-soft text-sm px-1">No clubs match "{query}".</p>
      ) : (
        <>
          <div className="card overflow-hidden">
            {visible.map((club, index) => {
              const isPending = pendingClubIds.has(club.id);
              return (
                <div
                  key={club.id}
                  className="flex items-center justify-between gap-4 px-6 py-5"
                  style={index !== 0 ? { borderTop: '2px solid var(--line)' } : undefined}
                >
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-ink truncate">{club.name}</p>
                    {club.description && (
                      <p className="text-sm text-ink-soft mt-0.5 truncate">{markdownToPreview(club.description)}</p>
                    )}
                  </div>
                  {isPending
                    ? <span className="badge-neutral shrink-0">Pending</span>
                    : <JoinRequestForm clubId={club.id} slug={club.slug} />
                  }
                </div>
              );
            })}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="btn-secondary w-full mt-3 text-sm"
            >
              Show {filtered.length - INITIAL_LIMIT} more clubs
            </button>
          )}
        </>
      )}
    </section>
  );
}
