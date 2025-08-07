export type PlacedWord = { word: string; coords: [number,number][] };
export type Puzzle = { grid: string[][]; placed: PlacedWord[]; allWords: string[] };

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

const DIRS: [number,number][] = [
  [-1,0],[-1,1],[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1]
];

export function makePuzzle(words: string[], dateKey: string, size = 12): Puzzle {
  const rng = seededRng(dateKey);
  const cleaned = words.map(w => w.replace(/[^A-Z]/g,'')).filter(w => w.length >= 3);
  const sorted = [...cleaned].sort((a,b)=>b.length-a.length);

  const grid = Array.from({length:size}, () => Array(size).fill('_'));
  const placed: PlacedWord[] = [];

  for (const w of sorted) {
    let ok = false;
    for (let attempt = 0; attempt < 200 && !ok; attempt++) {
      const d = DIRS[Math.floor(rng.next() * DIRS.length)];
      const len = w.length;
      const r0 = Math.floor(rng.next() * size);
      const c0 = Math.floor(rng.next() * size);

      const rEnd = r0 + d[0]*(len-1);
      const cEnd = c0 + d[1]*(len-1);
      if (rEnd < 0 || rEnd >= size || cEnd < 0 || cEnd >= size) continue;

      const coords: [number,number][] = [];
      let fits = true;
      for (let i=0;i<len;i++){
        const r=r0+d[0]*i, c=c0+d[1]*i;
        const cell = grid[r][c];
        if (cell !== '_' && cell !== w[i]) { fits=false; break; }
        coords.push([r,c]);
      }
      if (!fits) continue;

      coords.forEach(([r,c],i)=> grid[r][c] = w[i]);
      placed.push({ word: w, coords });
      ok = true;
    }
  }

  const bag = Array.from('EEEEAAAARRRIIOONNSTTLCCUUMDGPBHFYWKVXZJQ');
  for (let r=0;r<size;r++) for (let c=0;c<size;c++) {
    if (grid[r][c] === '_') grid[r][c] = bag[Math.floor(seededRng(dateKey+'-'+r+'-'+c).next()*bag.length)];
  }

  return { grid, placed, allWords: placed.map(p => p.word) };
}
