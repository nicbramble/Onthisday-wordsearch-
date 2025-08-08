import { NextResponse } from 'next/server';
import { makePuzzle } from '@/lib/wordsearch';

type ClueType = 'DEF' | 'SYN' | 'ANT' | 'TRIVIA';
type Row = { date:string; type:ClueType; prompt:string; answer:string };

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

function normalizeAnswer(s: string): string {
  return (s || '').toUpperCase().replace(/[^A-Z]/g, '');
}

export async function GET(req: Request) {
  try {
    const dateKey = todayNY();
    const csvUrl = process.env.CLUES_CSV_URL;

    let clues: Row[] = [];

    if (csvUrl) {
      try {
        const res = await fetch(csvUrl);
        if (res.ok) {
          const csvText = await res.text();
          const table = parseCSV(csvText);
          const headers = table[0].map(h => h.trim().toLowerCase());
          const di = headers.indexOf('date');
          const ti = headers.indexOf('type');
          const pi = headers.indexOf('prompt');
          const ai = headers.indexOf('answer');

          for (let i = 1; i < table.length; i++) {
            const row = table[i];
            if (!row[di]) continue;
            if (row[di].trim() === dateKey) {
              clues.push({
                date: row[di].trim(),
                type: row[ti].trim() as ClueType,
                prompt: row[pi].trim(),
                answer: normalizeAnswer(row[ai].trim())
              });
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch sheet", e);
      }
    }

    // Fallback: if no clues for today
    if (clues.length === 0) {
      clues = [
        { date: dateKey, type: 'TRIVIA', prompt: 'Largest planet in our solar system', answer: 'JUPITER' },
        { date: dateKey, type: 'DEF', prompt: 'Opposite of cold', answer: 'HOT' },
        { date: dateKey, type: 'SYN', prompt: 'Similar to quick', answer: 'FAST' },
        { date: dateKey, type: 'ANT', prompt: 'Opposite of up', answer: 'DOWN' },
      ];
    }

    const words = clues.map(c => c.answer);
    const puzzle = makePuzzle(words, dateKey, 12);

    return NextResponse.json({ date: dateKey, clues, puzzle });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}