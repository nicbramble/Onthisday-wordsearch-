import { NextResponse } from 'next/server';

const TZ = 'America/New_York';
function todayNY(): string {
  const d = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(d);
}

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let i = 0, field = '', row: string[] = [], inQuotes = false;
  while (i < csv.length) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      } else { field += ch; i++; continue; }
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { row.push(field); field = ''; i++; continue; }
      if (ch === '\n' || ch === '\r') {
        if (field.length || row.length) { row.push(field); rows.push(row); }
        field = ''; row = [];
        if (ch === '\r' && csv[i+1] === '\n') i++;
        i++; continue;
      }
      field += ch; i++; continue;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export async function GET() {
  const dateKey = todayNY();
  const url = process.env.CLUES_CSV_URL || null;
  if (!url) return NextResponse.json({ ok: false, reason: 'CLUES_CSV_URL not set', dateKey });

  const res = await fetch(url);
  if (!res.ok) return NextResponse.json({ ok: false, reason: 'Fetch failed', status: res.status, dateKey });

  const text = await res.text();
  const table = parseCSV(text);
  const headers = (table[0] || []).map(h => h.trim().toLowerCase());
  const di = headers.indexOf('date');
  const ai = headers.indexOf('answer');

  const sample = table.slice(1, Math.min(table.length, 8)).map(r => ({
    date: r[di], answer: r[ai]
  }));

  const todays = table.slice(1).filter(r => (r[di]||'').trim() === dateKey);

  return NextResponse.json({
    ok: true,
    dateKey,
    hasTodayRows: todays.length > 0,
    sample,            // first few rows so you can verify headers/values
    countTotal: table.length - 1,
    headers
  });
}