import { createSchedule, deleteSchedule } from '@/lib/actions/schedules';
import { DAY_NAMES } from '@/lib/schedules';
import type { ClubSchedule } from '@/lib/types';

export function SchedulesSection({
  clubId,
  slug,
  schedules,
}: {
  clubId:    string;
  slug:      string;
  schedules: ClubSchedule[];
}) {
  return (
    <div className="card p-8 space-y-6">
      <div>
        <p className="eyebrow mb-1">Schedules</p>
        <p className="text-ink-soft text-sm">
          Each row is a weekly slot. Add separate rows for staggered groups (A leaves later, B earlier, etc.).
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
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-black"
                style={{
                  backgroundColor: 'var(--amber)',
                  border:          '2px solid var(--ink)',
                  color:           'var(--ink)',
                }}
              >
                {s.label}
              </span>
              <span className="text-sm text-ink font-medium flex-1">
                {DAY_NAMES[s.day_of_week]} · {s.time}
              </span>
              <form action={deleteSchedule}>
                <input type="hidden" name="scheduleId" value={s.id} />
                <input type="hidden" name="clubId"     value={clubId} />
                <input type="hidden" name="slug"       value={slug} />
                <button
                  type="submit"
                  className="text-xs text-ink-soft hover:text-ink transition-colors font-black"
                  aria-label={`Delete ${s.label} schedule`}
                >
                  ✕
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <form action={createSchedule} className="space-y-3">
        <input type="hidden" name="clubId" value={clubId} />
        <input type="hidden" name="slug"   value={slug} />

        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <div>
            <label className="field-label">Label</label>
            <input
              name="label"
              type="text"
              required
              maxLength={20}
              placeholder="A"
              className="field-input"
            />
          </div>
          <div>
            <label className="field-label">Day</label>
            <select name="day_of_week" required defaultValue="0" className="field-input">
              {DAY_NAMES.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Time</label>
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
          + Add schedule
        </button>
      </form>
    </div>
  );
}
