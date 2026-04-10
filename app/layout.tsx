import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'City Hide and Seek',
  description: 'Host a live hide and seek game with a shrinking map zone.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
