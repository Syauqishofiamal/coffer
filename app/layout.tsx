import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';
import './globals.css';

// Rounded, friendly type to match the illustrated style. Self-hosted by Next,
// so there is no request to Google at runtime.
const nunito = Nunito({
  subsets: ['latin'], weight: ['500', '600', '700', '800', '900'],
  variable: '--font-nunito', display: 'swap',
});

export const metadata: Metadata = {
  title: 'Coffer — quick expense tracking',
  description: 'A fast, kind expense tracker. Log in seconds, keep the streak.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e2ecf6' },
    { media: '(prefers-color-scheme: dark)',  color: '#e2ecf6' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint, so there is no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
