'use client';
import { CATEGORY_MAP, CARE_SUBTYPES } from '@/lib/constants';
import { BADGES } from '@/lib/badges';
import { XP_QUEST_COMPLETE } from '@/lib/gamification';
import { formatMoney } from '@/lib/dates';
import EntryList from './EntryList';
import StreakStrip from './StreakStrip';
import Mascot, { type Mood } from './Mascot';
import type { AppState, Expense } from '@/lib/types';

/** Time-of-day greeting. Uses the device clock, which is the user's own. */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Each quest gets a medallion icon and a pastel card colour. */
const QUEST_ICON: Record<string, string> = { log_days: '📅', cook: '🍳', transport: '🚗' };
const QUEST_TONE = ['tone-yellow', 'tone-green', 'tone-lavender'];

/** Section heading with an optional count bubble and right-hand note. */
function SecHead({ title, count, note }: { title: string; count?: number; note?: string }) {
  return (
    <div className="sec-head">
      <h2 className="sec-title">{title}</h2>
      {count != null && <span className="count-bubble num">{count}</span>}
      {note && <span className="sec-note">{note}</span>}
    </div>
  );
}

/**
 * One bar per day of the month. Future days are drawn faint so the month's
 * shape is visible from day one; today is highlighted.
 */
function DailyBars({ today, daily }: { today: string; daily: AppState['daily'] }) {
  const [y, m, d] = today.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const byDay = new Map(daily.map((r) => [Number(r.date.slice(8, 10)), r.total]));
  const max = Math.max(1, ...daily.map((r) => r.total));
  const ticks = [1, 8, 15, 22, 29].filter((t) => t <= daysInMonth);

  return (
    <div className="bars-wrap">
      <div className="bars" role="img"
           aria-label={`Daily spending for days 1 to ${d} of this month`}>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const v = byDay.get(day) ?? 0;
          const cls = day > d ? 'bar bar-future' : day === d ? 'bar bar-today' : 'bar';
          // Empty past days keep a small stub so the rhythm of the month reads.
          const h = day > d ? 18 : Math.max(8, (v / max) * 100);
          return <span key={day} className={cls} style={{ height: `${h}%` }} />;
        })}
      </div>
      <div className="bars-axis">
        {ticks.map((t) => (
          <span key={t} style={{ left: `${((t - 0.5) / daysInMonth) * 100}%` }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({
  state, onEdit, onDelete,
}: {
  state: AppState;
  onEdit: (e: Expense, amount: number, note: string) => void;
  onDelete: (e: Expense) => void;
}) {
  const { budget, xp, streak, settings } = state;
  const cur = settings.currency;

  const pctLeft = budget.total > 0 ? Math.round(budget.fraction * 100) : 0;
  const monthLabel = new Date(`${state.today}T00:00:00Z`)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const activeToday = state.todayExpenses.length > 0 || state.noSpendToday;
  const mood: Mood = budget.over ? 'calm' : activeToday ? 'cheer' : 'happy';
  const questsDone = state.quests.filter((q) => q.completed).length;
  const badgesOwned = BADGES.filter((b) => state.badges.includes(b.slug)).length;

  return (
    <div className="screen home">
      {/* ── Top bar: avatar + resource pills ── */}
      <header className="topbar">
        <div className="avatar"><Mascot head mood={mood} /></div>
        <div className="topbar-greet">
          <div className="topbar-month">{monthLabel}</div>
          <div className="topbar-hello">{greeting()}</div>
        </div>
        <div className="res-pills">
          <span className="res-pill" aria-label={`${xp.total} XP`}>
            <span aria-hidden>⚡</span><b className="num">{xp.total.toLocaleString()}</b>
          </span>
          <span className="res-pill" aria-label={`${streak.current}-day streak`}>
            <span aria-hidden>🔥</span><b className="num">{streak.current}</b>
          </span>
        </div>
      </header>

      {/* ── Budget headline ── */}
      <section className="headline">
        <div>
          <h1 className="headline-title">{budget.over ? 'Over budget by' : 'Left this month'}</h1>
          <div className="headline-amount num">{formatMoney(Math.abs(budget.remaining), cur)}</div>
        </div>
        <div className="headline-pct">
          <span className="headline-pct-num num">{pctLeft}<sup>%</sup></span>
          <span className="headline-pct-sub num">
            {budget.over ? `resets to ${formatMoney(budget.total, cur)}` : `of ${formatMoney(budget.total, cur)}`}
          </span>
        </div>
      </section>

      {/* ── Daily spending chart ── */}
      <section className="chart-card">
        <div className="spread">
          <h2 className="card-h">Daily spending</h2>
          <span className="pill-outline num">Today {formatMoney(state.todayTotal, cur)}</span>
        </div>
        <DailyBars today={state.today} daily={state.daily ?? []} />
      </section>

      {/* ── Categories: horizontal tiles ── */}
      {state.byCategory.length > 0 && (
        <section className="block">
          <SecHead title="This month" count={state.byCategory.length} note="by category" />
          <div className="cat-scroll">
            {state.byCategory.map((c, i) => {
              const def = CATEGORY_MAP[c.category];
              return (
                <div key={`${c.category}-${c.subtype ?? ''}`} className="cat-card"
                     style={{ ['--cat' as string]: `var(--cat-${(i % 6) + 1})` }}>
                  <span className="cat-card-ico" aria-hidden>{def?.icon}</span>
                  <span className="cat-card-name">
                    {def?.label ?? c.category}{c.subtype ? ` · ${c.subtype}` : ''}
                  </span>
                  <span className="cat-card-amt num">{formatMoney(c.total, cur)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Weekly quests as challenge cards ── */}
      {state.quests.length > 0 && (
        <section className="block">
          <SecHead title="Weekly quests" count={state.quests.length}
                   note={`${questsDone} done`} />
          <div className="quest-list">
            {state.quests.map((q, i) => {
              const fmt = (n: number) => Math.round(n * 100) / 100;
              const pct = q.target > 0 ? Math.min(1, q.progress / q.target) : 0;
              return (
                <div key={q.slug}
                     className={`quest ${QUEST_TONE[i % QUEST_TONE.length]} ${q.completed ? 'quest-done' : ''}`}>
                  <span className="quest-medal" aria-hidden>
                    {q.completed ? '✅' : QUEST_ICON[q.slug] ?? '🎯'}
                  </span>
                  <div className="quest-main">
                    <div className="quest-top">
                      <span className="quest-title">{q.title}</span>
                      <span className="reward-pill num">⚡ +{XP_QUEST_COMPLETE}</span>
                    </div>
                    <div className="quest-sub num">
                      {q.completed ? 'Completed' : `${fmt(q.progress)} / ${fmt(q.target)}`}
                    </div>
                    <div className="quest-track">
                      <div className="quest-fill" style={{ width: `${pct * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Streak + level, with the mascot ── */}
      <section className="feature-card">
        <div className="feature-pills">
          <span className="mini-pill num">⚡ Level {xp.level}</span>
          <span className={`mini-pill ${streak.freezeAvailable ? 'mini-pill-ice' : ''}`}>
            ❄️ {streak.freezeAvailable ? 'Freeze ready' : 'Freeze used'}
          </span>
          <span className="flame-btn" aria-hidden>🔥</span>
        </div>
        <div className="feature-body">
          <Mascot mood={mood} className="feature-mascot" />
          <div className="feature-text">
            <div className="feature-kicker">
              {activeToday ? 'Logged today, nice!' : 'Log something today'}
            </div>
            <div className="feature-title num">
              {streak.current}-day streak
            </div>
            <div className="feature-sub num">
              {xp.xpIntoLevel} / {xp.xpForNextLevel} XP to level {xp.level + 1}
            </div>
            <div className="quest-track feature-track">
              <div className="quest-fill" style={{ width: `${xp.progress * 100}%` }} />
            </div>
          </div>
        </div>
        <StreakStrip compact today={state.today}
                     activeDates={streak.activeDates ?? []} current={streak.current} />
      </section>

      {/* ── Today ── */}
      <section className="block card">
        <SecHead title="Today" note={formatMoney(state.todayTotal, cur)} />
        <EntryList expenses={state.todayExpenses} currency={cur}
                   onEdit={onEdit} onDelete={onDelete} />
      </section>

      {/* ── Health: tracked, deliberately outside the budget ── */}
      {state.care && state.care.total > 0 && (
        <section className="block card">
          <SecHead title="Health" note={formatMoney(state.care.total, cur)} />
          <p className="tiny faint care-note">This month, outside your budget.</p>
          {state.care.bySubtype.map((r) => {
            const def = CARE_SUBTYPES.find((c) => c.slug === r.subtype);
            return (
              <div key={r.subtype ?? 'none'} className="spread care-row">
                <span className="small">
                  {def?.icon ?? '•'} {def?.label ?? 'Other'}
                  <span className="faint"> · {r.n}</span>
                </span>
                <span className="small num">{formatMoney(r.total, cur)}</span>
              </div>
            );
          })}
        </section>
      )}

      {/* ── Badges ── */}
      <section className="block card">
        <SecHead title="Badges" count={badgesOwned} note={`of ${BADGES.length}`} />
        <div className="badge-grid">
          {BADGES.map((b) => {
            const owned = state.badges.includes(b.slug);
            return (
              <div key={b.slug} className={`badge ${owned ? 'badge-owned' : 'badge-locked'}`}
                   title={owned ? b.label : b.hint}>
                <span className="badge-ico" aria-hidden>{b.icon}</span>
                <span className="badge-label">{b.label}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
