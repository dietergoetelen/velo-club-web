import { getTranslations } from 'next-intl/server';
import { createSchedule, updateSchedule } from '@/lib/actions/schedules';
import { DAY_NAMES } from '@/lib/schedules';
import type { ClubSchedule } from '@/lib/types';
import { DeleteScheduleButton } from './delete-schedule-button';

export async function SchedulesSection({
  clubId,
  slug,
  schedules,
}: {
  clubId:    string;
  slug:      string;
  schedules: ClubSchedule[];
}) {
  const t = await getTranslations('clubs.schedules');

  return (
    <div className="card p-8 space-y-6">
      <div>
        <p className="eyebrow mb-1">{t('heading')}</p>
        <p className="text-ink-soft text-sm">
          {t('intro')}
        </p>
      </div>

      {schedules.length > 0 && (
        <div className="space-y-2">
          {schedules.map(s => (
            <div
              key={s.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg"
              style={{ border: '2px solid var(--line)' }}
            >
              <form action={updateSchedule}>
                <input type="hidden" name="scheduleId" value={s.id} />
                <input type="hidden" name="clubId"     value={clubId} />
                <input type="hidden" name="slug"       value={slug} />
                <input
                  name="label"
                  type="text"
                  required
                  maxLength={20}
                  defaultValue={s.label}
                  aria-label={t('ariaScheduleLabel')}
                  title={t('renameTitle')}
                  className="px-3 py-1 rounded-full text-sm font-black text-center w-32 focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--amber)',
                    border:          '2px solid var(--ink)',
                    color:           'var(--ink)',
                  }}
                />
              </form>
              <span className="text-sm text-ink font-medium flex-1">
                {DAY_NAMES[s.day_of_week]} · {s.time}
              </span>
              <DeleteScheduleButton
                scheduleId={s.id}
                clubId={clubId}
                slug={slug}
                label={s.label}
              />
            </div>
          ))}
        </div>
      )}

      <form action={createSchedule} className="space-y-3">
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="slug"   value={slug} />

        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <div>
            <label className="field-label">{t('labelLabel')}</label>
            <input
              name="label"
              type="text"
              required
              maxLength={20}
              placeholder={t('labelPlaceholder')}
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">{t('dayLabel')}</label>
            <select name="day_of_week" required defaultValue="0" className="field-input">
              {DAY_NAMES.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">{t('timeLabel')}</label>
            <input
              name="time"
              type="time"
              required
              defaultValue="09:00"
              className="field-input"
            />
          </div>
        </div>

        <button type="submit" className="btn-secondary w-full text-sm">
          {t('addSchedule')}
        </button>
      </form>
    </div>
  );
}
