'use client';
import { addDays } from '@/lib/dates';

/**
 * The last seven days as dots: filled where you logged, hollow where you did
 * not, ringed for today.
 *
 * "🔥 12 days" is a claim; this is evidence. It also makes today's empty dot
 * visible without any red, countdown or guilt — the gap simply has not been
 * filled in yet, which is a far better motivator than a warning.
 */
export default function StreakStrip({
  today, activeDates, current, compact = false,
}: {
  today: string;
  /** 'YYYY-MM-DD' strings with an expense or an explicit no-spend day. */
  activeDates: string[];
  current: number;
  /** Dots only — for cards that show the streak count themselves. */
  compact?: boolean;
}) {
  const active = new Set(activeDates);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="streak">
      {!compact && <div className="streak-head">
        <span className="streak-flame" aria-hidden>🔥</span>
        <span className="streak-count num">{current}</span>
        <span className="streak-unit">day{current === 1 ? '' : 's'}</span>
      </div>}
      <div className="streak-dots" role="img"
           aria-label={`${activeDates.length} of the last 7 days logged`}>
        {days.map((d) => {
          const isToday = d === today;
          const on = active.has(d);
          const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
          return (
            <div key={d} className="streak-day">
              <div className={`streak-dot ${on ? 'on' : ''} ${isToday ? 'today' : ''}`} />
              <span className="streak-letter">{letters[dow]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
