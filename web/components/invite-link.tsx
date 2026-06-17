'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { getOrCreateInvite, regenerateInvite } from '@/lib/actions/invites';

/**
 * Captain control for the club's shareable invite link. Starts as a single
 * button (so loading the club page never mints a token); revealing fetches or
 * creates the link, with copy + regenerate. The absolute URL is built client
 * side from the current origin, so it works in any environment.
 */
export function InviteLink({ clubId }: { clubId: string }) {
  const t = useTranslations('clubs.invite');
  const [token,  setToken]  = useState<string | null>(null);
  const [busy,   setBusy]   = useState(false);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const url = token ? `${window.location.origin}/join/${token}` : '';

  async function reveal() {
    setBusy(true); setFailed(false);
    const r = await getOrCreateInvite(clubId);
    if ('token' in r) setToken(r.token); else setFailed(true);
    setBusy(false);
  }

  async function rotate() {
    setBusy(true); setFailed(false); setCopied(false);
    const r = await regenerateInvite(clubId);
    if ('token' in r) setToken(r.token); else setFailed(true);
    setBusy(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
    }
  }

  if (!token) {
    return (
      <div>
        <button type="button" onClick={reveal} disabled={busy} className="btn-secondary text-sm">
          {busy ? t('working') : t('button')}
        </button>
        {failed && <p className="field-error mt-2">{t('failed')}</p>}
      </div>
    );
  }

  return (
    <div>
      <p className="field-label mb-2">{t('label')}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          readOnly
          value={url}
          onFocus={e => e.currentTarget.select()}
          className="field-input flex-1 text-sm font-mono"
        />
        <button type="button" onClick={copy} disabled={busy} className="btn-primary text-sm shrink-0">
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
      <div className="flex items-center gap-3 mt-2">
        <button type="button" onClick={rotate} disabled={busy} className="text-xs font-black text-ink-soft hover:text-accent transition-colors">
          {busy ? t('working') : t('regenerate')}
        </button>
        {failed && <span className="field-error">{t('failed')}</span>}
      </div>
      <p className="text-xs text-ink-soft mt-2">{t('hint')}</p>
    </div>
  );
}
