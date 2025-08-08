'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  const [puzzle, setPuzzle] = useState<any>(null);
  const [clues, setClues] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/daily')
      .then(res => res.json())
      .then(data => {
        setPuzzle(data.puzzle);
        setClues(data.clues);
      });
  }, []);

  if (!puzzle) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Daily Word Search</h1>
      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          {puzzle.grid.map((row: string[], i: number) => (
            <tr key={i}>
              {row.map((cell: string, j: number) => (
                <td key={j} style={{ border: '1px solid #ccc', padding: '5px', textAlign: 'center' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Clues</h2>
      <ul>
        {clues.map((clue, idx) => (
          <li key={idx}>{clue.prompt} ({clue.type})</li>
        ))}
      </ul>
    </div>
  );
}