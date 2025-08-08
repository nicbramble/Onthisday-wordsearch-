'use client';
import { useEffect, useState } from 'react';

type PlacedWord = { word: string; coords: [number, number][] };
type Clue = {
  number: number;
  type?: string;
  prompt: string;
  answerNormalized: string;
  answerDisplay: string;
};
type DailyRes = {
  dateKey: string;
  source?: 'sheet'|'fallback';
  grid: string[][];
  placed: PlacedWord[];
  words?: string[];
  clues?: Clue[];
};

function k(r:number,c:number){ return `${r},${c}`; }
function norm(s:string){ return (s||'').toUpperCase().replace(/[^A-Z]/g,''); }

export default function Home() {
  const [data, setData] = useState<DailyRes | null>(null);

  // game state
  const [foundCoords, setFoundCoords] = useState<Set<string>>(new Set());
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());

  // tap-to-select path (current attempt)
  const [path, setPath] = useState<[number, number][]>([]);

  // guesses for riddles (type then find in grid)
  const [guesses, setGuesses] = useState<Record<number, string>>({});

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/daily', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    })();
  }, []);

  // words safety (in case API ever omits `words`)
  const words: string[] = Array.isArray(data?.words) && data!.words!.length
    ? data!.words!
    : Array.from(new Set((data?.placed ?? []).map(p => p.word)));

  // ---- TAP-TO-SELECT LOGIC ----

  // Is cell B exactly the next cell after A in direction [dr,dc]?
  function isNext(a:[number,number], b:[number,number], dir:[number,number]) {
    return b[0] === a[0] + dir[0] && b[1] === a[1] + dir[1];
  }

  // Given first two cells, lock the direction (8-way unit step)
  function directionOf(a:[number,number], b:[number,number]): [number,number] | null {
    const dr = Math.sign(b[0] - a[0]);
    const dc = Math.sign(b[1] - a[1]);
    if (dr === 0 && dc === 0) return null;
    return [dr as 0|-1|1, dc as 0|-1|1];
  }

  // When user taps a cell:
  function onTapCell(r:number,c:number) {
    const cell: [number,number] = [r,c];
    if (path.length === 0) {
      setPath([cell]);
      return;
    }
    if (path.length === 1) {
      // allow any second tap (even diagonal)
      const next = [...path, cell];
      setPath(next);
      checkForWord(next);
      return;
    }

    // we have >= 2 cells: enforce direction and adjacency
    const dir = directionOf(path[0], path[1]);
    if (!dir) {
      // degenerate, reset start
      setPath([cell]);
      return;
    }
    const last = path[path.length - 1];
    if (isNext(last, cell, dir)) {
      const next = [...path, cell];
      setPath(next);
      checkForWord(next);
    } else {
      // not the next in line — start a fresh path from this tap
      setPath([cell]);
    }
  }

  function clearPath() {
    setPath([]);
  }

  // Compare the current path against placed words (forward or reverse)
  function checkForWord(cells:[number,number][]) {
    if (!data || cells.length < 2) return;
    const pathStr = cells.map(([r,c]) => k(r,c)).join('|');
    const hit = data.placed.find(p => {
      const fwd = p.coords.map(([r,c]) => k(r,c)).join('|');
      const rev = [...p.coords].reverse().map(([r,c]) => k(r,c)).join('|');
      return fwd === pathStr || rev === pathStr;
    });

    if (hit && !foundWords.has(hit.word)) {
      const nw = new Set(foundWords); nw.add(hit.word);
      setFoundWords(nw);
      const nc = new Set(foundCoords);
      hit.coords.forEach(([rr,cc]) => nc.add(k(rr,cc)));
      setFoundCoords(nc);
      setPath([]); // reset after a successful find
    }
  }

  // ---- RIDDLE GUESSING ----
  function submitGuess(n:number){
    if (!data?.clues) return;
    const clue = data.clues.find(c => c.number===n)!;
    const g = norm(guesses[n] || '');
    if (!g) return;
    if (g === clue.answerNormalized) {
      alert('Correct! Now tap the letters in order to mark it complete.');
    } else {
      alert('Not quite—try again.');
    }
  }

  if (!data) return <div style={{ padding: 20 }}>Loading…</div>;

  // Completion per clue: guessed right AND found in grid
  const solvedByClue = new Set<number>();
  (data.clues ?? []).forEach(c => {
    const guessed = norm(guesses[c.number]||'') === c.answerNormalized;
    const found = foundWords.has(c.answerNormalized);
    if (guessed && found) solvedByClue.add(c.number);
  });
  const allSolved = (data.clues?.length ?? 0) > 0 && solvedByClue.size === data.clues!.length;

  return (
    <main style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}>
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Daily Word Search</h1>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize: 14, opacity: .75 }}>{data.dateKey}</div>
          {data.source && <div style={{ fontSize: 12, opacity: .55 }}>Source: {data.source}</div>}
        </div>
      </header>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap: 24 }}>
        {/* LEFT: Grid + controls */}
        <div>
          <TapGrid
            grid={data.grid}
            path={path}
            foundCoords={foundCoords}
            onTapCell={onTapCell}
          />

          <div style={{ marginTop: 10, display:'flex', gap:8 }}>
            <button
              onClick={clearPath}
              style={{ padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff' }}
            >
              Clear
            </button>
            <div style={{ fontSize:12, opacity:.7, alignSelf:'center' }}>
              Selection length: {path.length}
            </div>
          </div>
        </div>

        {/* RIGHT: Clues / Riddles */}
        <aside>
          <h3 style={{ margin: 0, fontSize:16 }}>Clues</h3>
          <div style={{ fontSize:12, opacity:.65, marginBottom:8 }}>
            Step 1: type the answer. Step 2: tap the letters in order on the grid.
          </div>

          <div style={{ display:'grid', gap:10 }}>
            {(data.clues ?? words.map((w,i)=>({
              number: i+1, type:'', prompt:`Find the word: ${w}`, answerNormalized:w, answerDisplay:w
            }))).map((c) => {
              const guessed = norm(guesses[c.number]||'') === c.answerNormalized;
              const found = foundWords.has(c.answerNormalized);
              const complete = guessed && found;
              return (
                <div key={c.number} style={{ padding:12, border:'1px solid #e5e7eb', borderRadius:8, background: complete ? '#ecfdf5' : '#fff' }}>
                  <div style={{ fontSize:12, opacity:.7 }}>{c.type || 'CLUE'}</div>
                  <div style={{ fontWeight:600, margin:'2px 0 8px' }}>{c.number}. {c.prompt || c.answerDisplay}</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <input
                      value={guesses[c.number] || ''}
                      onChange={e => setGuesses({ ...guesses, [c.number]: e.target.value })}
                      placeholder="Type answer"
                      style={{ flex:1, padding:'6px 8px', border:'1px solid #e5e7eb', borderRadius:6 }}
                    />
                    <button onClick={()=>submitGuess(c.number)} style={{ padding:'6px 10px', border:'1px solid #ddd', borderRadius:6, background:'#fff' }}>
                      Guess
                    </button>
                  </div>
                  <div style={{ fontSize:12, marginTop:6, color: complete ? '#065f46' : guessed ? '#2563eb' : '#6b7280' }}>
                    {complete
                      ? '✅ Solved!'
                      : guessed
                        ? '✓ Correct — now tap the letters in the grid'
                        : 'Enter your answer and press Guess'}
                  </div>
                </div>
              );
            })}
          </div>

          {allSolved && (
            <div style={{ marginTop: 12, padding: 10, border: '1px solid #10b981', color: '#065f46', background: '#ecfdf5', borderRadius: 8, fontWeight: 600, textAlign: 'center' }}>
              🎉 All clues solved!
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

/** Tappable grid (no drag) */
function TapGrid({
  grid,
  path,
  foundCoords,
  onTapCell,
}: {
  grid: string[][];
  path: [number, number][];
  foundCoords: Set<string>;
  onTapCell: (r:number,c:number)=>void;
}) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const cellPx = Math.max(28, Math.min(40, Math.floor(360 / Math.max(cols, 12))));
  const pathSet = new Set(path.map(([r,c]) => k(r,c)));

  return (
    <div style={{ display:'inline-block', border:'1px solid #e5e7eb' }}>
      {grid.map((row, r) => (
        <div key={r} style={{ display:'flex' }}>
          {row.map((ch, c) => {
            const id = k(r,c);
            const isSelected = pathSet.has(id);
            const isFound = foundCoords.has(id);
            return (
              <button
                key={c}
                onClick={() => onTapCell(r,c)}
                style={{
                  width: cellPx,
                  height: cellPx,
                  display:'grid',
                  placeItems:'center',
                  fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontWeight:700,
                  fontSize:14,
                  borderRight:'1px solid #e5e7eb',
                  borderBottom:'1px solid #e5e7eb',
                  background: isFound ? '#dcfce7' : isSelected ? '#e0e7ff' : '#fff',
                }}
              >
                {ch}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}