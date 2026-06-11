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
 * ReactNode slots, so switching tabs never refetches. `action` renders at
 * the end of the tab row (e.g. the captain's "plan a ride" button).
 */
export function ClubTabs({ tabs, action }: { tabs: TabDef[]; action?: ReactNode }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find(t => t.id === active);

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap" role="tablist">
        {tabs.map(tab => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(tab.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-black transition-colors cursor-pointer"
              style={selected ? {
                backgroundColor: 'var(--amber)',
                border:          '2px solid var(--ink)',
                boxShadow:       '3px 3px 0px var(--ink)',
                color:           'var(--ink)',
              } : {
                backgroundColor: '#ffffff',
                border:          '2px solid var(--line)',
                color:           'var(--ink-soft)',
              }}
            >
              {tab.label}
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className="min-w-5 h-5 px-1 rounded-full text-[11px] font-black flex items-center justify-center tabular-nums"
                  style={selected ? {
                    backgroundColor: '#ffffff',
                    border:          '2px solid var(--ink)',
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
        {action && <div className="ml-auto">{action}</div>}
      </div>

      <div role="tabpanel" className="mt-6">
        {current?.content}
      </div>
    </div>
  );
}
