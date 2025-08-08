import { NextResponse } from 'next/server';
import { generateWordSearch, normalize } from '../../../lib/wordsearch';

type Row = { date: string; type?: string; prompt?: string; answer: string };

const TZ = 'America/New_York';
const MIN_WORDS = 8;
const MAX_WORDS = 12;
const MAX_ANSWER_LEN = 18;

function todayNY(): string {
  const d = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  });
  return fmt.format(d); // YYYY-MM-DD
}

// CSV parser: handles quotes, commas, \r\n, and BOM
function parseCSV(csvRaw: string): string[][] {
  const csv = csvRaw.replace(/^\uFEFF/, ''); // strip BOM
  const rows: string[][] = [];
  let i = 0, field = '', row: string[] = [], inQuotes = false;
  while (i < csv.length) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { row.push(field); field = ''; i++; continue; }
      if (ch === '\n' || ch === '\r') {
        if (field.length || row.length) { row.push(field); rows.push(row); }
        field = ''; row = [];
        if (ch === '\r' && csv[i + 1] === '\n') i++; // swallow \n after \r
        i++; continue;
      }
      field += ch; i++; continue;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(cell => (cell ?? '').trim().length));
}

function tableToRows(table: string[][]): Row[] {
  if (!table.length) return [];
  const headers = table[0].map(h => (h ?? '').toString().trim().toLowerCase());
  const di = headers.indexOf('date');
  const ti = headers.indexOf('type');
  const pi = headers.indexOf('prompt');
  const ai = headers.indexOf('answer');
  if (di < 0 || ai < 0) return [];

  const out: Row[] = [];
  for (let r = 1; r < table.length; r++) {
    const row = table[r]; if (!row) continue;
    const date = (row[di] ?? '').trim();
    const answer = (row[ai] ?? '').trim();
    if (!date || !answer) continue;
    out.push({
      date,
      type: ti >= 0 ? (row[ti] ?? '').trim() : undefined,
      prompt: pi >= 0 ? (row[pi] ?? '').trim() : undefined,
      answer
    });
  }
  return out;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateKey = searchParams.get('date') || todayNY();

    const csvUrl = process.env.CLUES_CSV_URL;
    let words: string[] = [];
    let source: 'sheet' | 'fallback' = 'fallback';

    if (csvUrl) {
      const res = await fetch(csvUrl, { next: { revalidate: 0 } });
      if (res.ok) {
        const csvText = await res.text();
        const rows = tableToRows(parseCSV(csvText)).filter(r => r.date === dateKey);

        const normalized = rows
          .map(r => normalize(r.answer))
          .filter(w => w.length >= 3 && w.length <= MAX_ANSWER_LEN);

        const unique = Array.from(new Set(normalized));
        if (unique.length) {
          // clamp to 8–12 words
          const count = Math.max(MIN_WORDS, Math.min(MAX_WORDS, unique.length));
          words = unique.slice(0, count);
          source = 'sheet';
        }
      }
    }

    if (!words.length) {
      words = ['HISTORY','PUZZLE','WORD','SEARCH','DAILY','TRIVIA','CLUES','GAME','TIMELINE','EVENT'];
      source = 'fallback';
    }

    const puzzle = generateWordSearch(words, dateKey);
    const outWords = puzzle.allWords?.length
      ? puzzle.allWords
      : Array.from(new Set(puzzle.placed.map(p => p.word)));

    return NextResponse.json({
      dateKey,
      source,           // <-- 'sheet' when your rows matched today
      grid: puzzle.grid,
      placed: puzzle.placed,
      words: outWords
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}