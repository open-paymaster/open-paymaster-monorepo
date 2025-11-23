import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import { Providers } from './providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Open Paymaster',
  description: 'made in Argentina for ETHGlobal Buenos Aires 2025 🇦🇷🇦🇷❤️🇦🇷🇦🇷',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <Providers>
          <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-11 text-slate-900">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
