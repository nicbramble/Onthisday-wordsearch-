export type PlacedWord = { word: string; coords: [number, number][] };
export type Puzzle = { grid: string[][]; placed: PlacedWord[]; allWords: string[] };

export function normalize(s: string) {
  return (s || '').toUpperCase().replace(/[^A-Z]/g, '');
}

type RNG = { next: () => number };
function seededRng(seed: string): RNG {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return {
    next: () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    }
  };
}

const DIRS: [number, number][] = [
  [-1, 0], [-1, 1], [0, 1], [1, 1],
  [1, 0], [1, -1], [0, -1], [-1, -1]
];

export function generateWordSearch(wordsIn: string[], seed: string, size?: number): Puzzle {
  const words = wordsIn.map(normalize).filter(w => w.length >= 3);
  const longest = words.reduce((m, w) => Math.max(m, w.length), 0);
  const n = size ?? Math.max(12, longest);

  const rng = seededRng(seed);
  const sorted = [...new Set(words)].sort((a, b) => b.length - a.length);

  const grid = Array.from({ length: n }, () => Array(n).fill('_'));
  const placed: PlacedWord[] = [];

  for (const w of sorted) {
    let ok = false;
    for (let attempt = 0; attempt < 300 && !ok; attempt++) {
      const d = DIRS[Math.floor(rng.next() * DIRS.length)];
      const len = w.length;
      const r0 = Math.floor(rng.next() * n);
      const c0 = Math.floor(rng.next() * n);
      const rEnd = r0 + d[0] * (len - 1);
      const cEnd = c0 + d[1] * (len - 1);
      if (rEnd < 0 || rEnd >= n || cEnd < 0 || cEnd >= n) continue;

      const coords: [number, number][] = [];
      let fits = true;
      for (let i = 0; i < len; i++) {
        const r = r0 + d[0] * i;
        const c = c0 + d[1] * i;
        const cell = grid[r][c];
        if (cell !== '_' && cell !== w[i]) { fits = false; break; }
        coords.push([r, c]);
      }
      if (!fits) continue;

      coords.forEach(([r, c], i) => (grid[r][c] = w[i]));
      placed.push({ word: w, coords });
      ok = true;
    }
  }

  const bag = Array.from('EEEEAAAARRRIIOONNSTTLCCUUMDGPBHFYWKVXZJQ');
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (grid[r][c] === '_') {
      const r2 = seededRng(`${seed}-${r}-${c}`).next();
      grid[r][c] = bag[Math.floor(r2 * bag.length)];
    }
  }

  return { grid, placed, allWords: placed.map(p => p.word) };
}