'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('markdown');
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
    const url = window.prompt(t('linkPrompt'), 'https://') || '';
    if (!url) return;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const sel   = value.slice(start, end) || t('linkText');
    const insert = `[${sel}](${url})`;
    const next   = value.slice(0, start) + insert + value.slice(end);
    applyEdit(next, start + 1, start + 1 + sel.length);
  }

  return (
    <div>
      <input type="hidden" name={name} value={value} />

      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex flex-wrap gap-1.5" aria-label={t('formattingLabel')}>
          <ToolBtn onClick={() => wrap('**', '**', t('boldSample'))}     title={t('boldTitle')}><b>B</b></ToolBtn>
          <ToolBtn onClick={() => wrap('_',  '_',  t('italicSample'))}   title={t('italicTitle')}><i>I</i></ToolBtn>
          <ToolBtn onClick={() => prefixLines('## ', t('headingSample'))} title={t('headingTitle')}>H</ToolBtn>
          <ToolBtn onClick={insertLink}                                  title={t('linkTitle')}>🔗</ToolBtn>
          <ToolBtn onClick={() => prefixLines('- ', t('listSample'))}    title={t('bulletTitle')}>•</ToolBtn>
          <ToolBtn onClick={() => prefixLines('1. ', t('numberedSample'))} title={t('numberedTitle')}>1.</ToolBtn>
          <ToolBtn onClick={() => prefixLines('> ', t('quoteSample'))}   title={t('quoteTitle')}>❝</ToolBtn>
        </div>
        <div className="flex gap-1" role="tablist" aria-label={t('modeLabel')}>
          <TabBtn active={mode === 'write'}   onClick={() => setMode('write')}>{t('write')}</TabBtn>
          <TabBtn active={mode === 'preview'} onClick={() => setMode('preview')}>{t('preview')}</TabBtn>
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
            <p className="text-ink-soft text-sm italic">{t('nothingToPreview')}</p>
          )}
        </div>
      )}

      <p className="text-xs text-ink-soft mt-2 leading-relaxed">
        {t('tipPrefix')}
        <code className="px-1 rounded" style={{ backgroundColor: 'var(--muted)' }}>**bold**</code>,{' '}
        <code className="px-1 rounded" style={{ backgroundColor: 'var(--muted)' }}>_italic_</code>,{' '}
        <code className="px-1 rounded" style={{ backgroundColor: 'var(--muted)' }}>## heading</code>,{' '}
        <code className="px-1 rounded" style={{ backgroundColor: 'var(--muted)' }}>- list</code>,{' '}
        <code className="px-1 rounded" style={{ backgroundColor: 'var(--muted)' }}>[link](url)</code>{t('tipSuffix')}
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
