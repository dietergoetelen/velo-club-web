'use client';

import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  name:         string;
  defaultValue: string;
  rows?:        number;
  placeholder?: string;
}

type Mode = 'write' | 'preview';

export function MarkdownEditor({ name, defaultValue, rows = 10, placeholder }: Props) {
  const [value, setValue] = useState<string>(defaultValue ?? '');
  const [mode,  setMode]  = useState<Mode>('write');
  const ref = useRef<HTMLTextAreaElement>(null);

  function applyEdit(next: string, selStart: number, selEnd: number) {
    setValue(next);
    requestAnimationFrame(() => {
      const ta = ref.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(selStart, selEnd);
    });
  }

  function wrap(left: string, right: string, sample: string) {
    const ta = ref.current;
    if (!ta || mode !== 'write') return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = value.slice(start, end);
    const text  = sel || sample;
    const next  = value.slice(0, start) + left + text + right + value.slice(end);
    applyEdit(next, start + left.length, start + left.length + text.length);
  }

  function prefixLines(prefix: string, sample: string) {
    const ta = ref.current;
    if (!ta || mode !== 'write') return;
    const start  = ta.selectionStart;
    const end    = ta.selectionEnd;
    const before = value.slice(0, start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const block     = value.slice(lineStart, end) || sample;
    const prefixed  = block.split('\n').map(l => `${prefix}${l}`).join('\n');
    const next      = value.slice(0, lineStart) + prefixed + value.slice(end);
    applyEdit(next, lineStart + prefix.length, lineStart + prefixed.length);
  }

  function insertLink() {
    const ta = ref.current;
    if (!ta || mode !== 'write') return;
    const url = window.prompt('Link URL', 'https://') || '';
    if (!url) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = value.slice(start, end) || 'link text';
    const insert = `[${sel}](${url})`;
    const next   = value.slice(0, start) + insert + value.slice(end);
    applyEdit(next, start + 1, start + 1 + sel.length);
  }

  return (
    <div>
      <input type="hidden" name={name} value={value} />

      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex flex-wrap gap-1.5" aria-label="Formatting">
          <ToolBtn onClick={() => wrap('**', '**', 'bold text')}     title="Bold"><b>B</b></ToolBtn>
          <ToolBtn onClick={() => wrap('_',  '_',  'italic text')}   title="Italic"><i>I</i></ToolBtn>
          <ToolBtn onClick={() => prefixLines('## ', 'Heading')}     title="Heading">H</ToolBtn>
          <ToolBtn onClick={insertLink}                              title="Link">🔗</ToolBtn>
          <ToolBtn onClick={() => prefixLines('- ', 'list item')}    title="Bulleted list">•</ToolBtn>
          <ToolBtn onClick={() => prefixLines('1. ', 'numbered item')} title="Numbered list">1.</ToolBtn>
          <ToolBtn onClick={() => prefixLines('> ', 'quote')}        title="Quote">❝</ToolBtn>
        </div>
        <div className="flex gap-1" role="tablist" aria-label="Editor mode">
          <TabBtn active={mode === 'write'}   onClick={() => setMode('write')}>Write</TabBtn>
          <TabBtn active={mode === 'preview'} onClick={() => setMode('preview')}>Preview</TabBtn>
        </div>
      </div>

      {mode === 'write' ? (
        <textarea
          ref={ref}
          rows={rows}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder}
          className="field-input resize-y font-mono text-sm leading-relaxed"
        />
      ) : (
        <div className="field-input markdown-body" style={{ minHeight: `${rows * 1.6}rem` }}>
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-ink-soft text-sm italic">Nothing to preview yet.</p>
          )}
        </div>
      )}

      <p className="text-xs text-ink-soft mt-2 leading-relaxed">
        Tip: use the toolbar, or type{' '}
        <code className="px-1 rounded" style={{ backgroundColor: 'var(--muted)' }}>**bold**</code>,{' '}
        <code className="px-1 rounded" style={{ backgroundColor: 'var(--muted)' }}>_italic_</code>,{' '}
        <code className="px-1 rounded" style={{ backgroundColor: 'var(--muted)' }}>## heading</code>,{' '}
        <code className="px-1 rounded" style={{ backgroundColor: 'var(--muted)' }}>- list</code>,{' '}
        <code className="px-1 rounded" style={{ backgroundColor: 'var(--muted)' }}>[link](url)</code>.
      </p>
    </div>
  );
}

function ToolBtn({
  children, onClick, title,
}: {
  children: React.ReactNode;
  onClick:  () => void;
  title:    string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="w-8 h-8 rounded-md text-sm font-bold flex items-center justify-center transition-colors"
      style={{ border: '2px solid var(--line)', backgroundColor: 'white', color: 'var(--ink)' }}
    >
      {children}
    </button>
  );
}

function TabBtn({
  active, onClick, children,
}: {
  active:   boolean;
  onClick:  () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="px-3 py-1.5 rounded-md font-black text-xs uppercase tracking-wide transition-colors"
      style={{
        border:          '2px solid var(--ink)',
        backgroundColor: active ? 'var(--ink)' : 'white',
        color:           active ? 'white' : 'var(--ink)',
      }}
    >
      {children}
    </button>
  );
}
