import { Inter } from 'next/font/google';

export const metadata = {
  title: 'Daily Word Search',
  description: 'Find all the words in a clean, mobile-friendly puzzle.',
};

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={inter.className} style={{ margin: 0, background: '#fff' }}>
        {children}
      </body>
    </html>
  );
}