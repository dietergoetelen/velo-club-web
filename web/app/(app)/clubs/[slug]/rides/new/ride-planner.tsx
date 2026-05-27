'use client';

import { useActionState, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { saveRide } from '@/lib/actions/rides';
import { upcomingOccurrences, findMatchingSchedule, DAY_NAMES_SHORT } from '@/lib/schedules';
import { RoutePlannerShell, RouteNameInput } from '@/components/route-planner-shell';
import type { ClubSchedule } from '@/lib/types';

type StartPos = { lat: number; lng: number };

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

/**
 * Club ride planner. Thin consumer of `RoutePlannerShell` — provides the
 * club-specific bits: schedule chips, date/time inputs, and the save form
 * that posts to `saveRide`.
 */
export function RidePlanner({
  clubId,
  slug,
  clubName,
  schedules,
  clubStart,
}: {
  clubId:    string;
  slug:      string;
  clubName:  string;
  schedules: ClubSchedule[];
  clubStart: StartPos | null;
}) {
  const t = useTranslations('rides.create');

  const [date,       setDate]       = useState(tomorrow);
  const [time,       setTime]       = useState('08:00');
  const [scheduleId, setScheduleId] = useState<string>('');

  const scheduleLabel = schedules.find(s => s.id === scheduleId)?.label.trim();

  const pickSchedule = (id: string, occurrenceDate: Date) => {
    if (scheduleId === id) {
      setScheduleId('');
      return;
    }
    setScheduleId(id);
    const yyyy = occurrenceDate.getFullYear();
    const mm   = String(occurrenceDate.getMonth() + 1).padStart(2, '0');
    const dd   = String(occurrenceDate.getDate()).padStart(2, '0');
    const hh   = String(occurrenceDate.getHours()).padStart(2, '0');
    const min  = String(occurrenceDate.getMinutes()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);
    setTime(`${hh}:${min}`);
  };

  const onDateChange = (next: string) => {
    setDate(next);
    setScheduleId(findMatchingSchedule(schedules, next, time)?.id ?? '');
  };
  const onTimeChange = (next: string) => {
    setTime(next);
    setScheduleId(findMatchingSchedule(schedules, date, next)?.id ?? '');
  };

  const [saveError, saveAction] = useActionState(saveRide, null);

  return (
    <RoutePlannerShell
      clubStart={clubStart}
      modeBackLink={
        <Link
          href={`/clubs/${slug}`}
          className="eyebrow mb-3 inline-flex items-center gap-1.5 hover:text-accent transition-colors"
        >
          ← {clubName}
        </Link>
      }
      setupExtras={
        <DateTimeFields
          schedules={schedules}
          scheduleId={scheduleId}
          pickSchedule={pickSchedule}
          date={date}
          time={time}
          onDateChange={onDateChange}
          onTimeChange={onTimeChange}
          disabled={false}
        />
      }
      pickingSaveSlot={route => (
        <form action={saveAction} className="space-y-4 pt-1">
          <input type="hidden" name="clubId"      value={clubId} />
          <input type="hidden" name="slug"        value={slug} />
          <input type="hidden" name="distanceKm"  value={route.distance} />
          <input type="hidden" name="elevationM"  value={route.elevation} />
          <input type="hidden" name="coordinates" value={JSON.stringify(route.coordinates)} />
          <input type="hidden" name="date"        value={date} />
          <input type="hidden" name="time"        value={time} />
          <input type="hidden" name="scheduleId"  value={scheduleId} />

          {saveError && <p className="field-error">{saveError}</p>}

          <div>
            <label className="field-label">{t('rideNameLabel')}</label>
            <RouteNameInput
              suggestion={`${scheduleLabel ? `${scheduleLabel} ` : ''}${route.label} (${route.distance}km)`}
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            {t('saveRide')}
          </button>
        </form>
      )}
      editorSaveSlot={s => (
        <form action={saveAction} className="space-y-4 pt-1">
          <input type="hidden" name="clubId"      value={clubId} />
          <input type="hidden" name="slug"        value={slug} />
          <input type="hidden" name="distanceKm"  value={s.distance} />
          <input type="hidden" name="elevationM"  value={s.elevation} />
          <input type="hidden" name="coordinates" value={JSON.stringify(s.polyline)} />
          <input type="hidden" name="date"        value={date} />
          <input type="hidden" name="time"        value={time} />
          <input type="hidden" name="scheduleId"  value={scheduleId} />

          <DateTimeFields
            schedules={schedules}
            scheduleId={scheduleId}
            pickSchedule={pickSchedule}
            date={date}
            time={time}
            onDateChange={onDateChange}
            onTimeChange={onTimeChange}
            disabled={false}
          />

          {saveError && <p className="field-error">{saveError}</p>}

          <div>
            <label className="field-label">{t('rideNameLabel')}</label>
            <RouteNameInput
              suggestion={`${scheduleLabel ? `${scheduleLabel} ` : ''}${s.route.label} (${s.distance}km)`}
            />
          </div>

          <button type="submit" disabled={!s.canSave} className="btn-primary w-full">
            {t('saveRide')}
          </button>
        </form>
      )}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Date / time / schedule fields — club-specific. Used both in the setup
// extras slot and inside the editor's save form.

function DateTimeFields({
  schedules, scheduleId, pickSchedule,
  date, time,
  onDateChange, onTimeChange,
  disabled,
}: {
  schedules:    ClubSchedule[];
  scheduleId:   string;
  pickSchedule: (id: string, occurrenceDate: Date) => void;
  date:         string;
  time:         string;
  onDateChange: (next: string) => void;
  onTimeChange: (next: string) => void;
  disabled:     boolean;
}) {
  const t = useTranslations('rides.create');
  const occurrences = useMemo(() => upcomingOccurrences(schedules, 7), [schedules]);

  return (
    <>
      {occurrences.length > 0 && (
        <div>
          <p className="field-label">{t('useSchedule')}</p>
          <div className="flex flex-wrap gap-2">
            {occurrences.map(({ schedule, date: d }) => {
              const isSelected = scheduleId === schedule.id;
              return (
                <button
                  key={schedule.id}
                  type="button"
                  onClick={() => pickSchedule(schedule.id, d)}
                  disabled={disabled}
                  className="text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                  style={{
                    backgroundColor: isSelected ? 'var(--amber)' : 'white',
                    border:          '2px solid var(--ink)',
                    boxShadow:       isSelected ? '2px 2px 0px var(--ink)' : '2px 2px 0px var(--line)',
                    transform:       isSelected ? 'translate(-1px,-1px)' : 'none',
                    color:           'var(--ink)',
                  }}
                >
                  {DAY_NAMES_SHORT[schedule.day_of_week]} · {schedule.time} · {schedule.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stack on narrow viewports — native date/time inputs need ~150px each
          and the panel is ~360 px on phones, which makes two columns overflow. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="field-label">{t('dateLabel')}</label>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => onDateChange(e.target.value)}
            disabled={disabled}
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label">{t('timeLabel')}</label>
          <input
            type="time"
            value={time}
            onChange={e => onTimeChange(e.target.value)}
            disabled={disabled}
            className="field-input"
          />
        </div>
      </div>
    </>
  );
}
