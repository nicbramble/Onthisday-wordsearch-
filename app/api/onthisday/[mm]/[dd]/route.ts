import { NextResponse } from 'next/server';

const WIKI_BASE = 'https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday';
export const revalidate = 60 * 60 * 24; // 24h

export async function GET(
  _req: Request,
  { params }: { params: { mm: string; dd: string } }
) {
  const { mm, dd } = params;
  const url = `${WIKI_BASE}/all/${mm}/${dd}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'OnThisDay-WordSearch/1.0 (contact: you@example.com)',
      'Accept': 'application/json'
    },
    next: { revalidate }
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
