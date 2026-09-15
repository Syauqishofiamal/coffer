import { NextResponse } from 'next/server';
import { requireSession, isResponse } from '@/lib/session-guard';
import { sql, toDateStr } from '@/lib/db';
import { CATEGORY_MAP, OFF_BUDGET } from '@/lib/constants';

export const dynamic = 'force-dynamic'; // live query, never cached

/** Escapes a CSV field: quotes, commas, newlines, and leading =+-@ (injection). */
function esc(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;

  const rows = (await sql`
    SELECT date, category, subtype, custom_label, amount::float8 AS amount, note
    FROM expenses WHERE user_id = ${ctx.session.userId}
    ORDER BY (category = ANY(${OFF_BUDGET}::text[])), date ASC, created_at ASC`
  ) as unknown as Record<string, unknown>[];

  // A CSV is one flat table, so the off-budget split is carried by a Section
  // column rather than a second sheet. Sorting or filtering on it reproduces
  // the separation the XLSX gets from its own sheet.
  const lines = ['Section,Date,Category,Subtype,Custom Label,Amount,Note'];
  for (const r of rows) {
    const offBudget = OFF_BUDGET.includes(String(r.category));
    lines.push([
      offBudget ? 'Health' : 'Budget',
      toDateStr(r.date),
      CATEGORY_MAP[String(r.category)]?.label ?? r.category,
      r.subtype ?? '',
      r.custom_label ?? '',
      Number(r.amount).toFixed(2),
      r.note ?? '',
    ].map(esc).join(','));
  }

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="coffer-${ctx.today}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
