'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

type Props = {
  name?:       string;  // form field name for the file (default: 'avatar')
  removeName?: string;  // form field name for the remove flag (default: 'avatar_remove')
  label?:      string;  // field label (default: translated 'Photo')
  initialUrl?: string;  // existing avatar URL when editing
  initials?:   string;  // shown when no avatar is set
  accent?:     string;  // background color for the placeholder
};

export function AvatarUpload({
  name       = 'avatar',
  removeName = 'avatar_remove',
  label,
  initialUrl,
  initials   = '?',
  accent     = '#FBBF24',
}: Props) {
  const t = useTranslations('avatar');
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview]         = useState<string | null>(null);
  const [removed, setRemoved]         = useState(false);
  const [error,   setError]           = useState<string | null>(null);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  const shownUrl = preview ?? (removed ? null : initialUrl ?? null);
  const labelText = label ?? t('defaultLabel');

  function pickFile() {
    inputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError(t('tooLarge'));
      e.target.value = '';
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setRemoved(false);
  }

  function onRemove() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
    if (initialUrl) setRemoved(true);
  }

  return (
    <div>
      <label className="field-label">{labelText}</label>

      <div className="flex items-center gap-5 mt-1">
        <div
          className="w-20 h-20 rounded-full shrink-0 flex items-center justify-center overflow-hidden font-heading font-black text-2xl text-ink"
          style={{
            backgroundColor: shownUrl ? 'transparent' : accent,
            border:    '2px solid var(--ink)',
            boxShadow: '3px 3px 0px var(--ink)',
          }}
          aria-hidden="true"
        >
          {shownUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={shownUrl} alt="" className="w-full h-full object-cover" />
            : initials}
        </div>

        <div className="flex flex-col gap-2">
          <button type="button" onClick={pickFile} className="btn-secondary text-sm">
            {shownUrl ? t('changePhoto') : t('uploadPhoto')}
          </button>
          {shownUrl && (
            <button type="button" onClick={onRemove} className="btn-ghost text-xs">
              {t('remove')}
            </button>
          )}
        </div>
      </div>

      {error && <p className="field-error mt-2">{error}</p>}
      <p className="text-xs text-ink-soft mt-2">{t('hint')}</p>

      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/jpeg,image/png,image/webp"
        onChange={onFileChange}
        className="hidden"
      />
      {removed && <input type="hidden" name={removeName} value="1" />}
    </div>
  );
}
