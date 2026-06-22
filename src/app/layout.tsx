import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import QueryProvider from '@/components/providers/QueryProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CarHaki — Know the Truth About Every Tokunbo Car',
  description: 'Vehicle history reports for Nigerian Tokunbo buyers. Check accident records, title brands, mileage, and safety recalls before you buy.',
  keywords: 'vehicle history, tokunbo cars, car check nigeria, VIN check, CarHaki',
  openGraph: {
    title: 'CarHaki — Know the Truth About Every Tokunbo Car',
    description: 'Vehicle history reports for Nigerian Tokunbo buyers.',
    url: 'https://carhaki.com',
    siteName: 'CarHaki',
    locale: 'en_NG',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            <Navbar />
            <main>{children}</main>
            <Footer />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
