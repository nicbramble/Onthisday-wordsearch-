import { NextResponse } from 'next/server';

const TZ = 'America/New_York';
function todayNY(): string {
  const d = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  return fmt.format(d);
}

function parseCSV(csvRaw: string): string[][] {
  const csv = csvRaw.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let i = 0, field = '', row: string[] = [], inQuotes = false;
  while (i < csv.length) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i+1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      } else { field += ch; i++; continue; }
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { row.push(field); field=''; i++; continue; }
      if (ch === '\n' || ch === '\r') {
        if (field.length || row.length) { row.push(field); rows.push(row); }
        field=''; row=[];
        if (ch === '\r' && csv[i+1] === '\n') i++;
        i++; continue;
      }
      field += ch; i++; continue;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => (cell ?? '').trim().length));
}

export async function GET() {
  const dateKey = todayNY();
  const url = process.env.CLUES_CSV_URL || null;
  if (!url) return NextResponse.json({ ok:false, reason:'CLUES_CSV_URL not set', dateKey });

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return NextResponse.json({ ok:false, reason:'Fetch failed', status: res.status, dateKey });

  const text = await res.text();
  const table = parseCSV(text);
  const headers = (table[0] || []).map(h => (h ?? '').toString().trim().toLowerCase());
  const di = headers.indexOf('date');
  const ai = headers.indexOf('answer');
  const ti = headers.indexOf('type');
  const pi = headers.indexOf('prompt');

  const sample = table.slice(1, Math.min(10, table.length)).map(r => ({
    date: (r[di] ?? '').trim(),
    type: ti>=0 ? (r[ti] ?? '').trim() : '',
    prompt: pi>=0 ? (r[pi] ?? '').trim() : '',
    answer: ai>=0 ? (r[ai] ?? '').trim() : ''
  }));

  const todays = table.slice(1).filter(r => (r[di] ?? '').trim() === dateKey);

  return NextResponse.json({
    ok: true,
    dateKey,
    headers,
    countRows: Math.max(0, table.length - 1),
    hasTodayRows: todays.length > 0,
    sample
  }, { headers: { 'Cache-Control': 'no-store' } });
}