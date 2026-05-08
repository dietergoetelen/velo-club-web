'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const COLLAPSED_PX = 140;

export function ClubIntro({ markdown }: { markdown: string }) {
  const [expanded,    setExpanded]    = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setNeedsToggle(el.scrollHeight > COLLAPSED_PX + 8);
  }, [markdown]);

  return (
    <div className="mt-3">
      <div className="relative">
        <div
          ref={ref}
          className="markdown-body markdown-soft overflow-hidden transition-[max-height] duration-300 ease-out"
          style={{ maxHeight: expanded ? '4000px' : `${COLLAPSED_PX}px` }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
        {!expanded && needsToggle && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent, var(--paper))' }}
          />
        )}
      </div>
      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-xs font-bold uppercase tracking-[0.12em] hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          {expanded ? 'Show less ↑' : 'Show more ↓'}
        </button>
      )}
    </div>
  );
}
