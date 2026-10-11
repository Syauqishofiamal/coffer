import { NextResponse } from 'next/server';
import { requireSession, isResponse } from '@/lib/session-guard';
import { sql, getSettings, getGamification, getBadges, toDateStr } from '@/lib/db';
import { levelProgress } from '@/lib/gamification';
import { monthOf, monthBounds, addDays } from '@/lib/dates';
import { ensureWeeklyQuests, refreshQuests, listQuests } from '@/lib/quests';
import { OFF_BUDGET } from '@/lib/constants';

/** Everything the dashboard needs, in one round trip. */
export async function GET() {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  const uid = ctx.session.userId;
  const month = monthOf(ctx.today);
  const { start, end } = monthBounds(month);

  await ensureWeeklyQuests(uid, ctx.today);
  await refreshQuests(uid, ctx.today);

  const [settings, gam, badges, quests] = await Promise.all([
    getSettings(uid), getGamification(uid), getBadges(uid), listQuests(uid, ctx.today),
  ]);

  // Budget totals count discretionary spending only; health commitments are
  // tracked and exported separately (see OFF_BUDGET in lib/constants).
  const [monthTotal] = (await sql`
    SELECT COALESCE(SUM(amount), 0)::float8 AS total FROM expenses
    WHERE user_id = ${uid} AND date BETWEEN ${start} AND ${end}
      AND category <> ALL(${OFF_BUDGET}::text[])`) as unknown as { total: number }[];

  const byCategory = (await sql`
    SELECT category, subtype, COALESCE(SUM(amount), 0)::float8 AS total, COUNT(*)::int AS n
    FROM expenses WHERE user_id = ${uid} AND date BETWEEN ${start} AND ${end}
      AND category <> ALL(${OFF_BUDGET}::text[])
    GROUP BY category, subtype ORDER BY total DESC`) as unknown as
    { category: string; subtype: string | null; total: number; n: number }[];

  // The off-budget section gets its own month total, split by type.
  const careRows = (await sql`
    SELECT subtype, COALESCE(SUM(amount), 0)::float8 AS total, COUNT(*)::int AS n
    FROM expenses WHERE user_id = ${uid} AND date BETWEEN ${start} AND ${end}
      AND category = ANY(${OFF_BUDGET}::text[])
    GROUP BY subtype ORDER BY total DESC`) as unknown as
    { subtype: string | null; total: number; n: number }[];

  const todayRows = (await sql`
    SELECT id, date, category, custom_label, subtype, amount::float8 AS amount, note, created_at
    FROM expenses WHERE user_id = ${uid} AND date = ${ctx.today}
    ORDER BY created_at DESC`) as unknown as Record<string, unknown>[];

  const [todayTotal] = (await sql`
    SELECT COALESCE(SUM(amount), 0)::float8 AS total FROM expenses
    WHERE user_id = ${uid} AND date = ${ctx.today}
      AND category <> ALL(${OFF_BUDGET}::text[])`) as unknown as { total: number }[];

  const [noSpendToday] = (await sql`
    SELECT COUNT(*)::int AS n FROM no_spend_days
    WHERE user_id = ${uid} AND date = ${ctx.today}`) as unknown as { n: number }[];

  // Days in the trailing week with any activity, for the streak strip. An
  // explicit no-spend day counts exactly like a logged expense.
  const weekAgo = addDays(ctx.today, -6);
  const activeRows = (await sql`
    SELECT DISTINCT d FROM (
      SELECT date AS d FROM expenses
        WHERE user_id = ${uid} AND date BETWEEN ${weekAgo} AND ${ctx.today}
      UNION
      SELECT date AS d FROM no_spend_days
        WHERE user_id = ${uid} AND date BETWEEN ${weekAgo} AND ${ctx.today}
    ) t ORDER BY d`) as unknown as { d: unknown }[];

  const recurring = (await sql`
    SELECT id, category, custom_label, last_amount::float8 AS last_amount, last_logged
    FROM recurring WHERE user_id = ${uid} ORDER BY category`) as unknown as Record<string, unknown>[];

  const budget = Number(settings.monthly_budget);
  return NextResponse.json({
    today: ctx.today,
    isDemo: ctx.session.isDemo,
    settings: {
      monthlyBudget: budget,
      currency: settings.currency,
      locale: settings.locale,
      soundEnabled: settings.sound_enabled,
      hapticsEnabled: settings.haptics_enabled,
    },
    budget: {
      total: budget,
      spent: monthTotal.total,
      remaining: budget - monthTotal.total,
      // Clamped 0..1 for the gauge fill; overspend is shown as a separate note,
      // never as a red alarm.
      fraction: budget > 0 ? Math.max(0, Math.min(1, (budget - monthTotal.total) / budget)) : 0,
      over: monthTotal.total > budget,
    },
    xp: { total: gam.total_xp, ...levelProgress(gam.total_xp) },
    streak: {
      current: gam.current_streak,
      longest: gam.longest_streak,
      lastActive: gam.last_active_date,
      freezeAvailable: gam.freezes_used_month !== month,
      activeDates: activeRows.map((r) => toDateStr(r.d)),
    },
    badges,
    quests,
    todayTotal: todayTotal.total,
    noSpendToday: noSpendToday.n > 0,
    todayExpenses: todayRows.map((r) => ({ ...r, date: toDateStr(r.date) })),
    byCategory,
    care: {
      total: careRows.reduce((sum, r) => sum + r.total, 0),
      bySubtype: careRows,
    },
    recurring: recurring.map((r) => ({ ...r, last_logged: r.last_logged ? toDateStr(r.last_logged) : null })),
  });
}
