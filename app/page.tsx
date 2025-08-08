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

function cellKey(r:number,c:number){ return `${r},${c}`; }
function norm(s:string){ return (s||'').toUpperCase().replace(/[^A-Z]/g,''); }

export default function Home() {
  const [data, setData] = useState<DailyRes | null>(null);
  const [foundCoords, setFoundCoords] = useState<Set<string>>(new Set());
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [guesses, setGuesses] = useState<Record<number, string>>({});
  const [dragPath, setDragPath] = useState<[number, number][]>([]);
  const cellRefs = useRef<HTMLDivElement[][]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/daily', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    })();
  }, []);

  // Safe words list (belt & suspenders)
  const words: string[] = Array.isArray(data?.words) && data!.words!.length
    ? data!.words!
    : Array.from(new Set((data?.placed ?? []).map(p => p.word)));

  // ---- Drag logic ----
  function startAt(r:number,c:number){ setDragPath([[r,c]]); }
  function extendTo(r:number,c:number){
    if (!dragPath.length) return;
    const [lr,lc] = dragPath[dragPath.length-1];
    if (lr===r && lc===c) return;
    setDragPath(p => [...p,[r,c]]);
  }
  function finishPath(){
    if (!data || dragPath.length < 2){ setDragPath([]); return; }
    const pathStr = dragPath.map(([r,c])=>cellKey(r,c)).join('|');
    const hit = data.placed.find(p => {
      const fwd = p.coords.map(([r,c])=>cellKey(r,c)).join('|');
      const rev = [...p.coords].reverse().map(([r,c])=>cellKey(r,c)).join('|');
      return fwd===pathStr || rev===pathStr;
    });
    if (hit && !foundWords.has(hit.word)) {
      const nw = new Set(foundWords); nw.add(hit.word); setFoundWords(nw);
      const nc = new Set(foundCoords);
      hit.coords.forEach(([r,c]) => nc.add(cellKey(r,c)));
      setFoundCoords(nc);
    }
    setDragPath([]);
  }

  // ---- Guess logic ----
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

  // Completion check: guessed right AND found in grid
  const solvedByClue = new Set<number>();
  (data.clues ?? []).forEach(c => {
    const guessed = norm(guesses[c.number]||'') === c.answerNormalized;
    const found = foundWords.has(c.answerNormalized);
    if (guessed && found) solvedByClue.add(c.number);
  });
  const allSolved = data.clues && solvedByClue.size === data.clues.length;

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
        {/* Grid */}
        <div>
          <Grid
            grid={data.grid}
            foundCoords={foundCoords}
            dragPath={dragPath}
            onStart={startAt}
            onExtend={extendTo}
            onFinish={finishPath}
            cellRefs={cellRefs}
          />
        </div>

        {/* Riddle / Clues */}
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
  grid, foundCoords, dragPath, onStart, onExtend, onFinish, cellRefs
}:{
  grid: string[][];
  foundCoords: Set<string>;
  dragPath: [number, number][];
  onStart: (r:number,c:number)=>void;
  onExtend: (r:number,c:number)=>void;
  onFinish: ()=>void;
  cellRefs: React.MutableRefObject<HTMLDivElement[][]>;
}){
  const size = grid[0]?.length ?? 12;
  const cellPx = Math.max(28, Math.min(40, Math.floor(360 / size)));

  return (
    <div
      onMouseLeave={onFinish}
      onTouchStart={(e) => {
        const t = e.touches[0];
        const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
        if (el?.dataset?.r && el?.dataset?.c) onStart(parseInt(el.dataset.r), parseInt(el.dataset.c));
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
        if (el?.dataset?.r && el?.dataset?.c) onExtend(parseInt(el.dataset.r), parseInt(el.dataset.c));
      }}
      onTouchEnd={onFinish}
      style={{ display:'inline-block', userSelect:'none', border:'1px solid #e5e7eb', touchAction:'none' }}
    >
      {grid.map((row, r) => (
        <div key={r} style={{ display: 'flex' }}>
          {row.map((ch, c) => {
            const k = cellKey(r, c);
            const inDrag = dragPath.some(([rr, cc]) => rr === r && cc === c);
            const isFound = foundCoords.has(k);
            return (
              <div
                key={c}
                data-r={r}
                data-c={c}
                ref={el => {
                  if (!cellRefs.current[r]) cellRefs.current[r] = [];
                  cellRefs.current[r][c] = el!;
                }}
                onMouseDown={()=>onStart(r,c)}
                onMouseEnter={(e)=> e.buttons===1 && onExtend(r,c)}
                onMouseUp={onFinish}
                style={{
                  width: cellPx, height: cellPx, display:'grid', placeItems:'center',
                  fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight:700, fontSize:14,
                  borderRight:'1px solid #e5e7eb', borderBottom:'1px solid #e5e7eb',
                  background: isFound ? '#dcfce7' : inDrag ? '#e0e7ff' : '#fff'
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