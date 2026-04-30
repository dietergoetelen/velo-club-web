import type { Metadata } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets:  ['latin'],
  variable: '--font-outfit',
  weight:   ['400', '700', '800'],
  display:  'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets:  ['latin'],
  variable: '--font-jakarta',
  weight:   ['400', '500', '600', '700'],
  display:  'swap',
});

export const metadata: Metadata = {
  title:       'VeloClub',
  description: 'Your cycling club, organised.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${jakarta.variable} h-full`}>
      <body className="min-h-full font-sans">
        {children}
      </body>
    </html>
  );
}
