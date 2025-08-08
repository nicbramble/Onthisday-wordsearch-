'use client';
import { useEffect, useRef, useState } from 'react';

type PlacedWord = { word: string; coords: [number, number][] };
type DailyRes = { dateKey: string; grid: string[][]; placed: PlacedWord[]; words: string[] };

function cellKey(r: number, c: number) {
  return `${r},${c}`;
}

export default function Home() {
  const [data, setData] = useState<DailyRes | null>(null);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [foundCoords, setFoundCoords] = useState<Set<string>>(new Set());
  const [dragPath, setDragPath] = useState<[number, number][]>([]);
  const cellRefs = useRef<HTMLDivElement[][]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/daily', { cache: 'no-store' });
      const json = await res.json();
      setData(json);
    })();
  }, []);

  function startAt(r: number, c: number) {
    setDragPath([[r, c]]);
  }
  function extendTo(r: number, c: number) {
    if (!dragPath.length) return;
    const [lr, lc] = dragPath[dragPath.length - 1];
    if (lr === r && lc === c) return;
    setDragPath((p) => [...p, [r, c]]);
  }
  function finishPath() {
    if (!data || dragPath.length < 2) {
      setDragPath([]);
      return;
    }
    const pathStr = dragPath.map(([r, c]) => cellKey(r, c)).join('|');

    const hit = data.placed.find((p) => {
      const fwd = p.coords.map(([r, c]) => cellKey(r, c)).join('|');
      const rev = [...p.coords].reverse().map(([r, c]) => cellKey(r, c)).join('|');
      return fwd === pathStr || rev === pathStr;
    });

    if (hit && !foundWords.has(hit.word)) {
      const nextWords = new Set(foundWords);
      nextWords.add(hit.word);
      setFoundWords(nextWords);

      const nextCoords = new Set(foundCoords);
      hit.coords.forEach(([r, c]) => nextCoords.add(cellKey(r, c)));
      setFoundCoords(nextCoords);
    }

    setDragPath([]);
  }

  if (!data) return <div style={{ padding: 20 }}>Loading…</div>;

  const allFound = data.words.every((w) => foundWords.has(w));

  return (
    <main style={{ maxWidth: 1000, margin: '24px auto', padding: '0 16px' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>Daily Word Search</h1>
        <div style={{ fontSize: 14, opacity: 0.7 }}>{data.dateKey}</div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: 24,
        }}
      >
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

        {/* Word list / bank */}
        <aside>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Word Bank</h3>
            <span style={{ fontSize: 12, opacity: 0.6 }}>
              {Array.from(foundWords).length}/{data.words.length}
            </span>
          </div>

          <div
            style={{
              marginTop: 10,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 10,
              maxHeight: 420,
              overflowY: 'auto',
              background: '#fafafa',
            }}
          >
            {data.words.map((w) => {
              const solved = foundWords.has(w);
              return (
                <div
                  key={w}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 6,
                    fontSize: 14,
                    marginBottom: 6,
                    background: solved ? '#ecfdf5' : '#fff',
                    color: solved ? '#065f46' : '#111827',
                    textDecoration: solved ? 'line-through' : 'none',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  {w}
                </div>
              );
            })}
          </div>

          {allFound && (
            <div
              style={{
                marginTop: 12,
                padding: 10,
                border: '1px solid #10b981',
                color: '#065f46',
                background: '#ecfdf5',
                borderRadius: 8,
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              🎉 All words found!
            </div>
          )}
        </aside>
      </div>

      <footer style={{ marginTop: 24, fontSize: 12, opacity: 0.6 }}>
        Tip: tap the first letter and drag across the rest (or click & drag with a mouse).
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
}: {
  grid: string[][];
  foundCoords: Set<string>;
  dragPath: [number, number][];
  onStart: (r: number, c: number) => void;
  onExtend: (r: number, c: number) => void;
  onFinish: () => void;
  cellRefs: React.MutableRefObject<HTMLDivElement[][]>;
}) {
  const size = grid[0]?.length ?? 12;
  const cellPx = Math.max(28, Math.min(40, Math.floor(360 / size))); // auto-fit cell size

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
      style={{
        display: 'inline-block',
        userSelect: 'none',
        border: '1px solid #e5e7eb',
        touchAction: 'none',
      }}
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
                ref={(el) => {
                  if (!cellRefs.current[r]) cellRefs.current[r] = [];
                  cellRefs.current[r][c] = el!;
                }}
                onMouseDown={() => onStart(r, c)}
                onMouseEnter={(e) => e.buttons === 1 && onExtend(r, c)} // mouse drag (left button)
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