import type { Metadata } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
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

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('app');
  return {
    title:       t('title'),
    description: t('description'),
    manifest:    '/static/manifest.webmanifest',
    icons: {
      icon:  [{ url: '/static/icon.svg',           type: 'image/svg+xml' }],
      apple: [{ url: '/static/apple-icon-180.png', sizes: '180x180', type: 'image/png' }],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale   = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${outfit.variable} ${jakarta.variable} h-full`}>
      <body className="min-h-full font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
