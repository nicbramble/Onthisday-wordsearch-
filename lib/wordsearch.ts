export function makePuzzle(words: string[], seed: string, size: number) {
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  // Fill grid with words horizontally for simplicity
  words.forEach((word, idx) => {
    if (idx < size) {
      for (let i = 0; i < word.length && i < size; i++) {
        grid[idx][i] = word[i];
      }
    }
  });
  // Fill remaining cells with random letters
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) {
        grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
  }
  return { grid, words };
}