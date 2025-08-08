'use client';
import { useEffect, useRef, useState } from 'react';

type PlacedWord = { word: string; coords: [number, number][] };
type DailyRes = { dateKey: string; grid: string[][]; placed: PlacedWord[]; words: string[] };

function cellKey(r: number, c: number) { return `${r},${c}`; }

export default function Home() {
  const [data, setData] = useState<DailyRes | null>(null);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [foundCoords, setFoundCoords] = useState<Set<string>>(new Set());
  const [dragPath, setDragPath] = useState<[number, number][]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState<boolean>(false); // allow tap-to-check for testing
  const cellRefs = useRef<HTMLDivElement[][]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/daily', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    })();
  }, []);

  function startAt(r: number, c: number) { setDragPath([[r, c]]); }
  function extendTo(r: number, c: number) {
    if (!dragPath.length) return;
    const [lr, lc] = dragPath[dragPath.length - 1];
    if (lr === r && lc === c) return;
    setDragPath(p => [...p, [r, c]]);
  }
  function finishPath() {
    if (!data || dragPath.length < 2) { setDragPath([]); return; }
    const pathStr = dragPath.map(([r, c]) => cellKey(r, c)).join('|');

    const hit = data.placed.find(p => {
      const fwd = p.coords.map(([r, c]) => cellKey(r, c)).join('|');
      const rev = [...p.coords].reverse().map(([r, c]) => cellKey(r, c)).join('|');
      return fwd === pathStr || rev === pathStr;
    });

    if (hit && !foundWords.has(hit.word)) {
      const nextWords = new Set(foundWords); nextWords.add(hit.word);
      setFoundWords(nextWords);

      const nextCoords = new Set(foundCoords);
      hit.coords.forEach(([r, c]) => nextCoords.add(cellKey(r, c)));
      setFoundCoords(nextCoords);
    }

    setDragPath([]);
  }

  function toggleManualCheck(word: string) {
    // Manual check for testing if a user taps the word in the list
    const next = new Set(foundWords);
    if (next.has(word)) next.delete(word); else next.add(word);
    setFoundWords(next);

    // If we check manually, also highlight its coords (if placed)
    const placed = data?.placed.find(p => p.word === word);
    if (placed) {
      const nc = new Set(foundCoords);
      placed.coords.forEach(([r, c]) => nc.add(cellKey(r, c)));
      setFoundCoords(nc);
    }
  }

  if (!data) return <div style={{ padding: 20 }}>Loading…</div>;
  const allFound = data.words.every(w => foundWords.has(w));

  return (
    <main style={{ maxWidth: 1000, margin: '24px auto', padding: '0 16px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Daily Word Search</h1>
        <div style={{ fontSize: 14, opacity: .75 }}>{data.dateKey}</div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
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
            selectedWordCoords={selectedWord ? (data.placed.find(p => p.word === selectedWord)?.coords ?? []) : []}
          />
        </div>

        {/* Right panel */}
        <aside>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Word Bank</h3>
            <label style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={manualMode} onChange={e => setManualMode(e.target.checked)} />
              Manual check
            </label>
          </div>
          <div style={{ fontSize: 12, opacity: .6, marginTop: 4 }}>
            Found {Array.from(foundWords).length}/{data.words.length}
          </div>

          <div style={{ marginTop: 10, border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, maxHeight: 460, overflowY: 'auto', background: '#fafafa' }}>
            {data.words.map(w => {
              const solved = foundWords.has(w);
              const isSelected = selectedWord === w;
              return (
                <button
                  key={w}
                  onClick={() => { setSelectedWord(isSelected ? null : w); if (manualMode) toggleManualCheck(w); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderRadius: 6,
                    fontSize: 14,
                    marginBottom: 8,
                    background: solved ? '#ecfdf5' : isSelected ? '#eef2ff' : '#fff',
                    color: solved ? '#065f46' : '#111827',
                    textDecoration: solved ? 'line-through' : 'none',
                    border: `1px solid ${isSelected ? '#c7d2fe' : '#e5e7eb'}`,
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ marginRight: 8 }}>{solved ? '✅' : '⬜️'}</span>
                  {w}
                </button>
              );
            })}
          </div>

          {allFound && (
            <div style={{ marginTop: 12, padding: 10, border: '1px solid #10b981', color: '#065f46', background: '#ecfdf5', borderRadius: 8, fontWeight: 600, textAlign: 'center' }}>
              🎉 All words found!
            </div>
          )}
        </aside>
      </div>

      <footer style={{ marginTop: 16, fontSize: 12, opacity: .65 }}>
        Tip: tap the first letter and drag across the rest (or click & drag). Tap a word to highlight its path; enable “Manual check” for quick testing.
      </footer>
    </main>
  );
}

function Grid({
  grid,
  foundCoords,
  dragPath,
  onStart,
  onExtend,
  onFinish,
  cellRefs,
  selectedWordCoords
}: {
  grid: string[][];
  foundCoords: Set<string>;
  dragPath: [number, number][];
  onStart: (r: number, c: number) => void;
  onExtend: (r: number, c: number) => void;
  onFinish: () => void;
  cellRefs: React.MutableRefObject<HTMLDivElement[][]>;
  selectedWordCoords: [number, number][];
}) {
  const size = grid[0]?.length ?? 12;
  const cellPx = Math.max(28, Math.min(40, Math.floor(360 / size)));

  // make a set for quick highlight of the selected word
  const selectedSet = new Set(selectedWordCoords.map(([r, c]) => cellKey(r, c)));

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
      style={{ display: 'inline-block', userSelect: 'none', border: '1px solid #e5e7eb', touchAction: 'none' }}
    >
      {grid.map((row, r) => (
        <div key={r} style={{ display: 'flex' }}>
          {row.map((ch, c) => {
            const k = cellKey(r, c);
            const inDrag = dragPath.some(([rr, cc]) => rr === r && cc === c);
            const isFound = foundCoords.has(k);
            const isSelected = selectedSet.has(k) && !isFound;
            return (
              <div
                key={c}
                data-r={r}
                data-c={c}
                ref={el => {
                  if (!cellRefs.current[r]) cellRefs.current[r] = [];
                  cellRefs.current[r][c] = el!;
                }}
                onMouseDown={() => onStart(r, c)}
                onMouseEnter={(e) => e.buttons === 1 && onExtend(r, c)}
                onMouseUp={onFinish}
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
                  background: isFound ? '#dcfce7' : inDrag ? '#e0e7ff' : isSelected ? '#fee2e2' : '#fff'
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