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

    set