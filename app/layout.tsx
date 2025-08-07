export const metadata = {
  title: 'On-This-Day Word Search',
  description: 'A daily word search that teaches history as you solve.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#fff' }}>{children}</body>
    </html>
  );
}
