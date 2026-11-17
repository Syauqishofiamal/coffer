'use client';
import { useId } from 'react';
import { CATEGORY_MAP, CARE_SUBTYPES } from '@/lib/constants';
import { BADGES } from '@/lib/badges';
import { XP_QUEST_COMPLETE } from '@/lib/gamification';
import { formatMoney } from '@/lib/dates';
import EntryList from './EntryList';
import StreakStrip from './StreakStrip';
import type { AppState, Expense } from '@/lib/types';

/** Time-of-day greeting. Uses the device clock, which is the user's own. */
function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * The budget as a ring that drains as you spend: a resource meter, like a
 * health or mana bar, never a debt counter. Over budget the ring simply sits
 * full in gold — calm, not an alarm.
 */
function BudgetRing({ fraction, over, children }: {
  fraction: number; over: boolean; children: React.ReactNode;
}) {
  // useId() contains ':' or '«»', which break SVG url(#…) references.
  const gradId = `ring-${useId().replace(/[^\w-]/g, '')}`;
  const R = 84;
  const C = 2 * Math.PI * R;
  // `fraction` is the share of the budget still LEFT, so the ring shrinks as
  // money is spent.
  const left = over ? 1 : Math.max(0, Math.min(1, fraction));

  return (
    <div className="ring-wrap">
      <svg className="ring" viewBox="0 0 200 200" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--accent)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--ring-end)' }} />
          </linearGradient>
        </defs>
        <circle className="ring-track" cx="100" cy="100" r={R} />
        <circle
          className={`ring-fill ${over ? 'ring-over' : ''}`}
          cx="100" cy="100" r={R}
          strokeDasharray={C}
          strokeDashoffset={C * (1 - left)}
          // CSS variables only resolve in style, not in SVG attributes.
          style={{
            stroke: over ? 'var(--gold)' : `url(#${gradId})`,
            ['--ring-c' as string]: C,
          }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}

/** Section heading with an icon and an optional right-hand counter. */
function SecHead({ icon, title, meta }: { icon: string; title: string; meta?: React.ReactNode }) {
  return (
    <div className="sec-head">
      <span className="sec-ico" aria-hidden>{icon}</span>
      <h2 className="sec-title">{title}</h2>
      {meta != null && <span className="sec-meta num">{meta}</span>}
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

  const pctUsed = budget.total > 0
    ? Math.round((budget.spent / budget.total) * 100) : 0;

  const monthLabel = new Date(`${state.today}T00:00:00Z`)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();

  const questsDone = state.quests.filter((q) => q.completed).length;
  const badgesOwned = BADGES.filter((b) => state.badges.includes(b.slug)).length;
  const catMax = state.byCategory[0]?.total || 1;

  return (
    <div className="screen">
      {/* ── HUD: who you are, what's left, how far you've come ── */}
      <section className="hud" aria-label="Overview">
        <div className="hud-top">
          <div>
            <div className="home-month">{monthLabel}</div>
            <div className="home-greeting">{greeting()} 👋</div>
          </div>
          <div className="lv-badge" aria-label={`Level ${xp.level}`}>
            <span className="lv-badge-label">LV</span>
            <span className="lv-badge-num num">{xp.level}</span>
          </div>
        </div>

        <BudgetRing fraction={budget.fraction} over={budget.over}>
          <span className="ring-label">{budget.over ? 'Over by' : 'Left this month'}</span>
          <span className="ring-value num">{formatMoney(Math.abs(budget.remaining), cur)}</span>
          <span className="ring-sub num">
            {budget.over
              ? `Resets to ${formatMoney(budget.total, cur)}`
              : `of ${formatMoney(budget.total, cur)}`}
          </span>
        </BudgetRing>

        <div className="hud-stats">
          <div className="hud-stat">
            <span className="stat-label">Spent</span>
            <span className="hud-stat-val num">{formatMoney(budget.spent, cur)}</span>
          </div>
          <div className="hud-stat">
            <span className="stat-label">Used</span>
            <span className="hud-stat-val num">{pctUsed}%</span>
          </div>
          <div className="hud-stat">
            <span className="stat-label">Today</span>
            <span className="hud-stat-val num">{formatMoney(state.todayTotal, cur)}</span>
          </div>
        </div>

        <div className="hud-xp">
          <div className="hud-xp-row">
            <span className="hud-xp-lv">⚡ Level {xp.level}</span>
            <span className="tiny num">
              {xp.xpIntoLevel}<span className="faint"> / {xp.xpForNextLevel} XP</span>
            </span>
          </div>
          <div className="glow-track">
            <div className="glow-fill" style={{ width: `${xp.progress * 100}%` }} />
          </div>
        </div>

        <div className="hud-streak">
          <StreakStrip today={state.today}
                       activeDates={streak.activeDates ?? []}
                       current={streak.current} />
          <span className={`freeze ${streak.freezeAvailable ? 'freeze-ready' : ''}`}>
            ❄️ {streak.freezeAvailable ? 'Freeze ready' : 'Freeze used'}
          </span>
        </div>
      </section>

      {/* ── Weekly quests ── */}
      {state.quests.length > 0 && (
        <section className="block">
          <SecHead icon="⚔️" title="Weekly quests" meta={`${questsDone}/${state.quests.length}`} />
          <div className="quest-list">
            {state.quests.map((q) => {
              const pct = q.target > 0 ? Math.min(1, q.progress / q.target) : 0;
              const fmt = (n: number) => Math.round(n * 100) / 100;
              return (
                <div key={q.slug} className={`quest ${q.completed ? 'quest-done' : ''}`}>
                  <div className="spread">
                    <span className="quest-title">
                      {q.completed && <span aria-hidden>✅ </span>}{q.title}
                    </span>
                    <span className="quest-xp num">+{XP_QUEST_COMPLETE} XP</span>
                  </div>
                  <div className="quest-bar">
                    <div className="glow-track glow-track-thin">
                      <div className="glow-fill" style={{ width: `${pct * 100}%` }} />
                    </div>
                    <span className="tiny faint num">{fmt(q.progress)}/{fmt(q.target)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Today ── */}
      <section className="block card">
        <SecHead icon="📅" title="Today" meta={formatMoney(state.todayTotal, cur)} />
        <EntryList expenses={state.todayExpenses} currency={cur}
                   onEdit={onEdit} onDelete={onDelete} />
      </section>

      {/* ── Category breakdown: one colour per category so they're tellable apart ── */}
      {state.byCategory.length > 0 && (
        <section className="block card">
          <SecHead icon="📊" title="This month by category" />
          {state.byCategory.map((c, i) => {
            const def = CATEGORY_MAP[c.category];
            return (
              <div key={`${c.category}-${c.subtype ?? ''}`} className="cat-row"
                   style={{ ['--cat' as string]: `var(--cat-${(i % 6) + 1})` }}>
                <span className="cat-row-ico" aria-hidden>{def?.icon}</span>
                <div className="cat-row-main">
                  <div className="spread">
                    <span className="small">
                      {def?.label ?? c.category}
                      {c.subtype && <span className="faint"> · {c.subtype}</span>}
                    </span>
                    <span className="small num">{formatMoney(c.total, cur)}</span>
                  </div>
                  <div className="cat-bar">
                    <div className="cat-bar-fill" style={{ width: `${(c.total / catMax) * 100}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ── Health: tracked, deliberately outside the budget ── */}
      {state.care && state.care.total > 0 && (
        <section className="block card">
          <SecHead icon="🩺" title="Health" meta={formatMoney(state.care.total, cur)} />
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

      {/* ── Badges: a trophy shelf ── */}
      <section className="block card">
        <SecHead icon="🏅" title="Badges" meta={`${badgesOwned}/${BADGES.length}`} />
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
