'use client';
import { useEffect, useRef, useState } from 'react';

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
  const [foundCoords, setFoundCoords] = useState<Set<string>>(new Set());
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [dragPath, setDragPath] = useState<[number, number][]>([]);
  const [guesses, setGuesses] = useState<Record<number, string>>({});

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/daily', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    })();
  }, []);

  // always have words
  const words: string[] = Array.isArray(data?.words) && data!.words!.length
    ? data!.words!
    : Array.from(new Set((data?.placed ?? []).map(p => p.word)));

  function handlePreviewPath(cells: [number, number][]) {
    setDragPath(cells);
  }

  function handleFinishPath(cells: [number, number][]) {
    setDragPath([]);
    if (!data || cells.length < 2) return;

    const pathStr = cells.map(([r, c]) => k(r, c)).join('|');
    const hit = data.placed.find(p => {
      const fwd = p.coords.map(([r,c])=>k(r,c)).join('|');
      const rev = [...p.coords].reverse().map(([r,c])=>k(r,c)).join('|');
      return fwd === pathStr || rev === pathStr;
    });

    if (hit && !foundWords.has(hit.word)) {
      const nw = new Set(foundWords); nw.add(hit.word); setFoundWords(nw);
      const nc = new Set(foundCoords);
      hit.coords.forEach(([r,c]) => nc.add(k(r,c)));
      setFoundCoords(nc);
    }
  }

  function submitGuess(n:number){
    if (!data?.clues) return;
    const clue = data.clues.find(c => c.number===n)!;
    const g = norm(guesses[n] || '');
    if (!g) return;
    if (g === clue.answerNormalized) {
      alert('Correct! Now find it in the grid to mark complete.');
    } else {
      alert('Not quite—try again.');
    }
  }

  if (!data) return <div style={{ padding: 20 }}>Loading…</div>;

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
        <div>
          <Grid
            grid={data.grid}
            foundCoords={foundCoords}
            dragPath={dragPath}
            onPreviewPath={handlePreviewPath}
            onFinishPath={handleFinishPath}
          />
        </div>

        <aside>
          <h3 style={{ margin: 0, fontSize:16 }}>Clues</h3>
          <div style={{ fontSize:12, opacity:.65, marginBottom:8 }}>
            Solve = type the correct answer <b>and</b> then find it in the grid.
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
                        ? '✓ Correct — now find it in the grid'
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

function Grid({
  grid,
  foundCoords,
  dragPath,
  onPreviewPath,
  onFinishPath,
}: {
  grid: string[][];
  foundCoords: Set<string>;
  dragPath: [number, number][];
  onPreviewPath: (cells: [number, number][]) => void;
  onFinishPath: (cells: [number, number][]) => void;
}) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const cellPx = Math.max(28, Math.min(40, Math.floor(360 / Math.max(cols, 12))));

  const DIRS: [number, number][] = [
    [-1, 0], [-1, 1], [0, 1], [1, 1],
    [1, 0], [1, -1], [0, -1], [-1, -1],
  ];

  let anchor: [number, number] | null = null;
  let preview: [number, number][] = [];

  function pointToCell(clientX: number, clientY: number): [number, number] | null {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const c = Math.floor(x / cellPx);
    const r = Math.floor(y / cellPx);
    if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
    return [r, c];
  }

  function snapDir(dr: number, dc: number): [number, number] {
    const len = Math.hypot(dr, dc) || 1;
    const ur = dr / len, uc = dc / len;
    let best: [number, number] = [0, 1], bestDot = -2;
    for (const [vr, vc] of DIRS) {
      const dot = ur * vr + uc * vc;
      if (dot > bestDot) { bestDot = dot; best = [vr, vc]; }
    }
    return best;
  }

  function buildLine(a: [number, number], b: [number, number]): [number, number][] {
    const [r0, c0] = a;
    const [r1, c1] = b;
    const dr = r1 - r0;
    const dc = c1 - c0;
    const [vr, vc] = snapDir(dr, dc);

    let steps: number;
    if (vr === 0) steps = Math.abs(dc);
    else if (vc === 0) steps = Math.abs(dr);
    else steps = Math.min(Math.abs(dr), Math.abs(dc));

    const line: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const r = r0 + vr * i;
      const c = c0 + vc * i;
      if (r < 0 || r >= rows || c < 0 || c >= cols) break;
      line.push([r, c]);
    }
    return line;
  }

  function start(clientX: number, clientY: number) {
    const cell = pointToCell(clientX, clientY);
    if (!cell) return;
    anchor = cell;
    preview = [cell];
    onPreviewPath(preview);
  }

  function move(clientX: number, clientY: number) {
    if (!anchor) return;
    const cell = pointToCell(clientX, clientY);
    if (!cell) return;
    preview = buildLine(anchor, cell);
    onPreviewPath(preview);
  }

  function end() {
    const result = preview;
    anchor = null;
    preview = [];
    onFinishPath(result);
  }

  return (
    <div
      ref={containerRef}
      style={{ display: 'inline-block', userSelect: 'none', border: '1px solid #e5e7eb', touchAction: 'none' }}
      onMouseDown={(e) => start(e.clientX, e.clientY)}
      onMouseMove={(e) => e.buttons === 1 && move(e.clientX, e.clientY)}
      onMouseUp={() => end()}
      onMouseLeave={() => end()}
      onTouchStart={(e) => { const t = e.touches[0]; start(t.clientX, t.clientY); }}
      onTouchMove={(e) => { const t = e.touches[0]; move(t.clientX, t.clientY); }}
      onTouchEnd={() => end()}
    >
      {grid.map((row, r) => (
        <div key={r} style={{ display: 'flex' }}>
          {row.map((ch, c) => {
            const inDrag = dragPath.some(([rr, cc]) => rr === r && cc === c);
            const isFound = foundCoords.has(k(r,c));
            return (
              <div
                key={c}
                style={{
                  width: cellPx,
                  height: cellPx,
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontWeight: 700,
                  fontSize: 14,
                  borderRight: '1px solid #e5e7eb',
                  borderBottom: '1px solid #e5e7eb',
                  background: isFound ? '#dcfce7' : inDrag ? '#e0e7ff' : '#fff',
                }}
              >
                {ch}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}