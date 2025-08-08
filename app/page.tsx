'use client';

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/daily')
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error(err));
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Daily Clues Word Search</h1>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.grid[0].length}, 30px)`, gap: '2px' }}>
        {data.grid.map((row: string[], r: number) =>
          row.map((cell: string, c: number) => (
            <div key={r + '-' + c} style={{ border: '1px solid #ccc', textAlign: 'center' }}>{cell}</div>
          ))
        )}
      </div>
      <h2>Clues</h2>
      <ul>
        {data.words.map((w: string) => <li key={w}>{w}</li>)}
      </ul>
    </div>
  );
}
