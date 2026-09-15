import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { requireSession, isResponse } from '@/lib/session-guard';
import { sql, getSettings, toDateStr } from '@/lib/db';
import { CATEGORY_MAP, OFF_BUDGET } from '@/lib/constants';

export const dynamic = 'force-dynamic'; // always a live query, never cached

/** Sums of floats drift (0.1+0.2); round to cents so cells hold exact money. */
const money = (n: number): number => Math.round(n * 100) / 100;

interface Row {
  date: string; category: string; subtype: string | null;
  custom_label: string | null; amount: number; note: string | null;
}

/** One sheet per month + a Summary sheet of category totals per month. */
export async function GET() {
  const ctx = await requireSession();
  if (isResponse(ctx)) return ctx;
  const uid = ctx.session.userId;
  const settings = await getSettings(uid);
  const currency = settings.currency || 'MYR';

  const raw = (await sql`
    SELECT date, category, subtype, custom_label, amount::float8 AS amount, note
    FROM expenses WHERE user_id = ${uid} ORDER BY date ASC, created_at ASC`
  ) as unknown as Record<string, unknown>[];
  const rows: Row[] = raw.map((r) => ({
    date: toDateStr(r.date),
    category: String(r.category),
    subtype: (r.subtype as string) ?? null,
    custom_label: (r.custom_label as string) ?? null,
    amount: Number(r.amount),
    note: (r.note as string) ?? null,
  }));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Coffer';
  wb.created = new Date();

  const moneyFmt = `"${currency} "#,##0.00`;

  // Off-budget rows are kept out of the monthly sheets and the Summary, and get
  // their own sheet instead. Mixing them in would misstate every month total.
  const budgeted = rows.filter((r) => !OFF_BUDGET.includes(r.category));
  const careRows = rows.filter((r) => OFF_BUDGET.includes(r.category));

  const byMonth = new Map<string, Row[]>();
  for (const r of budgeted) {
    const m = r.date.slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(r);
  }

  const headers = ['Date', 'Category', 'Subtype', 'Custom Label', 'Amount', 'Note'];

  for (const [month, items] of [...byMonth.entries()].sort()) {
    const ws = wb.addWorksheet(month);
    ws.addRow(headers);
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' },
    };
    ws.views = [{ state: 'frozen', ySplit: 1 }]; // freeze header row

    for (const r of items) {
      ws.addRow([
        r.date,
        CATEGORY_MAP[r.category]?.label ?? r.category,
        r.subtype ?? '',
        r.custom_label ?? '',
        r.amount,
        r.note ?? '',
      ]);
    }
    ws.getColumn(5).numFmt = moneyFmt;

    const totalRow = ws.addRow(['', '', '', 'Total', money(items.reduce((s, r) => s + r.amount, 0)), '']);
    totalRow.font = { bold: true };
    totalRow.getCell(5).numFmt = moneyFmt;

    autofit(ws);
  }

  // ── Summary: rows = category, columns = month ──
  const summary = wb.addWorksheet('Summary');
  const months = [...byMonth.keys()].sort();
  const cats = [...new Set(budgeted.map((r) => r.category))];
  summary.addRow(['Category', ...months, 'Total']);
  summary.getRow(1).font = { bold: true };
  summary.views = [{ state: 'frozen', ySplit: 1 }];

  for (const c of cats) {
    const cells = months.map((m) => money(
      budgeted.filter((r) => r.category === c && r.date.startsWith(m))
              .reduce((s, r) => s + r.amount, 0)));
    summary.addRow([
      CATEGORY_MAP[c]?.label ?? c, ...cells, money(cells.reduce((s, v) => s + v, 0)),
    ]);
  }
  const grand = summary.addRow([
    'All categories',
    ...months.map((m) => money(
      budgeted.filter((r) => r.date.startsWith(m)).reduce((s, r) => s + r.amount, 0))),
    money(budgeted.reduce((s, r) => s + r.amount, 0)),
  ]);
  grand.font = { bold: true };
  for (let i = 2; i <= months.length + 2; i++) summary.getColumn(i).numFmt = moneyFmt;
  autofit(summary);

  // ── Health: its own sheet, never folded into the monthly totals above ──
  if (careRows.length > 0) {
    const care = wb.addWorksheet('Health');
    care.addRow(['Date', 'Type', 'Amount', 'Note']);
    care.getRow(1).font = { bold: true };
    care.getRow(1).fill = {
      type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' },
    };
    care.views = [{ state: 'frozen', ySplit: 1 }];

    for (const r of careRows) {
      care.addRow([
        r.date,
        r.subtype ? r.subtype[0].toUpperCase() + r.subtype.slice(1) : '',
        r.amount,
        r.note ?? '',
      ]);
    }
    care.getColumn(3).numFmt = moneyFmt;

    const sessions = careRows.filter((r) => r.subtype === 'session');
    const travel = careRows.filter((r) => r.subtype === 'travel');

    care.addRow([]);
    const mk = (label: string, items: Row[]) => {
      const row = care.addRow(['', label, money(items.reduce((s, r) => s + r.amount, 0)), '']);
      row.getCell(3).numFmt = moneyFmt;
      return row;
    };
    mk('Sessions', sessions);
    mk('Travel', travel);
    mk('Total', careRows).font = { bold: true };

    autofit(care);
  }

  if (byMonth.size === 0 && careRows.length === 0) {
    const ws = wb.addWorksheet('No data');
    ws.addRow(['No expenses logged yet.']);
  }

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="coffer-${ctx.today}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}

/** Approximate autofit: widest cell per column, clamped. */
function autofit(ws: ExcelJS.Worksheet): void {
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? '').length;
      if (len > max) max = len;
    });
    col.width = Math.min(Math.max(max + 2, 10), 42);
  });
}
