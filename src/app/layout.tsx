import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import NextAuthProvider from '@/components/providers/SessionProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'CarHaki — Know the Truth About Every Tokunbo Car',
  description: 'Vehicle history reports for Nigerian Tokunbo buyers. Check accident records, title brands, mileage, and safety recalls before you buy.',
  keywords: 'vehicle history, tokunbo cars, car check nigeria, VIN check, CarHaki',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'CarHaki — Know the Truth About Every Tokunbo Car',
    description: 'Vehicle history reports for Nigerian Tokunbo buyers.',
    url: 'https://carhaki.com',
    siteName: 'CarHaki',
    locale: 'en_NG',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <NextAuthProvider>
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}
