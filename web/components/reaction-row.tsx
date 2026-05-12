'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toggleReaction } from '@/lib/actions/ride-reactions';
import { REACTION_EMOJIS, type ReactionEmoji } from '@/lib/types';

export function ReactionRow({
  rideId,
  slug,
  counts,
  currentUserReaction,
  disabled = false,
}: {
  rideId:              string;
  slug:                string;
  counts:              Record<ReactionEmoji, number>;
  currentUserReaction: ReactionEmoji | null;
  disabled?:           boolean;
}) {
  const t = useTranslations('rides.reactions');
  const [pending, startTransition] = useTransition();

  function press(emoji: ReactionEmoji) {
    if (disabled || pending) return;
    const form = new FormData();
    form.set('rideId', rideId);
    form.set('slug',   slug);
    form.set('emoji',  emoji);
    startTransition(async () => { await toggleReaction(form); });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTION_EMOJIS.map(emoji => {
        const count    = counts[emoji] ?? 0;
        const selected = currentUserReaction === emoji;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => press(emoji)}
            disabled={disabled || pending}
            aria-pressed={selected}
            aria-label={t('toggleAria', { emoji })}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: selected ? 'var(--amber)' : 'white',
              border:          '2px solid var(--ink)',
              boxShadow:       selected ? '2px 2px 0px var(--ink)' : '1px 1px 0px var(--ink)',
              color:           'var(--ink)',
              transform:       selected ? 'translate(-1px,-1px)' : undefined,
            }}
          >
            <span aria-hidden>{emoji}</span>
            {count > 0 && <span className="tabular-nums text-xs">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
