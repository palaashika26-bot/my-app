import React from 'react';
import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import '../styles/tailwind.css';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/context/AuthContext';
import { ApiAuthProvider } from '@/contexts/AuthContext';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: 'EliosWholesale — Source from China, Deliver to India',
  description: 'EliosWholesale helps Indian businesses source products from China with end-to-end logistics.',
  icons: {
    icon: '/bg.jpg',
    shortcut: '/bg.jpg',
    apple: '/bg.jpg',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={dmSans.variable}
      suppressHydrationWarning
      style={{ height: '100%', overflowX: 'hidden', width: '100%' }}
    >
      <body
        className={dmSans.className}
        style={{
          minHeight: '100%',
          overflow: 'unset',
          overflowX: 'hidden',
          overflowY: 'unset',
          width: '100%',
          maxWidth: '100vw',
          margin: 0,
          padding: 0,
        }}
      >
        <AuthProvider>
          <ApiAuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </ApiAuthProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
