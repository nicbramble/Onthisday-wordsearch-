'use client';
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import tz from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { makePuzzle, Puzzle } from '@/lib/wordsearch';

dayjs.extend(utc);
dayjs.extend(tz);

type OtdItem = { year?: number; text?: string; pages?: { normalizedtitle?: string }[] };
type Otd = { events?: OtdItem[]; births?: OtdItem[]; deaths?: OtdItem[]; holidays?: OtdItem[] };

const TZ = 'America/New_York';

// Local STOP list to keep noise out
const STOP = new Set([
  'THE','OF','AND','IN','ON','AT','TO','A','AN','FOR','WITH','BY','FROM','OR','AS','IS',
  'UNITED','STATES','KINGDOM','REPUBLIC','STATE','CITY','COUNTY','RIVER','SEA','LAKE'
]);

function tokenizeTitle(t: string) {
  return t.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
}
function tokenizeText(s: string) {
  // Grab capitalized-ish words and proper nouns from body text
  return (s || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function extractKeywordsRobust(otd: Otd | null, max = 16) {
  if (!otd) return [];
  const pools: OtdItem[] = [
    ...(otd.events ?? []),
    ...(otd.births ?? []),
    ...(otd.deaths ?? []),
    ...(otd.holidays ?? [])
  ];

  const bag: string[] = [];

  for (const item of pools) {
    const titles = (item.pages ?? []).map(p => p.normalizedtitle ?? '').filter(Boolean);
    for (const t of titles) bag.push(...tokenizeTitle(t));

    // backfill from text
    if (item.text) bag.push(...tokenizeText(item.text));
  }

  // Clean:
  // - A–Z only
  // - length 3..12 so they fit 12x12 by default
  // - drop common junk
  const cleaned = bag
    .map(w => w.replace(/[^A-Z]/g, ''))
    .filter(w => w.length >= 3 && w.length <= 12 && !STOP.has(w));

  // unique, bias toward longer words first
  const uniq = Array.from(new Set(cleaned)).sort((a, b) => b.length - a.length);
  return uniq.slice(0, max);
}

export default function Home() {
  const today = dayjs().tz(TZ);
  const mm = today.format('MM');
  const dd = today.format('DD');
  const dateKey = today.format('YYYY-MM-DD');

  const [otd, setOtd] = useState<Otd | null>(null);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [blurbs, setBlurbs] = useState<{ word: string; year?: number; text: string }[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [debugInfo, setDebugInfo] = useState<{ words: string[]; size: number }>({ words: [], size: 12 });

  const lastSolvedKey = 'lastSolvedDate';

  // Fetch puzzle for today
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/onthisday/${mm}/${dd}`);
      const json: Otd = await res.json();
      setOtd(json);

      // Extract robust keywords
      let words = extractKeywordsRobust(json, 16);

      // Fallback if needed
      if (!words.length) {
        words = ['TEST','WORD','SEARCH','PUZZLE','HISTORY','EVENT','TODAY','FUN','TIMELINE','PAST'];
      }

      // Pick grid size that can fit the longest word (min 12)
      const longest = words.reduce((m, w) => Math.max(m, w.length), 0);
      const gridSize = Math.max(12, longest);

      const p = makePuzzle(words, dateKey, gridSize);
      setPuzzle(p);
      setDebugInfo({ words, size: gridSize });
      // console.log('Extracted words for today:', words);
    })();
  }, [mm, dd, dateKey]);

  // Load streak from localStorage (client only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('streak');
      if (stored) setStreak(Number(stored));
    }
  }, []);

  // Grid selection state
  const [dragPath, setDragPath] = useState<[number, number][]>([]);
  const cellRefs = useRef<HTMLDivElement[][]>([]);

  function onDown(r: number, c: number) {
    setDragPath([[r, c]]);
  }

  function onEnter(r: number, c: number) {
    if (dragPath.length) setDragPath((p) => {
      const last = p[p.length - 1];
      // avoid duplicates when finger lingers on same cell
      if (last && last[0] === r && last[1] === c) return p;
      return [...p, [r, c]];
    });
  }

  function onUp() {
    if (!puzzle || dragPath.length < 2) {
      setDragPath([]);
      return;
    }
    const pathStr = dragPath.map(([r, c]) => `${r},${c}`).join('|');

    const hit = puzzle.placed.find((p) => {
      const fwd = p.coords.map(([r, c]) => `${r},${c}`).join('|');
      const rev = [...p.coords].reverse().map(([r, c]) => `${r},${c}`).join('|');
      return fwd === pathStr || rev === pathStr;
    });

    if (hit && !found.has(hit.word)) {
      const newFound = new Set(found);
      newFound.add(hit.word);
      setFound(newFound);

      const chosen = pickBlurbFor(hit.word, otd);
      if (chosen) setBlurbs((b) => [...b, { word: hit.word, year: chosen.year, text: chosen.text }]);

      if (newFound.size === puzzle.allWords.length) {
        const prev = localStorage.getItem(lastSolvedKey);
        const isConsecutive = prev && dayjs(prev).add(1, 'day').isSame(dayjs(dateKey));
        const nextStreak = isConsecutive ? streak + 1 : 1;
        setStreak(nextStreak);
        localStorage.setItem('streak', String(nextStreak));
        localStorage.setItem(lastSolvedKey, dateKey);
      }
    }
    setDragPath([]);
  }

  return (
    <main style={{ maxWidth: 1100, margin: '40px auto', padding: '0 16px', fontFamily: 'system-ui, -apple-system, Segoe UI' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>On-This-Day Word Search</h1>
        <div>
          <strong>{today.format('MMM D, YYYY')}</strong> · Streak: {streak} 🔥
        </div>
      </header>

      {puzzle ? (
        <div style={{ display: 'flex', gap: 24 }}>
          {/* Left: Puzzle + blurbs */}
          <div style={{ flex: '2 1 auto' }}>
            <div style={{ marginBottom: 8, fontSize: 12, color: '#6b7280' }}>
              {/* Tiny debug helper you can remove later */}
              Extracted {debugInfo.words.length} words • Grid {debugInfo.size}×{debugInfo.size}
            </div>

            <Grid
              grid={puzzle.grid}
              onDown={onDown}
              onEnter={onEnter}
              onUp={onUp}
              cellRefs={cellRefs}
              foundCoords={new Set(
                puzzle.placed
                  .filter((p) => found.has(p.word))
                  .flatMap((p) => p.coords.map(([r, c]) => `${r},${c}`))
              )}
              dragPath={dragPath}
            />

            <WordBank words={puzzle.allWords} found={found} />

            <section style={{ marginTop: 24 }}>
              <h3>Unlocked today</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {blurbs.map((b, i) => (
                  <div key={i} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa' }}>
                    <div style={{ fontSize: 12, opacity: 0.75 }}>{b.year ?? '—'}</div>
                    <div>{b.text}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right: Word Key box */}
          <div style={{ flex: '1 1 220px' }}>
            <h3>Word Key</h3>
            <div
              style={{
                border: '1px solid #ddd',
                borderRadius: 6,
                padding: '8px',
                maxHeight: '420px',
                overflowY: 'auto',
                background: '#fafafa'
              }}
            >
              {puzzle.allWords.length > 0 ? (
                puzzle.allWords.map((w) => (
                  <div key={w} style={{ padding: '4px 0', fontSize: 14 }}>
                    {w}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 14, color: '#888' }}>No words found</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p>Loading…</p>
      )}

      <footer style={{ marginTop: 32, fontSize: 12, opacity: 0.7 }}>
        Data from Wikipedia (Wikimedia Feed API). Content licensed under CC-BY-SA.
      </footer>
    </main>
  );
}

function pickBlurbFor(word: string, otd: Otd | null) {
  if (!otd) return null;
  const pools = ['events', 'births', 'deaths', 'holidays'].flatMap((k) =>
    (otd?.[k as keyof Otd] as OtdItem[] | undefined ?? []).map((x: any) => ({ year: x.year, text: x.text ?? '' }))
  );
  const hit = pools.find((x: any) => x.text?.toUpperCase().includes(word));
  return hit ?? pools[0] ?? null;
}

function Grid({
  grid,
  onDown,
  onEnter,
  onUp,
  cellRefs,
  foundCoords,
  dragPath
}: {
  grid: string[][];
  onDown: (r: number, c: number) => void;
  onEnter: (r: number, c: number) => void;
  onUp: () => void;
  cellRefs: React.MutableRefObject<HTMLDivElement[][]>;
  foundCoords: Set<string>;
  dragPath: [number, number][];
}) {
  return (
    <div
      onMouseLeave={onUp}
      onTouchStart={(e) => {
        const t = e.touches[0];
        const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
        if (el?.dataset?.r && el?.dataset?.c) {
          onDown(parseInt(el.dataset.r), parseInt(el.dataset.c));
        }
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        const el = document.elementFromPoint(t.clientX, t.clientY) as HTMLElement | null;
        if (el?.dataset?.r && el?.dataset?.c) {
          onEnter(parseInt(el.dataset.r), parseInt(el.dataset.c));
        }
      }}
      onTouchEnd={() => onUp()}
      style={{
        display: 'inline-block',
        userSelect: 'none',
        border: '1px solid #e5e7eb',
        touchAction: 'none'
      }}
    >
      {grid.map((row, r) => (
        <div key={r} style={{ display: 'flex' }}>
          {row.map((ch, c) => {
            const key = `${r},${c}`;
            const inDrag = dragPath.some(([rr, cc]) => rr === r && cc === c);
            const isFound = foundCoords.has(key);
            return (
              <div
                key={c}
                data-r={r}
                data-c={c}
                ref={(el) => {
                  if (!cellRefs.current[r]) cellRefs.current[r] = [];
                  cellRefs.current[r][c] = el!;
                }}
                onMouseDown={() => onDown(r, c)}
                onMouseEnter={() => onEnter(r, c)}
                onMouseUp={onUp}
                style={{
                  width: 32,
                  height: 32,
                  display: 'grid',
                  placeItems: 'center',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontWeight: 600,
                  borderRight: '1px solid #e5e7eb',
                  borderBottom: '1px solid #e5e7eb',
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

function WordBank({ words, found }: { words: string[]; found: Set<string> }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
      {words.map((w) => (
        <span
          key={w}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 12,
            background: found.has(w) ? '#dcfce7' : '#f3f4f6',
            textDecoration: found.has(w) ? 'line-through' : 'none'
          }}
        >
          {w}
        </span>
      ))}
    </div>
  );
}