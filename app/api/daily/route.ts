import { NextResponse } from 'next/server';
import { generateWordSearch } from '../../../lib/wordsearch';

export async function GET() {
  const words = ['HISTORY', 'PUZZLE', 'WORD', 'SEARCH', 'DAILY', 'TRIVIA', 'CLUES', 'GAME'];
  const grid = generateWordSearch(words);
  return NextResponse.json({ grid, words });
}
