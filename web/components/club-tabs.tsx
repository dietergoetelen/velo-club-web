'use client';

import { useState, type ReactNode } from 'react';

export interface TabDef {
  id:      string;
  label:   string;
  /** Optional count chip after the label. */
  count?:  number;
  content: ReactNode;
}

/**
 * Client-side tab switcher for server-rendered content: panels arrive as
 * ReactNode slots, so switching tabs never refetches.
 *
 * Underline style: compact text tabs on a shared rail, so four or five tabs
 * fit on one row on a phone. `action` (e.g. the captain's "plan a ride"
 * button) sits inline right of the tabs when there's room (md+) and moves
 * to its own row above on smaller screens.
 */
export function ClubTabs({ tabs, action }: { tabs: TabDef[]; action?: ReactNode }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find(t => t.id === active);

  return (
    <div>
      {action && <div className="flex justify-end mb-4 md:hidden">{action}</div>}

      <div className="flex items-end gap-3">
        {/* The rail is an inset shadow rather than a border: the tablist
            scrolls horizontally, and content inside a scroller can't
            overlap the container's own border — but it does paint on top
            of an inset shadow, so the active underline covers the rail. */}
        <div
          role="tablist"
          className="flex items-end gap-5 flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ boxShadow: 'inset 0 -2px 0 0 var(--line)' }}
        >
          {tabs.map(tab => {
            const selected = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(tab.id)}
                className="inline-flex items-center gap-1.5 pt-1 pb-2 text-sm font-black whitespace-nowrap shrink-0 cursor-pointer transition-colors hover:text-ink"
                style={{
                  color: selected ? 'var(--ink)' : 'var(--ink-soft)',
                  borderBottom: selected ? '3px solid var(--amber)' : '3px solid transparent',
                }}
              >
                {tab.label}
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className="min-w-4 h-4 px-1 rounded-full text-[10px] font-black flex items-center justify-center tabular-nums"
                    style={selected ? {
                      backgroundColor: 'var(--amber)',
                      color:           'var(--ink)',
                    } : {
                      backgroundColor: 'var(--muted)',
                      color:           'var(--ink-soft)',
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {action && <div className="shrink-0 hidden md:block pb-2">{action}</div>}
      </div>

      <div role="tabpanel" className="mt-5">
        {current?.content}
      </div>
    </div>
  );
}
