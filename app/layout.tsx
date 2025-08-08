export const metadata = {
  title: 'Daily Clues Word Search',
  description: 'Solve 8–10 clues and find the answers in a daily word search.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#fff' }}>{children}</body>
    </html>
  );
}
